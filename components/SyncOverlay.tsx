import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from 'react-native-reanimated';
import { SyncService, SyncProgress } from '@/services/SyncService';
import { NightTheme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SyncOverlay() {
  const [progress, setProgress] = useState<SyncProgress>({
    status: 'scanning',
    progress: 0.1,
    message: 'Waking up the cortex...'
  });

  const barWidth = useSharedValue(0.1);

  useEffect(() => {
    SyncService.getInstance().onProgress((p) => {
      setProgress(p);
      barWidth.value = withTiming(p.progress, { duration: 1000 });
    });
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  return (
    <Animated.View 
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(500)}
      style={styles.container}
    >
      <View style={styles.nebulaWrapper}>
         {/* Simple neural pulse visual */}
         <PulseCircle delay={0} size={200} color="rgba(142, 68, 173, 0.1)" />
         <PulseCircle delay={1000} size={300} color="rgba(142, 68, 173, 0.05)" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>DRIFT</Text>
        <Text style={styles.subtitle}>SYNCING THOUGHT LANDSCAPE</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, progressStyle]}>
              <LinearGradient 
                colors={['#8E44AD', '#A29BFE']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}} 
                style={StyleSheet.absoluteFill} 
              />
            </Animated.View>
          </View>
          <Text style={styles.message}>{progress.message.toUpperCase()}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const PulseCircle = ({ delay, size, color }: { delay: number, size: number, color: string }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    transform: [{ scale: scale.value }],
    position: 'absolute',
  }));

  return <Animated.View style={style} />;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NightTheme.background,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nebulaWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: '200',
    color: '#FFF',
    letterSpacing: 10,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E44AD',
    letterSpacing: 4,
    marginBottom: 60,
  },
  progressContainer: {
    width: '60%',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  bar: {
    height: '100%',
    borderRadius: 1,
  },
  message: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  }
});
