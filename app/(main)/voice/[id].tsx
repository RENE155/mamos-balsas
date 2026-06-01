import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVoices } from '@/hooks/useVoices';

export default function VoiceDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVoice, deleteVoiceProfile } = useVoices();

  const voice = getVoice(id);

  const handleDelete = () => {
    Alert.alert(
      'Ištrinti balsą?',
      `Ar tikrai norite ištrinti „${voice?.name}" balso profilį?`,
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Ištrinti',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVoiceProfile(id);
              router.back();
            } catch (error) {
              Alert.alert('Klaida', 'Nepavyko ištrinti balso profilio');
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Paruoštas naudojimui';
      case 'processing':
        return 'Apdorojamas...';
      case 'pending':
        return 'Laukiama...';
      case 'failed':
        return 'Nepavyko sukurti';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
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

  if (!voice) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Balso profilis nerastas
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
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

      <View style={styles.content}>
        {/* Balso piktograma */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <FontAwesome name="microphone" size={48} color="#fff" />
        </View>

        {/* Balso pavadinimas */}
        <Text style={[styles.name, { color: colors.text }]}>{voice.name}</Text>

        {/* Būsena */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(voice.status) + '20' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(voice.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(voice.status) }]}
          >
            {getStatusLabel(voice.status)}
          </Text>
        </View>

        {/* Informacijos kortelė */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Sukurtas
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(voice.created_at).toLocaleDateString('lt-LT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Naudojimo informacija */}
        {voice.status === 'ready' && (
          <View style={[styles.usageCard, { backgroundColor: colors.card }]}>
            <FontAwesome name="info-circle" size={18} color={colors.primary} />
            <Text style={[styles.usageText, { color: colors.textSecondary }]}>
              Šis balsas bus pasiekiamas kuriant naujas pasakas
            </Text>
          </View>
        )}

        {voice.status === 'failed' && (
          <View style={[styles.usageCard, { backgroundColor: colors.error + '10' }]}>
            <FontAwesome name="exclamation-circle" size={18} color={colors.error} />
            <Text style={[styles.usageText, { color: colors.error }]}>
              Balso sukurti nepavyko. Bandykite įrašyti iš naujo.
            </Text>
          </View>
        )}
      </View>

      {/* Ištrynimo mygtukas */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <FontAwesome name="trash-o" size={18} color={colors.error} />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Ištrinti balso profilį
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  usageText: {
    flex: 1,
    fontSize: 14,
  },
  footer: {
    marginTop: 40,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
  },
});
