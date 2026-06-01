import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useRevenueCat } from '@/context/RevenueCatContext';
import { useVoices } from '@/hooks/useVoices';
import type { VoiceProfile } from '@/types';

export default function VoicesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { isPremium, isLoading: isLoadingPremium } = useRevenueCat();
  const { voices, isLoading: isLoadingVoices, fetchVoices, deleteVoiceProfile } = useVoices();
  const isLoading = isLoadingVoices || isLoadingPremium;
  const isFirstFocus = useRef(true);

  // DEV_MODE - nustatykite true, kad testuojant būtų apeitas premium patikrinimas
  const DEV_MODE = false;

  const handleCreateVoice = () => {
    if (DEV_MODE || isPremium) {
      router.push('/voice/create');
    } else {
      Alert.alert(
        'Premium funkcija',
        'Balso klonavimas yra tik Premium vartotojams. Prenumeruokite, kad galėtumėte klonuoti savo balsą ir pasakos būtų skaitomos jūsų balsu!',
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

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchVoices(true);
    }, [fetchVoices])
  );

  const handleDelete = (voice: VoiceProfile) => {
    Alert.alert(
      'Ištrinti balsą?',
      `Ar tikrai norite ištrinti „${voice.name}" balso profilį?\n\nBalso duomenys bus pašalinti iš mūsų serverių ir ElevenLabs sistemos.`,
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Ištrinti visur',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVoiceProfile(voice.id);
              Alert.alert('Ištrinta', 'Balso profilis ir visi susiję duomenys buvo ištrinti.');
            } catch (error) {
              Alert.alert('Klaida', 'Nepavyko ištrinti balso profilio');
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = (status: VoiceProfile['status']) => {
    switch (status) {
      case 'ready':
        return 'Paruoštas';
      case 'processing':
        return 'Apdorojamas...';
      case 'pending':
        return 'Laukiama...';
      case 'failed':
        return 'Nepavyko';
      default:
        return status;
    }
  };

  const getStatusColor = (status: VoiceProfile['status']) => {
    switch (status) {
      case 'ready':
        return colors.success;
      case 'processing':
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (!user || isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderVoiceItem = ({ item }: { item: VoiceProfile }) => (
    <AnimatedPressable
      style={styles.voiceCard}
      onPress={() => router.push(`/voice/${item.id}`)}
      scaleValue={0.97}
    >
      <View style={[styles.voiceIcon, { backgroundColor: colors.primaryLight }]}>
        <FontAwesome name="microphone" size={18} color="#fff" />
      </View>
      <View style={styles.voiceInfo}>
        <Text style={[styles.voiceName, { color: colors.text }]}>
          {item.name}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.voiceStatus, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <AnimatedPressable
        style={[styles.deleteButton, { backgroundColor: 'rgba(212, 115, 109, 0.12)' }]}
        onPress={() => handleDelete(item)}
        scaleValue={0.85}
      >
        <FontAwesome name="trash-o" size={15} color={colors.error} />
      </AnimatedPressable>
    </AnimatedPressable>
  );

  return (
    <View style={styles.container}>
      {/* Antraštė */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Balsai</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Jūsų balso profiliai
        </Text>
      </View>

      {/* Informacijos kortelė */}
      <View style={[styles.infoCard, !DEV_MODE && !isPremium && { borderColor: colors.primary, borderWidth: 1.5 }]}>
        <View style={[styles.infoIconContainer, { backgroundColor: (DEV_MODE || isPremium) ? colors.primaryLight : colors.primary }]}>
          <FontAwesome name={(DEV_MODE || isPremium) ? 'info' : 'star'} size={12} color="#fff" />
        </View>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {(DEV_MODE || isPremium)
            ? 'Įrašykite savo balsą, kad pasakos būtų skaitomos jūsų balsu.'
            : 'Balso klonavimas – Premium funkcija. Prenumeruokite, kad pasakos būtų skaitomos jūsų balsu!'}
        </Text>
      </View>

      {voices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, borderColor: colors.glassStroke }]}>
            <FontAwesome name="microphone" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Dar nesukurta jokių balso profilių
          </Text>
          <AnimatedPressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateVoice}
            scaleValue={0.95}
          >
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.createButtonText}>Įrašyti balsą</Text>
            {!DEV_MODE && !isPremium && (
              <View style={styles.buttonLockBadge}>
                <FontAwesome name="lock" size={8} color="#fff" />
              </View>
            )}
          </AnimatedPressable>
        </View>
      ) : (
        <>
          <FlatList
            data={voices}
            keyExtractor={(item) => item.id}
            renderItem={renderVoiceItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          <AnimatedPressable
            style={styles.fab}
            onPress={handleCreateVoice}
            scaleValue={0.9}
          >
            <FontAwesome name="plus" size={20} color="#fff" />
            {!DEV_MODE && !isPremium && (
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  voiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  voiceStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 115, 109, 0.2)',
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
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
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
  buttonLockBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(100, 100, 100, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
