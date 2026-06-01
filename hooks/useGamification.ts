import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ACHIEVEMENTS } from '@/constants/achievements';
import type {
  UserStats,
  UserAchievement,
  CardProgress,
  Achievement,
  AchievementId,
} from '@/types';

export function useGamification() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [completedStoryIds, setCompletedStoryIds] = useState<Set<string>>(new Set());
  const [cardProgress, setCardProgress] = useState<Record<string, CardProgress>>({});
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGamificationData = useCallback(async () => {
    if (!user) {
      setStats(null);
      setAchievements([]);
      setCompletedStoryIds(new Set());
      setCardProgress({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Gauti statistiką (sukurti, jei jos nėra)
      let { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!statsData) {
        const { data: newStats } = await supabase
          .from('user_stats')
          .insert({ user_id: user.id })
          .select()
          .single();
        statsData = newStats;
      }
      setStats(statsData);

      // Gauti pasiekimus
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);
      setAchievements(achievementsData || []);

      // Gauti užbaigtas pasakas
      const { data: completionsData } = await supabase
        .from('story_completions')
        .select('story_id')
        .eq('user_id', user.id);
      setCompletedStoryIds(new Set(completionsData?.map((c) => c.story_id) || []));

      // Gauti kortelių progresą
      const { data: cardProgressData } = await supabase
        .from('card_progress')
        .select('*')
        .eq('user_id', user.id);

      const progressMap: Record<string, CardProgress> = {};
      cardProgressData?.forEach((p) => {
        progressMap[p.category] = p;
      });
      setCardProgress(progressMap);
    } catch (error) {
      console.error('[useGamification] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  // Užfiksuoti pasakos užbaigimą (išklausyta >90%)
  const recordStoryCompletion = useCallback(
    async (
      storyId: string,
      storyType: 'user' | 'pregenerated'
    ): Promise<Achievement | null> => {
      if (!user) return null;

      try {
        // Bandyti įterpti užbaigimą
        const { error: insertError } = await supabase
          .from('story_completions')
          .insert({
            user_id: user.id,
            story_id: storyId,
            story_type: storyType,
          });

        // Jei jau egzistuoja, grąžinti null
        if (insertError?.code === '23505') {
          return null;
        }

        if (insertError) throw insertError;

        // Atnaujinti vietinę būseną
        setCompletedStoryIds((prev) => new Set([...prev, storyId]));

        // Atnaujinti statistiką
        const { data: updatedStats } = await supabase
          .from('user_stats')
          .upsert({
            user_id: user.id,
            total_stories_completed: (stats?.total_stories_completed || 0) + 1,
            current_streak: calculateStreak(stats?.last_listen_date),
            last_listen_date: new Date().toISOString().split('T')[0],
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (updatedStats) {
          setStats(updatedStats);
        }

        // Patikrinti, ar yra naujų pasiekimų
        const newTotal = (stats?.total_stories_completed || 0) + 1;
        const unlockedAchievement = await checkAndUnlockAchievements(
          newTotal,
          updatedStats?.current_streak || 1
        );
        return unlockedAchievement;
      } catch (error) {
        console.error('[useGamification] Error recording completion:', error);
        return null;
      }
    },
    [user, stats]
  );

  // Apskaičiuoti seriją pagal paskutinę klausymo datą
  const calculateStreak = (lastListenDate: string | null | undefined): number => {
    if (!lastListenDate) return 1;

    const last = new Date(lastListenDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return stats?.current_streak || 1;
    if (diffDays === 1) return (stats?.current_streak || 0) + 1;
    return 1;
  };

  // Patikrinti ir atrakinti pasiekimus
  const checkAndUnlockAchievements = useCallback(
    async (
      storiesCompleted: number,
      currentStreak: number
    ): Promise<Achievement | null> => {
      if (!user) return null;

      const currentAchievementIds = new Set(achievements.map((a) => a.achievement_id));

      // Patikrinti pasakomis paremtus pasiekimus
      const storyAchievementIds: AchievementId[] = ['first_story', 'night_owl', 'bookworm'];
      for (const achievementId of storyAchievementIds) {
        if (currentAchievementIds.has(achievementId)) continue;

        const achievement = ACHIEVEMENTS[achievementId];
        if (storiesCompleted >= achievement.requirement) {
          const unlocked = await unlockAchievement(achievementId);
          if (unlocked) return achievement;
        }
      }

      // Patikrinti serijomis paremtus pasiekimus
      const streakAchievementIds: AchievementId[] = ['streak_starter', 'streak_master'];
      for (const achievementId of streakAchievementIds) {
        if (currentAchievementIds.has(achievementId)) continue;

        const achievement = ACHIEVEMENTS[achievementId];
        if (currentStreak >= achievement.requirement) {
          const unlocked = await unlockAchievement(achievementId);
          if (unlocked) return achievement;
        }
      }

      return null;
    },
    [user, achievements]
  );

  // Atrakinti konkretų pasiekimą
  const unlockAchievement = async (achievementId: AchievementId): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('user_achievements').insert({
        user_id: user.id,
        achievement_id: achievementId,
      });

      if (error) return false;

      const achievement = ACHIEVEMENTS[achievementId];
      setAchievements((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() || Date.now().toString(),
          user_id: user.id,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        },
      ]);
      setNewAchievement(achievement);
      return true;
    } catch {
      return false;
    }
  };

  // Atnaujinti kortelių progresą
  const updateCardProgress = useCallback(
    async (category: string, cardsViewed: number, totalCards: number) => {
      if (!user) return;

      try {
        const isMastered = cardsViewed >= totalCards;

        const { data, error } = await supabase
          .from('card_progress')
          .upsert(
            {
              user_id: user.id,
              category,
              cards_viewed: cardsViewed,
              total_cards: totalCards,
              mastered_at: isMastered ? new Date().toISOString() : null,
            },
            { onConflict: 'user_id,category' }
          )
          .select()
          .single();

        if (!error && data) {
          setCardProgress((prev) => ({ ...prev, [category]: data }));

          // Patikrinti kortelių kolekcionieriaus pasiekimą
          const totalCardsViewed = Object.values({ ...cardProgress, [category]: data }).reduce(
            (sum, p) => sum + p.cards_viewed,
            0
          );

          if (totalCardsViewed >= 50) {
            const hasCardCollector = achievements.some(
              (a) => a.achievement_id === 'card_collector'
            );
            if (!hasCardCollector) {
              await unlockAchievement('card_collector');
            }
          }
        }
      } catch (error) {
        console.error('[useGamification] Error updating card progress:', error);
      }
    },
    [user, cardProgress, achievements]
  );

  // Išvalyti naujo pasiekimo pranešimą
  const clearNewAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  // Patikrinti, ar pasaka užbaigta
  const isStoryCompleted = useCallback(
    (storyId: string): boolean => {
      return completedStoryIds.has(storyId);
    },
    [completedStoryIds]
  );

  // Gauti kategorijos progreso procentą
  const getCategoryProgress = useCallback(
    (category: string): number => {
      const progress = cardProgress[category];
      if (!progress || progress.total_cards === 0) return 0;
      return Math.round((progress.cards_viewed / progress.total_cards) * 100);
    },
    [cardProgress]
  );

  return {
    stats,
    achievements,
    completedStoryIds,
    cardProgress,
    newAchievement,
    isLoading,
    recordStoryCompletion,
    updateCardProgress,
    clearNewAchievement,
    isStoryCompleted,
    getCategoryProgress,
    refresh: fetchGamificationData,
  };
}
