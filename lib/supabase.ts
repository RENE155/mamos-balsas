import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Platformą atpažįstanti saugykla, veikianti web SSR, web kliente ir vietinėje platformoje
const createStorage = () => {
  // SSR metu (nėra window) grąžinti nieko nedarančią saugyklą
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }

  // Web kliente naudoti localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // Vietinėje platformoje naudoti AsyncStorage
  return AsyncStorage;
};

console.log('[Supabase] Initializing with URL:', supabaseUrl);
console.log('[Supabase] Anon key present:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client initialized');

// Pasakų limitų konfigūracija
const STORY_LIMITS = {
  weekly: 7,
  monthly: 30,
  none: 1, // free_story_used tai tvarko atskirai
};

const PERIOD_DAYS = {
  weekly: 7,
  monthly: 30,
};

export type SubscriptionType = 'none' | 'weekly' | 'monthly';

export interface StoryLimitCheck {
  canCreate: boolean;
  remaining: number;
  limit: number;
  resetDate: Date | null;
}

/**
 * Patikrinti, ar vartotojas gali sukurti pasaką pagal savo prenumeratos limitus
 */
export async function canCreateStory(userId: string): Promise<StoryLimitCheck> {
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_type, stories_created_this_period, period_start_date, subscription_status, free_story_used')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('[Supabase] Error fetching user for story limit check:', error);
    return { canCreate: false, remaining: 0, limit: 0, resetDate: null };
  }

  const subscriptionType = (user.subscription_type || 'none') as SubscriptionType;

  // Nemokami vartotojai - tvarkomi per free_story_used vėliavėlę
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

  // Patikrinti, ar laikotarpis pasibaigė
  let storiesCreated = user.stories_created_this_period || 0;
  let periodStart = user.period_start_date ? new Date(user.period_start_date) : null;

  if (periodStart) {
    const now = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    if (now >= periodEnd) {
      // Laikotarpis pasibaigė - atstatyti skaičių
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
    // Nėra laikotarpio pradžios datos - inicializuoti ją
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

/**
 * Padidinti pasakų skaičių po sėkmingo sukūrimo
 */
export async function incrementStoryCount(userId: string): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_type, stories_created_this_period, period_start_date, subscription_status')
    .eq('id', userId)
    .single();

  if (!user) return;

  const subscriptionType = (user.subscription_type || 'none') as SubscriptionType;

  // Nemokami vartotojai nenaudoja skaičiavimo pagal laikotarpį
  if (subscriptionType === 'none' || user.subscription_status !== 'active') {
    return;
  }

  const newCount = (user.stories_created_this_period || 0) + 1;
  const periodStart = user.period_start_date || new Date().toISOString();

  await supabase
    .from('users')
    .update({
      stories_created_this_period: newCount,
      period_start_date: periodStart,
    })
    .eq('id', userId);

  console.log('[Supabase] Story count incremented to:', newCount);
}

/**
 * Sinchronizuoti prenumeratos tipą iš RevenueCat į duomenų bazę
 */
export async function syncSubscriptionType(
  userId: string,
  type: SubscriptionType
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_type, subscription_status')
    .eq('id', userId)
    .single();

  if (!user) return;

  // Nustatyti prenumeratos būseną pagal tipą
  const newStatus = type === 'none' ? 'none' : 'active';
  const needsUpdate = user.subscription_type !== type || user.subscription_status !== newStatus;

  // Atnaujinti tik jei tipas arba būsena pasikeitė
  if (needsUpdate) {
    await supabase
      .from('users')
      .update({
        subscription_type: type,
        subscription_status: newStatus,
      })
      .eq('id', userId);

    console.log('[Supabase] Subscription synced:', { type, status: newStatus });
  }
}
