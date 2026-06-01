/**
 * Sugeneruoti PILNĄ iš anksto paruoštą pasaką su paveikslėliais + garso įrašu
 * Lygiai kaip personalizuotos pasakos, bet su Sarah balsu
 *
 * Naudojimas: npx ts-node scripts/generate-full-story.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Aplinka
const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sarah balsas - geriausiai tinka pasakoms prieš miegą
const VOICE = { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' };

// Meno stilius
const ART_STYLE = "Soft watercolor children's book illustration, wet-on-wet technique, gentle color bleeding, translucent washes, warm pastel palette with peach and soft blue tones, dreamy ethereal atmosphere, dappled sunlight";

interface CharacterDescription {
  name: string;
  type: string;
  appearance: {
    size: string;
    mainColor: string;
    texture: string;
    eyes: string;
    distinctiveFeatures: string[];
  };
  clothing?: {
    item: string;
    color: string;
    details: string;
  };
}

interface Scene {
  index: number;
  text: string;
  visualDescription: string;
  characters: string[];
  mood: string;
}

// =============================================================================
// PASAKOS TURINYS - 7 pastraipos 4-6 metų vaikams, ~3 minutės
// Ilgesnės pauzės tarp pastraipų paveikslėlių perėjimams
// =============================================================================
const STORY = {
  title: 'Mažojo meškiuko sapnas',
  theme: 'dreams',
  target_age: 5,
  image_style: 'watercolor',
  content: `[softly] Seniai seniai, giliai giliai miške, po didžiuoju šimtamečiu ąžuolu, gyveno mažas meškiukas, vardu Rudis. Jis turėjo minkštą rudą kailį ir mažas apvalias ausytes.

... ... ... ... ... ... ... ... ... ...

[warmly] Kiekvieną dieną Rudis žaisdavo su savo geriausiais draugais - voveryte Rūta ir zuikučiu Balčiu. Jie bėgiodavo po mišką, rinkdavo uogas ir juokdavosi kartu.

... ... ... ... ... ... ... ... ... ...

[yawns] Bet vieną vakarą, kai saulė leidosi už aukštų medžių, Rudis pajuto, kad jo kojelės pavargo, o akys pradėjo merktis. [softly] "Mama, aš noriu gražaus sapno," - tyliai pasakė mažasis meškiukas.

... ... ... ... ... ... ... ... ... ...

[whispers] Mama meškienė švelniai apkabino Rudį ir tarė: "Užsimerk, mažyli. Kai užmerki akis, tavo širdelėje atsiveria stebuklingos auksinės durys."

... ... ... ... ... ... ... ... ... ...

[softly] Rudis užmerkė akis ir pajuto, kaip lengvai lengvai pakyla į dangų. [excited] Jis skrido pro pūkuotus baltuosius debesis! Debesys buvo tokie minkšti - minkštesni už pačią minkščiausią pagalvėlę.

... ... ... ... ... ... ... ... ... ...

[giggles] "Labas, mažasis meškiuk!" - linksmai sušuko draugiškas rožinis debesėlis. [whispers] Tada pasirodė sidabrinė žvaigždutė. "Aš saugosiu tave visą naktį," - pažadėjo ji.

... ... ... ... ... ... ... ... ... ...

[softly] Debesėliai švelniai sūpavo Rudį, o žvaigždutės dainavo tylią lopšinę. [yawns] [whispers] Ir tu, mažasis drauge, gali keliauti į sapnų šalį. Užmerk akeles. Labanakt. Saldžių saldžių sapnų.`,
};

// =============================================================================
// 1 ŽINGSNIS: Išskirti veikėjus
// =============================================================================
async function extractCharacters(storyText: string): Promise<CharacterDescription[]> {
  console.log('\n[1/6] Extracting characters...');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing children's stories and extracting character descriptions.
Return a JSON array with this structure:
{
  "characters": [
    {
      "name": "Character name",
      "type": "animal/person type",
      "appearance": {
        "size": "size description",
        "mainColor": "primary color",
        "texture": "fur/skin texture",
        "eyes": "eye description",
        "distinctiveFeatures": ["feature1", "feature2"]
      },
      "clothing": { "item": "clothing", "color": "color", "details": "details" }
    }
  ]
}`,
      },
      { role: 'user', content: `Extract characters from:\n\n${storyText}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  const characters = parsed.characters || [];
  console.log(`   Found ${characters.length} characters:`, characters.map((c: any) => c.name).join(', '));
  return characters;
}

// =============================================================================
// 2 ŽINGSNIS: Analizuoti scenas (1 pastraipa = 1 scena = 1 paveikslėlis)
// =============================================================================
async function analyzeScenes(storyText: string, characters: CharacterDescription[]): Promise<Scene[]> {
  console.log('\n[2/6] Analyzing scenes...');

  const paragraphs = storyText
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20 && !p.match(/^\.+$/));

  console.log(`   Found ${paragraphs.length} paragraphs`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Create EXACTLY 1 scene for EACH paragraph. Return JSON:
{
  "scenes": [
    {
      "index": 0,
      "text": "Full paragraph text",
      "visualDescription": "Detailed visual description for illustrator",
      "characters": ["Character names"],
      "mood": "cozy/magical/peaceful"
    }
  ]
}
Characters: ${characters.map((c) => c.name).join(', ')}`,
      },
      {
        role: 'user',
        content: paragraphs.map((p, i) => `PARAGRAPH ${i + 1}:\n${p}`).join('\n\n'),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  const scenes = parsed.scenes || [];
  console.log(`   Created ${scenes.length} scenes`);
  return scenes;
}

// =============================================================================
// 3 ŽINGSNIS: Sugeneruoti paveikslėlius
// =============================================================================
async function generateImages(
  scenes: Scene[],
  characters: CharacterDescription[]
): Promise<Array<{ base64: string; prompt: string; sceneIndex: number; sceneText: string }>> {
  console.log(`\n[3/6] Generating ${scenes.length} images...`);

  const images: Array<{ base64: string; prompt: string; sceneIndex: number; sceneText: string }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Sukurti prompt su veikėjų nuoseklumu
    const sceneCharacters = characters.filter((c) =>
      scene.characters.some(
        (name) => name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(name.toLowerCase())
      )
    );

    const characterDesc = sceneCharacters
      .map((char) => {
        let desc = `${char.name} (${char.type}): ${char.appearance.size}, ${char.appearance.mainColor} ${char.appearance.texture}, ${char.appearance.eyes}`;
        if (char.appearance.distinctiveFeatures.length > 0) {
          desc += `, ${char.appearance.distinctiveFeatures.join(', ')}`;
        }
        if (char.clothing) {
          desc += `. Wearing ${char.clothing.color} ${char.clothing.item}`;
        }
        return desc;
      })
      .join('\n- ');

    const prompt = `${ART_STYLE}

SCENE: ${scene.visualDescription}

CHARACTERS IN SCENE:
- ${characterDesc || 'No specific characters'}

MOOD: ${scene.mood}, suitable for a bedtime story

IMPORTANT RULES:
- NO text, words, letters, or numbers in the image
- Child-safe, gentle, calming imagery
- Maintain exact character appearances as described
- Soft, warm lighting appropriate for bedtime`;

    console.log(`   Generating image ${i + 1}/${scenes.length}...`);

    try {
      const result = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1536', // Vertikalus formatas mobiliesiems
        quality: 'low',
      });

      if (result.data && result.data[0] && result.data[0].b64_json) {
        images.push({
          base64: result.data[0].b64_json,
          prompt,
          sceneIndex: scene.index,
          sceneText: scene.text,
        });
        console.log(`   ✅ Image ${i + 1} done`);
      }
    } catch (error) {
      console.error(`   ❌ Image ${i + 1} failed:`, error);
    }
  }

  return images;
}

// =============================================================================
// 4 ŽINGSNIS: Sugeneruoti garso įrašą su ElevenLabs v3 (LĖTAS miego metui)
// =============================================================================
async function generateAudio(text: string): Promise<Buffer> {
  console.log('\n[4/6] Generating audio with Sarah voice (slow pace)...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5, // Natural režimas (turi būti 0.0, 0.5 arba 1.0)
        similarity_boost: 0.75,
        speed: 0.5, // ITIN LĖTAS - mažiausias greitis miego metui
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`   ✅ Audio generated: ${buffer.length} bytes`);
  return buffer;
}

// =============================================================================
// 5 ŽINGSNIS: Įkelti į Supabase
// =============================================================================
async function uploadToStorage(
  bucket: string,
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, data, { contentType, upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

// =============================================================================
// PAGRINDINĖ FUNKCIJA
// =============================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING FULL PREGENERATED STORY WITH IMAGES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Title: ${STORY.title}`);
  console.log(`Voice: ${VOICE.name} (speed: 0.5 - ultra slow)`);
  console.log(`Style: watercolor`);

  // 1 žingsnis: Išskirti veikėjus
  const characters = await extractCharacters(STORY.content);

  // 2 žingsnis: Analizuoti scenas
  const scenes = await analyzeScenes(STORY.content, characters);

  // 3 žingsnis: Sugeneruoti paveikslėlius (lygiagrečiai būtų greičiau, bet nuosekliai saugiau)
  const images = await generateImages(scenes, characters);

  // 4 žingsnis: Sugeneruoti garso įrašą
  const audioBuffer = await generateAudio(STORY.content);

  // 5 žingsnis: Įkelti viską
  console.log('\n[5/6] Uploading to Supabase...');
  const timestamp = Date.now();

  // Įkelti garso įrašą (pašalinti specialius simbolius iš failo pavadinimo)
  const safeTitle = STORY.title.replace(/[^a-zA-Z0-9]/g, '_');
  const audioPath = `pregenerated/${timestamp}_${safeTitle}.mp3`;
  const audioUrl = await uploadToStorage('audio', audioPath, audioBuffer, 'audio/mpeg');
  console.log(`   ✅ Audio uploaded`);

  // Įkelti paveikslėlius ir gauti URL
  const imageUrls: Array<{ url: string; sceneIndex: number; sceneText: string; prompt: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imgBuffer = Buffer.from(img.base64, 'base64');
    const imgPath = `pregenerated/${timestamp}_scene_${i}.png`;
    const imgUrl = await uploadToStorage('story-images', imgPath, imgBuffer, 'image/png');
    imageUrls.push({
      url: imgUrl,
      sceneIndex: img.sceneIndex,
      sceneText: img.sceneText,
      prompt: img.prompt,
    });
    console.log(`   ✅ Image ${i + 1} uploaded`);
  }

  // Miniatiūra = pirmas paveikslėlis
  const thumbnailUrl = imageUrls.length > 0 ? imageUrls[0].url : null;

  // Apskaičiuoti trukmę (ffprobe būtų geriau, kol kas įvertinama apytiksliai)
  // Esant 0.75 greičiui, ~100 žodžių per minutę
  const wordCount = STORY.content.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 100) * 60);

  // 6 žingsnis: Išvesti SQL įterpimui į duomenų bazę
  console.log('\n[6/6] Database insertion...');
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' STORY DATA (for database):');
  console.log('═══════════════════════════════════════════════════════════════');

  // Išsaugoti vietiniuose failuose nuorodai
  fs.writeFileSync(
    'generated_story_data.json',
    JSON.stringify(
      {
        story: {
          title: STORY.title,
          theme: STORY.theme,
          target_age: STORY.target_age,
          duration_seconds: durationSeconds,
          audio_url: audioUrl,
          thumbnail_url: thumbnailUrl,
          image_style: STORY.image_style,
          voice_id: VOICE.id,
          voice_name: VOICE.name,
          content: STORY.content,
          character_descriptions: characters,
        },
        images: imageUrls,
      },
      null,
      2
    )
  );

  console.log(`\nAudio URL: ${audioUrl}`);
  console.log(`Thumbnail URL: ${thumbnailUrl}`);
  console.log(`Duration: ~${durationSeconds} seconds`);
  console.log(`Images: ${imageUrls.length}`);
  console.log(`\n✅ Data saved to: generated_story_data.json`);
  console.log('\nRun the SQL insertion next!');
}

main().catch(console.error);
