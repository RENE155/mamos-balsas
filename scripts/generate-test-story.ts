/**
 * Sugeneruoti bandomąją pasaką 4-5 metų vaikams (gamtos tema)
 * Laikantis PREGENERATED_STORY_PLAN.md gairių
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

// Balso nustatymai - TEISINGAS greitis 0.7
const VOICE = {
  id: 'EXAVITQu4vr4xnSDxMaL',
  name: 'Sarah',
  settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 0.7,
  },
};

const ART_STYLE = "Soft watercolor children's book illustration, gentle colors, warm cozy atmosphere, cute characters with big eyes, dreamy peaceful forest setting";

// Pasaka 4-5 metų vaikams - gamtos/gyvūnų tema
const STORY = {
  title: 'Ežiukas ir rudens lapai',
  content: `[in lithuanian language] [softly] Mažas ežiukas Spyglys gyveno po senu ąžuolu. Jis turėjo minkštą pilkšvą kailį ir juodą blizgančią nosiukę. Ruduo jau atėjo į mišką.

...

[warmly] Vieną rytą Spyglys pamatė, kad lapai keičia spalvas. Žali lapai tapo geltoni, oranžiniai ir raudoni. "Kaip gražu!" - sušuko ežiukas.

...

[excited] Spyglys nusprendė surinkti pačius gražiausius lapus. Jis rado didelį auksinį klevo lapą ir ryškiai raudoną ąžuolo lapą.

...

[playfully] Staiga papūtė vėjas! Lapai ėmė šokti ore kaip drugeliai. Spyglys juokėsi ir bėgiojo kartu su jais.

...

[warmly] Kai vėjas nurimo, Spyglys pamatė savo draugę pelytę Pilkutę. "Pažiūrėk, kokius lapus radau!" - parodė jis.

...

[softly] Pilkutė pasiūlė: "Padarykime iš jų guolelį!" Kartu jie nunešė lapus po ąžuolu ir padarė minkštą, šiltą guolelį.

...

[softly] [yawns] Spyglys įsitaisė savo naujame guolelyje. Lapai kvepėjo mišku ir rudeniu. [whispers] Užmerk akis, mažyli. Saldžių sapnų. Labanakt.`,
  theme: 'nature',
  target_age: 4,
  image_style: 'watercolor',
};

const SCENES = [
  { text: 'Ežiukas gyveno po senu ąžuolu', characters: 'A cute small hedgehog with soft grey fur and shiny black nose, sitting under a big old oak tree, autumn forest' },
  { text: 'Lapai keičia spalvas - geltoni, oranžiniai, raudoni', characters: 'Small hedgehog looking up at colorful autumn leaves on trees - yellow, orange, red leaves, magical forest' },
  { text: 'Ežiukas renka gražius lapus', characters: 'Hedgehog happily collecting beautiful autumn leaves - a golden maple leaf and bright red oak leaf' },
  { text: 'Vėjas pučia, lapai šoka ore', characters: 'Hedgehog playing with flying autumn leaves in the wind, leaves dancing like butterflies, joyful scene' },
  { text: 'Ežiukas sutinka draugę pelytę', characters: 'Hedgehog showing colorful leaves to a small cute grey mouse friend, both smiling' },
  { text: 'Kartu daro guolelį iš lapų', characters: 'Hedgehog and mouse making a cozy bed from autumn leaves under the oak tree' },
  { text: 'Ežiukas miega guolelyje', characters: 'Hedgehog sleeping peacefully in a cozy nest of colorful autumn leaves, moonlight, stars, peaceful night' },
];

async function generateAudio(text: string): Promise<Buffer> {
  console.log('🎤 Generating audio (speed: 0.7)...');
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: VOICE.settings }),
  });
  if (!response.ok) throw new Error(`ElevenLabs error: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

async function generateImage(scene: typeof SCENES[0], index: number): Promise<string> {
  console.log(`  🎨 Image ${index + 1}/7...`);
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${ART_STYLE}\n\nSCENE: ${scene.characters}\n\nIMPORTANT: Child-safe, gentle, calming. NO text in image.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });
  return result.data![0].b64_json!;
}

async function main() {
  console.log('🦔 Creating: ' + STORY.title);

  // Sugeneruoti garsą
  const audioBuffer = await generateAudio(STORY.content);
  console.log(`✅ Audio: ${audioBuffer.byteLength} bytes`);

  // Įkelti garsą
  const audioPath = `pregenerated/${Date.now()}_eziukas.mp3`;
  await supabase.storage.from('audio').upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;
  console.log(`✅ Audio uploaded`);

  // Sugeneruoti paveikslėlius
  console.log('🎨 Generating images...');
  const images: { base64: string; index: number; text: string }[] = [];
  for (let i = 0; i < SCENES.length; i++) {
    try {
      const base64 = await generateImage(SCENES[i], i);
      images.push({ base64, index: i, text: SCENES[i].text });
    } catch (e) {
      console.error(`  ❌ Image ${i + 1} failed`);
    }
  }

  // Įkelti paveikslėlius
  const imageUrls: { url: string; index: number; text: string }[] = [];
  for (const img of images) {
    const imgPath = `pregenerated/eziukas_${Date.now()}_${img.index}.png`;
    await supabase.storage.from('story-images').upload(imgPath, Buffer.from(img.base64, 'base64'), { contentType: 'image/png' });
    imageUrls.push({ url: supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl, index: img.index, text: img.text });
    console.log(`  ✅ Image ${img.index + 1}`);
  }

  const wordCount = STORY.content.split(/\s+/).length;
  const duration = Math.round((wordCount / 100) * 60);

  console.log('\n📋 SQL:\n');
  console.log(`-- Story`);
  console.log(`INSERT INTO pregenerated_stories (title, content, theme, target_age, duration_seconds, audio_url, thumbnail_url, image_style, voice_id, voice_name, is_active, sort_order)`);
  console.log(`VALUES ('${STORY.title}', '${STORY.content.replace(/'/g, "''")}', '${STORY.theme}', ${STORY.target_age}, ${duration}, '${audioUrl}', '${imageUrls[0]?.url || ''}', '${STORY.image_style}', '${VOICE.id}', '${VOICE.name}', true, 4) RETURNING id;\n`);

  console.log(`-- Images (replace <ID>):`);
  imageUrls.forEach(img => {
    console.log(`INSERT INTO pregenerated_story_images (story_id, image_url, scene_index, scene_text) VALUES ('<ID>', '${img.url}', ${img.index}, '${img.text.replace(/'/g, "''")}');`);
  });
}

main().catch(console.error);
