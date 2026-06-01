import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PregeneratedStory, PregeneratedStoryImage } from '@/types';

export function usePregeneratedStories() {
  const [stories, setStories] = useState<PregeneratedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pregenerated_stories')
        .select(`
          *,
          images:pregenerated_story_images(*)
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStories(data || []);
    } catch (err) {
      console.error('Error fetching pregenerated stories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const getStory = useCallback(async (id: string): Promise<PregeneratedStory | null> => {
    // Pirma patikrinti vietinę būseną
    const localStory = stories.find((s) => s.id === id);
    if (localStory) return localStory;

    // Gauti iš duomenų bazės
    try {
      const { data, error } = await supabase
        .from('pregenerated_stories')
        .select(`
          *,
          images:pregenerated_story_images(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching pregenerated story:', err);
      return null;
    }
  }, [stories]);

  const getStoryImages = useCallback(async (storyId: string): Promise<PregeneratedStoryImage[]> => {
    try {
      const { data, error } = await supabase
        .from('pregenerated_story_images')
        .select('*')
        .eq('story_id', storyId)
        .order('scene_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching pregenerated story images:', err);
      return [];
    }
  }, []);

  const incrementViewCount = useCallback(async (storyId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('increment_story_view_count', {
        story_id: storyId,
      });

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    } catch (err) {
      console.error('Error incrementing view count:', err);
    }
  }, []);

  /**
   * Gauti pasakas, atitinkančias tikslinį amžių (±1 metų intervalas geresnei aprėpčiai)
   * Pavyzdys: 5 metų amžius grąžina pasakas 4, 5, 6 metų amžiui
   */
  const getStoriesForAge = useCallback((age: number): PregeneratedStory[] => {
    return stories.filter((story) => {
      const targetAge = story.target_age ?? 0;
      return Math.abs(targetAge - age) <= 1;
    });
  }, [stories]);

  return {
    stories,
    isLoading,
    error,
    fetchStories,
    getStory,
    getStoryImages,
    incrementViewCount,
    getStoriesForAge,
  };
}
