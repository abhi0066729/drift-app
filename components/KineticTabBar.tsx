import React, { useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 64;

const getLabel = (routeName: string) => {
  switch (routeName) {
    case 'index': return 'TODAY';
    case 'capture': return 'CAPTURE';
    case 'notes': return 'NOTES';
    case 'people': return 'PEOPLE';
    default: return 'HOME';
  }
};

function KineticTabItem({ route, isFocused, onPress, onLongPress, theme }: any) {
  // Shared values for the gravity drop
  const dropY = useSharedValue(isFocused ? 0 : 0);
  const dotOpacity = useSharedValue(isFocused ? 1 : 0.4);
  
  // Shared values for the impact ripple
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      // 1. Teleport dot up (invisible to user instantly)
      dropY.value = -30;
      dotOpacity.value = 0;
      rippleScale.value = 0.5;
      rippleOpacity.value = 0;

      // 2. Drop the gravity dot heavily
      dotOpacity.value = withTiming(1, { duration: 150 });
      dropY.value = withSpring(0, { damping: 5, stiffness: 180, mass: 1.2 }, () => {
        // 3. Immediately fast ripple explosion upon impact
        rippleOpacity.value = withTiming(0.6, { duration: 50 }, () => {
          rippleOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
        });
        rippleScale.value = withTiming(3.5, { duration: 350, easing: Easing.out(Easing.ease) });
      });
    } else {
      // Defocus state
      dotOpacity.value = withTiming(0.4, { duration: 200 });
      dropY.value = withTiming(0, { duration: 200 }); 
    }
  }, [isFocused]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropY.value }],
    opacity: dotOpacity.value,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <TouchableOpacity
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={1}
    >
      <View style={styles.nodeWrapper}>
        <View style={styles.dotContainer}>
          {/* Background impact ripple */}
          <Animated.View style={[styles.rippleRing, rippleStyle]} />
          
          {/* The physical gravity dot */}
          <Animated.View style={[
            styles.nodeDot,
            { backgroundColor: isFocused ? (theme === 'dark' ? NightTheme.accent : '#8E44AD') : (theme === 'dark' ? NightTheme.textMuted : '#111111') },
            isFocused ? styles.nodeDotActive : {},
            dotStyle
          ]} />
        </View>

        <Text style={[styles.nodeLabel, { color: isFocused ? (theme === 'dark' ? NightTheme.accent : '#8E44AD') : (theme === 'dark' ? NightTheme.textMuted : '#AAAAAA') }]}>
          {getLabel(route.name)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function KineticTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useNotesStore(state => state.theme);
  
  return (
    <View style={[styles.tabBarContainer, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)', shadowOpacity: theme === 'dark' ? 0.3 : 0.1 }]}>
      <BlurView intensity={theme === 'dark' ? 80 : 100} tint={theme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={styles.blurContainer}>
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
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
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    width: TAB_BAR_WIDTH,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  blurContainer: {
    flex: 1,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  dotContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  nodeDotActive: {
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  rippleRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#8E44AD',
    zIndex: 1,
  },
  nodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.0,
    marginTop: 6,
  }
});
