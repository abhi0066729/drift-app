import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { extractRealtime, extractDeep, NoteCategory } from '@/services/ai';

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  Journal: '#4A6FA5',
  Study: '#5B8C5A',
  Idea: '#111111',
  Todo: '#C45C2A',
  Dream: '#704A81',
  Research: '#3E5C76',
  Quote: '#D4AF37',
  Meeting: '#5A5A5A',
  Reflection: '#808080',
  Creative: '#E74C3C',
};

// LOCAL QUICK-HINT (Zero Latency)
function predictLocal(text: string): NoteCategory | null {
  const low = text.toLowerCase().trim();
  if (low.startsWith('- [ ]') || low.startsWith('[]') || low.startsWith('v ') || low.startsWith('check ')) return 'Todo';
  if (low.startsWith('idea:') || low.startsWith('bulb:')) return 'Idea';
  if (low.startsWith('dream:') || low.startsWith('last night')) return 'Dream';
  if (low.startsWith('study:') || low.startsWith('research:')) return 'Study';
  if (low === 'i' || low === 'my' || low === 'today') return 'Journal';
  return null;
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [predictedCategory, setPredictedCategory] = useState<NoteCategory>('Journal');
  const [emotionHint, setEmotionHint] = useState('');
  const [isTypingSync, setIsTypingSync] = useState(false);
  
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);

  // REAL-TIME DEBOUNCED AI (Fast 3B Model)
  useEffect(() => {
    // 1. INSTANT LOCAL HINT
    const local = predictLocal(inputText);
    if (local) {
      setPredictedCategory(local);
    }

    // 2. DEBOUNCED AI HINT
    if (inputText.length < 3) return;
    
    const timeoutId = setTimeout(async () => {
      setIsTypingSync(true);
      try {
        const result = await extractRealtime(inputText);
        if (result && result.category) {
          setPredictedCategory(result.category);
          setEmotionHint(result.emotion);
        }
      } catch (err) {
        console.warn('Realtime prediction failed:', err);
      }
      setIsTypingSync(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  const ribbonColor = CATEGORY_COLORS[predictedCategory];

  const ribbonStyle = useAnimatedStyle(() => ({
    width: withTiming(inputText.length > 0 ? 120 : 0),
    backgroundColor: ribbonColor,
  }));

  const inputRef = React.useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      // Ensure keyboard is dismissed and input is blurred when entering
      Keyboard.dismiss();
      inputRef.current?.blur();
      return () => {
        // Clean up on blur
        Keyboard.dismiss();
      };
    }, [])
  );

  const handleCapture = useCallback(() => {
    if (!inputText.trim()) return;

    const noteId = Crypto.randomUUID();
    const currentText = inputText;

    // 1. INSTANT COMMIT (No Wait)
    addNote({
      id: noteId,
      content: currentText,
      created_at: Date.now(),
      source_type: 'text',
      is_refining: true, // Signal that 70B is working
      entities_json: JSON.stringify({ 
        category: predictedCategory, 
        emotion: emotionHint || 'Neutral',
        clusterId: -1 
      }),
    });

    // 2. BACKGROUND ENRICHMENT (70B Model)
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
    inputRef.current?.blur();
    Keyboard.dismiss();
    router.push('/');
  }, [inputText, predictedCategory, emotionHint]);

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inner, { paddingTop: insets.top + 20 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.semanticHub}>
              <Animated.Text
                style={[styles.categoryLabel, { color: inputText.length > 0 ? ribbonColor : '#BBBBBB' }]}
              >
                {inputText.length > 0 ? predictedCategory.toUpperCase() : 'CAPTURE'}
              </Animated.Text>
              <Animated.View style={[styles.semanticRibbon, ribbonStyle]} />
            </View>

            <TouchableOpacity
              style={[styles.commitButton, { opacity: inputText.trim().length > 0 ? 1 : 0.3 }]}
              onPress={handleCapture}
              disabled={inputText.trim().length === 0}
            >
              <Text style={styles.commitButtonText}>Commit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="What's your mind drifting to?"
              placeholderTextColor="#D0D0D0"
              multiline
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
              selectionColor="#111111"
            />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.footerHint}>
            <Text style={styles.hintText}>
              {isTypingSync ? 'AI Sensing...' : (emotionHint ? `Feeling ${emotionHint.toLowerCase()} — ${predictedCategory.toLowerCase()}` : 'Thinking with Zenith engine...')}
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center', alignItems: 'center',
  },
  backButtonText: { fontSize: 16, color: '#111111', fontWeight: '400' },
  semanticHub: { alignItems: 'center', flex: 1 },
  categoryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.0, marginBottom: 4 },
  semanticRibbon: { height: 2, borderRadius: 1 },
  commitButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30,
  },
  commitButtonText: {
    color: '#FFFFFF', fontWeight: '700', fontSize: 11,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  content: { flex: 1, paddingHorizontal: 32 },
  input: {
    fontSize: 28, fontWeight: '300', lineHeight: 40,
    color: '#111111', marginTop: 20, minHeight: 300,
  },
  footerHint: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  hintText: { fontSize: 12, color: '#BBBBBB', fontWeight: '300', letterSpacing: 0.5 },
});
