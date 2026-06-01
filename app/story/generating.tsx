import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Animated,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useStories } from '@/hooks/useStories';
import { getThemeById } from '@/constants/themes';
import type { ArtStyle } from '@/lib/imageGeneration';

const backgroundImage = require('@/assets/images/bg_main_image.png');

/**
 * Generavimo režimai:
 * - 'test': Imituota pasaka su tikru garsu (jokių OpenAI išlaidų, išskyrus ElevenLabs)
 * - 'text_only': Tikras pasakos generavimas be paveikslėlių
 * - 'with_images': Pilna pasaka su AI sugeneruotais paveikslėliais (~$0.16/pasakai)
 */
type GenerationMode = 'test' | 'text_only' | 'with_images';

// Pakeiskite tai, kad valdytumėte generavimo režimą
// 'test' = imituota pasaka, 'text_only' = tikra pasaka be paveikslėlių, 'with_images' = pilna
const GENERATION_MODE: GenerationMode = 'with_images';

export default function GeneratingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createStory, createTestStory, createStoryWithImages } = useStories();
  const params = useLocalSearchParams<{
    age: string;
    themeId: string;
    voiceId: string;
    artStyle: string;
    customPrompt: string;
  }>();

  const [currentStep, setCurrentStep] = useState('Kuriame pasaką...');
  const [imageProgress, setImageProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const isGenerating = useRef(false);

  // Animuoti žingsnių pokyčius
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (!isGenerating.current) {
      isGenerating.current = true;
      generateStoryHandler();
    }
  }, []);

  const handleProgress = (step: string, current?: number, total?: number) => {
    setCurrentStep(step);
    if (current !== undefined && total !== undefined) {
      setImageProgress({ current, total });
    } else {
      setImageProgress(null);
    }
  };

  const generateStoryHandler = async () => {
    try {
      console.log('[Generating] Starting story generation...');
      console.log('[Generating] Mode:', GENERATION_MODE);

      const age = parseInt(params.age, 10);
      if (isNaN(age)) {
        throw new Error('Neteisingas amžius');
      }
      console.log('[Generating] Age:', age);

      let theme = getThemeById(params.themeId);

      // Apdoroti savo užklausą - sukurti savos temos objektą
      if (!theme && params.themeId === 'custom' && params.customPrompt) {
        theme = {
          id: 'custom',
          name_lt: 'Sava tema',
          name_en: 'Custom',
          description_lt: 'Jūsų sukurta tema',
          icon: '✍️',
          prompt_hint: params.customPrompt,
        };
        console.log('[Generating] Using custom prompt:', params.customPrompt.substring(0, 50) + '...');
      }

      if (!theme) {
        console.error('[Generating] Theme not found:', params.themeId);
        throw new Error('Nepavyko rasti temos');
      }
      console.log('[Generating] Theme:', theme.name_lt);

      let story;

      switch (GENERATION_MODE) {
        case 'test':
          console.log('[Generating] TEST MODE - creating mock story');
          setCurrentStep('Kuriame bandomąją pasaką...');
          story = await createTestStory(
            age,
            theme,
            params.voiceId || undefined
          );
          break;

        case 'text_only':
          console.log('[Generating] TEXT ONLY MODE - real story, no images');
          setCurrentStep('Rašoma pasaka...');
          story = await createStory(
            age,
            theme,
            params.voiceId || undefined
          );
          break;

        case 'with_images':
          console.log('[Generating] FULL MODE - story with images');
          const artStyle = (params.artStyle as ArtStyle) || 'watercolor';
          story = await createStoryWithImages(
            age,
            theme,
            params.voiceId || undefined,
            artStyle,
            handleProgress
          );
          break;
      }

      console.log('[Generating] Story created:', story.id);
      console.log('[Generating] Navigating to story...');

      if (router.canDismiss()) {
        router.dismissAll();
      }

      setTimeout(() => {
        console.log('[Generating] Navigating to story:', story.id);
        router.push(`/story/${story.id}`);
      }, 150);
    } catch (err) {
      console.error('[Generating] Story generation error:', err);
      setError(err instanceof Error ? err.message : 'Nepavyko sukurti pasakos');
    }
  };

  if (error) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
          <View style={[styles.errorIconContainer, { backgroundColor: 'rgba(212, 115, 109, 0.15)' }]}>
            <Text style={styles.errorIcon}>😢</Text>
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Klaida
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <FontAwesome name="refresh" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Bandyti dar karta</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Animated.View style={[styles.moonContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.moonEmoji}>🌙</Text>
        </Animated.View>

        <View style={[styles.loaderCard, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />

          <Animated.Text
            style={[
              styles.message,
              { color: colors.text, opacity: fadeAnim },
            ]}
          >
            {currentStep}
          </Animated.Text>

          {imageProgress && (
            <Text style={[styles.imageProgress, { color: colors.primary }]}>
              {imageProgress.current}/{imageProgress.total}
            </Text>
          )}

          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {GENERATION_MODE === 'with_images'
              ? 'Tai gali užtrukti iki 2 minučių'
              : 'Tai gali užtrukti iki 30 sekundžių'}
          </Text>

          {GENERATION_MODE !== 'test' && (
            <View style={[styles.modeBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.modeBadgeText}>
                {GENERATION_MODE === 'with_images' ? '🎨 Su iliustracijomis' : '📝 Tik tekstas'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  moonContainer: {
    marginBottom: 32,
  },
  moonEmoji: {
    fontSize: 88,
  },
  loaderCard: {
    padding: 32,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 280,
  },
  loader: {
    marginBottom: 24,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  imageProgress: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 40,
    padding: 32,
    borderRadius: 28,
    borderWidth: 1,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
