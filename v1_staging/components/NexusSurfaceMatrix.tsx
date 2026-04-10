import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Animated, { 
  FadeInUp, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { generateNexusMatrix, generateMentalPattern, generateFullGhostPool } from '@/utils/noteUtils';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface NexusSurfaceMatrixProps {
  notes: any[];
  onPress: (node: any, type: 'dot' | 'text') => void;
  theme: 'light' | 'dark';
}

export default function NexusSurfaceMatrix({ notes, onPress, theme }: NexusSurfaceMatrixProps) {
  const isDark = theme === 'dark';
  
  // High-Fidelity Pulse Animation State
  const pulse = useSharedValue(0);
  
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFlashStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        pulse.value,
        [0, 1],
        [isDark ? '#2D1F5A' : '#E5E7EB', isDark ? '#7C3AED' : '#A78BFA']
      ),
      shadowOpacity: withTiming(pulse.value * 0.3),
      transform: [{ scale: withTiming(1 + (pulse.value * 0.01)) }]
    };
  });

  // Dynamic Theme Tokens
  const tokens = {
    background: isDark ? NightTheme.background : '#FFFFFF',
    surface: isDark ? NightTheme.surface : '#FFFFFF',
    textPrimary: isDark ? NightTheme.textPrimary : '#11181C',
    textSecondary: isDark ? NightTheme.textSecondary : '#4B5563',
    textDeepMuted: isDark ? NightTheme.textDeepMuted : '#9CA3AF',
    clusterCard: isDark ? '#161412' : '#FFFFFF',
    clusterBorder: isDark ? '#242220' : '#E5E7EB',
    flashCard: isDark ? '#1A1230' : '#FFFFFF',
    flashBorder: isDark ? '#2D1F5A' : '#E5E7EB',
    flashPill: isDark ? NightTheme.accentMuted : 'rgba(124, 58, 237, 0.08)',
  };

  const displayNotes = (notes && notes.length > 0) ? notes : generateFullGhostPool();
  const data = useMemo(() => generateNexusMatrix(displayNotes), [displayNotes]);

  return (
    <ScrollView 
        style={[styles.container, { backgroundColor: tokens.background }]} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
    >
      <View style={styles.topPulseContainer}>
        <Text style={[styles.topPulseText, { color: NightTheme.accent }]}>
          "{generateMentalPattern(notes)}"
        </Text>
      </View>

      {/* 1. CLUSTER SECTION */}
      <View style={styles.section}>
        <Text style={[styles.sectionHint, { color: tokens.textDeepMuted }]}>
          what your mind keeps returning to
        </Text>
        {data.clusters.map((cluster, idx) => (
          <Animated.View 
            key={cluster.id} 
            entering={FadeInUp.delay(100 * idx).duration(600)}
            layout={Layout.springify()}
            style={[
              styles.clusterCard, 
              { backgroundColor: tokens.clusterCard, borderColor: tokens.clusterBorder }
            ]}
          >
            <View style={styles.clusterHeader}>
              <View style={[styles.clusterDot, { backgroundColor: cluster.color }]} />
              <Text style={[styles.clusterTopic, { color: tokens.textPrimary }]}>
                {cluster.topic.toUpperCase()}
              </Text>
              <Text style={[styles.clusterCount, { color: tokens.textDeepMuted }]}>
                {cluster.count} THOUGHTS
              </Text>
            </View>
            {cluster.notes.map((note: any, nIdx: number) => (
              <Text 
                key={note.id} 
                style={[
                  styles.clusterNote, 
                  { 
                    color: tokens.textSecondary,
                    borderTopColor: isDark ? '#1E1E1C' : '#F3F4F6'
                  },
                  nIdx === 0 && { color: tokens.textPrimary, borderTopWidth: 0, paddingTop: 0 }
                ]}
                onPress={() => onPress(note, 'text')}
              >
                {note.content}
              </Text>
            ))}
          </Animated.View>
        ))}
      </View>

      {/* 2. ZENITH SYNTHESIS: Synthesized Insights */}
      {data.flashes.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHint, { color: tokens.textDeepMuted }]}>
            zenith synthesis
          </Text>
          {data.flashes.map((flash, idx) => (
            <Animated.View 
              key={flash.id} 
              entering={FadeInUp.delay(400 + (100 * idx)).duration(600)}
              style={[
                styles.flashCard, 
                { 
                  backgroundColor: tokens.flashCard, 
                  borderColor: tokens.flashBorder,
                  shadowColor: NightTheme.accent 
                },
                animatedFlashStyle
              ]}
            >
              <View style={styles.flashTag}>
                <View style={[styles.flashDot, { backgroundColor: NightTheme.accent }]} />
                <Text style={[styles.flashTagText, { color: NightTheme.accent }]}>
                  SYNTHESIS · {flash.topic.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.flashTitle, { color: tokens.textPrimary }]}>
                {flash.title}
              </Text>
              <Text style={[styles.flashBody, { color: tokens.textSecondary }]}>
                {flash.body}
              </Text>
              <View style={styles.flashMeta}>
                <View style={[styles.flashPill, { backgroundColor: tokens.flashPill }]}>
                  <Text style={[styles.flashPillText, { color: NightTheme.accent }]}>
                    {flash.count} THOUGHTS · {flash.days} DAYS
                  </Text>
                </View>
                <Text style={[styles.flashTime, { color: tokens.textDeepMuted }]}>
                  EVOLVED JUST NOW
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      {/* 3. MOOD THREAD */}
      <View style={styles.section}>
        <Text style={[styles.sectionHint, { color: tokens.textDeepMuted }]}>
          today's emotional thread
        </Text>
        <View style={styles.moodRow}>
          {data.moodTimeline.map((item, i) => (
            <View 
                key={i} 
                style={[styles.moodSeg, { backgroundColor: item.color, opacity: 0.5 + (i * 0.05) }]} 
            />
          ))}
        </View>
        <View style={styles.moodTicks}>
          <Text style={[styles.moodTick, { color: tokens.textDeepMuted }]}>anxious</Text>
          <Text style={[styles.moodTick, { color: tokens.textDeepMuted }]}>calm</Text>
          <Text style={[styles.moodTick, { color: tokens.textDeepMuted }]}>focused</Text>
          <Text style={[styles.moodTick, { color: tokens.textDeepMuted }]}>now</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 45, 
    paddingBottom: 80,
  },
  topPulseContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  topPulseText: {
    fontSize: 13,
    fontWeight: '300',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.85,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHint: {
    fontSize: 8,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  clusterCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clusterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  clusterTopic: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clusterCount: {
    fontSize: 8,
    marginLeft: 'auto',
  },
  clusterNote: {
    fontSize: 11,
    lineHeight: 18,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  flashCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    // iOS Shadows for the spectral aura
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  flashTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flashDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6,
  },
  flashTagText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  flashTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  flashBody: {
    fontSize: 11,
    lineHeight: 18,
  },
  flashMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  flashPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  flashPillText: {
    fontSize: 8,
    fontWeight: '600',
  },
  flashTime: {
    fontSize: 8,
    marginLeft: 'auto',
  },
  moodRow: {
    flexDirection: 'row',
    height: 4,
    gap: 3,
    marginBottom: 6,
  },
  moodSeg: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  moodTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodTick: {
    fontSize: 7,
    textTransform: 'uppercase',
  },
});
