# RevenueCat Subscription Integration Guide

> Complete guide for integrating in-app subscriptions into Bedtime Stories app using RevenueCat + Expo

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [RevenueCat Dashboard Setup](#revenuecat-dashboard-setup)
3. [App Store Connect Setup (iOS)](#app-store-connect-setup-ios)
4. [Google Play Console Setup (Android)](#google-play-console-setup-android)
5. [SDK Installation](#sdk-installation)
6. [SDK Configuration](#sdk-configuration)
7. [Implementing Paywalls](#implementing-paywalls)
8. [Checking Subscription Status](#checking-subscription-status)
9. [Testing](#testing)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Apple Developer Account ($99/year)
- [ ] Google Play Developer Account ($25 one-time)
- [ ] RevenueCat account (free tier available)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Expo development build (not Expo Go - native modules required)

**Important:** Expo Go does NOT support in-app purchases. You must use EAS Build.

---

## RevenueCat Dashboard Setup

### 1. Create Project

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Click **"Create New Project"**
3. Name it: `bedtime-stories`

### 2. Get API Keys

After creating the project, navigate to **API Keys** section:

- Copy **Apple API Key** (for iOS)
- Copy **Google API Key** (for Android)

Store these in your `.env` file:
```env
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=appl_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=goog_xxxxxxxxxxxxxxxx
```

### 3. Create Entitlement

Entitlements represent what users "unlock" with a purchase.

1. Go to **Product Catalog → Entitlements**
2. Click **"+ New"**
3. Create entitlement:
   - **Identifier:** `premium`
   - **Description:** `Premium access - unlimited stories`

### 4. Create Offering

Offerings are the "packages" you present to users.

1. Go to **Product Catalog → Offerings**
2. Click **"+ New"**
3. Create offering:
   - **Identifier:** `default`
   - **Description:** `Default offering`

### 5. Create Packages

Inside your offering, create packages:

| Package | Type | Description |
|---------|------|-------------|
| `$rc_weekly` | Weekly | Weekly subscription |
| `$rc_monthly` | Monthly | Monthly subscription (discounted) |

---

## App Store Connect Setup (iOS)

### 1. Sign Agreements

**Critical:** Before testing IAP, you must:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Business → Agreements**
3. Sign the **Paid Applications Agreement**
4. Complete **Tax** and **Banking** setup
5. Wait for "Clear" status

### 2. Create Subscription Group

1. Go to **My Apps → [Your App] → Subscriptions**
2. Click **"+"** to create Subscription Group
3. Name: `Bedtime Stories Premium`

### 3. Create Products

Create these products in the subscription group:

| Reference Name | Product ID | Duration | Price |
|----------------|------------|----------|-------|
| Weekly Premium | `bedtime_stories_weekly` | 1 Week | $1.99 |
| Monthly Premium | `bedtime_stories_monthly` | 1 Month | $4.99 |

For each product:
- Add **Display Name** (Lithuanian): `Premium Savaitinis` / `Premium Menesinis`
- Add **Description**: Feature list
- Set **Price**
- Save and submit for review

### 4. Create App Store Connect API Key

1. Go to **Users and Access → Integrations → App Store Connect API**
2. Click **"+"** to generate new key
3. Name: `RevenueCat`
4. Access: `Admin` or `App Manager`
5. Download the `.p8` file (only available once!)
6. Note the **Key ID** and **Issuer ID**

### 5. Connect to RevenueCat

1. In RevenueCat Dashboard, go to **Project Settings → Apps**
2. Click **"+ New App"** → iOS
3. Enter:
   - App name
   - Bundle ID: `com.yourcompany.bedtimestories`
   - App Store Connect API Key details

---

## Google Play Console Setup (Android)

### 1. Create Products

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app → **Monetize → Products → Subscriptions**
3. Create subscriptions:

| Product ID | Billing Period | Price |
|------------|----------------|-------|
| `bedtime_stories_weekly` | Weekly | $1.99 |
| `bedtime_stories_monthly` | Monthly | $4.99 |

### 2. Create Service Account

1. Go to **Setup → API access**
2. Create new service account
3. Grant **Finance** permissions
4. Download JSON key file

### 3. Connect to RevenueCat

1. In RevenueCat Dashboard, go to **Project Settings → Apps**
2. Click **"+ New App"** → Android
3. Enter:
   - App name
   - Package name: `com.yourcompany.bedtimestories`
   - Upload service account JSON

---

## SDK Installation

### 1. Install Dependencies

```bash
# Install expo-dev-client (required for native modules)
npx expo install expo-dev-client

# Install RevenueCat SDKs
npx expo install react-native-purchases react-native-purchases-ui
```

### 2. Update app.json

```json
{
  "expo": {
    "plugins": [
      "expo-dev-client"
    ],
    "ios": {
      "bundleIdentifier": "com.yourcompany.bedtimestories"
    },
    "android": {
      "package": "com.yourcompany.bedtimestories"
    }
  }
}
```

### 3. Build Development Client

```bash
# Login to EAS
eas login

# Configure EAS
eas build:configure

# Build for iOS Simulator
eas build --platform ios --profile development

# Build for Android Emulator
eas build --platform android --profile development
```

---

## SDK Configuration

### 1. Create RevenueCat Context

Create `context/RevenueCatContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isPremium: boolean;
  isLoading: boolean;
  restorePurchases: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const APPLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY!;
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY!;
const ENTITLEMENT_ID = 'premium';

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;

  useEffect(() => {
    async function init() {
      try {
        // Enable debug logs in development
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Configure with platform-specific API key
        const apiKey = Platform.OS === 'ios' ? APPLE_API_KEY : GOOGLE_API_KEY;

        await Purchases.configure({ apiKey });

        // Fetch customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        // Fetch offerings
        const offeringsResult = await Purchases.getOfferings();
        setOfferings(offeringsResult.current);

        // Listen for customer info updates
        Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
        });
      } catch (error) {
        console.error('RevenueCat init error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const restorePurchases = async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    }
  };

  const refreshCustomerInfo = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        offerings,
        isPremium,
        isLoading,
        restorePurchases,
        refreshCustomerInfo,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
}
```

### 2. Add Provider to App

Update `app/_layout.tsx`:

```typescript
import { RevenueCatProvider } from '@/context/RevenueCatContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RevenueCatProvider>
          <RootLayoutNav />
        </RevenueCatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### 3. Identify Users

When user logs in, identify them to RevenueCat for cross-device sync:

```typescript
import Purchases from 'react-native-purchases';

// After user authentication
await Purchases.logIn(user.id);

// On logout
await Purchases.logOut();
```

---

## Implementing Paywalls

### Option 1: RevenueCat Paywall (Recommended)

Use RevenueCat's pre-built paywall UI:

```typescript
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

async function showPaywall() {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: 'premium',
  });

  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      // User now has premium access
      return true;
    case PAYWALL_RESULT.NOT_PRESENTED:
      // User already has entitlement
      return true;
    case PAYWALL_RESULT.CANCELLED:
    case PAYWALL_RESULT.ERROR:
      return false;
  }
}
```

### Option 2: Custom Paywall

Create `app/paywall.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRevenueCat } from '@/context/RevenueCatContext';
import AnimatedPressable from '@/components/AnimatedPressable';
import { Colors } from '@/constants/Colors';

export default function PaywallScreen() {
  const { offerings, isLoading, isPremium } = useRevenueCat();
  const colors = Colors.light;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isPremium) {
    router.back();
    return null;
  }

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Sekmingai!', 'Dabar turite Premium prenumerata!');
        router.back();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Klaida', error.message || 'Nepavyko uzsiprenumeruoti');
      }
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Atkurta!', 'Jusu prenumerata atkurta.');
        router.back();
      } else {
        Alert.alert('Nerasta', 'Neradome ankstesniu pirkiniu.');
      }
    } catch (error) {
      Alert.alert('Klaida', 'Nepavyko atkurti pirkiniu.');
    }
  };

  const weeklyPackage = offerings?.availablePackages.find(
    (p) => p.packageType === 'WEEKLY'
  );
  const monthlyPackage = offerings?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY'
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Miego Pasakos Premium</Text>

      <View style={styles.features}>
        <Text style={styles.feature}>✨ Neribotai pasaku</Text>
        <Text style={styles.feature}>🎙️ Neribotai balso profiliu</Text>
        <Text style={styles.feature}>⏱️ Ilesnes pasakos (iki 10 min)</Text>
        <Text style={styles.feature}>🌙 Prioritetinis palaikymas</Text>
      </View>

      <View style={styles.packages}>
        {monthlyPackage && (
          <AnimatedPressable
            style={[styles.packageCard, styles.recommended]}
            onPress={() => handlePurchase(monthlyPackage)}
            scaleValue={0.97}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Geriausia kaina</Text>
            </View>
            <Text style={styles.packageTitle}>Menesine</Text>
            <Text style={styles.packagePrice}>
              {monthlyPackage.product.priceString}/men
            </Text>
            <Text style={styles.packageSaving}>
              Sutaupykite 38%
            </Text>
          </AnimatedPressable>
        )}

        {weeklyPackage && (
          <AnimatedPressable
            style={styles.packageCard}
            onPress={() => handlePurchase(weeklyPackage)}
            scaleValue={0.97}
          >
            <Text style={styles.packageTitle}>Savaitine</Text>
            <Text style={styles.packagePrice}>
              {weeklyPackage.product.priceString}/sav
            </Text>
          </AnimatedPressable>
        )}
      </View>

      <AnimatedPressable onPress={handleRestore} scaleValue={0.95}>
        <Text style={styles.restore}>Atkurti pirkinius</Text>
      </AnimatedPressable>

      <Text style={styles.terms}>
        Prenumerata automatiskai atsinaujins. Galite atsaukti bet kada.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAF5F2',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#4A3F3F',
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    marginBottom: 12,
    color: '#4A3F3F',
  },
  packages: {
    gap: 16,
    marginBottom: 24,
  },
  packageCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  recommended: {
    borderColor: '#B8908A',
    backgroundColor: 'rgba(184, 144, 138, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#B8908A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A3F3F',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B8908A',
    marginTop: 8,
  },
  packageSaving: {
    fontSize: 14,
    color: '#6B9B76',
    marginTop: 4,
  },
  restore: {
    textAlign: 'center',
    color: '#B8908A',
    fontSize: 14,
    marginBottom: 16,
  },
  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8B7B78',
    lineHeight: 18,
  },
});
```

---

## Checking Subscription Status

### In Components

```typescript
import { useRevenueCat } from '@/context/RevenueCatContext';

function MyComponent() {
  const { isPremium, isLoading } = useRevenueCat();

  if (isLoading) return <Loading />;

  if (!isPremium) {
    return <UpgradePrompt />;
  }

  return <PremiumContent />;
}
```

### Gate Features

Update your story creation flow:

```typescript
// In story/create.tsx or wherever you limit free users
const { isPremium } = useRevenueCat();

const handleCreateStory = async () => {
  if (!isPremium && user.free_story_used) {
    // Show paywall
    router.push('/paywall');
    return;
  }

  // Continue with story creation
};
```

### Sync with Supabase

Keep your database in sync:

```typescript
// After successful purchase
Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
  const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

  // Update user in Supabase
  await supabase
    .from('users')
    .update({
      subscription_status: isPremium ? 'active' : 'inactive',
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
});
```

---

## Testing

### 1. Sandbox Testing (iOS)

1. Create Sandbox Tester in App Store Connect:
   - Go to **Users and Access → Sandbox → Testers**
   - Add new tester with unique email

2. On device:
   - Sign out of App Store
   - When prompted during purchase, sign in with sandbox account
   - Sandbox subscriptions renew quickly (monthly = 5 min)

### 2. Testing (Android)

1. Add testers in Google Play Console:
   - Go to **Setup → License testing**
   - Add tester email addresses

2. Test track:
   - Upload APK to Internal Testing track
   - Add testers to track

### 3. RevenueCat Test Store

For initial development, RevenueCat provides a **Test Store** that works without real store credentials.

---

## Production Checklist

Before going live:

- [ ] Paid Applications Agreement signed (Apple)
- [ ] Bank account verified with "Clear" status
- [ ] Products approved in App Store Connect
- [ ] Products created in Google Play Console
- [ ] RevenueCat API keys are production keys
- [ ] All products attached to entitlements
- [ ] Offerings configured with packages
- [ ] Paywall designed in RevenueCat Dashboard (if using built-in)
- [ ] User identification implemented
- [ ] Restore purchases working
- [ ] Subscription status synced to your backend
- [ ] Terms of Service and Privacy Policy links added
- [ ] Receipt validation enabled (automatic with RevenueCat)
- [ ] DEV_MODE disabled in app

---

## Pricing Strategy Recommendation

For Bedtime Stories app:

| Plan | Price | Value Prop |
|------|-------|------------|
| **Weekly** | $1.99/week | Try it out, low commitment |
| **Monthly** | $4.99/month (~$1.25/week) | Best value - 38% savings |

**Why Weekly + Monthly works:**
- Weekly = low barrier to entry for hesitant parents
- Monthly = clear savings incentive to upgrade
- Weekly subscribers often convert to monthly after seeing value

Consider:
- Free trial (3-7 days) on weekly plan
- Introductory pricing for first-time subscribers
- Family sharing (Apple) for multi-child households

---

## Resources

- [RevenueCat Expo Guide](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat Paywalls](https://www.revenuecat.com/docs/tools/paywalls)
- [Expo IAP Guide](https://docs.expo.dev/guides/in-app-purchases/)
- [RevenueCat GitHub](https://github.com/RevenueCat/react-native-purchases)
- [iOS Product Setup](https://www.revenuecat.com/docs/getting-started/entitlements/ios-products)
- [Entitlements Guide](https://www.revenuecat.com/docs/getting-started/entitlements)

---

*Last updated: January 2025*
