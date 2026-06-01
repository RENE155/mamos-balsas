/**
 * Kliento pusės API apvalkalas Edge Functions iškvietimams
 * Visi brangūs API iškvietimai (OpenAI, ElevenLabs) vyksta per šiuos saugius galinius taškus
 */

import type { StoryTheme, CharacterDescription, Scene } from '@/types';

const EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

export interface ApiError {
  error: string;
  message?: string;
  retryAfter?: number;
}

export interface GenerateStoryResponse {
  title: string;
  content: string;
  theme: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  sceneIndex: number;
}

export interface GenerateAudioResponse {
  audioUrl: string;
  recloned?: boolean;  // True, jei balsas buvo iš naujo klonuotas iš saugyklos (pašalintas balsas)
}

export interface CloneVoiceResponse {
  voiceProfileId: string;
  voiceId: string;
  name: string;
}

export interface AnalyzeStoryResponse {
  characters: CharacterDescription[];
  scenes: Scene[];
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    userId: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${EDGE_URL}/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;

      // Apdoroti konkrečius klaidų kodus
      if (response.status === 429) {
        throw new RateLimitError(error.message || 'Rate limit exceeded', error.retryAfter);
      }
      if (response.status === 403) {
        if (error.error === 'free_story_limit') {
          throw new StoryLimitError('free');
        }
        if (error.error === 'period_limit') {
          throw new StoryLimitError('period');
        }
        if (error.error === 'premium_required') {
          throw new PremiumRequiredError(error.message || 'Premium subscription required');
        }
        if (error.error === 'max_voices_reached') {
          throw new MaxVoicesError(error.message || 'Maximum voices reached');
        }
      }
      if (error.error === 'content_flagged') {
        throw new ContentFlaggedError('Generated content failed safety check');
      }
      // Apdoroti su balsu susijusias klaidas
      if (error.error?.includes('Voice not ready') || error.error?.includes('Voice profile not found')) {
        throw new VoiceNotReadyError(error.error);
      }
      if (error.error === 'Re-clone rate limit exceeded') {
        throw new RateLimitError('Voice re-clone rate limit exceeded', 3600);
      }

      throw new ApiRequestError(error.message || error.error || 'Request failed', response.status);
    }

    return data as T;
  }

  /**
   * Sugeneruoti pasakos tekstą naudojant Edge Function
   */
  async generateStory(
    userId: string,
    age: number,
    theme: StoryTheme,
    maxMinutes: number = 5
  ): Promise<GenerateStoryResponse> {
    return this.request<GenerateStoryResponse>('generate-story', userId, {
      method: 'POST',
      body: JSON.stringify({ age, theme, maxMinutes }),
    });
  }

  /**
   * Sugeneruoti paveikslėlį pasakos scenai
   */
  async generateImage(
    userId: string,
    prompt: string,
    storyId: string,
    sceneIndex: number,
    sceneText?: string,
    quality: 'low' | 'medium' | 'high' = 'low'
  ): Promise<GenerateImageResponse> {
    return this.request<GenerateImageResponse>('generate-image', userId, {
      method: 'POST',
      body: JSON.stringify({ prompt, storyId, sceneIndex, sceneText, quality }),
    });
  }

  /**
   * Sugeneruoti garso įrašą pasakos tekstui
   */
  async generateAudio(
    userId: string,
    text: string,
    options: {
      voiceProfileId?: string;
      storyId?: string;
      age?: number;
      speed?: number;
    } = {}
  ): Promise<GenerateAudioResponse> {
    return this.request<GenerateAudioResponse>('generate-audio', userId, {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    });
  }

  /**
   * Analizuoti pasaką, kad būtų išgauti veikėjai ir scenos
   */
  async analyzeStory(
    userId: string,
    storyText: string,
    maxImages: number,
    age: number
  ): Promise<AnalyzeStoryResponse> {
    return this.request<AnalyzeStoryResponse>('analyze-story', userId, {
      method: 'POST',
      body: JSON.stringify({ storyText, maxImages, age }),
    });
  }

  /**
   * Klonuoti balsą iš garso įrašo (Web versija su Blob)
   * Reikalinga premium prenumerata
   */
  async cloneVoice(
    userId: string,
    name: string,
    audioBlob: Blob
  ): Promise<CloneVoiceResponse> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('audio', audioBlob, 'recording.m4a');

    const response = await fetch(`${EDGE_URL}/clone-voice`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
        // Nenustatyti Content-Type - leisti naršyklei jį nustatyti su riba
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;

      if (response.status === 429) {
        throw new RateLimitError(error.message || 'Rate limit exceeded', error.retryAfter);
      }
      if (error.error === 'premium_required') {
        throw new PremiumRequiredError(error.message || 'Premium subscription required');
      }
      if (error.error === 'max_voices_reached') {
        throw new MaxVoicesError(error.message || 'Maximum voices reached');
      }

      throw new ApiRequestError(error.message || error.error || 'Request failed', response.status);
    }

    return data as CloneVoiceResponse;
  }

  /**
   * Klonuoti balsą iš garso įrašo (React Native versija su failo URI)
   * Reikalinga premium prenumerata
   */
  async cloneVoiceNative(
    userId: string,
    name: string,
    audioUri: string
  ): Promise<CloneVoiceResponse> {
    // React Native FormData palaiko failų objektus su uri, type ir name
    const formData = new FormData();
    formData.append('name', name);
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any); // Tipo patvirtinimas reikalingas React Native FormData

    console.log('[API] Sending voice clone request with URI:', audioUri);

    const response = await fetch(`${EDGE_URL}/clone-voice`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
        // Nenustatyti Content-Type - leisti React Native jį nustatyti su riba
      },
      body: formData,
    });

    const data = await response.json();
    console.log('[API] Clone voice response:', response.status, data);

    if (!response.ok) {
      const error = data as ApiError & { debug?: { userId?: string; status?: string } };

      if (response.status === 429) {
        throw new RateLimitError(error.message || 'Rate limit exceeded', error.retryAfter);
      }
      if (error.error === 'premium_required') {
        // Įtraukti derinimo informaciją į klaidos pranešimą trikčių šalinimui
        const debugInfo = error.debug ? ` [Debug: userId=${error.debug.userId}, status=${error.debug.status}]` : '';
        throw new PremiumRequiredError((error.message || 'Premium subscription required') + debugInfo);
      }
      if (error.error === 'max_voices_reached') {
        throw new MaxVoicesError(error.message || 'Maximum voices reached');
      }

      throw new ApiRequestError(error.message || error.error || 'Request failed', response.status);
    }

    return data as CloneVoiceResponse;
  }

  /**
   * Ištrinti balso profilį
   */
  async deleteVoice(userId: string, voiceProfileId: string): Promise<void> {
    await this.request<{ success: boolean }>('delete-voice', userId, {
      method: 'POST',
      body: JSON.stringify({ voiceProfileId }),
    });
  }
}

// Pasirinktinės klaidų klasės konkretiems klaidų atvejams apdoroti
export class ApiRequestError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class StoryLimitError extends Error {
  constructor(public limitType: 'free' | 'period') {
    super(limitType === 'free'
      ? 'You have used your free story. Subscribe to create more!'
      : 'You have reached your story limit for this period.'
    );
    this.name = 'StoryLimitError';
  }
}

export class PremiumRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PremiumRequiredError';
  }
}

export class MaxVoicesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxVoicesError';
  }
}

export class ContentFlaggedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentFlaggedError';
  }
}

export class VoiceNotReadyError extends Error {
  constructor(message: string, public voiceStatus?: string) {
    super(message);
    this.name = 'VoiceNotReadyError';
  }
}

// Eksportuoti vienintelį egzempliorių
export const api = new ApiClient();

// Pakartotinai eksportuoti tipus patogumui
export type { StoryTheme, CharacterDescription, Scene };
