import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

import SwipeableCards from '@/components/SwipeableCards';
import { useCards } from '@/hooks/useCards';
import { useGamification } from '@/hooks/useGamification';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { CardCategory } from '@/types';

// Kategorijų pavadinimai lietuvių kalba
const CATEGORY_NAMES: Record<string, string> = {
  animals: 'Gyvūnai',
  vegetables: 'Daržovės',
  fruits: 'Vaisiai',
  transport: 'Transportas',
  shapes: 'Formos',
  clothes: 'Drabužiai',
  body_parts: 'Kūno dalys',
  colors: 'Spalvos',
  numbers: 'Skaičiai',
  letters: 'Raidės',
  objects: 'Daiktai',
};

export default function CardsCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { cards, fetchCards, isLoading } = useCards();
  const { updateCardProgress } = useGamification();
  const [maxViewedIndex, setMaxViewedIndex] = useState(-1);

  useEffect(() => {
    if (category) {
      fetchCards(category as CardCategory);
    }
  }, [category, fetchCards]);

  // Stebėti kortelių progresą peržiūrint korteles
  const handleCardChange = useCallback((index: number) => {
    if (index > maxViewedIndex) {
      setMaxViewedIndex(index);
      // Atnaujinti progresą: index + 1, nes indeksas prasideda nuo 0
      if (category && cards.length > 0) {
        updateCardProgress(category, index + 1, cards.length);
      }
    }
  }, [category, cards.length, maxViewedIndex, updateCardProgress]);

  const categoryName = CATEGORY_NAMES[category || ''] || category || 'Kortelės';

  return (
    <ImageBackground
      source={require('@/assets/images/bg_main_image.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: categoryName,
          headerBackTitle: 'Atgal',
          headerTintColor: colors.primary,
          headerTransparent: true,
          headerBlurEffect: colorScheme === 'dark' ? 'dark' : 'light',
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
        }}
      />
      <View style={styles.content}>
        <SwipeableCards cards={cards} onCardChange={handleCardChange} />
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
    paddingTop: 100, // Atsižvelgti į antraštę
  },
});
