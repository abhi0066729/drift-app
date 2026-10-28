import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = Math.min(width - 40, 390);

const getLabel = (routeName: string) => {
  switch (routeName) {
    case 'index': return 'TODAY';
    case 'capture': return 'CAPTURE';
    case 'notes': return 'NOTES';
    case 'pulse': return 'STUDIO';
    default: return '';
  }
};

function KineticTabItem({ route, isFocused, onPress, onLongPress, theme }: any) {
  const isDark = theme === 'dark';
  const dropY = useSharedValue(isFocused ? 0 : 0);
  const scaleVal = useSharedValue(isFocused ? 1.05 : 1);
  const pillOpacity = useSharedValue(isFocused ? 1 : 0);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      dropY.value = -12;
      scaleVal.value = 1.1;
      pillOpacity.value = withTiming(1, { duration: 180 });
      rippleScale.value = 0.5;
      rippleOpacity.value = 0;

      dropY.value = withSpring(0, { damping: 14, stiffness: 220 });
      scaleVal.value = withSpring(1, { damping: 12, stiffness: 180 });

      rippleOpacity.value = withTiming(0.4, { duration: 80 }, () => {
        rippleOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      });
      rippleScale.value = withTiming(2.4, { duration: 350, easing: Easing.out(Easing.ease) });
    } else {
      pillOpacity.value = withTiming(0, { duration: 150 });
      dropY.value = withTiming(0, { duration: 200 });
      scaleVal.value = withTiming(1, { duration: 200 });
    }
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropY.value }, { scale: scaleVal.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
  }));

  return (
    <TouchableOpacity
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.85}
    >
      <Animated.View style={[styles.nodeWrapper, animStyle]}>
        {/* Active Pill Glass Glow */}
        <Animated.View style={[styles.activePillBg, pillStyle]}>
          <LinearGradient
            colors={isDark ? ['rgba(142,68,173,0.3)', 'rgba(142,68,173,0.08)'] : ['rgba(142,68,173,0.18)', 'rgba(142,68,173,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <View style={styles.dotContainer}>
          <Animated.View style={[styles.rippleRing, rippleStyle]} />
          <View
            style={[
              styles.nodeDot,
              {
                backgroundColor: isFocused
                  ? (isDark ? '#A29BFE' : '#8E44AD')
                  : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'),
              },
              isFocused ? styles.nodeDotActive : {},
            ]}
          />
        </View>

        <Text
          style={[
            styles.nodeLabel,
            {
              color: isFocused
                ? (isDark ? '#FFFFFF' : '#111111')
                : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
              fontWeight: isFocused ? '800' : '600',
            },
          ]}
        >
          {getLabel(route.name)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function KineticTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <View style={styles.outerWrapper}>
      <View
        style={[
          styles.tabBarContainer,
          {
            shadowColor: isDark ? '#000000' : '#8E44AD',
            shadowOpacity: isDark ? 0.45 : 0.15,
          },
        ]}
      >
        <BlurView
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          intensity={isDark ? 65 : 85}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Liquid Glass Highlight Rim */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
              : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <View
          style={[
            styles.glassBorder,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)',
            },
          ]}
          pointerEvents="none"
        />

        <View style={styles.tabsRow}>
          {(() => {
            const filteredRoutes = state.routes.filter(r => ['index', 'capture', 'notes', 'pulse'].includes(r.name));
            return filteredRoutes.map((route) => {
              const isFocused = state.routes[state.index].key === route.key;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              };
              const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

              return (
                <KineticTabItem
                  key={route.key}
                  route={route}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  theme={theme}
                />
              );
            });
          })()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  tabBarContainer: {
    width: TAB_BAR_WIDTH,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 16,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 33,
    borderWidth: 1.5,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    width: '100%',
  },
  activePillBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dotContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  nodeDotActive: {
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  rippleRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8E44AD',
    zIndex: 1,
  },
  nodeLabel: {
    fontSize: 9,
    letterSpacing: 1.6,
    marginTop: 4,
  },
});
