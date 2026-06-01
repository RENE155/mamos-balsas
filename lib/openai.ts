/**
 * Pasakų generavimo pagalbinės funkcijos
 * API iškvietimai dabar nukreipiami per Edge Functions naudojant lib/api.ts
 */

import type { StoryTheme, GeneratedStory, CharacterDescription, Scene } from '@/types';
import { api } from './api';
import { getStoryFormat, type StoryFormat } from './storyFormats';

// Meno stiliaus apibrėžimai paveikslėlių užklausoms
export const ART_STYLES = {
  watercolor: "Soft watercolor children's book illustration, wet-on-wet technique, gentle color bleeding, translucent washes, warm pastel palette with peach and soft blue tones, dreamy ethereal atmosphere, dappled sunlight",
  cartoon: "Vibrant Disney-Pixar inspired 3D cartoon style, bold saturated colors, glossy surfaces, big expressive eyes, round friendly shapes, dynamic lighting with rim lights, cheerful and energetic mood",
  storybook: "Classic golden age storybook illustration like Beatrix Potter, fine detailed linework, muted earthy tones with pops of red and green, textured paper look, warm candlelit atmosphere, nostalgic Victorian charm",
  dreamy: "Magical dreamy night scene illustration, deep purple and midnight blue palette, soft glowing stars and fireflies, luminescent moonlight, misty atmosphere, gentle sparkles, peaceful sleepy mood",
} as const;

export type ArtStyle = keyof typeof ART_STYLES;

// Pakartotinai eksportuoti pasakos formato pagalbines funkcijas
export { getStoryFormat } from './storyFormats';

/**
 * Apskaičiuoti, kiek paveikslėlių sugeneruoti pagal pastraipų skaičių ir amžių
 */
export function calculateImageCount(storyText: string, maxMinutes: number, age: number): number {
  const format = getStoryFormat(age);

  const paragraphs = storyText
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
    .map(p => p.trim())
    .filter(p => p.length > 10 && !p.match(/^\.+$/));

  const count = Math.min(paragraphs.length, format.imageRange.max);
  return Math.max(count, format.imageRange.min);
}

/**
 * Sukurti paveikslėlio užklausą scenai
 */
export function buildImagePrompt(
  scene: Scene,
  characters: CharacterDescription[],
  artStyle: ArtStyle = 'watercolor'
): string {
  const sceneCharacters = characters.filter(c =>
    scene.characters.some(name =>
      name.toLowerCase().includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(name.toLowerCase())
    )
  );

  const characterDescriptions = sceneCharacters.map(char => {
    let desc = `${char.name} (${char.type}): ${char.appearance.size}, ${char.appearance.mainColor} ${char.appearance.texture}`;
    desc += `, ${char.appearance.eyes}`;
    if (char.appearance.distinctiveFeatures.length > 0) {
      desc += `, ${char.appearance.distinctiveFeatures.join(', ')}`;
    }
    if (char.clothing) {
      desc += `. Wearing ${char.clothing.color} ${char.clothing.item}`;
      if (char.clothing.details) {
        desc += ` with ${char.clothing.details}`;
      }
    }
    return desc;
  }).join('\n- ');

  const styleDescription = ART_STYLES[artStyle];

  return `${styleDescription}

SCENE: ${scene.visualDescription}

CHARACTERS IN SCENE:
- ${characterDescriptions || 'No specific characters'}

MOOD: ${scene.mood}, suitable for a bedtime story

IMPORTANT RULES:
- NO text, words, letters, or numbers in the image
- Child-safe, gentle, calming imagery
- Maintain exact character appearances as described
- Soft, warm lighting appropriate for bedtime`;
}

/**
 * Suskaidyti pasaką į pastraipas scenų analizei
 */
export function splitIntoParagraphs(storyText: string): string[] {
  return storyText
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
    .map(p => p.trim())
    .filter(p => p.length > 20 && !p.match(/^\.+$/));
}

/**
 * Sugeneruoti pasakos tekstą naudojant Edge Function
 */
export async function generateStoryText(
  userId: string,
  age: number,
  theme: StoryTheme,
  maxMinutes: number = 5
): Promise<{ title: string; content: string }> {
  const response = await api.generateStory(userId, age, theme, maxMinutes);
  return { title: response.title, content: response.content };
}

/**
 * Sugeneruoti visą pasaką (tik tekstą)
 */
export async function generateStory(
  userId: string,
  age: number,
  theme: StoryTheme,
  maxMinutes: number = 5
): Promise<GeneratedStory> {
  const { title, content } = await generateStoryText(userId, age, theme, maxMinutes);

  return {
    title,
    content,
    theme: theme.id,
  };
}

/**
 * Sugeneruoti paveikslėlį scenai naudojant Edge Function
 */
export async function generateImage(
  userId: string,
  prompt: string,
  storyId: string,
  sceneIndex: number,
  sceneText?: string,
  quality: 'low' | 'medium' | 'high' = 'low'
): Promise<{ imageUrl: string }> {
  const response = await api.generateImage(userId, prompt, storyId, sceneIndex, sceneText, quality);
  return { imageUrl: response.imageUrl };
}

/**
 * Sugeneruoti visus pasakos paveikslėlius
 * Paveikslėliai generuojami per Edge Function ir saugomi Supabase Storage
 */
export async function generateStoryImages(
  userId: string,
  storyId: string,
  storyText: string,
  scenes: Scene[],
  characters: CharacterDescription[],
  artStyle: ArtStyle = 'watercolor',
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ imageUrl: string; sceneIndex: number; sceneText: string }>> {
  const images: Array<{ imageUrl: string; sceneIndex: number; sceneText: string }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress?.(i + 1, scenes.length);

    try {
      const prompt = buildImagePrompt(scene, characters, artStyle);
      console.log(`[OpenAI] Generating image ${i + 1}/${scenes.length} via Edge Function...`);

      const { imageUrl } = await generateImage(
        userId,
        prompt,
        storyId,
        scene.index,
        scene.text,
        'low'
      );

      images.push({
        imageUrl,
        sceneIndex: scene.index,
        sceneText: scene.text,
      });

      console.log(`[OpenAI] Image ${i + 1} completed`);
    } catch (error) {
      console.error(`[OpenAI] Image ${i + 1} failed:`, error);
      // Tęsti su kitais paveikslėliais
    }
  }

  return images;
}
