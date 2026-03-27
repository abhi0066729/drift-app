import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';

type NoteType = 'Idea' | 'Todo' | 'Journal' | 'Study';

function predictCategory(text: string): NoteType {
  const low = text.toLowerCase();
  if (/\b(buy|do|call|send|need|must|finish|task|at|o'clock|meeting)\b/.test(low)) return 'Todo';
  if (/^(\[ \]|- \[ \])/.test(low)) return 'Todo';
  if (/\b(felt|feeling|today|was|morning|evening|night|thought|i am|actually)\b/.test(low)) return 'Journal';
  if (low.length > 100 && /\b(i|me|my)\b/.test(low)) return 'Journal';
  if (/\b(research|learn|article|book|theory|fact|note)\b/.test(low)) return 'Study';
  return 'Idea';
}

const CATEGORY_COLORS: Record<NoteType, string> = {
  Idea: '#111111',
  Todo: '#C45C2A',
  Journal: '#4A6FA5',
  Study: '#5B8C5A',
};

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const addNote = useNotesStore(state => state.addNote);

  const predictedCategory = useMemo(() => predictCategory(inputText), [inputText]);
  const ribbonColor = CATEGORY_COLORS[predictedCategory];

  const ribbonStyle = useAnimatedStyle(() => ({
    width: withTiming(inputText.length > 0 ? 120 : 0),
    backgroundColor: ribbonColor,
  }));

  const handleCapture = () => {
    if (!inputText.trim()) return;
    addNote({
      id: Crypto.randomUUID(),
      content: inputText,
      created_at: Date.now(),
      source_type: 'text',
      entities_json: JSON.stringify({ category: predictedCategory, clusterId: -1 }),
    });
    setInputText('');
    Keyboard.dismiss();
    router.push('/');
  };

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
              style={styles.input}
              placeholder="What's your mind drifting to?"
              placeholderTextColor="#D0D0D0"
              multiline
              autoFocus
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
              selectionColor="#111111"
            />
          </View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.footerHint}>
            <Text style={styles.hintText}>
              Zenith engine is classifying your thought as {predictedCategory.toLowerCase()}...
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
