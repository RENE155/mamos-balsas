import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';
import { syncSubscriptionType, SubscriptionType } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isPremium: boolean;
  subscriptionType: SubscriptionType;
  isLoading: boolean;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
}

/**
 * Nustatyti prenumeratos tipą iš RevenueCat kliento informacijos
 */
const getSubscriptionType = (info: CustomerInfo | null): SubscriptionType => {
  if (!info?.entitlements.active['premium']) return 'none';
  const productId = info.entitlements.active['premium'].productIdentifier;
  if (productId.includes('weekly')) return 'weekly';
  if (productId.includes('monthly')) return 'monthly';
  return 'monthly'; // numatytasis premium variantas
};

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY!;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY!;
const ENTITLEMENT_ID = 'premium';

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;
  const subscriptionType = getSubscriptionType(customerInfo);

  useEffect(() => {
    async function init() {
      try {
        // Įjungti derinimo žurnalus kūrimo metu
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Konfigūruoti su platformai specifiniu API raktu
        const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

        if (!apiKey) {
          console.warn('[RevenueCat] API key not configured for platform:', Platform.OS);
          setIsLoading(false);
          return;
        }

        await Purchases.configure({ apiKey });

        // Gauti kliento informaciją
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        // Pastaba: prenumeratos sinchronizavimas vyksta atskirame useEffect, kuris stebi userId

        // Gauti pasiūlymus
        const offeringsResult = await Purchases.getOfferings();
        setOfferings(offeringsResult.current);

        // Klausytis kliento informacijos atnaujinimų
        Purchases.addCustomerInfoUpdateListener(async (info) => {
          setCustomerInfo(info);
          // Pastaba: klausytojas negali tinkamai pasiekti userId uždarinio,
          // todėl sinchronizuojame atskirame efekte žemiau
        });
      } catch (error) {
        console.error('[RevenueCat] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Sinchronizuoti prenumeratą su duomenų baze, kai pasikeičia userId arba customerInfo
  useEffect(() => {
    if (userId && customerInfo) {
      const type = getSubscriptionType(customerInfo);
      console.log('[RevenueCat] Syncing subscription to database:', { userId, type });
      syncSubscriptionType(userId, type);
    }
  }, [userId, customerInfo]);

  const restorePurchases = async (): Promise<CustomerInfo> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      throw error;
    }
  };

  const refreshCustomerInfo = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[RevenueCat] Refresh error:', error);
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        offerings,
        isPremium,
        subscriptionType,
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
