import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  progress: number; // 0-100
  showLabel?: boolean;
  height?: number;
}

export default function ProgressBar({
  progress,
  showLabel = true,
  height = 8,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(progress, 100), { duration: 500 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const isMastered = progress >= 100;

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: isMastered ? '#4CAF50' : colors.primary },
            animatedStyle,
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {isMastered ? '✓ Ismokta!' : `${progress}%`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});
