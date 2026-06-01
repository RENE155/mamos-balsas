/**
 * Sugeneruoti lopšinę 0-2 metų vaikams su TIKSLIOMIS pauzėmis tarp posmų
 *
 * Strategija:
 * 1. Padalinti lopšinę į posmus (pastraipas)
 * 2. Sugeneruoti garso įrašą kiekvienam posmui atskirai
 * 3. Sujungti su 3,5 s tyla tarp kiekvieno (kūdikiams ilgesnė!)
 * 4. Sekti tikslius verse_end_times paveikslėlių sinchronizavimui
 *
 * Reikalavimai:
 * - turi būti įdiegtas ffmpeg (brew install ffmpeg)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Aplinka
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });

// Konfigūracija - kūdikiams ILGESNĖS pauzės!
const PAUSE_DURATION_SECONDS = 3.5; // 3,5 sekundės tarp posmų lopšinei
const VOICE = {
  id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - švelnus moteriškas balsas
  name: 'Sarah',
  settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 0.7, // Lėčiausias įmanomas kūdikiams
  },
};
const TEMP_DIR = '/tmp/lullaby-audio';

// Meno stilius kūdikių lopšinėms
const ART_STYLE = "Soft pastel watercolor illustration for babies, very simple shapes, minimal background, gentle muted colors (soft blue, lavender, pale pink), dreamy night scene, large cute sleeping animals, moon and stars, extremely calming and soothing, no busy details";

// =============================================================================
// LOPŠINĖS TURINYS - 7 posmai 0-2 metų vaikams
// =============================================================================
const LULLABY = {
  title: 'Miegok, Mažyli',
  theme: 'dreams',
  target_age: 1, // 0-2 metai
  image_style: 'dreamy',
  // 7 posmai, atskirti "..." - kiekvienas posmas = 1 paveikslėlis
  content: `[in lithuanian language] [softly] Mėnulis šviečia aukštai danguje.
Žvaigždutės mirksi tyliai: mik-mik-mik.
Viskas ramu, viskas tylu, viskas miega.

...

[whispers] Meškiukas miega savo minkštoje lovytėje.
Jis sapnuoja medų ir gėles.
Purr-purr-purr... šššš... šššš...

...

[softly] Katytė miega ant minkštos pagalvėlės.
Jos kailiukas šiltas ir pūkuotas.
Miau-miau tyliai, mik-mik-mik...

...

[yawns] Šššš, šššš, mažyli mano.
Bum-bum, bum-bum - širdelė plaka ramiai.
Mama šalia tavęs, viskas gerai.

...

[whispers] Zuikutis miega po minkštu krūmeliu.
Paukšteliai miega šiltame lizdelyje.
Visi visi gyvūnėliai miega jau.

...

[softly] Antklodėlė tokia šilta ir minkšta.
Pagalvėlė po mažyte galvyte.
Saugu čia, šilta čia, gera čia.

...

[yawns] Miegok, miegok, mano mažyli.
Miegok, miegok, sapnuok gražiai.
Šššš... šššš... tyliai, tyliai...

...

[whispers] Akutės užsimerkia lėtai lėtai.
Žvaigždutės saugo tave visą naktį.
Mėnulis šviečia švelniai švelniai.

...

[softly] Labanakt, mažyli. Labanakt.
Saldžių saldžių saldžių sapnų.
Šššš... šššš... labanakt.`,
};

// 9 scenos, atitinkančios 9 posmus
const SCENES = [
  { text: 'Mėnulis ir žvaigždutės', characters: 'Soft glowing moon with gentle smile, twinkling stars in deep purple-blue night sky, extremely simple and calming' },
  { text: 'Meškiukas miega', characters: 'Cute sleeping teddy bear in cozy bed, soft brown fur, peaceful expression, dreamy atmosphere' },
  { text: 'Katytė miega', characters: 'Adorable sleeping kitten on fluffy pillow, soft fur, gentle colors, peaceful night' },
  { text: 'Mama šalia', characters: 'Gentle mother silhouette near sleeping baby, warm glow, hearts floating, extremely soothing' },
  { text: 'Zuikutis ir paukšteliai', characters: 'Cute bunny sleeping under bush, little birds in nest, moonlight, peaceful forest' },
  { text: 'Šilta lovytė', characters: 'Cozy bed with soft blanket and pillow, warm atmosphere, gentle night light' },
  { text: 'Miegok mažyli', characters: 'Baby peacefully falling asleep, soft lighting, floating gentle sparkles' },
  { text: 'Žvaigždutės saugo', characters: 'Protective stars watching over sleeping child, gentle guardian angels, soft glow' },
  { text: 'Labanakt', characters: 'Peaceful sleeping baby under soft blanket, moonlight through window, "good night" feeling' },
];

// =============================================================================
// Pagalbinės funkcijos
// =============================================================================
function splitIntoVerses(content: string): string[] {
  return content
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.+\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !p.match(/^[\.\s]+$/));
}

async function generateVerseAudio(text: string, index: number): Promise<string> {
  console.log(`  [${index + 1}] "${text.substring(0, 40)}..."`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: VOICE.settings,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(TEMP_DIR, `verse_${index}.mp3`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function getAudioDuration(filePath: string): number {
  const result = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return parseFloat(result.trim());
}

function generateSilence(durationSeconds: number, outputPath: string): void {
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSeconds} -q:a 9 -acodec libmp3lame "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

function concatenateAudio(files: string[], outputPath: string): void {
  const listPath = path.join(TEMP_DIR, 'filelist.txt');
  const listContent = files.map((f) => `file '${f}'`).join('\n');
  fs.writeFileSync(listPath, listContent);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, { stdio: 'pipe' });
}

async function generateImage(scene: typeof SCENES[0], index: number): Promise<string> {
  console.log(`  🎨 Image ${index + 1}/${SCENES.length}: ${scene.text}`);
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${ART_STYLE}\n\nSCENE: ${scene.characters}\n\nIMPORTANT: For babies - extremely simple, soft, calming. NO text. Large simple shapes.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });
  return result.data![0].b64_json!;
}

// =============================================================================
// Pagrindinė funkcija
// =============================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING LULLABY WITH 3.5-SECOND PAUSES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Title: ${LULLABY.title}`);
  console.log(`Pause duration: ${PAUSE_DURATION_SECONDS}s between verses`);
  console.log(`Voice: ${VOICE.name} (speed: ${VOICE.settings.speed})`);

  // Patikrinti ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('\n❌ ffmpeg not found! Install with: brew install ffmpeg');
    process.exit(1);
  }

  // Sukurti laikinąjį katalogą
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 1 žingsnis: Padalinti į posmus
  const verses = splitIntoVerses(LULLABY.content);
  console.log(`\n[1/5] Found ${verses.length} verses`);

  // 2 žingsnis: Sugeneruoti garso įrašą kiekvienam posmui
  console.log('\n[2/5] Generating audio for each verse...');
  const verseFiles: string[] = [];
  const verseDurations: number[] = [];

  for (let i = 0; i < verses.length; i++) {
    const filePath = await generateVerseAudio(verses[i], i);
    const duration = getAudioDuration(filePath);
    verseFiles.push(filePath);
    verseDurations.push(duration);
    console.log(`       Duration: ${duration.toFixed(2)}s`);
  }

  // 3 žingsnis: Sugeneruoti tylą
  console.log(`\n[3/5] Generating ${PAUSE_DURATION_SECONDS}s silence...`);
  const silencePath = path.join(TEMP_DIR, 'silence.mp3');
  generateSilence(PAUSE_DURATION_SECONDS, silencePath);

  // 4 žingsnis: Sujungti su tyla
  console.log('\n[4/5] Concatenating audio with pauses...');
  const allFiles: string[] = [];
  for (let i = 0; i < verseFiles.length; i++) {
    allFiles.push(verseFiles[i]);
    if (i < verseFiles.length - 1) {
      allFiles.push(silencePath);
    }
  }

  const finalAudioPath = path.join(TEMP_DIR, 'lullaby_final.mp3');
  concatenateAudio(allFiles, finalAudioPath);

  // Apskaičiuoti paragraph_end_times
  const paragraphEndTimes: number[] = [];
  let cumulativeTime = 0;
  for (let i = 0; i < verseDurations.length; i++) {
    cumulativeTime += verseDurations[i];
    paragraphEndTimes.push(Math.round(cumulativeTime * 10) / 10);
    if (i < verseDurations.length - 1) {
      cumulativeTime += PAUSE_DURATION_SECONDS;
    }
  }

  const totalDuration = getAudioDuration(finalAudioPath);
  const speechTime = verseDurations.reduce((a, b) => a + b, 0);
  const pauseTime = (verses.length - 1) * PAUSE_DURATION_SECONDS;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' AUDIO RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total duration: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} min)`);
  console.log(`Speech time: ${speechTime.toFixed(1)}s`);
  console.log(`Pause time: ${pauseTime.toFixed(1)}s (${verses.length - 1} × ${PAUSE_DURATION_SECONDS}s)`);
  console.log(`Sec per image: ${(totalDuration / verses.length).toFixed(1)}s`);

  // Įkelti garso įrašą
  console.log('\n[5/5] Uploading audio...');
  const audioBuffer = fs.readFileSync(finalAudioPath);
  const timestamp = Date.now();
  const audioPath = `pregenerated/${timestamp}_lullaby_with_pauses.mp3`;

  await supabase.storage.from('audio').upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;
  console.log(`✅ Audio: ${audioUrl}`);

  // Sugeneruoti paveikslėlius
  console.log('\n[6/5] Generating images...');
  const imageUrls: { url: string; index: number; text: string }[] = [];

  for (let i = 0; i < SCENES.length; i++) {
    try {
      const base64 = await generateImage(SCENES[i], i);
      const imgPath = `pregenerated/lullaby_${timestamp}_${i}.png`;
      await supabase.storage.from('story-images').upload(imgPath, Buffer.from(base64, 'base64'), { contentType: 'image/png' });
      imageUrls.push({
        url: supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl,
        index: i,
        text: SCENES[i].text,
      });
      console.log(`  ✅ Image ${i + 1} uploaded`);
    } catch (e) {
      console.error(`  ❌ Image ${i + 1} failed:`, e);
    }
  }

  // Išvesti SQL
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' INSERT SQL');
  console.log('═══════════════════════════════════════════════════════════════');

  const sql = `
INSERT INTO pregenerated_stories (title, content, theme, target_age, duration_seconds, audio_url, thumbnail_url, image_style, voice_id, voice_name, is_active, sort_order, paragraph_end_times)
VALUES (
  '${LULLABY.title}',
  '${LULLABY.content.replace(/'/g, "''")}',
  '${LULLABY.theme}',
  ${LULLABY.target_age},
  ${Math.round(totalDuration)},
  '${audioUrl}',
  '${imageUrls[0]?.url || ''}',
  '${LULLABY.image_style}',
  '${VOICE.id}',
  '${VOICE.name}',
  true,
  1,
  ARRAY[${paragraphEndTimes.join(', ')}]::REAL[]
) RETURNING id;`;

  console.log(sql);

  console.log('\n-- Images (replace <ID> with story id):');
  imageUrls.forEach((img) => {
    console.log(`INSERT INTO pregenerated_story_images (story_id, image_url, scene_index, scene_text) VALUES ('<ID>', '${img.url}', ${img.index}, '${img.text.replace(/'/g, "''")}');`);
  });

  console.log('\n✅ Done!');
}

main().catch(console.error);
