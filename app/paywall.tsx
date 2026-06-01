import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRevenueCat } from '@/context/RevenueCatContext';
import AnimatedPressable from '@/components/AnimatedPressable';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'microphone', title: 'Balso klonavimas' },
  { icon: 'music', title: 'HD garsas' },
  { icon: 'book', title: 'Daugiau pasakų' },
  { icon: 'paint-brush', title: '4 stiliai' },
];

export default function PaywallScreen() {
  const { offerings, isLoading, isPremium } = useRevenueCat();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');

  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#1A1A1A' : '#FAFAFA';
  const cardBg = isDark ? '#252525' : '#FFFFFF';

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isPremium) {
    router.back();
    return null;
  }

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Sėkmingai!', 'Dabar turite Premium prenumeratą!');
        router.back();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Klaida', error.message || 'Nepavyko užsiprenumeruoti');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Atkurta!', 'Jūsų prenumerata atkurta.');
        router.back();
      } else {
        Alert.alert('Nerasta', 'Neradome ankstesnių pirkinių.');
      }
    } catch (error) {
      Alert.alert('Klaida', 'Nepavyko atkurti pirkinių.');
    } finally {
      setPurchasing(false);
    }
  };

  const weeklyPackage = offerings?.availablePackages.find(
    (p) => p.packageType === 'WEEKLY'
  );
  const monthlyPackage = offerings?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY'
  );

  const selectedPackage = selectedPlan === 'monthly' ? monthlyPackage : weeklyPackage;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Atgal mygtukas */}
      <AnimatedPressable
        style={[styles.backButton, { top: insets.top + 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        onPress={() => router.back()}
        scaleValue={0.9}
      >
        <FontAwesome name="chevron-left" size={16} color={isDark ? '#fff' : colors.textSecondary} />
      </AnimatedPressable>

      {/* Slenkamas turinys */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 44 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Kompaktiška herojaus sekcija */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#B8908A', '#D4A59A']}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <FontAwesome name="star" size={18} color="#fff" />
          </LinearGradient>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            MamosBalsas Premium
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Atraskite visas galimybes
          </Text>
        </View>

        {/* Funkcijų eilutė */}
        <View style={styles.featuresRow}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(184, 144, 138, 0.2)' : 'rgba(184, 144, 138, 0.15)' }]}>
                <FontAwesome name={feature.icon as any} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.text }]} numberOfLines={2}>
                {feature.title}
              </Text>
            </View>
          ))}
        </View>

        {/* Pagrindinė nauda */}
        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
          Sukurkite daugiau personalizuotų pasakų
        </Text>

        {/* Kainų kortelės */}
        <View style={styles.pricingSection}>
          {/* Mėnesinis planas */}
          {monthlyPackage && (
            <AnimatedPressable
              style={[
                styles.planCard,
                {
                  backgroundColor: selectedPlan === 'monthly'
                    ? (isDark ? 'rgba(184, 144, 138, 0.15)' : 'rgba(184, 144, 138, 0.1)')
                    : cardBg,
                  borderColor: selectedPlan === 'monthly' ? colors.primary : (isDark ? '#333' : '#E5E5E5'),
                  borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedPlan('monthly')}
              scaleValue={0.98}
              disabled={purchasing}
            >
              <View style={styles.planBadge}>
                <LinearGradient
                  colors={['#B8908A', '#C9A09A']}
                  style={styles.badgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.badgeText}>Populiariausias</Text>
                </LinearGradient>
              </View>

              <View style={styles.planContent}>
                <View style={styles.planLeft}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === 'monthly' ? colors.primary : (isDark ? '#555' : '#CCC') }
                  ]}>
                    {selectedPlan === 'monthly' && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: colors.text }]}>Mėnesinė</Text>
                    <Text style={[styles.planSavings, { color: colors.primary }]}>Sutaupykite 18%</Text>
                  </View>
                </View>
                <View style={styles.planRight}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    {monthlyPackage.product.priceString}
                  </Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/mėn</Text>
                </View>
              </View>
            </AnimatedPressable>
          )}

          {/* Savaitinis planas */}
          {weeklyPackage && (
            <AnimatedPressable
              style={[
                styles.planCard,
                {
                  backgroundColor: selectedPlan === 'weekly'
                    ? (isDark ? 'rgba(184, 144, 138, 0.15)' : 'rgba(184, 144, 138, 0.1)')
                    : cardBg,
                  borderColor: selectedPlan === 'weekly' ? colors.primary : (isDark ? '#333' : '#E5E5E5'),
                  borderWidth: selectedPlan === 'weekly' ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedPlan('weekly')}
              scaleValue={0.98}
              disabled={purchasing}
            >
              <View style={styles.planContent}>
                <View style={styles.planLeft}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === 'weekly' ? colors.primary : (isDark ? '#555' : '#CCC') }
                  ]}>
                    {selectedPlan === 'weekly' && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: colors.text }]}>Savaitinė</Text>
                    <Text style={[styles.planDesc, { color: colors.textSecondary }]}>Išbandykite Premium</Text>
                  </View>
                </View>
                <View style={styles.planRight}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    {weeklyPackage.product.priceString}
                  </Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/sav</Text>
                </View>
              </View>
            </AnimatedPressable>
          )}
        </View>

        {/* Tarpiklis fiksuotai apačiai */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Fiksuotas apatinis raginimas veikti */}
      <View style={[styles.fixedBottom, { paddingBottom: insets.bottom + 8, backgroundColor: bgColor }]}>
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Prenumerata automatiškai atsinaujins. Galite atšaukti bet kada per {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} nustatymus.
        </Text>

        <AnimatedPressable
          style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
          onPress={() => selectedPackage && handlePurchase(selectedPackage)}
          scaleValue={0.97}
          disabled={purchasing || !selectedPackage}
        >
          <LinearGradient
            colors={['#B8908A', '#C9A09A']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Prenumeruoti</Text>
            )}
          </LinearGradient>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleRestore}
          scaleValue={0.95}
          disabled={purchasing}
          style={styles.restoreButton}
        >
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Atkurti pirkinius
          </Text>
        </AnimatedPressable>

        <View style={styles.legalLinks}>
          <AnimatedPressable
            onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_policy.txt')}
            scaleValue={0.95}
          >
            <Text style={[styles.legalLink, { color: colors.textSecondary }]}>
              Privatumo politika
            </Text>
          </AnimatedPressable>
          <Text style={[styles.legalDivider, { color: colors.textSecondary }]}>•</Text>
          <AnimatedPressable
            onPress={() => Linking.openURL('https://raw.githubusercontent.com/RENE155/policy/refs/heads/main/mb_terms.txt')}
            scaleValue={0.95}
          >
            <Text style={[styles.legalLink, { color: colors.textSecondary }]}>
              Naudojimo sąlygos
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Herojus - kompaktiškesnis
  heroSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Funkcijos - horizontali eilutė
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 14,
  },
  // Kainos - kompaktiškesnės
  pricingSection: {
    gap: 8,
    marginBottom: 10,
  },
  planCard: {
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -9,
    right: 14,
  },
  badgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planInfo: {
    gap: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: '600',
  },
  planSavings: {
    fontSize: 11,
    fontWeight: '600',
  },
  planDesc: {
    fontSize: 11,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 13,
    marginLeft: 2,
  },
  // Sąlygos
  termsText: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalDivider: {
    marginHorizontal: 6,
    fontSize: 11,
  },
  // Fiksuotas apatinis raginimas veikti
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingBottom: 4,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
