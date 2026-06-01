import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const openai = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });

// Balsas: Lily (šiltas, raiškus) - tinka 4 metų amžiui
// Balsas: Sarah (aiškus, patrauklus) - tinka 5 metų amžiui
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const VOICE_SPEED = 0.75;
const PAUSE_SECONDS = 3;

// Naudoti mini modelį pigesniems paveikslėliams
const IMAGE_MODEL = 'gpt-image-1-mini';

// 4 minučių pasaka 5 metų amžiui - "Mažasis Debesiukas" (The Little Cloud)
const STORY = {
  title: 'Mažasis Debesiukas',
  slug: 'little-cloud',
  target_age: 5,
  paragraphs: [
    {
      text: `[in lithuanian language] [warmly] Aukštai aukštai danguje gyveno mažas debesiukas, vardu Pūkis. Jis buvo baltas ir pūkuotas kaip avytės vilna. Pūkis mėgo plaukioti po dangų ir žiūrėti žemyn į vaikus, kurie žaidė parkuose.`,
      image_prompt: 'A cute small fluffy white cloud with a friendly face floating high in a bright blue sky, looking down at a park with tiny children playing, soft watercolor style, cheerful daytime scene',
      image_title: 'Debesiukas Pūkis'
    },
    {
      text: `[softly] Bet Pūkis buvo vienišas. Kiti debesys buvo dideli ir rimti - jie nešė lietų ir perkūniją. "Tu per mažas," - sakydavo jie. "Negali net mažo lietuko padaryt."`,
      image_prompt: 'A small sad fluffy white cloud next to large dark grey storm clouds who look serious and dismissive, contrast between small cute cloud and big intimidating clouds, soft watercolor style',
      image_title: 'Dideli debesys'
    },
    {
      text: `[excited] Vieną dieną Pūkis pamatė mažą mergaitę sode. Ji sėdėjo viena ir atrodė liūdna. Jos gėlytės buvo nuvytusios, nes jau seniai nelijo. "Aš jai padėsiu!" - nusprendė Pūkis.`,
      image_prompt: 'A little girl sitting sadly in a garden with wilted drooping flowers around her, a small cute white cloud watching her from above with determination, soft watercolor style, warm but dry summer day',
      image_title: 'Liūdna mergaitė'
    },
    {
      text: `[warmly] Pūkis labai labai pasistengė. Jis susispaudė ir išspaudė vieną mažą lašelį. Paskui dar vieną. Ir dar! Lašeliai krito ant gėlyčių kaip mažos sidabrinės ašarėlės.`,
      image_prompt: 'A small white cloud squeezing itself with effort, tiny silver water droplets falling from it onto flowers below, magical sparkly raindrops, soft watercolor style, heartwarming scene',
      image_title: 'Pirmieji lašeliai'
    },
    {
      text: `[whispers] Mergaitė pakėlė galvą ir pamatė debesiuką. "Ačiū, mažasis debesėli!" - sušuko ji ir nusišypsojo. Pūkis pajuto, kaip jo širdelė prisipildė laimės.`,
      image_prompt: 'A happy little girl looking up at a small smiling cloud, reaching her hands toward the sky in gratitude, flowers starting to perk up around her, soft watercolor style, joyful moment',
      image_title: 'Padėka'
    },
    {
      text: `[cheerfully] Gėlytės atsigavo ir pražydo įvairiomis spalvomis - raudona, geltona, mėlyna ir rožine. Visas sodas atrodė kaip vaivorykštė! Mergaitė šoko ir dainavo iš džiaugsmo.`,
      image_prompt: 'A magical garden bursting with colorful flowers in red, yellow, blue and pink like a rainbow, a little girl dancing happily among them, small white cloud watching proudly from above, soft watercolor style',
      image_title: 'Žydintis sodas'
    },
    {
      text: `[warmly] Nuo tos dienos Pūkis ir mergaitė tapo draugais. Kiekvieną dieną jis atplaukdavo virš jos sodo ir pasveikinavo. O didieji debesys pagaliau suprato - net mažiausias debesiukas gali padaryti didelį stebuklą.`,
      image_prompt: 'A small white cloud floating above a beautiful garden, waving to a happy girl below, large storm clouds watching with newfound respect in the background, soft watercolor style, warm friendship scene',
      image_title: 'Nauji draugai'
    },
    {
      text: `[softly] Kai saulė pradėjo leistis, dangus nusidažė oranžine ir rožine spalva. Pūkis tapo rožinis kaip cukraus vata. "Labanakt, mano drauge," - sušnibždėjo mergaitė, mojuodama jam.`,
      image_prompt: 'A beautiful sunset sky in orange and pink colors, a small cloud turned pink like cotton candy, a little girl waving goodbye from her garden, soft watercolor style, peaceful evening',
      image_title: 'Saulėlydis'
    },
    {
      text: `[yawns] [whispers] Mergaitė įlindo į šiltą lovelę. Pro langą ji matė savo draugą debesiuką, kuris tyliai plaukė naktiniame danguje. "Labanakt, Pūki," - sušnibždėjo ji ir užmerkė akutes. Ir tu miegok saldžiai, mažyli.`,
      image_prompt: 'A little girl peacefully sleeping in bed, through the window a small fluffy cloud floats in a starry night sky with a crescent moon, soft watercolor style, dreamy peaceful night scene',
      image_title: 'Saldūs sapnai'
    }
  ]
};

async function generateAudioForParagraph(text: string, index: number): Promise<Buffer> {
  console.log(`  [${index + 1}/${STORY.paragraphs.length}] Generating audio...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
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
        speed: VOICE_SPEED,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateImage(prompt: string, index: number, title: string): Promise<string> {
  console.log(`  [${index + 1}/${STORY.paragraphs.length}] ${title}...`);

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'low',
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) throw new Error('No image data');

  const buffer = Buffer.from(imageData.b64_json, 'base64');
  const filename = `${Date.now()}_${STORY.slug}_${index}.png`;

  const { error } = await supabase.storage
    .from('story-images')
    .upload(`pregenerated/${filename}`, buffer, { contentType: 'image/png' });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('story-images')
    .getPublicUrl(`pregenerated/${filename}`);

  return urlData.publicUrl;
}

async function main() {
  console.log('═'.repeat(60));
  console.log(` GENERATING: ${STORY.title} (age ${STORY.target_age})`);
  console.log(` Voice: Sarah @ ${VOICE_SPEED}x | Pause: ${PAUSE_SECONDS}s`);
  console.log(` Image model: ${IMAGE_MODEL}`);
  console.log(` Paragraphs: ${STORY.paragraphs.length}`);
  console.log('═'.repeat(60));

  // Įvertinti kreditus
  const totalChars = STORY.paragraphs.reduce((sum, p) => sum + p.text.length, 0);
  console.log(`\nEstimated ElevenLabs credits: ~${totalChars}`);
  console.log(`Estimated OpenAI images: ${STORY.paragraphs.length} × $0.02 = ~$${(STORY.paragraphs.length * 0.02).toFixed(2)}`);

  console.log('\nPress Ctrl+C within 5 seconds to cancel...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sukurti laikinąjį katalogą
  const tempDir = `/tmp/story_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  // 1 žingsnis: Sugeneruoti garso įrašą kiekvienai pastraipai
  console.log(`[1/4] Generating audio for ${STORY.paragraphs.length} paragraphs...`);
  const audioDurations: number[] = [];

  for (let i = 0; i < STORY.paragraphs.length; i++) {
    const buffer = await generateAudioForParagraph(STORY.paragraphs[i].text, i);
    const audioPath = path.join(tempDir, `paragraph_${i}.mp3`);
    fs.writeFileSync(audioPath, buffer);

    // Gauti trukmę naudojant ffprobe
    const duration = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`)
        .toString()
        .trim()
    );
    audioDurations.push(duration);
    console.log(`    ${duration.toFixed(1)}s`);
  }

  // 2 žingsnis: Sujungti garso įrašą su pauzėmis
  console.log(`\n[2/4] Concatenating with ${PAUSE_SECONDS}s pauses...`);

  // Sukurti tylos failą (PRIVALO būti mono, kad atitiktų ElevenLabs išvestį)
  const silencePath = path.join(tempDir, 'silence.mp3');
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${PAUSE_SECONDS} -q:a 9 -acodec libmp3lame "${silencePath}"`, { stdio: 'pipe' });

  // Sukurti concat failą
  const concatPath = path.join(tempDir, 'concat.txt');
  let concatContent = '';
  for (let i = 0; i < STORY.paragraphs.length; i++) {
    concatContent += `file 'paragraph_${i}.mp3'\n`;
    if (i < STORY.paragraphs.length - 1) {
      concatContent += `file 'silence.mp3'\n`;
    }
  }
  fs.writeFileSync(concatPath, concatContent);

  // Sujungti
  const outputPath = path.join(tempDir, 'final.mp3');
  execSync(`cd "${tempDir}" && ffmpeg -f concat -safe 0 -i concat.txt -c copy "${outputPath}" -y 2>/dev/null`);

  // Gauti galutinę trukmę
  const finalDuration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`)
      .toString()
      .trim()
  );
  console.log(`  Total: ${finalDuration.toFixed(1)}s (${(finalDuration / 60).toFixed(1)} min)`);

  // Apskaičiuoti pastraipų pabaigos laikus
  const paragraphEndTimes: number[] = [];
  let currentTime = 0;
  for (let i = 0; i < audioDurations.length; i++) {
    currentTime += audioDurations[i];
    paragraphEndTimes.push(Math.round(currentTime * 10) / 10);
    if (i < audioDurations.length - 1) {
      currentTime += PAUSE_SECONDS;
    }
  }

  // 3 žingsnis: Įkelti garso įrašą
  console.log(`\n[3/4] Uploading audio...`);
  const audioBuffer = fs.readFileSync(outputPath);
  const audioFilename = `${Date.now()}_${STORY.slug}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(`pregenerated/${audioFilename}`, audioBuffer, { contentType: 'audio/mpeg' });

  if (uploadError) throw uploadError;

  const { data: audioUrlData } = supabase.storage
    .from('audio')
    .getPublicUrl(`pregenerated/${audioFilename}`);

  console.log(`  Audio: ${audioUrlData.publicUrl}`);

  // 4 žingsnis: Sugeneruoti paveikslėlius
  console.log(`\n[4/4] Generating ${STORY.paragraphs.length} images...`);
  const imageUrls: string[] = [];

  for (let i = 0; i < STORY.paragraphs.length; i++) {
    const url = await generateImage(
      STORY.paragraphs[i].image_prompt,
      i,
      STORY.paragraphs[i].image_title
    );
    imageUrls.push(url);
    console.log(`    ✅`);
  }

  // Išvalyti laikinuosius failus
  fs.rmSync(tempDir, { recursive: true });

  // Išvesti duomenis rankiniam įterpimui
  console.log('\n' + '═'.repeat(60));
  console.log(' GENERATION COMPLETE - DATA FOR DATABASE INSERT');
  console.log('═'.repeat(60));

  console.log('\n📋 Story Data:');
  console.log(JSON.stringify({
    title: STORY.title,
    target_age: STORY.target_age,
    duration_seconds: Math.round(finalDuration),
    audio_url: audioUrlData.publicUrl,
    thumbnail_url: imageUrls[0],
    paragraph_end_times: paragraphEndTimes,
    paragraphs: STORY.paragraphs.map(p => p.text),
    voice_id: VOICE_ID,
    sort_order: 4,
    is_active: true
  }, null, 2));

  console.log('\n📋 Image Data:');
  imageUrls.forEach((url, i) => {
    console.log(`  [${i}] ${STORY.paragraphs[i].image_title}: ${url}`);
  });

  console.log('\n✅ Copy the data above for database insertion via Supabase MCP');
}

main().catch(console.error);
