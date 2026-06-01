import React, { useEffect } from 'react';
import { StyleSheet, View, ImageBackground, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

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
    opacity.value = withDelay(delay, withTiming(0.85, { duration: 1000 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 10 }));

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(8, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 3500, easing: Easing.inOut(Easing.ease) })
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

const backgroundImage = require('@/assets/images/bg_main_image.png');

export default function MainLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Plaukiojančios dalelės */}
      <FloatingParticle delay={200} startX={width * 0.1} startY={height * 0.08} size={9} />
      <FloatingParticle delay={500} startX={width * 0.85} startY={height * 0.12} size={7} />
      <FloatingParticle delay={300} startX={width * 0.5} startY={height * 0.06} size={6} />
      <FloatingParticle delay={700} startX={width * 0.25} startY={height * 0.15} size={9} />
      <FloatingParticle delay={400} startX={width * 0.92} startY={height * 0.25} size={8} />
      <FloatingParticle delay={600} startX={width * 0.08} startY={height * 0.3} size={10} />
      <FloatingParticle delay={350} startX={width * 0.7} startY={height * 0.2} size={7} />
      <FloatingParticle delay={800} startX={width * 0.15} startY={height * 0.45} size={9} />
      <FloatingParticle delay={450} startX={width * 0.88} startY={height * 0.5} size={8} />
      <FloatingParticle delay={550} startX={width * 0.4} startY={height * 0.35} size={6} />
      <FloatingParticle delay={250} startX={width * 0.95} startY={height * 0.65} size={9} />
      <FloatingParticle delay={650} startX={width * 0.05} startY={height * 0.7} size={7} />
      <FloatingParticle delay={750} startX={width * 0.6} startY={height * 0.55} size={8} />
      <FloatingParticle delay={500} startX={width * 0.3} startY={height * 0.75} size={9} />
      <FloatingParticle delay={350} startX={width * 0.75} startY={height * 0.8} size={6} />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade',
            animationDuration: 200,
          }}
        >
          {/* Skirtukų ekranai - sklandus išnykimo perėjimas */}
          <Stack.Screen
            name="index"
            options={{
              animation: 'fade',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="stories"
            options={{
              animation: 'fade',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="voices"
            options={{
              animation: 'fade',
              animationDuration: 200,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              animation: 'fade',
              animationDuration: 200,
            }}
          />

          {/* Detalių ekranai - išslydimas iš dešinės */}
          <Stack.Screen
            name="story/[id]"
            options={{
              animation: 'slide_from_right',
              animationDuration: 250,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="child/[id]"
            options={{
              animation: 'slide_from_right',
              animationDuration: 250,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="voice/[id]"
            options={{
              animation: 'slide_from_right',
              animationDuration: 250,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
        </Stack>
      </View>
      <BottomNav />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    zIndex: 1,
    pointerEvents: 'none',
  },
});
