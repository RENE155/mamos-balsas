import { supabase } from './auth.ts';

// Sąnaudų įverčiai (USD)
export const COSTS = {
  openai: {
    'gpt-4o-mini': {
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
    },
    'gpt-image-1': {
      low: 0.011,
      medium: 0.042,
      high: 0.167,
    },
    moderation: 0, // Nemokama
  },
  elevenlabs: {
    // ~$0.30 už 1000 simbolių
    perCharacter: 0.0003,
    voiceClone: 0, // Įtraukta į prenumeratą
  },
};

export interface CostEntry {
  userId: string;
  actionType: string;
  provider: 'openai' | 'elevenlabs';
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  imageQuality?: 'low' | 'medium' | 'high';
  audioCharacters?: number;
  storyId?: string;
  metadata?: Record<string, unknown>;
}

export function calculateCost(entry: CostEntry): number {
  let cost = 0;

  if (entry.provider === 'openai') {
    // Teksto generavimo sąnaudos
    if (entry.model === 'gpt-4o-mini' && (entry.inputTokens || entry.outputTokens)) {
      const rates = COSTS.openai['gpt-4o-mini'];
      cost += ((entry.inputTokens || 0) / 1000) * rates.inputPer1k;
      cost += ((entry.outputTokens || 0) / 1000) * rates.outputPer1k;
    }

    // Paveikslėlių generavimo sąnaudos
    if (entry.imageCount && entry.imageQuality) {
      const imageRate = COSTS.openai['gpt-image-1'][entry.imageQuality];
      cost += entry.imageCount * imageRate;
    }
  }

  if (entry.provider === 'elevenlabs') {
    // Garso generavimo sąnaudos
    if (entry.audioCharacters) {
      cost += entry.audioCharacters * COSTS.elevenlabs.perCharacter;
    }
  }

  return cost;
}

export async function trackCost(entry: CostEntry): Promise<void> {
  const estimatedCost = calculateCost(entry);

  await supabase.from('api_costs').insert({
    user_id: entry.userId,
    action_type: entry.actionType,
    provider: entry.provider,
    model: entry.model,
    input_tokens: entry.inputTokens,
    output_tokens: entry.outputTokens,
    image_count: entry.imageCount,
    audio_seconds: entry.audioCharacters ? Math.ceil(entry.audioCharacters / 15) : null, // ~15 simbolių/sek
    estimated_cost_usd: estimatedCost,
    story_id: entry.storyId,
    request_metadata: entry.metadata,
  });
}

// Gauti naudotojo sąnaudas per laikotarpį
export async function getUserCosts(
  userId: string,
  days: number = 30
): Promise<{ totalCost: number; breakdown: Record<string, number> }> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('api_costs')
    .select('action_type, estimated_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());

  const breakdown: Record<string, number> = {};
  let totalCost = 0;

  for (const row of data || []) {
    const cost = parseFloat(row.estimated_cost_usd) || 0;
    totalCost += cost;
    breakdown[row.action_type] = (breakdown[row.action_type] || 0) + cost;
  }

  return { totalCost, breakdown };
}
