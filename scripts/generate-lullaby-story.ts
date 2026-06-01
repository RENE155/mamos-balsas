/**
 * Sugeneruoti lopšinę 1-3 metų vaikams (LOPŠINĖS formatas)
 * Pagal STORY_AGE_GUIDELINES.md - tai NE pasaka, o raminanti lopšinė!
 *
 * Ypatybės:
 * - 1-3 trumpi posmai (ne pastraipos)
 * - Onomatopėjos: šššš, bum-bum, miau
 * - Daug pasikartojimų
 * - JOKIO siužeto, JOKIO konflikto
 * - Tik 1-3 paveikslėliai
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Balso nustatymai - LĖČIAUSIAS greitis 0.7 kūdikiams
const VOICE = {
  id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - švelnus moteriškas balsas
  name: 'Sarah',
  settings: {
    stability: 0.5,          // Turi būti 0.0, 0.5 arba 1.0
    similarity_boost: 0.75,
    speed: 0.7,              // Lėčiausias įmanomas
  },
};

// Labai švelnus, sapniškas stilius kūdikiams
const ART_STYLE = "Soft pastel watercolor illustration for babies, very simple shapes, minimal background, gentle muted colors (soft blue, lavender, pale pink), dreamy night scene, large cute sleeping animals, moon and stars, extremely calming and soothing, no busy details";

// LOPŠINĖ 0-2 metų vaikams - tai NE pasaka, o raminanti lopšinė!
// Pagal naują storyFormats.ts - 5-7 posmai, 180-280 žodžių, 2-3 minutės
const LULLABY = {
  title: 'Miegok, Mažyli',
  content: `[in lithuanian language] [softly] Mėnulis šviečia aukštai danguje.
Žvaigždutės mirksi: mik-mik-mik.
Viskas ramu, viskas tylu.

...

[whispers] Meškiukas miega savo lovytėje.
Katytė miega: purr-purr-purr.
Ir šuniukas miega tyliai: šššš...

...

[softly] Šššš, šššš, mažyli.
Bum-bum, bum-bum - širdelė plaka ramiai.
Mama šalia, viskas gerai.

...

[yawns] Miegok, miegok, mažyli.
Miegok, miegok, sapnuok gražiai.
Šššš... šššš... tyliai, tyliai.

...

[whispers] Zuikutis miega po krūmeliu.
Paukšteliai miega lizdelyje.
Visi visi miega jau.

...

[softly] Antklodėlė šilta ir minkšta.
Pagalvėlė po galvyte.
Saugu, šilta, gera čia.

...

[yawns] Akutės užsimerkia tyliai.
[whispers] Žvaigždutės saugo tave visą naktį.
Mėnulis šviečia švelniai.
Labanakt, mažyli. Labanakt.
Saldžių saldžių sapnų.`,
  theme: 'dreams',
  target_age: 1,  // 0-2 metai (UI amžius=1)
  image_style: 'dreamy',
};

// 5 paprastos scenos ilgesnei lopšinei
const SCENES = [
  {
    text: 'Mėnulis šviečia, žvaigždutės mirksi',
    characters: 'Soft glowing moon with a gentle smile, twinkling stars in deep purple-blue night sky, extremely simple and calming, baby-friendly illustration, pastel colors'
  },
  {
    text: 'Gyvūnėliai miega - meškiukas, katytė, šuniukas',
    characters: 'Cute sleeping teddy bear, tiny kitten, and puppy all sleeping together peacefully, soft pastel colors, cozy atmosphere, simple shapes for babies'
  },
  {
    text: 'Mama šalia, širdelė plaka ramiai',
    characters: 'Gentle mother figure holding sleeping baby, soft warm glow, hearts floating, extremely soothing and safe feeling, minimal background'
  },
  {
    text: 'Zuikutis ir paukšteliai miega',
    characters: 'Cute bunny sleeping under a bush, little birds sleeping in a nest on tree branch, moonlight, peaceful forest night scene'
  },
  {
    text: 'Labanakt - saldžių sapnų',
    characters: 'Baby sleeping peacefully under soft blanket, moonlight through window, floating gentle stars and sparkles, extremely soothing night scene'
  },
];

async function generateAudio(text: string): Promise<Buffer> {
  console.log('🎤 Generating soothing audio (speed: 0.7)...');
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: VOICE.settings }),
  });
  if (!response.ok) throw new Error(`ElevenLabs error: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

async function generateImage(scene: typeof SCENES[0], index: number): Promise<string> {
  console.log(`  🎨 Image ${index + 1}/${SCENES.length}...`);
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${ART_STYLE}\n\nSCENE: ${scene.characters}\n\nIMPORTANT: For babies - extremely simple, soft, calming. NO text. Large simple shapes.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });
  return result.data![0].b64_json!;
}

async function main() {
  console.log('🌙 Creating Lullaby for 1-3 year olds: ' + LULLABY.title);
  console.log('📝 Content preview:\n' + LULLABY.content.substring(0, 200) + '...\n');

  // Sugeneruoti garso įrašą
  const audioBuffer = await generateAudio(LULLABY.content);
  console.log(`✅ Audio: ${audioBuffer.byteLength} bytes`);

  // Įkelti garso įrašą
  const audioPath = `pregenerated/${Date.now()}_lullaby.mp3`;
  await supabase.storage.from('audio').upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;
  console.log(`✅ Audio uploaded: ${audioUrl}`);

  // Sugeneruoti paveikslėlius (lopšinei tik 3)
  console.log('🎨 Generating 3 simple images for lullaby...');
  const images: { base64: string; index: number; text: string }[] = [];
  for (let i = 0; i < SCENES.length; i++) {
    try {
      const base64 = await generateImage(SCENES[i], i);
      images.push({ base64, index: i, text: SCENES[i].text });
    } catch (e) {
      console.error(`  ❌ Image ${i + 1} failed:`, e);
    }
  }

  // Įkelti paveikslėlius
  const imageUrls: { url: string; index: number; text: string }[] = [];
  for (const img of images) {
    const imgPath = `pregenerated/lullaby_${Date.now()}_${img.index}.png`;
    await supabase.storage.from('story-images').upload(imgPath, Buffer.from(img.base64, 'base64'), { contentType: 'image/png' });
    imageUrls.push({
      url: supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl,
      index: img.index,
      text: img.text
    });
    console.log(`  ✅ Image ${img.index + 1} uploaded`);
  }

  // Lopšinė labai trumpa - įvertinti trukmę
  const wordCount = LULLABY.content.split(/\s+/).length;
  const duration = Math.round((wordCount / 80) * 60); // Lėtesnis skaitymas kūdikiams

  console.log('\n📊 Summary:');
  console.log(`   Words: ${wordCount} (target: 50-150)`);
  console.log(`   Images: ${images.length} (target: 1-3)`);
  console.log(`   Duration: ~${duration}s`);

  console.log('\n📋 SQL to insert:\n');
  console.log(`-- Lullaby Story for 1-3 year olds`);
  console.log(`INSERT INTO pregenerated_stories (title, content, theme, target_age, duration_seconds, audio_url, thumbnail_url, image_style, voice_id, voice_name, is_active, sort_order)`);
  console.log(`VALUES ('${LULLABY.title}', '${LULLABY.content.replace(/'/g, "''")}', '${LULLABY.theme}', ${LULLABY.target_age}, ${duration}, '${audioUrl}', '${imageUrls[0]?.url || ''}', '${LULLABY.image_style}', '${VOICE.id}', '${VOICE.name}', true, 1) RETURNING id;\n`);

  console.log(`-- Images (replace <ID> with story id):`);
  imageUrls.forEach(img => {
    console.log(`INSERT INTO pregenerated_story_images (story_id, image_url, scene_index, scene_text) VALUES ('<ID>', '${img.url}', ${img.index}, '${img.text.replace(/'/g, "''")}');`);
  });

  console.log('\n✅ Done! Run the SQL above in Supabase to add the lullaby.');
}

main().catch(console.error);
