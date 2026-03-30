import { Note } from '@/store/useNotesStore';

export function generateFullGhostPool(limit: number = 15): Note[] {
  // Ordered by narrative priority: Welcome -> Core UI -> Navigation -> AI/Advanced
  const pool = [
    { id: 'ghost-1', category: 'Welcome to Drift', content: "Welcome to Drift. Just type to capture your thoughts. Drift's engine handles live categorization automatically in the background.", img: null },
    { id: 'ghost-2', category: 'Timeline Filters', content: "Tap the Chronos or Nexus toggles at the top of the map to instantly switch your view. Chronos organizes by date, and Nexus organizes by contextual priority.", img: 'chronos_nexus_toggle.gif' },
    { id: 'ghost-3', category: 'Focus Mode', content: "Tap any pulsing node to dive into Focus Mode. The application will instantly isolate the active thread so you can read related notes smoothly.", img: null },
    { id: 'ghost-7', category: 'Quick Navigation', content: "Use the bottom navigation bar to rapidly jump between the Home Map, the Capture Lens, and the detailed Notes List view.", img: 'bottom_tab_physics.gif' },
    { id: 'ghost-9', category: 'Invisible Scrubbing', content: "Inside Focus Mode, touch anywhere and drag your finger up and down to quickly scrub through highly dense note clusters.", img: 'focus_mode_scrub.gif' },
    { id: 'ghost-4', category: 'Rich Media', content: "The fast-capture lens is below. You can drop rich photos directly into your thoughts, and the system will attach them to your ideas.", img: 'capture_flow.gif' },
    { id: 'ghost-6', category: 'Note Linking', content: "Drift maps the relationship between your notes. The lines connecting dots physically represent deep semantic matches between disjointed thoughts.", img: null },
    { id: 'ghost-10', category: 'Task Extraction', content: "If you capture a thought regarding something you need to do, the engine immediately reads the context and structures it into a formal Todo note.", img: null },
    { id: 'ghost-12', category: 'Offline Engine', content: "Drift is entirely offline-first. It works instantly without an internet connection, and the AI agent syncs structure the moment you reconnect.", img: null },
    { id: 'ghost-13', category: 'Zero Hierarchies', content: "There are no folders to manage and no tags to assign. You just capture the raw thought, and Drift constructs the organizational map.", img: null },
    { id: 'ghost-14', category: 'Idea Clustering', content: "If you regularly write notes about the exact same topic, the engine dynamically pulls them into a massive visual cluster for easy review.", img: null },
    { id: 'ghost-15', category: 'Data Ownership', content: "Your thoughts are your own. You can completely export your encrypted local SQLite database at any time straight from settings.", img: null },
    { id: 'ghost-18', category: 'Instant Commits', content: "The moment you tap 'Commit', the text is saved locally in milliseconds, bypassing traditional loading screens entirely.", img: null },
    { id: 'ghost-19', category: 'Journal Workflow', content: "Starting a sentence with basic pronouns like 'I' or 'My' automatically routes your thought directly into the chronological Journal track.", img: null },
    { id: 'ghost-20', category: 'Endless Scrolling', content: "The Map view is endless. Scroll downwards to travel backward in time through your entire captured history.", img: null }
  ];

  // Map to full Note objects with decreasing timestamps (recent first)
  return pool.slice(0, limit).map((item, idx) => ({
    id: item.id,
    content: item.content,
    created_at: Date.now() - (idx * 600000), // Spaced by 10 minutes to ensure clear separation
    source_type: 'text',
    images: item.img ? [item.img] : [],
    entities_json: JSON.stringify({ category: item.category }),
    is_ghost: true,
  })) as Note[];
}

export function generateMockUserNotes(): Note[] {
  const thoughts = [
    { category: 'Journal', content: "Just woke up. The sky is incredibly clear today. I should probably focus on finishing the UI timeline animations before noon." },
    { category: 'Idea', content: "App idea: A kinetic clock that changes its typography weight based on how fast you are physically moving." },
    { category: 'Todo', content: "Buy oat milk and coffee beans." },
    { category: 'Journal', content: "Feeling exhausted. The math behind the 3D physics engine is finally clicking though. Just need to rest." },
    { category: 'Study', content: "Reading Essentialism. The core thesis is simple: Almost everything is noise. We need to fiercely protect our focus." },
    { category: 'Todo', content: "Email Sarah the updated vector assets." },
    { category: 'Idea', content: "What if the S-curves physically snapped like rubber bands when you scroll too fast?" },
    { category: 'Study', content: "Cognitive Load Theory: Humans can only hold 4-7 items in working memory. The interface must reduce extraneous load." },
    { category: 'Journal', content: "I love how the new glassmorphism nav bar feels. Huge improvement." },
    { category: 'Creative', content: "Designing a new logo. Needs to feel fluid, like liquid mercury." },
    { category: 'Todo', content: "Fix the Reanimated memory leak on the Map screen." },
    { category: 'Study', content: "Stoicism notes: You suffer more in imagination than in reality." },
    { category: 'Idea', content: "Audio synthesis could transcribe voice notes and automatically group them by emotional tone." },
    { category: 'Journal', content: "Had a great meeting today. The team is aligned on the Nexus Horizon perspective engine." },
    { category: 'Todo', content: "Call mom tomorrow." },
    { category: 'Study', content: "Typography laws: The line height should be 1.5x the font size for optimal readability." },
    { category: 'Creative', content: "Writing a short story about an AI that learns to dream by observing user cursor movements." },
    { category: 'Idea', content: "Dark mode shouldn't just invert colors, it should soften the physical contrast ratios." },
    { category: 'Todo', content: "Update the SQLite schema for the new encryption layer." },
    { category: 'Journal', content: "Late night coding session. Everything is quiet. The app is finally breathing." }
  ];

  return thoughts.map((item, idx) => ({
    id: `mock-user-${idx}`,
    content: item.content,
    created_at: Date.now() - (idx * 3600000), // Spaced by hours
    source_type: 'text',
    images: [],
    entities_json: JSON.stringify({ category: item.category }),
    is_ghost: false,
  })) as Note[];
}

export function processContextualConnections(notes: Note[], width: number) {
  const clusterCounts: Record<number, number> = {};

  return notes.map((note, i) => {
    let category = 'Journal';
    let clusterId = -1;
    if (note.entities_json) {
      try {
        const parsed = JSON.parse(note.entities_json);
        category = parsed.category || parsed.categories?.[0] || 'Journal';
        clusterId = parsed.clusterId ?? -1;
      } catch (e) { }
    }

    const localIndex = clusterCounts[clusterId] || 0;
    if (clusterId !== -1) clusterCounts[clusterId] = localIndex + 1;

    // Ghost notes shortcut: Bypass serpentine math entirely
    if (note.is_ghost) {
      const randX = (Math.abs(Math.sin(i * 13)) * 10000) % 1;
      const randY = (Math.abs(Math.cos(i * 17)) * 10000) % 1;
      const unfocusedY = 180 + i * 260 + (randY * 60);
      const unfocusedX = 60 + randX * (width - 180); // Strict inner margins
      
      return {
        ...note,
        isRight: false,
        unfocusedX,
        unfocusedY,
        unfocusedTextLeft: unfocusedX + 40,
        dynamicWidth: width - unfocusedX - 60,
        nodeRadius: 5,
        ageFade: 1,
        importance: 1,
        isGlowing: true,
        category,
        categories: [category],
        clusterId,
        clusterIndex: localIndex,
        displayLines: 3,
        connectedNodeIndex: null, // Strictly no string connections
      };
    }

    const isRight = (i * 7) % 3 === 0 || i % 2 !== 0;
    const randX = (Math.abs(Math.sin(i * 37)) * 10000) % 1;
    const randY = (Math.abs(Math.cos(i * 41)) * 10000) % 1;
    const basePadding = 40;
    const varianceX = randX * 120;
    const unfocusedX = isRight ? (width - basePadding - varianceX) : (basePadding + varianceX);
    const unfocusedY = 150 + i * 480 + (randY - 0.5) * 60;
    const textTargetWidth = width * 0.52;
    const PADDING = 60;
    const margin = 20;

    const rightSpace = width - unfocusedX - PADDING - margin;
    const leftSpace = unfocusedX - PADDING - margin;
    const available = isRight ? leftSpace : rightSpace;
    const dynamicWidth = Math.max(140, Math.min(textTargetWidth, available));

    const unfocusedTextLeft = isRight ? unfocusedX - dynamicWidth - PADDING : unfocusedX + PADDING;
    const ageFade = Math.max(0.15, 1 - (i * 0.015));
    const importance = Math.min(1, note.content.length / 85);
    const nodeRadius = 3.5 + (importance * 4.5);
    const isGlowing = importance >= 0.8;
    const displayLines = Math.floor(randX * 4) + 2;

    const connectedNodeIndex = notes.findIndex((pastNote, pastIndex) => {
      if (pastIndex <= i || !pastNote.entities_json) return false;
      try {
        const pastJson = JSON.parse(pastNote.entities_json);
        const pastCategory = pastJson.category || pastJson.categories?.[0];
        return pastCategory === category;
      } catch { return false; }
    });

    return {
      ...note,
      isRight,
      unfocusedX,
      unfocusedY,
      unfocusedTextLeft,
      dynamicWidth,
      nodeRadius,
      ageFade,
      importance,
      isGlowing,
      category,
      categories: [category],
      clusterId,
      clusterIndex: localIndex,
      displayLines,
      connectedNodeIndex: connectedNodeIndex > -1 ? connectedNodeIndex : null,
    };
  });
}
