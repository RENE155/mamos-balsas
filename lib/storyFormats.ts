/**
 * Pagal amžių pritaikyta pasakos formato konfigūracija
 * Susieja UI amžiaus grupes su konkrečiais pasakų formatais, turinčiais tinkamą struktūrą,
 * ilgį ir turinio gaires, paremtas vaiko raidos tyrimais.
 *
 * Trukmės tikslai (esant 0.7 greičiui = ~80-100 žodžių/min):
 * - Visos pasakos: mažiausiai 2-3 minutės
 * - Vyresniems vaikams: iki 5 minučių
 */

export type StoryFormatType = 'lullaby' | 'toddler' | 'simple' | 'adventure' | 'rich' | 'chapter';

export interface VoiceConfig {
  id: string;
  name: string;
  speed: number;
}

export interface StoryFormat {
  type: StoryFormatType;
  paragraphRange: { min: number; max: number };
  wordRange: { min: number; max: number };
  imageRange: { min: number; max: number };
  sentencesPerParagraph: { min: number; max: number };
  maxCompletionTokens: number;
  structurePrompt: string; // Lietuviška užklausa pasakos struktūrai
  audioTags: string[];
  voice: VoiceConfig;
}

// Balsų konfigūracijos - moteriški balsai, optimizuoti kiekvienai amžiaus grupei
export const VOICES = {
  aimee: { id: 'GL7nHO5mDrxcHlJPJK5T', name: 'AImee', speed: 0.7 },      // ASMR šnabždesys - ramus, lėtas
  natasha: { id: 'j05EIz3iI3JmBTWC3CsA', name: 'Natasha', speed: 0.75 }, // Šnabždantis ASMR
  lily: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', speed: 0.8 },        // Aksominė aktorė
  sarah: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', speed: 0.85 },     // Pradinis numatytasis
};

/**
 * Gauti balso konfigūraciją konkrečiam amžiui
 */
export function getVoiceForAge(age: number): VoiceConfig {
  if (age <= 2) return VOICES.aimee;    // 0-3 m.: ASMR šnabždesys (lėčiausias, ramiausias)
  if (age <= 4) return VOICES.natasha;  // 3-5 m.: Šnabždantis ASMR
  if (age <= 7) return VOICES.lily;     // 5-7 m.: Aksominis pasakotojas
  return VOICES.sarah;                   // 8+ m.: Aiškus, įtraukiantis
}

/**
 * Gauti tinkamą pasakos formatą pagal vaiko amžių
 * UI amžiaus reikšmės: 1 (0-2 m.), 2 (2-3 m.), 4 (3-5 m.), 6 (5-7 m.), 8 (7-10 m.), 11 (10-12 m.)
 */
export function getStoryFormat(age: number): StoryFormat {
  if (age <= 1) return STORY_FORMATS.lullaby;      // 0-2 m. (UI amžius=1)
  if (age <= 2) return STORY_FORMATS.toddler;      // 2-3 m. (UI amžius=2)
  if (age <= 4) return STORY_FORMATS.simple;       // 3-5 m. (UI amžius=4)
  if (age <= 6) return STORY_FORMATS.adventure;    // 5-7 m. (UI amžius=6)
  if (age <= 10) return STORY_FORMATS.rich;        // 7-10 m. (UI amžius=8)
  return STORY_FORMATS.chapter;                     // 10-12 m. (UI amžius=11)
}

export const STORY_FORMATS: Record<StoryFormatType, StoryFormat> = {
  /**
   * LOPŠINĖ (0-2 metai)
   * Vien raminantys garsai ir ritmas - NE pasaka.
   * Dėmesys: garsų pamėgdžiojimas, gausus kartojimas, tėvų balsas, jaukumas.
   * Trukmė: 2-3 minutės (200-300 žodžių su kartojimu)
   */
  lullaby: {
    type: 'lullaby',
    paragraphRange: { min: 7, max: 9 },
    wordRange: { min: 280, max: 400 },  // 3-4 min lėtu tempu
    imageRange: { min: 7, max: 9 },
    sentencesPerParagraph: { min: 3, max: 4 },  // daugiau sakinių viename posme
    maxCompletionTokens: 900,
    audioTags: ['[softly]', '[whispers]', '[yawns]'],
    voice: VOICES.aimee, // ASMR šnabždesys - lėčiausias, ramiausias
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
  },

  /**
   * MAŽYLIS (2-3 metai)
   * Labai paprasta pasaka su pažįstamais daiktais ir rutina.
   * Dėmesys: atpažinimas, jaukumas, nuspėjamas šablonas.
   * Trukmė: 2-3 minutės (200-350 žodžių)
   */
  toddler: {
    type: 'toddler',
    paragraphRange: { min: 6, max: 8 },
    wordRange: { min: 220, max: 380 },
    imageRange: { min: 6, max: 8 },
    sentencesPerParagraph: { min: 2, max: 3 },
    maxCompletionTokens: 900,
    audioTags: ['[softly]', '[whispers]', '[warmly]', '[yawns]'],
    voice: VOICES.aimee, // ASMR ir mažyliams
    structurePrompt: `FORMATAS: MAŽYLIO PASAKA (2-3 metai)

Labai paprasta pasaka su pažįstamais dalykais. Trukmė: 2-3 minutės.

STRUKTŪRA:
- Sukurk 6-8 trumpas pastraipas (daugiau paveikslėlių!)
- Kiekviena pastraipa: 2-3 sakiniai, max 10 žodžių sakinyje
- Tarp pastraipų: ...

VEIKĖJAI:
- VIENAS mažas gyvūnėlis (meškiukas, zuikutis, katytė)
- Gali būti mama/tėtis

TURINYS - PAŽĮSTAMI DALYKAI:
- Vakaro rutina: valgymas, maudymasis, persirengimas
- Pažįstami daiktai: lovytė, antklodė, žvaigždės, mėnulis
- Šeima: mama, tėtis, namai
- Paprastos emocijos: laimingas, mieguistas, šilta

STRUKTŪROS PLANAS (6-8 pastraipos):
1) Kas tai? (mažas gyvūnėlis)
2) Kur gyvena? (jaukus namelis)
3) Vakaro veikla (valgymas)
4) Dar viena veikla (maudymasis)
5) Ruošiasi miegoti (pižama)
6) Lovytė ir antklodė
7) Mama/tėtis sako labanakt
8) Saldžių sapnų

KARTOJIMAS:
- Naudok pasikartojančias frazes
- "Ir tada...", "O paskui..."

AUDIO ŽYMĖS:
- Pradėk su [softly]
- Viduryje: [warmly]
- Pabaigoje: [yawns], [whispers]`
  },

  /**
   * PAPRASTA (3-5 metai)
   * Paprasta pasaka su vienu pagrindiniu veikėju ir švelniu nuotykiu.
   * Dėmesys: smalsumas, atradimas, draugystė, jaukumas.
   * Trukmė: 3-4 minutės (300-450 žodžių)
   */
  simple: {
    type: 'simple',
    paragraphRange: { min: 5, max: 7 },
    wordRange: { min: 300, max: 450 },
    imageRange: { min: 5, max: 7 },
    sentencesPerParagraph: { min: 2, max: 3 },
    maxCompletionTokens: 1000,
    audioTags: ['[softly]', '[whispers]', '[warmly]', '[excited]', '[yawns]'],
    voice: VOICES.natasha, // Šnabždantis ASMR
    structurePrompt: `FORMATAS: PAPRASTA PASAKA (3-5 metai)

Paprasta pasaka su vienu veikėju ir mažu nuotykiu. Trukmė: 3-4 minutės.

STRUKTŪRA:
- Sukurk 5-7 pastraipas
- Kiekviena pastraipa: 2-3 sakiniai
- Tarp pastraipų: ...

VEIKĖJAI:
- VIENAS pagrindinis veikėjas (gyvūnėlis su vardu)
- Gali sutikti 1 draugą
- Aiškūs vizualiniai bruožai (spalva, dydis)

SIUŽETAS:
- Maža kelionė ar atradimas
- JOKIO konflikto ar problemos
- Viskas baigiasi saugiai ir jaukiai

STRUKTŪROS PLANAS:
1) Veikėjas ir jo namai
2) Kažkas įdomaus (garsas, šviesa, draugas)
3) Mažas nuotykis
4) Gražus atradimas
5) Grįžimas namo
6) Jaukumas ir meilė
7) Miegas

AUDIO ŽYMĖS:
- Pradžia: [softly]
- Atradimas: [excited]
- Draugystė: [warmly]
- Pabaiga: [yawns], [whispers]`
  },

  /**
   * NUOTYKIS (5-7 metai)
   * Švelnus nuotykis su stebuklingais elementais.
   * Dėmesys: atradimas, draugystė, stebuklas, taiki pabaiga.
   * Trukmė: 4-5 minutės (400-550 žodžių)
   */
  adventure: {
    type: 'adventure',
    paragraphRange: { min: 6, max: 8 },
    wordRange: { min: 400, max: 550 },
    imageRange: { min: 6, max: 8 },
    sentencesPerParagraph: { min: 2, max: 4 },
    maxCompletionTokens: 1300,
    audioTags: ['[softly]', '[whispers]', '[excited]', '[warmly]', '[playfully]', '[yawns]'],
    voice: VOICES.lily, // Aksominis pasakotojas
    structurePrompt: `FORMATAS: NUOTYKIS (5-7 metai)

Nuotykių pasaka su magija ir draugais. Trukmė: 4-5 minutės.

STRUKTŪRA:
- Sukurk 6-8 pastraipas
- Kiekviena pastraipa: 2-4 sakiniai
- Tarp pastraipų: ...

VEIKĖJAI:
- Pagrindinis veikėjas su aiškiais vizualiniais bruožais
- 1-2 pagalbiniai veikėjai (draugai, stebuklinga būtybė)

SIUŽETO STRUKTŪRA:
1) Įžanga - kas ir kur gyvena (jaukiai)
2) Kažkas įdomaus nutinka
3) Kelionė/ieškojimas prasideda
4) Sutinka draugą arba pagalbininką
5) Nuostabus atradimas
6) Stebuklingas momentas
7) Grįžimas namo
8) Ramybė ir miegas

GALIMA:
- Dialogai tarp veikėjų
- Maža magija (švytintys dalykai, kalbantys gyvūnai)
- Jausmai: smalsumas, džiaugsmas, šiluma

DRAUDŽIAMA:
- Pavojus ar baimė
- Pikti veikėjai
- Neišspręstos problemos

AUDIO ŽYMĖS:
- Pradžia: [softly]
- Atradimas: [excited]
- Draugystė: [warmly], [playfully]
- Pabaiga: [yawns], [whispers]`
  },

  /**
   * TURTINGA (7-10 metai)
   * Išplėtota pasaka su moralinėmis pamokomis ir emociniu gyliu.
   * Dėmesys: problemų sprendimas gerumu, charakterio augimas.
   * Trukmė: 5-7 minutės (550-750 žodžių)
   */
  rich: {
    type: 'rich',
    paragraphRange: { min: 7, max: 10 },
    wordRange: { min: 550, max: 750 },
    imageRange: { min: 7, max: 10 },
    sentencesPerParagraph: { min: 3, max: 4 },
    maxCompletionTokens: 1800,
    audioTags: ['[softly]', '[whispers]', '[excited]', '[warmly]', '[playfully]', '[giggles]', '[yawns]'],
    voice: VOICES.lily, // Aksominis pasakotojas
    structurePrompt: `FORMATAS: IŠSAMI PASAKA (7-10 metai)

Išsami pasaka su moraline pamoka. Trukmė: 5-7 minutės.

STRUKTŪRA:
- Sukurk 7-10 pastraipų
- Kiekviena pastraipa: 3-4 sakiniai
- Tarp pastraipų: ...

VEIKĖJAI:
- Pagrindinis veikėjas su charakteriu ir noru
- 2-3 pagalbiniai veikėjai
- Veikėjai turi būti aprašyti detaliai (spalva, dydis, apranga)

SIUŽETAS:
- Gali turėti NESUDĖTINGĄ problemą
- Problema sprendžiama GERUMU arba IŠMINTIMI (ne jėga)
- Moralinė pamoka (draugystė, kantrybė, pagalba kitiems)

STRUKTŪROS PLANAS:
1) Veikėjas ir jo pasaulis
2) Noras arba klausimas
3) Sprendimas veikti
4) Kelionė ir iššūkis
5) Pagalba ateina (draugas/magas)
6) Problema išspręsta
7) Ko išmokome
8-9) Grįžimas namo
10) Ramybė ir miegas

ŽODYNAS:
- Gali būti 2-3 nauji/sudėtingesni žodžiai
- Emocijų žodžiai: dėkingas, smalsu, drąsus

AUDIO ŽYMĖS:
- Pilnas spektras, daugiau dramatiškumo
- Bet pabaiga VISADA rami`
  },

  /**
   * SKYRIUS (10-12 metai)
   * Sudėtinga skyriaus tipo pasaka su sudėtingais veikėjais.
   * Dėmesys: nuotykis su rizika, asmeninis augimas, sąmojis.
   * Trukmė: 7-10 minučių (750-1000 žodžių)
   */
  chapter: {
    type: 'chapter',
    paragraphRange: { min: 9, max: 12 },
    wordRange: { min: 750, max: 1000 },
    imageRange: { min: 9, max: 12 },
    sentencesPerParagraph: { min: 4, max: 5 },
    maxCompletionTokens: 2500,
    audioTags: ['[softly]', '[whispers]', '[excited]', '[warmly]', '[playfully]', '[giggles]', '[yawns]'],
    voice: VOICES.sarah, // Aiškus, įtraukiantis vyresniems vaikams
    structurePrompt: `FORMATAS: SKYRIUS (10-12 metai)

Sudėtinga pasaka su įtampa ir charakterių augimu. Trukmė: 7-10 minučių.

STRUKTŪRA:
- Sukurk 9-12 pastraipų (tarsi trumpas skyrius)
- Kiekviena pastraipa: 4-5 sakiniai
- Tarp pastraipų: ...

VEIKĖJAI:
- Protagonistas 10-11 metų (šiek tiek vyresnis nei skaitytojas)
- 3-4 veikėjai su skirtingais charakteriais
- Veikėjai turi trūkumų ir auga

SIUŽETAS - 3 DALYS:

DALIS 1 (3-4 pastraipos):
- Veikėjo pasaulis ir tikslas
- Kažkas keičiasi
- Sprendimas veikti

DALIS 2 (4-5 pastraipos):
- Kelionė ir iššūkiai
- Sutikti sąjungininkai
- Svarbus atradimas arba įgūdis
- Kulminacija - tikra įtampa (bet saugi)

DALIS 3 (3-4 pastraipos):
- Problema išspręsta išmintingai
- Augimas ir pamoka
- Ramus, reflektyvus grįžimas
- Dėkingumas ir miegas

GALIMA:
- Tikra įtampa (bet visada gera pabaiga)
- Humoras ir gudrybės
- Sudėtingesni jausmai
- Netikėti posūkiai

DRAUDŽIAMA:
- Tikras pavojus gyvybei
- Baimę keliantys elementai
- Liūdna pabaiga

PABAIGA:
- Paskutinės 2 pastraipos VISADA ramios
- Baigti su [yawns] ir [whispers] Labanakt`
  }
};
