# API Reference - ElevenLabs & OpenAI

Quick reference for implementing the Bedtime Stories app.

---

## ElevenLabs API

### Installation

```bash
npm install elevenlabs
# or
npm install @elevenlabs/elevenlabs-js
```

### Client Setup

```typescript
import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
});
```

---

### Available Models

| Model ID | Name | Best For | Lithuanian |
|----------|------|----------|------------|
| `eleven_v3` | Eleven v3 (Alpha) | Most expressive, audio tags, emotions | Yes (70+ languages) |
| `eleven_multilingual_v2` | Multilingual v2 | Stable, high quality | Yes (32 languages) |
| `eleven_flash_v2_5` | Flash v2.5 | Low latency (75ms), real-time | Yes (32 languages) |

**Recommendation for this app**: Use `eleven_multilingual_v2` for stability, or `eleven_v3` for more expressive storytelling.

---

### Text-to-Speech API

**Endpoint**: `POST /v1/text-to-speech/{voice_id}`

#### SDK Usage

```typescript
const audio = await elevenlabs.textToSpeech.convert(voiceId, {
  text: "Labas vakaras, mažyli. Šiandien papasakosiu tau pasaką...",
  model_id: "eleven_multilingual_v2", // or "eleven_v3"
  language_code: "lt", // Lithuanian ISO 639-1 code
  voice_settings: {
    stability: 0.5,        // 0-1, higher = more consistent
    similarity_boost: 0.75, // 0-1, higher = closer to original voice
    style: 0,              // 0-1, exaggeration amount
    speed: 0.9,            // Slower for bedtime stories
    use_speaker_boost: true,
  },
});

// audio is a ReadableStream, save to file or stream to client
```

#### Raw API Request

```typescript
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: storyText,
      model_id: "eleven_multilingual_v2",
      language_code: "lt",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.9,
      },
    }),
  }
);

const audioBlob = await response.blob();
```

#### Output Formats

| Format | Quality | Size |
|--------|---------|------|
| `mp3_44100_128` | High (default) | Larger |
| `mp3_22050_32` | Low | Smaller |
| `mp3_44100_64` | Medium | Balanced |

---

### Instant Voice Cloning (IVC)

**Endpoint**: `POST /v1/voices/add`

#### Audio Requirements

- **Duration**: 1-2 minutes optimal (minimum 30 seconds)
- **Quality**: Clear audio, no background noise, no reverb
- **Format**: MP3, WAV, M4A
- **Max file size**: 10MB per sample
- **Max samples**: 1-25 files

#### SDK Usage

```typescript
import { createReadStream } from "fs";
import * as fs from "fs";

async function createVoiceClone(name: string, audioFilePath: string) {
  const audioStream = createReadStream(audioFilePath);

  const voice = await elevenlabs.voices.ivc.create({
    name: name, // e.g., "Mama" or "Tėtis"
    files: [audioStream],
    removeBackgroundNoise: true,
    description: "Parent voice for bedtime stories",
  });

  return voice; // Contains voice.voice_id
}
```

#### React Native / Expo (with FormData)

```typescript
async function createVoiceCloneFromUri(name: string, audioUri: string) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("remove_background_noise", "true");
  formData.append("description", "Parent voice for bedtime stories");

  // For Expo, convert URI to blob
  const response = await fetch(audioUri);
  const blob = await response.blob();
  formData.append("files", blob, "recording.m4a");

  const result = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  const voice = await result.json();
  return voice.voice_id;
}
```

#### Response

```json
{
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "name": "Mama",
  "category": "cloned"
}
```

---

### Delete Voice

```typescript
await elevenlabs.voices.delete(voiceId);
```

---

### Eleven v3 Audio Tags (Optional Enhancement)

For more expressive storytelling with v3 model:

```typescript
const storyWithTags = `
[soft, gentle] Labas vakaras, ${childName}.
[whispers] Ar esi pasiruošęs miego pasakai?
[warm smile] Šiandien papasakosiu tau apie mažą zuikutį...
[pause]
[curious] Zuikutis gyveno giliai miške...
`;

const audio = await elevenlabs.textToSpeech.convert(voiceId, {
  text: storyWithTags,
  model_id: "eleven_v3", // Required for audio tags
  language_code: "lt",
});
```

**Available tags**:
- Emotions: `[happy]`, `[sad]`, `[excited]`, `[curious]`, `[gentle]`
- Delivery: `[whispers]`, `[soft]`, `[warm]`
- Timing: `[pause]`, `[slow]`, `[rushed]`

---

## OpenAI API

### Installation

```bash
npm install openai
```

### Client Setup

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});
```

---

### Available Models

| Model | Best For | Cost |
|-------|----------|------|
| `gpt-4o` | Best quality, multimodal | Higher |
| `gpt-4o-mini` | Fast, cost-effective | Lower |
| `gpt-4.1-2025-04-14` | Latest GPT-4.1 | Medium |

**Recommendation**: Use `gpt-4o-mini` for story generation (good quality, lower cost).

---

### Chat Completions API

**Endpoint**: `POST /v1/chat/completions`

#### SDK Usage

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: `Tu esi vaikų pasakų rašytojas. Rašai lietuviškai.

Taisyklės:
- Rašyk tik lietuvių kalba
- Pasakos turi būti tinkamos vaikams
- Naudok vardo ${childName} pasakoje
- Jokio smurto ar baimę keliančio turinio
- Nenaudok Disnėjaus ar kitų apsaugotų personažų
- Pabaigoje vaikas turi ruoštis miegoti`,
    },
    {
      role: "user",
      content: `Sukurk ${maxMinutes} minučių miego pasaką.

Vaikui:
- Vardas: ${child.name}
- Amžius: ${child.age} metai
- Pomėgiai: ${child.interests.join(", ")}
- Mėgstami gyvūnai: ${child.favorite_animals.join(", ")}

Tema: ${theme.name_lt}`,
    },
  ],
  max_completion_tokens: maxMinutes === 3 ? 1500 : 2500,
  temperature: 0.8, // Higher for creativity
});

const story = completion.choices[0].message.content;
```

#### Streaming (for progressive display)

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  stream: true,
});

let story = "";
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  story += content;
  // Update UI progressively
}
```

---

### Story Generation Function

```typescript
interface Child {
  name: string;
  age: number;
  interests: string[];
  favorite_animals: string[];
  favorite_colors: string[];
}

interface Theme {
  id: string;
  name_lt: string;
  prompt_hint: string;
}

async function generateStory(
  child: Child,
  theme: Theme,
  maxMinutes: number = 5
): Promise<string> {
  const systemPrompt = `Tu esi vaikų pasakų rašytojas lietuvių kalba.

GRIEŽTOS TAISYKLĖS:
1. Rašyk TIK lietuvių kalba
2. Pasaka turi būti tinkama ${child.age} metų vaikui
3. Trukmė: apie ${maxMinutes} minutes skaitymo (${maxMinutes * 150} žodžių)
4. DRAUDŽIAMA: smurtas, baimę keliantis turinys, Disnėjaus personažai
5. Istorija turi baigtis ramiai, vaikui ruošiantis miegoti
6. Naudok vaiko vardą "${child.name}" istorijoje`;

  const userPrompt = `Sukurk miego pasaką.

VAIKAS:
- Vardas: ${child.name}
- Amžius: ${child.age}
- Pomėgiai: ${child.interests.join(", ") || "įvairūs"}
- Mėgstami gyvūnai: ${child.favorite_animals.join(", ") || "visi"}

TEMA: ${theme.name_lt}
${theme.prompt_hint ? `UŽUOMINA: ${theme.prompt_hint}` : ""}

Pradėk pasaką tiesiogiai, be pavadinimo.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: maxMinutes === 3 ? 1500 : 2500,
    temperature: 0.85,
  });

  return completion.choices[0].message.content || "";
}
```

---

### Content Safety Filter

```typescript
async function isContentSafe(text: string): Promise<boolean> {
  const moderation = await openai.moderations.create({
    input: text,
  });

  const result = moderation.results[0];

  // Check all categories
  const flagged = result.flagged;
  const categories = result.categories;

  // Extra strict for children's content
  if (flagged || categories.violence || categories.sexual || categories["self-harm"]) {
    return false;
  }

  return true;
}
```

---

## Complete Flow Example

```typescript
async function createBedtimeStory(
  child: Child,
  theme: Theme,
  voiceId: string,
  isSubscriber: boolean
) {
  const maxMinutes = isSubscriber ? 5 : 3;

  // 1. Generate story with OpenAI
  const storyText = await generateStory(child, theme, maxMinutes);

  // 2. Check content safety
  const isSafe = await isContentSafe(storyText);
  if (!isSafe) {
    throw new Error("Generated content failed safety check");
  }

  // 3. Generate audio with ElevenLabs
  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text: storyText,
    model_id: "eleven_multilingual_v2",
    language_code: "lt",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      speed: 0.9,
    },
  });

  // 4. Save audio to Supabase Storage
  const audioBuffer = await streamToBuffer(audio);
  const fileName = `stories/${child.id}/${Date.now()}.mp3`;

  const { data, error } = await supabase.storage
    .from("audio")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
    });

  // 5. Save story metadata to database
  const { data: story } = await supabase.from("stories").insert({
    child_id: child.id,
    voice_profile_id: voiceId,
    title: `${theme.name_lt} - ${new Date().toLocaleDateString("lt")}`,
    content: storyText,
    theme: theme.id,
    audio_url: data?.path,
  });

  return story;
}
```

---

## Environment Variables

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# ElevenLabs
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_...
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=default-voice-id (optional)
```

---

## Sources

- [ElevenLabs TTS API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs Voice Cloning](https://elevenlabs.io/docs/creative-platform/voices/voice-cloning)
- [ElevenLabs Models](https://elevenlabs.io/docs/models)
- [ElevenLabs v3 Audio Tags](https://elevenlabs.io/blog/v3-audiotags)
- [ElevenLabs JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js)
- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [OpenAI Models](https://platform.openai.com/docs/models)
