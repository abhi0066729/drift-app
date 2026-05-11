import React from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, useColorScheme
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

interface SplashProps {
  phase: 'checking' | 'consent' | 'downloading' | 'loading';
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
}

export const BrandedSplashScreen = ({ onConsent }: SplashProps) => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const C = {
    bg: dark ? '#000' : '#F2F2F2',
    fg: dark ? '#fff' : '#000',
    cardBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    cardBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    textOpacity: 0.7,
    btnBg: dark ? '#fff' : '#000',
    btnText: dark ? '#000' : '#fff',
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Background decoration */}
      <View style={styles.backgroundDecor}>
        <Text style={[styles.driftText, { color: C.fg, opacity: 0.1 }]}>D R I F T</Text>
      </View>

      <View style={styles.overlayContainer}>
        {/* HARDCODED POPUP - NO CONDITIONALS */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
          <Text style={[styles.modalTitle, { color: C.fg }]}>AWAKEN THE PALACE</Text>
          <Text style={[styles.modalBody, { color: C.fg, opacity: 0.6 }]}>
            Drift needs to download AI models (~800MB) to enable offline intelligence.
          </Text>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.actionButton, { backgroundColor: C.btnBg }]} 
            onPress={() => onConsent?.()}
          >
            <Text style={[styles.actionButtonText, { color: C.btnText }]}>DOWNLOAD MODELS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundDecor: {
    position: 'absolute',
    top: '40%',
    width: '100%',
    alignItems: 'center',
  },
  driftText: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 20,
  },
  overlayContainer: {
    width: '100%',
    paddingHorizontal: 30,
    position: 'absolute',
    bottom: 100,
  },
  card: {
    width: '100%',
    padding: 30,
    borderRadius: 30,
    borderWidth: 1,
    backdropFilter: 'blur(20px)', // For web, but shows intent
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 2,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
  },
  actionButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  actionButtonText: {
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 13,
  },
});
