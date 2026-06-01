/**
 * Sugeneruoti pasaką mažyliams (0-2 metai) su pasikartojančiais žodžiais
 * ir išsaugoti ją duomenų bazėje su garsu + paveikslėliais
 *
 * Naudojimas: npx ts-node scripts/generate-toddler-story.ts
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

// Meninis stilius
const ART_STYLES = {
  watercolor: "Soft watercolor children's book illustration, wet-on-wet technique, gentle color bleeding, translucent washes, warm pastel palette with peach and soft blue tones, dreamy ethereal atmosphere",
  cartoon: "Vibrant Disney-Pixar inspired 3D cartoon style, bold saturated colors, glossy surfaces, big expressive eyes, round friendly shapes",
};

// Pasakos mažyliams turinys
const TODDLER_STORY = {
  title: 'Ne! Ne! Taip!',
  content: `Mama neša puodelį. Puodelis baltas, blizgus ir šiltas. Viduje - pienas! Pienas šiltas, baltas, kvapnus. Mama šypsosi ir sako: „Ar nori pieno?" [playfully] Vaikas žiūri į puodelį. Jis galvoja, gal galėtų gerti? Bet po akimirkos sako: „Ne!" [excited] Mama šypsosi plačiai. „Nieko baisaus, mažyli, galbūt kitą kartą!"

...

Dabar mama rodo obuolį. O, koks jis raudonas! Obuolys apvalus ir blizgus, beveik kaip mažas saulės rutuliukas. Mama pakelia obuolį ir klausia: „Ar nori obuolio?" [playfully] Vaikas žiūri į obuolį. Jis mąsto, ar obuolys skanus. Bet jis vėl sako: „Ne!" [excited] Mama juokiasi. „Gerai, mažyli, galbūt kitą kartą, kai nori saldumo!"

...

Mama dabar atneša meškiuką. Meškiukas minkštas, pūkuotas, su mielomis akytėmis ir dideliu, šiltu nosyčiu. Mama apkabina meškiuką ir sako: „Ar nori meškiuko?" [playfully] Vaikas žiūri į meškiuką, jis yra toks mielas! Bet vaikas tvirtai sako: „Ne!" [excited] Mama šypsosi, juokiasi: „Na, gerai, mažyli, meškiukas galėtų palaukti!"

...

Mama ridenėja kamuolį. Kamuolys spalvotas, ryškus ir šokinėja! Mėlynas, žalias, raudonas - kaip vaivorykštė! Mama paklausia: „Ar nori žaisti su kamuoliu?" [playfully] Vaikas žiūri į kamuolį, jis atrodo labai smagus! Bet jis sako: „Ne!" [excited] Mama nusišypso: „Jokių problemų, mažyli, gal kitą kartą!"

...

Mama atneša knygutę. Knygutė stora, su gražiais paveikslėliais ir spalvomis. Mama atverčia knygutę ir sako: „Ar nori paskaityti knygutę?" [playfully] Vaikas žiūri į knygutę, jo akys švytinčios. Bet staiga jis sako: „Ne!" [excited] Mama plačiai šypsosi: „Visiškai suprantu, mažyli, knygutė gali palaukti!"

...

Dabar mama nori pabučiuoti. Ji artėja, šypsosi, o vaikas žiūri, galvoja ilgai... Ar tai bus malonu? Ar tai bus šilta? Bet jis vis tiek sako: „Ne!" [excited] Mama švelniai juokiasi: „Na, viskas gerai, mažyli, aš būsiu čia, kai tu pasiruoši!"

...

Galiausiai ateina laikas apkabinimui. Mama šypsosi plačiai, jos akys glotnina. „Ar nori apkabinimo?" [playfully] Vaikas žiūri, jis galvoja. Jaučiasi taip saugus mamos glėbyje, jis myli mamos šypseną. Ir staiga jis sako: „TAIP!" [warmly] Mama apkabina jį stipriai, ramiai, viskas yra gerai. Ji sako: „Aš myliu tave, mano mažyli."

...

Mama ir vaikas kartu sėdi, juokiasi, žaidžia. Jis jaučiasi laimingas, jaučiasi mylimas. Mama sako: „Laikas ilsėtis, mano mažyli. Ateik, apkabink mane dar kartą." [softly] Jie abu susiglaudžia, švelniai, ramiai. Meilė yra aplink, meilė yra jų širdyse.

...

Mama murmuliuoja švelnias dainas, o vaikas užmerkia akytes. Jis žino, kad yra saugus, kad mama yra čia. Jis myli mamos apkabinimus, jie kaip šilti debesėliai. [whispers] Miegas artėja, jis jaučia ramybę.

...

Miegas ateina lėtai, kaip švelnus vėjas. Mama švelniai sako: „Aš myliu tave amžinai, mažyli. Miegok ramiai." [whispers] Vaikas užmiega mamos glėbyje, ir sapnuoja svajones apie meilę, apie šilumą, apie apkabinimus.

...

[yawns] Miegok ramiai, mažyli, miegok ramiai. Mama yra čia. Labanakt.`,
  theme: 'family',
  target_age: 1,
  image_style: 'cartoon' as const,
};

// Scenos paveikslėlių generavimui (supaprastintos pasakai mažyliams)
const SCENES = [
  { text: 'Mama neša puodelį su pienu vaikui', mood: 'warm', characters: ['mama', 'vaikas', 'puodelis'] },
  { text: 'Mama rodo raudoną obuolį, vaikas sako Ne', mood: 'playful', characters: ['mama', 'vaikas', 'obuolys'] },
  { text: 'Mama laiko minkštą meškiuką', mood: 'cozy', characters: ['mama', 'vaikas', 'meškiukas'] },
  { text: 'Mama ridenėja spalvotą kamuolį', mood: 'playful', characters: ['mama', 'vaikas', 'kamuolys'] },
  { text: 'Mama atneša knygutę su paveikslėliais', mood: 'warm', characters: ['mama', 'vaikas', 'knygutė'] },
  { text: 'Mama nori pabučiuoti vaiką', mood: 'loving', characters: ['mama', 'vaikas'] },
  { text: 'Mama ir vaikas apkabina vienas kitą, vaikas sako TAIP', mood: 'loving', characters: ['mama', 'vaikas'] },
];

async function generateAudio(text: string): Promise<Buffer> {
  console.log('🎤 Generating audio with ElevenLabs...');

  // Naudoti Sarah balsą - švelnus ir šiltas
  const voiceId = 'EXAVITQu4vr4xnSDxMaL';

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
        similarity_boost: 0.8,
        speed: 0.7, // Lėtas prieš miegą
      },
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

async function generateImage(sceneDescription: string, mood: string): Promise<string> {
  const styleDesc = ART_STYLES[TODDLER_STORY.image_style];

  const prompt = `${styleDesc}

SCENE: A loving Lithuanian mother with a toddler baby (1-2 years old). ${sceneDescription}

STYLE: Cute, round, baby-friendly illustration. Big expressive eyes. Soft warm colors. Cozy bedroom/living room setting.
MOOD: ${mood}, bedtime story atmosphere
IMPORTANT: Child-safe, gentle, calming. NO text or words in image.`;

  console.log(`  🎨 Generating image: ${sceneDescription.substring(0, 40)}...`);

  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'low',
  });

  if (!result.data || !result.data[0]?.b64_json) {
    throw new Error('No image data returned');
  }

  return result.data[0].b64_json;
}

async function main() {
  console.log('🍼 Creating toddler story: ' + TODDLER_STORY.title);
  console.log('─'.repeat(50));

  // Patikrinti aplinkos kintamuosius
  if (!supabaseKey) {
    console.error('❌ Missing Supabase key in .env');
    process.exit(1);
  }

  // Gauti pirmą naudotoją (arba galima nurodyti user_id)
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.error('❌ No users found in database');
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`📱 Creating story for user: ${userId}`);

  // 1. Sugeneruoti garsą
  const audioBuffer = await generateAudio(TODDLER_STORY.content);

  // 2. Įkelti garsą
  console.log('📤 Uploading audio...');
  const audioPath = `${userId}/${Date.now()}_toddler.mp3`;
  const { error: audioError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });

  if (audioError) throw audioError;

  const { data: audioUrlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
  console.log(`✅ Audio uploaded: ${audioUrlData.publicUrl}`);

  // 3. Sugeneruoti paveikslėlius (lygiagrečiai)
  console.log('🎨 Generating 7 images in parallel...');
  const imagePromises = SCENES.map((scene, i) =>
    generateImage(scene.text, scene.mood)
      .then(base64 => ({ base64, index: i, text: scene.text }))
      .catch(err => {
        console.error(`  ❌ Image ${i + 1} failed:`, err.message);
        return null;
      })
  );

  const imageResults = await Promise.all(imagePromises);
  const images = imageResults.filter(Boolean) as { base64: string; index: number; text: string }[];
  console.log(`✅ Generated ${images.length} images`);

  // 4. Įkelti miniatiūrą (pirmas paveikslėlis)
  let thumbnailUrl: string | null = null;
  if (images.length > 0) {
    const thumbBytes = Buffer.from(images[0].base64, 'base64');
    const thumbPath = `${userId}/${Date.now()}_toddler_thumb.png`;
    await supabase.storage.from('story-images').upload(thumbPath, thumbBytes, { contentType: 'image/png' });
    const { data: thumbUrlData } = supabase.storage.from('story-images').getPublicUrl(thumbPath);
    thumbnailUrl = thumbUrlData.publicUrl;
    console.log(`✅ Thumbnail uploaded`);
  }

  // 5. Apskaičiuoti trukmę
  const wordCount = TODDLER_STORY.content.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 120) * 60); // ~120 žodžių per minutę lėtai

  // 6. Išsaugoti pasaką duomenų bazėje
  console.log('💾 Saving story to database...');
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      title: TODDLER_STORY.title,
      content: TODDLER_STORY.content,
      theme: TODDLER_STORY.theme,
      target_age: TODDLER_STORY.target_age,
      duration_seconds: durationSeconds,
      audio_url: audioUrlData.publicUrl,
      thumbnail_url: thumbnailUrl,
      image_style: TODDLER_STORY.image_style,
      is_favorite: false,
    })
    .select()
    .single();

  if (storyError) throw storyError;
  console.log(`✅ Story saved with ID: ${story.id}`);

  // 7. Įkelti ir išsaugoti paveikslėlius
  console.log('📤 Uploading images to storage...');
  for (const img of images) {
    const imgBytes = Buffer.from(img.base64, 'base64');
    const imgPath = `${userId}/${story.id}/${img.index}.png`;

    const { error: imgUploadError } = await supabase.storage
      .from('story-images')
      .upload(imgPath, imgBytes, { contentType: 'image/png' });

    if (imgUploadError) {
      console.error(`  ❌ Failed to upload image ${img.index}:`, imgUploadError);
      continue;
    }

    const { data: imgUrlData } = supabase.storage.from('story-images').getPublicUrl(imgPath);

    await supabase.from('story_images').insert({
      story_id: story.id,
      image_url: imgUrlData.publicUrl,
      scene_index: img.index,
      scene_text: img.text,
    });

    console.log(`  ✅ Image ${img.index + 1}/7 saved`);
  }

  console.log('─'.repeat(50));
  console.log(`🎉 DONE! Story "${TODDLER_STORY.title}" created`);
  console.log(`📱 Open your app to see it!`);
  console.log(`⏱️  Duration: ${Math.round(durationSeconds / 60)} minutes`);
}

main().catch(console.error);
