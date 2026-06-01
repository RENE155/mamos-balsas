/**
 * Iš naujo sugeneruoti garsą esamai iš anksto sugeneruotai pasakai SU TINKAMOMIS 2 SEKUNDŽIŲ PAUZĖMIS
 *
 * Šis scenarijus:
 * 1. Gauna pasaką iš duomenų bazės
 * 2. Suskaido turinį į pastraipas
 * 3. Sugeneruoja garsą KIEKVIENAI pastraipai atskirai (ElevenLabs v3)
 * 4. Sujungia su TIKSLIA 2 s tyla tarp kiekvienos (ffmpeg)
 * 5. Įkelia naują garsą į Supabase
 * 6. Atnaujina duomenų bazę su nauju audio_url ir TIKSLIAIS paragraph_end_times
 *
 * Naudojimas:
 *   npx ts-node scripts/regenerate-story-audio.ts <story-id>
 *   npx ts-node scripts/regenerate-story-audio.ts 6b1ec51d-a58b-4d8e-82b4-1ec332c9e900
 *
 * Reikalavimai:
 *   - ffmpeg (brew install ffmpeg)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// Aplinka
const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// Naudoti service role raktą, jei prieinamas, kitaip grįžti prie anon rakto
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Konfigūracija
const PAUSE_DURATION_SECONDS = 2.0;
const TEMP_DIR = '/tmp/story-audio-regen';

// Balsų atvaizdavimas
const VOICES: Record<string, string> = {
  Sarah: 'EXAVITQu4vr4xnSDxMaL',
  Matilda: 'XrExE9yKIg1WjnnlVkGX',
  Charlotte: 'XB0fDUnXU5powFXDhCwa',
  Lily: 'pFZP5JQG7iQjIQuC4Bku',
};

// =============================================================================
// Pagalbinė funkcija: suskaidyti pasaką į pastraipas
// =============================================================================
function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.+\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10 && !p.match(/^[\.\s]+$/));
}

// =============================================================================
// Sugeneruoti garsą vienai pastraipai
// =============================================================================
async function generateParagraphAudio(
  text: string,
  index: number,
  voiceId: string
): Promise<{ filePath: string; duration: number }> {
  console.log(`  [${index + 1}] "${text.substring(0, 60).replace(/\n/g, ' ')}..."`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
        speed: 0.7, // Lėčiausias prieš miegą
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

  // Gauti trukmę
  const duration = getAudioDuration(filePath);
  console.log(`       Duration: ${duration.toFixed(2)}s`);

  return { filePath, duration };
}

// =============================================================================
// Gauti garso trukmę naudojant ffprobe
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
  const listPath = path.join(TEMP_DIR, 'filelist.txt');
  const listContent = files.map((f) => `file '${f}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, {
    stdio: 'pipe',
  });
}

// =============================================================================
// Pagrindinė funkcija
// =============================================================================
async function main() {
  const storyId = process.argv[2];

  if (!storyId) {
    console.error('Usage: npx ts-node scripts/regenerate-story-audio.ts <story-id>');
    console.error('\nAvailable stories:');

    const { data: stories } = await supabase
      .from('pregenerated_stories')
      .select('id, title, duration_seconds, paragraph_end_times')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    stories?.forEach((s) => {
      const hasTimestamps = s.paragraph_end_times ? '✓' : '✗';
      console.log(`  ${s.id}  "${s.title}" (${s.duration_seconds}s) [timestamps: ${hasTimestamps}]`);
    });

    process.exit(1);
  }

  // Patikrinti ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('\nERROR: ffmpeg not found! Install with: brew install ffmpeg');
    process.exit(1);
  }

  // Sukurti laikiną katalogą
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' REGENERATING STORY AUDIO WITH 2-SECOND PAUSES');
  console.log('═══════════════════════════════════════════════════════════════');

  // Gauti pasaką iš duomenų bazės
  console.log(`\n[1/6] Fetching story ${storyId}...`);
  const { data: story, error } = await supabase
    .from('pregenerated_stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (error || !story) {
    console.error('Story not found:', error);
    process.exit(1);
  }

  console.log(`       Title: "${story.title}"`);
  console.log(`       Current duration: ${story.duration_seconds}s`);
  console.log(`       Current timestamps: ${JSON.stringify(story.paragraph_end_times)}`);

  // Gauti balso ID
  const voiceId = story.voice_id || VOICES.Sarah;
  console.log(`       Voice: ${story.voice_name || 'Sarah'} (${voiceId})`);

  // Suskaidyti į pastraipas
  console.log(`\n[2/6] Splitting content into paragraphs...`);
  const paragraphs = splitIntoParagraphs(story.content);
  console.log(`       Found ${paragraphs.length} paragraphs`);

  // Sugeneruoti garsą kiekvienai pastraipai
  console.log(`\n[3/6] Generating audio for each paragraph (speed: 0.7)...`);
  const paragraphData: Array<{ filePath: string; duration: number }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const data = await generateParagraphAudio(paragraphs[i], i, voiceId);
    paragraphData.push(data);
  }

  // Sugeneruoti tylą
  console.log(`\n[4/6] Creating ${PAUSE_DURATION_SECONDS}s silence...`);
  const silencePath = path.join(TEMP_DIR, 'silence.mp3');
  generateSilence(PAUSE_DURATION_SECONDS, silencePath);

  // Sujungti su tyla
  console.log(`\n[5/6] Concatenating audio with pauses...`);
  const allFiles: string[] = [];
  for (let i = 0; i < paragraphData.length; i++) {
    allFiles.push(paragraphData[i].filePath);
    if (i < paragraphData.length - 1) {
      allFiles.push(silencePath);
    }
  }

  const finalAudioPath = path.join(TEMP_DIR, 'final_story.mp3');
  concatenateAudio(allFiles, finalAudioPath);

  // Apskaičiuoti paragraph_end_times
  const paragraphEndTimes: number[] = [];
  let cumulativeTime = 0;

  for (let i = 0; i < paragraphData.length; i++) {
    cumulativeTime += paragraphData[i].duration;
    paragraphEndTimes.push(Math.round(cumulativeTime * 10) / 10);

    if (i < paragraphData.length - 1) {
      cumulativeTime += PAUSE_DURATION_SECONDS;
    }
  }

  const totalDuration = getAudioDuration(finalAudioPath);

  console.log(`\n       Total duration: ${totalDuration.toFixed(2)}s`);
  console.log(`       Paragraph end times: [${paragraphEndTimes.join(', ')}]`);

  // Įkelti naują garsą
  console.log(`\n[6/6] Uploading and updating database...`);
  const audioBuffer = fs.readFileSync(finalAudioPath);
  const timestamp = Date.now();
  const safeTitle = story.title.replace(/[^a-zA-Z0-9]/g, '_');
  const audioPath = `pregenerated/${timestamp}_${safeTitle}_with_pauses.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
  const newAudioUrl = urlData.publicUrl;
  console.log(`       New audio URL: ${newAudioUrl}`);

  // Atnaujinti duomenų bazę
  const { error: updateError } = await supabase
    .from('pregenerated_stories')
    .update({
      audio_url: newAudioUrl,
      duration_seconds: Math.round(totalDuration),
      paragraph_end_times: paragraphEndTimes,
    })
    .eq('id', storyId);

  if (updateError) {
    console.error('Database update error:', updateError);
    process.exit(1);
  }

  // Išvalymas
  fs.rmSync(TEMP_DIR, { recursive: true });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n  Story: "${story.title}"`);
  console.log(`  Old duration: ${story.duration_seconds}s → New: ${Math.round(totalDuration)}s`);
  console.log(`  Old timestamps: ${JSON.stringify(story.paragraph_end_times)}`);
  console.log(`  New timestamps: [${paragraphEndTimes.join(', ')}]`);
  console.log(`  Pause duration: ${PAUSE_DURATION_SECONDS}s between paragraphs`);
  console.log(`\n  Audio has been regenerated with EXACT pauses!`);
  console.log(`  The player will now sync perfectly.`);
}

main().catch(console.error);
