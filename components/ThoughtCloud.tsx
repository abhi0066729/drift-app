import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, FlatList, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { Person } from '@/utils/peopleUtils';
import { Note } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { Image } from 'expo-image';

const { height } = Dimensions.get('window');

interface ThoughtCloudProps {
  person: { name: string; mentionCount?: number; count?: number } | null;
  notes: Note[];
  onClose: () => void;
  theme: 'light' | 'dark';
}

export default function ThoughtCloud({ person, notes, onClose, theme }: ThoughtCloudProps) {
  if (!person) return null;

  const isDark = theme === 'dark';
  const avatarUrl = `https://boring-avatars-api.vercel.app/api/avatar?name=${encodeURIComponent(person.name)}&variant=beam`;

  return (
    <Modal
      animationType="slide" // More natural "rising" feel for a cloud
      transparent={true}
      visible={!!person}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.background} onPress={onClose} />
        <BlurView 
          intensity={isDark ? 40 : 65} // Softened for light mode premium feel
          tint={isDark ? 'dark' : 'light'} 
          style={[styles.contentContainer, { backgroundColor: isDark ? 'rgba(15, 14, 12, 0.8)' : 'rgba(255,255,255,0.7)' }]}
        >
          <View style={styles.header}>
            <View style={styles.avatarWrapper}>
              <Image 
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={500}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.name, { color: isDark ? NightTheme.textPrimary : '#111' }]}>{person.name}</Text>
              <Text style={styles.resonanceLabel}>{person.mentionCount ?? person.count ?? 0} SHARED RESONANCES</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={isDark ? NightTheme.textPrimary : '#111'} />
            </Pressable>
          </View>

          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.noteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]}>
                <Text style={[styles.noteText, { color: isDark ? NightTheme.textPrimary : '#333' }]}>
                  {item.content}
                </Text>
                <Text style={[styles.noteDate, { color: isDark ? NightTheme.textMuted : '#999' }]}>
                  {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentContainer: {
    height: height * 0.75,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      }
    })
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  resonanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E44AD',
    marginTop: 4,
    letterSpacing: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  noteCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '300',
  },
  noteDate: {
    fontSize: 10,
    marginTop: 12,
    textAlign: 'right',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

