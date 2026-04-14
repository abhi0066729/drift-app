import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { 
  aggregateEntities, 
  getCategoryMomentum, 
  Entity, 
  InsightMomentum, 
  SynthesisInsight, 
  getSynthesisInsights,
  getSerendipityEchoes,
  getFutureProphecy,
  SerendipityEcho
} from '@/utils/insightUtils';
import { SocialMatrix, EmptyMatrixState } from '@/components/SocialMatrix';
import ThoughtCloud from '@/components/ThoughtCloud';
import * as Haptics from 'expo-haptics';
import { Note } from '@/store/useNotesStore';
import { Activity, TrendingUp, TrendingDown, Minus, Zap, Heart, Orbit, BarChart2, Sparkles, Clock, Compass } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  interpolateColor,
  withDelay,
  FadeInUp
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GenerativeAura = ({ momentum, theme }: { momentum: InsightMomentum[], theme: 'light' | 'dark' }) => {
  const isDark = theme === 'dark';
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 4000 }), -1, true);
  }, []);

  const topCategory = momentum[0]?.category || 'Journal';
  
  const auraColors: Record<string, string> = {
    Journal: '#8E44AD',
    Study: '#3498DB',
    Research: '#2980B9',
    Creative: '#F1C40F',
    Idea: '#2ECC71',
    Dream: '#9B59B6',
    Todo: '#E67E22',
    Reflection: '#1ABC9C'
  };

  const primaryColor = auraColors[topCategory] || '#8E44AD';

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulse.value * 0.15,
      backgroundColor: primaryColor,
      transform: [{ scale: 1 + pulse.value * 0.2 }]
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
       <Animated.View style={[styles.auraCircle, animatedStyle, { top: -100, left: -100 }]} />
       <Animated.View style={[styles.auraCircle, { ...animatedStyle, opacity: pulse.value * 0.1 }, { bottom: -100, right: -100 }]} />
    </View>
  );
};

const EchoCard = ({ echo, theme }: { echo: SerendipityEcho, theme: 'light' | 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <Animated.View entering={FadeInUp.delay(300)} style={[styles.echoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
       <View style={styles.echoHeader}>
          <Clock size={12} color="#95A5A6" />
          <Text style={styles.echoDate}>{new Date(echo.note.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
       </View>
       <Text style={[styles.echoContent, { color: isDark ? NightTheme.textPrimary : '#333' }]} numberOfLines={3}>{echo.note.content}</Text>
       <View style={styles.echoFooter}>
          <Sparkles size={10} color="#8E44AD" />
          <Text style={styles.echoReason}>{echo.reason.toUpperCase()}</Text>
       </View>
    </Animated.View>
  );
};

const InsightCard = ({ insight, theme }: { insight: SynthesisInsight, theme: 'light' | 'dark' }) => {
  const isDark = theme === 'dark';
  
  const iconMap = {
    correlation: <Orbit size={18} color="#3498DB" />,
    emotion: <Heart size={18} color="#E74C3C" />,
    shift: <BarChart2 size={18} color="#2ECC71" />
  };

  const bgStyles = {
    correlation: { backgroundColor: isDark ? 'rgba(52,152,219,0.1)' : '#EBF5FB' },
    emotion: { backgroundColor: isDark ? 'rgba(231,76,60,0.1)' : '#FDEDEC' },
    shift: { backgroundColor: isDark ? 'rgba(46,204,113,0.1)' : '#EAFAF1' }
  };

  return (
    <View style={[styles.insightCard, bgStyles[insight.type] || { backgroundColor: '#F9F9F9' }]}>
      <View style={styles.insightHeader}>
        {iconMap[insight.type]}
        <Text style={[styles.insightTitle, { color: isDark ? NightTheme.textPrimary : '#111' }]}>{insight.title}</Text>
      </View>
      <Text style={[styles.insightDesc, { color: isDark ? NightTheme.textSecondary : '#555' }]}>{insight.description}</Text>
    </View>
  );
};

const MomentumBar = ({ item, theme }: { item: InsightMomentum, theme: 'light' | 'dark' }) => {
  const isDark = theme === 'dark';
  const TrendIcon = item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
  const trendColor = item.trend === 'up' ? '#2ECC71' : item.trend === 'down' ? '#E74C3C' : '#95A5A6';

  return (
    <View style={styles.momentumRow}>
      <View style={styles.momentumLabelRow}>
        <Text style={[styles.momentumCat, { color: isDark ? NightTheme.textPrimary : '#111' }]}>{item.category}</Text>
        <View style={styles.trendRow}>
           <TrendIcon size={12} color={trendColor} />
           <Text style={[styles.momentumPercent, { color: trendColor }]}>{Math.round(item.percentage)}%</Text>
        </View>
      </View>
      <View style={[styles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
        <View 
          style={[
            styles.barFill, 
            { 
              width: `${item.percentage}%`, 
              backgroundColor: isDark ? '#8E44AD' : '#7C3AED',
              opacity: 0.8 
            }
          ]} 
        />
      </View>
    </View>
  );
};

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(state => state.notes);
  const theme = useNotesStore(state => state.theme);
  
  const [selectedEntity, setSelectedEntity] = React.useState<any | null>(null);

  const entities = useMemo(() => aggregateEntities(notes), [notes]);
  const momentum = useMemo(() => getCategoryMomentum(notes), [notes]);
  const insights = useMemo(() => getSynthesisInsights(notes), [notes]);
  const echoes = useMemo(() => getSerendipityEchoes(notes), [notes]);
  const prophecy = useMemo(() => getFutureProphecy(notes), [notes]);
  
  const entityNotes = useMemo(() => {
    if (!selectedEntity) return [];
    const name = selectedEntity.name;
    return notes.filter(n => n.content.includes(name));
  }, [selectedEntity, notes]);

  const topMomentum = momentum.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
      <GenerativeAura momentum={momentum} theme={theme} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100, paddingHorizontal: 24 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.header, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>The Oracle</Text>
            <Text style={styles.headerSubtitle}>SERENDIPITY & FUTURE DRIFT</Text>
          </View>
          <Activity size={20} color="#8E44AD" />
        </View>

        {/* PROPHECY SECTION */}
        {prophecy && (
           <Animated.View entering={FadeInUp} style={[styles.prophecyCard, { backgroundColor: theme === 'dark' ? '#1A1814' : '#FDFEFE', borderColor: '#8E44AD', borderWidth: 1 }]}>
              <View style={styles.prophecyHeader}>
                 <Compass size={18} color="#8E44AD" />
                 <Text style={styles.prophecyLabel}>FUTURE PROPHECY</Text>
              </View>
              <Text style={[styles.prophecyText, { color: theme === 'dark' ? NightTheme.textPrimary : '#111' }]}>
                 Your focus is drifting toward <Text style={{ fontWeight: '700', color: '#8E44AD' }}>{prophecy.category}</Text>. Expect a resonance peak soon.
              </Text>
              <View style={styles.prophecyProbBg}>
                 <View style={[styles.prophecyProbFill, { width: `${prophecy.probability}%` }]} />
              </View>
           </Animated.View>
        )}

        {/* ECHOES SECTION */}
        {echoes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SERENDIPITY ECHOES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.echoScroll}>
               {echoes.map(echo => (
                 <EchoCard key={echo.id} echo={echo} theme={theme} />
               ))}
            </ScrollView>
          </View>
        )}

        {/* MOMENTUM SECTION */}
        {momentum.length > 0 && (
          <View style={[styles.momentumCard, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }]}>
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>MIND MOMENTUM</Text>
               <Zap size={12} color="#95A5A6" />
            </View>
            {topMomentum.map(item => (
              <MomentumBar key={item.category} item={item} theme={theme} />
            ))}
          </View>
        )}

        {/* SYNTHESIS FEED */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYNTHESIS PATTERNS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightScroll}>
               {insights.map(insight => (
                 <InsightCard key={insight.id} insight={insight} theme={theme} />
               ))}
            </ScrollView>
          </View>
        )}
        
        {entities.length > 0 ? (
          <View style={styles.matrixWrapper}>
            <Text style={styles.sectionTitle}>RESISTANCE NEBULA</Text>
            <SocialMatrix 
              people={entities as any} 
              connections={[]} 
              onPersonPress={setSelectedEntity} 
              theme={theme} 
            />
          </View>
        ) : (
          (momentum.length === 0 && insights.length === 0) && (
            <EmptyMatrixState onSeed={() => {}} theme={theme} />
          )
        )}
      </ScrollView>

      <ThoughtCloud 
        person={selectedEntity}
        notes={entityNotes}
        onClose={() => setSelectedEntity(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  auraCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  header: { fontSize: 28, fontWeight: '300', letterSpacing: 2 },
  headerSubtitle: { fontSize: 9, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 3, fontWeight: '700' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: '#95A5A6', letterSpacing: 1.5, marginBottom: 16 },
  prophecyCard: { padding: 24, borderRadius: 32, marginBottom: 32, gap: 12 },
  prophecyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prophecyLabel: { fontSize: 10, fontWeight: '800', color: '#8E44AD', letterSpacing: 2 },
  prophecyText: { fontSize: 15, lineHeight: 22, fontWeight: '300' },
  prophecyProbBg: { height: 2, backgroundColor: 'rgba(142,68,173,0.1)', borderRadius: 1 },
  prophecyProbFill: { height: '100%', backgroundColor: '#8E44AD', borderRadius: 1 },
  echoScroll: { marginHorizontal: -24, paddingHorizontal: 24 },
  echoCard: { width: 280, padding: 20, borderRadius: 24, marginRight: 16 },
  echoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  echoDate: { fontSize: 10, color: '#95A5A6', fontWeight: '700', letterSpacing: 1 },
  echoContent: { fontSize: 14, lineHeight: 20, fontWeight: '300', opacity: 0.9 },
  echoFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  echoReason: { fontSize: 8, fontWeight: '800', color: '#8E44AD', letterSpacing: 1.5 },
  momentumCard: { padding: 24, borderRadius: 32, marginBottom: 32 },
  momentumRow: { marginBottom: 16 },
  momentumLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  momentumCat: { fontSize: 13, fontWeight: '600' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  momentumPercent: { fontSize: 11, fontWeight: '800' },
  barBg: { height: 4, borderRadius: 10, width: '100%', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 10 },
  insightScroll: { marginHorizontal: -24, paddingHorizontal: 24 },
  insightCard: { width: 260, padding: 20, borderRadius: 24, marginRight: 16 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightDesc: { fontSize: 12, lineHeight: 18, opacity: 0.8 },
  matrixWrapper: { height: 500, marginHorizontal: -24, marginTop: 20 },
});
