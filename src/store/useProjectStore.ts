import { create } from 'zustand';

export interface Segment {
    id: string;
    start: number;
    end: number;
    note: string;
    color?: string;
    thumbnail?: string; // Base64 data URL of video frame at start time
}

interface ProjectState {
    // Media State
    videoUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
    segments: Segment[];

    // Recording Mode (from legacy)
    isRecording: boolean;
    activeSegmentStart: number | null;

    // BPM Detection (from legacy)
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

    // Segment Actions
    addSegment: (segment: Segment) => void;
    updateSegment: (id: string, updates: Partial<Segment>) => void;
    deleteSegment: (id: string) => void;
    loadSegments: (segments: Segment[]) => void;
    undoLastSegment: () => Segment | null;

    // Recording Actions (from legacy)
    startRecording: (startTime: number) => void;
    finishRecording: (endTime: number) => Segment | null;
    cancelRecording: () => void;

    // UI Actions
    setActiveSegmentId: (id: string | null) => void;
    showToast: (message: string) => void;
    clearToast: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    // Initial State
    videoUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    zoom: 10,
    segments: [],
    isRecording: false,
    activeSegmentStart: null,
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

    // Segment CRUD
    addSegment: (segment) => set((state) => ({
        segments: [...state.segments, segment].sort((a, b) => a.start - b.start)
    })),

    updateSegment: (id, updates) => set((state) => ({
        segments: state.segments.map((s) => (s.id === id ? { ...s, ...updates } : s))
    })),

    deleteSegment: (id) => set((state) => ({
        segments: state.segments.filter((s) => s.id !== id)
    })),

    loadSegments: (segments) => set({ segments: segments.sort((a, b) => a.start - b.start) }),

    undoLastSegment: () => {
        const state = get();
        if (state.segments.length === 0) return null;

        const lastSegment = state.segments[state.segments.length - 1];
        set((s) => ({
            segments: s.segments.slice(0, -1),
            // If recording, move start back to the removed segment's start
            activeSegmentStart: s.isRecording ? lastSegment.start : s.activeSegmentStart
        }));
        return lastSegment;
    },

    // Recording Mode (legacy behavior)
    startRecording: (startTime) => {
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(40);
        set({ isRecording: true, activeSegmentStart: startTime });
    },

    finishRecording: (endTime) => {
        const state = get();
        if (!state.isRecording || state.activeSegmentStart === null) return null;

        // Determine start and end (swap if user went backwards)
        let start = state.activeSegmentStart;
        let end = endTime;
        if (start > end) {
            [start, end] = [end, start];
        }

        // Validate minimum duration (0.1s to avoid accidental taps)
        if (end - start < 0.1) return null;

        // SNAP INTELIGENTE: Ajustar si hay overlap con Kues existentes
        const existingSegments = state.segments;

        // Find if we're overlapping with any existing segment
        for (const seg of existingSegments) {
            // Si el nuevo empieza antes que uno existente y termina después de su inicio
            if (start < seg.start && end > seg.start) {
                // Snap: termina donde empieza el existente
                end = seg.start;
            }
            // Si el nuevo termina después que uno existente y empieza antes de su fin
            if (end > seg.end && start < seg.end) {
                // Snap: empieza donde termina el existente
                start = seg.end;
            }
        }

        // Re-validate after snap
        if (end - start < 0.1) return null;

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(40);

        const newSegment: Segment = {
            id: crypto.randomUUID(),
            start: start,
            end: end,
            note: '',
            color: '#8b5cf6'
        };

        // ENCADENAMIENTO INTELIGENTE:
        // Si el usuario avanzó en el tiempo, encadenar al siguiente
        // Si retrocedió, parar y dejar elegir
        const wentForward = endTime >= state.activeSegmentStart;

        set((s) => ({
            segments: [...s.segments, newSegment].sort((a, b) => a.start - b.start),
            isRecording: wentForward, // Continúa grabando si fue hacia adelante
            activeSegmentStart: wentForward ? end : null // Encadena desde el final
        }));

        return newSegment;
    },

    cancelRecording: () => {
        set({ isRecording: false, activeSegmentStart: null });
    },

    // UI Actions
    setActiveSegmentId: (id) => set({ activeSegmentId: id }),

    showToast: (message) => {
        set({ toastMessage: message });
        setTimeout(() => set({ toastMessage: null }), 2500);
    },

    clearToast: () => set({ toastMessage: null }),
}));
