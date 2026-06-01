/**
 * Bandomasis scenarijus pasakų limitų funkcionalumui
 * Paleisti su: npx ts-node scripts/test-story-limits.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pasakų limitų konfigūracija (nukopijuota iš lib/supabase.ts)
const STORY_LIMITS = {
  weekly: 7,
  monthly: 30,
  none: 1,
};

const PERIOD_DAYS = {
  weekly: 7,
  monthly: 30,
};

type SubscriptionType = 'none' | 'weekly' | 'monthly';

interface StoryLimitCheck {
  canCreate: boolean;
  remaining: number;
  limit: number;
  resetDate: Date | null;
}

// canCreateStory kopija testavimui
async function canCreateStory(userId: string): Promise<StoryLimitCheck> {
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_type, stories_created_this_period, period_start_date, subscription_status, free_story_used')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error fetching user:', error);
    return { canCreate: false, remaining: 0, limit: 0, resetDate: null };
  }

  const subscriptionType = (user.subscription_type || 'none') as SubscriptionType;

  // Nemokami naudotojai
  if (subscriptionType === 'none' || user.subscription_status !== 'active') {
    return {
      canCreate: !user.free_story_used,
      remaining: user.free_story_used ? 0 : 1,
      limit: 1,
      resetDate: null,
    };
  }

  const limit = STORY_LIMITS[subscriptionType];
  const periodDays = PERIOD_DAYS[subscriptionType];

  let storiesCreated = user.stories_created_this_period || 0;
  let periodStart = user.period_start_date ? new Date(user.period_start_date) : null;

  if (periodStart) {
    const now = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    if (now >= periodEnd) {
      storiesCreated = 0;
      periodStart = now;

      await supabase
        .from('users')
        .update({
          stories_created_this_period: 0,
          period_start_date: now.toISOString(),
        })
        .eq('id', userId);
    }
  } else {
    periodStart = new Date();
    await supabase
      .from('users')
      .update({ period_start_date: periodStart.toISOString() })
      .eq('id', userId);
  }

  const remaining = Math.max(0, limit - storiesCreated);
  const resetDate = periodStart ? new Date(periodStart) : null;
  if (resetDate) {
    resetDate.setDate(resetDate.getDate() + periodDays);
  }

  return {
    canCreate: remaining > 0,
    remaining,
    limit,
    resetDate,
  };
}

// Bandomoji pagalbinė funkcija naudotojo būsenai nustatyti
async function setUserState(
  userId: string,
  state: {
    subscription_type?: string;
    subscription_status?: string;
    stories_created_this_period?: number;
    period_start_date?: string | null;
    free_story_used?: boolean;
  }
) {
  const { error } = await supabase.from('users').update(state).eq('id', userId);
  if (error) {
    console.error('Error setting user state:', error);
    throw error;
  }
}

async function runTests() {
  console.log('🧪 Testing Story Limits\n');

  // Gauti bandomąjį naudotoją
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, subscription_type, subscription_status, stories_created_this_period, period_start_date, free_story_used')
    .limit(1);

  if (error || !users?.length) {
    console.error('❌ No users found for testing:', error);
    return;
  }

  const testUser = users[0];
  console.log(`📋 Test user: ${testUser.id}\n`);
  console.log('Current state:', JSON.stringify(testUser, null, 2), '\n');

  // Išsaugoti pradinę būseną, kad vėliau būtų galima atkurti
  const originalState = {
    subscription_type: testUser.subscription_type,
    subscription_status: testUser.subscription_status,
    stories_created_this_period: testUser.stories_created_this_period,
    period_start_date: testUser.period_start_date,
    free_story_used: testUser.free_story_used,
  };

  try {
    // 1 testas: nemokamas naudotojas, kuris nepanaudojo nemokamos pasakos
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 1: Free user (not used free story)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'none',
      subscription_status: 'none',
      free_story_used: false,
    });
    let result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(result.canCreate && result.remaining === 1 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 2 testas: nemokamas naudotojas, kuris panaudojo nemokamą pasaką
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 2: Free user (already used free story)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'none',
      subscription_status: 'none',
      free_story_used: true,
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(!result.canCreate && result.remaining === 0 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 3 testas: savaitės prenumeratorius su likusiomis pasakomis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 3: Weekly subscriber (3/7 stories used)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'weekly',
      subscription_status: 'active',
      stories_created_this_period: 3,
      period_start_date: new Date().toISOString(),
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(result.canCreate && result.remaining === 4 && result.limit === 7 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 4 testas: savaitės prenumeratorius pasiekęs limitą
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 4: Weekly subscriber (7/7 stories used - at limit)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'weekly',
      subscription_status: 'active',
      stories_created_this_period: 7,
      period_start_date: new Date().toISOString(),
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(!result.canCreate && result.remaining === 0 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 5 testas: mėnesio prenumeratorius su likusiomis pasakomis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 5: Monthly subscriber (15/30 stories used)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'monthly',
      subscription_status: 'active',
      stories_created_this_period: 15,
      period_start_date: new Date().toISOString(),
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(result.canCreate && result.remaining === 15 && result.limit === 30 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 6 testas: mėnesio prenumeratorius pasiekęs limitą
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 6: Monthly subscriber (30/30 stories used - at limit)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, {
      subscription_type: 'monthly',
      subscription_status: 'active',
      stories_created_this_period: 30,
      period_start_date: new Date().toISOString(),
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(!result.canCreate && result.remaining === 0 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // 7 testas: laikotarpio atstatymas (savaitės prenumeratorius su pasibaigusiu laikotarpiu)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 7: Weekly subscriber (period expired - should reset)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    await setUserState(testUser.id, {
      subscription_type: 'weekly',
      subscription_status: 'active',
      stories_created_this_period: 7,
      period_start_date: eightDaysAgo.toISOString(),
    });
    result = await canCreateStory(testUser.id);
    console.log('Result:', result);
    console.log(result.canCreate && result.remaining === 7 ? '✅ PASS' : '❌ FAIL');
    console.log();

    // Patikrinti, ar atstatymas tikrai įvyko duomenų bazėje
    const { data: updatedUser } = await supabase
      .from('users')
      .select('stories_created_this_period, period_start_date')
      .eq('id', testUser.id)
      .single();
    console.log('DB state after reset:', updatedUser);
    console.log(updatedUser?.stories_created_this_period === 0 ? '✅ Count reset in DB' : '❌ Count not reset');
    console.log();

  } finally {
    // Atkurti pradinę būseną
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Restoring original user state...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserState(testUser.id, originalState);
    console.log('✅ Done\n');
  }
}

runTests().catch(console.error);
