import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LovableNote, CardType, LovableCardBody } from './LovableCardBody';

const ORDER: { type: CardType; label: string }[] = [
  { type: 'text', label: 'Notes' },
  { type: 'image', label: 'Images' },
  { type: 'audio', label: 'Voice' },
  { type: 'map', label: 'Places' },
  { type: 'todo', label: 'Lists' },
];

interface LovableListViewProps {
  notes: LovableNote[];
  onOpen: (id: string) => void;
  onClose: () => void;
}

export function LovableListView({ notes, onOpen, onClose }: LovableListViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>All notes</Text>
          <Text style={styles.subtitle}>Double-tap or tap ✕ to drift back to canvas</Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color="#2F2E36" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ORDER.map(({ type, label }) => {
          const group = notes.filter((n) => n.type === type);
          if (group.length === 0) return null;

          return (
            <View key={type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{group.length}</Text>
                </View>
              </View>

              <View style={styles.cardsColumn}>
                {group.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => onOpen(n.id)}
                    style={styles.cardWrapper}
                  >
                    <LovableCardBody note={n} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(235, 232, 240, 0.94)',
    zIndex: 900,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2F2E36',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(47, 46, 54, 0.55)',
    marginTop: 4,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'rgba(47, 46, 54, 0.6)',
  },
  badge: {
    backgroundColor: '#2F2E36',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardsColumn: {
    gap: 14,
  },
  cardWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
});
