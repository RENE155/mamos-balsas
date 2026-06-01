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

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useStories } from '@/hooks/useStories';
import { supabase } from '@/lib/supabase';
import ImmersiveStoryPlayer from '@/components/ImmersiveStoryPlayer';
import type { Story, StoryImage } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pašalinti ElevenLabs garso žymas iš teksto, skirto rodyti
// Žymos kaip [softly], [whispers], [laughs], [excited] ir t. t. skirtos tik TTS
const stripAudioTags = (text: string): string => {
  return text.replace(/\[(softly|whispers|whisper|yawns|yawn|sighs|sigh|laughs|laugh|giggles|giggle|excited|curious|mysteriously|warmly|sadly|angrily|nervously|cheerfully|playfully|seriously|gently|loudly|quietly|in lithuanian language|long pause)\]/gi, '').trim();
};

export default function StoryPlaybackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { toggleFavorite, deleteStory } = useStories();

  const [story, setStory] = useState<Story | null>(null);
  const [images, setImages] = useState<StoryImage[]>([]);
  const [isLoadingStory, setIsLoadingStory] = useState(true);
  const hasFetchedStory = useRef(false);
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
        // Gauti pasaką
        const { data, error } = await supabase
          .from('stories')
          .select(`
            *,
            child:children(*),
            voice_profile:voice_profiles(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setStory(data);

        // Gauti paveikslėlius
        const { data: imageData, error: imageError } = await supabase
          .from('story_images')
          .select('*')
          .eq('story_id', id)
          .order('scene_index', { ascending: true });

        if (!imageError && imageData) {
          setImages(imageData);
        }
      } catch (err) {
        console.error('[StoryPlayer] Error loading story:', err);
      } finally {
        setIsLoadingStory(false);
      }
    };

    loadStory();
  }, [id]);

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
        Alert.alert('Nėra garso', 'Ši pasaka neturi garso įrašo (testavimo režimas)');
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
      console.error('[StoryPlayer] Error playing audio:', error);
      Alert.alert('Klaida', 'Nepavyko paleisti garso: ' + (error as Error).message);
    }
  };

  // Apdoroti grojimo mygtuką - rodyti įtraukiantį grotuvą, jei yra paveikslėlių
  const handlePlayPress = async () => {
    if (images.length > 0 && story?.audio_url) {
      // Rodyti įtraukiantį grotuvą
      setShowImmersivePlayer(true);
      // Paleisti garsą, jei dar nėra grojamas
      if (!isPlaying) {
        await loadAndPlayAudio(true);
      }
    } else {
      // Pasakoms be paveikslėlių tiesiog perjungti garsą
      await loadAndPlayAudio();
    }
  };

  // Apdoroti įtraukiančio grotuvo uždarymą
  const handleCloseImmersive = async () => {
    setShowImmersivePlayer(false);
    // Pristabdyti garsą uždarant
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  // Apdoroti grojimą/pristabdymą iš įtraukiančio grotuvo
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

  // Apdoroti persukimą iš įtraukiančio grotuvo (kai naudotojas perbraukia į kitą paveikslėlį)
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

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        // Persukti atgal į pradžią, kad būtų galima paleisti iš naujo
        if (sound) {
          await sound.setPositionAsync(0);
        }
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Ištrinti pasaką?',
      'Ar tikrai norite ištrinti šią pasaką?',
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Ištrinti',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory(id);
              router.back();
            } catch (error) {
              Alert.alert('Klaida', 'Nepavyko ištrinti pasakos');
            }
          },
        },
      ]
    );
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
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
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(story.created_at).toLocaleDateString('lt-LT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
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

        {/* Užuomina apie įtraukiantį režimą */}
        {images.length > 0 && story.audio_url && (
          <Text style={[styles.immersiveHint, { color: colors.primary }]}>
            Paspauskite, kad ziuretumete pilname ekrane
          </Text>
        )}

        {!story.audio_url && (
          <Text style={[styles.noAudioText, { color: colors.textSecondary }]}>
            Testavimo rezimas - nera garso
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

      {/* Veiksmai */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => toggleFavorite(story.id)}
        >
          <FontAwesome
            name={story.is_favorite ? 'heart' : 'heart-o'}
            size={20}
            color={story.is_favorite ? colors.error : colors.text}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {story.is_favorite ? 'Megstama' : 'Prideti'}
          </Text>
        </TouchableOpacity>

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
            {showText ? 'Slepti' : 'Rodyti'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={handleDelete}
        >
          <FontAwesome name="trash-o" size={20} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>
            Ištrinti
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
          images={images}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          title={story.title}
          storyContent={story.content}
          onPlayPause={handleImmersivePlayPause}
          onClose={handleCloseImmersive}
          onSeek={handleSeek}
        />
      </Modal>
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
    padding: 20,
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
  date: {
    fontSize: 12,
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
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
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
  noAudioText: {
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
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
