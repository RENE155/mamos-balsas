import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useRevenueCat } from '@/context/RevenueCatContext';
import { useVoices } from '@/hooks/useVoices';
import { usePregeneratedStories } from '@/hooks/usePregeneratedStories';
import { supabase } from '@/lib/supabase';
import { STORY_THEMES } from '@/constants/themes';
import { ART_STYLES, type ArtStyle } from '@/lib/imageGeneration';
import type { StoryTheme, VoiceProfile, PregeneratedStory } from '@/types';

const backgroundImage = require('@/assets/images/bg_main_image.png');

type Step = 'age' | 'pregenerated' | 'theme' | 'voice' | 'style' | 'confirm';

// Meno stiliaus parinktys naudotojo sąsajai
const ART_STYLE_OPTIONS: { id: ArtStyle; name: string; icon: string; description: string }[] = [
  { id: 'watercolor', name: 'Akvarelė', icon: '🎨', description: 'Švelni, svajonė' },
  { id: 'cartoon', name: 'Animacija', icon: '🌈', description: 'Ryški, linksma' },
  { id: 'storybook', name: 'Klasikinė', icon: '📖', description: 'Detali, šilta' },
  { id: 'dreamy', name: 'Svajonė', icon: '✨', description: 'Magiška, rami' },
];

// Amžiaus intervalai pasirinkimui (0-2 ir 2-3 atskirti dėl skirtingų raidos etapų)
const AGE_RANGES = [
  { id: '0-2', label: '0-2 m.', description: 'Kūdikiams', age: 1 },
  { id: '2-3', label: '2-3 m.', description: 'Mažyliams', age: 2 },
  { id: '3-5', label: '3-5 m.', description: 'Ikimokyklinukams', age: 4 },
  { id: '5-7', label: '5-7 m.', description: 'Pradinukams', age: 6 },
  { id: '7-10', label: '7-10 m.', description: 'Vyresniems', age: 8 },
  { id: '10-12', label: '10-12 m.', description: 'Paaugliams', age: 11 },
];

export default function CreateStoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { getReadyVoices, needsRecloning } = useVoices();

  const [step, setStep] = useState<Step>('age');
  const [selectedAge, setSelectedAge] = useState<typeof AGE_RANGES[0] | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<StoryTheme | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('watercolor');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const readyVoices = getReadyVoices();
  const { isPremium } = useRevenueCat();
  const isSubscriber = isPremium;
  const { stories: pregeneratedStories, isLoading: isPregeneratedLoading, getStoriesForAge } = usePregeneratedStories();

  const handleNext = () => {
    if (step === 'age' && selectedAge) {
      if (isPremium) {
        setStep('theme');  // Premium: tęsti pritaikymą
      } else {
        setStep('pregenerated');  // Nemokama: rodyti iš anksto sugeneruotas parinktis
      }
    } else if (step === 'theme' && selectedTheme) {
      setStep('voice');
    } else if (step === 'voice') {
      setStep('style');
    } else if (step === 'style') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'pregenerated') {
      setStep('age');
    } else if (step === 'theme') {
      setStep('age');
    } else if (step === 'voice') {
      setStep('theme');
    } else if (step === 'style') {
      setStep('voice');
    } else if (step === 'confirm') {
      setStep('style');
    } else {
      router.back();
    }
  };

  const handleCreate = async () => {
    if (!selectedAge || !selectedTheme) {
      Alert.alert('Klaida', 'Pasirinkite amžių ir temą');
      return;
    }

    // Patikrinti, ar naudotojui reikia premium prenumeratos - gauti naujausius duomenis iš DB
    if (!isPremium && user) {
      const { data: freshUser } = await supabase
        .from('users')
        .select('free_story_used')
        .eq('id', user.id)
        .single();

      if (freshUser?.free_story_used) {
        router.push('/paywall');
        return;
      }
    }

    router.replace({
      pathname: '/story/generating',
      params: {
        age: selectedAge.age.toString(),
        themeId: selectedTheme.id,
        voiceId: selectedVoice?.id || '',
        artStyle: selectedStyle,
        customPrompt: customPrompt || '',
      },
    });
  };

  const renderAgeSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Kiek vaikui metu?
      </Text>
      <View style={styles.grid}>
        {AGE_RANGES.map((ageRange) => (
          <TouchableOpacity
            key={ageRange.id}
            style={[
              styles.selectionCard,
              { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
              selectedAge?.id === ageRange.id && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedAge(ageRange)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={styles.avatarText}>
                {ageRange.label.split('-')[0]}
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {ageRange.label}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {ageRange.description}
            </Text>
            {selectedAge?.id === ageRange.id && (
              <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                <FontAwesome name="check" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPregeneratedSelection = () => {
    const matchingStories = selectedAge ? getStoriesForAge(selectedAge.age) : [];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Pasirinkite pasaką
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Paruoštos pasakos jūsų vaikui
        </Text>

        {isPregeneratedLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Kraunama...
            </Text>
          </View>
        ) : matchingStories.length > 0 ? (
          <View style={styles.pregeneratedList}>
            {matchingStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={[
                  styles.pregeneratedCard,
                  { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
                ]}
                onPress={() => router.push(`/story/pregenerated/${story.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.pregeneratedIcon, { backgroundColor: colors.primaryLight }]}>
                  <FontAwesome name="book" size={20} color="#fff" />
                </View>
                <View style={styles.pregeneratedInfo}>
                  <Text style={[styles.pregeneratedTitle, { color: colors.text }]}>
                    {story.title}
                  </Text>
                  <Text style={[styles.pregeneratedMeta, { color: colors.textSecondary }]}>
                    {story.target_age} m. • {Math.round((story.duration_seconds || 180) / 60)} min.
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 }]}>
            <FontAwesome name="book" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Šiam amžiui pasakų dar nėra
            </Text>
          </View>
        )}

        {/* Atnaujinimo raginimas veikti */}
        <View style={[styles.upgradeCta, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.upgradeTitle, { color: colors.text }]}>
            Norite sukurti savo unikalią pasaką?
          </Text>
          <Text style={[styles.upgradeSubtitle, { color: colors.textSecondary }]}>
            Su Premium galėsite kurti pasakas su savo temomis ir balsu
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.8}
          >
            <FontAwesome name="star" size={16} color="#fff" />
            <Text style={styles.upgradeButtonText}>Tapti Premium</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderThemeSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Kokia tema?
      </Text>
      <View style={styles.grid}>
        {STORY_THEMES.map((theme) => (
          <TouchableOpacity
            key={theme.id}
            style={[
              styles.selectionCard,
              { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
              selectedTheme?.id === theme.id && !customPrompt && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => {
              setSelectedTheme(theme);
              setCustomPrompt('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.themeIcon}>{theme.icon}</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {theme.name_lt}
            </Text>
            {selectedTheme?.id === theme.id && !customPrompt && (
              <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                <FontAwesome name="check" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Savo užklausos sekcija */}
      <View style={styles.customPromptSection}>
        <Text style={[styles.orDividerText, { color: colors.textSecondary }]}>
          arba
        </Text>
        <Text style={[styles.customPromptLabel, { color: colors.text }]}>
          ✍️ Parašykite savo istoriją
        </Text>
        <TextInput
          style={[
            styles.customPromptInput,
            {
              backgroundColor: colors.card,
              borderColor: customPrompt ? colors.primary : colors.glassStroke,
              color: colors.text,
            },
          ]}
          placeholder="Pvz.: Kartą gyveno senas vyrukas kaime, kuris turėjo stebuklingą sodą..."
          placeholderTextColor={colors.textSecondary}
          value={customPrompt}
          onChangeText={(text) => {
            setCustomPrompt(text);
            if (text) {
              // Sukurti savos temos objektą, kai naudotojas rašo
              setSelectedTheme({
                id: 'custom',
                name: 'Custom',
                name_lt: 'Sava tema',
                icon: '✍️',
                prompt_hint: text,
              });
            }
          }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {customPrompt.length > 0 && (
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {customPrompt.length} simbolių
          </Text>
        )}
      </View>
    </View>
  );

  const renderVoiceSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Kieno balsu?
      </Text>
      <View style={styles.voiceList}>
        <TouchableOpacity
          style={[
            styles.voiceCard,
            { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
            !selectedVoice && {
              borderColor: colors.primary,
              borderWidth: 2,
            },
          ]}
          onPress={() => setSelectedVoice(null)}
          activeOpacity={0.7}
        >
          <View style={[styles.voiceIcon, { backgroundColor: colors.primaryLight }]}>
            <FontAwesome name="volume-up" size={18} color="#fff" />
          </View>
          <View style={styles.voiceInfo}>
            <Text style={[styles.voiceName, { color: colors.text }]}>
              Numatytasis balsas
            </Text>
            <Text style={[styles.voiceDesc, { color: colors.textSecondary }]}>
              Profesionalaus diktoriaus balsas
            </Text>
          </View>
          {!selectedVoice && (
            <View style={[styles.checkmarkSmall, { backgroundColor: colors.primary }]}>
              <FontAwesome name="check" size={10} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {readyVoices.map((voice) => (
          <TouchableOpacity
            key={voice.id}
            style={[
              styles.voiceCard,
              { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
              selectedVoice?.id === voice.id && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedVoice(voice)}
            activeOpacity={0.7}
          >
            <View style={[styles.voiceIcon, { backgroundColor: colors.primaryLight }]}>
              <FontAwesome name="microphone" size={18} color="#fff" />
            </View>
            <View style={styles.voiceInfo}>
              <Text style={[styles.voiceName, { color: colors.text }]}>
                {voice.name}
              </Text>
              <Text style={[styles.voiceDesc, { color: colors.textSecondary }]}>
                {needsRecloning(voice) ? 'Bus atkurtas automatiškai' : 'Jūsų įrašytas balsas'}
              </Text>
            </View>
            {selectedVoice?.id === voice.id && (
              <View style={[styles.checkmarkSmall, { backgroundColor: colors.primary }]}>
                <FontAwesome name="check" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.addVoiceCard, { borderColor: colors.primary }]}
          onPress={() => router.push('/voice/create')}
          activeOpacity={0.7}
        >
          <FontAwesome name="plus" size={18} color={colors.primary} />
          <Text style={[styles.addVoiceText, { color: colors.primary }]}>
            Įrašyti naują balsą
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStyleSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Koks stilius?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Pasirinkite iliustracijų stilių
      </Text>
      <View style={styles.grid}>
        {ART_STYLE_OPTIONS.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.selectionCard,
              { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 },
              selectedStyle === style.id && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedStyle(style.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.themeIcon}>{style.icon}</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {style.name}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {style.description}
            </Text>
            {selectedStyle === style.id && (
              <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                <FontAwesome name="check" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Paruošta kurti!
      </Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Amžius:
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {selectedAge?.label}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Tema:
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {selectedTheme?.icon} {selectedTheme?.name_lt}
          </Text>
        </View>
        {customPrompt && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Jūsų idėja:
              </Text>
              <Text style={[styles.customPromptPreview, { color: colors.text }]} numberOfLines={3}>
                "{customPrompt}"
              </Text>
            </View>
          </>
        )}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Balsas:
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {selectedVoice?.name || 'Numatytasis'}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Stilius:
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {ART_STYLE_OPTIONS.find(s => s.id === selectedStyle)?.icon} {ART_STYLE_OPTIONS.find(s => s.id === selectedStyle)?.name}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Trukmė:
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            iki {isSubscriber ? '5' : '3'} min.
          </Text>
        </View>
      </View>

      {!isSubscriber && (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.glassStroke, borderWidth: 1 }]}>
          <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryLight }]}>
            <FontAwesome name="info" size={12} color="#fff" />
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Nemokamoje versijoje pasakos trukmė ribojama iki 3 min.
          </Text>
        </View>
      )}
    </View>
  );

  const canProceed = () => {
    if (step === 'age') return !!selectedAge;
    if (step === 'pregenerated') return false; // Naudotojai paliečia pasakas tiesiogiai, „toliau" mygtuko nėra
    if (step === 'theme') return !!selectedTheme;
    if (step === 'voice') return true;
    if (step === 'style') return !!selectedStyle;
    if (step === 'confirm') return !!selectedAge && !!selectedTheme;
    return false;
  };

  // Skirtingi žingsniai nemokamiems ir premium naudotojams
  const steps = isPremium
    ? ['age', 'theme', 'voice', 'style', 'confirm']
    : ['age', 'pregenerated'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Eiga */}
      <View style={styles.progress}>
        {steps.map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor: currentStepIndex >= i ? colors.primary : colors.glassBg,
                },
                currentStepIndex >= i && styles.progressDotActive,
              ]}
            />
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: currentStepIndex > i ? colors.primary : colors.glassBg },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'age' && renderAgeSelection()}
        {step === 'pregenerated' && renderPregeneratedSelection()}
        {step === 'theme' && renderThemeSelection()}
        {step === 'voice' && renderVoiceSelection()}
        {step === 'style' && renderStyleSelection()}
        {step === 'confirm' && renderConfirmation()}
      </ScrollView>

      {/* Poraštė */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.glassStroke }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.glassBg }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <FontAwesome name="chevron-left" size={14} color={colors.text} />
          <Text style={[styles.backBtnText, { color: colors.text }]}>Atgal</Text>
        </TouchableOpacity>

        {step === 'pregenerated' ? (
          // Iš anksto sugeneruotų pasakų žingsnyje nėra „toliau" mygtuko - naudotojai paliečia pasakas tiesiogiai
          <View style={styles.nextBtn} />
        ) : step === 'confirm' ? (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: colors.primary },
              !canProceed() && { opacity: 0.5 },
            ]}
            onPress={handleCreate}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <FontAwesome name="magic" size={18} color="#fff" />
            <Text style={styles.nextBtnText}>Kurti pasaką</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: colors.primary },
              !canProceed() && { opacity: 0.5 },
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Toliau</Text>
            <FontAwesome name="chevron-right" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressDotActive: {
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  progressLine: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {},
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionCard: {
    width: '47%',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  themeIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceList: {
    gap: 12,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 1,
    marginLeft: 14,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  voiceDesc: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  addVoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 10,
  },
  addVoiceText: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    gap: 12,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customPromptSection: {
    marginTop: 24,
  },
  orDividerText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customPromptLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customPromptInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
  },
  customPromptPreview: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Iš anksto sugeneruotų pasakų stiliai
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pregeneratedList: {
    gap: 12,
  },
  pregeneratedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  pregeneratedIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pregeneratedInfo: {
    flex: 1,
    marginLeft: 14,
  },
  pregeneratedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pregeneratedMeta: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  upgradeCta: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
