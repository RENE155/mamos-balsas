/**
 * Išbandyti DI lopšinių generavimą 0-2 metų vaikams
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

// Lopšinės formatas 0-2 metų vaikams (atnaujinta - daugiau skaidrių, ilgesnė trukmė!)
const LULLABY_FORMAT = {
  maxCompletionTokens: 900,
  structurePrompt: `FORMATAS: LOPŠINĖ (0-2 metai)

TAI NE PASAKA - tai ilga, raminanti lopšinė! Trukmė: 3-4 minutės. SVARBU: kiekvienas posmas turi būti ilgesnis!

STRUKTŪRA:
- Sukurk 7-9 posmus (kiekvienas posmas = 1 paveikslėlis)
- Kiekvienas posmas: 3-4 sakiniai (ilgesni posmai!)
- Tarp posmų: ...
- DAUG kartojimo - tas pats posmas gali kartotis!
- Bendras žodžių skaičius: ~300 žodžių

PRIVALOMA NAUDOTI:
- Garsų žodžius: šššš, bum-bum, miau-miau, mu-ū, čyru-vyru, tik-tak
- Kartoti frazes DAUG: "Miegok, miegok...", "Tyliai, tyliai...", "Šššš, šššš..."
- Rimuoti kur įmanoma
- Paprastus žodžius: mėnulis, žvaigždė, mama, meškiukas, lovytė

DRAUDŽIAMA:
- Joks siužetas ar veiksmas
- Joks konfliktas
- Jokie klausimai
- Nauji/sudėtingi žodžiai

STRUKTŪROS PAVYZDYS (7-9 posmai):
1) Vakaras ateina (mėnulis, žvaigždės)
2) Pirmas gyvūnėlis miega (meškiukas)
3) Antras gyvūnėlis miega (katytė)
4) Raminantys garsai (šššš, bum-bum)
5) Trečias gyvūnėlis miega (zuikutis)
6) Šilta ir saugu (mama, lovytė)
7) Kartojasi uspavimo eilutės
8) Dar kartą raminantys garsai
9) Labanakt (labai švelniai)

AUDIO ŽYMĖS:
- VISUR naudok [softly] ir [whispers]
- [yawns] kelis kartus
- Pabaigoje: [whispers] Labanakt

PAVYZDYS:
"[softly] Mėnulis šviečia aukštai danguje.
Žvaigždutės mirksi: mik-mik-mik.
Viskas ramu, viskas tylu.

...

[whispers] Meškiukas miega savo lovytėje.
Katytė miega: purr-purr-purr.
Ir šuniukas miega: šššš...

...

[softly] Šššš, šššš, mažyli.
Bum-bum, bum-bum - širdelė plaka.
Mama šalia, viskas gerai.

...

[yawns] Miegok, miegok, mažyli.
Miegok, miegok, sapnuok gražiai.
Šššš... šššš...

...

[whispers] Žvaigždutės saugo tave.
Mėnulis šviečia švelniai.
Labanakt, mažyli. Labanakt."`
};

const THEME = {
  id: 'animals',
  name_lt: 'Gyvūnai',
  prompt_hint: 'Istorija su gyvūnais kaip pagrindiniais veikėjais'
};

async function main() {
  const age = 1;

  console.log('🌙 Testing Lullaby Generation for 0-2 year olds\n');

  const systemPrompt = `Tu esi vaikų pasakų rašytojas lietuvių kalba. Pasakos bus skaitomos balsu su ElevenLabs v3.

GRIEŽTOS TAISYKLĖS:
1. Rašyk TIK lietuvių kalba
2. Pasaka turi būti tinkama ${age} metų vaikui
3. DRAUDŽIAMA: smurtas, baimę keliantis turinys, Disnėjaus personažai
4. Istorija turi baigtis ramiai, vaikui ruošiantis miegoti
5. Sukurk įsimintinus personažus su aiškiais vizualiniais bruožais

${LULLABY_FORMAT.structurePrompt}`;

  const userPrompt = `Sukurk miego pasaką.

VAIKO AMŽIUS: ${age} metai

TEMA: ${THEME.name_lt}
UŽUOMINA: ${THEME.prompt_hint}

Pradėk pasaką tiesiogiai, be pavadinimo.`;

  console.log('⏳ Generating lullaby...\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_completion_tokens: LULLABY_FORMAT.maxCompletionTokens,
    temperature: 0.85,
  });

  const content = completion.choices[0].message.content || '';

  // Sugeneruoti pavadinimą
  const titleCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Sugalvok trumpą (2-4 žodžių) pavadinimą šiai lopšinei lietuvių kalba. Atsakyk TIK pavadinimu.' },
      { role: 'user', content: content.substring(0, 500) },
    ],
    max_completion_tokens: 50,
    temperature: 0.7,
  });

  const title = titleCompletion.choices[0].message.content?.trim() || 'Lopšinė';

  const wordCount = content.split(/\s+/).length;
  const paragraphs = content.split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
    .map(p => p.trim())
    .filter(p => p.length > 10);

  console.log('✅ Generated!\n');
  console.log('📖 Title:', title);
  console.log('📊 Words:', wordCount, '(target: 280-400 for 3-4 min)');
  console.log('📄 Paragraphs/Verses:', paragraphs.length, '(target: 7-9)');
  console.log('⏱️  Est. duration:', Math.round(wordCount / 80 * 60), 'seconds (~', Math.round(wordCount / 80 * 10) / 10, 'min)');
  console.log('🖼️  Sec per image:', Math.round(wordCount / 80 * 60 / paragraphs.length), 'sec');
  console.log('\n--- CONTENT ---\n');
  console.log(content);
  console.log('\n--- END ---');
}

main().catch(console.error);
