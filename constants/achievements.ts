import type { Achievement, AchievementId } from '@/types';

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_story: {
    id: 'first_story',
    name_lt: 'Pirmoji pasaka',
    icon: '🌟',
    description_lt: 'Isklausei savo pirma pasaka!',
    requirement: 1,
    type: 'stories',
  },
  night_owl: {
    id: 'night_owl',
    name_lt: 'Naktine peleda',
    icon: '🦉',
    description_lt: 'Isklausei 5 pasakas',
    requirement: 5,
    type: 'stories',
  },
  bookworm: {
    id: 'bookworm',
    name_lt: 'Knygiu drugelis',
    icon: '📚',
    description_lt: 'Isklausei 10 pasaku!',
    requirement: 10,
    type: 'stories',
  },
  streak_starter: {
    id: 'streak_starter',
    name_lt: 'Serijos pradziunas',
    icon: '🔥',
    description_lt: 'Klausei pasaku 3 dienas is eiles',
    requirement: 3,
    type: 'streak',
  },
  streak_master: {
    id: 'streak_master',
    name_lt: 'Serijos meistras',
    icon: '⚡',
    description_lt: 'Klausei pasaku 7 dienas is eiles!',
    requirement: 7,
    type: 'streak',
  },
  card_collector: {
    id: 'card_collector',
    name_lt: 'Korteliu kolekcionierius',
    icon: '🃏',
    description_lt: 'Perziurejai 50 korteliu',
    requirement: 50,
    type: 'cards',
  },
};

export const getAchievementById = (id: AchievementId): Achievement => ACHIEVEMENTS[id];

export const ALL_ACHIEVEMENT_IDS: AchievementId[] = Object.keys(ACHIEVEMENTS) as AchievementId[];
