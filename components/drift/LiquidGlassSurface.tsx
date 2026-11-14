import React, { memo } from 'react';
import { StyleSheet, View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export type GlassVariant = 'clear' | 'frosted' | 'smoked' | 'image' | 'layered';

interface LiquidGlassSurfaceProps {
  children?: React.ReactNode;
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
  isPressed?: boolean;
  isDragging?: boolean;
  stackDepth?: number; // 0 = standalone, 1, 2... for overlapping layered glass
}

/**
 * LiquidGlassSurface
 * 
 * Physical Liquid Glass Material Implementation:
 * 1. True backdrop translucency with background-dependent blur
 * 2. Multi-layer compositing (Optical Blur -> Internal Translucency Core -> Specular Rim & Edge Refraction)
 * 3. Asymmetric Fresnel edge refraction (curved glass bevel effect)
 * 4. Micro caustic highlights & directional light sheen
 * 5. Dynamic depth response on touch / drag / stacking
 */
export const LiquidGlassSurface = memo(function LiquidGlassSurface({
  children,
  variant = 'frosted',
  style,
  isPressed = false,
  isDragging = false,
  stackDepth = 0,
}: LiquidGlassSurfaceProps) {
  // Optical configuration based on physical variant
  const config = React.useMemo(() => {
    switch (variant) {
      case 'clear':
        return {
          blurIntensity: Platform.OS === 'ios' ? 24 : 16,
          tint: 'light' as const,
          baseWash: 'rgba(255, 255, 255, 0.03)',
          coreColors: [
            'rgba(255, 255, 255, 0.12)',
            'rgba(255, 255, 255, 0.02)',
            'rgba(240, 245, 250, 0.05)',
          ],
          rimBorder: 'rgba(255, 255, 255, 0.55)',
          rimBottom: 'rgba(255, 255, 255, 0.15)',
          innerGlow: 'rgba(255, 255, 255, 0.25)',
        };
      case 'smoked':
        return {
          blurIntensity: Platform.OS === 'ios' ? 55 : 38,
          tint: 'dark' as const,
          baseWash: 'rgba(18, 22, 24, 0.35)',
          coreColors: [
            'rgba(40, 48, 52, 0.35)',
            'rgba(24, 28, 30, 0.20)',
            'rgba(18, 20, 24, 0.40)',
          ],
          rimBorder: 'rgba(255, 255, 255, 0.35)',
          rimBottom: 'rgba(0, 0, 0, 0.40)',
          innerGlow: 'rgba(255, 255, 255, 0.12)',
        };
      case 'image':
        return {
          blurIntensity: Platform.OS === 'ios' ? 35 : 22,
          tint: 'light' as const,
          baseWash: 'rgba(255, 255, 255, 0.05)',
          coreColors: [
            'rgba(255, 255, 255, 0.20)',
            'rgba(255, 255, 255, 0.04)',
            'rgba(255, 255, 255, 0.10)',
          ],
          rimBorder: 'rgba(255, 255, 255, 0.65)',
          rimBottom: 'rgba(255, 255, 255, 0.20)',
          innerGlow: 'rgba(255, 255, 255, 0.30)',
        };
      case 'layered':
        return {
          blurIntensity: Platform.OS === 'ios' ? 50 : 34,
          tint: 'light' as const,
          baseWash: `rgba(255, 255, 255, ${Math.min(0.12, 0.04 + stackDepth * 0.03)})`,
          coreColors: [
            'rgba(255, 255, 255, 0.22)',
            'rgba(255, 255, 255, 0.05)',
            'rgba(245, 235, 250, 0.12)',
          ],
          rimBorder: 'rgba(255, 255, 255, 0.70)',
          rimBottom: 'rgba(255, 255, 255, 0.20)',
          innerGlow: 'rgba(255, 255, 255, 0.35)',
        };
      case 'frosted':
      default:
        return {
          blurIntensity: Platform.OS === 'ios' ? 42 : 28,
          tint: 'light' as const,
          baseWash: 'rgba(255, 255, 255, 0.05)',
          coreColors: [
            'rgba(255, 255, 255, 0.18)',
            'rgba(255, 255, 255, 0.03)',
            'rgba(240, 248, 255, 0.08)',
          ],
          rimBorder: 'rgba(255, 255, 255, 0.60)',
          rimBottom: 'rgba(255, 255, 255, 0.18)',
          innerGlow: 'rgba(255, 255, 255, 0.28)',
        };
    }
  }, [variant, stackDepth]);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderColor: config.rimBorder,
          backgroundColor: config.baseWash,
          shadowOpacity: isDragging ? 0.24 : isPressed ? 0.18 : 0.12 + Math.min(stackDepth * 0.04, 0.1),
          shadowRadius: isDragging ? 32 : isPressed ? 20 : 22,
          elevation: isDragging ? 12 : 6 + stackDepth * 2,
        },
        style,
      ]}
    >
      {/* Layer 1: True Optical Backdrop Sampling Blur */}
      <BlurView
        intensity={config.blurIntensity}
        tint={config.tint}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 2: Core Volumetric Density Wash */}
      <LinearGradient
        colors={config.coreColors as any}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Layer 3: Edge Refraction & Curved Bevel (Fresnel simulation) */}
      <LinearGradient
        colors={[
          config.innerGlow,
          'rgba(255, 255, 255, 0.0)',
          'rgba(255, 255, 255, 0.0)',
          config.rimBottom,
        ]}
        locations={[0, 0.12, 0.88, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Layer 4: Primary Directional Specular Reflection (Top-Left Rim Highlight) */}
      <View style={styles.topSpecularHighlight} pointerEvents="none" />

      {/* Layer 5: Bottom Refractive Prismatic Shadow/Edge */}
      <View style={styles.bottomRefractionEdge} pointerEvents="none" />

      {/* Foreground Content (kept 100% sharp and crisp) */}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 14 },
  },
  topSpecularHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 1,
  },
  bottomRefractionEdge: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 1,
  },
});
