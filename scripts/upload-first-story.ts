/**
 * Įkelti sugeneruotą pasaką į Supabase saugyklą
 */

import 'dotenv/config';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadAudio() {
  console.log('Reading audio file...');
  const audioBuffer = fs.readFileSync('first_story_sarah.mp3');
  console.log(`File size: ${audioBuffer.length} bytes`);

  const fileName = `pregenerated/mazojo_meskiuko_sapnas_${Date.now()}.mp3`;
  console.log(`Uploading to: ${fileName}`);

  const { data, error } = await supabase.storage
    .from('audio')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    return;
  }

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
  console.log('\n✅ Audio uploaded successfully!');
  console.log('Public URL:', urlData.publicUrl);
}

uploadAudio().catch(console.error);
