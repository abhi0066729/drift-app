import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue, 
  withRepeat, 
  withSequence,
  Easing,
  interpolateColor,
  useDerivedValue,
  SharedValue
} from 'react-native-reanimated';
import { extractRealtime, extractDeep, NoteCategory } from '@/services/ai';
import { LinearGradient } from 'expo-linear-gradient';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { Note } from '@/utils/noteUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

const { width, height } = Dimensions.get('window');

// --- Universal Intent Engine (Semantic Roots) ---
// Focused on word stems to catch various forms (e.g., 'meeting' vs 'meet')
const SEMANTIC_INTENTS: Partial<Record<NoteCategory, RegExp[]>> = {
  Todo: [
    /task/i, /todo/i, /buy/i, /remind/i, /finish/i, /action/i, /check/i, /urgent/i, /must/i, /checklist/i, /\[ \]/
  ],
  Idea: [
    /idea/i, /concept/i, /brainstorm/i, /maybe/i, /what if/i, /project/i, /vision/i, /bulb/i, /innov/i, /potential/i
  ],
  Meeting: [
    /meet/i, /sync/i, /huddl/i, /call/i, /agend/i, /discuss/i, /participant/i, /zoom/i, /teams/i, /skype/i, /invite/i, /calend/i, /huddle/i
  ],
  Dream: [
    /dream/i, /nightm/i, /vivid/i, /vision/i, /last night/i, /slept/i, /woke up/i, /unconsc/i, /dreaming/i
  ],
  Study: [
    /learn/i, /read/i, /study/i, /course/i, /lesson/i, /exam/i, /test/i, /acad/i, /grad/i, /chapter/i, /book/i
  ],
  Research: [
    /data/i, /analy/i, /expe/i, /scien/i, /hypo/i, /evidence/i, /stats/i, /finding/i, /investig/i, /discov/i
  ],
  Quote: [
    /said/i, /stated/i, /mention/i, /wrote/i, /author/i, /remark/i, /"|'|“|”/
  ],
  Reflection: [
    /think/i, /feel/i, /wonder/i, /realiz/i, /honestly/i, /insight/i, /thought/i, /believe/i, /gratit/i, /reflex/i, /ponder/i, /meditat/i
  ],
  Creative: [
    /poem/i, /lyrics/i, /story/i, /novel/i, /sketch/i, /design/i, /art/i, /doodle/i, /paint/i, /compo/i, /melody/i, /prototyp/i
  ]
};

// --- Stardust Component ---
const PARTICLE_COUNT = 18;
const Particle = ({ index }: { index: number }) => {
  const x = useSharedValue(Math.random() * width);
  const y = useSharedValue(Math.random() * height);
  const opacity = useSharedValue(0.1 + Math.random() * 0.4);

  useEffect(() => {
    const duration = 8000 + Math.random() * 10000;
    x.value = withRepeat(withTiming(x.value + (Math.random() - 0.5) * 150, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    y.value = withRepeat(withTiming(y.value + (Math.random() - 0.5) * 150, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    opacity: opacity.value,
    transform: [{ scale: 0.5 + (index % 3) * 0.2 }],
  }));

  return <Animated.View style={[styles.particle, style]} />;
};

// --- Neural Nebula Blob ---
const NebulaBlob = ({ activeColor, duration, radius, isTyping, speedMultiplier }: { activeColor: SharedValue<string>, duration: number, radius: number, isTyping: boolean, speedMultiplier: SharedValue<number> }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    tx.value = withRepeat(withSequence(
      withTiming(radius, { duration, easing: Easing.inOut(Easing.sin) }),
      withTiming(-radius, { duration, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
    
    ty.value = withRepeat(withSequence(
      withTiming(-radius * 0.5, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) }),
      withTiming(radius * 0.5, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);

  useEffect(() => {
    scale.value = withTiming(isTyping ? 1.4 : 1.0, { duration: 1000 });
  }, [isTyping]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value * speedMultiplier.value }, 
      { translateY: ty.value * speedMultiplier.value }, 
      { scale: scale.value }
    ],
    backgroundColor: activeColor.value,
  }));

  return <Animated.View style={[styles.blob, style]} />;
};

const NeuralNebula = ({ baseColor, isTyping, isSynthesizing }: { baseColor: string, isTyping: boolean, isSynthesizing: boolean }) => {
  const colorValue = useSharedValue(baseColor);
  const speedMultiplier = useSharedValue(1);

  useEffect(() => {
    colorValue.value = withTiming(baseColor, { duration: 1000 });
  }, [baseColor]);

  useEffect(() => {
    speedMultiplier.value = withTiming(isSynthesizing ? 1.8 : (isTyping ? 1.2 : 1.0), { duration: 800 });
  }, [isSynthesizing, isTyping]);

  return (
    <View style={styles.nebulaRoot} pointerEvents="none">
      <NebulaBlob activeColor={colorValue} radius={60} duration={6000} isTyping={isTyping} speedMultiplier={speedMultiplier} />
      <NebulaBlob activeColor={colorValue} radius={90} duration={8000} isTyping={isTyping} speedMultiplier={speedMultiplier} />
      <NebulaBlob activeColor={colorValue} radius={40} duration={5000} isTyping={isTyping} speedMultiplier={speedMultiplier} />
    </View>
  );
};

// --- Memory Echo View (Spectral Ghost) ---
const MemoryEcho = ({ note, theme }: { note: Note | null, theme: 'light' | 'dark' }) => {
  if (!note) return null;
  const isDark = theme === 'dark';
  
  return (
    <Animated.View 
      entering={FadeIn.duration(1000)} 
      exiting={withTiming(0, { duration: 500 }) as any}
      style={styles.echoContainer}
    >
      <Text style={[styles.echoLabel, { color: NightTheme.accent }]}>MEMORY ECHO</Text>
      <Text 
        style={[styles.echoContent, { color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]} 
        numberOfLines={2}
      >
        "{note.content}"
      </Text>
    </Animated.View>
  );
};

// --- Soft Predictive Hint (Interactive) ---
const SoftHint = ({ label, onPress, theme }: { label: string, onPress: () => void, theme: 'dark' | 'light' }) => {
  const isDark = theme === 'dark';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.hintPill}>
       <Text style={[styles.hintPillText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
          [{label}?]
       </Text>
    </TouchableOpacity>
  );
};

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [predictedCategory, setPredictedCategory] = useState<NoteCategory>('Journal');
  const [predictionStatus, setPredictionStatus] = useState<'flux' | 'anchored'>('flux');
  const [emotionHint, setEmotionHint] = useState('');
  const [isTypingSync, setIsTypingSync] = useState(false);
  const [resonantNote, setResonantNote] = useState<Note | null>(null);
  const [showSmartAction, setShowSmartAction] = useState(false);
  const [lastActionNode, setLastActionNode] = useState<{ id: string, category: string } | null>(null);
  
  const notes = useNotesStore(state => state.notes);
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';

  const inputRef = useRef<TextInput>(null);
  
  // --- Proactive Logic Refs ---
  const lastStrideWordCount = useRef(0);
  const lastStrideTime = useRef(0);

  // --- Scored Heuristic Engine (Semantic Root Mode) ---
  const predictLocal = useCallback((text: string): NoteCategory => {
    const low = text.toLowerCase();
    if (!low.trim()) return 'Journal';

    let bestCategory: NoteCategory = 'Journal';
    let highestScore = 0;

    for (const [cat, patterns] of Object.entries(SEMANTIC_INTENTS)) {
      let score = 0;
      patterns.forEach(pattern => {
        const matches = low.match(pattern);
        if (matches) score += matches.length;
      });

      if (score > highestScore) {
        highestScore = score;
        bestCategory = cat as NoteCategory;
      }
    }

    return bestCategory;
  }, []);

  const runPredictionAI = async (text: string) => {
    setIsTypingSync(true);
    try {
      const result = await extractRealtime(text);
      if (result && result.category) {
        setPredictedCategory(result.category);
        setEmotionHint(result.emotion || '');
        setPredictionStatus('anchored');
      }
    } catch (err) {}
    setIsTypingSync(false);
  };

  useEffect(() => {
    const currentLocal = predictLocal(inputText);
    setPredictedCategory(currentLocal);
    setPredictionStatus('flux');

    const words = inputText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // --- PROACTIVE STRIDE TRIGGER ---
    // If user adds 5 words and hasn't triggered AI in 2+ seconds
    const timeSinceLastStride = Date.now() - lastStrideTime.current;
    if (wordCount >= 4 && (wordCount - lastStrideWordCount.current >= 4) && timeSinceLastStride > 2000) {
      lastStrideWordCount.current = wordCount;
      lastStrideTime.current = Date.now();
      runPredictionAI(inputText);
    }

    // --- MEMORY RESONANCE ---
    const resonance = null;
    setResonantNote(resonance);

    // --- PAUSE TRIGGER ---
    if (inputText.length < 3) return;
    const timeoutId = setTimeout(() => {
      runPredictionAI(inputText);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [inputText, predictLocal, notes]);

  useFocusEffect(
    useCallback(() => {
      return () => Keyboard.dismiss();
    }, [])
  );

  const handleCapture = useCallback(() => {
    if (!inputText.trim()) return;
    const noteId = Crypto.randomUUID();
    const currentCategory = predictedCategory;

    addNote({
      id: noteId,
      content: inputText,
      created_at: Date.now(),
      source_type: 'text',
      is_refining: true,
      entities_json: JSON.stringify({ 
        category: currentCategory, 
        emotion: emotionHint || 'Neutral',
        clusterId: -1,
        resonances: { [currentCategory]: 1.0 }
      }),
    });

    extractDeep(inputText).then(aiResult => {
      updateNote(noteId, { is_refining: false, entities_json: JSON.stringify({ ...(aiResult || {}), clusterId: -1 }) });
    }).catch(() => updateNote(noteId, { is_refining: false }));
    
    setLastActionNode({ id: noteId, category: currentCategory });
    setShowSmartAction(true);
    setTimeout(() => {
      setShowSmartAction(false);
    }, 4000);

    setInputText('');
    // router.push('/'); // Remove immediate redirect to allow post-capture action
  }, [inputText, predictedCategory, emotionHint]);

  const handleSmartAction = () => {
    if (!lastActionNode) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(e){}
    Alert.alert("Sentient Action", `Synthesizing ${lastActionNode.category} with your active threads.`);
    setShowSmartAction(false);
    router.push('/');
  };

  const handleSkipRefinement = () => {
    setPredictionStatus('anchored');
    setEmotionHint('Direct Capture');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
  };

  const ribbonColor = CATEGORY_COLORS[predictedCategory] || '#8E44AD';
  const isFlux = predictionStatus === 'flux';
  const labelText = inputText.trim().length > 0 
    ? (isTypingSync ? 'AI SYNTHESIZING...' : (isFlux ? `${predictedCategory.toUpperCase()}?` : predictedCategory.toUpperCase())) 
    : 'WAITING FOR THOUGHT';

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={[styles.container, { backgroundColor: isDark ? NightTheme.background : '#FFFFFF' }]}>
        <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={undefined}>
          
          <NeuralNebula baseColor={ribbonColor} isTyping={inputText.length > 0} isSynthesizing={isTypingSync} />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[...Array(PARTICLE_COUNT)].map((_, i) => <Particle key={i} index={i} />)}
          </View>

          <View style={[styles.inner, { paddingTop: insets.top + 20 }]}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.headerRow}>
              <View>
                <Text style={[styles.headerTitle, { color: isDark ? NightTheme.textPrimary : '#111111' }]}>DRIFT LENS</Text>
                <Text style={styles.headerSubtitle}>NEURAL INTENT STREAM</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.commitButton, { backgroundColor: inputText.trim().length > 0 ? (isDark ? NightTheme.accent : '#8E44AD') : (isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5') }]} 
                  onPress={handleCapture}
                  disabled={inputText.trim().length === 0}
                >
                  <Text style={[styles.commitButtonText, { color: inputText.trim().length > 0 ? '#FFFFFF' : (isDark ? NightTheme.textMuted : '#BBBBBB') }]}>COMMIT</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
                  <Text style={[styles.closeButtonText, { color: isDark ? NightTheme.textPrimary : '#111111' }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.hubWrapper}>
              <View style={styles.predictionBadge}>
                <View style={[styles.badgeLine, { backgroundColor: isFlux ? (isDark ? '#333' : '#EEEEEE') : ribbonColor }]} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.categoryLabel, { color: inputText.trim().length > 0 ? (isFlux ? (isDark ? '#777' : '#888') : ribbonColor) : '#BBBBBB' }]}>
                    {labelText}
                  </Text>
                  {isFlux && inputText.length > 10 && (
                    <SoftHint label="SKIP AI" onPress={handleSkipRefinement} theme={theme} />
                  )}
                </View>
                <View style={[styles.badgeLine, { backgroundColor: isFlux ? (isDark ? '#333' : '#EEEEEE') : ribbonColor }]} />
              </View>
            </View>

            <View style={styles.content}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: isDark ? NightTheme.textPrimary : '#111111' }]}
                placeholder="What's your mind drifting to?"
                placeholderTextColor={isDark ? 'rgba(232, 230, 224, 0.4)' : "#999999"}
                multiline
                value={inputText}
                onChangeText={setInputText}
                textAlign="center"
                selectionColor={isDark ? NightTheme.accent : "#8E44AD"}
                editable={!showSmartAction}
              />
              
              <MemoryEcho note={resonantNote} theme={theme} />
            </View>

            {showSmartAction ? (
              <Animated.View 
                entering={FadeInDown.springify()} 
                style={styles.smartActionContainer}
              >
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <TouchableOpacity onPress={handleSmartAction} style={[styles.smartActionButton, { backgroundColor: isDark ? NightTheme.accent : '#8E44AD' }]}>
                   <Ionicons name="sparkles" size={16} color="#FFF" />
                   <Text style={styles.smartActionText}>SYNTHESIZE THIS {lastActionNode?.category.toUpperCase()}</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.delay(400)} style={styles.footerHint}>
                <Text style={[styles.hintText, { color: isDark ? '#A29BFE' : '#8E44AD' }]}>
                  {isTypingSync ? 'DETECTING RESONANCE...' : (predictionStatus === 'anchored' && emotionHint ? `${emotionHint.toUpperCase()} ENERGY DETECTED` : 'ZENITH COORDINATE ENGINE ACTIVE')}
                </Text>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, zIndex: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4, 
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 21, fontWeight: '300', letterSpacing: 3, textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 9, fontWeight: '700', color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 3, marginTop: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commitButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  commitButtonText: { fontWeight: '700', fontSize: 10, letterSpacing: 1.5 },
  closeButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, fontWeight: '300' },
  hubWrapper: { alignItems: 'center', marginTop: 32, marginBottom: 8 },
  predictionBadge: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeLine: { height: 1, width: 20 },
  categoryLabel: { fontSize: 9, letterSpacing: 2.0, textTransform: 'uppercase', fontWeight: '700' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 120 },
  input: {
    fontSize: 28, fontWeight: '300', lineHeight: 42,
    width: '100%', minHeight: 200, paddingBottom: 100,
  },
  footerHint: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 8, fontWeight: '700', letterSpacing: 2, opacity: 0.6, textAlign: 'center' },
  nebulaRoot: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  blob: {
    width: 380,
    height: 380,
    borderRadius: 190,
    position: 'absolute',
    opacity: 0.1,
  },
  particle: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#8E44AD',
  },
  echoContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  echoLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
    opacity: 0.6,
  },
  echoContent: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '300',
  },
  hintPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hintPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  smartActionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 1000,
  },
  smartActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  smartActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  }
});
