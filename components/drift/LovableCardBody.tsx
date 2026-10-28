import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { Play, Pause, MapPin, Mic, Type, Image as ImageIcon, CheckSquare } from 'lucide-react-native';
import Svg, { Path, Line, Rect, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

export type CardType = 'text' | 'image' | 'audio' | 'map' | 'todo';

export interface LovableNote {
  id: string;
  type: CardType;
  x: number;
  y: number;
  title: string;
  body?: string;
  img?: 'lake' | 'vase';
  stack?: string;
  board?: string;
}

const LOCAL_IMAGES = {
  lake: require('@/assets/images/lake.jpg'),
  vase: require('@/assets/images/vase.jpg'),
};

export const CARD_WIDTH = 250;

export function CardTag({ type }: { type: CardType }) {
  const meta = {
    text: { icon: Type, label: 'Note', tint: '#D4A373' },
    image: { icon: ImageIcon, label: 'Image', tint: '#FF7F66' },
    audio: { icon: Mic, label: 'Voice', tint: '#2F2E36' },
    map: { icon: MapPin, label: 'Place', tint: '#48BFE3' },
    todo: { icon: CheckSquare, label: 'List', tint: '#E786D7' },
  }[type];

  const Icon = meta.icon;

  return (
    <View style={styles.tagRow}>
      <Icon size={12} color={meta.tint} />
      <Text style={[styles.tagText, { color: meta.tint }]}>{meta.label}</Text>
    </View>
  );
}

export function LovableCardBody({
  note,
  onToggleTodo,
}: {
  note: LovableNote;
  onToggleTodo?: (index: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [doneIndexes, setDoneIndexes] = useState<number[]>([0]);

  const toggleTodo = (idx: number) => {
    setDoneIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
    if (onToggleTodo) onToggleTodo(idx);
  };

  // 1. IMAGE CARD
  if (note.type === 'image') {
    const imgSrc = note.img && LOCAL_IMAGES[note.img] ? LOCAL_IMAGES[note.img] : LOCAL_IMAGES.lake;
    return (
      <View style={styles.imageCardContainer}>
        <Image source={imgSrc} style={styles.cardImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(15, 20, 18, 0.4)', 'rgba(12, 18, 15, 0.85)']}
          locations={[0.2, 0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.photoCaption}>
          <Text style={styles.photoTitle}>{note.title}</Text>
          <Text style={styles.photoSub}>Image notes</Text>
        </View>
      </View>
    );
  }

  // 2. AUDIO / VOICE CARD
  if (note.type === 'audio') {
    return (
      <LinearGradient
        colors={['rgba(215, 238, 245, 0.95)', 'rgba(255, 245, 220, 0.95)', 'rgba(235, 215, 245, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.paddedCard}
      >
        <View style={styles.headerBetween}>
          <CardTag type="audio" />
          <Text style={styles.timeMuted}>0:42</Text>
        </View>

        <Text style={styles.dotTitleAudio}>{note.title}</Text>

        <View style={styles.waveRow}>
          <Pressable
            style={styles.playButton}
            onPress={() => setPlaying(!playing)}
          >
            {playing ? (
              <Pause size={14} color="#FFFFFF" />
            ) : (
              <Play size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
            )}
          </Pressable>

          <View style={styles.waveBarContainer}>
            {Array.from({ length: 24 }).map((_, i) => {
              const baseHeight = 8 + Math.abs(Math.sin(i * 1.7)) * 24;
              return (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: baseHeight,
                      opacity: playing ? 0.95 : 0.65,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={[styles.headerBetween, { marginTop: 14 }]}>
          <Text style={styles.audioMetaLabel}>Voice memo</Text>
          <Mic size={12} color="rgba(47, 46, 54, 0.6)" />
        </View>
      </LinearGradient>
    );
  }

  // 3. MAP / PLACE CARD
  if (note.type === 'map') {
    return (
      <View style={[styles.mapContainer, { backgroundColor: 'rgba(255, 255, 255, 0.65)' }]}>
        <View style={styles.mapSvgWrapper}>
          <Svg viewBox="0 0 240 135" style={StyleSheet.absoluteFillObject}>
            <Path
              d="M0 100 C60 80 90 120 240 70"
              fill="none"
              stroke="#64DFDF"
              strokeWidth="14"
              opacity={0.4}
            />
            {[20, 60, 100, 140, 180, 220].map((x) => (
              <Line
                key={x}
                x1={x}
                y1="0"
                x2={x - 30}
                y2="135"
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth="1.5"
              />
            ))}
            {[30, 70, 110].map((y) => (
              <Line
                key={y}
                x1="0"
                y1={y}
                x2="240"
                y2={y - 20}
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth="1.5"
              />
            ))}
            <Rect x="140" y="20" width="50" height="34" rx="6" fill="rgba(100, 223, 223, 0.25)" />
            <Circle cx="120" cy="62" r="7" fill="#FF7F66" />
            <Circle cx="120" cy="62" r="5" fill="#FF7F66" stroke="#FFFFFF" strokeWidth="2" />
          </Svg>
        </View>

        <View style={styles.mapInfo}>
          <CardTag type="map" />
          <Text style={styles.mapTitle}>{note.title}</Text>
          {note.body && <Text style={styles.mapBody}>{note.body}</Text>}
        </View>
      </View>
    );
  }

  // 4. TODO / LIST CARD (Dark Theme card matching Lovable)
  if (note.type === 'todo') {
    const items = (note.body || '').split('|');
    return (
      <LinearGradient
        colors={['#1E2322', '#22292E', '#2A202E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.paddedCard}
      >
        <CardTag type="todo" />
        <Text style={styles.dotTitleTodo}>{note.title}</Text>
        <View style={styles.todoList}>
          {items.map((it, i) => {
            const on = doneIndexes.includes(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleTodo(i)}
                style={[
                  styles.todoRow,
                  { backgroundColor: on ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.12)' },
                ]}
              >
                <View style={[styles.todoCheck, on && styles.todoCheckOn]}>
                  {on && <Text style={styles.todoCheckMark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.todoText,
                    on && { opacity: 0.5, textDecorationLine: 'line-through' },
                  ]}
                >
                  {it}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    );
  }

  // 5. TEXT NOTE CARD (Pastel sunrise gradient wash)
  return (
    <LinearGradient
      colors={['rgba(225, 245, 240, 0.95)', 'rgba(255, 248, 230, 0.95)', 'rgba(240, 225, 245, 0.95)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.paddedCard}
    >
      <CardTag type="text" />
      <Text style={styles.dotTitleText}>{note.title}</Text>
      <Text style={styles.textBody}>{note.body}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  paddedCard: {
    padding: 18,
    width: CARD_WIDTH,
    borderRadius: 22,
  },
  headerBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  timeMuted: {
    fontSize: 10,
    color: 'rgba(47, 46, 54, 0.5)',
    fontWeight: '500',
  },
  dotTitleAudio: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#2F2E36',
    marginTop: 10,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dotTitleTodo: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#F4F2EB',
    marginTop: 10,
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dotTitleText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#2F2E36',
    marginTop: 12,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textBody: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(47, 46, 54, 0.75)',
    fontWeight: '400',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2F2E36',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveBarContainer: {
    flex: 1,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#2F2E36',
  },
  audioMetaLabel: {
    fontSize: 11,
    color: 'rgba(47, 46, 54, 0.6)',
  },
  imageCardContainer: {
    width: CARD_WIDTH,
    height: 285,
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  photoCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  photoTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  photoSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  mapContainer: {
    width: CARD_WIDTH,
    padding: 10,
    borderRadius: 22,
  },
  mapSvgWrapper: {
    height: 135,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    overflow: 'hidden',
  },
  mapInfo: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#2F2E36',
    marginTop: 4,
  },
  mapBody: {
    fontSize: 11,
    color: 'rgba(47, 46, 54, 0.6)',
    marginTop: 2,
  },
  todoList: {
    gap: 6,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  todoCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoCheckOn: {
    borderColor: '#E786D7',
    backgroundColor: '#E786D7',
  },
  todoCheckMark: {
    fontSize: 10,
    color: '#1E2322',
    fontWeight: '800',
    lineHeight: 12,
  },
  todoText: {
    fontSize: 12,
    color: '#F4F2EB',
    fontWeight: '400',
  },
});
