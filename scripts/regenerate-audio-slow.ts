/**
 * Iš naujo sugeneruoti garsą lėtesniu greičiu ir su daugiau pauzių
 */

import 'dotenv/config';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const VOICE = { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' };

// Pasaka - naudojamos V3 pauzių žymės: [pause], [long pause] pertraukoms tarp pastraipų
const STORY_CONTENT = `[in lithuanian language] [softly] Seniai seniai, giliai giliai miške, po didžiuoju šimtamečiu ąžuolu, gyveno mažas meškiukas, vardu Rudis. Jis turėjo minkštą rudą kailį ir mažas apvalias ausytes. [long pause] [long pause]

[warmly] Kiekvieną dieną Rudis žaisdavo su savo geriausiais draugais - voveryte Rūta ir zuikučiu Balčiu. Jie bėgiodavo po mišką, rinkdavo uogas ir juokdavosi kartu. [long pause] [long pause]

[yawns] Bet vieną vakarą, kai saulė leidosi už aukštų medžių, Rudis pajuto, kad jo kojelės pavargo, o akys pradėjo merktis. [softly] "Mama, aš noriu gražaus sapno," - tyliai pasakė mažasis meškiukas. [long pause] [long pause]

[whispers] Mama meškienė švelniai apkabino Rudį ir tarė: "Užsimerk, mažyli. Kai užmerki akis, tavo širdelėje atsiveria stebuklingos auksinės durys." [long pause] [long pause]

[softly] Rudis užmerkė akis ir pajuto, kaip lengvai lengvai pakyla į dangų. [excited] Jis skrido pro pūkuotus baltuosius debesis! Debesys buvo tokie minkšti - minkštesni už pačią minkščiausią pagalvėlę. [long pause] [long pause]

[giggles] "Labas, mažasis meškiuk!" - linksmai sušuko draugiškas rožinis debesėlis. [whispers] Tada pasirodė sidabrinė žvaigždutė. "Aš saugosiu tave visą naktį," - pažadėjo ji. [long pause] [long pause]

[softly] Debesėliai švelniai sūpavo Rudį, o žvaigždutės dainavo tylią lopšinę. [yawns] [whispers] Ir tu, mažasis drauge, gali keliauti į sapnų šalį. Užmerk akeles. Labanakt. Saldžių saldžių sapnų.`;

async function generateAudio(): Promise<Buffer> {
  console.log('Generating audio with ULTRA SLOW speed (0.5 - minimum)...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: STORY_CONTENT,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.5, // ULTRA LĖTAS - mažiausias greitis
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  console.log('=== Regenerating Audio with Slower Speed ===\n');

  // Sugeneruoti naują garsą
  const audioBuffer = await generateAudio();
  console.log(`Audio generated: ${audioBuffer.length} bytes`);

  // Išsaugoti lokaliai testavimui
  fs.writeFileSync('slow_story_audio.mp3', audioBuffer);
  console.log('Saved locally: slow_story_audio.mp3');

  // Įkelti į Supabase
  const timestamp = Date.now();
  const audioPath = `pregenerated/${timestamp}_meskiuko_sapnas_slow.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(audioPath);
  console.log(`\nUploaded to: ${urlData.publicUrl}`);

  console.log('\n=== UPDATE DATABASE ===');
  console.log('Run this SQL to update the story:');
  console.log(`
UPDATE pregenerated_stories
SET
  audio_url = '${urlData.publicUrl}',
  content = '${STORY_CONTENT.replace(/'/g, "''")}'
WHERE id = '0b4d8633-dc02-4034-a26b-2f40f66cb25c';
  `);
}

main().catch(console.error);
