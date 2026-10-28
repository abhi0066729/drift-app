import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Folder, FolderPlus, Copy, Layers, Trash2, X } from 'lucide-react-native';
import { LovableNote, CARD_WIDTH, LovableCardBody } from './LovableCardBody';

interface LovableFocusModalProps {
  note: LovableNote | null;
  boards: string[];
  onClose: () => void;
  onMoveToBoard: (noteId: string, boardName: string) => void;
  onCreateBoard: (boardName: string) => void;
  onDuplicate: (note: LovableNote) => void;
  onRemoveFromStack: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

export function LovableFocusModal({
  note,
  boards,
  onClose,
  onMoveToBoard,
  onCreateBoard,
  onDuplicate,
  onRemoveFromStack,
  onDelete,
}: LovableFocusModalProps) {
  const [newBoardName, setNewBoardName] = useState('');

  if (!note) return null;

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      onCreateBoard(newBoardName.trim());
      onMoveToBoard(note.id, newBoardName.trim());
      setNewBoardName('');
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!note}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 25}
          tint="light"
          style={StyleSheet.absoluteFillObject}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.contentWrap}>
          {/* Card Presentation */}
          <View style={styles.cardPreviewWrap}>
            <View style={styles.cardFrame}>
              <LovableCardBody note={note} />
            </View>
          </View>

          {/* Action Popover Sheet */}
          <View style={styles.actionSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>MOODBOARDS</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={16} color="#2F2E36" />
              </Pressable>
            </View>

            {boards.length === 0 ? (
              <Text style={styles.emptyBoardsText}>
                No moodboards yet — create one.
              </Text>
            ) : (
              <View style={styles.boardsList}>
                {boards.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => onMoveToBoard(note.id, b)}
                    style={styles.sheetActionItem}
                  >
                    <Folder size={14} color="#2F2E36" />
                    <Text style={styles.sheetActionLabel}>Move to {b}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Create Moodboard Input */}
            <View style={styles.inputRow}>
              <FolderPlus size={16} color="#2F2E36" />
              <TextInput
                style={styles.input}
                placeholder="Create moodboard…"
                placeholderTextColor="rgba(47, 46, 54, 0.4)"
                value={newBoardName}
                onChangeText={setNewBoardName}
                onSubmitEditing={handleCreateBoard}
                returnKeyType="done"
              />
              {newBoardName.trim().length > 0 && (
                <Pressable onPress={handleCreateBoard} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.divider} />

            {/* Standard Actions */}
            <Pressable
              onPress={() => onDuplicate(note)}
              style={styles.sheetActionItem}
            >
              <Copy size={14} color="#2F2E36" />
              <Text style={styles.sheetActionLabel}>Duplicate</Text>
            </Pressable>

            {note.stack && (
              <Pressable
                onPress={() => onRemoveFromStack(note.id)}
                style={styles.sheetActionItem}
              >
                <Layers size={14} color="#2F2E36" />
                <Text style={styles.sheetActionLabel}>Remove from stack</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => onDelete(note.id)}
              style={[styles.sheetActionItem, styles.dangerItem]}
            >
              <Trash2 size={14} color="#E63946" />
              <Text style={[styles.sheetActionLabel, styles.dangerText]}>
                Delete note
              </Text>
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
    padding: 24,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  cardPreviewWrap: {
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  cardFrame: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
  },
  actionSheet: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(47, 46, 54, 0.5)',
  },
  closeBtn: {
    padding: 4,
  },
  emptyBoardsText: {
    fontSize: 12,
    color: 'rgba(47, 46, 54, 0.5)',
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  boardsList: {
    marginBottom: 8,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sheetActionLabel: {
    fontSize: 13,
    color: '#2F2E36',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(47, 46, 54, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#2F2E36',
    padding: 0,
  },
  addBtn: {
    backgroundColor: '#2F2E36',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(47, 46, 54, 0.08)',
    marginVertical: 8,
  },
  dangerItem: {},
  dangerText: {
    color: '#E63946',
  },
});
