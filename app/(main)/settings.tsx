import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { useRevenueCat } from '@/context/RevenueCatContext';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut, deleteAccount } = useAuth();
  const { isPremium, subscriptionType, restorePurchases } = useRevenueCat();

  const handleSignOut = () => {
    Alert.alert(
      'Atsijungti?',
      'Ar tikrai norite atsijungti?',
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Atsijungti',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Klaida', 'Nepavyko atsijungti');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Ištrinti paskyrą?',
      'Ši operacija yra negrįžtama. Bus ištrinti:\n\n• Visi balso profiliai (ir iš ElevenLabs)\n• Visos sukurtos pasakos\n• Visi vaikų profiliai\n• Visi jūsų duomenys',
      [
        { text: 'Atšaukti', style: 'cancel' },
        {
          text: 'Ištrinti viską',
          style: 'destructive',
          onPress: () => {
            // Antras patvirtinimas
            Alert.alert(
              'Ar tikrai?',
              'Šis veiksmas negali būti atšauktas. Visi jūsų duomenys bus prarasti visam laikui.',
              [
                { text: 'Ne, palikti', style: 'cancel' },
                {
                  text: 'Taip, ištrinti',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      Alert.alert('Ištrinta', 'Jūsų paskyra ir visi duomenys buvo ištrinti.');
                    } catch (error) {
                      Alert.alert('Klaida', 'Nepavyko ištrinti paskyros. Bandykite dar kartą.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    destructive = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    destructive?: boolean;
  }) => (
    <AnimatedPressable
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
      scaleValue={onPress ? 0.97 : 1}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: destructive ? 'rgba(212, 115, 109, 0.15)' : colors.primaryLight },
        ]}
      >
        <FontAwesome
          name={icon as any}
          size={14}
          color={destructive ? colors.error : '#fff'}
        />
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            { color: destructive ? colors.error : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && onPress && (
        <FontAwesome name="chevron-right" size={10} color={colors.textSecondary} />
      )}
    </AnimatedPressable>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Antraštė */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nustatymai</Text>
      </View>

      {/* Naudotojo skyrius */}
      {user && (
        <View style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <FontAwesome name="user" size={18} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <View style={[styles.statusBadge, { backgroundColor: isPremium ? colors.success : colors.primaryLight }]}>
              <Text style={styles.statusBadgeText}>
                {isPremium ? 'Premium' : 'Pagrindinis'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Prenumeratos skyrius */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PRENUMERATA
        </Text>

        {isPremium ? (
          <>
            {/* Premium aktyvumo kortelė */}
            <View style={[styles.premiumCard, { borderColor: colors.success }]}>
              <View style={[styles.premiumIconContainer, { backgroundColor: colors.success }]}>
                <FontAwesome name="check" size={16} color="#fff" />
              </View>
              <View style={styles.premiumContent}>
                <Text style={[styles.premiumTitle, { color: colors.text }]}>
                  Premium aktyvus
                </Text>
                <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
                  Balso klonavimas • HD garsas • {subscriptionType === 'weekly' ? '7 pasakų/sav' : '30 pasakų/mėn'}
                </Text>
              </View>
            </View>
            <SettingsItem
              icon="cog"
              title="Valdyti prenumeratą"
              subtitle={Platform.OS === 'ios' ? 'Atidaryti App Store nustatymus' : 'Atidaryti Google Play nustatymus'}
              onPress={() => Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions'
              )}
            />
          </>
        ) : (
          <>
            {/* Nemokamo plano kortelė */}
            <View style={[styles.freeCard]}>
              <View style={styles.freeContent}>
                <Text style={[styles.freeTitle, { color: colors.text }]}>
                  Nemokamas planas
                </Text>
                <Text style={[styles.freeSubtitle, { color: colors.textSecondary }]}>
                  1 nemokama pasaka • Standartinis garsas
                </Text>
              </View>
            </View>
            <AnimatedPressable
              style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/paywall')}
              scaleValue={0.97}
            >
              <FontAwesome name="star" size={14} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeButtonText}>Atnaujinti į Premium</Text>
            </AnimatedPressable>
            <SettingsItem
              icon="refresh"
              title="Atkurti pirkinius"
              subtitle="Jei pirkote anksčiau"
              onPress={async () => {
                try {
                  const info = await restorePurchases();
                  if (info.entitlements.active['premium']) {
                    Alert.alert('Atkurta!', 'Jūsų prenumerata atkurta.');
                  } else {
                    Alert.alert('Nerasta', 'Neradome ankstesnių pirkinių.');
                  }
                } catch (error) {
                  Alert.alert('Klaida', 'Nepavyko atkurti pirkinių.');
                }
              }}
            />
          </>
        )}
      </View>

      {/* Programos skyrius */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PROGRAMA
        </Text>
        <SettingsItem
          icon="shield"
          title="Privatumo politika"
          onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_policy.txt')}
        />
        <SettingsItem
          icon="file-text-o"
          title="Naudojimo sąlygos"
          onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_terms.txt')}
        />
        <SettingsItem
          icon="info-circle"
          title="Apie programą"
          subtitle="Versija 1.0.0"
          showChevron={false}
        />
      </View>

      {/* Paskyros skyrius */}
      {user && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PASKYRA
          </Text>
          <SettingsItem
            icon="sign-out"
            title="Atsijungti"
            onPress={handleSignOut}
            showChevron={false}
          />
          <SettingsItem
            icon="trash"
            title="Ištrinti paskyrą"
            subtitle="Pašalinti visus duomenis"
            onPress={handleDeleteAccount}
            destructive
            showChevron={false}
          />
        </View>
      )}

      {/* Poraštė */}
      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        MamosBalsas v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  settingsItem: {
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
    marginBottom: 30,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  // Premium kortelės stiliai
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 2,
  },
  premiumIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumContent: {
    flex: 1,
    marginLeft: 12,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  premiumSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  // Nemokamos kortelės stiliai
  freeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  freeContent: {
    flex: 1,
  },
  freeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  freeSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  // Atnaujinimo mygtukas
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
