/**
 * Sugeneruoti naują ASMR lopšinę 0-3 metų vaikams
 * Naudoja AImee balsą (ASMR šnabždesys) su 4 sekundžių pauzėmis tarp posmų
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });

const TEMP_DIR = '/tmp/asmr-lullaby';
const PAUSE_SECONDS = 4.0; // Ilgos pauzės kūdikiams

// AImee - ASMR šnabždesio balsas
const VOICE = { id: 'GL7nHO5mDrxcHlJPJK5T', name: 'AImee', speed: 0.7 };

const ART_STYLE = 'Soft pastel watercolor for babies, very simple shapes, gentle muted colors (lavender, soft blue, pale pink, mint), dreamy night scene, large cute sleeping animals, moon and stars, extremely calming and soothing, no busy details, no text';

// Nauja lopšinė apie miško gyvūnėlius, einančius miegoti
const LULLABY = {
  title: 'Miško Gyvūnėlių Miegelis',
  theme: 'animals',
  target_age: 1,
  image_style: 'dreamy',
  content: `[in lithuanian language] [softly] Vakaras ateina į miškelį.
Mėnulis šviečia pro medžių šakeles.
Žvaigždutės mirksi: mik-mik-mik.
Viskas tylu, viskas ramu.

...

[whispers] Mažas stirniukas gula po krūmeliu.
Jo kailiukas rudas ir minkštas.
Akutės užsimerkia lėtai lėtai.
Šššš... šššš... miegok, stirniuk.

...

[softly] Voveriukė įsitaiso medžio drevėje.
Jos uodegėlė pūkuota ir šilta.
Riešutėliai sapnuosis visą naktį.
Šššš... šššš... miegok, voverėle.

...

[yawns] Mažas ežiukas susisuka į kamuoliuką.
Jo dygliai minkšti kaip pagalvėlė.
Obuoliukai sapnuosis iki ryto.
Šššš... šššš... miegok, ežiuk.

...

[whispers] Zuikutis šokinėja į savo urvelį.
Ausytės ilgos ir minkštos.
Morkyčių sapneliai jau laukia.
Šššš... šššš... miegok, zuikuti.

...

[softly] Pelėdžiukė sėdi ant šakelės.
Jos plunksnos minkštos ir pūkuotos.
Ū-hū, ū-hū - ji saugo miškelį.
Visi visi miega jau.

...

[yawns] Ir tu, mažyli, guli lovytėje.
Antklodėlė šilta ir minkšta.
Mama šalia, viskas gerai.
Bum-bum, bum-bum - širdelė plaka ramiai.

...

[whispers] Mėnulis šviečia pro langelį.
Žvaigždutės saugo tave visą naktį.
Miško gyvūnėliai miega ramiai.
Ir tu miegok, mažyli. Labanakt.
Šššš... šššš... saldžių sapnų.`,
  scenes: [
    { text: 'Vakaras miške', desc: 'Peaceful forest at dusk, moon rising through tree branches, twinkling stars appearing, soft purple-blue sky' },
    { text: 'Stirniukas miega', desc: 'Cute baby deer sleeping under a bush, brown soft fur, peaceful expression, moonlight' },
    { text: 'Voveriukė drevėje', desc: 'Adorable squirrel curled up in tree hollow, fluffy tail wrapped around, acorns nearby' },
    { text: 'Ežiukas kamuoliukas', desc: 'Cute hedgehog curled into ball sleeping, soft spines, small apples nearby, cozy' },
    { text: 'Zuikutis urvelyje', desc: 'Bunny with long ears sleeping in burrow, soft fur, carrots in dream bubble' },
    { text: 'Pelėdžiukė saugo', desc: 'Gentle owl on branch watching over forest, big round eyes, fluffy feathers, moon behind' },
    { text: 'Mažylis lovytėje', desc: 'Baby in cozy bed, soft blanket, mother silhouette nearby, warm glow, hearts' },
    { text: 'Labanakt', desc: 'Moon shining through window, stars twinkling, peaceful sleeping baby, forest animals in dream clouds' },
  ],
};

// Pagalbinės funkcijos
function splitIntoVerses(content: string): string[] {
  return content
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.+\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !p.match(/^[\.\s]+$/));
}

async function generateVerseAudio(text: string, index: number): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: VOICE.speed },
    }),
  });
  if (!response.ok) throw new Error(`ElevenLabs: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

function getAudioDuration(filePath: string): number {
  const result = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return parseFloat(result.trim());
}

function generateSilence(seconds: number, outputPath: string): void {
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${seconds} -q:a 9 -acodec libmp3lame "${outputPath}"`, { stdio: 'pipe' });
}

function concatenateAudio(files: string[], outputPath: string): void {
  const listPath = path.join(TEMP_DIR, 'filelist.txt');
  fs.writeFileSync(listPath, files.map((f) => `file '${f}'`).join('\n'));
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, { stdio: 'pipe' });
}

async function generateImage(scene: { text: string; desc: string }): Promise<string> {
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${ART_STYLE}\n\nSCENE: ${scene.desc}\n\nIMPORTANT: For babies - extremely simple, soft, calming. NO text. Large simple shapes.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });
  return result.data![0].b64_json!;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING ASMR LULLABY: ' + LULLABY.title);
  console.log(' Voice: AImee (ASMR) | Speed: 0.7 | Pause: 4s');
  console.log('═══════════════════════════════════════════════════════════════');

  // Patikrinti ffmpeg
  try { execSync('ffmpeg -version', { stdio: 'pipe' }); }
  catch { console.error('❌ ffmpeg not found!'); process.exit(1); }

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // 1. Sugeneruoti garso įrašą kiekvienam posmui
  const verses = splitIntoVerses(LULLABY.content);
  console.log(`\n[1/4] Generating audio for ${verses.length} verses...`);

  const verseFiles: string[] = [];
  const verseDurations: number[] = [];

  for (let i = 0; i < verses.length; i++) {
    process.stdout.write(`  [${i + 1}/${verses.length}] `);
    const buffer = await generateVerseAudio(verses[i], i);
    const filePath = path.join(TEMP_DIR, `verse_${i}.mp3`);
    fs.writeFileSync(filePath, buffer);
    const duration = getAudioDuration(filePath);
    verseFiles.push(filePath);
    verseDurations.push(duration);
    console.log(`${duration.toFixed(1)}s`);
  }

  // 2. Sujungti su pauzėmis
  console.log(`\n[2/4] Concatenating with ${PAUSE_SECONDS}s pauses...`);
  const silencePath = path.join(TEMP_DIR, 'silence.mp3');
  generateSilence(PAUSE_SECONDS, silencePath);

  const allFiles: string[] = [];
  for (let i = 0; i < verseFiles.length; i++) {
    allFiles.push(verseFiles[i]);
    if (i < verseFiles.length - 1) allFiles.push(silencePath);
  }

  const finalAudioPath = path.join(TEMP_DIR, 'final.mp3');
  concatenateAudio(allFiles, finalAudioPath);

  const paragraphEndTimes: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < verseDurations.length; i++) {
    cumulative += verseDurations[i];
    paragraphEndTimes.push(Math.round(cumulative * 10) / 10);
    if (i < verseDurations.length - 1) cumulative += PAUSE_SECONDS;
  }

  const totalDuration = getAudioDuration(finalAudioPath);
  console.log(`  Total: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} min)`);

  // 3. Įkelti garso įrašą
  console.log('\n[3/4] Uploading audio...');
  const timestamp = Date.now();
  const audioStoragePath = `pregenerated/${timestamp}_asmr_lullaby.mp3`;
  await supabase.storage.from('audio').upload(audioStoragePath, fs.readFileSync(finalAudioPath), { contentType: 'audio/mpeg' });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioStoragePath).data.publicUrl;
  console.log(`  ✅ ${audioUrl}`);

  // 4. Sugeneruoti ir įkelti paveikslėlius
  console.log(`\n[4/4] Generating ${LULLABY.scenes.length} images...`);
  const imageUrls: { url: string; index: number; text: string }[] = [];

  for (let i = 0; i < LULLABY.scenes.length; i++) {
    try {
      process.stdout.write(`  [${i + 1}/${LULLABY.scenes.length}] ${LULLABY.scenes[i].text}... `);
      const base64 = await generateImage(LULLABY.scenes[i]);
      const imgPath = `pregenerated/asmr_lullaby_${timestamp}_${i}.png`;
      await supabase.storage.from('story-images').upload(imgPath, Buffer.from(base64, 'base64'), { contentType: 'image/png' });
      const url = supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl;
      imageUrls.push({ url, index: i, text: LULLABY.scenes[i].text });
      console.log('✅');
    } catch (e) {
      console.log('❌');
    }
  }

  // 5. Įterpti į duomenų bazę
  console.log('\n[5/4] Inserting into database...');

  const { data: storyData, error: storyError } = await supabase
    .from('pregenerated_stories')
    .insert({
      title: LULLABY.title,
      content: LULLABY.content,
      theme: LULLABY.theme,
      target_age: LULLABY.target_age,
      duration_seconds: Math.round(totalDuration),
      audio_url: audioUrl,
      thumbnail_url: imageUrls[0]?.url || '',
      image_style: LULLABY.image_style,
      voice_id: VOICE.id,
      voice_name: VOICE.name,
      is_active: true,
      sort_order: 0, // Top of list
      paragraph_end_times: paragraphEndTimes,
    })
    .select('id')
    .single();

  if (storyError) {
    console.error('  ❌ Story insert error:', storyError);
    // Grįžti prie SQL išvesties
    console.log('\n-- Run this SQL manually:');
    console.log(`INSERT INTO pregenerated_stories (title, content, theme, target_age, duration_seconds, audio_url, thumbnail_url, image_style, voice_id, voice_name, is_active, sort_order, paragraph_end_times)`);
    console.log(`VALUES ('${LULLABY.title}', '...content...', '${LULLABY.theme}', ${LULLABY.target_age}, ${Math.round(totalDuration)}, '${audioUrl}', '${imageUrls[0]?.url}', '${LULLABY.image_style}', '${VOICE.id}', '${VOICE.name}', true, 0, ARRAY[${paragraphEndTimes.join(', ')}]::REAL[]);`);
  } else {
    const storyId = storyData.id;
    console.log(`  ✅ Story ID: ${storyId}`);

    for (const img of imageUrls) {
      await supabase.from('pregenerated_story_images').insert({
        story_id: storyId,
        image_url: img.url,
        scene_index: img.index,
        scene_text: img.text,
      });
    }
    console.log(`  ✅ ${imageUrls.length} images inserted`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` ✅ DONE: ${LULLABY.title}`);
  console.log(` Duration: ${(totalDuration / 60).toFixed(1)} min | Images: ${imageUrls.length}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
