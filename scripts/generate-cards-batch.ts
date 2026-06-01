/**
 * Kortelių generavimo paketinis skriptas
 *
 * Naudojimas:
 *   npx ts-node scripts/generate-cards-batch.ts
 *
 * Sugeneruoja kelias korteles iš žemiau esančio ANIMALS sąrašo.
 * Redaguokite sąrašą, norėdami pridėti arba pašalinti gyvūnus.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ==========================================
// REDAGUOKITE ŠĮ SĄRAŠĄ, NORĖDAMI PRIDĖTI DAUGIAU GYVŪNŲ
// ==========================================
const ANIMALS: Array<{ lt: string; en: string }> = [
  { lt: 'Katė', en: 'Cat' },
  { lt: 'Šuo', en: 'Dog' },
  { lt: 'Kiškis', en: 'Rabbit' },
  { lt: 'Pelė', en: 'Mouse' },
  { lt: 'Dramblys', en: 'Elephant' },
  { lt: 'Liūtas', en: 'Lion' },
  { lt: 'Žirafa', en: 'Giraffe' },
  { lt: 'Meška', en: 'Bear' },
  { lt: 'Voverė', en: 'Squirrel' },
  { lt: 'Paukštis', en: 'Bird' },
  { lt: 'Žuvis', en: 'Fish' },
  { lt: 'Varlė', en: 'Frog' },
  { lt: 'Drugelis', en: 'Butterfly' },
  { lt: 'Bitė', en: 'Bee' },
  { lt: 'Arklys', en: 'Horse' },
  { lt: 'Karvė', en: 'Cow' },
  { lt: 'Kiaulė', en: 'Pig' },
  { lt: 'Višta', en: 'Chicken' },
  { lt: 'Antis', en: 'Duck' },
  { lt: 'Pelėda', en: 'Owl' },
];

const VEGETABLES: Array<{ lt: string; en: string }> = [
  { lt: 'Morka', en: 'Carrot' },
  { lt: 'Pomidoras', en: 'Tomato' },
  { lt: 'Agurkas', en: 'Cucumber' },
  { lt: 'Bulvė', en: 'Potato' },
  { lt: 'Svogūnas', en: 'Onion' },
  { lt: 'Česnakas', en: 'Garlic' },
  { lt: 'Kopūstas', en: 'Cabbage' },
  { lt: 'Brokoliai', en: 'Broccoli' },
  { lt: 'Paprika', en: 'Bell Pepper' },
  { lt: 'Kukurūzas', en: 'Corn' },
  { lt: 'Žirniai', en: 'Peas' },
  { lt: 'Burokėlis', en: 'Beet' },
  { lt: 'Ridikėlis', en: 'Radish' },
  { lt: 'Salotos', en: 'Lettuce' },
  { lt: 'Špinatai', en: 'Spinach' },
  { lt: 'Moliūgas', en: 'Pumpkin' },
  { lt: 'Cukinija', en: 'Zucchini' },
  { lt: 'Baklažanas', en: 'Eggplant' },
  { lt: 'Žiediniai kopūstai', en: 'Cauliflower' },
  { lt: 'Pupelės', en: 'Beans' },
];

const FRUITS: Array<{ lt: string; en: string }> = [
  { lt: 'Obuolys', en: 'Apple' },
  { lt: 'Bananas', en: 'Banana' },
  { lt: 'Apelsinas', en: 'Orange' },
  { lt: 'Braškė', en: 'Strawberry' },
  { lt: 'Vynuogė', en: 'Grape' },
  { lt: 'Arbūzas', en: 'Watermelon' },
  { lt: 'Melionas', en: 'Melon' },
  { lt: 'Kriaušė', en: 'Pear' },
  { lt: 'Citrina', en: 'Lemon' },
  { lt: 'Vyšnia', en: 'Cherry' },
  { lt: 'Slyva', en: 'Plum' },
  { lt: 'Persicas', en: 'Peach' },
  { lt: 'Abrikosas', en: 'Apricot' },
  { lt: 'Kiviai', en: 'Kiwi' },
  { lt: 'Ananasas', en: 'Pineapple' },
  { lt: 'Mangas', en: 'Mango' },
  { lt: 'Aviečiai', en: 'Raspberry' },
  { lt: 'Mėlynė', en: 'Blueberry' },
  { lt: 'Granatas', en: 'Pomegranate' },
  { lt: 'Kokosas', en: 'Coconut' },
];

const TRANSPORT: Array<{ lt: string; en: string }> = [
  { lt: 'Automobilis', en: 'Car' },
  { lt: 'Autobusas', en: 'Bus' },
  { lt: 'Sunkvežimis', en: 'Truck' },
  { lt: 'Motociklas', en: 'Motorcycle' },
  { lt: 'Dviratis', en: 'Bicycle' },
  { lt: 'Traukinys', en: 'Train' },
  { lt: 'Lėktuvas', en: 'Airplane' },
  { lt: 'Sraigtasparnis', en: 'Helicopter' },
  { lt: 'Laivas', en: 'Ship' },
  { lt: 'Valtis', en: 'Boat' },
  { lt: 'Tramvajus', en: 'Tram' },
  { lt: 'Taksi', en: 'Taxi' },
  { lt: 'Ugniagesių mašina', en: 'Fire Truck' },
  { lt: 'Greitoji pagalba', en: 'Ambulance' },
  { lt: 'Policijos automobilis', en: 'Police Car' },
  { lt: 'Paspirtukas', en: 'Scooter' },
  { lt: 'Raketa', en: 'Rocket' },
  { lt: 'Traktorius', en: 'Tractor' },
  { lt: 'Ekskavatorius', en: 'Excavator' },
  { lt: 'Balionas', en: 'Hot Air Balloon' },
];

const SHAPES: Array<{ lt: string; en: string }> = [
  { lt: 'Apskritimas', en: 'Circle' },
  { lt: 'Kvadratas', en: 'Square' },
  { lt: 'Trikampis', en: 'Triangle' },
  { lt: 'Stačiakampis', en: 'Rectangle' },
  { lt: 'Žvaigždė', en: 'Star' },
  { lt: 'Širdis', en: 'Heart' },
  { lt: 'Ovalas', en: 'Oval' },
  { lt: 'Rombas', en: 'Diamond' },
  { lt: 'Penkiakampis', en: 'Pentagon' },
  { lt: 'Šešiakampis', en: 'Hexagon' },
  { lt: 'Pusapvalis', en: 'Semicircle' },
  { lt: 'Kryžius', en: 'Cross' },
];

const CLOTHES: Array<{ lt: string; en: string }> = [
  { lt: 'Marškinėliai', en: 'T-Shirt' },
  { lt: 'Kelnės', en: 'Pants' },
  { lt: 'Suknelė', en: 'Dress' },
  { lt: 'Sijonas', en: 'Skirt' },
  { lt: 'Džemperis', en: 'Sweater' },
  { lt: 'Striukė', en: 'Jacket' },
  { lt: 'Paltas', en: 'Coat' },
  { lt: 'Batai', en: 'Shoes' },
  { lt: 'Kojinės', en: 'Socks' },
  { lt: 'Kepurė', en: 'Hat' },
  { lt: 'Šalikas', en: 'Scarf' },
  { lt: 'Pirštinės', en: 'Gloves' },
  { lt: 'Pižama', en: 'Pajamas' },
  { lt: 'Šortai', en: 'Shorts' },
  { lt: 'Megztinis', en: 'Cardigan' },
  { lt: 'Liemenė', en: 'Vest' },
];

const BODY_PARTS: Array<{ lt: string; en: string }> = [
  { lt: 'Galva', en: 'Head' },
  { lt: 'Akys', en: 'Eyes' },
  { lt: 'Nosis', en: 'Nose' },
  { lt: 'Burna', en: 'Mouth' },
  { lt: 'Ausys', en: 'Ears' },
  { lt: 'Plaukai', en: 'Hair' },
  { lt: 'Ranka', en: 'Hand' },
  { lt: 'Koja', en: 'Leg' },
  { lt: 'Pėda', en: 'Foot' },
  { lt: 'Pirštai', en: 'Fingers' },
  { lt: 'Pilvas', en: 'Belly' },
  { lt: 'Nugara', en: 'Back' },
  { lt: 'Kaklas', en: 'Neck' },
  { lt: 'Petys', en: 'Shoulder' },
  { lt: 'Kelias', en: 'Knee' },
  { lt: 'Alkūnė', en: 'Elbow' },
];

const NUMBERS: Array<{ lt: string; en: string }> = [
  { lt: 'Nulis', en: 'Zero' },
  { lt: 'Vienas', en: 'One' },
  { lt: 'Du', en: 'Two' },
  { lt: 'Trys', en: 'Three' },
  { lt: 'Keturi', en: 'Four' },
  { lt: 'Penki', en: 'Five' },
  { lt: 'Šeši', en: 'Six' },
  { lt: 'Septyni', en: 'Seven' },
  { lt: 'Aštuoni', en: 'Eight' },
  { lt: 'Devyni', en: 'Nine' },
  { lt: 'Dešimt', en: 'Ten' },
];

const LETTERS: Array<{ lt: string; en: string }> = [
  { lt: 'A', en: 'Letter A' },
  { lt: 'Ą', en: 'Letter A ogonek' },
  { lt: 'B', en: 'Letter B' },
  { lt: 'C', en: 'Letter C' },
  { lt: 'Č', en: 'Letter C caron' },
  { lt: 'D', en: 'Letter D' },
  { lt: 'E', en: 'Letter E' },
  { lt: 'Ę', en: 'Letter E ogonek' },
  { lt: 'Ė', en: 'Letter E dot' },
  { lt: 'F', en: 'Letter F' },
  { lt: 'G', en: 'Letter G' },
  { lt: 'H', en: 'Letter H' },
  { lt: 'I', en: 'Letter I' },
  { lt: 'Į', en: 'Letter I ogonek' },
  { lt: 'Y', en: 'Letter Y' },
  { lt: 'J', en: 'Letter J' },
  { lt: 'K', en: 'Letter K' },
  { lt: 'L', en: 'Letter L' },
  { lt: 'M', en: 'Letter M' },
  { lt: 'N', en: 'Letter N' },
  { lt: 'O', en: 'Letter O' },
  { lt: 'P', en: 'Letter P' },
  { lt: 'R', en: 'Letter R' },
  { lt: 'S', en: 'Letter S' },
  { lt: 'Š', en: 'Letter S caron' },
  { lt: 'T', en: 'Letter T' },
  { lt: 'U', en: 'Letter U' },
  { lt: 'Ų', en: 'Letter U ogonek' },
  { lt: 'Ū', en: 'Letter U macron' },
  { lt: 'V', en: 'Letter V' },
  { lt: 'Z', en: 'Letter Z' },
  { lt: 'Ž', en: 'Letter Z caron' },
];
// ==========================================

// Aplinkos kintamieji
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = 'BIvP0GN1cAtSRTxNHnWS'; // Lietuviškai pritaikytas balsas

// Inicijuoti klientus
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateImage(nameEn: string): Promise<string> {
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

  return imageData.b64_json;
}

async function generateAudio(nameLt: string, category: string): Promise<ArrayBuffer> {
  // Naudoti lietuvišką konteksto prefiksą, kad būtų užtikrintas teisingas tarimas
  const contextMap: Record<string, string> = {
    animals: 'čia yra gyvūnas lietuviškai',
    vegetables: 'čia yra daržovė lietuviškai',
    fruits: 'čia yra vaisius lietuviškai',
    transport: 'čia yra transportas lietuviškai',
    shapes: 'čia yra forma lietuviškai',
    clothes: 'čia yra drabužis lietuviškai',
    body_parts: 'čia yra kūno dalis lietuviškai',
    numbers: 'čia yra skaičius lietuviškai',
    letters: 'čia yra raidė lietuviškai',
  };
  const context = contextMap[category] || 'lietuviškai';
  const textWithContext = `[${context}] ${nameLt}`;

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

  return response.arrayBuffer();
}

async function uploadToStorage(
  bucket: string,
  path: string,
  data: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
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

  return urlData.publicUrl;
}

async function getNextSortOrder(): Promise<number> {
  const { data: lastCard } = await supabase
    .from('cards')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  return (lastCard?.sort_order ?? -1) + 1;
}

async function cardExists(nameEn: string): Promise<boolean> {
  const { data } = await supabase
    .from('cards')
    .select('id')
    .eq('name_en', nameEn)
    .single();

  return !!data;
}

async function generateCard(
  nameLt: string,
  nameEn: string,
  category: string,
  sortOrder: number
): Promise<boolean> {
  try {
    // Patikrinti, ar kortelė jau egzistuoja
    if (await cardExists(nameEn)) {
      console.log(`⏭️  Skipping ${nameEn} (already exists)`);
      return false;
    }

    console.log(`\n🎨 Generating ${nameEn}...`);

    // Sugeneruoti paveikslėlį
    const imageBase64 = await generateImage(nameEn);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('   ✅ Image generated');

    // Sugeneruoti garso įrašą
    const audioBuffer = await generateAudio(nameLt, category);
    console.log('   ✅ Audio generated');

    // Sukurti unikalius failų pavadinimus
    const timestamp = Date.now();
    const slug = nameEn.toLowerCase().replace(/\s+/g, '-');
    const imagePath = `images/${category}/${slug}-${timestamp}.png`;
    const audioPath = `audio/${category}/${slug}-${timestamp}.mp3`;

    // Įkelti į saugyklą
    const imageUrl = await uploadToStorage('cards', imagePath, imageBuffer, 'image/png');
    const audioUrl = await uploadToStorage('cards', audioPath, audioBuffer, 'audio/mpeg');
    console.log('   ✅ Uploaded to storage');

    // Sukurti įrašą duomenų bazėje
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

    console.log(`   ✅ Card created: ${nameLt} (${nameEn})`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error creating ${nameEn}: ${error.message}`);
    return false;
  }
}

async function ensureGalleryExists(category: string): Promise<void> {
  const galleryMap: Record<string, { name_lt: string; name_en: string; icon: string; sort_order: number }> = {
    animals: { name_lt: 'Gyvūnai', name_en: 'Animals', icon: '🐻', sort_order: 0 },
    vegetables: { name_lt: 'Daržovės', name_en: 'Vegetables', icon: '🥕', sort_order: 1 },
    fruits: { name_lt: 'Vaisiai', name_en: 'Fruits', icon: '🍎', sort_order: 2 },
    transport: { name_lt: 'Transportas', name_en: 'Transport', icon: '🚗', sort_order: 3 },
    shapes: { name_lt: 'Formos', name_en: 'Shapes', icon: '⭐', sort_order: 4 },
    clothes: { name_lt: 'Drabužiai', name_en: 'Clothes', icon: '👕', sort_order: 5 },
    body_parts: { name_lt: 'Kūno dalys', name_en: 'Body Parts', icon: '🖐️', sort_order: 6 },
    numbers: { name_lt: 'Skaičiai', name_en: 'Numbers', icon: '🔢', sort_order: 7 },
    letters: { name_lt: 'Raidės', name_en: 'Letters', icon: '🔤', sort_order: 8 },
  };

  const gallery = galleryMap[category];
  if (!gallery) return;

  // Patikrinti, ar galerija egzistuoja
  const { data } = await supabase
    .from('card_galleries')
    .select('id')
    .eq('id', category)
    .single();

  if (!data) {
    // Sukurti galeriją
    const { error } = await supabase.from('card_galleries').insert({
      id: category,
      ...gallery,
    });
    if (error) {
      console.log(`⚠️  Gallery "${category}" may already exist or error: ${error.message}`);
    } else {
      console.log(`✅ Created gallery: ${gallery.name_lt}`);
    }
  } else {
    console.log(`✅ Gallery exists: ${gallery.name_lt}`);
  }
}

async function main() {
  // Gauti kategoriją iš komandinės eilutės argumentų (numatytoji: animals)
  const category = process.argv[2] || 'animals';
  const itemsMap: Record<string, Array<{ lt: string; en: string }>> = {
    animals: ANIMALS,
    vegetables: VEGETABLES,
    fruits: FRUITS,
    transport: TRANSPORT,
    shapes: SHAPES,
    clothes: CLOTHES,
    body_parts: BODY_PARTS,
    numbers: NUMBERS,
    letters: LETTERS,
  };
  const items = itemsMap[category] || ANIMALS;

  console.log('');
  console.log('🃏 Batch Card Generator');
  console.log('=======================');
  console.log(`Category: ${category}`);
  console.log(`Total items to process: ${items.length}`);
  console.log('');

  // Įsitikinti, kad galerija egzistuoja
  await ensureGalleryExists(category);

  let sortOrder = await getNextSortOrder();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const result = await generateCard(item.lt, item.en, category, sortOrder);
    if (result) {
      created++;
      sortOrder++;
    } else {
      // Patikrinti, ar buvo praleista, ar nepavyko
      if (await cardExists(item.en)) {
        skipped++;
      } else {
        failed++;
      }
    }

    // Trumpa pauzė, kad būtų išvengta užklausų dažnio ribojimo
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  console.log('📊 Summary');
  console.log('==========');
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
}

main();
