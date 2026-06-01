import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Props {
  completed: boolean;
  size?: number;
  style?: ViewStyle;
}

export default function CompletionCheckmark({ completed, size = 24, style }: Props) {
  if (!completed) return null;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <FontAwesome name="check" size={size * 0.55} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 8,
    left: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
});
