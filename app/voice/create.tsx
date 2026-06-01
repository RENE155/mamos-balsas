import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVoices } from '@/hooks/useVoices';

const SAMPLE_TEXT = `Labas vakaras, mano brangusis. Šiandien papasakosiu tau pasaką apie mažą zuikutį, kuris gyveno giliai miške. Zuikutis mėgdavo žaisti su savo draugais ir tyrinėti miško takelius. Kiekvieną vakarą jis grįždavo namo pas savo mamą ir klausydavosi miego pasakų.`;

// TODO: Gamybinėje versijoje grąžinti į 30
const MIN_DURATION_SECONDS = 5;

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

export default function CreateVoiceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createVoice } = useVoices();

  const [state, setState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [name, setName] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Išvalyti garsą atjungiant komponentą
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Išvalyti intervalą tik atjungiant komponentą
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  // Derinimas: registruoti mygtuko būseną, kai pasikeičia sąlygos
  useEffect(() => {
    if (state === 'recorded') {
      const canSave = consentGiven && name.trim() !== '' && duration >= MIN_DURATION_SECONDS;
      console.log('[Voice] Save button state:', {
        canSave,
        consentGiven,
        nameEntered: name.trim() !== '',
        name: name,
        duration,
        durationOk: duration >= MIN_DURATION_SECONDS,
      });
    }
  }, [state, consentGiven, name, duration]);

  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startRecording = async () => {
    // Apsaugoti nuo dvigubo paspaudimo
    if (isStartingRecording || state === 'recording') {
      console.log('[Voice] Already starting or recording, ignoring...');
      return;
    }

    console.log('[Voice] Starting recording...');
    setIsStartingRecording(true);

    try {
      // Pirma išvalyti bet kokį esamą įrašymą
      if (recording) {
        console.log('[Voice] Cleaning up existing recording...');
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignoruoti išvalymo klaidas
        }
        setRecording(null);
      }

      // Patikrinti, ar leidimas jau buvo suteiktas prieš jį prašant
      const { status: existingStatus } = await Audio.getPermissionsAsync();
      const wasAlreadyGranted = existingStatus === 'granted';
      console.log('[Voice] Existing permission status:', existingStatus);

      // Prašyti leidimo, jei jis dar nesuteiktas
      const { status } = await Audio.requestPermissionsAsync();
      console.log('[Voice] Permission status after request:', status);

      if (status !== 'granted') {
        Alert.alert('Leidimas reikalingas', 'Leiskite programai naudoti mikrofoną nustatymuose');
        setIsStartingRecording(false);
        return;
      }

      // Ilgesnė pauzė, jei leidimas ką tik buvo suteiktas pirmą kartą
      // Sistemai reikia daugiau laiko inicijuoti mikrofoną po pirmojo leidimo suteikimo
      const delayMs = wasAlreadyGranted ? 100 : 500;
      console.log('[Voice] Waiting', delayMs, 'ms for system to be ready...');
      await new Promise(resolve => setTimeout(resolve, delayMs));

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Dar viena pauzė, kad garso režimas įsigaliotų
      await new Promise(resolve => setTimeout(resolve, wasAlreadyGranted ? 100 : 300));

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setState('recording');
      setDuration(0);

      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Klaida', 'Nepavyko pradėti įrašymo. Bandykite dar kartą.');
    } finally {
      setIsStartingRecording(false);
    }
  };

  const stopRecording = async () => {
    console.log('[Voice] Stopping recording...');
    if (!recording) return;

    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecordingUri(uri);
      setRecording(null);
      setState('recorded');
      console.log('[Voice] Recording stopped. URI:', uri, 'Duration:', duration);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error('[Voice] Error stopping recording:', error);
      Alert.alert('Klaida', 'Nepavyko sustabdyti įrašymo');
    }
  };

  const togglePlayback = async () => {
    if (!recordingUri) return;

    try {
      if (isPlaying && soundRef.current) {
        // Sustabdyti atkūrimą
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      } else {
        // Pradėti atkūrimą
        // Pirma išvalyti bet kokį esamą garsą
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
        soundRef.current = sound;

        // Klausytis atkūrimo pabaigos
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            soundRef.current?.unloadAsync();
            soundRef.current = null;
          }
        });

        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  const resetRecording = async () => {
    // Sustabdyti bet kokį grojamą garsą
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
    }
    setRecordingUri(null);
    setState('idle');
    setDuration(0);
  };

  const handleSave = async () => {
    // Apsaugoti nuo dvigubo paspaudimo
    if (isSaving) {
      console.log('[Voice] Already saving, ignoring...');
      return;
    }

    console.log('[Voice] handleSave called', { recordingUri, name, consentGiven, duration });

    if (!recordingUri) {
      console.log('[Voice] No recording URI');
      Alert.alert('Klaida', 'Pirma įrašykite balsą');
      return;
    }

    if (!name.trim()) {
      console.log('[Voice] No name entered');
      Alert.alert('Klaida', 'Įveskite balso pavadinimą');
      return;
    }

    if (!consentGiven) {
      console.log('[Voice] Consent not given');
      Alert.alert('Klaida', 'Turite sutikti su balso naudojimo salygomis');
      return;
    }

    if (duration < MIN_DURATION_SECONDS) {
      console.log('[Voice] Duration too short:', duration);
      Alert.alert('Klaida', `Įrašymas turi būti bent ${MIN_DURATION_SECONDS} sekundžių`);
      return;
    }

    try {
      console.log('[Voice] Creating voice profile...');
      setIsSaving(true);
      setState('uploading');
      await createVoice(name.trim(), recordingUri);
      console.log('[Voice] Voice profile created successfully');

      // Rodyti sėkmės pranešimą
      Alert.alert(
        'Pavyko!',
        `Balso profilis „${name.trim()}" sėkmingai sukurtas. Dabar galite naudoti šį balsą pasakų skaitymui.`,
        [
          {
            text: 'Puiku',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[Voice] Error creating voice:', error);
      // Rodyti konkretų klaidos pranešimą, jei jis yra
      const errorMessage = error?.message || 'Nepavyko sukurti balso profilio. Bandykite dar kartą.';
      Alert.alert('Klaida', errorMessage);
      setState('recorded');
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#2A2525' : '#FAF5F2';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Instrukcijos */}
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Kaip įrašyti balsą
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          1. Raskite tylų kampelį{'\n'}
          2. Perskaitykite tekstą žemiau aiškiu balsu{'\n'}
          3. Įrašas turi būti bent {MIN_DURATION_SECONDS} sekundžių
        </Text>
      </View>

      {/* Pavyzdinis tekstas */}
      <View style={[styles.sampleCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sampleLabel, { color: colors.textSecondary }]}>
          Perskaitykite šį tekstą:
        </Text>
        <Text style={[styles.sampleText, { color: colors.text }]}>
          {SAMPLE_TEXT}
        </Text>
      </View>

      {/* Įrašymo valdikliai */}
      <View style={styles.recordingSection}>
        {state === 'idle' && (
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: colors.error }]}
            onPress={startRecording}
          >
            <FontAwesome name="microphone" size={32} color="#fff" />
            <Text style={styles.recordButtonText}>Pradėti įrašymą</Text>
          </TouchableOpacity>
        )}

        {state === 'recording' && (
          <View style={styles.recordingActive}>
            <View style={[styles.recordingIndicator, { backgroundColor: colors.error }]} />
            <Text style={[styles.durationText, { color: colors.text }]}>
              {formatDuration(duration)}
            </Text>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.card }]}
              onPress={stopRecording}
            >
              <FontAwesome name="stop" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {state === 'recorded' && (
          <View style={styles.recordedSection}>
            <View style={[styles.recordedInfo, { backgroundColor: colors.card }]}>
              <FontAwesome name="check-circle" size={24} color={colors.success} />
              <View style={styles.recordedDetails}>
                <Text style={[styles.recordedText, { color: colors.text }]}>
                  Įrašas baigtas
                </Text>
                <Text style={[styles.recordedDuration, { color: colors.textSecondary }]}>
                  Trukmė: {formatDuration(duration)}
                </Text>
              </View>
              <View style={styles.recordedActions}>
                <TouchableOpacity onPress={togglePlayback} style={styles.iconButton}>
                  <FontAwesome name={isPlaying ? "stop" : "play"} size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={resetRecording} style={styles.iconButton}>
                  <FontAwesome name="refresh" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Vardo įvedimas */}
            <View style={styles.nameSection}>
              <Text style={[styles.label, { color: colors.text }]}>
                Balso pavadinimas
              </Text>
              <View
                style={[
                  styles.nameInput,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <FontAwesome name="user" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.nameInputText, { color: colors.text }]}
                  placeholder="pvz. Mama, Tėtis"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Sutikimas */}
            <View style={[styles.consentCard, { backgroundColor: colors.card }]}>
              <View style={styles.consentHeader}>
                <FontAwesome name="shield" size={16} color={colors.primary} />
                <Text style={[styles.consentTitle, { color: colors.text }]}>
                  Balso duomenų sutikimas
                </Text>
              </View>
              <Text style={[styles.consentDescription, { color: colors.textSecondary }]}>
                Jūsų balso įrašas bus apdorotas naudojant ElevenLabs dirbtinio intelekto technologiją balso klonavimui. Balso duomenys bus saugomi tol, kol neištrinsite balso profilio.
              </Text>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentGiven(!consentGiven)}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    consentGiven && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  {consentGiven && (
                    <FontAwesome name="check" size={12} color="#fff" />
                  )}
                </View>
                <Text style={[styles.consentText, { color: colors.text }]}>
                  Sutinku, kad mano balsas būtų apdorotas ir klonoujamas pasakų skaitymui
                </Text>
              </TouchableOpacity>
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_policy.txt')}>
                  <Text style={[styles.legalLink, { color: colors.primary }]}>
                    Privatumo politika
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.legalDivider, { color: colors.textSecondary }]}>•</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_terms.txt')}>
                  <Text style={[styles.legalLink, { color: colors.primary }]}>
                    Naudojimo sąlygos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {state === 'uploading' && (
          <View style={styles.uploadingSection}>
            <Text style={[styles.uploadingText, { color: colors.text }]}>
              Kuriamas balso profilis...
            </Text>
            <Text style={[styles.uploadingHint, { color: colors.textSecondary }]}>
              Tai gali uztrukti iki minutes
            </Text>
          </View>
        )}
      </View>

      {/* Išsaugojimo mygtukas */}
      {state === 'recorded' && (
        <View>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              (!consentGiven || !name.trim() || duration < MIN_DURATION_SECONDS) && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={!consentGiven || !name.trim() || duration < MIN_DURATION_SECONDS}
          >
            <Text style={styles.saveButtonText}>Išsaugoti balsą</Text>
          </TouchableOpacity>

          {/* Parodyti, kodėl mygtukas neaktyvus */}
          {(!consentGiven || !name.trim() || duration < MIN_DURATION_SECONDS) && (
            <View style={styles.disabledHint}>
              {duration < MIN_DURATION_SECONDS && (
                <Text style={[styles.hintText, { color: colors.error }]}>
                  ⚠️ Įrašas turi būti bent {MIN_DURATION_SECONDS} sek. (dabar: {duration} sek.)
                </Text>
              )}
              {!name.trim() && (
                <Text style={[styles.hintText, { color: colors.error }]}>
                  ⚠️ Įveskite balso pavadinimą
                </Text>
              )}
              {!consentGiven && (
                <Text style={[styles.hintText, { color: colors.error }]}>
                  ⚠️ Pažymėkite sutikimą
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
  },
  sampleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sampleLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 17,
    lineHeight: 28,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  recordingActive: {
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  durationText: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: 24,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordedSection: {
    width: '100%',
  },
  recordedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recordedDetails: {
    flex: 1,
    marginLeft: 12,
  },
  recordedText: {
    fontSize: 17,
    fontWeight: '600',
  },
  recordedDuration: {
    fontSize: 15,
    marginTop: 2,
  },
  recordedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  nameSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  nameInputText: {
    flex: 1,
    fontSize: 17,
  },
  consentCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  consentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  legalDivider: {
    marginHorizontal: 8,
    fontSize: 12,
  },
  uploadingSection: {
    alignItems: 'center',
    padding: 40,
  },
  uploadingText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadingHint: {
    fontSize: 15,
  },
  saveButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledHint: {
    marginTop: 12,
    gap: 6,
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
