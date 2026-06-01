import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  streak: number;
  compact?: boolean;
}

export default function StreakCounter({ streak, compact = false }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    }
  }, [streak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.card }]}>
        <Animated.Text style={[styles.compactIcon, flameStyle]}>
          {streak > 0 ? '🔥' : '💤'}
        </Animated.Text>
        <Text style={[styles.compactCount, { color: colors.text }]}>{streak}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Animated.Text style={[styles.icon, flameStyle]}>
        {streak > 0 ? '🔥' : '💤'}
      </Animated.Text>
      <View style={styles.textContainer}>
        <Text style={[styles.count, { color: colors.text }]}>{streak}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {streak === 1 ? 'diena' : 'dienos'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  icon: {
    fontSize: 24,
  },
  compactIcon: {
    fontSize: 16,
  },
  textContainer: {
    alignItems: 'center',
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
  },
  compactCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
  },
});
