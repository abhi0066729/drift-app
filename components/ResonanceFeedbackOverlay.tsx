import React, { memo } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  FadeIn,
  FadeOut,
  SharedValue,
  useAnimatedProps
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ResonanceFeedbackOverlayProps {
  activeNodePos: { x: SharedValue<number>, y: SharedValue<number> };
  activeCategory: SharedValue<string | undefined>;
  originPos: { x: number, y: number };
}

const CATEGORIES = Object.keys(CATEGORY_COLORS);
const RING_SPACING = 16;
const START_RADIUS = 30;
const MAX_RADIUS = START_RADIUS + (CATEGORIES.length - 1) * RING_SPACING;
const PADDING = 20;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ActiveTether = memo(({ activeNodePos, haloCenter }: any) => {
    const animatedProps = useAnimatedProps(() => {
        const curX = activeNodePos.x.value;
        const curY = activeNodePos.y.value;
        
        // Elastic curve from node to halo center
        const cp1x = (curX + haloCenter.x) / 2;
        const cp1y = curY;
        const cp2x = haloCenter.x;
        const cp2y = (curY + haloCenter.y) / 2;

        return {
            d: `M ${curX} ${curY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${haloCenter.x} ${haloCenter.y}`
        };
    });

    return (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedPath
                animatedProps={animatedProps}
                stroke="#FFFFFF"
                strokeWidth={1.5}
                strokeDasharray="4, 4"
                fill="none"
                opacity={0.15}
            />
        </Svg>
    );
});

const OrbitRing = memo(({ cat, idx, activeCategory, haloCenter }: any) => {
    const color = CATEGORY_COLORS[cat];
    const radius = START_RADIUS + idx * RING_SPACING;
    
    const animatedStyle = useAnimatedStyle(() => {
        const isActive = activeCategory.value === cat;
        const opacity = isActive ? 1.0 : 0.08;
        const borderWidth = isActive ? 2.5 : 0.8;
        const scale = isActive ? withSpring(1.02) : withSpring(1.0);

        return {
            position: 'absolute',
            left: haloCenter.x - radius,
            top: haloCenter.y - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderWidth,
            borderColor: isActive ? color : '#FFFFFF',
            opacity,
            transform: [{ scale }],
            borderStyle: isActive ? 'solid' : 'dashed' as any,
            zIndex: isActive ? 100 : 1,
        };
    });

    const labelStyle = useAnimatedStyle(() => {
        const isActive = activeCategory.value === cat;
        return {
            position: 'absolute',
            left: haloCenter.x - 50, // Enough room for centering
            top: haloCenter.y - radius - 20,
            width: 100,
            alignItems: 'center',
            opacity: isActive ? 1.0 : 0,
            transform: [{ scale: isActive ? 1.1 : 0.8 }],
            zIndex: 110,
        };
    });

    return (
        <>
            <Animated.View style={animatedStyle} />
            <Animated.View style={labelStyle}>
                <View style={{ 
                    backgroundColor: color, 
                    paddingHorizontal: 12, 
                    paddingVertical: 4, 
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#FFF',
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    elevation: 5
                }}>
                    <Text style={{ 
                        color: '#FFF', 
                        fontSize: 9, 
                        fontWeight: '900', 
                        letterSpacing: 1.2 
                    }}>{cat.toUpperCase()}</Text>
                </View>
            </Animated.View>
        </>
    );
});

function ResonanceFeedbackOverlay({ activeNodePos, activeCategory, originPos }: ResonanceFeedbackOverlayProps) {
  // STICKY CLAMPING: Ensure the halo center stays visible within its own diameter
  const haloCenter = {
    x: Math.min(Math.max(originPos.x, MAX_RADIUS + PADDING), SCREEN_WIDTH - MAX_RADIUS - PADDING),
    y: Math.min(Math.max(originPos.y, MAX_RADIUS + PADDING), SCREEN_HEIGHT - MAX_RADIUS - PADDING)
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
      pointerEvents="none"
    >
      <ActiveTether activeNodePos={activeNodePos} haloCenter={haloCenter} />
      {CATEGORIES.map((cat, idx) => (
        <OrbitRing 
            key={cat} 
            cat={cat} 
            idx={idx} 
            activeCategory={activeCategory} 
            haloCenter={haloCenter}
        />
      ))}
    </Animated.View>
  );
}

export default memo(ResonanceFeedbackOverlay);
