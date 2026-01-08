/**
 * PROJECT PACKAGER
 * 
 * Exports and imports .kue files (ZIP format renamed)
 * Contains:
 * - project.json (metadata + segments)
 * - audio/media file (original blob)
 * - images/ folder with full-quality thumbnails
 */

import JSZip from 'jszip';
import { db } from '../db';
import type { Project, Segment } from '../types';

// Version for compatibility
const KUE_FORMAT_VERSION = '1.0';

interface KueProjectManifest {
  version: string;
  projectId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  segments: Segment[];
  mediaFileName: string;
  // Map of segmentId -> imageFileName for external high-quality images
  imageMap: Record<string, string>;
}

/**
 * Converts a dataURL to a high-quality version (1280x720, 92% JPEG)
 * Returns both the original (for internal use) and HQ version (for export)
 */
async function dataUrlToHighQuality(dataUrl: string): Promise<{ blob: Blob; extension: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Export at higher resolution for quality
      const targetWidth = 1280;
      const targetHeight = 720;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d')!;
      
      // Draw with high quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Center crop to 16:9
      const imgRatio = img.width / img.height;
      const targetRatio = 16 / 9;
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

      if (imgRatio > targetRatio) {
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        sHeight = img.width / targetRatio;
        sy = (img.height - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      
      canvas.toBlob(
        (blob) => {
          resolve({ blob: blob!, extension: 'jpg' });
        },
        'image/jpeg',
        0.92 // High quality
      );
    };
    img.src = dataUrl;
  });
}

/**
 * Export a project to .kue format (ZIP)
 */
export async function exportProject(projectId: string): Promise<Blob> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Proyecto no encontrado');

  const zip = new JSZip();
  const imagesFolder = zip.folder('images')!;
  const imageMap: Record<string, string> = {};

  // Process each segment's thumbnail
  for (const segment of project.segments) {
    if (segment.thumbnail) {
      try {
        const { blob, extension } = await dataUrlToHighQuality(segment.thumbnail);
        const fileName = `kue_${segment.id.slice(0, 8)}.${extension}`;
        imagesFolder.file(fileName, blob);
        imageMap[segment.id] = fileName;
      } catch (e) {
        console.warn(`Could not process thumbnail for segment ${segment.id}`, e);
      }
    }
  }

  // Create manifest (with internal compressed thumbnails preserved)
  const manifest: KueProjectManifest = {
    version: KUE_FORMAT_VERSION,
    projectId: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    bpm: project.bpm,
    segments: project.segments, // Keep internal thumbnails as-is
    mediaFileName: 'media' + getMediaExtension(project.audioBlob),
    imageMap,
  };

  // Add manifest
  zip.file('project.json', JSON.stringify(manifest, null, 2));

  // Add media file
  zip.file(manifest.mediaFileName, project.audioBlob);

  // Generate the ZIP
  return zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Get file extension from blob type
 */
function getMediaExtension(blob: Blob): string {
  const type = blob.type;
  if (type.includes('mp4')) return '.mp4';
  if (type.includes('webm')) return '.webm';
  if (type.includes('mp3')) return '.mp3';
  if (type.includes('wav')) return '.wav';
  if (type.includes('ogg')) return '.ogg';
  if (type.includes('audio')) return '.audio';
  return '.media';
}

/**
 * Import a .kue file
 * Returns the manifest for conflict resolution before actually importing
 */
export async function parseKueFile(file: File): Promise<{
  manifest: KueProjectManifest;
  mediaBlob: Blob;
  images: Map<string, Blob>;
}> {
  const zip = await JSZip.loadAsync(file);
  
  // Read manifest
  const manifestFile = zip.file('project.json');
  if (!manifestFile) throw new Error('Archivo .kue inválido: falta project.json');
  
  const manifestText = await manifestFile.async('text');
  const manifest: KueProjectManifest = JSON.parse(manifestText);

  // Read media
  const mediaFile = zip.file(manifest.mediaFileName);
  if (!mediaFile) throw new Error('Archivo .kue inválido: falta archivo de media');
  const mediaBlob = await mediaFile.async('blob');

  // Read images
  const images = new Map<string, Blob>();
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const [segmentId, fileName] of Object.entries(manifest.imageMap)) {
      const imgFile = imagesFolder.file(fileName);
      if (imgFile) {
        const imgBlob = await imgFile.async('blob');
        images.set(segmentId, imgBlob);
      }
    }
  }

  return { manifest, mediaBlob, images };
}

/**
 * Check if project exists and return conflict info
 */
export async function checkConflict(manifest: KueProjectManifest): Promise<{
  exists: boolean;
  localProject?: Project;
  localIsNewer?: boolean;
}> {
  const existing = await db.projects.get(manifest.projectId);
  
  if (!existing) {
    return { exists: false };
  }

  return {
    exists: true,
    localProject: existing,
    localIsNewer: existing.updatedAt > manifest.updatedAt,
  };
}

/**
 * Actually import the project (after user confirms)
 */
export async function importProject(
  manifest: KueProjectManifest,
  mediaBlob: Blob,
  _images: Map<string, Blob>, // Reserved for future use: extracting HQ images
  overwriteExisting: boolean = false
): Promise<Project> {
  const existingProject = await db.projects.get(manifest.projectId);

  // If exists and not overwriting, create new ID
  const projectId = (existingProject && !overwriteExisting) 
    ? crypto.randomUUID() 
    : manifest.projectId;

  // Optionally: if we have high-quality images in the ZIP, update the segments
  // (For now, we keep the embedded thumbnails since they work with the current system)
  
  const project: Project = {
    id: projectId,
    name: manifest.name + (existingProject && !overwriteExisting ? ' (importado)' : ''),
    createdAt: existingProject && !overwriteExisting ? Date.now() : manifest.createdAt,
    updatedAt: Date.now(),
    audioBlob: mediaBlob,
    bpm: manifest.bpm,
    segments: manifest.segments,
  };

  if (existingProject && overwriteExisting) {
    await db.projects.put(project);
  } else {
    await db.projects.add(project);
  }

  return project;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
