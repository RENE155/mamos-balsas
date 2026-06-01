/**
 * Balsų valdymo įrankis LRU pagrindu veikiančiam balso klonavimui
 *
 * ElevenLabs riboja balso klonus iki 30. Šis įrankis valdo:
 * - Aktyvių balsų skaičiavimą ElevenLabs sistemoje
 * - Seniausiai naudotų balsų pašalinimą artėjant prie limito
 * - Balsų pakartotinį klonavimą pagal poreikį, kai reikia
 */

import { supabase } from './auth.ts';

const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY')!;

// LRU konfigūracija
const MAX_ACTIVE_VOICES = 30;      // ElevenLabs limitas
const EVICTION_THRESHOLD = 25;     // Pradėti šalinti pasiekus šį skaičių
const EVICTION_TARGET = 20;        // Šalinti iki šio skaičiaus
const RECLONE_RATE_LIMIT = 5;      // Daugiausia pakartotinių klonavimų per valandą (atskirai nuo naujų klonų)

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  elevenlabs_voice_id: string | null;
  original_audio_url: string | null;
  last_used_at: string;
  status: string;
}

/**
 * Gauti aktyvių balsų skaičių mūsų duomenų bazėje, kurie turi ElevenLabs balso ID
 */
export async function getActiveVoiceCount(): Promise<number> {
  const { count, error } = await supabase
    .from('voice_profiles')
    .select('*', { count: 'exact', head: true })
    .not('elevenlabs_voice_id', 'is', null);

  if (error) {
    console.error('[VoiceManagement] Error counting active voices:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Gauti balsų sąrašą iš ElevenLabs API (patikrinimui)
 */
export async function getElevenLabsVoices(): Promise<string[]> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': elevenlabsKey },
    });

    if (!response.ok) {
      console.error('[VoiceManagement] Failed to fetch ElevenLabs voices');
      return [];
    }

    const data = await response.json();
    // Grąžinti tik klonuotus balsus (ne iš anksto paruoštus)
    return data.voices
      .filter((v: { category: string }) => v.category === 'cloned')
      .map((v: { voice_id: string }) => v.voice_id);
  } catch (error) {
    console.error('[VoiceManagement] Error fetching ElevenLabs voices:', error);
    return [];
  }
}

/**
 * Pašalinti seniausiai naudotus balsus iš ElevenLabs
 * @param count Pašalinamų balsų skaičius
 */
export async function evictLRUVoices(count: number): Promise<number> {
  console.log(`[VoiceManagement] Evicting ${count} LRU voices`);

  // Gauti seniausiai naudotus balsus, kurie turi aktyvų ElevenLabs ID
  const { data: voices, error } = await supabase
    .from('voice_profiles')
    .select('id, elevenlabs_voice_id, name, user_id')
    .not('elevenlabs_voice_id', 'is', null)
    .order('last_used_at', { ascending: true })
    .limit(count);

  if (error || !voices) {
    console.error('[VoiceManagement] Error fetching voices to evict:', error);
    return 0;
  }

  let evictedCount = 0;

  for (const voice of voices) {
    try {
      // Ištrinti iš ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/voices/${voice.elevenlabs_voice_id}`,
        {
          method: 'DELETE',
          headers: { 'xi-api-key': elevenlabsKey },
        }
      );

      if (response.ok || response.status === 404) {
        // Atnaujinti duomenų bazę: išvalyti balso ID, nustatyti būseną į evicted
        await supabase
          .from('voice_profiles')
          .update({
            elevenlabs_voice_id: null,
            status: 'evicted',
          })
          .eq('id', voice.id);

        console.log(`[VoiceManagement] Evicted voice ${voice.id} (${voice.name})`);
        evictedCount++;
      } else {
        console.error(`[VoiceManagement] Failed to delete voice ${voice.elevenlabs_voice_id} from ElevenLabs`);
      }
    } catch (error) {
      console.error(`[VoiceManagement] Error evicting voice ${voice.id}:`, error);
    }
  }

  return evictedCount;
}

/**
 * Iš naujo klonuoti balsą iš išsaugoto garso
 * @param voiceProfileId Balso profilis, kurį reikia iš naujo klonuoti
 * @returns Naujas ElevenLabs balso ID arba null, jei nepavyko
 */
export async function recloneVoice(voiceProfileId: string): Promise<string | null> {
  console.log(`[VoiceManagement] Re-cloning voice ${voiceProfileId}`);

  // Gauti balso profilį
  const { data: voice, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('id', voiceProfileId)
    .single();

  if (error || !voice) {
    console.error('[VoiceManagement] Voice profile not found:', voiceProfileId);
    return null;
  }

  if (!voice.original_audio_url) {
    console.error('[VoiceManagement] No original audio URL for voice:', voiceProfileId);
    return null;
  }

  // Atsisiųsti garsą iš saugyklos
  const audioUrl = voice.original_audio_url;
  let audioBlob: Blob;

  try {
    // Išgauti kelią iš URL - formatas: .../storage/v1/object/public/voice-recordings/...
    // arba .../storage/v1/object/sign/voice-recordings/...
    const pathMatch = audioUrl.match(/voice-recordings\/(.+)/);
    if (!pathMatch) {
      throw new Error('Invalid audio URL format');
    }

    const storagePath = pathMatch[1];
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice-recordings')
      .download(storagePath);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    audioBlob = audioData;
  } catch (error) {
    console.error('[VoiceManagement] Error downloading audio:', error);
    return null;
  }

  // Prieš klonuojant, patikrinti, ar reikia pašalinti
  const activeCount = await getActiveVoiceCount();
  if (activeCount >= EVICTION_THRESHOLD) {
    const toEvict = activeCount - EVICTION_TARGET + 1;
    await evictLRUVoices(toEvict);
  }

  // Klonuoti su ElevenLabs
  try {
    const formData = new FormData();
    formData.append('name', `${voice.name}_${voice.user_id.substring(0, 8)}`);
    formData.append('remove_background_noise', 'true');
    formData.append('description', 'Parent voice for bedtime stories (re-cloned)');
    formData.append('files', audioBlob, 'recording.m4a');

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': elevenlabsKey },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[VoiceManagement] ElevenLabs re-clone error:', errorData);
      return null;
    }

    const voiceData = await response.json();
    const newVoiceId = voiceData.voice_id;

    // Atnaujinti duomenų bazę
    await supabase
      .from('voice_profiles')
      .update({
        elevenlabs_voice_id: newVoiceId,
        status: 'ready',
        last_used_at: new Date().toISOString(),
      })
      .eq('id', voiceProfileId);

    console.log(`[VoiceManagement] Successfully re-cloned voice ${voiceProfileId} -> ${newVoiceId}`);
    return newVoiceId;
  } catch (error) {
    console.error('[VoiceManagement] Error re-cloning voice:', error);
    return null;
  }
}

/**
 * Patikrinti pakartotinio klonavimo užklausų dažnio limitą (atskirai nuo naujo klono limito)
 */
export async function checkRecloneRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - 60);

  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'reclone-voice')
    .gte('window_start', windowStart.toISOString());

  return (count || 0) < RECLONE_RATE_LIMIT;
}

/**
 * Užregistruoti pakartotinio klonavimo užklausą
 */
export async function recordRecloneRequest(userId: string): Promise<void> {
  await supabase.from('rate_limits').insert({
    user_id: userId,
    action_type: 'reclone-voice',
    window_start: new Date().toISOString(),
  });
}

/**
 * Pagrindinis įėjimo taškas: užtikrinti, kad balsas būtų prieinamas naudojimui
 * Grąžina ElevenLabs balso ID, prireikus iš naujo klonuojant
 * Taip pat atnaujina last_used_at laiko žymą
 */
export async function ensureVoiceAvailable(
  voiceProfileId: string,
  userId: string
): Promise<{ voiceId: string | null; recloned: boolean; error?: string }> {
  // Gauti balso profilį ir patikrinti nuosavybę
  const { data: voice, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('id', voiceProfileId)
    .eq('user_id', userId)
    .single();

  if (error || !voice) {
    return { voiceId: null, recloned: false, error: 'Voice profile not found' };
  }

  // Jei balsas paruoštas ir turi ElevenLabs ID, tiesiog atnaujinti last_used_at
  if (voice.status === 'ready' && voice.elevenlabs_voice_id) {
    await supabase
      .from('voice_profiles')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', voiceProfileId);

    return { voiceId: voice.elevenlabs_voice_id, recloned: false };
  }

  // Jei balsas pašalintas, bandyti iš naujo klonuoti
  if (voice.status === 'evicted' && voice.original_audio_url) {
    // Patikrinti pakartotinio klonavimo užklausų dažnio limitą
    const canReclone = await checkRecloneRateLimit(userId);
    if (!canReclone) {
      return { voiceId: null, recloned: false, error: 'Re-clone rate limit exceeded' };
    }

    // Užregistruoti pakartotinio klonavimo užklausą
    await recordRecloneRequest(userId);

    const newVoiceId = await recloneVoice(voiceProfileId);
    if (newVoiceId) {
      return { voiceId: newVoiceId, recloned: true };
    } else {
      return { voiceId: null, recloned: false, error: 'Failed to re-clone voice' };
    }
  }

  // Balsas yra pending, processing arba failed būsenoje
  return { voiceId: null, recloned: false, error: `Voice not ready (status: ${voice.status})` };
}

/**
 * Užtikrinti, kad turime vietos naujam balso klonui
 * Iškviesti tai prieš kuriant naują balsą
 */
export async function ensureVoiceCapacity(): Promise<void> {
  const activeCount = await getActiveVoiceCount();

  if (activeCount >= EVICTION_THRESHOLD) {
    const toEvict = activeCount - EVICTION_TARGET + 1;
    console.log(`[VoiceManagement] Active voices (${activeCount}) >= threshold (${EVICTION_THRESHOLD}), evicting ${toEvict}`);
    await evictLRUVoices(toEvict);
  }
}
