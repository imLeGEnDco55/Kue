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

        // ANTI-OVERLAP ESTRICTO: Ajustar nuevo Kue y dividir existentes si es necesario
        let existingSegments = [...state.segments];
        const segmentsToAdd: Segment[] = [];
        const segmentsToRemove: string[] = [];

        for (const seg of existingSegments) {
            // Caso 1: El nuevo cubre completamente a uno existente -> eliminar el existente
            if (start <= seg.start && end >= seg.end) {
                segmentsToRemove.push(seg.id);
                continue;
            }

            // Caso 2: El nuevo está completamente dentro de uno existente -> dividir
            if (start > seg.start && end < seg.end) {
                // Dividir en dos: [seg.start, start] y [end, seg.end]
                segmentsToRemove.push(seg.id);
                segmentsToAdd.push({
                    ...seg,
                    id: crypto.randomUUID(),
                    end: start
                });
                segmentsToAdd.push({
                    ...seg,
                    id: crypto.randomUUID(),
                    start: end,
                    note: seg.note ? `${seg.note} (cont)` : ''
                });
                continue;
            }

            // Caso 3: El nuevo se superpone por la izquierda -> recortar el existente
            if (start < seg.start && end > seg.start && end < seg.end) {
                // Snap: nuevo termina donde empieza el existente
                end = seg.start;
            }

            // Caso 4: El nuevo se superpone por la derecha -> recortar el existente
            if (start > seg.start && start < seg.end && end > seg.end) {
                // Snap: nuevo empieza donde termina el existente
                start = seg.end;
            }
        }

        // Re-validate after adjustments
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

        // ENCADENAMIENTO INTELIGENTE
        const wentForward = endTime >= state.activeSegmentStart;

        set((s) => {
            // Remove segments that were fully covered or split
            let updatedSegments = s.segments.filter(seg => !segmentsToRemove.includes(seg.id));
            // Add the split segments
            updatedSegments = [...updatedSegments, ...segmentsToAdd, newSegment];
            // Sort by start time
            updatedSegments.sort((a, b) => a.start - b.start);

            return {
                segments: updatedSegments,
                isRecording: wentForward,
                activeSegmentStart: wentForward ? end : null
            };
        });

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
