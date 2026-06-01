-- Miego pasakų duomenų bazės schema
-- Paleisti tai Supabase SQL redaktoriuje

-- Įjungti UUID plėtinį
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Naudotojų lentelė (išplečia auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'apple')),
  free_story_used BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'expired', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaikų lentelė
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 1 AND age <= 12),
  gender TEXT,
  interests TEXT[] DEFAULT '{}',
  favorite_animals TEXT[] DEFAULT '{}',
  favorite_colors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balso profilių lentelė
CREATE TABLE IF NOT EXISTS public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pasakų lentelė
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  voice_profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  theme TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  audio_url TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pasakų temų lentelė (iš anksto apibrėžtos)
CREATE TABLE IF NOT EXISTS public.story_themes (
  id TEXT PRIMARY KEY,
  name_lt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_lt TEXT NOT NULL,
  icon TEXT NOT NULL,
  prompt_hint TEXT NOT NULL
);

-- Įterpti numatytąsias temas
INSERT INTO public.story_themes (id, name_lt, name_en, description_lt, icon, prompt_hint) VALUES
  ('adventure', 'Nuotykiai', 'Adventure', 'Įdomūs nuotykiai su drąsiais herojais', '🗺️', 'Istorija apie kelionę ir naujus atradimus'),
  ('animals', 'Gyvūnai', 'Animals', 'Pasakos su miškų ir namų gyvūnais', '🐻', 'Istorija su gyvūnais kaip pagrindiniais veikėjais'),
  ('space', 'Kosmosas', 'Space', 'Kelionės tarp žvaigždžių ir planetų', '🚀', 'Istorija apie kosmosą, žvaigždes ir planetas'),
  ('fairy_tale', 'Pasaka', 'Fairy Tale', 'Klasikinės pasakų temos su magija', '✨', 'Klasikinė pasaka su magija ir stebuklingais elementais'),
  ('nature', 'Gamta', 'Nature', 'Pasakos apie miškus, upes ir kalnus', '🌲', 'Istorija apie gamtą, miškus ir gamtos stebuklus'),
  ('friendship', 'Draugystė', 'Friendship', 'Šiltos istorijos apie draugystę', '💝', 'Istorija apie draugystę ir pagalbą kitiems'),
  ('dreams', 'Sapnai', 'Dreams', 'Stebuklingos sapnų istorijos', '🌙', 'Istorija apie sapnus ir nakties stebuklus'),
  ('surprise', 'Nustebink mane', 'Surprise Me', 'Atsitiktinė tema', '🎁', 'Sukurk originalią pasaką su netikėtais posūkiais')
ON CONFLICT (id) DO NOTHING;

-- Įjungti eilučių lygmens saugumą (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_themes ENABLE ROW LEVEL SECURITY;

-- RLS politikos naudotojams
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS politikos vaikams
CREATE POLICY "Users can view own children" ON public.children
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children" ON public.children
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children" ON public.children
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children" ON public.children
  FOR DELETE USING (auth.uid() = user_id);

-- RLS politikos voice_profiles
CREATE POLICY "Users can view own voices" ON public.voice_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voices" ON public.voice_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voices" ON public.voice_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voices" ON public.voice_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS politikos pasakoms
CREATE POLICY "Users can view own stories" ON public.stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON public.stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS politika story_themes (vieša prieiga skaitymui)
CREATE POLICY "Anyone can view themes" ON public.story_themes
  FOR SELECT USING (true);

-- Sukurti saugyklos kibirą garso failams
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Saugyklos politikos garso kibirui
CREATE POLICY "Users can upload own audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Visi gali peržiūrėti garsą (atkūrimui)
CREATE POLICY "Public can view audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio');

-- Sukurti indeksus geresniam užklausų našumui
CREATE INDEX IF NOT EXISTS idx_children_user_id ON public.children(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON public.voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_child_id ON public.stories(child_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);
