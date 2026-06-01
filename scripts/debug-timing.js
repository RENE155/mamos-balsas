const content = `[in lithuanian language] [softly] Mažas baltas zuikutis Puškis gyveno po dideliu krūmu. Jis turėjo minkštas ausytes ir rožinę nosiukę.

...

[warmly] Vieną dieną Puškis išėjo pasivaikščioti. Jis šokinėjo per pievas ir uostė gėlytes.

...

[excited] Staiga jis pamatė mažą voveriukę! Ji sėdėjo ant akmens ir verkė. [playfully] "Kodėl tu liūdna?" - paklausė Puškis.

...

[whispers] "Aš pamečiau savo riešutą," - tyliai pasakė voveriukė. [warmly] "Aš padėsiu tau!" - nusprendė Puškis.

...

[excited] Jie ieškojo kartu. Po lapais, po akmenimis, po krūmais. [giggles] "Radau!" - sušuko Puškis. Riešutas gulėjo po gėlyte!

...

[warmly] Voveriukė apsidžiaugė. "Ačiū, Puški! Tu esi geras draugas." Jie abu nusišypsojo ir kartu žaidė iki vakaro.

...

[softly] Kai saulė nuėjo miegoti, Puškis grįžo namo. [yawns] Jis užmigo galvodamas apie savo naują draugę. [whispers] Geros nakties, mažyli. Saldžių sapnų. Labanakt.`;

// Skaidoma pagal „..." skirtukus
const rawParagraphs = content
  .split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
  .map(p => p.trim())
  .filter(p => p.length > 10 && !p.match(/^[\.\s]+$/));

console.log('=== RAW PARAGRAPHS ===');
console.log('Count:', rawParagraphs.length);
rawParagraphs.forEach((p, i) => {
  console.log(`\n${i}: (${p.length} chars)`);
  console.log(p.substring(0, 70) + '...');
});

// Dabartinis skaičiavimas su PAUSE_CHARS = 150
const PAUSE_CHARS = 150;
const charCounts = rawParagraphs.map((p, i) => {
  return p.length + (i < rawParagraphs.length - 1 ? PAUSE_CHARS : 0);
});
const totalChars = charCounts.reduce((sum, c) => sum + c, 0);

console.log('\n=== CURRENT TIMING (PAUSE_CHARS=150) ===');
console.log('Total chars (with pauses):', totalChars);

let cumulative = 0;
const DURATION_SEC = 79;

charCounts.forEach((count, i) => {
  cumulative += count;
  const threshold = cumulative / totalChars;
  console.log(`Para ${i}: ends at ${(threshold * 100).toFixed(1)}% = ${(threshold * DURATION_SEC).toFixed(1)}s`);
});

// Tolygus paskirstymas
console.log('\n=== EQUAL DISTRIBUTION ===');
for (let i = 0; i < 7; i++) {
  console.log(`Para ${i}: ends at ${((i+1)/7 * 100).toFixed(1)}% = ${((i+1)/7 * DURATION_SEC).toFixed(1)}s`);
}

// Realistiškiau: ElevenLabs 0.7 greičiu ≈ 12 simbolių/sek., pauzė ≈ 1.5 sek.
console.log('\n=== REALISTIC ESTIMATION (12 chars/sec, 1.5s pause) ===');
const CHARS_PER_SEC = 12;
const PAUSE_SEC = 1.5;

// Pašalinami žymenys, kad gautume faktinį ištariamo teksto ilgį
const stripTags = (text) => text.replace(/\[[\w\s]+\]/g, '').trim();
const spokenLengths = rawParagraphs.map(p => stripTags(p).length);

let totalTime = 0;
const times = spokenLengths.map((len, i) => {
  const speakTime = len / CHARS_PER_SEC;
  const pause = i < spokenLengths.length - 1 ? PAUSE_SEC : 0;
  totalTime += speakTime + pause;
  return totalTime;
});

console.log('Estimated total time:', totalTime.toFixed(1), 's (actual: 79s)');
const scale = DURATION_SEC / totalTime;

console.log('Scale factor:', scale.toFixed(2));
times.forEach((t, i) => {
  const scaled = t * scale;
  console.log(`Para ${i}: ends at ${(scaled / DURATION_SEC * 100).toFixed(1)}% = ${scaled.toFixed(1)}s`);
});
