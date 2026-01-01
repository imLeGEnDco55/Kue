import { create } from 'zustand';

export interface Segment {
    id: string;
    start: number;
    end: number;
    note: string;
    color?: string;
}

interface ProjectState {
    videoUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
    segments: Segment[];

    // Actions
    setVideoUrl: (url: string) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setZoom: (zoom: number) => void;
    addSegment: (segment: Segment) => void;
    updateSegment: (id: string, updates: Partial<Segment>) => void;
    deleteSegment: (id: string) => void;
    loadSegments: (segments: Segment[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    videoUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    zoom: 10,
    segments: [],

    setVideoUrl: (url) => set({ videoUrl: url }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setZoom: (zoom) => set({ zoom }),

    addSegment: (segment) => set((state) => ({ segments: [...state.segments, segment] })),

    updateSegment: (id, updates) => set((state) => ({
        segments: state.segments.map((s) => (s.id === id ? { ...s, ...updates } : s))
    })),

    deleteSegment: (id) => set((state) => ({
        segments: state.segments.filter((s) => s.id !== id)
    })),

    loadSegments: (segments) => set({ segments }),

}));
