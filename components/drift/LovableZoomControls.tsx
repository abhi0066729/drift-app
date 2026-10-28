import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

interface LovableZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  bottomOffset?: number;
}

export function LovableZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  bottomOffset = 24,
}: LovableZoomControlsProps) {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <Pressable onPress={onZoomOut} style={styles.button}>
        <Minus size={15} color="#2F2E36" />
      </Pressable>

      <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>

      <Pressable onPress={onZoomIn} style={styles.button}>
        <Plus size={15} color="#2F2E36" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 200,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    width: 44,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#2F2E36',
  },
});
