/**
 * Sugeneruoti iš anksto paruoštą pasaką 3-4 metų vaikams
 * Pagal PREGENERATED_STORY_PLAN.md gaires
 *
 * Naudojimas: npx ts-node scripts/generate-3-4-story.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Balso nustatymai - TEISINGAS greitis (0.7 = lėčiausia galiojanti reikšmė)
const VOICE = {
  id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  name: 'Sarah',
  settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 0.7, // LĖČIAUSIAS galiojantis greitis (intervalas 0.7-1.2)
  },
};

// Meno stilius
const ART_STYLE = "Soft watercolor children's book illustration, gentle colors, warm and cozy atmosphere, cute round characters with big expressive eyes, dreamy peaceful feeling";

// Pasaka 3-4 metų vaikams - gyvūnų tema, paprasta draugystės istorija
// Pagal planą: 2-3 sakiniai pastraipoje, ~300 žodžių iš viso
const STORY = {
  title: 'Zuikutis ir jo nauja draugė',
  content: `[in lithuanian language] [softly] Mažas baltas zuikutis Puškis gyveno po dideliu krūmu. Jis turėjo minkštas ausytes ir rožinę nosiukę.

...

[warmly] Vieną dieną Puškis išėjo pasivaikščioti. Jis šokinėjo per pievas ir uostė gėlytes.

...

[excited] Staiga jis pamatė mažą voveriukę! Ji sėdėjo ant akmens ir verkė. [playfully] "Kodėl tu liūdna?" - paklausė Puškis.

...

[whispers] "Aš pamečiau savo riešutą," - tyliai pasakė voveriukė. [warmly] "Aš padėsiu tau!" - nusprendė Puškis.

...

[excited] Jie ieškojo kartu. Po lapais, po akmenimis, po krūmais. [giggles] "Radau!" - sušuko Puškis. Riešutas gulėjo po gėlyte!

...

[warmly] Voveriukė apsidžiaugė. "Ačiū, Puški! Tu esi geras draugas." Jie abu nusišypsojo ir kartu žaidė iki vakaro.

...

[softly] Kai saulė nuėjo miegoti, Puškis grįžo namo. [yawns] Jis užmigo galvodamas apie savo naują draugę. [whispers] Geros nakties, mažyli. Saldžių sapnų. Labanakt.`,
  theme: 'friendship',
  target_age: 3,
  image_style: 'watercolor',
};

// Scenų aprašymai paveikslėliams
const SCENES = [
  {
    text: 'Mažas baltas zuikutis gyveno po dideliu krūmu',
    characters: 'A small cute white bunny with soft floppy ears and pink nose, sitting under a big green bush, cozy home',
  },
  {
    text: 'Puškis šokinėjo per pievas ir uostė gėlytes',
    characters: 'The same white bunny hopping happily through a meadow with colorful flowers, sunny day',
  },
  {
    text: 'Zuikutis pamatė mažą voveriukę kuri verkė',
    characters: 'White bunny looking at a small sad squirrel sitting on a rock, the squirrel has tears',
  },
  {
    text: 'Voveriukė pasakė kad pamete riešutą',
    characters: 'White bunny and small squirrel talking, bunny looks caring and helpful',
  },
  {
    text: 'Jie rado riešutą po gėlyte',
    characters: 'Happy white bunny and squirrel found a nut under a flower, both excited and happy',
  },
  {
    text: 'Voveriukė padėkojo zuikučiui, jie tapo draugai',
    characters: 'White bunny and squirrel hugging or playing together, both smiling, friendship',
  },
  {
    text: 'Zuikutis grįžo namo ir užmigo',
    characters: 'White bunny sleeping peacefully in cozy bed under the bush, moonlight, stars, peaceful night',
  },
];

async function generateAudio(text: string): Promise<Buffer> {
  console.log('🎤 Generating audio with ElevenLabs (speed: 0.7 - slowest)...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: VOICE.settings,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`✅ Audio generated: ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

async function generateImage(scene: typeof SCENES[0], index: number): Promise<string> {
  const prompt = `${ART_STYLE}

SCENE: ${scene.characters}

IMPORTANT: Child-safe, gentle, calming illustration for 3-4 year old children. NO text or words in image. Cute, friendly, not scary.`;

  console.log(`  🎨 Generating image ${index + 1}/7...`);

  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });

  if (!result.data || !result.data[0]?.b64_json) {
    throw new Error('No image data returned');
  }

  return result.data[0].b64_json;
}

async function main() {
  console.log('🐰 Creating story for 3-4 year olds: ' + STORY.title);
  console.log('Voice speed: 0.7 (SLOWEST valid)');
  console.log('─'.repeat(50));

  // Patikrinti aplinkos kintamuosius
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  if (!elevenLabsApiKey) {
    console.error('❌ Missing ElevenLabs API key');
    process.exit(1);
  }

  // 1. Sugeneruoti garso įrašą
  const audioBuffer = await generateAudio(STORY.content);

  // 2. Įkelti garso įrašą
  console.log('📤 Uploading audio...');
  const audioPath = `pregenerated/${Date.now()}_zuikutis.mp3`;
  const { error: audioError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

  if (audioError) throw audioError;

  const { data: audioUrlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
  console.log(`✅ Audio: ${audioUrlData.publicUrl}`);

  // 3. Sugeneruoti paveikslėlius lygiagrečiai
  console.log('🎨 Generating 7 images...');
  const imagePromises = SCENES.map((scene, i) =>
    generateImage(scene, i)
      .then((base64) => ({ base64, index: i, text: scene.text }))
      .catch((err) => {
        console.error(`  ❌ Image ${i + 1} failed:`, err.message);
        return null;
      })
  );

  const imageResults = await Promise.all(imagePromises);
  const images = imageResults.filter(Boolean) as { base64: string; index: number; text: string }[];
  console.log(`✅ Generated ${images.length} images`);

  // 4. Įkelti paveikslėlius ir išsaugoti URL
  console.log('📤 Uploading images...');
  const imageUrls: { url: string; index: number; text: string }[] = [];

  for (const img of images) {
    const imgBytes = Buffer.from(img.base64, 'base64');
    const imgPath = `pregenerated/zuikutis_${Date.now()}_${img.index}.png`;

    const { error: imgUploadError } = await supabase.storage
      .from('story-images')
      .upload(imgPath, imgBytes, { contentType: 'image/png' });

    if (imgUploadError) {
      console.error(`  ❌ Failed to upload image ${img.index}:`, imgUploadError);
      continue;
    }

    const { data: imgUrlData } = supabase.storage.from('story-images').getPublicUrl(imgPath);
    imageUrls.push({ url: imgUrlData.publicUrl, index: img.index, text: img.text });
    console.log(`  ✅ Image ${img.index + 1}/7 uploaded`);
  }

  // Apskaičiuoti trukmę
  const wordCount = STORY.content.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 100) * 60); // ~100 žodžių/min esant 0.7 greičiui

  // Išvestis rankiniam SQL įterpimui
  console.log('\n─'.repeat(50));
  console.log('📋 COPY THIS SQL TO INSERT:');
  console.log('─'.repeat(50));

  const thumbnailUrl = imageUrls.length > 0 ? imageUrls[0].url : null;

  console.log(`
-- Insert story
INSERT INTO pregenerated_stories (
  title, content, theme, target_age, duration_seconds,
  audio_url, thumbnail_url, image_style, voice_id, voice_name, is_active, sort_order
) VALUES (
  '${STORY.title}',
  '${STORY.content.replace(/'/g, "''")}',
  '${STORY.theme}',
  ${STORY.target_age},
  ${durationSeconds},
  '${audioUrlData.publicUrl}',
  ${thumbnailUrl ? `'${thumbnailUrl}'` : 'NULL'},
  '${STORY.image_style}',
  '${VOICE.id}',
  '${VOICE.name}',
  true,
  3
) RETURNING id;
`);

  console.log('-- Then insert images with the returned story_id:');
  for (const img of imageUrls) {
    console.log(`
INSERT INTO pregenerated_story_images (story_id, image_url, scene_index, scene_text)
VALUES ('<STORY_ID>', '${img.url}', ${img.index}, '${img.text.replace(/'/g, "''")}');`);
  }

  console.log('\n─'.repeat(50));
  console.log('🎉 Assets uploaded! Run the SQL above via MCP.');
  console.log(`⏱️  Duration: ~${Math.round(durationSeconds / 60)} minutes`);
}

main().catch(console.error);
