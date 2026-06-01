# Pregenerated Story Generation Plan

## Voice Settings (ElevenLabs)

**Speed range**: 0.7 (slowest) to 1.2 (fastest)
- Use `speed: 0.7` for ALL bedtime stories (slowest possible)
- Values below 0.7 are INVALID and get ignored!

**Required settings**:
```json
{
  "model_id": "eleven_v3",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "speed": 0.7
  }
}
```

**Required text prefix**: Always start story with `[in lithuanian language]`

## Expressive Audio Tags

Must use throughout story for natural, engaging narration:

| Tag | Use for |
|-----|---------|
| `[softly]` | Calm moments, beginning, ending |
| `[whispers]` | Secrets, sleepy moments, ending |
| `[warmly]` | Loving moments, comfort |
| `[excited]` | Happy discoveries, surprises |
| `[playfully]` | Fun moments, games (younger kids) |
| `[giggles]` | Funny moments |
| `[yawns]` | Ending, sleepy time |
| `[nervously]` | Mild tension (older kids only) |
| `[mysteriously]` | Magic, wonder |

**Distribution**:
- Start: `[in lithuanian language]` + `[softly]`
- Middle: Mix of `[excited]`, `[warmly]`, `[whispers]`, `[playfully]`
- End: `[softly]` + `[yawns]` + `[whispers]`

## Age-Based Story Structure

All stories have **7 paragraphs** separated by `...`

### Ages 1-2 (Toddlers)
- **Sentences per paragraph**: 1-2 (very short)
- **Total words**: ~150-200
- **Vocabulary**: Very simple, everyday words
- **Themes**: family, animals, bedtime routines
- **Structure**: Repetitive patterns, familiar objects
- **Tags**: Heavy use of `[playfully]`, `[warmly]`, `[giggles]`

### Ages 3-4 (Preschool)
- **Sentences per paragraph**: 2-3 (short)
- **Total words**: ~250-350
- **Vocabulary**: Simple, concrete nouns
- **Themes**: animals, friendship, nature, dreams
- **Structure**: Simple cause-effect, one main character
- **Tags**: Mix of `[playfully]`, `[excited]`, `[warmly]`

### Ages 5-6 (Early School)
- **Sentences per paragraph**: 3-4 (medium)
- **Total words**: ~400-500
- **Vocabulary**: Expanded, some descriptive words
- **Themes**: adventure, space, fairy tales, friendship
- **Structure**: Clear problem → solution arc
- **Tags**: More `[excited]`, `[mysteriously]`, `[whispers]`

### Ages 7-8 (School Age)
- **Sentences per paragraph**: 4-5 (longer)
- **Total words**: ~500-650
- **Vocabulary**: Rich, varied adjectives
- **Themes**: adventure, fantasy, courage, helping others
- **Structure**: More complex plot with mild tension
- **Tags**: Full range including `[nervously]`, `[mysteriously]`

## Story Text Template

```
[in lithuanian language] [softly] {Opening paragraph - introduce character and setting}

...

[warmly/excited] {Paragraph 2 - something happens}

...

[excited/playfully] {Paragraph 3 - adventure begins}

...

[whispers/mysteriously] {Paragraph 4 - main event}

...

[warmly/excited] {Paragraph 5 - climax/resolution}

...

[warmly] {Paragraph 6 - return home/comfort}

...

[softly] [yawns] {Paragraph 7 - sleep/goodnight}. [whispers] Labanakt.
```

## Image Generation

- **Count**: 7 images (1 per paragraph)
- **Size**: 1024x1536 (portrait for mobile)
- **Quality**: medium
- **Style**: watercolor (default), cartoon (toddlers), storybook, dreamy

**Use existing pipeline**:
```typescript
const characters = await extractCharacters(storyText);
const scenes = await analyzeScenes(storyText, 7, characters);
const prompt = buildImagePrompt(scene, characters, artStyle);
const { base64 } = await generateImage(prompt, 'medium');
```

## Database Target

Save to `pregenerated_stories` table (NOT `stories`):
- Use MCP `execute_sql` for inserts (RLS blocks anon key)
- Images to `pregenerated_story_images` table

## Checklist Before Generation

- [ ] Story starts with `[in lithuanian language]`
- [ ] Story has exactly 7 paragraphs separated by `...`
- [ ] Expressive tags used throughout
- [ ] Paragraph length matches target age
- [ ] Story ends with `[yawns]` and `[whispers] Labanakt`
- [ ] Voice speed set to 0.7
- [ ] Voice is Sarah (EXAVITQu4vr4xnSDxMaL)
