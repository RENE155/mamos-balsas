import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  // Pirmiausia ištrinti story_images (išorinio rakto apribojimas)
  const { error: imgError } = await supabase
    .from('story_images')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (imgError) {
    console.error('Error deleting images:', imgError);
  } else {
    console.log('✅ Deleted story images');
  }

  // Tada ištrinti pasakas
  const { data, error } = await supabase
    .from('stories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Deleted', data?.length, 'stories');
  }

  // Taip pat atstatyti free_story_used vėliavėlę
  const { error: userError } = await supabase
    .from('users')
    .update({ free_story_used: false })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (userError) {
    console.error('Error resetting flag:', userError);
  } else {
    console.log('✅ Reset free_story_used flag');
  }
}

main();
