import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { deleteVoice } from '@/lib/elevenlabs';
import type { User } from '@/types';

const USER_ID_KEY = 'bedtime_stories_user_id';

// Sekti, ar paskyros kūrimas vyksta (užkerta kelią pasikartojantiems iškvietimams)
let isCreatingAccount = false;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  createAccount: () => Promise<User>;
  linkWithCode: (code: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Sugeneruoti 12 simbolių raidžių ir skaičių kodą (pvz., „ABCD-1234-EFGH")
// Stipresni kodai užtikrina geresnę apsaugą nuo brutalios jėgos atakų
function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pašalinti klaidinantys simboliai: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 4) + '-' + code.slice(4, 8) + '-' + code.slice(8);
}

// Sugeneruoti UUID naujiems naudotojams
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = useCallback(async () => {
    // Praleisti, jei vyksta paskyros kūrimas
    if (isCreatingAccount) {
      console.log('[Auth] Skipping loadUser - account creation in progress');
      return;
    }

    console.log('[Auth] loadUser called');
    try {
      const userId = await storage.getItemAsync(USER_ID_KEY);
      console.log('[Auth] Stored user ID:', userId);

      if (userId) {
        console.log('[Auth] Fetching user from Supabase...');
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (data && !error) {
          console.log('[Auth] User loaded:', data);
          setUser(data);
        } else {
          console.log('[Auth] User not found in DB, clearing local storage. Error:', error?.message);
          await storage.deleteItemAsync(USER_ID_KEY);
        }
      } else {
        console.log('[Auth] No stored user ID, user is not logged in');
      }
    } catch (error) {
      console.error('[Auth] Error loading user:', error);
    } finally {
      setIsLoading(false);
      console.log('[Auth] loadUser complete, isLoading set to false');
    }
  }, []);

  const createAccount = useCallback(async (): Promise<User> => {
    // Užkirsti kelią pasikartojantiems iškvietimams
    if (isCreatingAccount) {
      console.log('[Auth] Account creation already in progress, skipping...');
      throw new Error('Account creation in progress');
    }

    isCreatingAccount = true;
    console.log('[Auth] Creating new account...');

    try {
      const userId = generateUUID();
      console.log('[Auth] Generated user ID:', userId);

      let linkCode = generateLinkCode();
      console.log('[Auth] Generated link code:', linkCode);

      // Užtikrinti, kad kodas būtų unikalus (bandyti iš naujo įvykus sutapimui)
      let attempts = 0;
      while (attempts < 5) {
        console.log('[Auth] Checking if code is unique, attempt:', attempts + 1);
        const { data: existing, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('link_code', linkCode)
          .single();

        if (checkError) {
          console.log('[Auth] Code check error (expected if not found):', checkError.message);
        }

        if (!existing) {
          console.log('[Auth] Code is unique!');
          break;
        }
        linkCode = generateLinkCode();
        attempts++;
      }

      const newUser: Partial<User> = {
        id: userId,
        email: null,
        auth_provider: 'code',
        link_code: linkCode,
        free_story_used: false,
        subscription_status: 'none',
      };

      console.log('[Auth] Inserting new user:', JSON.stringify(newUser, null, 2));

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (error) {
        console.error('[Auth] Supabase insert error:', error.message, error.details, error.hint);
        throw new Error(`Nepavyko sukurti paskyros: ${error.message}`);
      }

      console.log('[Auth] User created successfully:', data);

      // Pirma išsaugoti naudotojo ID vietiškai
      await storage.setItemAsync(USER_ID_KEY, data.id);
      console.log('[Auth] User ID stored in storage');

      // Tada atnaujinti būseną
      setUser(data);

      return data;
    } finally {
      isCreatingAccount = false;
    }
  }, []);

  const linkWithCode = async (code: string): Promise<User> => {
    // Normalizuoti kodą (didžiosios raidės, pašalinti ne raides ir ne skaičius)
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Formatuoti kodą pagal ilgį (palaikyti tiek seną 6 simbolių, tiek naują 12 simbolių)
    let formattedCode: string;
    if (normalizedCode.length === 6) {
      // Senas formatas: ABC-123
      formattedCode = normalizedCode.slice(0, 3) + '-' + normalizedCode.slice(3);
    } else if (normalizedCode.length === 12) {
      // Naujas formatas: ABCD-1234-EFGH
      formattedCode = normalizedCode.slice(0, 4) + '-' + normalizedCode.slice(4, 8) + '-' + normalizedCode.slice(8);
    } else {
      // Bandyti tokį, koks yra, su didžiosiomis raidėmis
      formattedCode = code.toUpperCase();
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('link_code', formattedCode)
      .single();

    if (error || !data) {
      throw new Error('Kodas nerastas. Patikrinkite ir bandykite dar karta.');
    }

    // Išsaugoti naudotojo ID vietiškai
    await storage.setItemAsync(USER_ID_KEY, data.id);
    setUser(data);

    return data;
  };

  const signOut = async () => {
    await storage.deleteItemAsync(USER_ID_KEY);
    setUser(null);
  };

  const refreshUser = async () => {
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setUser(data);
    }
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('No user to delete');

    console.log('[Auth] Starting account deletion for user:', user.id);

    try {
      // 1. Ištrinti visus balso profilius naudojant Edge Function
      const { data: voices } = await supabase
        .from('voice_profiles')
        .select('id, elevenlabs_voice_id')
        .eq('user_id', user.id);

      if (voices) {
        for (const voice of voices) {
          if (voice.id) {
            try {
              await deleteVoice(user.id, voice.id);
              console.log('[Auth] Deleted voice profile:', voice.id);
            } catch (e) {
              console.error('[Auth] Failed to delete voice profile:', e);
            }
          }
        }
      }

      // 2. Ištrinti visų pasakų garsą iš saugyklos
      const { data: stories } = await supabase
        .from('stories')
        .select('audio_url')
        .eq('user_id', user.id);

      if (stories) {
        for (const story of stories) {
          if (story.audio_url) {
            try {
              const urlParts = story.audio_url.split('/');
              const fileName = urlParts.slice(-2).join('/');
              await supabase.storage.from('audio').remove([fileName]);
            } catch (e) {
              console.error('[Auth] Failed to delete audio file:', e);
            }
          }
        }
      }

      // 3. Ištrinti naudotojo įrašą (CASCADE ištrins vaikus, pasakas, balsus)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to delete account: ${error.message}`);
      }

      console.log('[Auth] Account deleted successfully');

      // 4. Išvalyti vietinę saugyklą ir atsijungti
      await storage.deleteItemAsync(USER_ID_KEY);
      setUser(null);
    } catch (error) {
      console.error('[Auth] Error deleting account:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        createAccount,
        linkWithCode,
        signOut,
        refreshUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
