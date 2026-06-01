import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { usePregeneratedStories } from '@/hooks/usePregeneratedStories';
import { useGamification } from '@/hooks/useGamification';
import ImmersiveStoryPlayer from '@/components/ImmersiveStoryPlayer';
import AchievementCelebration from '@/components/AchievementCelebration';
import type { PregeneratedStory, PregeneratedStoryImage, StoryImage, Achievement } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pašalinti ElevenLabs garso žymas iš teksto, skirto rodyti
const stripAudioTags = (text: string): string => {
  return text.replace(/\[(softly|whispers|whisper|yawns|yawn|sighs|sigh|laughs|laugh|giggles|giggle|excited|curious|mysteriously|warmly|sadly|angrily|nervously|cheerfully|playfully|seriously|gently|loudly|quietly|in lithuanian language|long pause)\]/gi, '').trim();
};

export default function PregeneratedStoryPlaybackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { incrementViewCount } = usePregeneratedStories();
  const { recordStoryCompletion } = useGamification();

  const [story, setStory] = useState<PregeneratedStory | null>(null);
  const [images, setImages] = useState<PregeneratedStoryImage[]>([]);
  const [isLoadingStory, setIsLoadingStory] = useState(true);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const hasFetchedStory = useRef(false);
  const hasIncrementedView = useRef(false);
  const hasTrackedCompletion = useRef(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showText, setShowText] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImmersivePlayer, setShowImmersivePlayer] = useState(false);

  useEffect(() => {
    if (hasFetchedStory.current) return;
    hasFetchedStory.current = true;

    const loadStory = async () => {
      try {
        // Gauti iš anksto sugeneruotą pasaką
        const { data, error } = await supabase
          .from('pregenerated_stories')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setStory(data);

        // Padidinti peržiūrų skaičių (tik kartą per seansą)
        if (!hasIncrementedView.current && id) {
          hasIncrementedView.current = true;
          incrementViewCount(id);
        }

        // Gauti paveikslėlius
        const { data: imageData, error: imageError } = await supabase
          .from('pregenerated_story_images')
          .select('*')
          .eq('story_id', id)
          .order('scene_index', { ascending: true });

        if (!imageError && imageData) {
          setImages(imageData);
        }
      } catch (err) {
        console.error('[PregeneratedStoryPlayer] Error loading story:', err);
      } finally {
        setIsLoadingStory(false);
      }
    };

    loadStory();
  }, [id, incrementViewCount]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAndPlayAudio = async (autoPlay: boolean = true) => {
    try {
      if (!story?.audio_url) {
        Alert.alert('Nera garso', 'Si pasaka neturi garso iraso');
        return;
      }

      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: story.audio_url },
        { shouldPlay: autoPlay },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[PregeneratedStoryPlayer] Error playing audio:', error);
      Alert.alert('Klaida', 'Nepavyko paleisti garso: ' + (error as Error).message);
    }
  };

  const handlePlayPress = async () => {
    if (images.length > 0 && story?.audio_url) {
      setShowImmersivePlayer(true);
      if (!isPlaying) {
        await loadAndPlayAudio(true);
      }
    } else {
      await loadAndPlayAudio();
    }
  };

  const handleCloseImmersive = async () => {
    setShowImmersivePlayer(false);
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleImmersivePlayPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = async (newPosition: number) => {
    if (sound) {
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
    }
  };

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);

      // Užfiksuoti užbaigimą ties 90%
      const progress = status.durationMillis > 0
        ? status.positionMillis / status.durationMillis
        : 0;

      if (progress >= 0.9 && !hasTrackedCompletion.current && id) {
        hasTrackedCompletion.current = true;
        const achievement = await recordStoryCompletion(id, 'pregenerated');
        if (achievement) {
          setUnlockedAchievement(achievement);
        }
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        if (sound) {
          await sound.setPositionAsync(0);
        }
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoadingStory) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Pasaka nerasta
        </Text>
      </View>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  // Konvertuoti PregeneratedStoryImage į StoryImage formatą, skirtą ImmersiveStoryPlayer
  const storyImages: StoryImage[] = images.map((img) => ({
    id: img.id,
    story_id: img.story_id,
    image_url: img.image_url,
    prompt: img.prompt || '',
    scene_index: img.scene_index,
    scene_text: img.scene_text,
    created_at: img.created_at,
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Atgal mygtukas */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <FontAwesome name="arrow-left" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Atgal</Text>
      </TouchableOpacity>

      {/* Pasakos antraštė */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {story.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {story.duration_seconds < 60
            ? `${story.duration_seconds} sek`
            : `${Math.round(story.duration_seconds / 60)} min`}
          {story.target_age && ` • ${story.target_age <= 3 ? '1-3' : story.target_age <= 5 ? '4-5' : story.target_age <= 7 ? '6-7' : '8-10'} m.`}
        </Text>
        <Text style={[styles.voiceInfo, { color: colors.textSecondary }]}>
          Balsas: {story.voice_name}
        </Text>
      </View>

      {/* Paveikslėlių karuselė */}
      {images.length > 0 && (
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
              setCurrentImageIndex(index);
            }}
            style={styles.imageCarousel}
          >
            {images.map((img, index) => (
              <View key={img.id} style={styles.imageContainer}>
                <Image
                  source={{ uri: img.image_url }}
                  style={styles.storyImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentImageIndex
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Grotuvas */}
      <View style={[styles.playerCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: story.audio_url ? colors.primary : colors.textSecondary }
          ]}
          onPress={handlePlayPress}
          activeOpacity={0.8}
        >
          <FontAwesome
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        {images.length > 0 && story.audio_url && (
          <Text style={[styles.immersiveHint, { color: colors.primary }]}>
            Paspauskite, kad ziuretumete pilname ekrane
          </Text>
        )}

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress * 100}%` },
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatTime(position)}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatTime(duration || (story.duration_seconds * 1000))}
            </Text>
          </View>
        </View>
      </View>

      {/* Veiksmai - supaprastinti iš anksto sugeneruotoms pasakoms */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => setShowText(!showText)}
        >
          <FontAwesome
            name="file-text-o"
            size={20}
            color={colors.text}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {showText ? 'Slepti teksta' : 'Rodyti teksta'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pasakos tekstas */}
      {showText && (
        <View style={[styles.textCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.storyText, { color: colors.text }]}>
            {stripAudioTags(story.content)}
          </Text>
        </View>
      )}

      {/* Įtraukiančio pasakos grotuvo modalas */}
      <Modal
        visible={showImmersivePlayer}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseImmersive}
      >
        <ImmersiveStoryPlayer
          images={storyImages}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          title={story.title}
          storyContent={story.content}
          paragraphEndTimes={story.paragraph_end_times}
          onPlayPause={handleImmersivePlayPause}
          onClose={handleCloseImmersive}
          onSeek={handleSeek}
        />
      </Modal>

      {/* Pasiekimo šventimo modalas */}
      <AchievementCelebration
        achievement={unlockedAchievement}
        onDismiss={() => setUnlockedAchievement(null)}
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    marginBottom: 4,
  },
  voiceInfo: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  playerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  time: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textCard: {
    padding: 20,
    borderRadius: 16,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
  },
  errorText: {
    fontSize: 16,
  },
  immersiveHint: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  imageSection: {
    marginBottom: 20,
  },
  imageCarousel: {
    flexGrow: 0,
  },
  imageContainer: {
    width: SCREEN_WIDTH - 40,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
