import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { VoiceProfile } from '@/types';
import { createVoiceClone, deleteVoice } from '@/lib/elevenlabs';

// Modulio lygio talpykla, kad būtų išvengta pasikartojančių užklausų tarp hook egzempliorių
let globalVoicesCache: VoiceProfile[] | null = null;
let globalLastFetchedUserId: string | null = null;
let globalFetchPromise: Promise<void> | null = null;

export function useVoices() {
  const { user } = useAuth();
  const [voices, setVoices] = useState<VoiceProfile[]>(globalVoicesCache || []);
  const [isLoading, setIsLoading] = useState(!globalVoicesCache);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(async (force = false) => {
    const userId = user?.id;

    // Praleisti, jei šiam naudotojui jau užkrauta (nebent priverstinai)
    if (!force && globalLastFetchedUserId === userId && globalVoicesCache) {
      setVoices(globalVoicesCache);
      setIsLoading(false);
      return;
    }

    // Jei jau vykdoma užklausa, palaukti to pažado
    if (globalFetchPromise && !force) {
      await globalFetchPromise;
      if (globalVoicesCache) {
        setVoices(globalVoicesCache);
        setIsLoading(false);
      }
      return;
    }

    if (!userId) {
      setVoices([]);
      setIsLoading(false);
      globalVoicesCache = null;
      globalLastFetchedUserId = null;
      return;
    }

    console.log('[useVoices] fetchVoices called, user:', userId);

    const doFetch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('voice_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        console.log('[useVoices] Fetched voices:', data?.length || 0);
        globalVoicesCache = data || [];
        globalLastFetchedUserId = userId;
        setVoices(globalVoicesCache);
      } catch (err) {
        console.error('[useVoices] Error fetching voices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch voices');
      } finally {
        setIsLoading(false);
        globalFetchPromise = null;
      }
    };

    globalFetchPromise = doFetch();
    await globalFetchPromise;
  }, [user?.id]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const createVoice = async (name: string, audioUri: string): Promise<VoiceProfile> => {
    console.log('[useVoices] createVoice called:', { name, audioUri });

    if (!user) {
      console.error('[useVoices] No user authenticated');
      throw new Error('User not authenticated');
    }

    // Edge Function sukuria balso profilį duomenų bazėje
    // Mes tiesiog ją iškviečiame ir gauname sukurtą profilį
    console.log('[useVoices] Creating voice clone via Edge Function...');
    const voiceClone = await createVoiceClone(user.id, name, audioUri);
    console.log('[useVoices] Voice clone created, profile ID:', voiceClone.voice_id);

    // Gauti sukurtą balso profilį iš duomenų bazės
    const { data: createdVoice, error: fetchError } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('elevenlabs_voice_id', voiceClone.voice_id)
      .single();

    if (fetchError || !createdVoice) {
      console.error('[useVoices] Error fetching created voice:', fetchError);
      throw new Error('Voice created but failed to fetch profile');
    }

    console.log('[useVoices] Voice profile ready:', createdVoice.id);

    // Atnaujinti ir vietinę būseną, IR globalią talpyklą
    setVoices((prev) => {
      const newVoices = [createdVoice, ...prev];
      globalVoicesCache = newVoices;
      return newVoices;
    });

    return createdVoice;
  };

  const deleteVoiceProfile = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const voice = voices.find((v) => v.id === id);
    if (!voice) return;

    // Ištrinti naudojant Edge Function - ji tvarko tiek ElevenLabs, tiek saugyklos valymą
    try {
      await deleteVoice(user.id, voice.id);
    } catch (err) {
      console.warn('Failed to delete voice via Edge Function:', err);
    }

    const { error } = await supabase.from('voice_profiles').delete().eq('id', id);

    if (error) throw error;

    // Atnaujinti ir vietinę būseną, IR globalią talpyklą
    setVoices((prev) => {
      const newVoices = prev.filter((v) => v.id !== id);
      globalVoicesCache = newVoices;
      return newVoices;
    });
  };

  const getVoice = (id: string): VoiceProfile | undefined => {
    return voices.find((voice) => voice.id === id);
  };

  const getReadyVoices = (): VoiceProfile[] => {
    // Įtraukti tiek „ready", tiek „evicted" balsus - iškelti balsai bus automatiškai atkurti
    return voices.filter((voice) => voice.status === 'ready' || voice.status === 'evicted');
  };

  /**
   * Patikrinti, ar balsą reikia klonuoti iš naujo (iškeltas iš ElevenLabs)
   * Šie balsai vis dar tinkami naudoti, bet pirmą kartą gali užtrukti ilgiau
   */
  const needsRecloning = (voice: VoiceProfile): boolean => {
    return voice.status === 'evicted';
  };

  /**
   * Patikrinti, ar balsas visiškai paruoštas (aktyvus ElevenLabs)
   */
  const isVoiceActive = (voice: VoiceProfile): boolean => {
    return voice.status === 'ready' && voice.elevenlabs_voice_id !== null;
  };

  return {
    voices,
    isLoading,
    error,
    fetchVoices,
    createVoice,
    deleteVoiceProfile,
    getVoice,
    getReadyVoices,
    needsRecloning,
    isVoiceActive,
  };
}
