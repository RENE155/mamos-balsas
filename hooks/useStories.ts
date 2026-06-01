import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { supabase, canCreateStory, incrementStoryCount } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Story, StoryTheme, CharacterDescription } from '@/types';
import { api, RateLimitError, StoryLimitError, ContentFlaggedError } from '@/lib/api';
import {
  calculateImageCount,
  buildImagePrompt,
  type ArtStyle
} from '@/lib/imageGeneration';
import { getVoiceForAge } from '@/lib/storyFormats';

// Apskaičiuoti amžiaus intervalą pagal amžių
function getAgeRange(age: number): string {
  if (age >= 1 && age <= 3) return '1-3';
  if (age >= 4 && age <= 5) return '3-5';
  if (age >= 6 && age <= 7) return '5-7';
  if (age >= 8 && age <= 10) return '7-10';
  if (age >= 11 && age <= 12) return '10-12';
  return '3-7'; // numatytasis
}

export function useStories() {
  const { user, refreshUser } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!user) {
      setStories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stories')
        .select(`
          *,
          voice_profile:voice_profiles(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStories(data || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Testavimo režimas: sukurti pasaką su imituotu tekstu (praleidžiant OpenAI), bet su tikru garsu (ElevenLabs)
  const createTestStory = async (
    age: number,
    theme: StoryTheme,
    voiceProfileId?: string
  ): Promise<Story> => {
    if (!user) throw new Error('User not authenticated');

    // Patikrinti pasakų limitus
    const limitCheck = await canCreateStory(user.id);
    if (!limitCheck.canCreate) {
      const resetInfo = limitCheck.resetDate
        ? ` Atsinaujins ${limitCheck.resetDate.toLocaleDateString('lt-LT')}.`
        : '';
      throw new Error(`Pasiektas limitas (${limitCheck.remaining}/${limitCheck.limit} pasakų).${resetInfo}`);
    }

    // Patikrinti nemokamos pasakos limitą tiesiai iš duomenų bazės (ne iš pasenusios React būsenos)
    const { data: freshUser } = await supabase
      .from('users')
      .select('subscription_status, free_story_used')
      .eq('id', user.id)
      .single();

    const isSubscriber = freshUser?.subscription_status === 'active';
    if (!isSubscriber && freshUser?.free_story_used) {
      throw new Error('Norint kurti daugiau pasakų, reikalinga Premium prenumerata.');
    }

    console.log('[useStories] Creating TEST story for age:', age, 'theme:', theme.id);

    // Sugeneruoti imituotą lietuvišką pasaką (praleisti OpenAI)
    const mockTitle = `Nuostabus ${theme.name_lt} nuotykis`;
    const mockContent = `Labas vakaras, mano mielas drauge!

Šiandien papasakosiu tau nuostabią pasaką apie ${theme.name_lt.toLowerCase()}.

Kartą gyveno mažas drąsus vaikas, kuris labai mėgo tyrinėti pasaulį. Vieną gražų vakarą, jis nusprendė leistis į nuotykį.

Kelionė buvo ilga, bet mažasis keliautojas buvo drąsus ir niekada nenuleido rankų. Galiausiai, jis pasiekė savo tikslą ir visi gyveno laimingai.

Labanakt! Gražių sapnų!`;

    // Sugeneruoti garsą naudojant Edge Function
    console.log('[useStories] Generating audio via Edge Function...');
    const { audioUrl } = await api.generateAudio(user.id, mockContent, {
      voiceProfileId,
      age,
    });
    console.log('[useStories] Audio generated:', audioUrl);

    // Gauti faktinę garso trukmę
    const { sound: tempSound } = await Audio.Sound.createAsync({ uri: audioUrl });
    const status = await tempSound.getStatusAsync();
    const durationSeconds = status.isLoaded ? Math.round(status.durationMillis! / 1000) : 0;
    await tempSound.unloadAsync();
    console.log('[useStories] Actual audio duration:', durationSeconds, 'seconds');

    // Išsaugoti pasaką duomenų bazėje
    const { data, error: insertError } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        child_id: null,
        voice_profile_id: voiceProfileId || null,
        title: mockTitle,
        content: mockContent,
        theme: theme.id,
        duration_seconds: durationSeconds,
        audio_url: audioUrl,
        is_favorite: false,
      })
      .select(`
        *,
        voice_profile:voice_profiles(*)
      `)
      .single();

    if (insertError) {
      console.error('[useStories] Test story insert error:', insertError);
      throw insertError;
    }

    // Pažymėti nemokamą pasaką kaip panaudotą ne prenumeratoriams
    if (!isSubscriber) {
      await supabase
        .from('users')
        .update({ free_story_used: true })
        .eq('id', user.id);
      await refreshUser();
    }

    // Padidinti pasakų skaičių prenumeratoriams
    if (isSubscriber) {
      await incrementStoryCount(user.id);
    }

    console.log('[useStories] Test story created with audio:', data.id);
    setStories((prev) => [data, ...prev]);
    return data;
  };

  const createStory = async (
    age: number,
    theme: StoryTheme,
    voiceProfileId?: string
  ): Promise<Story> => {
    if (!user) throw new Error('User not authenticated');

    // Patikrinti pasakų limitus
    const limitCheck = await canCreateStory(user.id);
    if (!limitCheck.canCreate) {
      const resetInfo = limitCheck.resetDate
        ? ` Atsinaujins ${limitCheck.resetDate.toLocaleDateString('lt-LT')}.`
        : '';
      throw new Error(`Pasiektas limitas (${limitCheck.remaining}/${limitCheck.limit} pasakų).${resetInfo}`);
    }

    // Patikrinti nemokamos pasakos limitą tiesiai iš duomenų bazės (ne iš pasenusios React būsenos)
    const { data: freshUser } = await supabase
      .from('users')
      .select('subscription_status, free_story_used')
      .eq('id', user.id)
      .single();

    const isSubscriber = freshUser?.subscription_status === 'active';
    if (!isSubscriber && freshUser?.free_story_used) {
      throw new Error('Norint kurti daugiau pasakų, reikalinga Premium prenumerata.');
    }

    const maxMinutes = isSubscriber ? 5 : 3;

    try {
      // 1. Sugeneruoti pasaką naudojant Edge Function (apima turinio saugumo patikrinimą)
      console.log('[useStories] Generating story via Edge Function...');
      const { title, content } = await api.generateStory(user.id, age, theme, maxMinutes);

      // 2. Sugeneruoti garsą naudojant Edge Function
      console.log('[useStories] Generating audio via Edge Function...');
      const { audioUrl } = await api.generateAudio(user.id, content, {
        voiceProfileId,
        age,
      });

      // 3. Gauti garso trukmę
      const { sound: tempSound } = await Audio.Sound.createAsync({ uri: audioUrl });
      const status = await tempSound.getStatusAsync();
      const durationSeconds = status.isLoaded ? Math.round(status.durationMillis! / 1000) : 0;
      await tempSound.unloadAsync();

      // 4. Išsaugoti pasaką duomenų bazėje
      const { data, error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          child_id: null,
          voice_profile_id: voiceProfileId || null,
          title,
          content,
          theme: theme.id,
          duration_seconds: durationSeconds,
          audio_url: audioUrl,
          is_favorite: false,
        })
        .select(`
          *,
          voice_profile:voice_profiles(*)
        `)
        .single();

      if (insertError) throw insertError;

      // Pažymėti nemokamą pasaką kaip panaudotą ne prenumeratoriams
      if (!isSubscriber) {
        console.log('[useStories] Marking free story as used');
        await supabase
          .from('users')
          .update({ free_story_used: true })
          .eq('id', user.id);
        await refreshUser();
      }

      // Padidinti pasakų skaičių prenumeratoriams
      if (isSubscriber) {
        await incrementStoryCount(user.id);
      }

      setStories((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      // Apdoroti konkrečias API klaidas
      if (err instanceof RateLimitError) {
        throw new Error('Prašome palaukti prieš kuriant kitą pasaką.');
      }
      if (err instanceof StoryLimitError) {
        throw new Error('Norint kurti daugiau pasakų, reikalinga Premium prenumerata.');
      }
      if (err instanceof ContentFlaggedError) {
        throw new Error('Sugeneruotas turinys neatitiko saugumo reikalavimų. Bandykite dar kartą.');
      }
      throw err;
    }
  };

  /**
   * Sukurti pasaką su AI sugeneruotais paveikslėliais (OPTIMIZUOTA - maksimalus lygiagretus vykdymas)
   */
  const createStoryWithImagesFunc = async (
    age: number,
    theme: StoryTheme,
    voiceProfileId?: string,
    artStyle: ArtStyle = 'watercolor',
    onProgress?: (step: string, current?: number, total?: number) => void
  ): Promise<Story> => {
    if (!user) throw new Error('User not authenticated');

    // Patikrinti pasakų limitus
    const limitCheck = await canCreateStory(user.id);
    if (!limitCheck.canCreate) {
      const resetInfo = limitCheck.resetDate
        ? ` Atsinaujins ${limitCheck.resetDate.toLocaleDateString('lt-LT')}.`
        : '';
      throw new Error(`Pasiektas limitas (${limitCheck.remaining}/${limitCheck.limit} pasakų).${resetInfo}`);
    }

    // Patikrinti nemokamos pasakos limitą
    const { data: freshUser } = await supabase
      .from('users')
      .select('subscription_status, free_story_used')
      .eq('id', user.id)
      .single();

    const isSubscriber = freshUser?.subscription_status === 'active';
    if (!isSubscriber && freshUser?.free_story_used) {
      throw new Error('Norint kurti daugiau pasakų, reikalinga Premium prenumerata.');
    }

    const maxMinutes = isSubscriber ? 5 : 3;

    try {
      // 1 ŽINGSNIS: Pirma sugeneruoti pasakos tekstą naudojant Edge Function
      onProgress?.('Rašoma pasaka...');
      console.log('[useStories] Step 1: Generating story text...');
      const { title, content } = await api.generateStory(user.id, age, theme, maxMinutes);
      console.log('[useStories] Story text ready:', title);

      // 2 ŽINGSNIS: Pirma sukurti pasakos įrašą, kad gautume ID paveikslėliams
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          child_id: null,
          voice_profile_id: voiceProfileId || null,
          title,
          content,
          theme: theme.id,
          target_age: age,
          duration_seconds: 0, // Bus atnaujinta vėliau
          audio_url: null, // Bus atnaujinta vėliau
          is_favorite: false,
          image_style: artStyle,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // 3 ŽINGSNIS: Pradėti lygiagrečius srautus
      onProgress?.('Kuriamos iliustracijos ir balsas...');
      console.log('[useStories] Step 3: Starting parallel execution (images + audio)...');

      // A srautas: Analizuoti pasaką ir generuoti paveikslėlius
      const imagesPipeline = async () => {
        console.log('[useStories] Track A: Starting images pipeline...');

        // Analizuoti pasaką naudojant Edge Function
        const imageCount = calculateImageCount(content, maxMinutes, age);
        const { characters, scenes } = await api.analyzeStory(user.id, content, imageCount, age);
        console.log('[useStories] Characters:', characters.length, 'Scenes:', scenes.length);

        // Atnaujinti pasaką su personažų aprašymais
        await supabase
          .from('stories')
          .update({ character_descriptions: characters })
          .eq('id', storyData.id);

        // Generuoti paveikslėlius naudojant Edge Function (lygiagrečiai)
        onProgress?.('Generuojami paveikslėliai...', 0, scenes.length);
        const imagePromises = scenes.map(async (scene, i) => {
          try {
            const prompt = buildImagePrompt(scene, characters, artStyle);
            const { imageUrl } = await api.generateImage(
              user.id,
              prompt,
              storyData.id,
              scene.index,
              scene.text,
              'low'
            );
            onProgress?.('Generuojami paveikslėliai...', i + 1, scenes.length);
            return { imageUrl, sceneIndex: scene.index };
          } catch (error) {
            console.error(`[useStories] Image ${i + 1} failed:`, error);
            return null;
          }
        });

        const imageResults = await Promise.all(imagePromises);
        const images = imageResults.filter((img): img is NonNullable<typeof img> => img !== null);
        console.log('[useStories] Track A complete:', images.length, 'images');
        return { characters, images };
      };

      // B srautas: Garso generavimas
      const audioPipeline = async () => {
        console.log('[useStories] Track B: Starting audio generation...');
        const { audioUrl } = await api.generateAudio(user.id, content, {
          voiceProfileId,
          storyId: storyData.id,
          age,
        });
        console.log('[useStories] Track B complete: audio ready');
        return audioUrl;
      };

      // Vykdyti abu srautus lygiagrečiai
      const [imagesResult, audioUrl] = await Promise.all([
        imagesPipeline(),
        audioPipeline(),
      ]);

      // 4 ŽINGSNIS: Gauti garso trukmę ir atnaujinti pasaką
      onProgress?.('Išsaugoma...');
      const { sound: tempSound } = await Audio.Sound.createAsync({ uri: audioUrl });
      const status = await tempSound.getStatusAsync();
      const durationSeconds = status.isLoaded ? Math.round(status.durationMillis! / 1000) : 0;
      await tempSound.unloadAsync();

      // Nustatyti miniatiūrą iš pirmojo paveikslėlio
      let thumbnailUrl: string | null = null;
      if (imagesResult.images.length > 0) {
        thumbnailUrl = imagesResult.images[0].imageUrl;
      }

      // Atnaujinti pasaką su garso URL ir trukme
      await supabase
        .from('stories')
        .update({
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
          thumbnail_url: thumbnailUrl,
        })
        .eq('id', storyData.id);

      // Pažymėti nemokamą pasaką kaip panaudotą
      if (!isSubscriber) {
        await supabase
          .from('users')
          .update({ free_story_used: true })
          .eq('id', user.id);
        await refreshUser();
      }

      // Padidinti pasakų skaičių prenumeratoriams
      if (isSubscriber) {
        await incrementStoryCount(user.id);
      }

      // Gauti pilną pasaką su paveikslėliais
      const { data: completeStory } = await supabase
        .from('stories')
        .select(`
          *,
          voice_profile:voice_profiles(*),
          images:story_images(*)
        `)
        .eq('id', storyData.id)
        .single();

      console.log('[useStories] Story with images created:', completeStory?.id);
      setStories((prev) => [completeStory || storyData, ...prev]);
      return completeStory || storyData;
    } catch (err) {
      // Apdoroti konkrečias API klaidas
      if (err instanceof RateLimitError) {
        throw new Error('Prašome palaukti prieš kuriant kitą pasaką.');
      }
      if (err instanceof StoryLimitError) {
        throw new Error('Norint kurti daugiau pasakų, reikalinga Premium prenumerata.');
      }
      if (err instanceof ContentFlaggedError) {
        throw new Error('Sugeneruotas turinys neatitiko saugumo reikalavimų. Bandykite dar kartą.');
      }
      throw err;
    }
  };

  const toggleFavorite = async (id: string): Promise<void> => {
    const story = stories.find((s) => s.id === id);
    if (!story) return;

    const { error } = await supabase
      .from('stories')
      .update({ is_favorite: !story.is_favorite })
      .eq('id', id);

    if (error) throw error;

    setStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_favorite: !s.is_favorite } : s))
    );
  };

  const deleteStory = async (id: string): Promise<void> => {
    const story = stories.find((s) => s.id === id);
    if (!story) return;

    // Ištrinti garsą iš saugyklos
    if (story.audio_url) {
      const urlParts = story.audio_url.split('/');
      const fileName = urlParts.slice(-3).join('/');
      await supabase.storage.from('audio').remove([fileName]);
    }

    const { error } = await supabase.from('stories').delete().eq('id', id);

    if (error) throw error;

    setStories((prev) => prev.filter((s) => s.id !== id));
  };

  const getStory = (id: string): Story | undefined => {
    return stories.find((story) => story.id === id);
  };

  const getFavorites = (): Story[] => {
    return stories.filter((story) => story.is_favorite);
  };

  return {
    stories,
    isLoading,
    error,
    fetchStories,
    createStory,
    createTestStory,
    createStoryWithImages: createStoryWithImagesFunc,
    toggleFavorite,
    deleteStory,
    getStory,
    getFavorites,
  };
}
