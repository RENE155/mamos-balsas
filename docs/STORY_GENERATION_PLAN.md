# Story Generation with Images - Implementation Plan

## Overview

This document outlines the implementation of real story generation using OpenAI APIs:
- **Text Generation**: GPT-4o-mini (cheapest, best quality ratio)
- **Image Generation**: gpt-image-1 with LOW quality (~$0.01/image)

## Cost Analysis

### Per Story Cost Estimate

| Component | Model | Quality | Est. Cost |
|-----------|-------|---------|-----------|
| Story text | gpt-4o-mini | - | ~$0.002 |
| Title generation | gpt-4o-mini | - | ~$0.0005 |
| Character extraction | gpt-4o-mini | - | ~$0.001 |
| Scene analysis | gpt-4o-mini | - | ~$0.001 |
| Images (5 avg) | gpt-image-1 | low | ~$0.055 |
| Audio (ElevenLabs) | - | - | ~$0.10 |
| **Total per story** | | | **~$0.16** |

### Image Pricing (gpt-image-1)

| Quality | 1024×1024 | Notes |
|---------|-----------|-------|
| Low | $0.011 | **We use this** - good for illustrations |
| Medium | $0.042 | Better detail |
| High | $0.166 | Photorealistic |

## Architecture

### New Database Schema

```sql
-- Story images table
CREATE TABLE story_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scene_index INTEGER NOT NULL,
  scene_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add character_descriptions to stories for consistency
ALTER TABLE stories ADD COLUMN character_descriptions JSONB;
ALTER TABLE stories ADD COLUMN image_style TEXT DEFAULT 'children_book_illustration';
```

### Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORY GENERATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GENERATE STORY TEXT (gpt-4o-mini)                          │
│     └─> Lithuanian bedtime story                                │
│                                                                 │
│  2. EXTRACT CHARACTERS (gpt-4o-mini)                           │
│     └─> Detailed visual descriptions for consistency            │
│     └─> Name, appearance, clothing, colors, features            │
│                                                                 │
│  3. ANALYZE SCENES (gpt-4o-mini)                               │
│     └─> Split story into visual scenes                          │
│     └─> Calculate image count based on length                   │
│     └─> Extract key visual moments                              │
│                                                                 │
│  4. GENERATE IMAGE PROMPTS (gpt-4o-mini)                       │
│     └─> Include character descriptions in each prompt           │
│     └─> Consistent art style specification                      │
│     └─> Scene-specific details                                  │
│                                                                 │
│  5. GENERATE IMAGES (gpt-image-1, low quality)                 │
│     └─> One image per scene                                     │
│     └─> Upload to Supabase storage                              │
│                                                                 │
│  6. GENERATE AUDIO (ElevenLabs)                                │
│     └─> Text-to-speech with selected voice                      │
│                                                                 │
│  7. SAVE TO DATABASE                                           │
│     └─> Story, images, audio URL                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Character Consistency Strategy

### Character Description Template

For each character, we extract:

```json
{
  "name": "Mažasis Lokiukas",
  "type": "bear cub",
  "appearance": {
    "size": "small, about the size of a pillow",
    "fur_color": "warm honey brown",
    "fur_texture": "soft and fluffy",
    "eyes": "big, round, dark brown eyes with a gentle expression",
    "nose": "small black button nose",
    "ears": "round fuzzy ears"
  },
  "clothing": {
    "item": "cozy red knitted scarf",
    "details": "with white snowflake pattern"
  },
  "distinctive_features": [
    "tiny white patch on chest shaped like a star",
    "always slightly tilted head when curious"
  ]
}
```

### Image Prompt Structure

Every image prompt follows this template:

```
[ART STYLE]: Soft watercolor children's book illustration style,
warm pastel colors, gentle lighting, dreamy atmosphere,
suitable for bedtime story.

[CHARACTERS IN SCENE]:
- [Full character description from character bible]

[SCENE DESCRIPTION]:
[What is happening in this specific scene]

[MOOD]: Calm, cozy, magical, sleepy

[IMPORTANT]: Maintain exact character appearances as described.
No text or words in the image.
```

## Image Count Calculation

```javascript
function calculateImageCount(storyText: string, maxMinutes: number): number {
  const wordCount = storyText.split(/\s+/).length;

  // Base: 1 image per ~100 words
  let imageCount = Math.ceil(wordCount / 100);

  // Adjust based on story length
  if (maxMinutes <= 3) {
    imageCount = Math.min(imageCount, 5);  // Short: max 5 images
  } else {
    imageCount = Math.min(imageCount, 10); // Long: max 10 images
  }

  // Minimum 3 images for any story
  return Math.max(3, imageCount);
}
```

## Implementation Steps

### Phase 1: Database Setup
- [ ] Create `story_images` table via migration
- [ ] Add `character_descriptions` column to stories
- [ ] Add `image_style` column to stories
- [ ] Update TypeScript types

### Phase 2: Story Generation Enhancement
- [ ] Update `generateStory()` to return structured content
- [ ] Add `extractCharacters()` function
- [ ] Add `analyzeScenes()` function
- [ ] Add `generateImagePrompts()` function

### Phase 3: Image Generation
- [ ] Create `generateStoryImage()` function using gpt-image-1
- [ ] Implement image upload to Supabase storage
- [ ] Handle errors and retries

### Phase 4: Integration
- [ ] Update `useStories` hook with new flow
- [ ] Update generating screen with progress
- [ ] Update story view to display images

### Phase 5: Testing
- [ ] Test character extraction with sample story
- [ ] Test 2-3 images for character consistency
- [ ] Verify full flow before enabling production

## File Changes

### New Files
- `lib/imageGeneration.ts` - Image generation functions

### Modified Files
- `lib/openai.ts` - Enhanced story generation
- `hooks/useStories.ts` - Updated creation flow
- `types/index.ts` - New types
- `app/story/generating.tsx` - Progress UI
- `app/story/[id].tsx` - Display images

## API Functions

### `extractCharacters(storyText: string)`

```typescript
interface CharacterDescription {
  name: string;
  type: string;
  appearance: {
    size: string;
    mainColor: string;
    texture: string;
    eyes: string;
    distinctiveFeatures: string[];
  };
  clothing?: {
    item: string;
    color: string;
    details: string;
  };
}

async function extractCharacters(storyText: string): Promise<CharacterDescription[]>
```

### `analyzeScenes(storyText: string, maxImages: number)`

```typescript
interface Scene {
  index: number;
  text: string;
  visualDescription: string;
  characters: string[];  // Names of characters in scene
  mood: string;
}

async function analyzeScenes(storyText: string, maxImages: number): Promise<Scene[]>
```

### `generateImagePrompt(scene: Scene, characters: CharacterDescription[])`

```typescript
async function generateImagePrompt(
  scene: Scene,
  characters: CharacterDescription[],
  artStyle: string
): Promise<string>
```

### `generateImage(prompt: string)`

```typescript
interface GeneratedImage {
  base64: string;
  prompt: string;
}

async function generateImage(prompt: string): Promise<GeneratedImage>
```

## Art Style Options

```typescript
const ART_STYLES = {
  watercolor: "Soft watercolor children's book illustration, gentle brushstrokes, pastel colors",
  cartoon: "Cute cartoon style, bright colors, rounded shapes, friendly characters",
  storybook: "Classic storybook illustration, detailed but soft, warm lighting",
  dreamy: "Dreamy ethereal style, soft focus, magical glow, muted colors",
};
```

## Error Handling

1. **Image generation fails**:
   - Retry up to 2 times
   - If still fails, continue without that image
   - Log error for debugging

2. **Character extraction fails**:
   - Use generic descriptions
   - Continue with generation

3. **Scene analysis fails**:
   - Fall back to simple paragraph splitting
   - Generate fewer images

## Testing Plan

### Test 1: Character Extraction
```
Input: Short test story with 2 characters
Expected: JSON with detailed character descriptions
Verify: Descriptions are detailed and consistent
```

### Test 2: Image Generation (2-3 images)
```
Input: Character descriptions + scene
Expected: Images with consistent character appearance
Verify: Same character looks similar across images
```

### Test 3: Full Flow (Dry Run)
```
Input: Real story generation
Expected: Complete story with 3-5 images
Verify: All images match story scenes
Cost: ~$0.06 for images
```

### Test 4: Production Run
```
After all tests pass, enable full generation
Monitor first few stories closely
```

## Cost Control Measures

1. **Always use LOW quality** for images
2. **Cap at 10 images** per story maximum
3. **Use gpt-4o-mini** for all text operations
4. **Cache character descriptions** for potential re-generation
5. **Log all API costs** for monitoring

## Progress UI Updates

```
Generating screen steps:
1. "Rašoma pasaka..." (0-30%)
2. "Analizuojami veikėjai..." (30-40%)
3. "Kuriamos scenos..." (40-50%)
4. "Generuojami paveikslėliai..." (50-80%)
   - Show X/Y progress
5. "Generuojamas balsas..." (80-95%)
6. "Išsaugoma..." (95-100%)
```

## Rollback Plan

If issues arise:
1. Set `ENABLE_IMAGE_GENERATION=false` env var
2. Stories will generate with text + audio only
3. No images stored, no additional cost

## Sources

- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [GPT-image-1 Pricing Details](https://community.openai.com/t/gpt-image-1-collected-pricing-information-and-why-responses-is-undocumented/1275254)
- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation)
- [OpenAI Cookbook - Generate Images](https://cookbook.openai.com/examples/generate_images_with_gpt_image)
