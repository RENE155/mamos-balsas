import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChildren } from '@/hooks/useChildren';
import { INTERESTS, ANIMALS } from '@/constants/interests';

export default function EditChildScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getChild, updateChild, deleteChild } = useChildren();

  const child = getChild(id);

  const [name, setName] = useState(child?.name || '');
  const [age, setAge] = useState(child?.age?.toString() || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    child?.interests || []
  );
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(
    child?.favorite_animals || []
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (child) {
      setName(child.name);
      setAge(child.age.toString());
      setSelectedInterests(child.interests || []);
      setSelectedAnimals(child.favorite_animals || []);
    }
  }, [child]);

  const toggleInterest = (itemId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]
    );
  };

  const toggleAnimal = (itemId: string) => {
    setSelectedAnimals((prev) =>
      prev.includes(itemId) ? prev.filter((a) => a !== itemId) : [...prev, itemId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Klaida', 'Iveskite vaiko varda');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 12) {
      Alert.alert('Klaida', 'Iveskite teisinga amziu (1-12)');
      return;
    }

    try {
      setIsLoading(true);
      await updateChild(id, {
        name: name.trim(),
        age: ageNum,
        interests: selectedInterests,
        favorite_animals: selectedAnimals,
      });
      router.back();
    } catch (error) {
      console.error('Error updating child:', error);
      Alert.alert('Klaida', 'Nepavyko atnaujinti vaiko profilio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Ištrinti profilį?',
      `Ar tikrai norite ištrinti ${child?.name} profilį? Visos susijusios pasakos taip pat bus ištrintos.`,
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Ištrinti',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChild(id);
              router.back();
            } catch (error) {
              Alert.alert('Klaida', 'Nepavyko ištrinti profilio');
            }
          },
        },
      ]
    );
  };

  if (!child) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ChipSelect = ({
    items,
    selected,
    onToggle,
  }: {
    items: { id: string; label_lt: string; icon: string }[];
    selected: string[];
    onToggle: (itemId: string) => void;
  }) => (
    <View style={styles.chipContainer}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.chip,
            { backgroundColor: colors.card },
            selected.includes(item.id) && {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => onToggle(item.id)}
        >
          <Text style={styles.chipIcon}>{item.icon}</Text>
          <Text
            style={[
              styles.chipText,
              {
                color: selected.includes(item.id) ? '#fff' : colors.text,
              },
            ]}
          >
            {item.label_lt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
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

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Redaguoti profilį
        </Text>

        {/* Vardo įvedimas */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Vaiko vardas *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="pvz. Lukas"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Amžiaus įvedimas */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Amzius *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="pvz. 5"
            placeholderTextColor={colors.textSecondary}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Pomėgiai */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Pomegiai
          </Text>
          <ChipSelect
            items={INTERESTS}
            selected={selectedInterests}
            onToggle={toggleInterest}
          />
        </View>

        {/* Mėgstami gyvūnai */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Megstami gyvunai
          </Text>
          <ChipSelect
            items={ANIMALS}
            selected={selectedAnimals}
            onToggle={toggleAnimal}
          />
        </View>

        {/* Ištrynimo mygtukas */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <FontAwesome name="trash-o" size={18} color={colors.error} />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Ištrinti profilį
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Išsaugojimo mygtukas */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            isLoading && { opacity: 0.5 },
          ]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saugoma...' : 'Issaugoti pakeitimus'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 100,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
