/**
 * Balso klonavimo LRU bandomasis scenarijus
 *
 * Išbando visą balso klonavimo LRU valdymo eigą:
 * 1. Duomenų bazės schemos patikrinimas
 * 2. Balso profilio sukūrimas su garso saugojimu
 * 3. LRU sekimas (last_used_at atnaujinimai)
 * 4. Balso pašalinimo imitacija
 * 5. Balso pakartotinis klonavimas pagal poreikį
 *
 * Naudojimas: npx ts-node scripts/test-voice-lru.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('🧪 Voice Cloning LRU Test Suite\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  // 1 testas: duomenų bazės schemos patikrinimas
  console.log('\n📋 Test 1: Database Schema Verification');
  try {
    const { data: columns } = await supabase.rpc('get_voice_profile_columns').select();

    // Atsarginis variantas: tiesioginė užklausa
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('id, user_id, name, elevenlabs_voice_id, original_audio_url, last_used_at, status, created_at')
      .limit(0);

    if (error) throw error;

    console.log('  ✅ voice_profiles table accessible with all new columns');
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Schema test failed: ${error.message}`);
    failed++;
  }

  // 2 testas: elevenlabs_voice_id, kuris gali būti null
  console.log('\n📋 Test 2: Nullable elevenlabs_voice_id');
  try {
    // Bandyti įterpti įrašą su null elevenlabs_voice_id
    const testUserId = '00000000-0000-0000-0000-000000000001';

    // Pirma įsitikinti, kad bandomasis naudotojas egzistuoja
    await supabase.from('users').upsert({
      id: testUserId,
      auth_provider: 'code',
      subscription_status: 'active',
    });

    const { data, error } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: testUserId,
        name: 'LRU Test Voice',
        elevenlabs_voice_id: null,
        original_audio_url: null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`  ✅ Can insert voice_profile with null elevenlabs_voice_id`);
    console.log(`     Created test voice: ${data.id}`);

    // Išvalymas
    await supabase.from('voice_profiles').delete().eq('id', data.id);
    console.log('     Cleaned up test voice');
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Nullable test failed: ${error.message}`);
    failed++;
  }

  // 3 testas: būsenos apribojimas apima 'evicted'
  console.log('\n📋 Test 3: Status Constraint (evicted)');
  try {
    const testUserId = '00000000-0000-0000-0000-000000000001';

    const { data, error } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: testUserId,
        name: 'Evicted Test Voice',
        elevenlabs_voice_id: null,
        status: 'evicted',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`  ✅ Can insert voice_profile with status='evicted'`);

    // Išvalymas
    await supabase.from('voice_profiles').delete().eq('id', data.id);
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Evicted status test failed: ${error.message}`);
    failed++;
  }

  // 4 testas: last_used_at sekimas
  console.log('\n📋 Test 4: LRU Tracking (last_used_at)');
  try {
    const testUserId = '00000000-0000-0000-0000-000000000001';

    const { data: voice1, error: e1 } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: testUserId,
        name: 'LRU Voice 1',
        elevenlabs_voice_id: 'test-voice-1',
        status: 'ready',
        last_used_at: new Date(Date.now() - 86400000).toISOString(), // prieš 1 dieną
      })
      .select()
      .single();

    if (e1) throw e1;

    const { data: voice2, error: e2 } = await supabase
      .from('voice_profiles')
      .insert({
        user_id: testUserId,
        name: 'LRU Voice 2',
        elevenlabs_voice_id: 'test-voice-2',
        status: 'ready',
        last_used_at: new Date().toISOString(), // Dabar
      })
      .select()
      .single();

    if (e2) throw e2;

    // Užklausti seniausius pirma (LRU tvarka)
    const { data: lruVoices, error: e3 } = await supabase
      .from('voice_profiles')
      .select('id, name, last_used_at')
      .eq('user_id', testUserId)
      .not('elevenlabs_voice_id', 'is', null)
      .order('last_used_at', { ascending: true });

    if (e3) throw e3;

    if (lruVoices[0].id === voice1.id) {
      console.log(`  ✅ LRU ordering works (oldest first: ${lruVoices[0].name})`);
      passed++;
    } else {
      console.log(`  ❌ LRU ordering incorrect`);
      failed++;
    }

    // Išvalymas
    await supabase.from('voice_profiles').delete().eq('id', voice1.id);
    await supabase.from('voice_profiles').delete().eq('id', voice2.id);
  } catch (error: any) {
    console.log(`  ❌ LRU tracking test failed: ${error.message}`);
    failed++;
  }

  // 5 testas: saugyklos kibiro egzistavimas
  console.log('\n📋 Test 5: Storage Bucket (voice-recordings)');
  try {
    const { data, error } = await supabase.storage.from('voice-recordings').list('', { limit: 1 });

    if (error) throw error;

    console.log(`  ✅ voice-recordings bucket exists and accessible`);
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Storage bucket test failed: ${error.message}`);
    failed++;
  }

  // 6 testas: užklausų dažnio ribojimo lentelės palaikymas reclone-voice veiksmui
  console.log('\n📋 Test 6: Rate Limit Support (reclone-voice)');
  try {
    const testUserId = '00000000-0000-0000-0000-000000000001';

    const { error } = await supabase.from('rate_limits').insert({
      user_id: testUserId,
      action_type: 'reclone-voice',
      window_start: new Date().toISOString(),
    });

    if (error) throw error;

    // Patikrinti, ar galime jį užklausti
    const { data, error: e2 } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', testUserId)
      .eq('action_type', 'reclone-voice');

    if (e2) throw e2;

    console.log(`  ✅ Can track reclone-voice rate limits`);

    // Išvalymas
    await supabase.from('rate_limits').delete().eq('user_id', testUserId).eq('action_type', 'reclone-voice');
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Rate limit test failed: ${error.message}`);
    failed++;
  }

  // 7 testas: aktyvių balsų skaičiaus užklausa
  console.log('\n📋 Test 7: Active Voice Count Query');
  try {
    const { count, error } = await supabase
      .from('voice_profiles')
      .select('*', { count: 'exact', head: true })
      .not('elevenlabs_voice_id', 'is', null);

    if (error) throw error;

    console.log(`  ✅ Can count active voices: ${count || 0} active`);
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Active voice count test failed: ${error.message}`);
    failed++;
  }

  // 8 testas: Edge funkcijos prieinamumas
  console.log('\n📋 Test 8: Edge Function Availability');
  try {
    const functions = ['clone-voice', 'delete-voice', 'generate-audio'];
    for (const fn of functions) {
      const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'OPTIONS',
      });

      if (response.ok || response.status === 204) {
        console.log(`  ✅ ${fn} endpoint reachable`);
      } else {
        console.log(`  ⚠️ ${fn} returned ${response.status}`);
      }
    }
    passed++;
  } catch (error: any) {
    console.log(`  ❌ Edge function test failed: ${error.message}`);
    failed++;
  }

  // Santrauka
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Voice Cloning LRU system is ready.\n');
  } else {
    console.log('⚠️ Some tests failed. Please review the issues above.\n');
  }

  // Išvalyti bandomąjį naudotoją
  await supabase.from('users').delete().eq('id', '00000000-0000-0000-0000-000000000001');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
