import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface User {
  id: string;
  subscription_status: string;
  subscription_type: string;
  free_story_used: boolean;
  stories_created_this_period: number;
  period_start_date: string | null;
}

export async function validateUser(userId: string): Promise<User | null> {
  if (!userId) return null;

  // Patikrinti UUID formatą
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, subscription_status, subscription_type, free_story_used, stories_created_this_period, period_start_date')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as User;
}

export function isSubscriber(user: User): boolean {
  return user.subscription_status === 'active';
}

export function canCreateStory(user: User): { allowed: boolean; reason?: string } {
  // Nemokami naudotojai: 1 pasaka iš viso
  if (!isSubscriber(user)) {
    if (user.free_story_used) {
      return { allowed: false, reason: 'free_story_limit' };
    }
    return { allowed: true };
  }

  // Prenumeratoriai: patikrinti laikotarpio limitus
  const limits = {
    weekly: 7,
    monthly: 30,
  };

  const limit = limits[user.subscription_type as keyof typeof limits] || 30;

  if (user.stories_created_this_period >= limit) {
    return { allowed: false, reason: 'period_limit' };
  }

  return { allowed: true };
}
