import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHomeScreenController } from '@/hooks/useHomeScreenController';
import { AmbientMeshBackground } from '@/components/AmbientMeshBackground';
import { LovableHeader } from '@/components/drift/LovableHeader';
import { LovableCanvasView } from '@/components/drift/LovableCanvasView';
import { LovableListView } from '@/components/drift/LovableListView';
import { LovableFocusModal } from '@/components/drift/LovableFocusModal';
import { LovableZoomControls } from '@/components/drift/LovableZoomControls';

/**
 * TodayScreen (Home Entry)
 * Pure compositional layer / root coordinator.
 * Zero business logic or embedded helper functions.
 */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const {
    notes,
    setNotes,
    boards,
    zoom,
    mode,
    focusedNote,
    handleZoomIn,
    handleZoomOut,
    handleToggleCanvasList,
    handleOpenFromList,
    handleCloseList,
    handleSelectNote,
    handleCloseFocus,
    handleMoveToBoard,
    handleCreateBoard,
    handleDuplicate,
    handleRemoveFromStack,
    handleDelete,
  } = useHomeScreenController();

  return (
    <View style={styles.container}>
      {/* 1. Atmospheric Canvas Wash & Waveforms */}
      <AmbientMeshBackground />

      {/* 2. Top Header HUD */}
      <View style={[styles.headerContainer, { top: insets.top + 8 }]} pointerEvents="box-none">
        <LovableHeader
          notesCount={notes.length}
          onPressAllNotes={handleToggleCanvasList}
        />
      </View>

      {/* 3. Spatial Infinite Canvas */}
      <LovableCanvasView
        notes={notes}
        zoom={zoom}
        onSelectNote={handleSelectNote}
        onDoubleTapCanvas={handleToggleCanvasList}
        onNotesChange={setNotes}
      />

      {/* 4. Zoom Controls HUD */}
      <LovableZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        bottomOffset={24 + insets.bottom}
      />

      {/* 5. List View Overlay */}
      {mode === 'list' && (
        <LovableListView
          notes={notes}
          onOpen={handleOpenFromList}
          onClose={handleCloseList}
        />
      )}

      {/* 6. Focus Inspector & Moodboard Modal */}
      <LovableFocusModal
        note={focusedNote}
        boards={boards}
        onClose={handleCloseFocus}
        onMoveToBoard={handleMoveToBoard}
        onCreateBoard={handleCreateBoard}
        onDuplicate={handleDuplicate}
        onRemoveFromStack={handleRemoveFromStack}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D9D5E1',
  },
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
