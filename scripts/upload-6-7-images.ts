/**
 * Įkelti paveikslėlius pasakai 6-7 metų vaikams
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const STORY_ID = '2c9246e0-a43c-43b9-ac5c-6ed343f64bc8';

const ART_STYLE = "Enchanting children's storybook illustration, soft watercolor with gentle ink outlines, warm glowing colors, magical atmosphere with subtle sparkles, dreamy night sky with stars, cozy and safe feeling";

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
  console.log('🎨 Generating and uploading images for story...');
  console.log('Story ID:', STORY_ID);
  console.log('─'.repeat(50));

  // Sugeneruoti visus paveikslėlius
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

  // Įkelti miniatiūrą (pirmas paveikslėlis)
  if (images.length > 0) {
    const thumbBytes = Buffer.from(images[0].base64, 'base64');
    const thumbPath = `pregenerated/${Date.now()}_astronautas_thumb.png`;
    await supabase.storage.from('story-images').upload(thumbPath, thumbBytes, { contentType: 'image/png' });
    const { data: thumbUrlData } = supabase.storage.from('story-images').getPublicUrl(thumbPath);

    // Atnaujinti pasaką su miniatiūra
    await supabase
      .from('pregenerated_stories')
      .update({ thumbnail_url: thumbUrlData.publicUrl })
      .eq('id', STORY_ID);

    console.log(`✅ Thumbnail uploaded and story updated`);
  }

  // Įkelti ir išsaugoti visus paveikslėlius
  console.log('📤 Uploading images to storage...');
  for (const img of images) {
    const imgBytes = Buffer.from(img.base64, 'base64');
    const imgPath = `pregenerated/${STORY_ID}/${img.index}.png`;

    const { error: imgUploadError } = await supabase.storage
      .from('story-images')
      .upload(imgPath, imgBytes, { contentType: 'image/png' });

    if (imgUploadError) {
      console.error(`  ❌ Failed to upload image ${img.index}:`, imgUploadError);
      continue;
    }

    const { data: imgUrlData } = supabase.storage.from('story-images').getPublicUrl(imgPath);

    const { error: insertError } = await supabase.from('pregenerated_story_images').insert({
      story_id: STORY_ID,
      image_url: imgUrlData.publicUrl,
      scene_index: img.index,
      scene_text: img.text,
    });

    if (insertError) {
      console.error(`  ❌ Failed to save image ${img.index} to DB:`, insertError);
      continue;
    }

    console.log(`  ✅ Image ${img.index + 1}/7 saved`);
  }

  console.log('─'.repeat(50));
  console.log('🎉 DONE! All images uploaded.');
}

main().catch(console.error);
