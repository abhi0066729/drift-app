# Drift Version Log (V-LOG)

This log tracks every production build (OTA) pushed during this development cycle.

---

## [v37] - Revert to Excellence
**Date**: 2026-05-11  
**Status**: ACTIVE  
**Files Modified**: 
- `components/BrandedSplashScreen.tsx`: Reverted to v33 code.

**Changes**:
- Completely restored the v33 "Proper" splash screen as requested.
- Locked the design to prevent further experimental regressions.

---

## [v36] - Splash Revert (Attempt 1)
**Status**: SUPERSEDED  
**Files Modified**: 
- `components/BrandedSplashScreen.tsx`

**Changes**:
- Attempted to revert to a historical version of the splash screen.

---

## [v35] - Refined Void Zoom (Experimental)
**Status**: SUPERSEDED  
**Files Modified**: 
- `components/BrandedSplashScreen.tsx`

**Changes**:
- Refined the "Triple Layer" explosion with a right-offset zoom into the black void.
- Added individual particle scattering for all nodes.

---

## [v34] - Triple Layer Reveal (Experimental)
**Status**: SUPERSEDED  
**Files Modified**: 
- `components/BrandedSplashScreen.tsx`

**Changes**:
- Implemented the SVG icon explosion from `icon animation.html`.

---

## [v33] - Cinematic Polish & Header Revert
**Status**: STABLE (Base for v37)  
**Files Modified**: 
- `app/(tabs)/index.tsx`: Reverted header title style and subtext.
- `app/_layout.tsx`: Increased splash screen lead-in delay to 5 seconds.
- `components/BrandedSplashScreen.tsx`: Added 20+ witty/poetic loading messages.

**Changes**:
- Restored "QUANTUM THOUGHT FIELD" subtext styling.
- Extended the splash screen duration to allow for "star-field" appreciation.
- Added witty messages (e.g., "Brewing neural espresso...") to loading sequence.

---

## [v32] - Stability & Crash Fix
**Status**: CRITICAL FIX  
**Files Modified**: 
- `app/(tabs)/capture.tsx`: Added missing `FadeOut` import.
- `app/(tabs)/index.tsx`: Added missing `Easing`, `withRepeat`, and `withSequence` imports.

**Changes**:
- Resolved the "Crash on Commit" issue caused by missing reanimated imports.
- Restored functionality to the Neural Heartbeat pulse.

---

## [v31] - Neural Heartbeat & Instant Tap
**Status**: FEATURE  
**Files Modified**: 
- `components/NexusSurfaceMatrix.tsx`: Removed gesture conflict (Exclusive -> Simultaneous).
- `app/(tabs)/index.tsx`: Integrated `NeuralHeartbeat` indicator.

**Changes**:
- Added visual "Neural Heartbeat" pulse (Purple for standby, Green for thinking).
- Optimized Nexus tap response time (instant tap vs. waiting for double/triple tap).
- Forced Nexus taps to strictly open the Reading Modal.

---

## [v30] - Nexus Tap & Party Popper
**Status**: FEATURE  
**Files Modified**: 
- `app/(tabs)/notes.tsx`: Added missing `NoteService` import for deletions.
- `components/NexusSurfaceMatrix.tsx`: Changed tap type from 'dot' to 'text'.
- `app/(tabs)/capture.tsx`: Replaced system alert with Green Success Pill.

**Changes**:
- Fixed the bug where Nexus taps would accidentally open Focus Mode.
- Implemented the "Party Popper" feedback upon note commitment.
- Restored Chronicle deletion persistence by fixing service import.

---

## [v29] - Persistence & Synthesis Overhaul
**Status**: CORE  
**Files Modified**: 
- `app/(tabs)/notes.tsx`: Switched to `NoteService.deleteNote` for DB persistence.
- `services/SyncService.ts`: Added legacy synthesis node cleanup.
- `app/(tabs)/capture.tsx`: Synchronized `is_refining` state to eliminate flicker.

**Changes**:
- Ensured deleted notes are permanently removed from SQLite database.
- Implemented in-place synthesis to stop the creation of redundant metadata nodes.
