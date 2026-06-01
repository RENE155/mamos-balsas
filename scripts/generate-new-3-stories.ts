/**
 * Sugeneruoti 3 NAUJAS iš anksto paruoštas pasakas skirtingoms amžiaus grupėms
 *
 * Amžius: 1-2, 3-4, 5-6
 * Trukmė: po 3-4 minutes
 *
 * Naudojimas: npx ts-node scripts/generate-new-3-stories.ts
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

const TEMP_DIR = '/tmp/new-stories-gen';

// ═══════════════════════════════════════════════════════════════════════════
// PASAKŲ APIBRĖŽIMAI - 3 NAUJOS PASAKOS
// ═══════════════════════════════════════════════════════════════════════════

const STORIES = [
  {
    id: 'baby-moon',
    title: 'Mėnulis Sako Labanakt',
    target_age: 1, // 1-2 metai - LABAI paprasta, trumpa
    theme: 'dreams',
    image_style: 'dreamy',
    pause_seconds: 4.0,
    voice: { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', speed: 0.7 }, // Švelnus, romus moteriškas
    art_style: 'Extremely soft pastel watercolor for babies, simple round shapes, gentle muted colors (soft yellow, pale blue, lavender), large friendly moon and stars, very calming and simple',
    content: `[in lithuanian language] [softly] Mėnulis danguje.
Jis šviečia švelniai.
Labanakt, mėnuli.

...

[whispers] Žvaigždutė mirksi.
Mirksi, mirksi, mirksi.
Labanakt, žvaigždute.

...

[softly] Debesėlis plaukia.
Minkštas kaip pagalvė.
Labanakt, debesėli.

...

[yawns] Paukštelis miega.
Jis lizdelyje.
Labanakt, paukšteli.

...

[whispers] Meškiukas miega.
Jis sapnuoja medų.
Labanakt, meškiuk.

...

[softly] Katytė murkia.
Murrr, murrr, murrr.
Labanakt, katyte.

...

[whispers] Tu irgi miegi.
Užsimerk, mažyli.
Labanakt, labanakt.

...

[softly] [yawns] Šššš...
Visi miega.
Saldžių sapnų.`,
    scenes: [
      { text: 'Mėnulis', desc: 'Big friendly smiling moon in dark blue sky, very simple, baby-friendly' },
      { text: 'Žvaigždutė', desc: 'Single cute twinkling star with happy face, soft glow' },
      { text: 'Debesėlis', desc: 'Fluffy white cloud like a pillow, gentle night sky' },
      { text: 'Paukštelis', desc: 'Tiny bird sleeping in cozy nest, moonlight' },
      { text: 'Meškiukas', desc: 'Cute teddy bear sleeping peacefully, honey pot nearby' },
      { text: 'Katytė', desc: 'Fluffy kitten curled up sleeping, soft fur' },
      { text: 'Mažylis miega', desc: 'Baby peacefully sleeping under soft blanket' },
      { text: 'Labanakt', desc: 'Moon, stars, and sleeping animals, peaceful night scene' },
    ],
  },
  {
    id: 'bunny-garden',
    title: 'Zuikutis ir Stebuklingas Sodas',
    target_age: 3, // 3-4 metai - Paprasta pasaka, vidutinio ilgio pastraipos
    theme: 'nature',
    image_style: 'watercolor',
    pause_seconds: 3.0,
    voice: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', speed: 0.75 }, // Šiltas, globėjiškas
    art_style: 'Soft watercolor children\'s book illustration, warm pastel colors (pink, orange, green), friendly animals, magical garden with glowing flowers, gentle and cozy',
    content: `[in lithuanian language] [warmly] Gyveno kartą mažas baltas zuikutis, vardu Pūkis. Jis turėjo ilgas minkštas ausytes ir rausvą nosiukę. Pūkis labai mėgo morkas.

...

[softly] Vieną vakarą Pūkis rado mažą spindinčią sėklą. "Oho! Kokia graži!" - sušuko jis. Sėkla švietė kaip maža žvaigždutė.

...

[excited] Pūkis pasodino sėklą savo darželyje. Jis palaistyno ją vandeniu ir palinkėjo labos nakties. "Augi, sėklyte, augi!" - tyliai pasakė.

...

[whispers] Naktį, kai Pūkis miegojo, sėkla pradėjo augti. Iš jos išaugo stebuklingas žydintis medis! Medis švietė mėlyna šviesa.

...

[warmly] Rytą Pūkis pamatė medį ir negalėjo patikėti. "Tai stebuklas!" - džiaugėsi jis. Medžio žiedai kvepėjo medum ir braškėmis.

...

[softly] Ant medžio sėdėjo mažas paukštelis. "Ačiū, Pūki, už šį gražų medį," - čiulbėjo jis. "Dabar turiu namus."

...

[giggles] Pūkis buvo labai laimingas. Jis turėjo naują draugą ir stebukllingą medį. Kiekvieną vakarą jie kartu žiūrėdavo į žvaigždes.

...

[yawns] [softly] "Labanakt, paukšteli," - tarė Pūkis. "Labanakt, medi. Labanakt, žvaigždutės." Ir visi užmigo saldžiai saldžiai.`,
    scenes: [
      { text: 'Zuikutis Pūkis', desc: 'Cute white bunny with long fluffy ears and pink nose in meadow' },
      { text: 'Spindinti sėkla', desc: 'Bunny holding tiny glowing seed, amazed expression, evening light' },
      { text: 'Sodina sėklą', desc: 'Bunny planting seed in small garden, watering can nearby' },
      { text: 'Medis auga naktį', desc: 'Magical glowing tree growing under moonlight, blue sparkles' },
      { text: 'Stebuklingas medis', desc: 'Beautiful glowing tree with colorful flowers, bunny looking amazed' },
      { text: 'Paukštelis', desc: 'Small bird sitting on magical tree branch, bunny below smiling' },
      { text: 'Draugai', desc: 'Bunny and bird together under magical tree, stars appearing' },
      { text: 'Labanakt', desc: 'Bunny and bird sleeping peacefully, magical tree glowing softly' },
    ],
  },
  {
    id: 'star-adventure',
    title: 'Mergaitė ir Nukritusi Žvaigždė',
    target_age: 5, // 5-6 metai - Išsamesnė pasaka
    theme: 'adventure',
    image_style: 'storybook',
    pause_seconds: 2.5,
    voice: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', speed: 0.8 }, // Raiškus pasakotojas
    art_style: 'Classic storybook illustration, rich warm colors, detailed magical night scenes, friendly characters, sense of wonder and adventure, soft golden lighting',
    content: `[in lithuanian language] [warmly] Mažoje trobelėje prie miško gyveno mergaitė, vardu Rūta. Ji turėjo ilgus šviesius plaukus ir mėlynas akis kaip dangus. Kiekvieną vakarą Rūta žiūrėdavo pro langą į žvaigždes.

...

[excited] Vieną naktį Rūta pamatė kažką nuostabaus! Viena žvaigždutė nukrito iš dangaus tiesiai į mišką. "Turiu ją rasti!" - nusprendė drąsioji mergaitė ir išbėgo laukan.

...

[softly] Miškas naktį buvo tamsus, bet Rūta nebijojo. Jonvabalėliai apšvietė jai kelią mažomis žalsvomis lempytėmis. "Ačiū, jonvabalėliai!" - šypsojosi ji.

...

[whispers] Giliai miške Rūta rado mažą šviečiančią žvaigždutę. Ji buvo tokia maža ir liūdna. "Aš pasiklydau," - tyliai pasakė žvaigždutė. "Negaliu grįžti į dangų."

...

[warmly] "Aš tau padėsiu!" - pažadėjo Rūta. Ji paėmė žvaigždutę į rankas. Žvaigždutė buvo šilta ir minkšta kaip katytės kailiukas.

...

[excited] Rūta užkopė ant aukščiausio kalnelio. "Dabar šok!" - sušuko ji ir švelniai palleido žvaigždutę. Žvaigždutė pakilo aukštyn, aukštyn, aukštyn!

...

[giggles] "Ačiū, Rūta!" - sušuko žvaigždutė iš dangaus. "Tu esi pati geriausia draugė! Kiekvieną naktį šviečsiu tau pro langą."

...

[softly] Rūta grįžo namo ir įlipo į lovytę. Ji pažiūrėjo pro langą - ten švietė jos žvaigždutė, ryškiausiai iš visų.

...

[yawns] [whispers] "Labanakt, žvaigždute," - šnibždėjo Rūta ir užmigo. Ir žvaigždutė saugojo jos sapnus visą naktį.`,
    scenes: [
      { text: 'Mergaitė Rūta', desc: 'Girl with blonde hair looking at stars through window, cozy room' },
      { text: 'Žvaigždė krenta', desc: 'Shooting star falling into forest, girl watching amazed from window' },
      { text: 'Miškas naktį', desc: 'Girl walking through dark forest, fireflies lighting the path' },
      { text: 'Randa žvaigždę', desc: 'Girl finding small glowing star on forest floor, magical scene' },
      { text: 'Paima žvaigždę', desc: 'Girl holding warm glowing star in her hands, gentle light on face' },
      { text: 'Ant kalnelio', desc: 'Girl on hilltop releasing star into sky, magical moment' },
      { text: 'Žvaigždė danguje', desc: 'Star flying back to sky, waving goodbye to girl below' },
      { text: 'Grįžta namo', desc: 'Girl in cozy bed, brightest star shining through window' },
      { text: 'Labanakt', desc: 'Girl sleeping peacefully, starlight on her face, magical night' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PAGALBINĖS FUNKCIJOS
// ═══════════════════════════════════════════════════════════════════════════

function splitIntoVerses(content: string): string[] {
  return content
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.+\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !p.match(/^[\.\s]+$/));
}

async function generateVerseAudio(text: string, voice: typeof STORIES[0]['voice']): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: voice.speed },
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

async function generateImage(artStyle: string, scene: { text: string; desc: string }): Promise<string> {
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${artStyle}\n\nSCENE: ${scene.desc}\n\nIMPORTANT: Child-friendly, no text or words, calming bedtime atmosphere.`,
    n: 1,
    size: '1024x1536',
    quality: 'low',
  });
  return result.data![0].b64_json!;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGRINDINIS PASAKŲ GENERATORIUS
// ═══════════════════════════════════════════════════════════════════════════

async function generateStory(story: typeof STORIES[0]) {
  const storyDir = path.join(TEMP_DIR, story.id);
  if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(` ${story.title} (age ${story.target_age})`);
  console.log(` Voice: ${story.voice.name} @ ${story.voice.speed}x | Pause: ${story.pause_seconds}s`);
  console.log('═'.repeat(60));

  // Suskaičiuoti simbolius kreditų įvertinimui
  const totalChars = story.content.length;
  console.log(`\n📊 Estimated ElevenLabs credits: ~${totalChars}`);

  // 1. Sugeneruoti garso įrašą kiekvienam posmui
  const verses = splitIntoVerses(story.content);
  console.log(`\n[1/4] Generating audio for ${verses.length} verses...`);

  const verseFiles: string[] = [];
  const verseDurations: number[] = [];

  for (let i = 0; i < verses.length; i++) {
    process.stdout.write(`  [${i + 1}/${verses.length}] `);
    const buffer = await generateVerseAudio(verses[i], story.voice);
    const filePath = path.join(storyDir, `verse_${i}.mp3`);
    fs.writeFileSync(filePath, buffer);
    const duration = getAudioDuration(filePath);
    verseFiles.push(filePath);
    verseDurations.push(duration);
    console.log(`${duration.toFixed(1)}s (${verses[i].substring(0, 30)}...)`);
  }

  // 2. Sugeneruoti tylą ir sujungti
  console.log(`\n[2/4] Concatenating with ${story.pause_seconds}s pauses...`);
  const silencePath = path.join(storyDir, 'silence.mp3');
  generateSilence(story.pause_seconds, silencePath);

  const allFiles: string[] = [];
  for (let i = 0; i < verseFiles.length; i++) {
    allFiles.push(verseFiles[i]);
    if (i < verseFiles.length - 1) allFiles.push(silencePath);
  }

  const finalAudioPath = path.join(storyDir, 'final.mp3');
  concatenateAudio(allFiles, finalAudioPath);

  // Apskaičiuoti kiekvienos pastraipos pabaigos laikus
  const paragraphEndTimes: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < verseDurations.length; i++) {
    cumulative += verseDurations[i];
    paragraphEndTimes.push(Math.round(cumulative * 10) / 10);
    if (i < verseDurations.length - 1) cumulative += story.pause_seconds;
  }

  const totalDuration = getAudioDuration(finalAudioPath);
  console.log(`  Total: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} min)`);

  // 3. Įkelti garso įrašą
  console.log('\n[3/4] Uploading audio...');
  const timestamp = Date.now();
  const audioStoragePath = `pregenerated/${timestamp}_${story.id}.mp3`;
  await supabase.storage.from('audio').upload(audioStoragePath, fs.readFileSync(finalAudioPath), { contentType: 'audio/mpeg', upsert: true });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioStoragePath).data.publicUrl;
  console.log(`  ✅ Audio: ${audioUrl}`);

  // 4. Sugeneruoti ir įkelti paveikslėlius
  console.log(`\n[4/4] Generating ${story.scenes.length} images...`);
  const imageUrls: { url: string; index: number; text: string }[] = [];

  for (let i = 0; i < story.scenes.length; i++) {
    process.stdout.write(`  [${i + 1}/${story.scenes.length}] ${story.scenes[i].text}... `);
    try {
      const base64 = await generateImage(story.art_style, story.scenes[i]);
      const imgBuffer = Buffer.from(base64, 'base64');
      const imgPath = `pregenerated/${timestamp}_${story.id}_${i}.png`;
      await supabase.storage.from('story-images').upload(imgPath, imgBuffer, { contentType: 'image/png', upsert: true });
      const imgUrl = supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl;
      imageUrls.push({ url: imgUrl, index: i, text: story.scenes[i].text });
      console.log('✅');
    } catch (err) {
      console.log('❌', err);
    }
  }

  // 5. Išsaugoti į duomenų bazę
  console.log('\n[5/5] Saving to database...');

  const { data: storyData, error: storyError } = await supabase
    .from('pregenerated_stories')
    .insert({
      title: story.title,
      content: story.content,
      theme: story.theme,
      target_age: story.target_age,
      duration_seconds: Math.round(totalDuration),
      audio_url: audioUrl,
      thumbnail_url: imageUrls[0]?.url || null,
      image_style: story.image_style,
      voice_id: story.voice.id,
      voice_name: story.voice.name,
      paragraph_end_times: paragraphEndTimes,
      is_active: true,
      sort_order: story.target_age,
    })
    .select()
    .single();

  if (storyError) {
    console.error('  ❌ Story insert error:', storyError);
    return;
  }

  console.log(`  ✅ Story saved: ${storyData.id}`);

  // Išsaugoti paveikslėlius
  for (const img of imageUrls) {
    await supabase.from('pregenerated_story_images').insert({
      story_id: storyData.id,
      image_url: img.url,
      scene_index: img.index,
      scene_text: img.text,
    });
  }
  console.log(`  ✅ ${imageUrls.length} images saved`);

  return storyData;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGRINDINĖ FUNKCIJA
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING 3 NEW PREGENERATED STORIES');
  console.log('═══════════════════════════════════════════════════════════════');

  // Patikrinti ffmpeg
  try {
    execSync('which ffmpeg', { stdio: 'pipe' });
  } catch {
    console.error('❌ ffmpeg not found! Install with: brew install ffmpeg');
    process.exit(1);
  }

  // Sukurti laikinąjį katalogą
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Įvertinti bendrą kreditų skaičių
  const totalChars = STORIES.reduce((sum, s) => sum + s.content.length, 0);
  const totalImages = STORIES.reduce((sum, s) => sum + s.scenes.length, 0);
  console.log(`\n📊 Estimated costs:`);
  console.log(`   ElevenLabs: ~${totalChars} credits`);
  console.log(`   OpenAI images: ${totalImages} × $0.02 = ~$${(totalImages * 0.02).toFixed(2)}`);
  console.log(`\nPress Ctrl+C within 5 seconds to cancel...`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  for (const story of STORIES) {
    try {
      await generateStory(story);
    } catch (err) {
      console.error(`\n❌ Error generating ${story.title}:`, err);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' ✅ ALL DONE!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
