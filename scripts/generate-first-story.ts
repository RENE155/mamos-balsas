/**
 * Sugeneruoti pirmąją iš anksto paruoštą pasaką su Sarah balsu
 * 3 minutės, skirta 4-6 metų vaikams
 */

import 'dotenv/config';
import * as fs from 'fs';

const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

// Sarah balsas - švelnus moteriškas, puikiai tinkantis pasakoms prieš miegą
const SARAH_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// 3 minučių pasaka 4-6 metų vaikams (~350-400 žodžių lėtu tempu)
const STORY = {
  title: 'Mažojo meškiuko sapnas',
  theme: 'dreams',
  target_age: 5,
  image_style: 'watercolor',
  content: `[in lithuanian language] [softly] Seniai seniai, giliai giliai miške, po didžiuoju šimtamečiu ąžuolu, gyveno mažas meškiukas, vardu Rudis.

[warmly] Rudis turėjo minkštą rudą kailį ir mažas apvalias ausytes. Jo akys buvo tamsios kaip miško uogos, o šypsena - šilta kaip saulės spindulys.

[cheerfully] Kiekvieną dieną Rudis žaisdavo su savo geriausiais draugais - voveryte Rūta ir zuikučiu Balčiu. Jie bėgiodavo po mišką, rinkdavo uogas ir juokdavosi kartu.

[yawns] Bet vieną vakarą, kai saulė jau leidosi už aukštų medžių viršūnių, Rudis pajuto, kad jo kojelės pavargo, o akys pradėjo merktis.

[softly] "Mama, aš noriu gražaus sapno," - tyliai pasakė mažasis meškiukas savo mylimai mamai.

[warmly] Mama meškienė švelniai apkabino Rudį savo didelėmis šiltomis letenomis ir tarė: "Užsimerk, mažyli, ir aš tau papasakosiu nuostabią paslaptį."

[whispers] "Kai užmerki akis, tavo mažoje širdelėje atsiveria stebuklingos auksinės durys. Pro jas gali keliauti bet kur - į pūkuotus debesis, į spindinčias žvaigždes, į gražiausius pasakų miškus."

[softly] Rudis užmerkė akis ir iš karto pajuto, kaip lengvai lengvai pakyla į dangų.

[excited] Jis skrido pro pūkuotus baltuosius debesis! Debesys buvo tokie minkšti - minkštesni už pačią minkščiausią pagalvėlę.

[giggles] "Labas, mažasis meškiuk!" - linksmai sušuko jam draugiškas rožinis debesėlis. "Nori su manimi pažaisti?"

[cheerfully] Rudis ir debesėlis šokinėjo iš debesies į debesį, juokėsi ir dainavo linksmą dainelę. Vėjelis švelniai glostė Rudžio kailį.

[softly] Tada toli toli pasirodė sidabrinė žvaigždutė. Ji švietė taip švelniai ir šiltai, kaip mamos akys.

[whispers] "Aš esu Šviesutė," - prisistatė žvaigždutė. "Aš saugosiu tave visą naktį. Miegok ramiai, mažasis miško drauge."

[warmly] Rudis nusišypsojo plačia šypsena. Jis žinojo, kad yra saugus ir labai labai mylimas.

[softly] Debesėliai švelniai švelniai sūpavo jį, tarsi lopšyje, o žvaigždutės dainavo tylią gražią lopšinę.

... ... ...

[yawns] [whispers] Ir tu, mažasis drauge, dabar gali keliauti į sapnų šalį, kaip Rudis.

[softly] Užmerk savo akeles... Giliai giliai įkvėpk... Ir lėtai lėtai iškvėpk...

[whispers] Įsivaizduok pūkuotus baltuosius debesis... Pajusk, kaip jie švelniai tave sūpuoja...

[softly] Žvaigždutės saugo tave. Mama ir tėtis labai labai tave myli.

[whispers] Tavo lovelė yra šilta ir jauki...

[softly] Labanakt, mažasis sapnų keliautojau. Saldžių saldžių sapnų. Iki ryto...`
};

async function generateAudio(): Promise<void> {
  console.log('=== Generating First Story ===');
  console.log(`Title: ${STORY.title}`);
  console.log(`Voice: Sarah (${SARAH_VOICE_ID})`);
  console.log(`Content length: ${STORY.content.length} chars, ~${STORY.content.split(/\s+/).length} words`);

  console.log('\nGenerating audio with ElevenLabs v3...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SARAH_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: STORY.content,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.8, // Lėčiau miego metui
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs error: ${JSON.stringify(error)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Pirmiausia išsaugoti vietoje
  const filename = 'first_story_sarah.mp3';
  fs.writeFileSync(filename, buffer);

  console.log(`\n✅ Audio saved: ${filename} (${buffer.length} bytes)`);
  console.log('\nStory metadata for database:');
  console.log(JSON.stringify({
    title: STORY.title,
    theme: STORY.theme,
    target_age: STORY.target_age,
    image_style: STORY.image_style,
    voice_id: SARAH_VOICE_ID,
    voice_name: 'Sarah',
  }, null, 2));
}

generateAudio().catch(console.error);
