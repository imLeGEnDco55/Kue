// ============================================
// KUE STUDIO - CENTRALIZED TYPES
// ============================================

// Structured prompt fields for VEO-compatible output
export interface PromptFields {
  subject: string;      // Who and how they look
  action: string;       // What they're doing
  lighting: string;     // Lighting/mood (from dropdown)
  camera: string;       // Camera movement (from dropdown)
  style: string;        // Visual style (from dropdown)
}

// A single Kue segment on the timeline
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

// Environment color definition
export interface EnvironmentColor {
  name: string;
  hero: string;
  fill: string;
  description: string;
}

// Project as stored in IndexedDB
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  audioBlob: Blob;
  bpm: number;
  segments: Segment[];
}
