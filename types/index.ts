// Duomenų bazės tipai, atitinkantys Supabase schemą

export type AuthProvider = 'google' | 'apple' | 'code';

export type SubscriptionStatus = 'none' | 'active' | 'expired' | 'cancelled';

export type SubscriptionType = 'none' | 'weekly' | 'monthly';

export type VoiceProfileStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'evicted';

export interface User {
  id: string;
  email: string | null;
  auth_provider: AuthProvider;
  link_code: string | null;
  free_story_used: boolean;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  subscription_type: SubscriptionType;
  stories_created_this_period: number;
  period_start_date: string | null;
  created_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender?: string;
  interests: string[];
  favorite_animals: string[];
  favorite_colors: string[];
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  elevenlabs_voice_id: string | null;  // Gali būti null - balsas gali būti iškeltas iš ElevenLabs
  original_audio_url: string | null;   // Nuolatinė saugykla pakartotiniam klonavimui
  last_used_at: string;                 // LRU sekimas
  status: VoiceProfileStatus;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  child_id: string | null;
  voice_profile_id: string | null;
  title: string;
  content: string;
  theme: string;
  target_age: number | null;
  duration_seconds: number;
  audio_url: string;
  thumbnail_url: string | null;
  is_favorite: boolean;
  character_descriptions: CharacterDescription[] | null;
  image_style: string;
  created_at: string;
  // Sujungti duomenys
  child?: Child;
  voice_profile?: VoiceProfile;
  images?: StoryImage[];
}

export interface StoryImage {
  id: string;
  story_id: string;
  image_url: string;
  prompt: string;
  scene_index: number;
  scene_text: string | null;
  created_at: string;
}

export interface CharacterDescription {
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

export interface Scene {
  index: number;
  text: string;
  visualDescription: string;
  characters: string[];
  mood: string;
}

export interface StoryTheme {
  id: string;
  name_lt: string;
  name_en: string;
  description_lt: string;
  icon: string;
  prompt_hint: string;
}

// Įvesties tipai įrašams kurti
export interface CreateChildInput {
  name: string;
  age: number;
  gender?: string;
  interests: string[];
  favorite_animals: string[];
  favorite_colors: string[];
}

export interface CreateVoiceProfileInput {
  name: string;
  audioUri: string;
}

export interface CreateStoryInput {
  child_id: string;
  voice_profile_id?: string;
  theme_id: string;
  special_elements?: string;
}

// API atsako tipai
export interface GeneratedStory {
  title: string;
  content: string;
  theme: string;
  characters?: CharacterDescription[];
  scenes?: Scene[];
  imagePrompts?: string[];
}

export interface VoiceCloneResponse {
  voice_id: string;
  name: string;
}

// Iš anksto sugeneruotos pasakos (viešos pasakos)
export interface PregeneratedStory {
  id: string;
  title: string;
  content: string;
  theme: string;
  target_age: number | null;
  duration_seconds: number;
  audio_url: string;
  thumbnail_url: string | null;
  character_descriptions: CharacterDescription[] | null;
  image_style: string;
  voice_id: string;
  voice_name: string;
  is_active: boolean;
  sort_order: number;
  view_count: number;
  is_asmr: boolean;
  created_at: string;
  paragraph_end_times: number[] | null; // Tikslūs laiko žymenys (sekundėmis), kada baigiasi kiekviena pastraipa
  // Sujungti duomenys
  images?: PregeneratedStoryImage[];
}

export interface PregeneratedStoryImage {
  id: string;
  story_id: string;
  image_url: string;
  prompt: string | null;
  scene_index: number;
  scene_text: string | null;
  created_at: string;
}

// Kortelių (Kortelės) tipai
export type CardCategory = 'animals' | 'colors' | 'numbers' | 'objects';

export interface Card {
  id: string;
  name_lt: string;
  name_en: string;
  category: CardCategory;
  image_url: string;
  audio_url: string;
  sort_order: number;
  created_at: string;
}

// Žaidybinimo tipai
export type AchievementId =
  | 'first_story'
  | 'night_owl'
  | 'bookworm'
  | 'streak_starter'
  | 'streak_master'
  | 'card_collector';

export interface Achievement {
  id: AchievementId;
  name_lt: string;
  icon: string;
  description_lt: string;
  requirement: number;
  type: 'stories' | 'streak' | 'cards';
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_listen_date: string | null;
  total_stories_completed: number;
  total_cards_viewed: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: AchievementId;
  unlocked_at: string;
}

export interface StoryCompletion {
  id: string;
  user_id: string;
  story_id: string;
  story_type: 'user' | 'pregenerated';
  completed_at: string;
}

export interface CardProgress {
  id: string;
  user_id: string;
  category: string;
  cards_viewed: number;
  total_cards: number;
  mastered_at: string | null;
}
