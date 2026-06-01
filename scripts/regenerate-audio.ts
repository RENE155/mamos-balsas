/**
 * Garso pakartotinio generavimo scenarijus
 *
 * Iš naujo sugeneruoja garsą esamoms kortelėms naudojant lietuvišką konteksto priešdėlį
 * tinkamam tarimui. Palieka esamus paveikslėlius.
 *
 * Naudojimas:
 *   npx ts-node scripts/regenerate-audio.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Aplinkos kintamieji
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = 'BIvP0GN1cAtSRTxNHnWS'; // Lietuvių kalbai tinkamas balsas

// Inicializuoti klientus
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateAudio(nameLt: string): Promise<ArrayBuffer> {
  // Naudoti lietuvišką konteksto priešdėlį tinkamam tarimui užtikrinti
  const textWithContext = `[čia yra gyvūnas lietuviškai] ${nameLt}`;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: textWithContext,
      model_id: 'eleven_v3',
      language_code: 'lt',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  return response.arrayBuffer();
}

async function uploadAudio(
  path: string,
  data: ArrayBuffer
): Promise<string> {
  const buffer = Buffer.from(data);

  const { error } = await supabase.storage
    .from('cards')
    .upload(path, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload error: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('cards')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function main() {
  console.log('');
  console.log('🔊 Audio Regeneration Script');
  console.log('============================');
  console.log('Using Lithuanian context prefix for proper pronunciation');
  console.log('');

  // Gauti visas korteles
  const { data: cards, error } = await supabase
    .from('cards')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('❌ Error fetching cards:', error.message);
    process.exit(1);
  }

  if (!cards || cards.length === 0) {
    console.log('No cards found.');
    process.exit(0);
  }

  console.log(`Found ${cards.length} cards to process\n`);

  let success = 0;
  let failed = 0;

  for (const card of cards) {
    try {
      console.log(`🎵 ${card.name_lt} (${card.name_en})...`);

      // Sugeneruoti naują garsą su lietuvišku priešdėliu
      const audioBuffer = await generateAudio(card.name_lt);
      console.log('   ✅ Audio generated');

      // Sukurti naują garso kelią
      const timestamp = Date.now();
      const slug = card.name_en.toLowerCase().replace(/\s+/g, '-');
      const audioPath = `audio/${card.category}/${slug}-lt-${timestamp}.mp3`;

      // Įkelti naują garsą
      const audioUrl = await uploadAudio(audioPath, audioBuffer);
      console.log('   ✅ Uploaded');

      // Atnaujinti duomenų bazės įrašą
      const { error: updateError } = await supabase
        .from('cards')
        .update({ audio_url: audioUrl })
        .eq('id', card.id);

      if (updateError) {
        throw new Error(`DB update error: ${updateError.message}`);
      }

      console.log('   ✅ Updated');
      success++;
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }

    // Nedidelė pauzė, kad būtų išvengta užklausų dažnio ribojimo
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('');
  console.log('📊 Summary');
  console.log('==========');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
}

main();
