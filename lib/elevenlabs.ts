/**
 * ElevenLabs balso pagalbinės funkcijos
 * API iškvietimai dabar nukreipiami per Edge Functions naudojant lib/api.ts
 */

import { Platform } from 'react-native';
import type { VoiceCloneResponse } from '@/types';
import { api } from './api';

// Importuoti FileSystem tik vietinėse platformose (vietiniams garso failams tvarkyti)
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}

// Numatytasis balso ID atsarginiam variantui (gali būti perrašytas Edge Function)
const DEFAULT_VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID;

export interface VoiceOptions {
  speed?: number;
}

/**
 * Sukurti balso kloną iš garso įrašo
 * Reikalinga premium prenumerata - apdorojama per Edge Function
 */
export async function createVoiceClone(
  userId: string,
  name: string,
  audioUri: string
): Promise<VoiceCloneResponse> {
  console.log('[ElevenLabs] Creating voice clone via Edge Function:', { name, audioUri });

  if (Platform.OS === 'web') {
    // Web platformoje gauti blob iš URI
    const response = await fetch(audioUri);
    const audioBlob = await response.blob();
    const apiResponse = await api.cloneVoice(userId, name, audioBlob);
    return {
      voice_id: apiResponse.voiceId,
      name: apiResponse.name,
    };
  } else {
    // Vietinėje platformoje naudoti React Native FormData failo formatą
    // React Native nepalaiko Blob iš ArrayBuffer, todėl perduodame URI tiesiogiai
    const apiResponse = await api.cloneVoiceNative(userId, name, audioUri);
    return {
      voice_id: apiResponse.voiceId,
      name: apiResponse.name,
    };
  }
}

/**
 * Sugeneruoti kalbą iš teksto naudojant Edge Function
 * Grąžina garso failo URL Supabase Storage saugykloje
 */
export async function textToSpeech(
  userId: string,
  text: string,
  options: {
    voiceProfileId?: string;
    storyId?: string;
    age?: number;
    speed?: number;
  } = {}
): Promise<string> {
  console.log('[ElevenLabs] Generating speech via Edge Function, text length:', text.length);

  const response = await api.generateAudio(userId, text, options);

  console.log('[ElevenLabs] Audio generated:', response.audioUrl);
  return response.audioUrl;
}

/**
 * Ištrinti balso profilį naudojant Edge Function
 */
export async function deleteVoice(userId: string, voiceProfileId: string): Promise<void> {
  console.log('[ElevenLabs] Deleting voice via Edge Function:', voiceProfileId);
  await api.deleteVoice(userId, voiceProfileId);
}

export { DEFAULT_VOICE_ID };
