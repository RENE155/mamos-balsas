/**
 * Sugeneruoti iš anksto paruoštą pasaką su TIKSLIOMIS 2 sekundžių pauzėmis tarp pastraipų
 *
 * Strategija:
 * 1. Padalinti pasaką į pastraipas
 * 2. Sugeneruoti garso įrašą kiekvienai pastraipai atskirai
 * 3. Sujungti su 2 s tyla tarp kiekvienos
 * 4. Sekti tikslius paragraph_end_times sujungimo metu
 *
 * Tai užtikrina tobulą garso ir paveikslėlių sinchronizavimą!
 *
 * Naudojimas: npx ts-node scripts/generate-story-with-pauses.ts
 *
 * Reikalavimai:
 * - turi būti įdiegtas ffmpeg (brew install ffmpeg)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// Aplinka
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Konfigūracija
const PAUSE_DURATION_SECONDS = 2.0; // Tiksli pauzė tarp pastraipų
const VOICE = { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' };
const TEMP_DIR = '/tmp/story-audio';

// =============================================================================
// PASAKOS TURINYS - Įrašykite savo pasaką čia
// =============================================================================
const STORY = {
  title: 'Test Story with Pauses',
  theme: 'dreams',
  target_age: 5,
  image_style: 'watercolor',
  // Pastraipos atskirtos "..." eilutėmis
  content: `[in lithuanian language] [softly] Seniai seniai, giliai giliai miške, po didžiuoju šimtamečiu ąžuolu, gyveno mažas meškiukas, vardu Rudis. Jis turėjo minkštą rudą kailį ir mažas apvalias ausytes.

...

[warmly] Kiekvieną dieną Rudis žaisdavo su savo geriausiais draugais - voveryte Rūta ir zuikučiu Balčiu. Jie bėgiodavo po mišką, rinkdavo uogas ir juokdavosi kartu.

...

[yawns] Bet vieną vakarą, kai saulė leidosi už aukštų medžių, Rudis pajuto, kad jo kojelės pavargo, o akys pradėjo merktis. [softly] "Mama, aš noriu gražaus sapno," - tyliai pasakė mažasis meškiukas.

...

[whispers] Mama meškienė švelniai apkabino Rudį ir tarė: "Užsimerk, mažyli. Kai užmerki akis, tavo širdelėje atsiveria stebuklingos auksinės durys."

...

[softly] Rudis užmerkė akis ir pajuto, kaip lengvai lengvai pakyla į dangų. [excited] Jis skrido pro pūkuotus baltuosius debesis! Debesys buvo tokie minkšti - minkštesni už pačią minkščiausią pagalvėlę.

...

[giggles] "Labas, mažasis meškiuk!" - linksmai sušuko draugiškas rožinis debesėlis. [whispers] Tada pasirodė sidabrinė žvaigždutė. "Aš saugosiu tave visą naktį," - pažadėjo ji.

...

[softly] Debesėliai švelniai sūpavo Rudį, o žvaigždutės dainavo tylią lopšinę. [yawns] [whispers] Ir tu, mažasis drauge, gali keliauti į sapnų šalį. Užmerk akeles. Labanakt. Saldžių saldžių sapnų.`,
};

// =============================================================================
// Pagalbinė funkcija: Padalinti pasaką į pastraipas
// =============================================================================
function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.+\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !p.match(/^[\.\s]+$/));
}

// =============================================================================
// Sugeneruoti garso įrašą vienai pastraipai
// =============================================================================
async function generateParagraphAudio(text: string, index: number): Promise<string> {
  console.log(`  [${index + 1}] Generating audio for: "${text.substring(0, 50)}..."`);

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
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.7, // Lėčiausias miego metui
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(TEMP_DIR, `paragraph_${index}.mp3`);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

// =============================================================================
// Gauti garso įrašo trukmę naudojant ffprobe
// =============================================================================
function getAudioDuration(filePath: string): number {
  const result = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return parseFloat(result.trim());
}

// =============================================================================
// Sugeneruoti tylos failą
// =============================================================================
function generateSilence(durationSeconds: number, outputPath: string): void {
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSeconds} -q:a 9 -acodec libmp3lame "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

// =============================================================================
// Sujungti garso failus
// =============================================================================
function concatenateAudio(files: string[], outputPath: string): void {
  // Sukurti failų sąrašą ffmpeg
  const listPath = path.join(TEMP_DIR, 'filelist.txt');
  const listContent = files.map((f) => `file '${f}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, {
    stdio: 'pipe',
  });
}

// =============================================================================
// Pagrindinė funkcija: Sugeneruoti pasaką su tiksliomis pauzėmis
// =============================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING STORY WITH EXACT 2-SECOND PAUSES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Title: ${STORY.title}`);
  console.log(`Pause duration: ${PAUSE_DURATION_SECONDS}s between paragraphs`);
  console.log(`Voice: ${VOICE.name} (speed: 0.7)`);

  // Patikrinti, ar ffmpeg yra
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('\n ERROR: ffmpeg not found!');
    console.error('Install with: brew install ffmpeg');
    process.exit(1);
  }

  // Sukurti laikinąjį katalogą
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 1 žingsnis: Padalinti į pastraipas
  const paragraphs = splitIntoParagraphs(STORY.content);
  console.log(`\n[1/4] Found ${paragraphs.length} paragraphs`);

  // 2 žingsnis: Sugeneruoti garso įrašą kiekvienai pastraipai
  console.log('\n[2/4] Generating audio for each paragraph...');
  const paragraphFiles: string[] = [];
  const paragraphDurations: number[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const filePath = await generateParagraphAudio(paragraphs[i], i);
    const duration = getAudioDuration(filePath);
    paragraphFiles.push(filePath);
    paragraphDurations.push(duration);
    console.log(`       Duration: ${duration.toFixed(2)}s`);
  }

  // 3 žingsnis: Sugeneruoti tylos failą
  console.log(`\n[3/4] Generating ${PAUSE_DURATION_SECONDS}s silence...`);
  const silencePath = path.join(TEMP_DIR, 'silence.mp3');
  generateSilence(PAUSE_DURATION_SECONDS, silencePath);

  // 4 žingsnis: Sujungti su tyla tarpuose
  console.log('\n[4/4] Concatenating audio with pauses...');
  const allFiles: string[] = [];
  for (let i = 0; i < paragraphFiles.length; i++) {
    allFiles.push(paragraphFiles[i]);
    if (i < paragraphFiles.length - 1) {
      allFiles.push(silencePath); // Pridėti tylą tarp pastraipų
    }
  }

  const finalAudioPath = path.join(TEMP_DIR, 'final_story.mp3');
  concatenateAudio(allFiles, finalAudioPath);

  // Apskaičiuoti paragraph_end_times
  const paragraphEndTimes: number[] = [];
  let cumulativeTime = 0;

  for (let i = 0; i < paragraphDurations.length; i++) {
    cumulativeTime += paragraphDurations[i];
    paragraphEndTimes.push(Math.round(cumulativeTime * 10) / 10); // Suapvalinti iki 1 dešimtosios

    // Pridėti pauzės laiką (išskyrus po paskutinės pastraipos)
    if (i < paragraphDurations.length - 1) {
      cumulativeTime += PAUSE_DURATION_SECONDS;
    }
  }

  const totalDuration = getAudioDuration(finalAudioPath);

  // Išvesti rezultatus
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nFinal audio: ${finalAudioPath}`);
  console.log(`Total duration: ${totalDuration.toFixed(2)}s`);
  console.log(`\nParagraph durations:`);
  paragraphDurations.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.toFixed(2)}s → ends at ${paragraphEndTimes[i]}s`);
  });

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(' COPY THIS FOR DATABASE:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`\nparagraph_end_times = ARRAY[${paragraphEndTimes.join(', ')}]`);
  console.log(`duration_seconds = ${Math.round(totalDuration)}`);

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(' SQL UPDATE:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`
UPDATE pregenerated_stories
SET
  paragraph_end_times = ARRAY[${paragraphEndTimes.join(', ')}]::REAL[],
  duration_seconds = ${Math.round(totalDuration)}
WHERE id = 'YOUR_STORY_ID';
`);

  // Įkelti į Supabase
  console.log('\n[Uploading to Supabase storage...]');
  const audioBuffer = fs.readFileSync(finalAudioPath);
  const timestamp = Date.now();
  const safeTitle = STORY.title.replace(/[^a-zA-Z0-9]/g, '_');
  const audioPath = `pregenerated/${timestamp}_${safeTitle}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
  } else {
    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
    console.log(`\n Audio URL: ${urlData.publicUrl}`);

    // Išsaugoti visus duomenis į JSON
    const outputData = {
      story: STORY,
      audio_url: urlData.publicUrl,
      duration_seconds: Math.round(totalDuration),
      paragraph_end_times: paragraphEndTimes,
      paragraph_durations: paragraphDurations,
      voice: VOICE,
      pause_duration: PAUSE_DURATION_SECONDS,
    };

    fs.writeFileSync('story_with_pauses.json', JSON.stringify(outputData, null, 2));
    console.log('\n Full data saved to: story_with_pauses.json');
  }

  // Išvalyti laikinuosius failus (neprivaloma)
  // fs.rmSync(TEMP_DIR, { recursive: true });

  console.log('\n Done!');
}

main().catch(console.error);
