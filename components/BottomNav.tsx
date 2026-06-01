import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { usePathname, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AnimatedPressable from '@/components/AnimatedPressable';

interface NavItem {
  name: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  route: string;
  matchRoutes: string[];
}

const navItems: NavItem[] = [
  {
    name: 'Pradzia',
    icon: 'home',
    route: '/',
    matchRoutes: ['/', '/index', '/child'],
  },
  {
    name: 'Mano',
    icon: 'book',
    route: '/stories',
    matchRoutes: ['/stories', '/story'],
  },
  {
    name: 'Balsai',
    icon: 'microphone',
    route: '/voices',
    matchRoutes: ['/voices', '/voice'],
  },
  {
    name: 'Nustatymai',
    icon: 'cog',
    route: '/settings',
    matchRoutes: ['/settings'],
  },
];

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 4;

interface AnimatedNavItemProps {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
}

function AnimatedNavItem({ item, isActive, onPress, colors }: AnimatedNavItemProps) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withSpring(isActive ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    if (isActive) {
      scale.value = withSpring(1.05, { damping: 10, stiffness: 300 });
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    }
  }, [isActive]);

  const iconContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgOpacity.value,
      [0, 1],
      ['transparent', colors.primary]
    ),
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      bgOpacity.value,
      [0, 1],
      [colors.tabIconDefault, colors.primary]
    ),
  }));

  return (
    <AnimatedPressable
      style={styles.navItem}
      onPress={onPress}
      scaleValue={0.9}
    >
      <Animated.View style={[styles.iconContainer, iconContainerStyle]}>
        <FontAwesome
          name={item.icon}
          size={18}
          color={isActive ? '#fff' : colors.tabIconDefault}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.navLabel,
          { fontWeight: isActive ? '600' : '500' },
          labelStyle,
        ]}
      >
        {item.name}
      </Animated.Text>
    </AnimatedPressable>
  );
}

export default function BottomNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const getActiveIndex = () => {
    const currentPath = pathname || '/';

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      if (item.route === '/') {
        if (currentPath === '/' || currentPath === '/index' || currentPath === '') {
          return i;
        }
      } else if (item.matchRoutes.some((route) => currentPath.startsWith(route))) {
        return i;
      }
    }
    return 0;
  };

  const isActive = (item: NavItem) => {
    const currentPath = pathname || '/';

    if (item.route === '/') {
      return currentPath === '/' || currentPath === '/index' || currentPath === '';
    }
    return item.matchRoutes.some((route) => currentPath.startsWith(route));
  };

  const handlePress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.glassStroke,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
      ]}
    >
      {navItems.map((item) => (
        <AnimatedNavItem
          key={item.route}
          item={item}
          isActive={isActive(item)}
          onPress={() => handlePress(item.route)}
          colors={colors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    width: 40,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    shadowColor: '#B8908A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  navLabel: {
    fontSize: 10,
  },
});
