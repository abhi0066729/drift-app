# DRIFT: Architecture Blueprint & Implementation Plan

> **Codename**: Drift  
> **Core Identity**: Local-First Spatial Second Brain & Associative Intelligence  
> **Target Audience for this Document**: Planner Agent, Engineering Agents & System Architects

---

## 1. Product Philosophy & Non-Negotiable Tenets

1. **Invisible Intelligence Over Visible AI**:
   - Zero chat dialogs, zero "AI generated" badges, zero confidence percentages.
   - The intelligence manifests organically through spatial positioning, physics, decay, and associative recall. The user must experience magic, not a tool interface.
2. **Zero Friction & Universal Multi-Modal Ingestion**:
   - The user must never be forced to categorize, tag, or assign folders upfront.
   - Accepts any human thought artifact: Instagram Reels, TikToks, URLs/articles, images, camera captures, handwritten OCR notes, PDFs, voice memos, and geo-tagged thoughts.
3. **Local-First, Zero-Latency, Offline-Default**:
   - All critical state, indices, relationships, and vectors reside on the device via `expo-sqlite`. Cloud synchronization (when added) acts strictly as an asynchronous background replication layer.
4. **Thermodynamic Canvas (Heat & Decay)**:
   - Notes are not frozen on a grid. Hot notes (frequent, newly added, or semantically resonant with current context) stay warm and stay within the active viewport. Cold notes gracefully cool, scale down, and drift outward into the canvas periphery.
5. **Architectural Purity**:
   - `app/(tabs)/index.tsx` is strictly a compositional canvas layout. Zero inline computations, zero inline business logic.
   - UI elements are modular "bricks" orchestrated via hooks, stores, and background services.

---

## 2. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION & GESTURES                         │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │     LovableHeader     │  │          LovableFocusModal             │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │      LovableCanvasView / LovableListView (Hybrid Spatial Mode)     │ │
│  │   - Virtualized Viewport Driver (R-Tree / 2D Chunk Pre-fetching)  │ │
│  │   - Card Node & Physical Stack System (Stack Gesture Collider)    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Hooks & State
┌───────────────────────────────────▼────────────────────────────────────┐
│                        CONTROLLER & STATE LAYER                        │
│  - useHomeScreenController (Coordinator Hook)                          │
│  - useCanvasCamera (Pan, Zoom, Velocity, Viewport Bounds)              │
│  - useNotesStore (Zustand Cache + Optimistic Updates)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Reactive Pipeline
┌───────────────────────────────────▼────────────────────────────────────┐
│                    INTELLIGENCE & BACKGROUND ENGINES                   │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐ │
│  │ Thermodynamic Heat & Physics  │   │ Associative Vector Memory     │ │
│  │ - Recency & Access Decay      │   │ - On-Device Vector Store      │ │
│  │ - Gravitational Drift Engine  │   │ - Casual/Conversational Search│ │
│  │ - Stack Affinity Clustering   │   │ - Active Concept Calibration  │ │
│  └───────────────────────────────┘   └───────────────────────────────┘ │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐ │
│  │ Universal Ingest & Extractor  │   │ Ghost Draft Synthesizer       │ │
│  │ - URL / OpenGraph Scraper     │   │ - Multi-Card Stack Summary    │ │
│  │ - On-Device Image OCR         │   │ - Ambient Unprompted Essence  │ │
│  │ - Audio Voice-to-Text Buffer  │   │ - Export / Copy Pipeline      │ │
│  └───────────────────────────────┘   └───────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Storage API
┌───────────────────────────────────▼────────────────────────────────────┐
│                   PERSISTENCE LAYER (expo-sqlite)                      │
│  - notes (id, type, raw_content, title, x, y, heat_score, stack_id...) │
│  - note_embeddings (note_id, dimensions, vector_blob, version)         │
│  - note_relations / stacks (stack_id, parent_id, affinity_weight)      │
│  - search_keywords / custom_concepts (concept, centroid_vector)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Engine Specifications

### 3.1. The Thermodynamic Heat Engine
Every note carries a dynamic energy score $H \in [0.0, 1.0]$:
$$H(t) = \alpha \cdot e^{-\lambda (t - t_{\text{created}})} + \beta \cdot e^{-\mu (t - t_{\text{accessed}})} + \gamma \cdot \text{Resonance}(v_{\text{note}}, v_{\text{viewport}})$$

- **$t_{\text{created}}$ & $t_{\text{accessed}}$**: Exponential decay over time.
- **$\text{Resonance}$**: Dot-product similarity between the note's embedding vector $v_{\text{note}}$ and the conceptual centroid of the current viewport $v_{\text{viewport}}$.
- **Visual Consequences**:
  - Hot notes ($H > 0.7$): Full opacity (1.0), normal scale (1.0), positioned inside the primary camera viewport.
  - Warm notes ($0.35 \le H \le 0.7$): Subtle atmospheric blending, slightly reduced elevation.
  - Cold notes ($H < 0.35$): 0.35 opacity, reduced scale (0.8x), drift radially away toward the perimeter, yielding room to current thoughts.

### 3.2. Viewport Virtualization & Predictive Pre-Fetching
Rendering hundreds of heavy media cards causes frame drops on mobile devices.
- **Spatial Partitioning**: The infinite canvas coordinate space is divided into discrete $600 \times 600$ pt grid cells.
- **Directional Velocity Projection**:
  - Let camera center be $(C_x, C_y)$ with velocity vector $(\vec{v}_x, \vec{v}_y)$.
  - The render window bounds are expanded by $1.5\times$ in the direction of $(\vec{v}_x, \vec{v}_y)$.
  - Any cell falling outside this predicted bounding polygon has its React Native nodes unmounted instantly, leaving only low-overhead spatial placeholder records.

### 3.3. Physical Stacking & Learned Affinity
- When the user drags Card $A$ within the collision radius $R_{\text{stack}}$ of Card $B$:
  - A subtle magnetic haptic trigger fires.
  - Cards collapse into a physical layered **Stack** entity.
  - **Implicit Learning**: The system captures this manual pairing and updates the semantic affinity matrix in SQLite, weighting future vector proximity between their clusters.

### 3.4. Associative Search & Active Concept Calibration
- Accepts arbitrary colloquial queries (e.g., *"birthday gift ideas"*, *"cozy winter vibes"*).
- The query is translated into a query vector $q$.
- **Hybrid Retrieval**: Combines SQLite full-text search (FTS5) with cosine similarity over vector blobs.
- **Active Calibration**:
  - If top cosine similarity falls below confidence threshold $\tau_{\text{confidence}}$, the app quietly prompts: *"Pick 2 or 3 thoughts that match this vibe"*.
  - When the user taps 2–3 cards, the engine updates/creates a `custom_concepts` entry, recalculates the concept centroid, and retroactively tags all matching historical cards.

### 3.5. Ghost Draft Synthesis
- Triggered invisibly whenever a Stack contains $\ge 2$ items or when a Moodboard is opened.
- Generates a concise, 2-line ambient distillation of the stack’s collective intent (without conversational filler or AI prompts).
- Rendered gracefully at the header of the Stack inspection modal.

---

## 4. SQLite Schema Design (`expo-sqlite`)

```sql
-- Core notes table supporting all ingestion modalities
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'url', 'image', 'audio', 'pdf', 'location')),
  title TEXT,
  raw_content TEXT,
  metadata TEXT, -- JSON: { urlMeta, ocrText, audioDuration, location: { lat, lng, name } }
  x REAL NOT NULL DEFAULT 0.0,
  y REAL NOT NULL DEFAULT 0.0,
  heat_score REAL NOT NULL DEFAULT 1.0,
  stack_id TEXT,
  board_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_spatial ON notes(x, y);
CREATE INDEX IF NOT EXISTS idx_notes_heat ON notes(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_notes_stack ON notes(stack_id);

-- Stacks table representing physical multi-card clusters
CREATE TABLE IF NOT EXISTS note_stacks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  ghost_draft TEXT,
  centroid_x REAL NOT NULL,
  centroid_y REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- On-device vector embeddings
CREATE TABLE IF NOT EXISTS note_embeddings (
  note_id TEXT PRIMARY KEY NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding BLOB NOT NULL, -- Float32Array packed binary
  model_version TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Custom calibrated concept vectors
CREATE TABLE IF NOT EXISTS custom_concepts (
  id TEXT PRIMARY KEY NOT NULL,
  keyword TEXT UNIQUE NOT NULL,
  centroid_embedding BLOB NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Full text search index
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  raw_content,
  content='notes',
  content_rowid='rowid'
);
```

---

## 5. Multi-Agent Orchestration & Work Allocation

When delegating across specialized agents, work should be parallelized into strict ownership zones:

```
                      ┌───────────────────────────────┐
                      │    COORDINATOR / PLANNER      │
                      └──────────────┬────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  AGENT: STORAGE  │       │  AGENT: SPATIAL  │       │  AGENT: INGEST   │
│  & DB ENGINE     │       │  & CANVAS UI     │       │  & EMBEDDINGS    │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ - SQLite schemas │       │ - Virtualized    │       │ - Ingestion pipe │
│ - Migrations     │       │   canvas driver  │       │   (URL, OCR, mic)│
│ - Repository     │       │ - Stack physics  │       │ - Vector search  │
│   layer          │       │ - Heat decay     │       │ - FTS5 indexer   │
│ - CRUD store     │       │   visual shaders │       │ - Ghost draft    │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Agent Roles & Work Breakdown:

#### Worker 1: `agent-database` (Storage & Repository)
* **Scope**: `services/db/`, `services/NoteService.ts`, `store/useNotesStore.ts`.
* **Deliverables**:
  1. Initialize `expo-sqlite` database with proper pragma configurations (`WAL` mode).
  2. Implement migrations runner for schema v1.
  3. Create type-safe DAO methods for Notes, Stacks, and Embeddings.
  4. Ensure zero UI imports in the database service layer.

#### Worker 2: `agent-spatial-canvas` (Canvas Physics & Viewport)
* **Scope**: `components/drift/`, `hooks/useHomeScreenController.ts`, `hooks/useCanvasCamera.ts`.
* **Deliverables**:
  1. Build the 2D spatial chunking & viewport culling manager.
  2. Implement velocity-based pre-fetching hooks.
  3. Implement magnetic stack collision & card stacking micro-interactions.
  4. Integrate thermodynamic opacity/scaling decay without frame-rate stutters.

#### Worker 3: `agent-intelligence` (Ingestion, Vectors & Associative Search)
* **Scope**: `services/ai/`, `services/ingest/`.
* **Deliverables**:
  1. Universal ingestion adapter: URL metadata scraper, photo/OCR extractor wrapper, voice note buffer.
  2. On-device vector similarity math (cosine distance on `Float32Array` Blobs).
  3. Hybrid conversational search engine (FTS5 + Vector hybrid rank).
  4. Ambient Ghost Draft summarizer service.

---

## 7. Non-Negotiable Engineering Constraints

The following constraints must be strictly adhered to by all agents (Planner, Database, Spatial, Intelligence, and QA). Violations must immediately fail verification.

### 7.1. Architectural & Code Constraints
1. **Purity of `app/(tabs)/index.tsx`**:
   - Zero inline business logic, computations, or helper functions in `index.tsx`.
   - `index.tsx` acts purely as a layout coordinator that mounts modular "bricks".
   - State and handlers must live strictly in hooks (e.g. `useHomeScreenController.ts`).
2. **Modular Brick Architecture**:
   - UI elements must remain isolated, single-responsibility components in `components/drift/`.
   - No monolith screens or monster 500+ line component files.
3. **No Raw Hardcoded UI Values**:
   - Spacing, colors, and layout constants must adhere to established theme tokens. No arbitrary magic numbers scattered across styles.
4. **TypeScript Strictness**:
   - `npx tsc --noEmit` must pass with **0 errors and 0 warnings** after every change.
   - No `any` type escapes on core data models (Notes, Stacks, Vectors, Ingestion payloads).

### 7.2. Git & Release Safety Constraints
1. **Branch Protection**:
   - **NEVER push to `drift-v2-clean`**. This branch is frozen as a clean recovery checkpoint.
   - All commits, branches, and pushes must target **`drift-v2-clean-staging`** exclusively.
2. **Secret & Key Isolation**:
   - Never commit sensitive keys, service account JSONs, or `.pem` files to git. Ensure `.gitignore` rules for `service-account.json`, `*.pem`, and backup folders are strictly respected.
3. **OTA Integrity**:
   - Do not introduce native code changes or native binary dependencies that break Expo EAS OTA updates without explicit coordination.

### 7.3. Performance & Memory Constraints
1. **60 FPS Canvas Rule**:
   - Infinite canvas panning and zooming must run at a smooth 60 FPS on mid-tier mobile hardware.
   - Off-screen cold cards must be culled and unmounted via spatial partitioning. Never render $> 50$ heavy active DOM/React Native nodes simultaneously.
2. **Offline & Battery Efficiency**:
   - Background calculations (thermodynamic heat decay, vector embeddings, Ghost Draft synthesis) must run asynchronously in background tasks or idle windows. Never block the JS main thread during gesture execution.
3. **Storage & Memory Footprint**:
   - SQLite queries must use proper indexes (`idx_notes_spatial`, `idx_notes_heat`, `idx_notes_stack`).
   - Image assets must use thumbnail caching via `expo-image` and avoid loading full-resolution multi-megabyte bitmaps in the canvas view.

### 7.4. Product & UX Constraints
1. **Zero Obtrusive AI Artifacts**:
   - Do not render AI badges, confidence percentages, robot icons, or conversational chatbot bubbles.
   - Intelligence must remain completely ambient, quiet, and magical.
2. **Zero Friction Ingestion**:
   - Ingestion must never pop up mandatory tagging or folder-selection dialogs. The user shares/pastes and the note is immediately placed on the canvas.

---

## 8. Phased Implementation Roadmap

### Phase 1: Database Bedrock & Ingestion Contracts (Milestone 1)
- [ ] Initialize `expo-sqlite` database provider and schema migration scripts.
- [ ] Connect `NoteService.ts` to SQLite CRUD operations.
- [ ] Replace in-memory mock store in `useNotesStore.ts` with SQLite-backed reactive state.
- [ ] Verify zero TypeScript errors (`npx tsc --noEmit`).

### Phase 2: Viewport Virtualization & Canvas Physics (Milestone 2)
- [ ] Implement spatial grid partitioner in `components/drift/LovableCanvasView.tsx`.
- [ ] Integrate gesture collision for physical card stacking.
- [ ] Add visual thermodynamic decay states to `LovableCardNode.tsx`.

### Phase 3: Multi-Modal Ingestion & Vector Search (Milestone 3)
- [ ] Wire multi-modal capture actions (photo with `expo-image`, text, link).
- [ ] Implement cosine similarity ranking and conversational search query handler.
- [ ] Implement active concept calibration loop.

### Phase 4: Ambient Intelligence & Ghost Synthesis (Milestone 4)
- [ ] Wire background Stack summarizer ("Ghost Draft").
- [ ] Implement subtle time-capsule "Echoes" logic.
- [ ] Comprehensive validation, release packaging, and EAS OTA verification.

---

## 9. Verification & Safety Guidelines
- **Zero Breaking Changes**: Do not commit breaking modifications to `app/(tabs)/index.tsx`.
- **Git Safety Rule**: All development branches and pushes must be made strictly to `drift-v2-clean-staging`. Never push directly to `drift-v2-clean`.
- **Code Cleanliness**: No inline closures in page coordinators; maintain single-responsibility brick components.
