import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Wave = { a: number; f: number; p: number };
type ThreadConfig = { yRatio: number; base: number; waves: Wave[]; duration: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function createThread(i: number, count: number): ThreadConfig {
  return {
    yRatio: (i / (count - 1)) * 1.25 - 0.125,
    base: rand(-40, 40),
    duration: 35000 + i * 5000,
    waves: [
      { a: rand(10, 22), f: rand(0.5, 1.0), p: rand(0, Math.PI * 2) },
      { a: rand(3, 7), f: rand(1.4, 2.2), p: rand(0, Math.PI * 2) },
    ],
  };
}

const THREADS_COUNT = 7;
const THREAD_CONFIGS: ThreadConfig[] = Array.from({ length: THREADS_COUNT }, (_, i) =>
  createThread(i, THREADS_COUNT)
);

function ThreadLine({ config, index }: { config: ThreadConfig; index: number }) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withTiming(1, { duration: config.duration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const time = anim.value * Math.PI * 2;
    const w = SCREEN_WIDTH + 60;
    const STEP = 28;
    const baseY = SCREEN_HEIGHT * config.yRatio + config.base;

    let d = `M -30 ${baseY}`;
    let prevX = -30;
    let prevY = baseY;

    for (let x = -30 + STEP; x <= w; x += STEP) {
      let yOffset = 0;
      for (let k = 0; k < config.waves.length; k++) {
        const wv = config.waves[k];
        yOffset += Math.sin((x / SCREEN_WIDTH) * Math.PI * 2 * wv.f + wv.p + time) * wv.a;
      }
      const curY = baseY + yOffset;
      const midX = (prevX + x) / 2;
      const midY = (prevY + curY) / 2;
      d += ` Q ${prevX} ${prevY} ${midX} ${midY}`;
      prevX = x;
      prevY = curY;
    }
    d += ` L ${prevX} ${prevY}`;

    return { d };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="none"
      stroke="rgba(255, 255, 255, 0.22)"
      strokeWidth={1}
    />
  );
}

export function ThreadsBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
        {THREAD_CONFIGS.map((t, idx) => (
          <ThreadLine key={idx} config={t} index={idx} />
        ))}
      </Svg>
    </View>
  );
}
