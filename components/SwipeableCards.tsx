import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import type { Card } from '@/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeableCardsProps {
  cards: Card[];
  onComplete?: () => void;
  onCardChange?: (index: number) => void;
}

export default function SwipeableCards({ cards, onComplete, onCardChange }: SwipeableCardsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Perbraukimo užuominos animacija
  const hintTranslateX = useSharedValue(0);
  const hintOpacity = useSharedValue(1);

  // Pradėti perbraukimo užuominos animaciją ant pirmos kortelės
  useEffect(() => {
    if (showSwipeHint && currentIndex === 0) {
      // Animuoti užuominą: slinkti į kairę, paskui į dešinę, tada išnykti
      hintTranslateX.value = withDelay(
        500,
        withSequence(
          withTiming(-30, { duration: 400 }),
          withTiming(30, { duration: 800 }),
          withTiming(0, { duration: 400 })
        )
      );

      // Pakartoti 2 kartus, tada paslėpti
      const timeout = setTimeout(() => {
        hintOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => setShowSwipeHint(false), 300);
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [showSwipeHint, currentIndex]);

  // Paslėpti užuominą po pirmo perbraukimo
  useEffect(() => {
    if (currentIndex > 0 && showSwipeHint) {
      setShowSwipeHint(false);
      hintOpacity.value = 0;
    }
  }, [currentIndex]);

  // Sekti kortelių progresą
  useEffect(() => {
    if (onCardChange) {
      onCardChange(currentIndex);
    }
  }, [currentIndex, onCardChange]);

  // Išvalyti garsą atjungiant komponentą
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playAudio = useCallback(async (audioUrl: string) => {
    if (isMuted) return;

    try {
      // Iškrauti ankstesnį garsą
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      // Klausytis atkūrimo pabaigos
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('[SwipeableCards] Error playing audio:', error);
      setIsPlaying(false);
    }
  }, [isMuted]);

  const goToNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Groti garsą naujai kortelei
      const nextCard = cards[nextIndex];
      if (nextCard?.audio_url) {
        playAudio(nextCard.audio_url);
      }
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, cards, onComplete, playAudio]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      // Groti garsą naujai kortelei
      const prevCard = cards[prevIndex];
      if (prevCard?.audio_url) {
        playAudio(prevCard.audio_url);
      }
    }
  }, [currentIndex, cards, playAudio]);

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      goToNext();
    } else {
      goToPrevious();
    }
  }, [goToNext, goToPrevious]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // Slopinti vertikalų judesį
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        // Aptiktas perbraukimas
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
          { duration: 200 },
          () => {
            runOnJS(handleSwipeComplete)(direction);
            translateX.value = 0;
            translateY.value = 0;
          }
        );
      } else {
        // Grįžti į centrą
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      // Groti garsą palietus
      const currentCard = cards[currentIndex];
      if (currentCard?.audio_url) {
        runOnJS(playAudio)(currentCard.audio_url);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const hintAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: hintTranslateX.value }],
      opacity: hintOpacity.value,
    };
  });

  const currentCard = cards[currentIndex];

  if (!currentCard) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nėra kortelių
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Nutildymo mygtukas viršuje */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={() => setIsMuted(!isMuted)}
        activeOpacity={0.7}
      >
        <FontAwesome
          name={isMuted ? 'volume-off' : 'volume-up'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Kortelė */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <Image
            source={{ uri: currentCard.image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cardGradient}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{currentCard.name_lt}</Text>
          </View>

          {/* Perbraukimo užuominos perdanga - tik ant pirmos kortelės */}
          {showSwipeHint && currentIndex === 0 && (
            <Animated.View style={[styles.swipeHintOverlay, hintAnimatedStyle]}>
              <View style={styles.swipeHintContent}>
                <FontAwesome name="hand-pointer-o" size={40} color="#fff" />
                <View style={styles.swipeArrows}>
                  <FontAwesome name="arrow-left" size={20} color="#fff" style={styles.arrowLeft} />
                  <FontAwesome name="arrow-right" size={20} color="#fff" style={styles.arrowRight} />
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteButton: {
    position: 'absolute',
    top: 0,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  swipeHintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeHintContent: {
    alignItems: 'center',
  },
  swipeArrows: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 40,
  },
  arrowLeft: {
    opacity: 0.8,
  },
  arrowRight: {
    opacity: 0.8,
  },
});
