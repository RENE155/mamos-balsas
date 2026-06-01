import 'dotenv/config';
import * as fs from 'fs';

const elevenLabsApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY!;

const STORY_CONTENT = `[in lithuanian language] [softly] Seniai seniai, giliai giliai miške gyveno mažas meškiukas, vardu Rudis.

[warmly] Rudis turėjo švelnų rudą kailį ir mažas apvalias ausytes. Jis labai mėgo vaikščioti po mišką ir rinkti avietes.

[excited] Vieną gražų rytą, Rudis rado sidabrinę plunksnelę! "Oi, kokia graži!" - sušuko jis.

[whispers] Plunksnelė atvedė jį į slaptą aikštelę, kur gyveno draugiškas pelėdžiukas.

[cheerfully] Pelėdžiukas pasakė: "Aš esu Ūkas. Nori būti mano draugas?"

[warmly] Rudis nusišypsojo ir tarė: "Taip! Draugai amžinai!"

[softly] [yawns] Ir taip Rudis rado naują geriausią draugą. Labanakt, mažyli. Gražių sapnų apie nuotykius miške.`;

async function main() {
  console.log('Character count:', STORY_CONTENT.length);
  console.log('Generating audio with ElevenLabs v3...');

  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
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
        speed: 0.85,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('ElevenLabs error:', error);
    process.exit(1);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log('Audio generated! Size:', arrayBuffer.byteLength, 'bytes');

  // Išsaugoti į failą
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync('test-story.mp3', buffer);
  console.log('Saved to: test-story.mp3');
  console.log('\n✅ Done! Check your ElevenLabs dashboard for credit usage.');
}

main().catch(console.error);
