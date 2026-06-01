import 'dotenv/config';

async function main() {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY as string }
  });
  const data = await res.json() as any;
  console.log('Available voices:\n');
  data.voices.forEach((v: any) => {
    const labels = v.labels || {};
    console.log(`${v.name} | ${v.voice_id}`);
    console.log(`  Labels: ${Object.entries(labels).map(([k,v]) => `${k}:${v}`).join(', ')}`);
    console.log('');
  });
}
main();
