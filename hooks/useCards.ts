import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Card, CardCategory } from '@/types';

export interface CardGallery {
  id: string;
  name_lt: string;
  name_en: string;
  icon: string;
  sort_order: number;
  cover_image_url?: string;
  card_count: number;
}

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [galleries, setGalleries] = useState<CardGallery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async (category?: CardCategory) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('cards')
        .select('*')
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCards(data || []);
      return data || [];
    } catch (err: any) {
      console.error('[useCards] Error fetching cards:', err);
      setError(err.message || 'Failed to fetch cards');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGalleries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Gauti galerijas
      const { data: galleriesData, error: galleriesError } = await supabase
        .from('card_galleries')
        .select('*')
        .order('sort_order', { ascending: true });

      if (galleriesError) {
        throw galleriesError;
      }

      // Gauti pirmąją kiekvienos galerijos kortelę (viršeliui) ir skaičių
      const galleriesWithCovers: CardGallery[] = await Promise.all(
        (galleriesData || []).map(async (gallery) => {
          // Gauti pirmąją kortelę viršelio paveikslėliui
          const { data: firstCard } = await supabase
            .from('cards')
            .select('image_url')
            .eq('category', gallery.id)
            .order('sort_order', { ascending: true })
            .limit(1)
            .single();

          // Gauti kortelių skaičių
          const { count } = await supabase
            .from('cards')
            .select('*', { count: 'exact', head: true })
            .eq('category', gallery.id);

          return {
            ...gallery,
            cover_image_url: firstCard?.image_url,
            card_count: count || 0,
          };
        })
      );

      // Įtraukti tik galerijas, kuriose yra kortelių
      const nonEmptyGalleries = galleriesWithCovers.filter(g => g.card_count > 0);
      setGalleries(nonEmptyGalleries);
      return nonEmptyGalleries;
    } catch (err: any) {
      console.error('[useCards] Error fetching galleries:', err);
      setError(err.message || 'Failed to fetch galleries');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCardsByCategory = useCallback((category: CardCategory) => {
    return cards.filter(card => card.category === category);
  }, [cards]);

  return {
    cards,
    galleries,
    isLoading,
    error,
    fetchCards,
    fetchGalleries,
    getCardsByCategory,
  };
}
