/**
 * Sugeneruoti iš anksto paruoštas pasakas su ElevenLabs v3 garso įrašu
 *
 * Naudojimas:
 *   npx ts-node scripts/generate-pregenerated-story.ts
 *   npx ts-node scripts/generate-pregenerated-story.ts --voice=Sarah
 *   npx ts-node scripts/generate-pregenerated-story.ts --dry-run
 */

import 'dotenv/config';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Aplinkos kintamieji
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

// Supabase klientas su service role administravimo operacijoms
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Geriausi ElevenLabs balsai pasakojimui
const STORYTELLING_VOICES = {
  Sarah: { id: 'EXAVITQu4vr4xnSDxMaL', description: 'Soft, warm female voice' },
  Matilda: { id: 'XrExE9yKIg1WjnnlVkGX', description: 'Warm, nurturing female voice' },
  Charlotte: { id: 'XB0fDUnXU5powFXDhCwa', description: 'Youthful, gentle female voice' },
  Lily: { id: 'pFZP5JQG7iQjIQuC4Bku', description: 'Gentle, soothing female voice' },
  Rachel: { id: '21m00Tcm4TlvDq8ikWAM', description: 'Default female voice' },
  George: { id: 'JBFqnCBsd6RMkjVDRZzb', description: 'Warm British male voice' },
  Brian: { id: 'nPczCjzI2devNBz1zQrb', description: 'Deep male voice' },
  Daniel: { id: 'onwK4e9ZLuTAKqWW03F9', description: 'Authoritative male voice' },
};

// Pavyzdinės iš anksto paruoštos pasakos (galite pridėti daugiau)
const SAMPLE_STORIES = [
  {
    title: 'Meskiuko Rudžio nuotykis',
    theme: 'animals',
    target_age: 4,
    content: `[in lithuanian language] [softly] Seniai seniai, giliai giliai miške gyveno mažas meškiukas, vardu Rudis.

[warmly] Rudis turėjo švelnų rudą kailį ir mažas apvalias ausytes. Jis labai mėgo vaikščioti po mišką ir rinkti avietes.

[excited] Vieną gražų rytą, Rudis rado sidabrinę plunksnelę! "Oi, kokia graži!" - sušuko jis.

[whispers] Plunksnelė atvedė jį į slaptą aikštelę, kur gyveno draugiškas pelėdžiukas.

[cheerfully] Pelėdžiukas pasakė: "Aš esu Ūkas. Nori būti mano draugas?"

[warmly] Rudis nusišypsojo ir tarė: "Taip! Draugai amžinai!"

[softly] [yawns] Ir taip Rudis rado naują geriausią draugą. Labanakt, mažyli. Gražių sapnų apie nuotykius miške.`,
    image_style: 'watercolor',
  },
  {
    title: 'Žvaigždutė ir mėnulis',
    theme: 'dreams',
    target_age: 3,
    content: `[in lithuanian language] [softly] Aukštai aukštai danguje gyveno maža žvaigždutė, vardu Šviesė.

[whispers] Kiekvieną naktį ji šviesdavo mažiems vaikams, kurie eidavo miegoti.

[warmly] Mėnulis buvo jos geriausias draugas. Jis sakė: "Tu esi pati gražiausia žvaigždutė."

[giggles] Šviesė nusijuokė ir nušoko dar ryškiau.

[softly] Kai vaikai užmerkia akis, Šviesė siunčia jiems gražiausius sapnus.

[whispers] Pažiūrėk pro langą - gal pamatysi Šviesę, kuri tau šypsosi.

[yawns] [softly] Labanakt, mažasis žvaigždžių drauguži. Saldžių sapnų.`,
    image_style: 'dreamy',
  },
  {
    title: 'Drąsusis kiškutis',
    theme: 'adventure',
    target_age: 5,
    content: `[in lithuanian language] [warmly] Pievoje prie miško gyveno kiškutis Baltis. Jis turėjo ilgas baltas ausytes ir rausvą nosiukę.

[excited] Baltis svajojo pamatyti, kas yra už didelio kalnelio.

[nervously] "Ar tau nebaisu?" - klausė mama kiškienė.

[cheerfully] "Truputį, bet aš drąsus!" - atsakė Baltis.

[softly] Jis lipė ir lipė, kol pasiekė viršūnę.

[excited] Ten jis pamatė gražiausią slėnį su gėlėmis ir upeliu!

[warmly] Grįžęs namo, Baltis papasakojo visiems apie savo nuotykį.

[softly] [yawns] Ir tu gali būti drąsus, kaip Baltis. Labanakt, mažasis nuotykių ieškotojau.`,
    image_style: 'storybook',
  },
];

async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  console.log('  Generating audio with ElevenLabs v3...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.85, // Lėčiau pasakoms prieš miegą
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${error.detail?.message || 'Unknown error'}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToSupabase(
  bucket: string,
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

async function generateStory(
  storyData: typeof SAMPLE_STORIES[0],
  voiceName: keyof typeof STORYTELLING_VOICES,
  dryRun: boolean = false
) {
  const voice = STORYTELLING_VOICES[voiceName];

  console.log(`\n=== Generating: ${storyData.title} ===`);
  console.log(`Voice: ${voiceName} (${voice.description})`);
  console.log(`Theme: ${storyData.theme}, Age: ${storyData.target_age}`);

  if (dryRun) {
    console.log('  [DRY RUN] Would generate audio and save to database');
    return null;
  }

  // Sugeneruoti garso įrašą
  const audioBuffer = await generateAudio(storyData.content, voice.id);
  console.log(`  Audio generated: ${audioBuffer.length} bytes`);

  // Įkelti garso įrašą
  const audioPath = `pregenerated/${Date.now()}_${storyData.title.replace(/\s+/g, '_')}.mp3`;
  const audioUrl = await uploadToSupabase('audio', audioPath, audioBuffer, 'audio/mpeg');
  console.log(`  Audio uploaded: ${audioUrl}`);

  // Apskaičiuoti trukmę (apytikslis įvertis: 150 žodžių per minutę lėtam skaitymui)
  const wordCount = storyData.content.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 150) * 60 * 1.3); // 1,3x lėtam miego tempui

  // Išsaugoti į duomenų bazę
  const { data: story, error } = await supabase
    .from('pregenerated_stories')
    .insert({
      title: storyData.title,
      content: storyData.content,
      theme: storyData.theme,
      target_age: storyData.target_age,
      duration_seconds: durationSeconds,
      audio_url: audioUrl,
      thumbnail_url: null, // Galima pridėti vėliau
      character_descriptions: null,
      image_style: storyData.image_style,
      voice_id: voice.id,
      voice_name: voiceName,
      is_active: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`  Story saved with ID: ${story.id}`);
  return story;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const voiceArg = args.find((arg) => arg.startsWith('--voice='));
  const voiceName = (voiceArg?.split('=')[1] as keyof typeof STORYTELLING_VOICES) || 'Sarah';

  if (!STORYTELLING_VOICES[voiceName]) {
    console.error(`Unknown voice: ${voiceName}`);
    console.log('Available voices:', Object.keys(STORYTELLING_VOICES).join(', '));
    process.exit(1);
  }

  console.log('=== Pregenerated Story Generator ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Voice: ${voiceName}`);
  console.log(`Stories to generate: ${SAMPLE_STORIES.length}`);

  if (!dryRun) {
    // Patikrinti aplinkos kintamuosius
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      console.log('Add it to your .env file for admin access');
      process.exit(1);
    }
    if (!elevenLabsApiKey) {
      console.error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY');
      process.exit(1);
    }
  }

  for (const storyData of SAMPLE_STORIES) {
    try {
      await generateStory(storyData, voiceName, dryRun);
    } catch (error) {
      console.error(`  Error generating "${storyData.title}":`, error);
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);
