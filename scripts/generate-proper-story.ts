/**
 * Sugeneruoti tinkamą iš anksto paruoštą pasaką, tiksliai laikantis STORY_GENERATION.md:
 * - 7 pastraipos, atskirtos ...
 * - 2 s pauzės tarp pastraipų
 * - Tinkamos garso žymos
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

const TEMP_DIR = '/tmp/proper-story-gen';

// Pasakos apibrėžimas - tiksliai laikantis veikiančio formato
const STORY = {
  id: 'little-star',
  title: 'Mažoji Žvaigždutė',
  target_age: 4,
  theme: 'draugystė',
  image_style: 'dreamy',
  pause_seconds: 2.0, // Standartinės 2 s pauzės pagal dokumentaciją
  voice: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', speed: 0.75 },
  art_style: 'Dreamy magical night illustration for children, purple and blue palette, glowing stars, soft sparkles',
  // Lygiai 7 pastraipos, atskirtos ...
  content: `[in lithuanian language] [softly] Aukštai danguje gyveno mažytė žvaigždutė.
Ji buvo šviesesnė už kitas žvaigždes.
Kiekvieną naktį ji žiūrėjo į žemę.

...

[warmly] Žvaigždutė pamatė mažą berniuką.
Jis sėdėjo prie lango ir buvo liūdnas.
"Kodėl jis nesišypso?" - pagalvojo žvaigždutė.

...

[excited] Ji nusprendė nušokti žemyn!
Žvaigždutė skriejo per dangų kaip sidabrinė ugnelė.
Ji nukrito tiesiai į berniuko kiemą.

...

[warmly] Berniukas išbėgo į lauką.
Jis pamatė švytinčią žvaigždutę žolėje.
"Ar tu tikra?" - nustebęs paklausė jis.

...

[playfully] Žvaigždutė sušvito dar ryškiau.
Ji pašoko ir ėmė šokti aplinkui berniuką.
Berniukas nusijuokė ir šoko kartu.

...

[softly] Atėjo laikas grįžti į dangų.
Žvaigždutė pakilo aukštyn aukštyn.
"Aš visada būsiu čia," - pažadėjo ji.

...

[yawns] [whispers] Berniukas įlipo į lovelę.
Pro langą jis matė savo draugę žvaigždutę.
Labanakt, mažyli. Saldžių sapnų.`,
  scenes: [
    { text: 'Žvaigždutė danguje', desc: 'Tiny glowing star in magical night sky, brighter than others, looking down at earth, dreamy purple blue sky' },
    { text: 'Liūdnas berniukas', desc: 'Small sad boy sitting by window at night, looking at stars, cozy bedroom, warm light inside, dreamy style' },
    { text: 'Žvaigždutė krenta', desc: 'Shooting star falling through night sky like silver flame, magical trail of sparkles, dreamy illustration' },
    { text: 'Susitikimas', desc: 'Little boy in pajamas finding glowing star in garden grass, amazed expression, magical night, dreamy style' },
    { text: 'Šokis kartu', desc: 'Happy boy dancing with floating glowing star in garden, both joyful, sparkles around them, magical night' },
    { text: 'Atsisveikinimas', desc: 'Glowing star rising up to sky, boy waving goodbye from garden, magical trail of light, dreamy night' },
    { text: 'Saldūs sapnai', desc: 'Boy sleeping peacefully in bed, through window bright star visible in night sky, dreamy peaceful scene' },
  ],
};

// Suskaidyti turinį į posmus (atskiriant pagal ...)
function parseVerses(content: string): string[] {
  return content
    .split(/\n\s*\.\.\.\s*\n/)
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

// Sugeneruoti garso įrašą vienam posmui
async function generateVerseAudio(text: string, index: number): Promise<string> {
  const outputPath = path.join(TEMP_DIR, `verse_${index}.mp3`);

  console.log(`  [${index + 1}/7] Generating audio...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${STORY.voice.id}`, {
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
        speed: STORY.voice.speed,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

  // Gauti trukmę
  const duration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`)
      .toString()
      .trim()
  );
  console.log(`      ${duration.toFixed(1)}s`);

  return outputPath;
}

// Gauti garso įrašo trukmę
function getAudioDuration(filePath: string): number {
  return parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`)
      .toString()
      .trim()
  );
}

// Sujungti garso failus su tyla
function concatenateAudio(files: string[], outputPath: string): void {
  const silencePath = path.join(TEMP_DIR, 'silence.mp3');
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${STORY.pause_seconds} -q:a 9 -acodec libmp3lame "${silencePath}"`, { stdio: 'pipe' });

  const concatFile = path.join(TEMP_DIR, 'concat.txt');
  let content = '';
  for (let i = 0; i < files.length; i++) {
    content += `file '${files[i]}'\n`;
    if (i < files.length - 1) {
      content += `file '${silencePath}'\n`;
    }
  }
  fs.writeFileSync(concatFile, content);

  execSync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}" -y 2>/dev/null`);
}

// Sugeneruoti paveikslėlį
async function generateImage(scene: { text: string; desc: string }, index: number): Promise<string> {
  console.log(`  [${index + 1}/7] ${scene.text}...`);

  const prompt = `${STORY.art_style}. Scene: ${scene.desc}. Style: Children's book illustration, soft and gentle, no text.`;

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'low',
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) throw new Error('No image data');

  const buffer = Buffer.from(imageData.b64_json, 'base64');
  const filename = `${Date.now()}_${STORY.id}_${index}.png`;

  const { error } = await supabase.storage
    .from('story-images')
    .upload(`pregenerated/${filename}`, buffer, { contentType: 'image/png' });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('story-images')
    .getPublicUrl(`pregenerated/${filename}`);

  console.log(`      ✅`);
  return urlData.publicUrl;
}

async function main() {
  console.log('═'.repeat(60));
  console.log(` GENERATING: ${STORY.title} (age ${STORY.target_age})`);
  console.log(` Voice: ${STORY.voice.name} @ ${STORY.voice.speed}x`);
  console.log(` Pause: ${STORY.pause_seconds}s (per STORY_GENERATION.md)`);
  console.log(` Paragraphs: 7 (per STORY_GENERATION.md)`);
  console.log('═'.repeat(60));

  // Sukurti laikinąjį katalogą
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Suskaidyti į posmus
  const verses = parseVerses(STORY.content);
  if (verses.length !== 7) {
    throw new Error(`Expected 7 verses, got ${verses.length}`);
  }
  console.log(`\n✓ Content has exactly 7 paragraphs`);

  // Įvertinti kreditus
  const totalChars = verses.reduce((sum, v) => sum + v.length, 0);
  console.log(`\nEstimated ElevenLabs credits: ~${totalChars}`);
  console.log(`Estimated OpenAI images: 7 × $0.02 = ~$0.14`);

  console.log('\nPress Ctrl+C within 5 seconds to cancel...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 1 žingsnis: Sugeneruoti garso įrašą kiekvienam posmui
  console.log(`[1/4] Generating audio for 7 verses...`);
  const audioFiles: string[] = [];
  const verseDurations: number[] = [];

  for (let i = 0; i < verses.length; i++) {
    const audioPath = await generateVerseAudio(verses[i], i);
    audioFiles.push(audioPath);
    verseDurations.push(getAudioDuration(audioPath));
  }

  // 2 žingsnis: Sujungti su pauzėmis
  console.log(`\n[2/4] Concatenating with ${STORY.pause_seconds}s pauses...`);
  const finalAudioPath = path.join(TEMP_DIR, 'final.mp3');
  concatenateAudio(audioFiles, finalAudioPath);

  // Apskaičiuoti pastraipų pabaigos laikus (lygiai kaip generate-3-stories.ts)
  const paragraphEndTimes: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < verseDurations.length; i++) {
    cumulative += verseDurations[i];
    paragraphEndTimes.push(Math.round(cumulative * 10) / 10);
    if (i < verseDurations.length - 1) cumulative += STORY.pause_seconds;
  }

  const totalDuration = getAudioDuration(finalAudioPath);
  console.log(`  Total: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} min)`);
  console.log(`  End times: [${paragraphEndTimes.join(', ')}]`);

  // 3 žingsnis: Įkelti garso įrašą
  console.log(`\n[3/4] Uploading audio...`);
  const audioBuffer = fs.readFileSync(finalAudioPath);
  const audioFilename = `${Date.now()}_${STORY.id}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(`pregenerated/${audioFilename}`, audioBuffer, { contentType: 'audio/mpeg' });

  if (uploadError) throw uploadError;

  const { data: audioUrlData } = supabase.storage
    .from('audio')
    .getPublicUrl(`pregenerated/${audioFilename}`);

  console.log(`  ✅ ${audioUrlData.publicUrl}`);

  // 4 žingsnis: Sugeneruoti paveikslėlius
  console.log(`\n[4/4] Generating 7 images...`);
  const imageUrls: string[] = [];

  for (let i = 0; i < STORY.scenes.length; i++) {
    const url = await generateImage(STORY.scenes[i], i);
    imageUrls.push(url);
  }

  // 5 žingsnis: Išsaugoti į duomenų bazę
  console.log(`\n[5/5] Saving to database...`);

  const { data: storyData, error: storyError } = await supabase
    .from('pregenerated_stories')
    .insert({
      title: STORY.title,
      content: STORY.content,
      theme: STORY.theme,
      target_age: STORY.target_age,
      duration_seconds: Math.round(totalDuration),
      audio_url: audioUrlData.publicUrl,
      thumbnail_url: imageUrls[0],
      image_style: STORY.image_style,
      voice_id: STORY.voice.id,
      voice_name: STORY.voice.name,
      is_active: true,
      sort_order: STORY.target_age,
      paragraph_end_times: paragraphEndTimes,
    })
    .select('id')
    .single();

  if (storyError) {
    console.error('  ❌ Story insert error:', storyError);
    console.log('\n📋 Manual insert data:');
    console.log(JSON.stringify({
      title: STORY.title,
      content: STORY.content,
      theme: STORY.theme,
      target_age: STORY.target_age,
      duration_seconds: Math.round(totalDuration),
      audio_url: audioUrlData.publicUrl,
      thumbnail_url: imageUrls[0],
      paragraph_end_times: paragraphEndTimes,
      voice_id: STORY.voice.id,
      voice_name: STORY.voice.name,
    }, null, 2));
  } else {
    console.log(`  ✅ Story saved with ID: ${storyData.id}`);

    // Įterpti paveikslėlius
    const imageInserts = imageUrls.map((url, i) => ({
      story_id: storyData.id,
      image_url: url,
      scene_index: i,
      scene_text: STORY.scenes[i].text,
    }));

    const { error: imageError } = await supabase
      .from('pregenerated_story_images')
      .insert(imageInserts);

    if (imageError) {
      console.error('  ❌ Image insert error:', imageError);
    } else {
      console.log(`  ✅ ${imageUrls.length} images saved`);
    }
  }

  // Išvalymas
  fs.rmSync(TEMP_DIR, { recursive: true });

  console.log('\n' + '═'.repeat(60));
  console.log(' ✅ DONE!');
  console.log('═'.repeat(60));
}

main().catch(console.error);
