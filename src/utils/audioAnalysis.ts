/**
 * Audio Analysis Utilities - Ported from Legacy HTML
 * Includes BPM detection and waveform generation
 */

export interface WavePeak {
    min: number;
    max: number;
}

/**
 * Detect BPM from an AudioBuffer
 * Algorithm based on energy peaks detection
 */
export function detectBPM(buffer: AudioBuffer): number {
    try {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;

        // Analyze a 10-second fragment from the middle
        const startSample = Math.floor(data.length / 2) - (sampleRate * 5);
        const endSample = startSample + (sampleRate * 10);
        const fragment = data.slice(Math.max(0, startSample), Math.min(data.length, endSample));

        const peaks: number[] = [];
        const threshold = 0.3;

        for (let i = 0; i < fragment.length; i++) {
            if (fragment[i] > threshold) {
                // Simple debounce of 0.25s
                if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > (sampleRate * 0.25)) {
                    peaks.push(i);
                }
            }
        }

        if (peaks.length < 2) return 0;

        // Calculate average distance between peaks
        let totalDist = 0;
        for (let i = 0; i < peaks.length - 1; i++) {
            totalDist += (peaks[i + 1] - peaks[i]);
        }
        const avgDist = totalDist / (peaks.length - 1);
        let bpm = Math.round(60 / (avgDist / sampleRate));

        // Adjust to normal range (70-170 BPM)
        while (bpm < 70) bpm *= 2;
        while (bpm > 170) bpm /= 2;

        return Math.round(bpm);
    } catch (e) {
        console.error('BPM detection error:', e);
        return 0;
    }
}

/**
 * Generate waveform peaks from AudioBuffer
 */
export function generateWaveformPeaks(buffer: AudioBuffer, samples: number = 1200): WavePeak[] {
    const channelData = buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / samples);
    const peaks: WavePeak[] = [];

    for (let i = 0; i < samples; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
            const index = (i * step) + j;
            if (index < channelData.length) {
                const datum = channelData[index];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
        }
        peaks.push({ min, max });
    }

    return peaks;
}

/**
 * Format seconds to MM:SS.ms (with milliseconds)
 */
export function formatTime(seconds: number, includeMs: boolean = true): string {
    if (!isFinite(seconds)) return '00:00.000';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (includeMs) {
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to short format SS.ms (for compact displays)
 */
export function formatTimeShort(seconds: number): string {
    if (!isFinite(seconds)) return '0.000';
    return seconds.toFixed(3);
}

/**
 * Analyze audio blob and return BPM
 */
export async function analyzeAudioBlob(blob: Blob): Promise<{ bpm: number; peaks: WavePeak[] }> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const bpm = detectBPM(audioBuffer);
    const peaks = generateWaveformPeaks(audioBuffer);

    audioContext.close();

    return { bpm, peaks };
}
