import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Achievement } from '@/types';

interface Props {
  achievement: Achievement;
  unlocked: boolean;
  onPress?: () => void;
}

export default function AchievementBadge({ achievement, unlocked, onPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card },
        !unlocked && styles.locked,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, !unlocked && styles.lockedIcon]}>
        {unlocked ? achievement.icon : '🔒'}
      </Text>
      <Text
        style={[
          styles.name,
          { color: unlocked ? colors.text : colors.textSecondary },
        ]}
        numberOfLines={2}
      >
        {achievement.name_lt}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    width: 90,
  },
  locked: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  lockedIcon: {
    opacity: 0.4,
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
