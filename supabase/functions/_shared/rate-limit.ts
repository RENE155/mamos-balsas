import { supabase } from './auth.ts';

export interface RateLimitConfig {
  action: string;
  maxRequests: number;
  windowMinutes: number;
}

// Užklausų dažnio ribojimo konfigūracijos
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'generate-story': { action: 'generate-story', maxRequests: 1, windowMinutes: 5 },
  'generate-image': { action: 'generate-image', maxRequests: 15, windowMinutes: 1 },
  'generate-audio': { action: 'generate-audio', maxRequests: 3, windowMinutes: 1 },
  'clone-voice': { action: 'clone-voice', maxRequests: 1, windowMinutes: 60 },
};

export async function checkRateLimit(
  userId: string,
  action: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true }; // Nežinomas veiksmas - leisti
  }

  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

  // Suskaičiuoti užklausas per laiko langą
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', action)
    .gte('window_start', windowStart.toISOString());

  if (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    return { allowed: true }; // Klaidos atveju leisti
  }

  if ((count || 0) >= config.maxRequests) {
    // Apskaičiuoti pakartojimo laiką
    const retryAfterSeconds = config.windowMinutes * 60;
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function recordRequest(userId: string, action: string): Promise<void> {
  await supabase
    .from('rate_limits')
    .insert({
      user_id: userId,
      action_type: action,
      window_start: new Date().toISOString(),
      request_count: 1,
    });
}

// Išvalyti senus užklausų dažnio ribojimo įrašus (vykdyti periodiškai)
export async function cleanupOldRateLimits(): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 2); // Saugoti 2 valandų istoriją

  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', cutoff.toISOString());
}
