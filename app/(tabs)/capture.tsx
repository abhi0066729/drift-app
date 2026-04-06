import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withTiming, useSharedValue, withRepeat } from 'react-native-reanimated';
import { extractRealtime, extractDeep, NoteCategory } from '@/services/ai';
import { LinearGradient } from 'expo-linear-gradient';
import { NightTheme } from '@/constants/theme';

const CATEGORY_COLORS: Record<NoteCategory | string, string> = {
  Journal: '#8E44AD', 
  Study: '#5B8C5A',
  Idea: '#111111',
  Todo: '#4A90E2',
  Dream: '#8E44AD',
  Research: '#3E5C76',
  Quote: '#D4AF37',
  Meeting: '#5A5A5A',
  Reflection: '#8E44AD',
  Creative: '#E74C3C',
};

function predictLocal(text: string): NoteCategory | null {
  const low = text.toLowerCase().trim();
  if (low.startsWith('- [ ]') || low.startsWith('[]') || low.startsWith('v ') || low.startsWith('check ') || low.includes('todo')) return 'Todo';
  if (low.startsWith('idea:') || low.startsWith('bulb:') || low.includes('idea')) return 'Idea';
  if (low.startsWith('dream:') || low.startsWith('last night')) return 'Dream';
  if (low.startsWith('study:') || low.startsWith('research:') || low.includes('read')) return 'Study';
  if (low === 'i' || low === 'my' || low === 'today' || low.includes('feeling')) return 'Journal';
  return 'Journal'; // Default to Journal for local flux
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [predictedCategory, setPredictedCategory] = useState<string>('Journal');
  const [predictionStatus, setPredictionStatus] = useState<'flux' | 'anchored'>('flux');
  const [emotionHint, setEmotionHint] = useState('');
  const [isTypingSync, setIsTypingSync] = useState(false);
  
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);
  const theme = useNotesStore(state => state.theme);

  const pulseOpacity = useSharedValue(0.1);

  useEffect(() => {
    if (isTypingSync) {
      pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = withTiming(0.1, { duration: 400 });
    }
  }, [isTypingSync]);

  useEffect(() => {
    // 1. Instantly predict local top resonances
    const local = predictLocal(inputText);
    if (local) {
      setPredictedCategory(local);
    }
    
    // Always fall back to flux state while typing
    setPredictionStatus('flux');

    if (inputText.length < 3) return;
    
    // 2. Token-saving buffer
    let delay = 3000;
    const lastChar = inputText.trim().slice(-1);
    if (['.', '!', '?', '\n'].includes(lastChar)) {
      delay = 800; // Punctuation pause
    }

    const timeoutId = setTimeout(async () => {
      setIsTypingSync(true);
      try {
        const result = await extractRealtime(inputText);
        if (result && result.category) {
          setPredictedCategory(result.category);
          setEmotionHint(result.emotion || '');
          setPredictionStatus('anchored');
        }
      } catch (err) {
        console.warn('Realtime prediction failed:', err);
      }
      setIsTypingSync(false);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1 + pulseOpacity.value * 0.5 }]
  }));

  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );

  const handleCapture = useCallback(() => {
    if (!inputText.trim()) return;

    const noteId = Crypto.randomUUID();
    const currentText = inputText;

    addNote({
      id: noteId,
      content: currentText,
      created_at: Date.now(),
      source_type: 'text',
      is_refining: true,
      entities_json: JSON.stringify({ 
        category: predictedCategory, 
        emotion: emotionHint || 'Neutral',
        clusterId: -1,
        resonances: { [predictedCategory]: 1.0 }
      }),
    });

    extractDeep(currentText).then(aiResult => {
      if (aiResult) {
        updateNote(noteId, {
          is_refining: false,
          entities_json: JSON.stringify({ ...aiResult, clusterId: -1 })
        });
      } else {
        updateNote(noteId, { is_refining: false });
      }
    }).catch(() => {
      updateNote(noteId, { is_refining: false });
    });

    setInputText('');
    router.push('/');
  }, [inputText, predictedCategory, emotionHint]);

  const ribbonColor = CATEGORY_COLORS[predictedCategory] || '#8E44AD';
  
  const isFlux = predictionStatus === 'flux';
  const labelText = inputText.length > 0 ? (isTypingSync ? 'AI SYNTHESIZING...' : (isFlux ? `${predictedCategory}?` : predictedCategory.toUpperCase())) : 'WAITING FOR THOUGHT';

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inner, { paddingTop: insets.top + 20 }]}>
          
          {/* Dual-Layer Aura */}
          <Animated.View style={[styles.auraContainer, auraStyle]}>
            {isFlux ? (
               <LinearGradient
                  colors={[ribbonColor, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.auraFlux}
               />
            ) : (
               <View style={[styles.auraAnchored, { backgroundColor: ribbonColor }]} />
            )}
          </Animated.View>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
              <Text style={[styles.backButtonText, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>✕</Text>
            </TouchableOpacity>

            <View style={styles.semanticHub}>
              <Text style={styles.captureTitle}>Zenith Capture</Text>
              
              <View style={[
                styles.predictionBadge, 
                { 
                  borderColor: isFlux ? '#CCCCCC' : ribbonColor,
                  borderStyle: isFlux ? 'dashed' : 'solid',
                  backgroundColor: isFlux ? 'transparent' : `${ribbonColor}11`
                }
              ]}>
                <Text style={[
                  styles.categoryLabel, 
                  { 
                    color: inputText.length > 0 ? (isFlux ? '#666666' : ribbonColor) : '#BBBBBB',
                    fontStyle: isFlux && inputText.length > 0 ? 'italic' : 'normal',
                    fontWeight: isFlux ? '400' : '700'
                  }
                ]}>
                  {labelText}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.commitButton, { backgroundColor: inputText.trim().length > 0 ? (theme === 'dark' ? NightTheme.accent : '#8E44AD') : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F5F5F5') }]} 
              onPress={handleCapture}
              disabled={inputText.trim().length === 0}
            >
              <Text style={[styles.commitButtonText, { color: inputText.trim().length > 0 ? '#FFFFFF' : (theme === 'dark' ? NightTheme.textMuted : '#BBBBBB') }]}>Commit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}
              placeholder="What's your mind drifting to?"
              placeholderTextColor={theme === 'dark' ? NightTheme.textMuted : "#E0E0E0"}
              multiline
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
              selectionColor={theme === 'dark' ? NightTheme.accent : "#8E44AD"}
            />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.footerHint}>
            <View style={[styles.hintContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
              <Text style={[styles.hintText, { color: theme === 'dark' ? NightTheme.accent : '#8E44AD' }]}>
                {isTypingSync ? 'AI SYNTHESIZING...' : (predictionStatus === 'anchored' && emotionHint ? `${emotionHint.toUpperCase()} ENERGY DETECTED \u2728` : 'ZENITH COORDINATE ENGINE READY')}
              </Text>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1 },
  auraContainer: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 400,
    height: 400,
    borderRadius: 200,
    zIndex: -1,
  },
  auraFlux: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
    opacity: 0.2, // 50/50 aura split feeling via gradient
  },
  auraAnchored: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
    opacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center', alignItems: 'center',
  },
  backButtonText: { fontSize: 14, color: '#111111', fontWeight: '300' },
  semanticHub: { alignItems: 'center', flex: 1 },
  captureTitle: { fontSize: 12, fontWeight: '300', color: '#BBBBBB', letterSpacing: 1.2, marginBottom: 8 },
  predictionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 9, letterSpacing: 2.0 },
  commitButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18,
  },
  commitButtonText: {
    fontWeight: '700', fontSize: 10,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  content: { flex: 1, paddingHorizontal: 32 },
  input: {
    fontSize: 24, fontWeight: '300', lineHeight: 36,
    color: '#111111', marginTop: 40, minHeight: 300,
  },
  footerHint: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  hintContainer: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F9F9F9' },
  hintText: { fontSize: 8, color: '#8E44AD', fontWeight: '700', letterSpacing: 1.5 },
});
