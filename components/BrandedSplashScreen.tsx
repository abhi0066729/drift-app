import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

const { width, height } = Dimensions.get('window');

const LOGO_NODES = [
  { x: width * 0.32, y: height * 0.45 },
  { x: width * 0.41, y: height * 0.47 },
  { x: width * 0.50, y: height * 0.45 },
  { x: width * 0.59, y: height * 0.45 },
  { x: width * 0.68, y: height * 0.45 },
];

interface SplashProps {
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
  needsConsent?: boolean;
}

export const BrandedSplashScreen = ({ status, progress = 0, speed, onConsent, needsConsent }: SplashProps) => {
  return (
    <View style={styles.container}>
      {/* RAW NEBULA */}
      <View style={styles.nebulaContainer}>
        {[...Array(12)].map((_, i) => (
          <View key={i} style={[styles.constellationNode, { 
            left: Math.random() * width, 
            top: Math.random() * height,
            width: 4 + Math.random() * 8,
            height: 4 + Math.random() * 8,
            backgroundColor: i % 2 === 0 ? '#3498DB' : '#8E44AD'
          }]} />
        ))}
      </View>

      {/* CORE LOGO (No Skia, No Animations) */}
      <View style={styles.logoRoot}>
        {LOGO_NODES.map((node, i) => (
          <View key={i} style={[styles.blackNode, { left: node.x - 10, top: node.y - 10 }]} />
        ))}
        {/* Simple connecting line using a generic View */}
        <View style={{
          position: 'absolute',
          top: height * 0.45,
          left: width * 0.32,
          width: width * 0.36,
          height: 2,
          backgroundColor: 'rgba(0,0,0,0.15)',
          zIndex: 1
        }} />
        <View style={styles.textContainer}>
          <Text style={styles.driftText}>D R I F T</Text>
        </View>
      </View>

      {/* UNBREAKABLE OVERLAY */}
      <View style={styles.overlayContainer}>
        {needsConsent ? (
          <View style={styles.rawCard}>
            <Text style={styles.modalTitle}>AWAKEN THE PALACE [Base OTA Test]</Text>
            <Text style={styles.modalBody}>
              To enable offline intelligence, Drift needs to synchronize its neural grid (~600MB).
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={onConsent} activeOpacity={0.7}>
              <Text style={styles.actionButtonText}>INITIALIZE SYNC</Text>
            </TouchableOpacity>
          </View>
        ) : status ? (
          <View style={styles.dashboardAnchor}>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>{status.toUpperCase()}</Text>
              {speed && <Text style={styles.speedLabel}>{speed}</Text>}
            </View>
            <View style={styles.progressTrack}>
               <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.percentageText}>{Math.round(progress * 100)}% COMPLETE</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  logoRoot: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  blackNode: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'black', zIndex: 10 },
  textContainer: { position: 'absolute', top: height * 0.45 + 50, width: '100%', alignItems: 'center' },
  driftText: { fontSize: 13, fontWeight: '300', color: 'black', letterSpacing: 14, opacity: 0.8 },
  nebulaContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  constellationNode: { position: 'absolute', borderRadius: 10, opacity: 0.15 },
  overlayContainer: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', paddingHorizontal: 30, zIndex: 1000 },
  
  // UNBREAKABLE CARD STYLES
  rawCard: { 
    width: '100%', 
    backgroundColor: '#111', 
    padding: 30, 
    borderRadius: 30, 
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalTitle: { fontSize: 13, fontWeight: '900', color: 'white', marginBottom: 12, letterSpacing: 2.5 },
  modalBody: { fontSize: 14, color: '#AAA', lineHeight: 22, marginBottom: 25 },
  actionButton: { backgroundColor: 'white', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  actionButtonText: { color: 'black', fontWeight: '900', letterSpacing: 1.5, fontSize: 12 },
  
  dashboardAnchor: { width: '100%', alignItems: 'center' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  telemetryLabel: { fontSize: 9, fontWeight: '800', color: '#888', letterSpacing: 1.5 },
  speedLabel: { fontSize: 10, fontWeight: '900', color: 'black' },
  progressTrack: { width: '100%', height: 3, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F1C40F' },
  percentageText: { marginTop: 15, fontSize: 10, fontWeight: '900', color: '#BBB', letterSpacing: 2 },
});
