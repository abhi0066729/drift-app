import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.header}>People</Text>
      
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>As you capture notes with names, Drift will organize them here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1a1814',
    marginBottom: 24,
    fontFamily: 'serif',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#7a756b',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});
