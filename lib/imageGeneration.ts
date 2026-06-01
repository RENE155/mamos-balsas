/**
 * Paveikslėlių generavimo pagalbinės funkcijos pasakų iliustracijoms
 * API iškvietimai dabar nukreipiami per Edge Functions naudojant lib/api.ts
 */

import type { CharacterDescription, Scene } from '@/types';
import { api } from './api';
import { getStoryFormat } from './storyFormats';

// Meno stiliaus apibrėžimai nuosekliam vaizdui
export const ART_STYLES = {
  watercolor: "Soft watercolor children's book illustration, wet-on-wet technique, gentle color bleeding, translucent washes, warm pastel palette with peach and soft blue tones, dreamy ethereal atmosphere, dappled sunlight",
  cartoon: "Vibrant Disney-Pixar inspired 3D cartoon style, bold saturated colors, glossy surfaces, big expressive eyes, round friendly shapes, dynamic lighting with rim lights, cheerful and energetic mood",
  storybook: "Classic golden age storybook illustration like Beatrix Potter, fine detailed linework, muted earthy tones with pops of red and green, textured paper look, warm candlelit atmosphere, nostalgic Victorian charm",
  dreamy: "Magical dreamy night scene illustration, deep purple and midnight blue palette, soft glowing stars and fireflies, luminescent moonlight, misty atmosphere, gentle sparkles, peaceful sleepy mood",
} as const;

export type ArtStyle = keyof typeof ART_STYLES;

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
 * Išgauti veikėjus iš pasakos teksto naudojant Edge Function
 */
export async function extractCharacters(
  userId: string,
  storyText: string,
  maxImages: number,
  age: number
): Promise<CharacterDescription[]> {
  const response = await api.analyzeStory(userId, storyText, maxImages, age);
  return response.characters;
}

/**
 * Analizuoti pasaką ir suskaidyti į vizualines scenas naudojant Edge Function
 */
export async function analyzeScenes(
  userId: string,
  storyText: string,
  maxImages: number,
  age: number
): Promise<{ characters: CharacterDescription[]; scenes: Scene[] }> {
  return api.analyzeStory(userId, storyText, maxImages, age);
}

/**
 * Sukurti išsamią paveikslėlio užklausą konkrečiai scenai
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
 * Sugeneruoti vieną paveikslėlį naudojant Edge Function
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
 */
export async function generateStoryImages(
  userId: string,
  storyId: string,
  storyText: string,
  maxMinutes: number,
  age: number,
  artStyle: ArtStyle = 'watercolor',
  onProgress?: (current: number, total: number) => void
): Promise<{
  characters: CharacterDescription[];
  scenes: Scene[];
  images: Array<{ imageUrl: string; prompt: string; sceneIndex: number; sceneText: string }>;
}> {
  console.log('[ImageGen] Starting story image generation via Edge Functions...');

  // 1 žingsnis: apskaičiuoti paveikslėlių skaičių
  const imageCount = calculateImageCount(storyText, maxMinutes, age);
  console.log('[ImageGen] Target image count:', imageCount);

  // 2 žingsnis: išgauti veikėjus ir analizuoti scenas
  console.log('[ImageGen] Analyzing story via Edge Function...');
  const { characters, scenes } = await analyzeScenes(userId, storyText, imageCount, age);
  console.log('[ImageGen] Found characters:', characters.map(c => c.name));
  console.log('[ImageGen] Found scenes:', scenes.length);

  // 3 žingsnis: sugeneruoti paveikslėlius kiekvienai scenai
  console.log('[ImageGen] Generating images...');
  const images: Array<{ imageUrl: string; prompt: string; sceneIndex: number; sceneText: string }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress?.(i + 1, scenes.length);

    try {
      const prompt = buildImagePrompt(scene, characters, artStyle);
      console.log(`[ImageGen] Generating image ${i + 1}/${scenes.length}...`);

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
        prompt,
        sceneIndex: scene.index,
        sceneText: scene.text,
      });

      console.log(`[ImageGen] Image ${i + 1} generated successfully`);
    } catch (error) {
      console.error(`[ImageGen] Failed to generate image ${i + 1}:`, error);
    }
  }

  console.log('[ImageGen] Completed. Generated', images.length, 'images');

  return {
    characters,
    scenes,
    images,
  };
}
