/**
 * Sugeneruoti iš anksto paruoštą pasaką 6-7 metų vaikams (kosmoso nuotykis)
 * Išsaugo į pregenerated_stories lentelę su garso įrašu + paveikslėliais
 *
 * Naudojimas: npx ts-node scripts/generate-6-7-story.ts
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

// Meno stilius pasakų knygelės iliustracijoms
const ART_STYLE = "Enchanting children's storybook illustration, soft watercolor with gentle ink outlines, warm glowing colors, magical atmosphere with subtle sparkles, dreamy night sky with stars, cozy and safe feeling";

// Pasaka 6-7 metų vaikams - kosmoso nuotykis
const STORY = {
  title: 'Mažasis astronautas Lukas',
  content: `[softly] Mažasis berniukas Lukas labai mylėjo žvaigždes. Kiekvieną vakarą jis žiūrėdavo pro langą į dangų ir svajodavo apie kosmoso keliones. Jo kambaryje kabojo planetų žemėlapiai, o lentynoje stovėjo mažas sidabrinis raketos modelis.

...

[excited] Vieną naktį, kai mėnulis švietė ypač ryškiai, Lukas išgirdo tylų zvimbimą. Jo mažoji raketa švytėjo! "Ar nori pakeliauti?" - sušnibždėjo raketa. Lukui iš nuostabos išsiplėtė akys. "Taip!" - sušuko jis ir įšoko į vidų.

...

[warmly] Raketa pakilo aukštyn, pro debesis, pro mėnulį, tiesiai į žvaigždes! Lukas matė Žemę - ji atrodė kaip gražus mėlynas kamuoliukas. "Kokia nuostabi mūsų planeta," - pagalvojo jis ir pajuto, kaip labai myli savo namus.

...

[whispers] Staiga Lukas pamatė mažą šviečiančią žvaigždutę, kuri verkė. "Kodėl tu liūdna?" - paklausė Lukas. "Aš pasiklydau ir negaliu rasti savo šeimos," - atsakė žvaigždutė vardu Astra.

...

[warmly] Lukas nusprendė padėti. Jis pasižiūrėjo į žvaigždėlapį ir rado kelią. "Sek paskui mane!" - tarė jis drąsiai. Kartu jie skrido pro sidabrinius ūkus ir spindinčias galaktikas, kol pamatė šiltai šviečiančią žvaigždžių šeimą.

...

[excited] "Astra! Tu grįžai!" - džiaugėsi žvaigždės. Astra spindėjo laimingai ir padėkojo Lukui: "Tu esi tikras draugas ir drąsus keliautojas. Kai pažvelgsi į dangų, visada rasi mane - aš būsiu ryškiausia žvaigždė."

...

[softly] [yawns] Raketa švelniai parnešė Luką namo. Jis įlindo į šiltą lovelę ir pažvelgė pro langą. Ten, danguje, švietė Astra - jo nauja draugė. [whispers] Užmerk akeles, mažasis keliautojas. Žvaigždės saugo tave. Saldžių sapnų apie nuostabias keliones. Labanakt.`,
  theme: 'space',
  target_age: 6,
  image_style: 'watercolor',
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  voice_name: 'Sarah',
};

// Scenos paveikslėlių generavimui
const SCENES = [
  {
    text: 'Berniukas Lukas žiūri pro langą į žvaigždėtą dangų, kambaryje planetų žemėlapiai',
    mood: 'dreamy, wonder',
    characters: 'A 6-year-old Lithuanian boy with brown hair looking through window at starry night sky, bedroom with planet posters and small silver rocket model on shelf',
  },
  {
    text: 'Mažoji raketa švyti, Lukas įšoka į raketą',
    mood: 'magical, excited',
    characters: 'The same boy climbing into a small glowing silver rocket in his bedroom, magical sparkles around',
  },
  {
    text: 'Raketa skrenda kosmose, Lukas mato Žemę kaip mėlyną kamuoliuką',
    mood: 'awe, wonder',
    characters: 'Boy in small rocket flying through space, Earth visible as beautiful blue marble below, stars all around',
  },
  {
    text: 'Lukas sutinka liūdną šviečiančią žvaigždutę Astrą',
    mood: 'gentle, caring',
    characters: 'Boy in rocket meeting a small sad glowing star character with a cute face, dark space background with distant stars',
  },
  {
    text: 'Lukas ir Astra skrenda kartu per galaktikas ieškodami žvaigždės šeimos',
    mood: 'adventure, friendship',
    characters: 'Boy in rocket flying alongside the little star through colorful nebulas and galaxies, silver clouds',
  },
  {
    text: 'Astra randa savo šeimą - kitas šviečiančias žvaigždes, visi džiaugiasi',
    mood: 'joyful, warm',
    characters: 'The little star reuniting with a family of glowing stars, all happy, boy watching from his rocket',
  },
  {
    text: 'Lukas miega lovelėje, pro langą matosi ryškiausia žvaigždė Astra',
    mood: 'peaceful, sleepy',
    characters: 'Boy sleeping peacefully in cozy bed, window showing night sky with one extra bright star (Astra), soft moonlight',
  },
];

async function generateAudio(text: string): Promise<Buffer> {
  console.log('🎤 Generating audio with ElevenLabs...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${STORY.voice_id}`, {
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
        speed: 0.85, // Lėtas miego metui
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

async function generateImage(scene: typeof SCENES[0], index: number): Promise<string> {
  const prompt = `${ART_STYLE}

SCENE: ${scene.characters}

MOOD: ${scene.mood}, bedtime story atmosphere, safe and cozy feeling
IMPORTANT: Child-safe, gentle, calming illustration for 6-7 year old children. NO text or words in image. Magical but not scary.`;

  console.log(`  🎨 Generating image ${index + 1}/7: ${scene.text.substring(0, 40)}...`);

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
  console.log('🚀 Creating story for 6-7 year olds: ' + STORY.title);
  console.log('─'.repeat(50));

  // Patikrinti aplinkos kintamuosius
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
  }
  if (!elevenLabsApiKey) {
    console.error('❌ Missing EXPO_PUBLIC_ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  // 1. Sugeneruoti garso įrašą
  const audioBuffer = await generateAudio(STORY.content);

  // 2. Įkelti garso įrašą į saugyklą
  console.log('📤 Uploading audio...');
  const audioPath = `pregenerated/${Date.now()}_astronautas_lukas.mp3`;
  const { error: audioError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

  if (audioError) throw audioError;

  const { data: audioUrlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
  console.log(`✅ Audio uploaded: ${audioUrlData.publicUrl}`);

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

  // 4. Įkelti miniatiūrą (pirmas paveikslėlis)
  let thumbnailUrl: string | null = null;
  if (images.length > 0) {
    const thumbBytes = Buffer.from(images[0].base64, 'base64');
    const thumbPath = `pregenerated/${Date.now()}_astronautas_thumb.png`;
    await supabase.storage.from('story-images').upload(thumbPath, thumbBytes, { contentType: 'image/png' });
    const { data: thumbUrlData } = supabase.storage.from('story-images').getPublicUrl(thumbPath);
    thumbnailUrl = thumbUrlData.publicUrl;
    console.log(`✅ Thumbnail uploaded`);
  }

  // 5. Apskaičiuoti trukmę (žodžiai / 130 žodžių per minutę lėtesniam tempui)
  const wordCount = STORY.content.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 130) * 60);

  // 6. Išsaugoti pasaką į pregenerated_stories lentelę
  console.log('💾 Saving story to pregenerated_stories...');
  const { data: story, error: storyError } = await supabase
    .from('pregenerated_stories')
    .insert({
      title: STORY.title,
      content: STORY.content,
      theme: STORY.theme,
      target_age: STORY.target_age,
      duration_seconds: durationSeconds,
      audio_url: audioUrlData.publicUrl,
      thumbnail_url: thumbnailUrl,
      character_descriptions: null,
      image_style: STORY.image_style,
      voice_id: STORY.voice_id,
      voice_name: STORY.voice_name,
      is_active: true,
      sort_order: 2, // Po esamų 2 pasakų
    })
    .select()
    .single();

  if (storyError) throw storyError;
  console.log(`✅ Story saved with ID: ${story.id}`);

  // 7. Įkelti ir išsaugoti paveikslėlius į pregenerated_story_images
  console.log('📤 Uploading images...');
  for (const img of images) {
    const imgBytes = Buffer.from(img.base64, 'base64');
    const imgPath = `pregenerated/${story.id}/${img.index}.png`;

    const { error: imgUploadError } = await supabase.storage
      .from('story-images')
      .upload(imgPath, imgBytes, { contentType: 'image/png' });

    if (imgUploadError) {
      console.error(`  ❌ Failed to upload image ${img.index}:`, imgUploadError);
      continue;
    }

    const { data: imgUrlData } = supabase.storage.from('story-images').getPublicUrl(imgPath);

    await supabase.from('pregenerated_story_images').insert({
      story_id: story.id,
      image_url: imgUrlData.publicUrl,
      scene_index: img.index,
      scene_text: img.text,
    });

    console.log(`  ✅ Image ${img.index + 1}/7 saved`);
  }

  console.log('─'.repeat(50));
  console.log(`🎉 DONE! Story "${STORY.title}" created for 6-7 year olds`);
  console.log(`📱 Theme: ${STORY.theme}`);
  console.log(`⏱️  Duration: ~${Math.round(durationSeconds / 60)} minutes`);
  console.log(`🖼️  Images: ${images.length}`);
}

main().catch(console.error);
