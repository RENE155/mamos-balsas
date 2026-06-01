import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  testCharacterExtraction,
  testSceneAnalysis,
  testImageGeneration,
  type TestResult,
} from '@/lib/testImageGeneration';
import type { CharacterDescription, Scene } from '@/types';

type TestStep = 'idle' | 'characters' | 'scenes' | 'images' | 'done';

export default function TestImagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [currentStep, setCurrentStep] = useState<TestStep>('idle');
  const [characters, setCharacters] = useState<CharacterDescription[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [images, setImages] = useState<Array<{ base64: string; prompt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runCharacterTest = async () => {
    setCurrentStep('characters');
    setError(null);
    addLog('Starting character extraction test...');

    try {
      const result = await testCharacterExtraction();
      if (result.success && result.characters) {
        setCharacters(result.characters);
        addLog(`Found ${result.characters.length} characters`);
        result.characters.forEach(c => {
          addLog(`  - ${c.name} (${c.type}): ${c.appearance.mainColor}`);
        });
      } else {
        setError(result.error || 'Character extraction failed');
        addLog(`Error: ${result.error}`);
      }
    } catch (err) {
      setError(String(err));
      addLog(`Error: ${err}`);
    }

    setCurrentStep('idle');
  };

  const runSceneTest = async () => {
    if (characters.length === 0) {
      addLog('Please run character extraction first');
      return;
    }

    setCurrentStep('scenes');
    setError(null);
    addLog('Starting scene analysis test...');

    try {
      const result = await testSceneAnalysis(characters);
      if (result.success && result.scenes) {
        setScenes(result.scenes);
        addLog(`Found ${result.scenes.length} scenes`);
        result.scenes.forEach((s, i) => {
          addLog(`  Scene ${i + 1}: ${s.mood} - ${s.characters.join(', ')}`);
        });
      } else {
        setError(result.error || 'Scene analysis failed');
        addLog(`Error: ${result.error}`);
      }
    } catch (err) {
      setError(String(err));
      addLog(`Error: ${err}`);
    }

    setCurrentStep('idle');
  };

  const runImageTest = async () => {
    if (characters.length === 0 || scenes.length === 0) {
      addLog('Please run character and scene tests first');
      return;
    }

    setCurrentStep('images');
    setError(null);
    addLog('Starting image generation test (~$0.022 gpt-image-1)...');

    try {
      const result = await testImageGeneration(characters, scenes);
      if (result.success && result.images) {
        setImages(result.images);
        addLog(`Generated ${result.images.length} images`);
      } else {
        setError(result.error || 'Image generation failed');
        addLog(`Error: ${result.error}`);
      }
    } catch (err) {
      setError(String(err));
      addLog(`Error: ${err}`);
    }

    setCurrentStep('done');
  };

  const resetTests = () => {
    setCurrentStep('idle');
    setCharacters([]);
    setScenes([]);
    setImages([]);
    setError(null);
    setLogs([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Image Generation Test</Text>
        <TouchableOpacity onPress={resetTests} style={styles.resetButton}>
          <FontAwesome name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Testavimo žingsniai */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Test Steps</Text>

          <TouchableOpacity
            style={[
              styles.testButton,
              { backgroundColor: currentStep === 'characters' ? colors.primaryLight : colors.primary },
            ]}
            onPress={runCharacterTest}
            disabled={currentStep !== 'idle'}
          >
            {currentStep === 'characters' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <FontAwesome name="users" size={16} color="#fff" />
            )}
            <Text style={styles.testButtonText}>
              1. Extract Characters {characters.length > 0 ? `(${characters.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.testButton,
              {
                backgroundColor: currentStep === 'scenes' ? colors.primaryLight :
                  characters.length === 0 ? colors.textSecondary : colors.primary
              },
            ]}
            onPress={runSceneTest}
            disabled={currentStep !== 'idle' || characters.length === 0}
          >
            {currentStep === 'scenes' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <FontAwesome name="film" size={16} color="#fff" />
            )}
            <Text style={styles.testButtonText}>
              2. Analyze Scenes {scenes.length > 0 ? `(${scenes.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.testButton,
              {
                backgroundColor: currentStep === 'images' ? colors.primaryLight :
                  scenes.length === 0 ? colors.textSecondary : colors.primary
              },
            ]}
            onPress={runImageTest}
            disabled={currentStep !== 'idle' || scenes.length === 0}
          >
            {currentStep === 'images' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <FontAwesome name="image" size={16} color="#fff" />
            )}
            <Text style={styles.testButtonText}>
              3. Generate 2 Images (~$0.022)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Klaidos rodymas */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: 'rgba(212, 115, 109, 0.15)' }]}>
            <FontAwesome name="exclamation-circle" size={16} color="#d4736d" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Personažai */}
        {characters.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Characters Found</Text>
            {characters.map((char, i) => (
              <View key={i} style={styles.characterItem}>
                <Text style={[styles.characterName, { color: colors.text }]}>
                  {char.name} ({char.type})
                </Text>
                <Text style={[styles.characterDetails, { color: colors.textSecondary }]}>
                  {char.appearance.size}, {char.appearance.mainColor} {char.appearance.texture}
                </Text>
                {char.clothing && (
                  <Text style={[styles.characterDetails, { color: colors.textSecondary }]}>
                    Wearing: {char.clothing.color} {char.clothing.item}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Scenos */}
        {scenes.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Scenes</Text>
            {scenes.map((scene, i) => (
              <View key={i} style={styles.sceneItem}>
                <Text style={[styles.sceneTitle, { color: colors.text }]}>
                  Scene {i + 1} - {scene.mood}
                </Text>
                <Text style={[styles.sceneDetails, { color: colors.textSecondary }]}>
                  Characters: {scene.characters.join(', ')}
                </Text>
                <Text style={[styles.sceneDetails, { color: colors.textSecondary }]} numberOfLines={2}>
                  {scene.visualDescription}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sugeneruoti paveikslėliai */}
        {images.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Generated Images</Text>
            <Text style={[styles.imageHint, { color: colors.primary }]}>
              Check if Tedis and Lile look consistent across images!
            </Text>
            {images.map((img, i) => (
              <View key={i} style={styles.imageContainer}>
                <Text style={[styles.imageLabel, { color: colors.text }]}>Image {i + 1}</Text>
                <Image
                  source={{ uri: `data:image/png;base64,${img.base64}` }}
                  style={styles.generatedImage}
                  resizeMode="cover"
                />
                <Text style={[styles.promptPreview, { color: colors.textSecondary }]} numberOfLines={3}>
                  {img.prompt.substring(0, 150)}...
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Žurnalai */}
        {logs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Logs</Text>
            {logs.map((log, i) => (
              <Text key={i} style={[styles.logLine, { color: colors.textSecondary }]}>
                {log}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  resetButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#d4736d',
    fontSize: 14,
    flex: 1,
  },
  characterItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  characterName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  characterDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  sceneItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sceneTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  sceneDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  generatedImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  promptPreview: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  imageHint: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
