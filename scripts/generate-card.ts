/**
 * Kortelių generavimo skriptas
 *
 * Naudojimas:
 *   npx ts-node scripts/generate-card.ts "Katė" "Cat" "animals"
 *
 * Šis skriptas sugeneruoja kortelę su:
 * - OpenAI sukurtu paveikslėliu
 * - Lietuviško pavadinimo garso įrašu, naudojant ElevenLabs
 * - Abu įkelia į Supabase saugyklą
 * - Sukuria įrašą cards lentelėje
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Aplinkos kintamieji
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = 'BIvP0GN1cAtSRTxNHnWS'; // Lietuviškai pritaikytas balsas

// Inicijuoti klientus
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateImage(nameLt: string, nameEn: string): Promise<string> {
  console.log(`🎨 Generating image for ${nameEn}...`);

  const prompt = `A cute, friendly ${nameEn} illustration for children's educational flashcard.
Style: Soft watercolor illustration, warm colors, gentle lighting.
The ${nameEn} should be the main focus, centered, looking friendly and approachable.
Background: Simple, soft gradient, not distracting.
No text, no letters, no words in the image.
Child-safe, adorable, high quality illustration.`;

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'low',
  });

  if (!response.data || !response.data[0]) {
    throw new Error('No image data returned');
  }

  const imageData = response.data[0];
  if (!imageData.b64_json) {
    throw new Error('No base64 image data returned');
  }

  console.log('✅ Image generated');
  return imageData.b64_json;
}

async function generateAudio(nameLt: string): Promise<ArrayBuffer> {
  console.log(`🔊 Generating audio for "${nameLt}"...`);

  // Naudoti lietuvišką konteksto prefiksą, kad būtų užtikrintas teisingas tarimas
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
      language_code: 'lt', // Lietuvių kalba
      voice_settings: {
        stability: 0.5, // eleven_v3 reikalauja: 0.0 (Creative), 0.5 (Natural), 1.0 (Robust)
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  console.log('✅ Audio generated');
  return response.arrayBuffer();
}

async function uploadToStorage(
  bucket: string,
  path: string,
  data: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  console.log(`📤 Uploading to ${bucket}/${path}...`);

  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload error: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  console.log('✅ Uploaded successfully');
  return urlData.publicUrl;
}

async function createCard(
  nameLt: string,
  nameEn: string,
  category: string,
  imageUrl: string,
  audioUrl: string
): Promise<void> {
  console.log('💾 Creating card record...');

  // Gauti kitą rūšiavimo eilės numerį
  const { data: lastCard } = await supabase
    .from('cards')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (lastCard?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('cards').insert({
    name_lt: nameLt,
    name_en: nameEn,
    category,
    image_url: imageUrl,
    audio_url: audioUrl,
    sort_order: sortOrder,
  });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  console.log('✅ Card created successfully');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx ts-node scripts/generate-card.ts "Katė" "Cat" [category]');
    console.log('');
    console.log('Arguments:');
    console.log('  nameLt    - Lithuanian name (e.g., "Katė")');
    console.log('  nameEn    - English name (e.g., "Cat")');
    console.log('  category  - Optional category (default: "animals")');
    process.exit(1);
  }

  const [nameLt, nameEn, category = 'animals'] = args;

  console.log('');
  console.log('🃏 Card Generator');
  console.log('================');
  console.log(`Lithuanian: ${nameLt}`);
  console.log(`English: ${nameEn}`);
  console.log(`Category: ${category}`);
  console.log('');

  try {
    // Sugeneruoti paveikslėlį
    const imageBase64 = await generateImage(nameLt, nameEn);
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Sugeneruoti garso įrašą
    const audioBuffer = await generateAudio(nameLt);

    // Sukurti unikalius failų pavadinimus
    const timestamp = Date.now();
    const slug = nameEn.toLowerCase().replace(/\s+/g, '-');
    const imagePath = `images/${category}/${slug}-${timestamp}.png`;
    const audioPath = `audio/${category}/${slug}-${timestamp}.mp3`;

    // Įkelti į saugyklą
    const imageUrl = await uploadToStorage('cards', imagePath, imageBuffer, 'image/png');
    const audioUrl = await uploadToStorage('cards', audioPath, audioBuffer, 'audio/mpeg');

    // Sukurti įrašą duomenų bazėje
    await createCard(nameLt, nameEn, category, imageUrl, audioUrl);

    console.log('');
    console.log('🎉 Card generation complete!');
    console.log(`   Image: ${imageUrl}`);
    console.log(`   Audio: ${audioUrl}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
