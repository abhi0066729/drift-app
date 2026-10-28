import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotesStore } from '@/store/useNotesStore';
import { ChevronLeft, Zap, Terminal, Sparkles, Layers } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function BulkSynthesisDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appId = useSettingsStore(state => state.app_id);
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);

  const [bulkInput, setBulkInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkCommit = async () => {
    if (!bulkInput.trim()) return;

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
    setIsProcessing(true);
    
    // Split by double newline or semicolon
    const segments = bulkInput
      .split(/\n\n|;/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    if (segments.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Capture Batch Start
    segments.forEach((content, i) => {
      const noteId = Date.now().toString() + i;
      const newNote = {
        id: noteId,
        content,
        created_at: Date.now() - (i * 1000),
        source_type: 'text' as const,
        is_refining: true,
        category: 'Journal',
        emotion: 'Neutral',
        embedding_status: 'pending' as const,
        synthesis_status: 'pending' as const,
        is_deleted: false,
      };
      
      addNote(newNote as any);

      setTimeout(() => {
        let category = 'Journal';
        if (content.includes('?')) category = 'Idea';
        if (content.length < 30) category = 'Todo';

        updateNote(noteId, {
          is_refining: false,
          entities_json: JSON.stringify({ category })
        });
      }, 2000 + (i * 300));
    });

    setBulkInput('');
    setIsProcessing(false);
    
    Alert.alert(
      "Synthesis Initialized", 
      `${segments.length} thoughts are being integrated into your spatial map.`,
      [{ text: "Go to Map", onPress: () => router.push('/') }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#08080A' : '#F5F5F7' }]}>
      {/* Background Ambient Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={isDark ? ['rgba(142,68,173,0.18)', 'rgba(142,68,173,0.02)', 'transparent'] : ['rgba(142,68,173,0.1)', 'rgba(142,68,173,0.02)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={isDark ? '#FFF' : '#111'} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconGlow}>
            <Terminal size={16} color="#A29BFE" />
          </View>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111111' }]}>
            SYNTHESIS CONSOLE
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Sparkles size={12} color="#8E44AD" />
          <Text style={styles.headerBadgeText}>AI 2.0</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Liquid Glass Identity Card */}
        <View style={[styles.glassCard, styles.identityCard, { shadowColor: isDark ? '#000' : '#8E44AD' }]}>
          <BlurView
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            intensity={isDark ? 50 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={isDark ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.2)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={[styles.cardBorderOverlay, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />

          <View style={styles.identityRow}>
            <View style={styles.identityIconBox}>
              <Layers size={16} color="#8E44AD" />
            </View>
            <View>
              <Text style={styles.label}>INSTANCE IDENTITY</Text>
              <Text style={[styles.appId, { color: isDark ? '#A29BFE' : '#8E44AD' }]}>{appId || 'INITIALIZING...'}</Text>
            </View>
          </View>
        </View>

        {/* Input & Action Section */}
        <View style={styles.inputSection}>
          <Text style={[styles.instruction, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
            Paste multiple thoughts below separated by double newlines or semicolons. The neural engine will automatically synthesize, tag, and position them on your 2D map.
          </Text>
          
          <View style={[styles.glassCard, styles.textAreaCard]}>
            <BlurView
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
              intensity={isDark ? 40 : 75}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.cardBorderOverlay, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)' }]} pointerEvents="none" />

            <TextInput
              style={[styles.textArea, { color: isDark ? '#FFFFFF' : '#111111' }]}
              multiline
              placeholder="I love the way these nodes pulse in 3D space; Need to build the infinite canvas tomorrow; What if time was a spatial dimension?"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
              value={bulkInput}
              onChangeText={setBulkInput}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            style={[styles.commitButton, isProcessing && { opacity: 0.6 }]} 
            onPress={handleBulkCommit}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#A29BFE', '#8E44AD', '#6C5CE7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Zap size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.commitText}>
              {isProcessing ? 'SYNTHESIZING THOUGHTS...' : 'INITIALIZE BATCH SYNTHESIS'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlowContainer: {
    ...StyleSheet.absoluteFillObject,
    height: 380,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  backButton: { 
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIconGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(142,68,173,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(142,68,173,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(142,68,173,0.3)',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E44AD',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  identityCard: {
    padding: 18,
    marginBottom: 24,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(142,68,173,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  label: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: 'rgba(142,68,173,0.9)', 
    letterSpacing: 1.5, 
    marginBottom: 4 
  },
  appId: { 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  inputSection: { flex: 1 },
  instruction: { 
    fontSize: 13, 
    lineHeight: 20, 
    marginBottom: 16,
    fontWeight: '400' 
  },
  textAreaCard: {
    height: 260,
    marginBottom: 24,
    padding: 16,
  },
  textArea: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  commitButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  commitText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
