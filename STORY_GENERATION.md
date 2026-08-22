# Story Generation Pipeline

This document explains how stories are created in the MamosBalsas app.

## Overview

Stories are generated using a multi-step pipeline that runs in parallel for speed:
- **Text**: OpenAI GPT-4o-mini (Lithuanian)
- **Audio**: ElevenLabs v3 TTS with voice cloning
- **Images**: OpenAI gpt-image-1 (DALL-E)

**Cost per story**: ~$0.16 (with 7 images)
**Generation time**: ~90-120 seconds

## Pipeline Steps

### 1. Story Text Generation (`lib/openai.ts`)

```
generateStoryText(age, theme, maxMinutes)
```

- Model: `gpt-4o-mini`
- Language: Lithuanian only
- Structure: **Exactly 7 paragraphs** separated by `...`
- **Must start with**: `[in lithuanian language]` tag
- Audio tags throughout: `[whispers]`, `[softly]`, `[yawns]`, `[excited]`, `[warmly]`, `[playfully]`, `[giggles]`

**Story structure:**
1. Introduction - who and where
2. What happened
3. Journey begins
4. Adventure
5. Climax
6. Return
7. Peace and sleep (end with `[yawns]` and `[whispers] Labanakt`)

### Age-Based Paragraph Length

| Age | Sentences/Paragraph | Total Words | Themes |
|-----|---------------------|-------------|--------|
| 1-2 | 1-2 (very short) | 150-200 | family, animals, routines |
| 3-4 | 2-3 (short) | 250-350 | animals, friendship, nature |
| 5-6 | 3-4 (medium) | 400-500 | adventure, space, fairy tales |
| 7-8 | 4-5 (longer) | 500-650 | adventure, fantasy, courage |

### 2. Character Extraction (`lib/imageGeneration.ts`)

```
extractCharacters(storyText) → CharacterDescription[]
```

Analyzes story text and extracts detailed visual descriptions:
- Name, type (animal/person/creature)
- Appearance: size, color, texture, eyes, distinctive features
- Clothing (if any)

This ensures **character consistency** across all images.

### 3. Scene Analysis (`lib/imageGeneration.ts`)

```
analyzeScenes(storyText, imageCount, characters) → Scene[]
```

- **1 paragraph = 1 scene = 1 image**
- Each scene has: text, visual description, characters present, mood
- Returns exactly 7 scenes (matching 7 paragraphs)

### 4. Image Generation (`lib/imageGeneration.ts`)

```
generateImage(prompt, quality) → { base64 }
```

- Model: `gpt-image-1`
- Size: `1024x1536` (portrait for mobile fullscreen)
- Quality: `low` (~$0.02/image)
- All 7 images generated **in parallel**

**Art styles available:**
- `watercolor` - Soft watercolor, wet-on-wet, pastel palette
- `cartoon` - Disney-Pixar inspired 3D, bold colors
- `storybook` - Classic Beatrix Potter style, fine linework
- `dreamy` - Magical night scene, purple/blue palette, glowing stars

### 5. Audio Generation (`lib/elevenlabs.ts`)

```
textToSpeech(text, voiceId, { speed }) → audioPath
```

- Model: `eleven_v3` (supports Lithuanian + audio tags)
- **Speed range**: 0.7 (slowest) to 1.2 (fastest)
- Voice settings: `stability: 0.5`, `similarity_boost: 0.75`

**IMPORTANT**: Speed values below 0.7 are INVALID and get ignored by ElevenLabs!

#### Age-Based Voice Selection (`lib/storyFormats.ts`)

When no custom voice profile is provided, the app automatically selects the best voice based on age:

| Age | Voice | ID | Speed | Style |
|-----|-------|-----|-------|-------|
| 0-3 | **AImee** | `GL7nHO5mDrxcHlJPJK5T` | 0.7 | ASMR Whisper (slowest, calmest) |
| 3-5 | **Natasha** | `j05EIz3iI3JmBTWC3CsA` | 0.75 | Whispery ASMR |
| 5-7 | **Lily** | `pFZP5JQG7iQjIQuC4Bku` | 0.8 | Velvety Storyteller |
| 8+ | **Sarah** | `EXAVITQu4vr4xnSDxMaL` | 0.85 | Clear & Engaging |

```typescript
import { getVoiceForAge } from '@/lib/storyFormats';

const voice = getVoiceForAge(age);
// voice = { id: 'GL7nHO5mDrxcHlJPJK5T', name: 'AImee', speed: 0.7 }

await textToSpeech(text, voice.id, { speed: voice.speed });
```

Voice settings:
```typescript
voice_settings: {
  stability: 0.5,
  similarity_boost: 0.75,
  speed: voice.speed  // Age-appropriate speed (0.7-0.85)
}
```

#### ⚠️ ElevenLabs v3 Pause Limitation

**v3 does NOT support exact pauses!** The `...` markers and `[long pause]` tags are AI-interpreted and inconsistent.

| Method | What Happens |
|--------|--------------|
| `...` (ellipsis) | ~0.5s pause, inconsistent |
| `[long pause]` | Variable duration, AI-interpreted |
| `<break time="2s"/>` | **NOT SUPPORTED in v3** |

For pregenerated stories that need exact pauses, use the **per-paragraph generation** approach (see below).

### 6. Content Safety Check

```
isContentSafe(text) → boolean
```

- Uses OpenAI Moderation API
- Extra strict for children's content
- Runs **in parallel** with images/audio

## Audio Tags Reference

| Tag | Use for |
|-----|---------|
| `[in lithuanian language]` | **Required** at story start |
| `[softly]` | Calm moments, beginning, ending |
| `[whispers]` | Secrets, sleepy moments, ending |
| `[warmly]` | Loving moments, comfort |
| `[excited]` | Happy discoveries, surprises |
| `[playfully]` | Fun moments, games |
| `[giggles]` | Funny moments |
| `[yawns]` | Ending, sleepy time |

**Tag distribution:**
- Start: `[in lithuanian language]` + `[softly]`
- Middle: Mix of `[excited]`, `[warmly]`, `[whispers]`, `[playfully]`
- End: `[softly]` + `[yawns]` + `[whispers]`

## Parallel Execution Flow

```
Story Text Generated
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
   TRACK A            TRACK B            TRACK C
   Images             Audio              Safety
        │                  │                  │
   extractChars        TTS API           Moderation
        │                  │                  │
   analyzeScenes          ▼                  ▼
        │             audioPath           isSafe
        ▼
   generateImage x7
   (parallel)
        │
        ▼
   images[]
        │
        └──────────────────┴──────────────────┘
                           │
                           ▼
                    Upload & Save
```

## Storage

All assets stored in Supabase Storage:
- **Audio**: `audio/{user_id}/{timestamp}.mp3` or `audio/pregenerated/{timestamp}.mp3`
- **Images**: `story-images/{user_id}/{story_id}/{index}.png` or `story-images/pregenerated/{story_id}/{index}.png`
- **Thumbnail**: First image (scene_index 0)

## Database Schema

**stories table** (user-generated):
- `title`, `content`, `theme`
- `audio_url`, `thumbnail_url`
- `duration_seconds`
- `character_descriptions` (JSON)
- `image_style`

**pregenerated_stories table** (public stories):
- `title`, `content`, `theme`, `target_age`
- `audio_url`, `thumbnail_url`
- `duration_seconds`
- `voice_id`, `voice_name`
- `image_style`
- `paragraph_end_times` (REAL[]) - exact timestamps for audio sync
- `is_active`, `sort_order`

**story_images / pregenerated_story_images tables:**
- `story_id`, `image_url`
- `scene_index`, `scene_text`
- `prompt` (for debugging)

## Audio-Image Sync

The `ImmersiveStoryPlayer` syncs images with audio using this priority:

1. **Exact timestamps** (`paragraph_end_times`) - most accurate
2. **Estimated thresholds** - based on character count
3. **Equal division** - fallback

### Per-Paragraph Audio Generation (Recommended for Pregenerated)

Since ElevenLabs v3 doesn't support exact pauses, use **per-paragraph generation**:

```bash
# Regenerate existing story with proper 2s pauses
npx ts-node scripts/regenerate-story-audio.ts <story-id>

# Generate new story from scratch with pauses
npx ts-node scripts/generate-proper-story.ts
```

**How it works:**
1. Split story into paragraphs (by `...` markers)
2. Generate audio for EACH paragraph separately
3. Concatenate with exact 2s silence using ffmpeg
4. Calculate `paragraph_end_times` from actual durations
5. Upload and update database

**Requirements:** `brew install ffmpeg`

**IMPORTANT - Use mono audio for silence:**
ElevenLabs generates mono audio. When creating silence with ffmpeg, you MUST use `cl=mono`:

```bash
# Correct (mono) - works
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 silence.mp3

# Wrong (stereo) - breaks audio playback!
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 2 silence.mp3
```

Mixing mono voice audio with stereo silence corrupts the concatenated file and causes audio position to stop updating in the player.

### Example Output

```
Paragraph durations:
  1. 8.44s → ends at 8.4s
  2. 6.61s → ends at 17.0s  (8.4 + 2s pause + 6.6)
  3. 8.99s → ends at 28.0s
  ...

paragraph_end_times = ARRAY[8.4, 17, 28, 38.2, 50.1, 60.9, 74.8]
```

### Manual Timestamps (Fallback)

If not using per-paragraph generation, manually set timestamps:

```sql
UPDATE pregenerated_stories
SET paragraph_end_times = ARRAY[11, 22, 34, 45, 56, 68, 79]
WHERE id = 'story-uuid';
```

Listen to the audio and note when each paragraph ends.

## Key Files

| File | Purpose |
|------|---------|
| `lib/openai.ts` | Story text generation, exports image functions |
| `lib/imageGeneration.ts` | Character extraction, scene analysis, image generation |
| `lib/elevenlabs.ts` | TTS and voice cloning |
| `hooks/useStories.ts` | Orchestrates the full pipeline, handles uploads |
| `app/story/generating.tsx` | UI during generation, progress display |
| `components/ImmersiveStoryPlayer.tsx` | Fullscreen player with sync logic |
| `scripts/regenerate-story-audio.ts` | Regenerate existing story audio with exact 2s pauses |
| `scripts/generate-proper-story.ts` | Generate new pregenerated story (7 paragraphs, 2s pauses, auto DB insert) |
| `scripts/PREGENERATED_STORY_PLAN.md` | Guidelines for pregenerated stories |

## Generation Modes

Set in `app/story/generating.tsx`:

```typescript
const GENERATION_MODE: GenerationMode = 'with_images';
```

- `test` - Mock story, real audio only (for testing ElevenLabs)
- `text_only` - Real story, no images (~$0.01/story)
- `with_images` - Full story with images (~$0.16/story)

## Player

`components/ImmersiveStoryPlayer.tsx`:
- Fullscreen with page-flip transitions
- Swipe left/right to navigate images
- 1 paragraph = 1 image = 1 subtitle
- Audio syncs with image changes (using timestamps or estimation)
- Visual effects: particles, sparkles, sun/moon

## Quick Reference

**To generate a story programmatically:**

```typescript
import { useStories } from '@/hooks/useStories';

const { createStoryWithImages } = useStories();

const story = await createStoryWithImages(
  5,                    // age
  theme,                // StoryTheme object
  voiceProfileId,       // optional
  'watercolor',         // artStyle
  (step, current, total) => { /* progress callback */ }
);
```

**To generate just text:**

```typescript
import { generateStoryText } from '@/lib/openai';

const { title, content } = await generateStoryText(age, theme, maxMinutes);
```

**To generate images for existing text:**

```typescript
import { extractCharacters, analyzeScenes, buildImagePrompt, generateImage } from '@/lib/openai';

const characters = await extractCharacters(storyText);
const scenes = await analyzeScenes(storyText, 7, characters);

for (const scene of scenes) {
  const prompt = buildImagePrompt(scene, characters, 'watercolor');
  const { base64 } = await generateImage(prompt, 'low');
}
```

## Pregenerated Story Checklist

Before generating a public story:

- [ ] Story starts with `[in lithuanian language]`
- [ ] Story has **exactly 7 paragraphs** separated by `...` (must match image count!)
- [ ] Expressive tags used throughout (`[softly]`, `[whispers]`, `[excited]`, etc.)
- [ ] Paragraph length matches target age
- [ ] Story ends with `[yawns]` and `[whispers] Labanakt`

After writing the story:

- [ ] Generate using `npx ts-node scripts/generate-proper-story.ts` (creates audio, images, inserts to DB)
- [ ] Or regenerate audio only: `npx ts-node scripts/regenerate-story-audio.ts <story-id>`
- [ ] This automatically creates **2s pauses** between paragraphs (using mono silence)
- [ ] This automatically sets accurate `paragraph_end_times`
- [ ] Verify paragraph count matches image count (both should be 7)
