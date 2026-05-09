import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useNotesStore, Note } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const InsightCard = ({ item, notes }: { item: Note, notes: Note[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';

  // Extract parent notes (children) from entities_json
  const parentIds = item.entities_json ? JSON.parse(item.entities_json).children || [] : [];
  const parentNotes = notes.filter(n => parentIds.includes(n.id));

  return (
    <Animated.View 
      layout={Layout.springify()}
      entering={FadeInDown.springify()}
      style={styles.cardContainer}
    >
      <BlurView intensity={isDark ? 20 : 10} tint={isDark ? "dark" : "light"} style={styles.cardBlur}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles" size={16} color="#F1C40F" />
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>

        <Text style={[styles.insightText, { color: isDark ? '#EEE' : '#111' }]}>
          {item.content}
        </Text>

        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.ancestryToggle}
        >
          <Text style={styles.ancestryToggleText}>
            {isExpanded ? 'HIDE ANCESTRY' : `VIEW ${parentNotes.length} ANCHORS`}
          </Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#888" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.parentContainer}>
            {parentNotes.map((pn, idx) => (
              <View key={pn.id} style={styles.parentItem}>
                <View style={styles.parentBullet} />
                <Text style={styles.parentContent}>{pn.content}</Text>
              </View>
            ))}
          </View>
        )}
      </BlurView>
    </Animated.View>
  );
};

export default function WisdomJournal() {
  const notes = useNotesStore(state => state.notes);
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';

  const insights = notes.filter(n => n.source_type === 'synthesis');

  return (
    <View style={[styles.container, { backgroundColor: isDark ? NightTheme.background : '#FFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>Wisdom Journal</Text>
        <Text style={styles.subtitle}>Evolved insights from your galaxy</Text>
      </View>

      <FlatList
        data={insights}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <InsightCard item={item} notes={notes} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="infinite-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No insights have evolved yet.</Text>
            <Text style={styles.emptySub}>Synthesize your thoughts in the Capture tab to grow this journal.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardBlur: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 20,
    lineHeight: 30,
    fontFamily: 'Inter', // We would use a serif font here if imported
    fontWeight: '300',
    fontStyle: 'italic',
  },
  ancestryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  ancestryToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888',
    letterSpacing: 1.5,
  },
  parentContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  parentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  parentBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1C40F',
    marginTop: 10,
  },
  parentContent: {
    fontSize: 14,
    color: '#999',
    lineHeight: 22,
    flex: 1,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  }
});
