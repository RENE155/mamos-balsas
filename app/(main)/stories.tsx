import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useRevenueCat } from '@/context/RevenueCatContext';
import { useStories } from '@/hooks/useStories';
import type { Story } from '@/types';

// Konvertuoti išsaugotą amžių į rodomą intervalą
const getAgeRangeLabel = (age: number | null): string => {
  if (!age) return '';
  if (age <= 3) return '1-3 m.';
  if (age <= 5) return '4-5 m.';
  if (age <= 7) return '6-7 m.';
  if (age <= 10) return '8-10 m.';
  return '11-12 m.';
};

type FilterType = 'all' | 'favorites';

export default function StoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { isPremium } = useRevenueCat();
  const { stories, isLoading, toggleFavorite, getFavorites } = useStories();
  const [filter, setFilter] = useState<FilterType>('all');

  // Nemokami naudotojai gali sukurti tik 1 pasaką
  const canCreateStory = isPremium || stories.length === 0;

  const handleCreateStory = () => {
    if (canCreateStory) {
      router.push('/story/create');
    } else {
      Alert.alert(
        'Premium funkcija',
        'Jūs jau sukūrėte savo nemokamą pasaką. Prenumeruokite Premium, kad galėtumėte kurti neribotai pasakų!',
        [
          { text: 'Vėliau', style: 'cancel' },
          {
            text: 'Prenumeruoti',
            onPress: () => router.push('/paywall'),
          },
        ]
      );
    }
  };

  if (!user || isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayStories = filter === 'favorites' ? getFavorites() : stories;

  const renderStoryItem = ({ item }: { item: Story }) => (
    <AnimatedPressable
      style={styles.storyCard}
      onPress={() => router.push(`/story/${item.id}`)}
      scaleValue={0.97}
    >
      {item.thumbnail_url ? (
        <Image
          source={{ uri: item.thumbnail_url }}
          style={styles.storyCardBg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.storyCardBg, styles.storyCardPlaceholder]}>
          <Text style={styles.storyCardPlaceholderIcon}>📖</Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.storyCardOverlay}
      />
      <View style={styles.storyCardContent}>
        <Text style={styles.storyCardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.storyCardMeta}>
          {item.target_age ? `${getAgeRangeLabel(item.target_age)} • ` : ''}{item.duration_seconds < 60
            ? `${item.duration_seconds} sek`
            : `${Math.round(item.duration_seconds / 60)} min`}
        </Text>
      </View>
      <View style={styles.storyCardActions}>
        <AnimatedPressable
          onPress={() => toggleFavorite(item.id)}
          style={[styles.favoriteButton, { backgroundColor: item.is_favorite ? 'rgba(212, 115, 109, 0.85)' : 'rgba(255, 255, 255, 0.3)' }]}
          scaleValue={0.85}
        >
          <FontAwesome
            name={item.is_favorite ? 'heart' : 'heart-o'}
            size={14}
            color="#fff"
          />
        </AnimatedPressable>
        <View style={styles.playButton}>
          <FontAwesome name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </AnimatedPressable>
  );

  return (
    <View style={styles.container}>
      {/* Antraštė */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mano pasakos</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {stories.length} {stories.length === 1 ? 'sukurta pasaka' : 'sukurtos pasakos'}
        </Text>
      </View>

      {/* Filtravimo skirtukai */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'all' && [styles.filterTabActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="book"
            size={12}
            color={filter === 'all' ? '#fff' : colors.textSecondary}
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? '#fff' : colors.text },
            ]}
          >
            Visos ({stories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'favorites' && [styles.filterTabActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setFilter('favorites')}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="heart"
            size={12}
            color={filter === 'favorites' ? '#fff' : colors.textSecondary}
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterText,
              { color: filter === 'favorites' ? '#fff' : colors.text },
            ]}
          >
            Megstamos ({getFavorites().length})
          </Text>
        </TouchableOpacity>
      </View>

      {displayStories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <FontAwesome
              name={filter === 'favorites' ? 'heart-o' : 'book'}
              size={32}
              color={colors.textSecondary}
            />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {filter === 'favorites'
              ? 'Neturite mėgstamiausių pasakų'
              : 'Dar nesukurta jokių pasakų'}
          </Text>
          {filter === 'all' && (
            <AnimatedPressable
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateStory}
              scaleValue={0.95}
            >
              <FontAwesome name="magic" size={14} color="#fff" />
              <Text style={styles.createButtonText}>Sukurti pasaką</Text>
            </AnimatedPressable>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={displayStories}
            keyExtractor={(item) => item.id}
            renderItem={renderStoryItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          <AnimatedPressable
            style={styles.fab}
            onPress={handleCreateStory}
            scaleValue={0.9}
          >
            <FontAwesome name="plus" size={20} color="#fff" />
            {!canCreateStory && (
              <View style={styles.fabLockBadge}>
                <FontAwesome name="lock" size={10} color="#fff" />
              </View>
            )}
          </AnimatedPressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storyCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(184, 144, 138, 0.3)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  storyCardBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  storyCardPlaceholder: {
    backgroundColor: 'rgba(184, 144, 138, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCardPlaceholderIcon: {
    fontSize: 40,
    opacity: 0.5,
  },
  storyCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  storyCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  storyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyCardActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 144, 138, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 144, 138, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  fabLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 100, 100, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
