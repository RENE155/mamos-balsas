-- Žaidybinimo lentelės interaktyvioms vaikų funkcijoms
-- Paleisti šią migraciją Supabase valdymo skydelio SQL redaktoriuje

-- 1. Naudotojo žaidybinimo statistika
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_listen_date DATE,
  total_stories_completed INTEGER DEFAULT 0,
  total_cards_viewed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Users can insert own stats" ON public.user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own stats" ON public.user_stats FOR UPDATE USING (true);
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);

-- 2. Pelnyti pasiekimai
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);

-- 3. Pasakų užbaigimai (>90% išklausyta)
CREATE TABLE public.story_completions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL,
  story_type TEXT NOT NULL CHECK (story_type IN ('user', 'pregenerated')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_id, story_type)
);

ALTER TABLE public.story_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own completions" ON public.story_completions FOR SELECT USING (true);
CREATE POLICY "Users can insert own completions" ON public.story_completions FOR INSERT WITH CHECK (true);
CREATE INDEX idx_story_completions_user_id ON public.story_completions(user_id);

-- 4. Kortelių kategorijų pažanga
CREATE TABLE public.card_progress (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  cards_viewed INTEGER DEFAULT 0,
  total_cards INTEGER NOT NULL,
  mastered_at TIMESTAMPTZ,
  UNIQUE(user_id, category)
);

ALTER TABLE public.card_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own card progress" ON public.card_progress FOR SELECT USING (true);
CREATE POLICY "Users can insert own card progress" ON public.card_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own card progress" ON public.card_progress FOR UPDATE USING (true);
CREATE INDEX idx_card_progress_user_id ON public.card_progress(user_id);

-- 5. Funkcija klausymo serijai atnaujinti
CREATE OR REPLACE FUNCTION update_listening_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_listen_date INTO v_last_date
  FROM public.user_stats WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_listen_date)
    VALUES (p_user_id, 1, 1, v_today);
  ELSIF v_last_date = v_today THEN
    NULL;
  ELSIF v_last_date = v_today - 1 THEN
    UPDATE public.user_stats
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_listen_date = v_today
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_stats
    SET current_streak = 1, last_listen_date = v_today
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- 6. Funkcija pasakos užbaigimui užregistruoti
CREATE OR REPLACE FUNCTION record_story_completion(
  p_user_id UUID,
  p_story_id UUID,
  p_story_type TEXT
)
RETURNS TABLE(is_new_completion BOOLEAN, new_total INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_new BOOLEAN := FALSE;
  v_new_total INTEGER;
BEGIN
  INSERT INTO public.story_completions (user_id, story_id, story_type)
  VALUES (p_user_id, p_story_id, p_story_type)
  ON CONFLICT (user_id, story_id, story_type) DO NOTHING;

  IF FOUND THEN
    v_is_new := TRUE;

    INSERT INTO public.user_stats (user_id, total_stories_completed, current_streak, longest_streak, last_listen_date)
    VALUES (p_user_id, 1, 1, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET total_stories_completed = user_stats.total_stories_completed + 1;

    PERFORM update_listening_streak(p_user_id);
  END IF;

  SELECT total_stories_completed INTO v_new_total FROM public.user_stats WHERE user_id = p_user_id;
  RETURN QUERY SELECT v_is_new, COALESCE(v_new_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION update_listening_streak(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_story_completion(UUID, UUID, TEXT) TO anon, authenticated;
