import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ImageBackground,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AnimatedPressable from '@/components/AnimatedPressable';
import { useAuth } from '@/context/AuthContext';

const { width, height } = Dimensions.get('window');
const backgroundImage = require('@/assets/images/onboarding_bg.png');

const ONBOARDING_KEY = '@bedtime_stories_onboarding_complete';

// KŪRIMO REŽIMAS - nustatykite true, kad pakartotinai įkrovus visada būtų rodomas įvadinis ekranas
const DEV_MODE = false;

// Plaukiojančios dalelės komponentas
function FloatingParticle({ delay, startX, startY, size }: {
  delay: number;
  startX: number;
  startY: number;
  size: number;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Pasirodymas
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 1000 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 10 }));

    // Plaukiojimo animacija
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// Švytinčio rutulio komponentas
function GlowingOrb({ delay, x, y, size }: {
  delay: number;
  x: number;
  y: number;
  size: number;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.4, { duration: 1500 }));

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glowOrb,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// Animuoto bloko perdanga - skirta animuoti iliustracijų sritis
function AnimatedBlock({
  delay,
  x,
  y,
  width: w,
  height: h,
  animationType = 'float'
}: {
  delay: number;
  x: number;
  y: number;
  width: number;
  height: number;
  animationType?: 'float' | 'pulse' | 'rock';
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (animationType === 'float') {
      // Švelnus plaukiojimas aukštyn ir žemyn
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else if (animationType === 'pulse') {
      // Švelnus pulsavimas / kvėpavimas
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.97, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else if (animationType === 'rock') {
      // Švelnus supimas tarsi lopšyje
      rotate.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.animatedBlock,
        {
          left: x,
          top: y,
          width: w,
          height: h,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { createAccount, user } = useAuth();
  const [isCreating, setIsCreating] = React.useState(false);

  // Mygtuko animacija
  const buttonTranslateX = useSharedValue(width);
  const buttonTranslateY = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);

  // Perdangos pasirodymas
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    // Šiek tiek paryškinti perdangą
    overlayOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));

    // Mygtukas atšoka iš dešinės po 2 sekundžių
    buttonOpacity.value = withDelay(2000, withTiming(1, { duration: 300 }));
    buttonTranslateX.value = withDelay(
      2000,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
        mass: 0.8,
      })
    );
    buttonScale.value = withDelay(
      2000,
      withSpring(1, {
        damping: 8,
        stiffness: 200,
      })
    );

    // Pradėti atšokimo animaciją po to, kai pasirodo mygtukas
    buttonTranslateY.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 250, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) })
        ),
        3, // Atšokti 3 kartus
        false
      )
    );

    // Pradėti pulsavimą po to, kai sustoja atšokimas (2500 + 3*500 = 4000ms)
    buttonScale.value = withDelay(
      4000,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Begalinis
        true
      )
    );
  }, []);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: buttonTranslateX.value },
      { translateY: buttonTranslateY.value },
      { scale: buttonScale.value },
    ],
    opacity: buttonOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleContinue = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      // Sukurti paskyrą, jei dar nėra
      if (!user) {
        await createAccount();
      }
      // Pažymėti įvadinį ekraną kaip baigtą
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(main)');
    } catch (error) {
      console.error('Error during onboarding:', error);
      // Vis tiek pereiti į pagrindinį ekraną, net jei paskyros sukurti nepavyko
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(main)');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="stretch"
    >
      {/* Plaukiojančios dalelės gyvybingumo pojūčiui */}
      {/* Viršutinė sritis */}
      <FloatingParticle delay={300} startX={width * 0.08} startY={height * 0.08} size={8} />
      <FloatingParticle delay={600} startX={width * 0.88} startY={height * 0.12} size={6} />
      <FloatingParticle delay={200} startX={width * 0.5} startY={height * 0.05} size={5} />
      <FloatingParticle delay={400} startX={width * 0.25} startY={height * 0.1} size={7} />
      <FloatingParticle delay={700} startX={width * 0.7} startY={height * 0.08} size={6} />

      {/* Viršutinė vidurinė */}
      <FloatingParticle delay={500} startX={width * 0.15} startY={height * 0.2} size={9} />
      <FloatingParticle delay={800} startX={width * 0.92} startY={height * 0.22} size={7} />
      <FloatingParticle delay={350} startX={width * 0.45} startY={height * 0.18} size={5} />
      <FloatingParticle delay={650} startX={width * 0.78} startY={height * 0.25} size={8} />

      {/* Vidurinė sritis */}
      <FloatingParticle delay={900} startX={width * 0.05} startY={height * 0.35} size={10} />
      <FloatingParticle delay={450} startX={width * 0.95} startY={height * 0.38} size={6} />
      <FloatingParticle delay={750} startX={width * 0.35} startY={height * 0.32} size={7} />
      <FloatingParticle delay={550} startX={width * 0.6} startY={height * 0.4} size={8} />

      {/* Apatinė vidurinė */}
      <FloatingParticle delay={1000} startX={width * 0.1} startY={height * 0.5} size={7} />
      <FloatingParticle delay={300} startX={width * 0.85} startY={height * 0.52} size={9} />
      <FloatingParticle delay={600} startX={width * 0.5} startY={height * 0.48} size={6} />
      <FloatingParticle delay={850} startX={width * 0.25} startY={height * 0.55} size={8} />

      {/* Apatinė sritis */}
      <FloatingParticle delay={400} startX={width * 0.08} startY={height * 0.65} size={8} />
      <FloatingParticle delay={700} startX={width * 0.92} startY={height * 0.68} size={7} />
      <FloatingParticle delay={500} startX={width * 0.4} startY={height * 0.62} size={6} />
      <FloatingParticle delay={900} startX={width * 0.72} startY={height * 0.7} size={9} />

      {/* Apačios sritis */}
      <FloatingParticle delay={250} startX={width * 0.15} startY={height * 0.78} size={7} />
      <FloatingParticle delay={550} startX={width * 0.88} startY={height * 0.82} size={8} />
      <FloatingParticle delay={800} startX={width * 0.55} startY={height * 0.85} size={6} />
      <FloatingParticle delay={350} startX={width * 0.3} startY={height * 0.88} size={7} />
      <FloatingParticle delay={650} startX={width * 0.75} startY={height * 0.9} size={5} />
      <FloatingParticle delay={450} startX={width * 0.05} startY={height * 0.92} size={8} />

      {/* Švytintys rutuliai */}
      <GlowingOrb delay={200} x={width * 0.02} y={height * 0.15} size={60} />
      <GlowingOrb delay={400} x={width * 0.85} y={height * 0.28} size={40} />
      <GlowingOrb delay={600} x={width * 0.05} y={height * 0.55} size={50} />

      {/* Animuoti iliustracijų blokai */}
      {/* Širdis viršuje kairėje - pulsavimas */}
      <AnimatedBlock
        delay={300}
        x={width * 0.02}
        y={height * 0.08}
        width={width * 0.2}
        height={height * 0.08}
        animationType="pulse"
      />
      {/* Smegenų iliustracija - pulsavimas */}
      <AnimatedBlock
        delay={500}
        x={width * 0.0}
        y={height * 0.34}
        width={width * 0.22}
        height={height * 0.1}
        animationType="pulse"
      />
      {/* Mama ir vaikas - švelnus plaukiojimas */}
      <AnimatedBlock
        delay={200}
        x={width * 0.55}
        y={height * 0.1}
        width={width * 0.45}
        height={height * 0.22}
        animationType="float"
      />
      {/* Širdis viduryje kairėje - pulsavimas */}
      <AnimatedBlock
        delay={700}
        x={width * 0.02}
        y={height * 0.46}
        width={width * 0.18}
        height={height * 0.08}
        animationType="pulse"
      />
      {/* Meškiukai ant mėnulio - supimas tarsi lopšyje */}
      <AnimatedBlock
        delay={400}
        x={width * 0.55}
        y={height * 0.54}
        width={width * 0.42}
        height={height * 0.14}
        animationType="rock"
      />
      {/* Kūdikis miegantis ant mėnulio - supimas tarsi lopšyje */}
      <AnimatedBlock
        delay={600}
        x={width * 0.0}
        y={height * 0.7}
        width={width * 0.4}
        height={height * 0.14}
        animationType="rock"
      />
      {/* Gėlės apačioje - švelnus plaukiojimas */}
      <AnimatedBlock
        delay={800}
        x={width * 0.1}
        y={height * 0.86}
        width={width * 0.8}
        height={height * 0.1}
        animationType="float"
      />

      {/* Centrinis mygtukas */}
      <Animated.View
        style={[
          styles.centerContainer,
          overlayAnimatedStyle
        ]}
      >
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <AnimatedPressable
            style={[styles.continueButton, isCreating && styles.continueButtonDisabled]}
            onPress={handleContinue}
            scaleValue={0.95}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Pradėti</Text>
                <View style={styles.buttonIconContainer}>
                  <FontAwesome name="arrow-right" size={14} color="#fff" />
                </View>
              </>
            )}
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </ImageBackground>
  );
}

// Eksportuojama pagalbinė funkcija įvadinio ekrano būsenai patikrinti
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  glowOrb: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 220, 210, 0.3)',
    shadowColor: '#FFD5CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  animatedBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183, 134, 128, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 28,
    shadowColor: '#8B6B66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 160,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
