import React, { memo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedProps, withSpring, FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface HullNode {
    x: number;
    y: number;
    r: number;
}

interface HullDescriptor {
    id: string;
    category: string;
    nodes: HullNode[];
    center: { x: number, y: number };
    bounds: { minX: number, maxX: number, minY: number, maxY: number };
}

interface NexusHullLayerProps {
    hulls: HullDescriptor[];
    activeView: 'chronos' | 'nexus';
}

const NexusHull = memo(({ hull, activeView }: { hull: HullDescriptor, activeView: string }) => {
    const color = CATEGORY_COLORS[hull.category] || '#8E44AD';
    
    // Create a smooth path around the cluster
    // Current approach: An amorphous rounded rect that wraps the bounds with extra padding
    const PADDING = 40;
    const { minX, maxX, minY, maxY } = hull.bounds;
    const hullWidth = (maxX - minX) + PADDING * 2;
    const hullHeight = (maxY - minY) + PADDING * 2;
    const borderRadius = Math.min(hullWidth, hullHeight) / 2;

    const animatedProps = useAnimatedProps(() => {
        const opacity = activeView === 'nexus' ? withSpring(0.35) : withSpring(0);
        return { opacity };
    });

    const path = `M ${minX - PADDING + borderRadius} ${minY - PADDING} H ${maxX + PADDING - borderRadius} A ${borderRadius} ${borderRadius} 0 0 1 ${maxX + PADDING} ${minY - PADDING + borderRadius} V ${maxY + PADDING - borderRadius} A ${borderRadius} ${borderRadius} 0 0 1 ${maxX + PADDING - borderRadius} ${maxY + PADDING} H ${minX - PADDING + borderRadius} A ${borderRadius} ${borderRadius} 0 0 1 ${minX - PADDING} ${maxY + PADDING - borderRadius} V ${minY - PADDING + borderRadius} A ${borderRadius} ${borderRadius} 0 0 1 ${minX - PADDING + borderRadius} ${minY - PADDING} Z`;

    return (
        <AnimatedPath
            d={path}
            fill={color}
            animatedProps={animatedProps}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.6}
        />
    );
});

function NexusHullLayer({ hulls, activeView }: NexusHullLayerProps) {
    if (activeView !== 'nexus') return null;

    return (
        <G pointerEvents="none">
            <Defs>
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                    <RadialGradient id={`grad-${cat}`} cx="50%" cy="50%" rx="50%" ry="50%" key={cat}>
                        <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <Stop offset="100%" stopColor={color} stopOpacity="0" />
                    </RadialGradient>
                ))}
            </Defs>
            {hulls.map((hull) => (
                <NexusHull key={hull.id} hull={hull} activeView={activeView} />
            ))}
        </G>
    );
}

export default memo(NexusHullLayer);
