/**
 * Sugeneruoti 3 iš anksto paruoštas pasakas skirtingoms amžiaus grupėms su skirtingais moteriškais balsais
 *
 * 1. 0-2 metai (Lopšinė) - AImee (ASMR šnabždesys)
 * 2. 3-5 metai (Paprasta) - Natasha (Šnabždantis ASMR)
 * 3. 5-7 metai (Nuotykis) - Lily (Aksominė aktorė)
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

const TEMP_DIR = '/tmp/stories-gen';

// ═══════════════════════════════════════════════════════════════════════════
// PASAKŲ APIBRĖŽIMAI
// ═══════════════════════════════════════════════════════════════════════════

const STORIES = [
  {
    id: 'lullaby',
    title: 'Žvaigždučių Lopšinė',
    target_age: 1, // 0-2 metai
    theme: 'dreams',
    image_style: 'dreamy',
    pause_seconds: 4.0, // Ilgesnės pauzės kūdikiams
    voice: { id: 'GL7nHO5mDrxcHlJPJK5T', name: 'AImee', speed: 0.7 },
    art_style: 'Soft pastel watercolor for babies, very simple shapes, gentle muted colors (lavender, soft blue, pale pink), dreamy night scene, large cute sleeping animals, extremely calming',
    content: `[in lithuanian language] [softly] Mėnulis šviečia aukštai danguje.
Žvaigždutės mirksi tyliai: mik-mik-mik.
Viskas ramu, viskas tylu.

...

[whispers] Meškiukas miega savo minkštoje lovytėje.
Jis sapnuoja medų ir gėles.
Šššš... šššš... tyliai.

...

[softly] Katytė miega ant pagalvėlės.
Jos kailiukas minkštas ir šiltas.
Purr-purr-purr... miau-miau...

...

[yawns] Šššš, šššš, mažyli.
Bum-bum, bum-bum - širdelė plaka.
Mama šalia, viskas gerai.

...

[whispers] Zuikutis miega po krūmeliu.
Paukšteliai miega lizdelyje.
Visi visi miega jau.

...

[softly] Antklodėlė šilta ir minkšta.
Pagalvėlė po galvyte.
Saugu, šilta, gera čia.

...

[yawns] Miegok, miegok, mažyli.
Miegok, miegok, sapnuok gražiai.
Šššš... šššš...

...

[whispers] Akutės užsimerkia tyliai.
Žvaigždutės saugo tave.
Labanakt, mažyli. Labanakt.`,
    scenes: [
      { text: 'Mėnulis ir žvaigždutės', desc: 'Glowing moon with gentle smile, twinkling stars, deep purple-blue sky' },
      { text: 'Meškiukas miega', desc: 'Cute sleeping teddy bear in cozy bed, peaceful expression' },
      { text: 'Katytė miega', desc: 'Adorable sleeping kitten on fluffy pillow, soft fur' },
      { text: 'Mama šalia', desc: 'Gentle mother silhouette near baby, warm glow, hearts' },
      { text: 'Zuikutis ir paukšteliai', desc: 'Bunny under bush, birds in nest, moonlight' },
      { text: 'Šilta lovytė', desc: 'Cozy bed with soft blanket, warm atmosphere' },
      { text: 'Miegok mažyli', desc: 'Baby peacefully sleeping, soft sparkles' },
      { text: 'Labanakt', desc: 'Sleeping baby under blanket, moonlight, good night feeling' },
    ],
  },
  {
    id: 'simple',
    title: 'Katytė Muri ir Mėnulis',
    target_age: 4, // 3-5 metai
    theme: 'animals',
    image_style: 'watercolor',
    pause_seconds: 3.0,
    voice: { id: 'j05EIz3iI3JmBTWC3CsA', name: 'Natasha', speed: 0.75 },
    art_style: 'Soft watercolor illustration for children, warm colors, friendly animals, cozy atmosphere, simple backgrounds, storybook style',
    content: `[in lithuanian language] [warmly] Katytė Muri turėjo baltą kailiuką ir mėlynas akutes.
Ji gyveno jaukiuose nameliuose su savo mama.
Kiekvieną vakarą Muri žiūrėdavo pro langą į žvaigždes.

...

[softly] Vieną vakarą mėnulis šypsojosi ypatingai šviesiai.
"Labas, Muri!" - tarė mėnulis.
"Labas, mėnuli!" - nustebo katytė.

...

[gently] "Ar nori pamatyti, kaip miega debesėliai?" - paklausė mėnulis.
Muri linktelėjo galvyte.
Ir staiga ji pakilo į dangų!

...

[excited] Debesėliai buvo tokie minkšti ir pūkuoti!
Muri šokinėjo nuo vieno debesėlio ant kito.
"Tai taip smagu!" - džiaugėsi katytė.

...

[softly] Bet greitai Muri pavargo ir atsisėdo ant rožinio debesėlio.
Debesėlis buvo šiltas kaip pagalvėlė.
Muri užsimerkė ir pradėjo murkti.

...

[whispers] "Miegokit, mažoji katyte," - tyliai tarė mėnulis.
Žvaigždutės uždainavo tylią lopšinę.
Muri sapnavo nuostabius sapnus.

...

[yawns] Kai Muri pabudo, ji gulėjo savo lovytėje.
Pro langą švietė mėnulis ir mirktelėjo.
"Labanakt, mėnuli," - šyptelėjo Muri ir užmigo.`,
    scenes: [
      { text: 'Katytė Muri žiūri pro langą', desc: 'Cute white kitten with blue eyes looking through window at stars, cozy room' },
      { text: 'Mėnulis kalba su Muri', desc: 'Smiling moon talking to white kitten, magical night scene' },
      { text: 'Muri kyla į dangų', desc: 'White kitten floating up to the sky, magical sparkles, moon smiling' },
      { text: 'Muri šokinėja ant debesėlių', desc: 'Happy kitten jumping on fluffy pink and white clouds, playful scene' },
      { text: 'Muri ant rožinio debesėlio', desc: 'Sleepy kitten resting on soft pink cloud, peaceful' },
      { text: 'Žvaigždutės dainuoja', desc: 'Sleeping kitten surrounded by singing stars, dreamy atmosphere' },
      { text: 'Muri savo lovytėje', desc: 'Kitten sleeping in cozy bed, moon shining through window, peaceful ending' },
    ],
  },
  {
    id: 'adventure',
    title: 'Drąsioji Pelėdžiukė Ūla',
    target_age: 6, // 5-7 metai
    theme: 'animals',
    image_style: 'storybook',
    pause_seconds: 2.5,
    voice: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', speed: 0.8 },
    art_style: 'Enchanting storybook illustration, rich warm colors, magical forest, detailed but child-friendly, whimsical atmosphere',
    content: `[in lithuanian language] [warmly] Giliai senajame miške gyveno maža pelėdžiukė, vardu Ūla.
Ji turėjo dideles aukso spalvos akis ir minkščiausias plunksnas visame miške.
Ūla buvo labai smalsi ir mėgo tyrinėti apylinkes.

...

[storytelling] Vieną vakarą Ūla išgirdo keistą garsą - kažkas verkė!
"Kas čia?" - pagalvojo pelėdžiukė ir nuskraidė pasižiūrėti.
Po senu ąžuolu sėdėjo mažas šviečiantis jonvabalėlis.

...

[softly] "Kodėl verki, mažasis?" - švelniai paklausė Ūla.
"Aš pasiklydau ir negaliu rasti savo šeimos," - liūdnai atsakė jonvabalėlis.
"Nesijaudink! Aš tau padėsiu!" - drąsiai tarė pelėdžiukė.

...

[excited] Ūla pakėlė jonvabalėlį ant savo nugaros.
"Laikykis stipriai!" - sušuko ji ir pakilo į dangų.
Iš aukštai visas miškas atrodė kaip žalias kilimas.

...

[storytelling] "Žiūrėk! Ar matai kitus šviečiančius taškus?" - paklausė Ūla.
Jonvabalėlis apsidairė ir staiga sušuko: "Taip! Ten, prie upelio!"
Ūla nėrė žemyn pro medžių viršūnes.

...

[warmly] Prie upelio švietė daugybė mažų švieselių - tai buvo jonvabalėlio šeima!
"Mama! Tėti!" - džiaugsmingai sušuko mažylis.
Visi jonvabalėliai mirksėjo iš laimės.

...

[gently] "Ačiū tau, drąsioji pelėde!" - tarė jonvabalėlio mama.
"Tu tikra miško didvyrė!"
Ūla nusišypsojo - padėti kitiems buvo pats geriausias jausmas.

...

[softly] Kai Ūla grįžo namo, mėnulis jau buvo aukštai danguje.
Ji įsitaisė savo lizdelyje ir užmerkė akis.
Jonvabalėlių šviesos dar mirksėjo tolumoje.

...

[whispers] "Labanakt, miške," - tyliai suūlavo Ūla.
"Labanakt, jonvabalėliai."
Ir mažoji drąsioji pelėdžiukė užmigo, sapnuodama naujus nuotykius.`,
    scenes: [
      { text: 'Pelėdžiukė Ūla', desc: 'Cute baby owl with big golden eyes sitting in magical forest at night' },
      { text: 'Ūla girdi verksmą', desc: 'Curious owl flying through forest, mysterious glowing light below' },
      { text: 'Verkiantis jonvabalėlis', desc: 'Small glowing firefly crying under old oak tree, owl watching kindly' },
      { text: 'Ūla neša jonvabalėlį', desc: 'Baby owl flying with tiny firefly on her back, magical night sky' },
      { text: 'Skrydis virš miško', desc: 'Owl and firefly flying high above forest, seeing glowing lights near stream' },
      { text: 'Jonvabalėlių šeima', desc: 'Happy reunion of fireflies by stream, owl watching, many glowing lights' },
      { text: 'Padėka Ūlai', desc: 'Fireflies surrounding owl gratefully, magical glowing scene' },
      { text: 'Ūla grįžta namo', desc: 'Owl flying home under full moon, fireflies glowing in distance' },
      { text: 'Labanakt', desc: 'Owl sleeping peacefully in cozy nest, firefly lights twinkling far away' },
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
    prompt: `${artStyle}\n\nSCENE: ${scene.desc}\n\nIMPORTANT: Child-friendly, no text, high quality.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
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
  console.log(` Voice: ${story.voice.name} | Pause: ${story.pause_seconds}s`);
  console.log('═'.repeat(60));

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
    console.log(`${duration.toFixed(1)}s`);
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

  // Apskaičiuoti pabaigos laikus
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
  await supabase.storage.from('audio').upload(audioStoragePath, fs.readFileSync(finalAudioPath), { contentType: 'audio/mpeg' });
  const audioUrl = supabase.storage.from('audio').getPublicUrl(audioStoragePath).data.publicUrl;
  console.log(`  ✅ ${audioUrl}`);

  // 4. Sugeneruoti ir įkelti paveikslėlius
  console.log(`\n[4/4] Generating ${story.scenes.length} images...`);
  const imageUrls: { url: string; index: number; text: string }[] = [];

  for (let i = 0; i < story.scenes.length; i++) {
    try {
      process.stdout.write(`  [${i + 1}/${story.scenes.length}] ${story.scenes[i].text}... `);
      const base64 = await generateImage(story.art_style, story.scenes[i]);
      const imgPath = `pregenerated/${story.id}_${timestamp}_${i}.png`;
      await supabase.storage.from('story-images').upload(imgPath, Buffer.from(base64, 'base64'), { contentType: 'image/png' });
      const url = supabase.storage.from('story-images').getPublicUrl(imgPath).data.publicUrl;
      imageUrls.push({ url, index: i, text: story.scenes[i].text });
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
      title: story.title,
      content: story.content,
      theme: story.theme,
      target_age: story.target_age,
      duration_seconds: Math.round(totalDuration),
      audio_url: audioUrl,
      thumbnail_url: imageUrls[0]?.url || '',
      image_style: story.image_style,
      voice_id: story.voice.id,
      voice_name: story.voice.name,
      is_active: true,
      sort_order: story.target_age,
      paragraph_end_times: paragraphEndTimes,
    })
    .select('id')
    .single();

  if (storyError) {
    console.error('  ❌ Story insert error:', storyError);
    return;
  }

  const storyId = storyData.id;
  console.log(`  ✅ Story ID: ${storyId}`);

  // Įterpti paveikslėlius
  for (const img of imageUrls) {
    await supabase.from('pregenerated_story_images').insert({
      story_id: storyId,
      image_url: img.url,
      scene_index: img.index,
      scene_text: img.text,
    });
  }
  console.log(`  ✅ ${imageUrls.length} images inserted`);

  console.log(`\n✅ ${story.title} complete!`);
  console.log(`   Duration: ${(totalDuration / 60).toFixed(1)} min | Images: ${imageUrls.length} | Age: ${story.target_age}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGRINDINĖ FUNKCIJA
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' GENERATING 3 STORIES FOR DIFFERENT AGE GROUPS');
  console.log('═══════════════════════════════════════════════════════════════');

  // Patikrinti ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('❌ ffmpeg not found! Install: brew install ffmpeg');
    process.exit(1);
  }

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  for (const story of STORIES) {
    await generateStory(story);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(' ALL DONE!');
  console.log('═'.repeat(60));
  console.log('\nGenerated stories:');
  STORIES.forEach((s) => {
    console.log(`  • ${s.title} (age ${s.target_age}) - Voice: ${s.voice.name}`);
  });
}

main().catch(console.error);
