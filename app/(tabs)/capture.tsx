import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withTiming, useSharedValue, withRepeat } from 'react-native-reanimated';
import { extractRealtime, extractDeep, NoteCategory } from '@/services/ai';

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  Journal: '#8E44AD', 
  Study: '#5B8C5A',
  Idea: '#111111',
  Todo: '#4A90E2', // Changed Todo to a distinct blue for better contrast
  Dream: '#8E44AD',
  Research: '#3E5C76',
  Quote: '#D4AF37',
  Meeting: '#5A5A5A',
  Reflection: '#8E44AD',
  Creative: '#E74C3C',
};

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

  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isTypingSync) {
      pulseOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [isTypingSync]);

  useEffect(() => {
    const local = predictLocal(inputText);
    if (local) setPredictedCategory(local);

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
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1 + pulseOpacity.value * 0.1 }]
  }));

  const inputRef = React.useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      // Manual focus only - removed auto-focus timer
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
        clusterId: -1 
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

  const ribbonColor = CATEGORY_COLORS[predictedCategory];

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inner, { paddingTop: insets.top + 20 }]}>
          {/* Pulsating AI Aura */}
          <Animated.View style={[styles.aura, auraStyle]} />

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.semanticHub}>
              <Text style={styles.captureTitle}>Zenith Capture</Text>
              <Text style={[styles.categoryLabel, { color: inputText.length > 0 ? ribbonColor : '#BBBBBB' }]}>
                {inputText.length > 0 ? (isTypingSync ? 'SYNTHESIZING...' : predictedCategory.toUpperCase()) : 'WAITING FOR THOUGHT'}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.commitButton, { backgroundColor: inputText.trim().length > 0 ? '#8E44AD' : '#F5F5F5' }]} 
              onPress={handleCapture}
              disabled={inputText.trim().length === 0}
            >
              <Text style={[styles.commitButtonText, { color: inputText.trim().length > 0 ? '#FFFFFF' : '#BBBBBB' }]}>Commit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="What's your mind drifting to?"
              placeholderTextColor="#E0E0E0"
              multiline
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
              selectionColor="#8E44AD"
            />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.footerHint}>
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                {isTypingSync ? 'AI SYNTHESIZING...' : (emotionHint ? `${emotionHint.toUpperCase()} ENERGY DETECTED` : 'ZENITH COORDINATE ENGINE READY')}
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
  aura: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8E44AD05', // Extremely subtle purple aura
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
  captureTitle: { fontSize: 12, fontWeight: '300', color: '#BBBBBB', letterSpacing: 1.2, marginBottom: 2 },
  categoryLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.0 },
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
