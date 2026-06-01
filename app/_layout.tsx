import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { RevenueCatProvider } from '@/context/RevenueCatContext';
import { Colors } from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

const ONBOARDING_KEY = '@bedtime_stories_onboarding_complete';

// KŪRIMO REŽIMAS - nustatykite true, kad pakartotinai įkrovus visada būtų rodomas įvadinis ekranas
const DEV_MODE = false;

export const unstable_settings = {
  initialRouteName: '(main)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function checkOnboarding() {
      if (DEV_MODE) {
        // Kūrimo režime visada rodyti įvadinį ekraną
        setNeedsOnboarding(true);
        setOnboardingChecked(true);
        return;
      }

      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setNeedsOnboarding(value !== 'true');
      } catch {
        setNeedsOnboarding(true);
      }
      setOnboardingChecked(true);
    }

    if (loaded) {
      checkOnboarding();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded && onboardingChecked) {
      if (needsOnboarding) {
        router.replace('/onboarding');
        // Atidėti pradžios ekrano paslėpimą, kad pirma būtų prijungtas įvadinis ekranas
        setTimeout(() => SplashScreen.hideAsync(), 100);
      } else {
        SplashScreen.hideAsync();
      }
    }
  }, [loaded, onboardingChecked, needsOnboarding]);

  if (!loaded || !onboardingChecked) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RevenueCatProvider>
            <RootLayoutNav />
          </RevenueCatProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const theme = colorScheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: '#2A2525',
          card: 'rgba(40, 35, 35, 0.95)',
          primary: '#D4B5B0',
          border: 'rgba(100, 85, 85, 0.3)',
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: '#FAF5F2',
          card: 'rgba(255, 255, 255, 0.95)',
          primary: '#B8908A',
          border: 'rgba(200, 180, 175, 0.3)',
        },
      };

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
          animationDuration: 250,
        }}
      >
        {/* Pagrindiniai ekranai su apatine navigacija */}
        <Stack.Screen
          name="(main)"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />

        {/* Modaliniai ekranai - sklandus išslydimas iš apačios */}
        <Stack.Screen
          name="story/create"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 300,
            headerShown: true,
            headerTitle: 'Sukurti pasaką',
            headerBackTitle: 'Atgal',
            headerTintColor: colors.primary,
            headerStyle: {
              backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2',
            },
            headerTitleStyle: {
              color: colors.text,
              fontWeight: '600',
            },
            gestureEnabled: true,
            gestureDirection: 'vertical',
            contentStyle: { backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2' },
          }}
        />
        <Stack.Screen
          name="story/generating"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            animationDuration: 200,
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="child/create"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 300,
            headerShown: true,
            headerTitle: 'Naujas vaikas',
            headerBackTitle: 'Atgal',
            headerTintColor: colors.primary,
            headerStyle: {
              backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2',
            },
            headerTitleStyle: {
              color: colors.text,
              fontWeight: '600',
            },
            gestureEnabled: true,
            gestureDirection: 'vertical',
            contentStyle: { backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2' },
          }}
        />
        <Stack.Screen
          name="voice/create"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 300,
            headerShown: true,
            headerTitle: 'Naujas balsas',
            headerBackTitle: 'Atgal',
            headerTintColor: colors.primary,
            headerStyle: {
              backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2',
            },
            headerTitleStyle: {
              color: colors.text,
              fontWeight: '600',
            },
            gestureEnabled: true,
            gestureDirection: 'vertical',
            contentStyle: { backgroundColor: colorScheme === 'dark' ? '#2A2525' : '#FAF5F2' },
          }}
        />
        {/* Kortelių kategorijos puslapis */}
        <Stack.Screen
          name="cards/[category]"
          options={{
            animation: 'slide_from_right',
            animationDuration: 250,
            headerShown: false, // Antraštė tvarkoma pačiame ekrane
          }}
        />

        <Stack.Screen name="+not-found" />

        {/* Mokėjimo sienelės modalas */}
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 300,
            headerShown: true,
            headerTitle: 'Premium',
            headerBackTitle: 'Atgal',
            headerTintColor: colors.primary,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              color: colors.text,
              fontWeight: '600',
            },
            gestureEnabled: true,
            gestureDirection: 'vertical',
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        {/* Įvadinis ekranas - per visą ekraną, be gestų */}
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 300,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
