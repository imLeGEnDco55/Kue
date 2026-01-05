import { create } from "zustand";

// Structured prompt fields for VEO-compatible output
export interface PromptFields {
  subject: string;      // Who and how they look
  action: string;       // What they're doing
  lighting: string;     // Lighting/mood (from dropdown)
  camera: string;       // Camera movement (from dropdown)
  style: string;        // Visual style (from dropdown)
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  note: string;         // Quick note / lyric reference
  color?: string;
  colorName?: string;   // Environment name (e.g., "Pool", "Living Room")
  isHero?: boolean;     // Hero shot (bright) vs Fill shot (muted)
  thumbnail?: string;
  prompt?: PromptFields; // Structured prompt fields
}

// Dropdown options for structured prompts
export const LIGHTING_OPTIONS = [
  "Golden hour",
  "Blue hour", 
  "Neon lights",
  "Natural daylight",
  "Overcast",
  "Dramatic shadows",
  "Studio lighting",
  "Candlelight",
  "Moonlight",
  "Silhouette",
];

export const CAMERA_OPTIONS = [
  "Static",
  "Slow zoom in",
  "Slow zoom out",
  "Dolly forward",
  "Dolly back",
  "Pan left",
  "Pan right",
  "Tilt up",
  "Tilt down",
  "Tracking shot",
  "Drone aerial",
  "Handheld",
  "360 orbit",
];

export const STYLE_OPTIONS = [
  "Cinematic",
  "35mm film",
  "Music video",
  "Documentary",
  "Anime",
  "VHS retro",
  "Dreamy soft focus",
  "High contrast",
  "Desaturated",
  "Neon cyberpunk",
  "Vintage 70s",
  "Modern clean",
];

// History system for full undo support
const MAX_HISTORY_SIZE = 30;

// Environment-based color palette with Hero (bright) and Fill (muted) variants
export const ENVIRONMENT_COLORS = [
  { name: "Neutral", hero: "#8b5cf6", fill: "#4c2889", description: "Default / Sin entorno específico" },
  { name: "Pool/Water", hero: "#3b82f6", fill: "#1e3a5f", description: "Piscina, playa, agua" },
  { name: "Sunset/Warm", hero: "#f97316", fill: "#7c3a0a", description: "Atardecer, sala cálida" },
  { name: "Nature/Green", hero: "#22c55e", fill: "#14532d", description: "Exterior, jardín, bosque" },
  { name: "Party/Pink", hero: "#ec4899", fill: "#831843", description: "Club, fiesta, neón" },
  { name: "Urban/Yellow", hero: "#eab308", fill: "#713f12", description: "Ciudad, calle, taxi" },
  { name: "Night/Dark", hero: "#6366f1", fill: "#312e81", description: "Noche, interior oscuro" },
  { name: "Studio/White", hero: "#f8fafc", fill: "#94a3b8", description: "Estudio, fondo limpio" },
];

interface ProjectState {
  // Media State
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  segments: Segment[];

  // History for undo
  segmentsHistory: Segment[][];

  // BPM (now manual)
  bpm: number;

  // UI State
  activeSegmentId: string | null;
  toastMessage: string | null;

  // Actions
  setVideoUrl: (url: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setBpm: (bpm: number) => void;

  // NEW Segment Actions (Cut-based system)
  cutAtPosition: (position: number) => Segment | null;
  closeToEnd: () => Segment | null;
  
  // Segment CRUD
  addSegment: (segment: Segment) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  deleteSegment: (id: string) => void;
  loadSegments: (segments: Segment[]) => void;
  clearSegments: () => void;
  
  // Undo
  undo: () => boolean;
  canUndo: () => boolean;

  // UI Actions
  setActiveSegmentId: (id: string | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;

  // Helpers
  getSegmentAtTime: (time: number) => Segment | null;
  getSegmentNumber: (segmentId: string) => number;

  // Phase 4 Tools
  autoSplitByBpm: (beatsPerBar?: number) => void;
  assignLyricsToKues: (lyrics: string) => void;
}

// Helper to save current segments to history before making changes
const pushToHistory = (state: ProjectState): Segment[][] => {
  const newHistory = [
    ...state.segmentsHistory,
    state.segments.map((s) => ({ ...s })),
  ];
  if (newHistory.length > MAX_HISTORY_SIZE) {
    return newHistory.slice(-MAX_HISTORY_SIZE);
  }
  return newHistory;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial State
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  zoom: 10,
  segments: [],
  segmentsHistory: [],
  bpm: 0,
  activeSegmentId: null,
  toastMessage: null,

  // Basic Setters
  setVideoUrl: (url) => set({ videoUrl: url }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setZoom: (zoom) => set({ zoom }),
  setBpm: (bpm) => set({ bpm }),

  // NEW: Cut at current position
  // If no segments exist, creates first segment from 0 to position
  // If position is inside a segment, splits it into two
  // If position is in "unassigned" area (after last segment), creates new segment
  cutAtPosition: (position: number) => {
    const state = get();
    const { segments, duration } = state;

    // Minimum distance from edges (0.1 seconds)
    if (position < 0.1 || position > duration - 0.1) return null;

    // Case 1: No segments yet - create first segment from 0 to position
    if (segments.length === 0) {
      const newSegment: Segment = {
        id: crypto.randomUUID(),
        start: 0,
        end: position,
        note: "",
        color: ENVIRONMENT_COLORS[0].hero,
        colorName: ENVIRONMENT_COLORS[0].name,
        isHero: true,
      };

      if (navigator.vibrate) navigator.vibrate(40);

      set((s) => ({
        segmentsHistory: pushToHistory(s),
        segments: [newSegment],
      }));

      return newSegment;
    }

    // Case 2: Position is inside an existing segment - split it
    const segmentToSplit = segments.find(
      (s) => position > s.start + 0.1 && position < s.end - 0.1
    );

    if (segmentToSplit) {
      const envIndex = segments.length % ENVIRONMENT_COLORS.length;
      const newSegment: Segment = {
        id: crypto.randomUUID(),
        start: position,
        end: segmentToSplit.end,
        note: "",
        color: ENVIRONMENT_COLORS[envIndex].hero,
        colorName: ENVIRONMENT_COLORS[envIndex].name,
        isHero: true,
      };

      if (navigator.vibrate) navigator.vibrate(40);

      set((s) => ({
        segmentsHistory: pushToHistory(s),
        segments: s.segments
          .map((seg) =>
            seg.id === segmentToSplit.id ? { ...seg, end: position } : seg
          )
          .concat(newSegment)
          .sort((a, b) => a.start - b.start),
      }));

      return newSegment;
    }

    // Case 3: Position is after the last segment - create new segment
    const lastSegment = segments[segments.length - 1];
    if (position > lastSegment.end) {
      const envIndex = segments.length % ENVIRONMENT_COLORS.length;
      const newSegment: Segment = {
        id: crypto.randomUUID(),
        start: lastSegment.end,
        end: position,
        note: "",
        color: ENVIRONMENT_COLORS[envIndex].hero,
        colorName: ENVIRONMENT_COLORS[envIndex].name,
        isHero: true,
      };

      if (navigator.vibrate) navigator.vibrate(40);

      set((s) => ({
        segmentsHistory: pushToHistory(s),
        segments: [...s.segments, newSegment].sort((a, b) => a.start - b.start),
      }));

      return newSegment;
    }

    // Position is on a segment boundary or before first segment - do nothing
    return null;
  },

  // NEW: Close remaining track to the end (long-press action)
  closeToEnd: () => {
    const state = get();
    const { segments, duration } = state;

    if (duration <= 0) return null;

    // If no segments, create one covering the entire track
    if (segments.length === 0) {
      const newSegment: Segment = {
        id: crypto.randomUUID(),
        start: 0,
        end: duration,
        note: "",
        color: ENVIRONMENT_COLORS[0].hero,
        colorName: ENVIRONMENT_COLORS[0].name,
        isHero: true,
      };

      if (navigator.vibrate) navigator.vibrate([40, 50, 40]);

      set((s) => ({
        segmentsHistory: pushToHistory(s),
        segments: [newSegment],
      }));

      return newSegment;
    }

    // Otherwise, create final segment from last segment's end to duration
    const lastSegment = segments[segments.length - 1];
    
    // Already closed
    if (lastSegment.end >= duration - 0.1) return null;

    const envIndex = segments.length % ENVIRONMENT_COLORS.length;
    const newSegment: Segment = {
      id: crypto.randomUUID(),
      start: lastSegment.end,
      end: duration,
      note: "",
      color: ENVIRONMENT_COLORS[envIndex].hero,
      colorName: ENVIRONMENT_COLORS[envIndex].name,
      isHero: true,
    };

    if (navigator.vibrate) navigator.vibrate([40, 50, 40]);

    set((s) => ({
      segmentsHistory: pushToHistory(s),
      segments: [...s.segments, newSegment].sort((a, b) => a.start - b.start),
    }));

    return newSegment;
  },

  // Segment CRUD
  addSegment: (segment) =>
    set((state) => ({
      segmentsHistory: pushToHistory(state),
      segments: [...state.segments, segment].sort((a, b) => a.start - b.start),
    })),

  updateSegment: (id, updates) =>
    set((state) => ({
      segmentsHistory: pushToHistory(state),
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  deleteSegment: (id) =>
    set((state) => ({
      segmentsHistory: pushToHistory(state),
      segments: state.segments.filter((s) => s.id !== id),
    })),

  loadSegments: (segments) =>
    set((state) => ({
      segmentsHistory: pushToHistory(state),
      segments: segments.sort((a, b) => a.start - b.start),
    })),

  clearSegments: () =>
    set((state) => ({
      segmentsHistory: pushToHistory(state),
      segments: [],
    })),

  // Undo
  undo: () => {
    const state = get();
    if (state.segmentsHistory.length === 0) return false;

    const previousSegments =
      state.segmentsHistory[state.segmentsHistory.length - 1];
    set({
      segments: previousSegments,
      segmentsHistory: state.segmentsHistory.slice(0, -1),
    });
    return true;
  },

  canUndo: () => get().segmentsHistory.length > 0,

  // UI Actions
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 2500);
  },

  clearToast: () => set({ toastMessage: null }),

  // Helpers
  getSegmentAtTime: (time: number) => {
    const { segments } = get();
    return segments.find((s) => time >= s.start && time < s.end) || null;
  },

  getSegmentNumber: (segmentId: string) => {
    const { segments } = get();
    const index = segments.findIndex((s) => s.id === segmentId);
    return index >= 0 ? index + 1 : 0;
  },

  // PHASE 4: AUTO TOOLS
  
  // Auto-split the entire track based on BPM and beats per bar
  autoSplitByBpm: (beatsPerBar: number = 4) => {
    const state = get();
    const { bpm, duration } = state;

    if (bpm <= 0 || duration <= 0) return;

    const secondsPerBeat = 60 / bpm;
    const interval = secondsPerBeat * beatsPerBar;
    
    // Safety check: avoid creating thousands of segments if BPM is wrong
    if (interval < 0.5) return; 

    const newSegments: Segment[] = [];
    let currentTime = 0;
    let index = 0;

    while (currentTime < duration) {
      const end = Math.min(currentTime + interval, duration);
      
      // Stop if segment is too short (ending)
      if (end - currentTime < 0.1) break;

      const envIndex = index % ENVIRONMENT_COLORS.length;
      
      newSegments.push({
        id: crypto.randomUUID(),
        start: currentTime,
        end: end,
        note: "",
        color: ENVIRONMENT_COLORS[envIndex].hero,
        colorName: ENVIRONMENT_COLORS[envIndex].name,
        isHero: true,
      });

      currentTime = end;
      index++;
    }

    set((s) => ({
      segmentsHistory: pushToHistory(s),
      segments: newSegments,
      toastMessage: `${newSegments.length} Kues generados automáticamente`
    }));
    
    setTimeout(() => set({ toastMessage: null }), 2000);
  },

  // Distribute lyrics (one line per Kue)
  assignLyricsToKues: (lyricsText: string) => {
    const state = get();
    const { segments } = state;
    
    if (segments.length === 0) return;

    // Split by newlines and filter empty lines
    const lines = lyricsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const updatedSegments = segments.map((seg, idx) => {
      // If we have a line for this segment, assign it
      if (idx < lines.length) {
        return {
          ...seg,
          note: lines[idx], // Assign to note/lyric field
          prompt: {
            ...seg.prompt,
            subject: seg.prompt?.subject || '',
            action: seg.prompt?.action || '', 
            lighting: seg.prompt?.lighting || '',
            camera: seg.prompt?.camera || '',
            style: seg.prompt?.style || '',
            // We can also optionally pre-fill prompt.subject if empty?
            // Let's stick to 'note' as requested "La letra va en el campo note"
          }
        };
      }
      return seg;
    });

    set((s) => ({
      segmentsHistory: pushToHistory(s),
      segments: updatedSegments,
      toastMessage: `Lyrics asignados a ${Math.min(segments.length, lines.length)} Kues`
    }));

    setTimeout(() => set({ toastMessage: null }), 2000);
  }
}));
