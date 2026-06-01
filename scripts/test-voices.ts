import 'dotenv/config';
import * as fs from 'fs';

const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

// Geriausi balsai pasakojimui/skaitymui iš ElevenLabs paruoštų balsų
const storytellingVoices = [
  // Moteriški balsai - šilti, raminantys
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'default female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'soft female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'warm female' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'youthful female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'gentle female' },
  // Vyriški balsai - ramūs, skaitymui
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'warm British male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'deep male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'authoritative male' },
];

// Lietuviškas miego pasakos bandomasis tekstas su ElevenLabs v3 garso žymėmis
const testTexts = [
  {
    name: 'story_intro',
    text: `[in lithuanian language] [softly] Seniai seniai, gražiame miške gyveno mažas meškiukas, vardu Rudis. [yawns] Jis labai mėgo žiūrėti į žvaigždes prieš miegą.`,
  },
  {
    name: 'story_middle',
    text: `[in lithuanian language] [whispers] Vieną vakarą, mažasis meškiukas rado sidabrinę plunksnelę. [excited] "Oi, kokia graži!" - sušuko jis.`,
  },
  {
    name: 'story_ending',
    text: `[in lithuanian language] [softly] Ir taip, mažasis meškiukas užmigo po didžiuoju ąžuolu, sapnuodamas apie naujas nuotykius. [whispers] Labanakt, mažyli.`,
  },
];

async function getVoiceDetails(id: string) {
  const r = await fetch('https://api.elevenlabs.io/v1/voices/' + id, {
    headers: { 'xi-api-key': apiKey },
  });
  return r.json();
}

async function testVoice(
  voiceId: string,
  voiceName: string,
  text: string,
  textName: string
): Promise<boolean> {
  console.log(`  Testing ${textName}...`);

  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3', // Naujausias modelis su geriausiu daugiakalbiu palaikymu
      voice_settings: {
        stability: 0.5, // Natūralus režimas - leidžia daugiau raiškumo
        similarity_boost: 0.75,
        speed: 0.85, // Lėtesnis tempas miego pasakoms
      },
    }),
  });

  if (!r.ok) {
    const err = await r.json();
    console.log(`    ❌ Error: ${err.detail?.message || 'Failed'}`);
    return false;
  }

  const buf = await r.arrayBuffer();
  const filename = `voice_test/${voiceName.toLowerCase()}_${textName}.mp3`;
  fs.writeFileSync(filename, Buffer.from(buf));
  console.log(`    ✅ Saved: ${filename}`);
  return true;
}

async function main() {
  // Sukurti išvesties katalogą
  if (!fs.existsSync('voice_test')) {
    fs.mkdirSync('voice_test');
  }

  console.log('=== ElevenLabs v3 Voice Test for Lithuanian Storytelling ===\n');

  // Išbandyti tik pirmą tekstą su visais balsais pirminiam palyginimui
  const quickTest = process.argv.includes('--quick');
  const fullTest = process.argv.includes('--full');
  const singleVoice = process.argv.find((arg) => arg.startsWith('--voice='));

  if (singleVoice) {
    // Išbandyti vieną balsą su visais tekstais
    const voiceName = singleVoice.split('=')[1];
    const voice = storytellingVoices.find(
      (v) => v.name.toLowerCase() === voiceName.toLowerCase()
    );
    if (!voice) {
      console.log(`Voice "${voiceName}" not found. Available voices:`);
      storytellingVoices.forEach((v) => console.log(`  - ${v.name}`));
      return;
    }

    console.log(`Testing voice: ${voice.name} (${voice.description})\n`);
    const details = await getVoiceDetails(voice.id);
    console.log('Labels:', JSON.stringify(details.labels || {}));
    console.log('');

    for (const txt of testTexts) {
      await testVoice(voice.id, voice.name, txt.text, txt.name);
    }
  } else if (quickTest) {
    // Greitas testas: pirmas tekstas su visais balsais
    console.log('Quick test mode: testing all voices with intro text\n');
    const testText = testTexts[0];

    for (const voice of storytellingVoices) {
      console.log(`\n${voice.name} (${voice.description}):`);
      await testVoice(voice.id, voice.name, testText.text, testText.name);
    }
  } else if (fullTest) {
    // Pilnas testas: visi tekstai su visais balsais
    console.log('Full test mode: testing all voices with all texts\n');

    for (const voice of storytellingVoices) {
      console.log(`\n${voice.name} (${voice.description}):`);
      const details = await getVoiceDetails(voice.id);
      console.log('  Labels:', JSON.stringify(details.labels || {}));

      for (const txt of testTexts) {
        await testVoice(voice.id, voice.name, txt.text, txt.name);
      }
    }
  } else {
    // Numatytasis: išbandyti 3 geriausius balsus (rekomenduojama miego pasakoms)
    const recommendedVoices = [
      storytellingVoices.find((v) => v.name === 'Sarah')!,
      storytellingVoices.find((v) => v.name === 'Matilda')!,
      storytellingVoices.find((v) => v.name === 'Charlotte')!,
    ];

    console.log('Testing recommended voices for bedtime stories:\n');

    for (const voice of recommendedVoices) {
      console.log(`\n${voice.name} (${voice.description}):`);
      for (const txt of testTexts) {
        await testVoice(voice.id, voice.name, txt.text, txt.name);
      }
    }

    console.log('\n\nUsage:');
    console.log('  npx ts-node scripts/test-voices.ts           # Test top 3 recommended voices');
    console.log('  npx ts-node scripts/test-voices.ts --quick   # Quick test all voices');
    console.log('  npx ts-node scripts/test-voices.ts --full    # Full test all voices');
    console.log('  npx ts-node scripts/test-voices.ts --voice=Sarah  # Test specific voice');
  }

  console.log('\n✅ Done! Check the voice_test/ folder for audio files.');
}

main().catch(console.error);
