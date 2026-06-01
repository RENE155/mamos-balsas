import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { StoryImage } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  images: StoryImage[];
  isPlaying: boolean;
  position: number;
  duration: number;
  title: string;
  storyContent?: string; // Pasakos tekstas sinchronizuotiems subtitrams
  paragraphEndTimes?: number[] | null; // Tikslūs laiko žymenys (sekundėmis), kada baigiasi kiekviena pastraipa
  onPlayPause: () => void;
  onClose: () => void;
  onSeek?: (position: number) => void;
}

// Atskiras paveikslėlis su puslapio vartymo perėjimu
const AnimatedImage = ({
  uri,
  isActive,
  wasActive,
}: {
  uri: string;
  isActive: boolean;
  wasActive: boolean;
}) => {
  const opacity = useSharedValue(isActive ? 1 : 0);
  const rotateY = useSharedValue(0);
  const zIndex = useSharedValue(isActive ? 2 : 0);
  const prevIsActive = useRef(isActive);
  const prevWasActive = useRef(wasActive);

  useEffect(() => {
    // Animuoti tik tada, kai yra realus būsenos pokytis
    const activeChanged = prevIsActive.current !== isActive;
    const wasActiveChanged = prevWasActive.current !== wasActive;

    prevIsActive.current = isActive;
    prevWasActive.current = wasActive;

    // Praleisti animaciją, jei niekas iš tikrųjų nepasikeitė
    if (!activeChanged && !wasActiveChanged) return;

    if (isActive && activeChanged) {
      // Puslapis atsiverčia iš dešinės (lyg verčiant knygos lapą)
      rotateY.value = -90;
      zIndex.value = 2;
      opacity.value = 1;

      // Lėta puslapio vartymo animacija
      rotateY.value = withTiming(0, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else if (wasActive && wasActiveChanged && !isActive) {
      // Puslapis išsiverčia į kairę (tik jei nėra ir aktyvus)
      zIndex.value = 1;
      rotateY.value = withTiming(90, {
        duration: 800,
        easing: Easing.in(Easing.cubic),
      });
      // Išnykti po pasukimo
      opacity.value = withDelay(600, withTiming(0, { duration: 200 }));
    } else if (!isActive && !wasActive) {
      opacity.value = 0;
      rotateY.value = 0;
      zIndex.value = 0;
    }
  }, [isActive, wasActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      zIndex: zIndex.value,
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.imageWrapper, animatedStyle]}>
      <Image
        source={{ uri }}
        style={styles.fullImage}
        resizeMode="cover"
      />
    </Animated.View>
  );
};

// Plaukiojančios dalelės / žvaigždės komponentas su atsitiktine kryptimi
const FloatingParticle = ({
  delay,
  startX,
  startY,
  endX,
  endY,
  size,
  duration,
}: {
  delay: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  duration: number;
}) => {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Plaukiojimas atsitiktine kryptimi
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(endX, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(startX, { duration: 0 })
        ),
        -1,
        false
      )
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(endY, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(startY, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // Pasirodymas / išnykimas
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: duration * 0.15 }),
          withTiming(0.5, { duration: duration * 0.6 }),
          withTiming(0, { duration: duration * 0.25 })
        ),
        -1,
        false
      )
    );

    // Pulsavimo mastelis
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size },
        animatedStyle,
      ]}
    />
  );
};

// Lietaus lašo komponentas
const RainDrop = ({
  delay,
  startX,
  duration,
  length,
}: {
  delay: number;
  startX: number;
  duration: number;
  length: number;
}) => {
  const translateY = useSharedValue(-length);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(SCREEN_HEIGHT + 50, { duration, easing: Easing.linear }),
          withTiming(-length, { duration: 0 })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 100 }),
          withTiming(0.3, { duration: duration - 200 }),
          withTiming(0, { duration: 100 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        { left: startX, height: length },
        animatedStyle,
      ]}
    />
  );
};

// Saulės / mėnulio švytėjimo komponentas
const CelestialGlow = ({ type }: { type: 'sun' | 'moon' }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Pasirodyti po pauzės
    const appearDelay = 3000 + Math.random() * 5000;

    opacity.value = withDelay(
      appearDelay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 3000, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3000, easing: Easing.in(Easing.ease) }),
          withTiming(0, { duration: 15000 }) // Kurį laiką likti paslėptam
        ),
        -1,
        false
      )
    );

    scale.value = withDelay(
      appearDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
          withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.95, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 3000, easing: Easing.in(Easing.ease) }),
          withTiming(0.5, { duration: 15000 })
        ),
        -1,
        false
      )
    );

    // Lėtas pasukimas spindulių efektui
    rotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const isSun = type === 'sun';

  return (
    <Animated.View
      style={[
        styles.celestial,
        isSun ? styles.sun : styles.moon,
        animatedStyle,
      ]}
    >
      {/* Vidinis švytėjimas */}
      <View style={[
        styles.celestialInner,
        { backgroundColor: isSun ? 'rgba(255, 220, 100, 0.9)' : 'rgba(220, 230, 255, 0.9)' }
      ]} />
      {/* Spinduliai */}
      {isSun && (
        <>
          <View style={[styles.sunRay, { transform: [{ rotate: '0deg' }] }]} />
          <View style={[styles.sunRay, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.sunRay, { transform: [{ rotate: '90deg' }] }]} />
          <View style={[styles.sunRay, { transform: [{ rotate: '135deg' }] }]} />
        </>
      )}
    </Animated.View>
  );
};

// Plaukiojančių dalelių perdanga su atsitiktinėmis kryptimis
const FloatingParticles = ({ count = 18 }: { count?: number }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Atsitiktinė pradžios pozicija bet kurioje ekrano vietoje
      const startX = Math.random() * SCREEN_WIDTH;
      const startY = Math.random() * SCREEN_HEIGHT;
      // Atsitiktinė pabaigos pozicija - dreifuoti bet kuria kryptimi (100-250px judesys)
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 150;
      const endX = startX + Math.cos(angle) * distance;
      const endY = startY + Math.sin(angle) * distance;

      return {
        id: i,
        delay: Math.random() * 10000,
        startX,
        startY,
        endX,
        endY,
        size: 3 + Math.random() * 7,
        duration: 8000 + Math.random() * 12000,
      };
    });
  }, [count]);

  return (
    <View style={styles.particlesContainer} pointerEvents="none">
      {particles.map((p) => (
        <FloatingParticle
          key={p.id}
          delay={p.delay}
          startX={p.startX}
          startY={p.startY}
          endX={p.endX}
          endY={p.endY}
          size={p.size}
          duration={p.duration}
        />
      ))}
    </View>
  );
};

// Lietaus perdanga
const RainOverlay = ({ intensity = 30 }: { intensity?: number }) => {
  const drops = useMemo(() => {
    return Array.from({ length: intensity }, (_, i) => ({
      id: i,
      delay: Math.random() * 2000,
      startX: Math.random() * SCREEN_WIDTH,
      duration: 800 + Math.random() * 600,
      length: 15 + Math.random() * 25,
    }));
  }, [intensity]);

  return (
    <View style={styles.particlesContainer} pointerEvents="none">
      {drops.map((d) => (
        <RainDrop
          key={d.id}
          delay={d.delay}
          startX={d.startX}
          duration={d.duration}
          length={d.length}
        />
      ))}
    </View>
  );
};

// Oro efektų talpyklė
const WeatherEffects = ({ showRain = false, showSun = true }: { showRain?: boolean; showSun?: boolean }) => {
  // Prijungiant atsitiktinai vieną kartą pasirinkti saulę arba mėnulį
  const celestialType = useMemo((): 'sun' | 'moon' => Math.random() > 0.5 ? 'sun' : 'moon', []);

  return (
    <>
      {showRain && <RainOverlay intensity={40} />}
      {showSun && <CelestialGlow type={celestialType} />}
    </>
  );
};

// 1. Pulsuojantis vinjetės švytėjimas
const PulsingVignette = () => {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.98, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.vignetteContainer, animatedStyle]}>
      <LinearGradient
        colors={[
          'rgba(255, 180, 100, 0.35)',
          'rgba(255, 200, 130, 0.12)',
          'transparent',
          'transparent',
          'rgba(255, 200, 130, 0.12)',
          'rgba(255, 180, 100, 0.35)',
        ]}
        locations={[0, 0.15, 0.3, 0.7, 0.85, 1]}
        style={styles.vignetteGradient}
      />
    </Animated.View>
  );
};

// 2. Mirgėjimo perdanga - šviesos slinkties efektas
const ShimmerOverlay = () => {
  const translateX = useSharedValue(-SCREEN_WIDTH * 1.5);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withDelay(3000, withTiming(-SCREEN_WIDTH * 1.5, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: '20deg' },
    ],
  }));

  return (
    <Animated.View style={[styles.shimmerContainer, animatedStyle]}>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.03)',
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.03)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
};

// 3. Žibučių sankaupos komponentas
const SparkleCluster = ({ x, y, count = 5 }: { x: number; y: number; count?: number }) => {
  const sparkles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      offsetX: (Math.random() - 0.5) * 80,
      offsetY: (Math.random() - 0.5) * 80,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 2000,
      duration: 1500 + Math.random() * 1000,
    }));
  }, [count]);

  return (
    <View style={[styles.sparkleCluster, { left: x, top: y }]}>
      {sparkles.map((s) => (
        <Sparkle
          key={s.id}
          offsetX={s.offsetX}
          offsetY={s.offsetY}
          size={s.size}
          delay={s.delay}
          duration={s.duration}
        />
      ))}
    </View>
  );
};

const Sparkle = ({
  offsetX,
  offsetY,
  size,
  delay,
  duration,
}: {
  offsetX: number;
  offsetY: number;
  size: number;
  delay: number;
  duration: number;
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.3, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.ease) }),
          withDelay(Math.random() * 2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: duration * 0.3, easing: Easing.out(Easing.back()) }),
          withTiming(0.8, { duration: duration * 0.7, easing: Easing.in(Easing.ease) }),
          withDelay(Math.random() * 2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: offsetX },
      { translateY: offsetY },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        { width: size, height: size },
        animatedStyle,
      ]}
    >
      {/* Kryžiaus forma žibutei */}
      <View style={[styles.sparkleH, { height: size, width: size / 3 }]} />
      <View style={[styles.sparkleV, { width: size, height: size / 3 }]} />
    </Animated.View>
  );
};

// Žibučių sankaupų perdanga
const SparkleClusters = () => {
  const clusters = useMemo(() => [
    { id: 1, x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.3, count: 4 },
    { id: 2, x: SCREEN_WIDTH * 0.7, y: SCREEN_HEIGHT * 0.25, count: 5 },
    { id: 3, x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.5, count: 6 },
    { id: 4, x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.7, count: 4 },
    { id: 5, x: SCREEN_WIDTH * 0.8, y: SCREEN_HEIGHT * 0.6, count: 5 },
  ], []);

  return (
    <View style={styles.particlesContainer} pointerEvents="none">
      {clusters.map((c) => (
        <SparkleCluster key={c.id} x={c.x} y={c.y} count={c.count} />
      ))}
    </View>
  );
};

// 4. Gylio suliejimo efektas (animuota kraštų suliejimo imitacija)
const DepthBlurEffect = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.depthBlurContainer, animatedStyle]}>
      {/* Viršaus suliejimas */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.3)', 'transparent']}
        style={styles.depthBlurTop}
      />
      {/* Apačios suliejimas */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.3)']}
        style={styles.depthBlurBottom}
      />
      {/* Kairės suliejimas */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.2)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.depthBlurLeft}
      />
      {/* Dešinės suliejimas */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.depthBlurRight}
      />
    </Animated.View>
  );
};

// Magiškų efektų talpyklė
const MagicalEffects = () => {
  return (
    <>
      <PulsingVignette />
      <ShimmerOverlay />
      <SparkleClusters />
      <DepthBlurEffect />
    </>
  );
};

// Pašalinti garso žymas iš teksto, skirto rodyti (kaip story/[id].tsx)
const stripAudioTags = (text: string): string => {
  return text.replace(/\[(softly|whispers|whisper|yawns|yawn|sighs|sigh|laughs|laugh|giggles|giggle|excited|curious|mysteriously|warmly|sadly|angrily|nervously|cheerfully|playfully|seriously|gently|loudly|quietly|in lithuanian language|long pause)\]/gi, '').replace(/\s+/g, ' ').trim();
};

// Padalinti pasaką į pastraipas sinchronizuotiems subtitrams
// Kiekviena pastraipa = 1 paveikslėlis = 1 subtitrų segmentas
const splitIntoParagraphs = (text: string): string[] => {
  if (!text) return [];

  // Padalinti pagal dvigubas naujos eilutės žymes arba „..." pauzės žymeklius
  const paragraphs = text
    .split(/\n\s*\n|(?:^|\n)\s*\.\.\.\s*(?:\n|$)/)
    .map(p => stripAudioTags(p.trim()))
    .filter(p => p.length > 10 && !p.match(/^[\.\s]+$/)); // Atfiltruoti pastraipas vien iš taškų (su tarpais arba be jų)

  return paragraphs;
};

// Apskaičiuoti kaupiamuosius laiko slenksčius pagal ištartų simbolių skaičių
// Naudoja apdorotą tekstą (faktiškai ištartus žodžius) tikslesniam laiko įvertinimui
const calculateParagraphTimings = (rawText: string, paragraphs: string[]): number[] => {
  if (paragraphs.length === 0) return [];

  // Naudoti jau apdorotas pastraipas ištartų simbolių skaičiui
  // Tai tiksliau, nes žymos kaip [softly] nėra ištariamos

  // Įvertinti pauzės trukmę kaip vidutinio pastraipos ilgio procentą
  // ElevenLabs „..." pauzė trunka maždaug 1,5-2 sekundes
  // Vidutinė pastraipa yra ~10-15 sekundžių, todėl pauzė sudaro ~10-15% pastraipos laiko
  const PAUSE_FACTOR = 0.12; // Pauzė prideda ~12% prie kiekvienos pastraipos laiko

  const spokenLengths = paragraphs.map((p, i) => {
    const chars = p.length;
    // Pridėti pauzės koeficientą visoms pastraipoms, išskyrus paskutinę
    const pauseChars = i < paragraphs.length - 1 ? Math.round(chars * PAUSE_FACTOR) : 0;
    return chars + pauseChars;
  });

  const totalChars = spokenLengths.reduce((sum, count) => sum + count, 0);
  if (totalChars === 0) return paragraphs.map((_, i) => (i + 1) / paragraphs.length);

  // Apskaičiuoti kaupiamuosius slenksčius (kada baigiasi kiekviena pastraipa kaip % viso teksto)
  const thresholds: number[] = [];
  let cumulative = 0;
  for (const count of spokenLengths) {
    cumulative += count;
    thresholds.push(cumulative / totalChars);
  }

  return thresholds;
};

// Gauti pastraipos indeksą iš garso eigos santykio naudojant įvertintus slenksčius
const getImageIndexFromProgress = (progressRatio: number, thresholds: number[]): number => {
  if (thresholds.length === 0) return 0;

  for (let i = 0; i < thresholds.length; i++) {
    if (progressRatio < thresholds[i]) {
      return i;
    }
  }
  return thresholds.length - 1;
};

// Gauti pastraipos indeksą iš tikslių laiko žymenų (sekundėmis)
// Tai tiksliausias metodas, kai laiko žymenys yra prieinami
const getImageIndexFromTimestamps = (positionMs: number, endTimesSeconds: number[]): number => {
  if (endTimesSeconds.length === 0) return 0;

  const positionSec = positionMs / 1000;

  for (let i = 0; i < endTimesSeconds.length; i++) {
    if (positionSec < endTimesSeconds[i]) {
      return i;
    }
  }
  return endTimesSeconds.length - 1;
};

// Sinchronizuotų subtitrų perdangos komponentas - sinchronizuojasi su esamu paveikslėliu
const SubtitleOverlay = ({
  storyContent,
  currentImageIndex,
  visible,
}: {
  storyContent: string;
  currentImageIndex: number;
  visible: boolean;
}) => {
  const opacity = useSharedValue(0);

  // Padalinti pasaką į pastraipas - 1 pastraipa = 1 paveikslėlis
  const paragraphs = useMemo(
    () => splitIntoParagraphs(storyContent),
    [storyContent]
  );

  // Gauti esamą pastraipą, atitinkančią esamą paveikslėlį
  const currentText = paragraphs[currentImageIndex] || '';

  // Animuoti permatomumą, kai pasikeičia paveikslėlis / pastraipa
  useEffect(() => {
    if (visible && currentText) {
      // Paryškinti naują tekstą
      opacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [currentImageIndex, visible, currentText]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!currentText) return null;

  return (
    <Animated.View style={[styles.subtitleContainer, animatedStyle]}>
      <View style={styles.subtitleBox}>
        <Text style={styles.subtitleText}>
          {currentText}
        </Text>
      </View>
    </Animated.View>
  );
};

export default function ImmersiveStoryPlayer({
  images,
  isPlaying,
  position,
  duration,
  title,
  storyContent,
  paragraphEndTimes,
  onPlayPause,
  onClose,
  onSeek,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(-1); // Sekti ankstesnį puslapio vartymui
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true); // Perjungti subtitrus
  const [isManualMode, setIsManualMode] = useState(false); // Naudotojas perbraukė rankiniu būdu
  const justExitedManualMode = useRef(false); // Praleisti vieną sinchronizavimo ciklą išėjus iš rankinio režimo
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const lastImageChangeTime = useRef(0); // Sekti paskutinį paveikslėlio keitimą minimaliai pauzei
  const MIN_IMAGE_DURATION_MS = 2000; // Mažiausiai 2 sekundės vienam paveikslėliui (sumažinta geresnei sinchronizacijai)

  // Apskaičiuoti pastraipų laiką pagal simbolių skaičių tiksliam garso sinchronizavimui
  const paragraphTimings = useMemo(() => {
    if (!storyContent) return [];
    const paragraphs = splitIntoParagraphs(storyContent);
    return calculateParagraphTimings(storyContent, paragraphs);
  }, [storyContent]);

  // Normalizuoti paragraphEndTimes - apdoroti galimas tipų problemas iš Supabase
  const normalizedEndTimes = useMemo(() => {
    if (!paragraphEndTimes) return null;

    // Jei tai eilutė (neturėtų atsitikti, bet dėl atsargumo), bandyti analizuoti
    if (typeof paragraphEndTimes === 'string') {
      try {
        const parsed = JSON.parse(paragraphEndTimes);
        return Array.isArray(parsed) ? parsed.map(Number) : null;
      } catch {
        return null;
      }
    }

    // Užtikrinti, kad visi elementai būtų skaičiai
    if (Array.isArray(paragraphEndTimes)) {
      return paragraphEndTimes.map(t => typeof t === 'string' ? parseFloat(t) : t);
    }

    return null;
  }, [paragraphEndTimes, images.length]);

  // Perbraukimo animacijos reikšmės
  const swipeTranslateX = useSharedValue(0);
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

  // Apdoroti perbraukimą į konkretų paveikslėlį
  const handleSwipeToImage = useCallback((newIndex: number, direction: 'left' | 'right') => {
    // Perbraukimas į dešinę (atgal) = pristabdyti garsą ir įjungti rankinį režimą
    if (direction === 'right' && isPlaying) {
      onPlayPause(); // Pristabdyti
      setIsManualMode(true);
    } else if (!isPlaying) {
      // Jei jau pristabdyta, likti rankiniame režime
      setIsManualMode(true);
    }
    // Jei braukiama pirmyn grojant, nenustatyti rankinio režimo - leisti garsui tęstis

    // Apskaičiuoti naują garso poziciją šiam paveikslėliui naudojant pagal žodžių skaičių paremtą laiką
    if (onSeek && duration > 0) {
      let newPosition: number;
      if (paragraphTimings.length > 0 && newIndex < paragraphTimings.length) {
        // Naudoti pastraipos pradžią (ankstesnį slenkstį arba 0)
        const startRatio = newIndex === 0 ? 0 : paragraphTimings[newIndex - 1];
        newPosition = startRatio * duration;
      } else {
        // Atsarginis variantas - lygus padalijimas
        newPosition = (newIndex / images.length) * duration;
      }
      onSeek(newPosition);
    }

    // Atstatyti paveikslėlio keitimo laikmatį braukiant rankiniu būdu
    lastImageChangeTime.current = Date.now();
    setPreviousIndex(currentIndex);
    setCurrentIndex(newIndex);
  }, [isPlaying, onPlayPause, onSeek, duration, images.length, currentIndex, paragraphTimings]);

  // Išeiti iš rankinio režimo, kai garsas atnaujinamas
  useEffect(() => {
    if (isPlaying) {
      setIsManualMode(false);
    }
  }, [isPlaying]);

  // Apskaičiuoti, kurį paveikslėlį rodyti pagal garso eigą
  // Prioritetas: 1) Tikslūs laiko žymenys, 2) Įvertinti slenksčiai, 3) Lygus padalijimas
  useEffect(() => {
    if (isManualMode || justExitedManualMode.current || images.length === 0 || duration === 0) return;

    let newIndex: number;

    // 1 prioritetas: Naudoti tikslius laiko žymenis, jei jie yra (tiksliausia)
    if (normalizedEndTimes && normalizedEndTimes.length > 0) {
      newIndex = Math.min(
        getImageIndexFromTimestamps(position, normalizedEndTimes),
        images.length - 1
      );
    }
    // 2 prioritetas: Naudoti įvertintus slenksčius pagal teksto ilgį
    else if (paragraphTimings.length > 0) {
      const progressRatio = position / duration;
      newIndex = Math.min(
        getImageIndexFromProgress(progressRatio, paragraphTimings),
        images.length - 1
      );
    }
    // 3 prioritetas: Grįžti prie lygaus padalijimo
    else {
      const progressRatio = position / duration;
      newIndex = Math.min(
        Math.floor(progressRatio * images.length),
        images.length - 1
      );
    }

    const now = Date.now();
    const timeSinceLastChange = now - lastImageChangeTime.current;

    // Keisti paveikslėlį tik tada, kai praėjo pakankamai laiko (užkerta kelią per greitiems perėjimams)
    if (newIndex !== currentIndex && newIndex >= 0 && timeSinceLastChange >= MIN_IMAGE_DURATION_MS) {
      lastImageChangeTime.current = now;
      setPreviousIndex(currentIndex); // Išsaugoti ankstesnį puslapio vartymo animacijai
      setCurrentIndex(newIndex);
    }
  }, [position, duration, images.length, isManualMode, paragraphTimings, normalizedEndTimes, currentIndex]);

  // Automatiškai slėpti valdiklius grojant
  useEffect(() => {
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [isPlaying]);

  const handleTap = () => {
    // Palietimas perjungia grojimą/pristabdymą
    if (isPlaying) {
      // Pristabdyti
      onPlayPause();
      setIsManualMode(true);
      setShowControls(true);
    } else {
      // Tęsti nuo esamos pozicijos (perbraukimas jau persuko, jei naudotojas perbraukė)
      // Nustatyti žymę, kad akimirkai būtų praleistas paveikslėlių sinchronizavimas (užkerta kelią dvigubam puslapio vartymui)
      justExitedManualMode.current = true;
      setTimeout(() => {
        justExitedManualMode.current = false;
      }, 500);
      onPlayPause();
      setIsManualMode(false);
      // Slėpti valdiklius po pauzės
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Sekti, ar naudotojas braukia (kad nessuveiktų palietimas)
  const isSwiping = useRef(false);

  // Tempimo gestas perbraukimui tarp paveikslėlių
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isSwiping.current = false;
    })
    .onUpdate((event) => {
      swipeTranslateX.value = event.translationX;
      // Pažymėti kaip braukimą, jei pajudėjo daugiau nei 10px
      if (Math.abs(event.translationX) > 10) {
        isSwiping.current = true;
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && currentIndex > 0) {
        // Perbraukimas į dešinę = ankstesnis paveikslėlis (pristabdyti garsą)
        runOnJS(handleSwipeToImage)(currentIndex - 1, 'right');
      } else if (event.translationX < -SWIPE_THRESHOLD && currentIndex < images.length - 1) {
        // Perbraukimas į kairę = kitas paveikslėlis
        runOnJS(handleSwipeToImage)(currentIndex + 1, 'left');
      }
      swipeTranslateX.value = withTiming(0, { duration: 200 });
    });

  // Palietimo gestas - suveikia tik tada, kai nebraukiama
  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      // Apdoroti palietimą tik tada, jei naudotojas nebraukė
      if (!isSwiping.current) {
        runOnJS(handleTap)();
      }
      isSwiping.current = false;
    });

  // Sujungti gestus
  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Animuotas stilius perbraukimo grįžtamajam ryšiui - tik subtilus horizontalus tempimas, be pasukimo
  const swipeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: swipeTranslateX.value * 0.2 }, // Subtilus tempimo grįžtamasis ryšys
      ],
    };
  });


  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Fono sluoksnis - tamsus */}
      <View style={styles.background} />

      {/* Paveikslėliai su persiliejimo perėjimu - galima braukti */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageContainer, swipeAnimatedStyle]}>
          {images.map((img, index) => (
            <AnimatedImage
              key={img.id}
              uri={img.image_url}
              isActive={index === currentIndex}
              wasActive={index === previousIndex}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Magiškų efektų perdanga */}
      <MagicalEffects />

      {/* Plaukiojančių dalelių perdanga */}
      <FloatingParticles count={15} />

      {/* Oro efektai - saulė / mėnulis pasirodo retkarčiais */}
      <WeatherEffects showRain={false} showSun={true} />

      {/* Sinchronizuotų subtitrų perdanga - sinchronizuojasi su esamu paveikslėliu */}
      {storyContent && (
        <SubtitleOverlay
          storyContent={storyContent}
          currentImageIndex={currentIndex}
          visible={showSubtitles && !showControls}
        />
      )}

      {/* Gradiento perdangos valdiklių matomumui */}
      {showControls && (
        <>
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.topGradient}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bottomGradient}
          />
        </>
      )}

      {/* Valdiklių perdanga */}
      {showControls && (
        <View style={styles.controlsContainer}>
          {/* Viršutinė juosta */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <FontAwesome name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {/* Subtitrų perjungimo mygtukas */}
            {storyContent && (
              <TouchableOpacity
                style={styles.subtitleToggle}
                onPress={() => setShowSubtitles(!showSubtitles)}
              >
                <FontAwesome
                  name={showSubtitles ? 'cc' : 'cc'}
                  size={20}
                  color={showSubtitles ? '#fff' : 'rgba(255,255,255,0.4)'}
                />
              </TouchableOpacity>
            )}
            {!storyContent && <View style={styles.closeButton} />}
          </View>

          {/* Tarpiklis apatinei juostai nustumti žemyn */}
          <View style={styles.centerControls} />

          {/* Apatinė juosta su puslapių skaitikliu */}
          <View style={styles.bottomBar}>
            {/* Puslapių skaitiklis */}
            <Text style={styles.pageCounter}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bottomBar: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    width: 45,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  pageCounter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  rainDrop: {
    position: 'absolute',
    width: 2,
    backgroundColor: 'rgba(180, 200, 255, 0.5)',
    borderRadius: 2,
  },
  celestial: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sun: {
    top: 80,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 200, 50, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  moon: {
    top: 80,
    right: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(200, 210, 255, 0.15)',
    shadowColor: '#E0E8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  celestialInner: {
    width: '60%',
    height: '60%',
    borderRadius: 100,
  },
  sunRay: {
    position: 'absolute',
    width: 120,
    height: 3,
    backgroundColor: 'rgba(255, 220, 100, 0.3)',
    borderRadius: 2,
  },
  // Vinjetės stiliai
  vignetteContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  vignetteGradient: {
    flex: 1,
  },
  // Mirgėjimo stiliai
  shimmerContainer: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.5,
    left: 0,
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_HEIGHT * 2,
    pointerEvents: 'none',
  },
  shimmerGradient: {
    flex: 1,
  },
  // Žibučių stiliai
  sparkleCluster: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  sparkle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleH: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
  },
  sparkleV: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
  },
  // Gylio suliejimo stiliai
  depthBlurContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  depthBlurTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.15,
  },
  depthBlurBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.15,
  },
  depthBlurLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.1,
  },
  depthBlurRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.1,
  },
  // Subtitrų stiliai
  subtitleContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  subtitleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    maxWidth: SCREEN_WIDTH - 32,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subtitleToggle: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
