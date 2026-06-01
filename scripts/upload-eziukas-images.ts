import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

const STORY_ID = 'ad947dda-a68f-4a2b-93f5-3bf686f07a17';
const ART_STYLE = "Soft watercolor children's book illustration, gentle colors, warm cozy atmosphere, cute characters with big eyes, dreamy peaceful forest setting";

const SCENES = [
  { text: 'Ežiukas gyveno po senu ąžuolu', characters: 'A cute small hedgehog with soft grey fur and shiny black nose, sitting under a big old oak tree, autumn forest' },
  { text: 'Lapai keičia spalvas', characters: 'Small hedgehog looking up at colorful autumn leaves on trees - yellow, orange, red leaves, magical forest' },
  { text: 'Ežiukas renka gražius lapus', characters: 'Hedgehog happily collecting beautiful autumn leaves - a golden maple leaf and bright red oak leaf' },
  { text: 'Vėjas pučia, lapai šoka ore', characters: 'Hedgehog playing with flying autumn leaves in the wind, leaves dancing like butterflies, joyful scene' },
  { text: 'Ežiukas sutinka draugę pelytę', characters: 'Hedgehog showing colorful leaves to a small cute grey mouse friend, both smiling' },
  { text: 'Kartu daro guolelį iš lapų', characters: 'Hedgehog and mouse making a cozy bed from autumn leaves under the oak tree' },
  { text: 'Ežiukas miega guolelyje', characters: 'Hedgehog sleeping peacefully in a cozy nest of colorful autumn leaves, moonlight, stars, peaceful night' },
];

async function main() {
  console.log('🎨 Generating images for Ežiukas story...');

  for (let i = 0; i < SCENES.length; i++) {
    try {
      console.log(`  Image ${i + 1}/7...`);
      const result = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `${ART_STYLE}\n\nSCENE: ${SCENES[i].characters}\n\nChild-safe, gentle. NO text.`,
        n: 1,
        size: '1024x1536',
        quality: 'medium',
      });

      const base64 = result.data![0].b64_json!;
      const imgPath = `pregenerated/${STORY_ID}/${i}.png`;

      await supabase.storage.from('story-images').upload(imgPath, Buffer.from(base64, 'base64'), { contentType: 'image/png' });
      const url = supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl;

      // Atnaujinti miniatiūrą pirmam paveikslėliui
      if (i === 0) {
        console.log(`  Updating thumbnail...`);
        // Bus atlikta per SQL
      }

      console.log(`  ✅ ${i + 1}/7 - ${url}`);
      console.log(`INSERT INTO pregenerated_story_images (story_id, image_url, scene_index, scene_text) VALUES ('${STORY_ID}', '${url}', ${i}, '${SCENES[i].text}');`);
    } catch (e: any) {
      console.error(`  ❌ ${i + 1}/7 failed:`, e.message);
    }
  }
}

main();
