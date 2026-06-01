import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2; // vidinis tarpas 16*2 + tarpas 12

// Konvertuoti išsaugotą amžių į rodomą intervalą
const getAgeRangeLabel = (age: number | null): string => {
  if (!age) return '';
  if (age <= 3) return '1-3 m.';
  if (age <= 5) return '4-5 m.';
  if (age <= 7) return '6-7 m.';
  if (age <= 10) return '8-10 m.';
  return '11-12 m.';
};
import { Link, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import AnimatedPressable from '@/components/AnimatedPressable';
import StreakCounter from '@/components/StreakCounter';
import CompletionCheckmark from '@/components/CompletionCheckmark';
import AchievementCelebration from '@/components/AchievementCelebration';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useStories } from '@/hooks/useStories';
import { usePregeneratedStories } from '@/hooks/usePregeneratedStories';
import { useCards } from '@/hooks/useCards';
import { useGamification } from '@/hooks/useGamification';
import { supabase } from '@/lib/supabase';
import type { PregeneratedStory } from '@/types';

type SectionType = 'stories' | 'cards';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, isLoading: authLoading, createAccount } = useAuth();
  const { stories: pregeneratedStories, fetchStories: fetchPregeneratedStories, isLoading: storiesLoading } = usePregeneratedStories();
  const { galleries, fetchGalleries, isLoading: cardsLoading } = useCards();
  const { stats, isStoryCompleted, newAchievement, clearNewAchievement } = useGamification();

  // Iš naujo užkrauti iš anksto sugeneruotas pasakas ir galerijas, kai ekranas suaktyvinamas
  useFocusEffect(
    useCallback(() => {
      fetchPregeneratedStories();
      fetchGalleries();
    }, [fetchPregeneratedStories, fetchGalleries])
  );

  const [activeSection, setActiveSection] = useState<SectionType>('stories');

  // Automatiškai sukurti paskyrą, jei kažkodėl naudotojo nėra (atsarginis variantas)
  useEffect(() => {
    const ensureAccount = async () => {
      if (!authLoading && !user) {
        try {
          await createAccount();
        } catch (error) {
          console.error('Failed to auto-create account:', error);
        }
      }
    };
    ensureAccount();
  }, [authLoading, user, createAccount]);

  const handleCreateStory = async () => {
    if (!user) return;

    const { data: freshUser } = await supabase
      .from('users')
      .select('subscription_status, free_story_used')
      .eq('id', user.id)
      .single();

    const isSubscriber = freshUser?.subscription_status === 'active';
    if (!isSubscriber && freshUser?.free_story_used) {
      Alert.alert(
        'Pasaka jau sukurta',
        'Norint kurti daugiau pasakų, reikalinga Premium prenumerata.',
        [
          { text: 'Vėliau', style: 'cancel' },
          { text: 'Prenumeruoti', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    router.push('/story/create');
  };

  // Rodyti įkrovimą, kol kraunamas autentifikavimas arba kuriama paskyra
  if (authLoading || !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayStories = pregeneratedStories;

  const renderStoriesSection = () => (
    <>
      {/* Iš anksto sugeneruotos pasakos */}
      {storiesLoading ? (
        <View style={styles.emptySection}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayStories.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Iliustruotos pasakos
            </Text>
          </View>
          <View style={styles.storiesGrid}>
            {displayStories.map((story: PregeneratedStory) => (
              <AnimatedPressable
                key={story.id}
                style={styles.storyCard}
                onPress={() => router.push(`/story/pregenerated/${story.id}`)}
                scaleValue={0.97}
              >
                {story.thumbnail_url ? (
                  <Image
                    source={{ uri: story.thumbnail_url }}
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
                    {story.title}
                  </Text>
                  <View style={styles.storyCardMetaRow}>
                    <Text style={styles.storyCardMeta}>
                      {story.target_age ? `${getAgeRangeLabel(story.target_age)} • ` : ''}{story.duration_seconds < 60
                        ? `${story.duration_seconds} sek`
                        : `${Math.round(story.duration_seconds / 60)} min`}
                    </Text>
                    {story.view_count > 0 && (
                      <View style={styles.viewCountContainer}>
                        <FontAwesome name="eye" size={11} color="rgba(255, 255, 255, 0.85)" />
                        <Text style={styles.viewCountText}>{story.view_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {story.is_asmr && (
                  <View style={styles.asmrBadge}>
                    <Text style={styles.asmrBadgeText}>ASMR</Text>
                  </View>
                )}
                <CompletionCheckmark
                  completed={isStoryCompleted(story.id)}
                  size={22}
                  style={story.is_asmr ? { left: 60 } : undefined}
                />
                <View style={styles.storyCardPlayButton}>
                  <FontAwesome name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptySection}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <FontAwesome name="book" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Pasakos greitai pasirodys!
          </Text>
        </View>
      )}
    </>
  );

  const renderCardsSection = () => {
    if (cardsLoading) {
      return (
        <View style={styles.cardsSection}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (galleries.length === 0) {
      return (
        <View style={styles.cardsSection}>
          <View style={styles.emptySection}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
              <FontAwesome name="th-large" size={32} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Kortelių dar nėra
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Greitai atsiras naujų kortelių!
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cardsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Mokymosi kortelės
          </Text>
        </View>
        <View style={styles.storiesGrid}>
          {galleries.map((gallery) => (
            <AnimatedPressable
              key={gallery.id}
              style={styles.galleryCard}
              onPress={() => router.push(`/cards/${gallery.id}`)}
              scaleValue={0.97}
            >
              {gallery.cover_image_url ? (
                <Image
                  source={{ uri: gallery.cover_image_url }}
                  style={styles.storyCardBg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.storyCardBg, styles.storyCardPlaceholder]}>
                  <Text style={styles.galleryIcon}>{gallery.icon}</Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.storyCardOverlay}
              />
              <View style={styles.storyCardContent}>
                <Text style={styles.storyCardTitle} numberOfLines={1}>
                  {gallery.name_lt}
                </Text>
                <Text style={styles.storyCardMeta}>
                  {gallery.card_count} {gallery.card_count === 1 ? 'kortelė' : 'kortelės'}
                </Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Antraštė su serija */}
      <View style={styles.headerRow}>
        {user && stats && stats.current_streak > 0 && (
          <StreakCounter streak={stats.current_streak} compact />
        )}
      </View>

      {/* Skyrių skirtukai */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'stories' && [styles.tabActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveSection('stories')}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="book"
            size={16}
            color={activeSection === 'stories' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeSection === 'stories' ? '#fff' : colors.textSecondary }
          ]}>
            Pasakos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'cards' && [styles.tabActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveSection('cards')}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="th-large"
            size={16}
            color={activeSection === 'cards' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeSection === 'cards' ? '#fff' : colors.textSecondary }
          ]}>
            Kortelės
          </Text>
        </TouchableOpacity>
      </View>

      {/* Turinys pagal aktyvų skyrių */}
      {activeSection === 'stories' ? renderStoriesSection() : renderCardsSection()}

      {/* Pasiekimo šventimo modalas */}
      <AchievementCelebration
        achievement={newAchievement}
        onDismiss={clearNewAchievement}
      />
    </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 32,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  tabActive: {
    borderColor: 'transparent',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.7,
  },
  cardsSection: {
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(184, 144, 138, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  createButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '500',
  },
  storiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  storyCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
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
  galleryIcon: {
    fontSize: 48,
    opacity: 0.8,
  },
  galleryCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4, // Aukštesnė kortelės forma
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(184, 144, 138, 0.3)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyCardMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  asmrBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(139, 168, 154, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  asmrBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  viewCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyCardPlayButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 144, 138, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});
