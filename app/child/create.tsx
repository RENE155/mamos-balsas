import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChildren } from '@/hooks/useChildren';
import { INTERESTS, ANIMALS } from '@/constants/interests';

export default function CreateChildScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createChild } = useChildren();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAnimal = (id: string) => {
    setSelectedAnimals((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
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
      await createChild({
        name: name.trim(),
        age: ageNum,
        interests: selectedInterests,
        favorite_animals: selectedAnimals,
        favorite_colors: [],
      });
      router.back();
    } catch (error) {
      console.error('Error creating child:', error);
      Alert.alert('Klaida', 'Nepavyko išsaugoti vaiko profilio');
    } finally {
      setIsLoading(false);
    }
  };

  const ChipSelect = ({
    items,
    selected,
    onToggle,
  }: {
    items: { id: string; label_lt: string; icon: string }[];
    selected: string[];
    onToggle: (id: string) => void;
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
      <ScrollView contentContainerStyle={styles.content}>
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
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Pasirinkite, kas vaikui patinka
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
      </ScrollView>

      {/* Išsaugojimo mygtukas */}
      <View style={[styles.footer, { backgroundColor: colors.card }]}>
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
            {isLoading ? 'Saugoma...' : 'Issaugoti'}
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
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
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
  footer: {
    padding: 16,
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
