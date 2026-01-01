import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useProjectStore } from '../../store/useProjectStore';

export const Waveform = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const { videoUrl, isPlaying, currentTime, zoom, setCurrentTime } = useProjectStore();

    useEffect(() => {
        if (!containerRef.current || !videoUrl) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4c1d95', // violet-900 (darker)
            progressColor: '#8b5cf6', // violet-500 (neon)
            cursorColor: '#f472b6', // pink-400
            barWidth: 2,
            barGap: 1,
            height: 100,
            normalize: true,
            minPxPerSec: zoom,
            autoScroll: true,
            interact: true,
        });

        wavesurfer.current.load(videoUrl);
        wavesurfer.current.setVolume(0); // Mute waveform, video plays audio

        wavesurfer.current.on('interaction', (newTime) => {
            setCurrentTime(newTime);
        });

        // Optional: click event
        wavesurfer.current.on('click', () => {
            setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
        });

        return () => {
            wavesurfer.current?.destroy();
        }
    }, [videoUrl]);

    // Sync Zoom
    useEffect(() => {
        if (wavesurfer.current) {
            wavesurfer.current.zoom(zoom);
        }
    }, [zoom]);

    // Sync Playback State (Visuals only)
    useEffect(() => {
        if (!wavesurfer.current) return;
        // We don't necessarily need to "play" the waveform if we just sync time?
        // But playing makes the cursor move smoothly.
        if (isPlaying) {
            wavesurfer.current.play();
        } else {
            wavesurfer.current.pause();
        }
    }, [isPlaying]);

    // Sync Time
    useEffect(() => {
        if (!wavesurfer.current) return;
        const t = wavesurfer.current.getCurrentTime();
        // Sync only if difference is noticeable to prevent jitter
        if (Math.abs(t - currentTime) > 0.1) {
            wavesurfer.current.setTime(currentTime);
        }
    }, [currentTime]);

    return (
        <div className="w-full bg-black/50 border-t border-b border-neon-purple/30 backdrop-blur-sm">
            <div ref={containerRef} className="w-full" />
        </div>
    );
}
