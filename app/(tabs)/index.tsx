import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, TextInput, Platform, useWindowDimensions, Image } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotesStore } from '@/store/useNotesStore';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import UserModeMap from '@/components/UserModeMap';
import ReadingModal from '@/components/ReadingModal';

const LIGHT_BG = require('../../assets/images/light_bg.png');
const DARK_BG = require('../../assets/images/dark_bg.png');

// List of scrollable filter chips
const FILTER_CHIPS = ['All', 'Notes', 'Media', 'Audio', 'Docs', 'Maps'];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const theme = useNotesStore(state => state.theme);
  const toggleTheme = useNotesStore(state => state.toggleTheme);
  const [activeFilter, setActiveFilter] = useState('All');
  const [readingNode, setReadingNode] = useState<any>(null);
  
  // Safe dimension evaluation inside function body (avoids startup file-scope zero-evaluation)
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

  // Project Space Switcher State
  const [projects, setProjects] = useState<string[]>(['My Space', 'Visual Moodboard', 'Core Space']);
  const [activeProject, setActiveProject] = useState<string>('My Space');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState<boolean>(false);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      setProjects([...projects, newProjectName.trim()]);
      setActiveProject(newProjectName.trim());
      setNewProjectName('');
      setShowProjectDropdown(false);
    }
  };
  
  // Custom texture Ken Burns breathing loop and filament pulse animation
  const bgAnimation = useSharedValue(0);
  const filamentGlow = useSharedValue(0.4);

  useEffect(() => {
    // Smooth 25s texture breathing cycle (scale and subtle pan loop)
    bgAnimation.value = withRepeat(
      withTiming(1, { duration: 25000, easing: Easing.bezier(0.33, 1, 0.68, 1) }),
      -1,
      true
    );
    // Glowing threads pulse cycle (3.2s breathing filament loop)
    filamentGlow.value = withRepeat(
      withTiming(0.85, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animBgStyle = useAnimatedStyle(() => {
    const scale = 1.0 + bgAnimation.value * 0.04; // Base zoom
    const translateX = Math.sin(bgAnimation.value * Math.PI) * 12; // Base pan X
    const translateY = Math.cos(bgAnimation.value * Math.PI) * 6; // Base pan Y
    const rotate = `${Math.sin(bgAnimation.value * Math.PI) * 1.2}deg`; // Base rotate
    return {
      transform: [
        { scale },
        { translateX },
        { translateY },
        { rotate }
      ]
    };
  });

  const animBgOverlayStyle = useAnimatedStyle(() => {
    const t = bgAnimation.value;
    const scale = 1.05 - t * 0.035; // Counter zoom
    const translateX = Math.cos(t * Math.PI) * -10; // Counter pan X
    const translateY = Math.sin(t * Math.PI) * -5; // Counter pan Y
    const rotate = `${Math.cos(t * Math.PI) * -1.8}deg`; // Counter rotate
    return {
      transform: [
        { scale },
        { translateX },
        { translateY },
        { rotate }
      ],
      opacity: 0.36
    };
  });

  const animFilamentStyle = useAnimatedStyle(() => ({
    opacity: filamentGlow.value
  }));

  const handleNodePress = (node: any) => {
    setReadingNode(node);
  };

  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#09090A' : '#FAF9F6' }]}>
      
      {/* Viewport-Fixed Custom Background with refraction morphing overlay */}
      {windowWidth > 0 && windowHeight > 0 && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* Base Background Image Layer */}
          <Animated.View style={[StyleSheet.absoluteFillObject, animBgStyle]}>
            <Image
              source={isDark ? DARK_BG : LIGHT_BG}
              style={styles.bgImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {/* Refraction Warp Overlap Layer */}
          <Animated.View style={[StyleSheet.absoluteFillObject, animBgOverlayStyle]}>
            <Image
              source={isDark ? DARK_BG : LIGHT_BG}
              style={styles.bgImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Synchronized glowing filaments overlay (follows image gold ribbons) */}
          <Animated.View style={[StyleSheet.absoluteFillObject, animFilamentStyle]} pointerEvents="none">
            <Svg width={windowWidth} height={windowHeight} style={StyleSheet.absoluteFillObject}>
              {/* Volumetric Glowing Ribbon 1 (Center nexus/vortex swipe) */}
              <Path 
                d={`M ${windowWidth * 0.85} -30 Q ${windowWidth * 0.3} ${windowHeight * 0.35} ${windowWidth * 0.55} ${windowHeight * 0.5} T ${windowWidth * 0.15} ${windowHeight * 1.08}`}
                stroke={isDark ? '#E8673C' : '#FF8F6B'}
                strokeWidth={9.0}
                fill="none"
                opacity={0.16}
              />
              <Path 
                d={`M ${windowWidth * 0.85} -30 Q ${windowWidth * 0.3} ${windowHeight * 0.35} ${windowWidth * 0.55} ${windowHeight * 0.5} T ${windowWidth * 0.15} ${windowHeight * 1.08}`}
                stroke={isDark ? '#E8673C' : '#E8673C'}
                strokeWidth={4.2}
                fill="none"
                opacity={0.38}
              />
              <Path 
                d={`M ${windowWidth * 0.85} -30 Q ${windowWidth * 0.3} ${windowHeight * 0.35} ${windowWidth * 0.55} ${windowHeight * 0.5} T ${windowWidth * 0.15} ${windowHeight * 1.08}`}
                stroke={isDark ? '#FF9A76' : '#FF8F6B'}
                strokeWidth={1.5}
                fill="none"
                opacity={0.78}
              />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* Spatial 2D Infinite Canvas */}
      <View style={styles.canvasContainer}>
        <UserModeMap 
          onNodePress={handleNodePress}
          theme={theme}
        />
      </View>

      {/* Top Header: Project name, switcher chevron, settings, moon button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerLeft} onPress={() => setShowProjectDropdown(!showProjectDropdown)}>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>{activeProject}</Text>
          <Ionicons 
            name={showProjectDropdown ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={isDark ? '#FFFFFF' : '#1A1A1A'} 
            style={styles.chevron} 
          />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerBtn}>
            <Ionicons name="search" size={20} color={isDark ? '#E0E0E0' : '#4A4A4A'} />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={toggleTheme}>
            <Ionicons name={theme === 'dark' ? "sunny-outline" : "moon-outline"} size={20} color={isDark ? '#E0E0E0' : '#4A4A4A'} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        </View>
      </View>

      {/* Project Switcher Dropdown Modal */}
      {showProjectDropdown && (
        <View style={[styles.dropdownContainer, { top: insets.top + 55 }]}>
          <BlurView experimentalBlurMethod="dimezisBlurView" intensity={40} style={StyleSheet.absoluteFillObject} tint="dark" />
          <View style={[styles.cardBorderOverlay, { borderRadius: 18, borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1 }]} pointerEvents="none" />
          <View style={styles.dropdownInner}>
            <Text style={styles.dropdownSectionTitle}>Your Spaces</Text>
            {projects.length === 0 ? (
              <Text style={styles.dropdownEmptyText}>No projects found. Create one below!</Text>
            ) : (
              <ScrollView style={styles.projectList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {projects.map((proj, idx) => (
                  <Pressable 
                    key={idx} 
                    style={[styles.projectItem, activeProject === proj && styles.projectItemActive]}
                    onPress={() => {
                      setActiveProject(proj);
                      setShowProjectDropdown(false);
                    }}
                  >
                    <Ionicons name="folder-outline" size={14} color={activeProject === proj ? '#E8673C' : '#A3A3A3'} style={{ marginRight: 10 }} />
                    <Text style={[styles.projectItemText, activeProject === proj && styles.projectItemTextActive]}>{proj}</Text>
                    {activeProject === proj && <Ionicons name="checkmark" size={16} color="#E8673C" style={{ marginLeft: 'auto' }} />}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.dropdownDivider} />
            <View style={styles.createProjectRow}>
              <TextInput
                style={styles.projectInput}
                placeholder="New Space name..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={newProjectName}
                onChangeText={setNewProjectName}
              />
              <Pressable style={styles.createBtn} onPress={handleCreateProject}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Premium Dock Menu (Dock-style, compact pill, vertical separators) */}
      <View style={[styles.kineticDock, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.dockInner}>
          <BlurView experimentalBlurMethod="dimezisBlurView" intensity={40} style={StyleSheet.absoluteFillObject} tint="dark" />
          <View style={[styles.cardBorderOverlay, { borderRadius: 32, borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1 }]} pointerEvents="none" />
          
          <View style={styles.dockItems}>
            <Pressable style={styles.dockItem}>
              <Ionicons name="camera-outline" size={18} color="#8E8E93" />
            </Pressable>
            <View style={styles.dockDivider} />
            <Pressable style={styles.dockItem}>
              {/* Custom orange glowing active tab wrapper */}
              <View style={styles.activeDockGlow}>
                <ExpoLinearGradient
                  colors={['#FF8F6B', '#E8673C', '#B83F1B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeGradientRing}
                >
                  <View style={styles.activeGradientIcon}>
                    <Ionicons name="grid" size={15} color="#FFFFFF" />
                  </View>
                </ExpoLinearGradient>
              </View>
            </Pressable>
            <View style={styles.dockDivider} />
            <Pressable style={styles.dockItemFAB}>
              <View style={styles.dockFAB}>
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </View>
            </Pressable>
            <View style={styles.dockDivider} />
            <Pressable style={styles.dockItem}>
              <Ionicons name="folder-open-outline" size={18} color="#8E8E93" />
            </Pressable>
            <View style={styles.dockDivider} />
            <Pressable style={styles.dockItem}>
              <Ionicons name="person-outline" size={18} color="#8E8E93" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Detail Reading view */}
      {readingNode && (
        <ReadingModal 
          node={readingNode} 
          searchQuery=""
          onClose={() => setReadingNode(null)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  
  // Dock menu styles
  kineticDock: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 1000,
  },
  dockInner: {
    width: 290,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dockItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  dockItem: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeDockGlow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    overflow: 'hidden',
  },
  activeGradientRing: {
    flex: 1,
    padding: 1.2,
    borderRadius: 8,
  },
  activeGradientIcon: {
    flex: 1,
    backgroundColor: '#0C0C0E',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockItemFAB: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockFAB: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8673C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8673C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  chevron: {
    marginLeft: 6,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    padding: 6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDCDB0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 103, 60, 0.2)',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8673C',
  },
  // Project Switcher Dropdown Modal
  dropdownContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 18,
    zIndex: 9999,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  dropdownInner: {
    padding: 16,
    backgroundColor: 'rgba(15, 15, 18, 0.45)',
  },
  dropdownSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginVertical: 12,
  },
  projectList: {
    maxHeight: 160,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  projectItemActive: {
    backgroundColor: 'rgba(232, 103, 60, 0.15)',
  },
  projectItemText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  projectItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  createProjectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  projectInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
  },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8673C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    flex: 1,
    zIndex: 10,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    borderWidth: 1,
  },
  // Background Blobs
  blob: {
    position: 'absolute',
    borderRadius: 300,
    opacity: 0.35,
  },
  blobPeach: {
    top: 60,
    right: -120,
    width: 480,
    height: 480,
    backgroundColor: '#FFA87D', // Vibrant premium sunset orange-peach
  },
  blobLavender: {
    bottom: 80,
    left: -140,
    width: 400,
    height: 400,
    backgroundColor: '#FFE5A3', // Vibrant golden-amber sun glow
  },
});
