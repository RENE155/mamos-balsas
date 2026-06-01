# MamosBalsas

**MamosBalsas** – personalizuotų vaikų miego pasakų programėlė su tėvų balso klonavimu. Programėlė su dirbtiniu intelektu (OpenAI) generuoja lietuviškas pasakas ir įgarsina jas tikru mamos ar tėčio balsu (ElevenLabs balso klonavimas), kad vaikas užmigtų girdėdamas artimo žmogaus balsą.

> ℹ️ Tai portfolio variantas. Visi slapti raktai ir asmeniniai balso įrašai pašalinti – savo konfigūracijai naudokite `.env.example`.

## Parsisiųsti

- [App Store](https://apps.apple.com/us/app/mamosbalsas/id6757326945)

## Funkcionalumas

- 🧒 Vaiko profiliai (vardas, amžius, pomėgiai) – pasakos pritaikomos pagal amžių
- ✨ Pasakų generavimas su OpenAI (lietuvių kalba)
- 🎙️ Balso klonavimas ir įgarsinimas su ElevenLabs – pasaka skaitoma mamos/tėčio balsu
- 🔊 Garso atkūrimas programėlėje (`expo-audio` / `expo-av`)
- 👤 Autentifikacija (Supabase, Apple)
- 💳 Prenumeratos per „RevenueCat"

## Technologijos

Expo 54, React Native 0.81, React 19, expo-router, TypeScript, Supabase, OpenAI, ElevenLabs, RevenueCat.

## Struktūra

```
app/         # ekranai ir maršrutai (expo-router)
components/  # daugkartinio naudojimo komponentai
context/     # React kontekstai (autentifikacija, pirkimai ...)
lib/         # integracijos (Supabase, OpenAI, ElevenLabs ...)
hooks/       # custom hooks
constants/   # konstantos ir temos
scripts/     # pagalbiniai / kūrimo skriptai
supabase/    # duomenų bazės migracijos ir Edge funkcijos
```

## Paleidimas

```bash
npm install
cp .env.example .env   # įrašykite savo reikšmes
npm start
```

> Pastaba: natyvūs `ios/` ir `android/` aplankai negeneruojami iš anksto – sukurkite juos komanda `npx expo prebuild`.

## Aplinkos kintamieji

Žr. `.env.example` (Supabase, OpenAI, ElevenLabs, RevenueCat).

## Dokumentacija

- `STORY_GENERATION.md` – pasakų generavimo logika
- `STORY_AGE_GUIDELINES.md` – turinio pritaikymas pagal vaiko amžių
- `API_REFERENCE.md` – API nuoroda
