import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react-native';
import { Note } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideOutLeft 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FlashcardCarouselProps {
  notes: Note[];
  category: string;
  color: string;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export default function FlashcardCarousel({ notes, category, color, onClose, theme }: FlashcardCarouselProps) {
  const [index, setIndex] = useState(0);
  const isDark = theme === 'dark';

  const nextCard = () => {
    if (index < notes.length - 1) setIndex(index + 1);
  };

  const prevCard = () => {
    if (index > 0) setIndex(index - 1);
  };

  const currentNote = notes[index];

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView intensity={isDark ? 50 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </BlurView>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.tag, { backgroundColor: color + '20' }]}>
               <Text style={[styles.tagText, { color }]}>{category.toUpperCase()}</Text>
            </View>
            <Text style={[styles.progress, { color: isDark ? NightTheme.textSecondary : '#666' }]}>{index + 1} / {notes.length}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
               <X size={24} color={isDark ? NightTheme.textPrimary : '#111'} />
            </Pressable>
          </View>

          <Animated.View 
            key={index}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={[styles.card, { backgroundColor: isDark ? '#1A1814' : '#FFFFFF', borderColor: color }]}
          >
            <View style={styles.cardHeader}>
               <Sparkles size={16} color={color} />
               <Text style={styles.cardHint}>SYNTHESIS FRAGMENT</Text>
            </View>
            
            <View style={styles.cardBody}>
               <Text style={[styles.noteText, { color: isDark ? NightTheme.textPrimary : '#111' }]}>{currentNote.content}</Text>
            </View>

            <View style={styles.cardFooter}>
               <Text style={styles.date}>{new Date(currentNote.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          </Animated.View>

          <View style={styles.controls}>
            <Pressable 
                onPress={prevCard} 
                style={[styles.navBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                disabled={index === 0}
            >
              <ChevronLeft size={32} color={isDark ? NightTheme.textPrimary : '#111'} />
            </Pressable>
            
            <Pressable 
                onPress={nextCard} 
                style={[styles.navBtn, { opacity: index === notes.length - 1 ? 0.3 : 1 }]}
                disabled={index === notes.length - 1}
            >
              <ChevronRight size={32} color={isDark ? NightTheme.textPrimary : '#111'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  card: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.55,
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 32,
    justifyContent: 'space-between',
    ...NightTheme.shadowLarge,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHint: {
    fontSize: 10,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 2,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '300',
    textAlign: 'center',
  },
  cardFooter: {
    alignItems: 'center',
  },
  date: {
    fontSize: 10,
    color: '#95A5A6',
    fontWeight: '700',
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  navBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});
