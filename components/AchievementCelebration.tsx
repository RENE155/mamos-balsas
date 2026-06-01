import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Achievement } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

// Animuotos žvaigždės komponentas
function AnimatedStar({ delay, x, y }: { delay: number; x: number; y: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1000, withTiming(0, { duration: 500 }))
      )
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        3,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.star, { left: x, top: y }, style]}>
      ⭐
    </Animated.Text>
  );
}

export default function AchievementCelebration({ achievement, onDismiss }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);

  useEffect(() => {
    if (achievement) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(1.1, { damping: 8 }),
        withDelay(100, withSpring(1, { damping: 10 }))
      );
      iconScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.3, { damping: 6 }),
          withSpring(1, { damping: 8 })
        )
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
      iconScale.value = 0;
    }
  }, [achievement]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!achievement) return null;

  // Sugeneruoti atsitiktines žvaigždžių pozicijas
  const stars = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * (SCREEN_WIDTH - 40),
    y: Math.random() * (SCREEN_HEIGHT * 0.6),
    delay: Math.random() * 500,
  }));

  return (
    <Modal
      visible={!!achievement}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Animuotos žvaigždės */}
        {stars.map((star) => (
          <AnimatedStar key={star.id} delay={star.delay} x={star.x} y={star.y} />
        ))}

        <Animated.View style={[styles.card, { backgroundColor: colors.card }, cardStyle]}>
          <Animated.Text style={[styles.icon, iconStyle]}>
            {achievement.icon}
          </Animated.Text>
          <Text style={[styles.title, { color: colors.primary }]}>
            Naujas pasiekimas!
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {achievement.name_lt}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {achievement.description_lt}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Puiku!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  star: {
    position: 'absolute',
    fontSize: 24,
  },
});
