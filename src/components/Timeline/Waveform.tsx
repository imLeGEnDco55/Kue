import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
import { useProjectStore } from '../../store/useProjectStore';

export const Waveform = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const regionsPlugin = useRef<RegionsPlugin | null>(null);
    const [isReady, setIsReady] = useState(false);

    const {
        videoUrl, isPlaying, currentTime, zoom,
        segments, setCurrentTime,
        isRecording, activeSegmentStart, addSegment, showToast
    } = useProjectStore();

    // Initialize WaveSurfer
    useEffect(() => {
        if (!containerRef.current || !videoUrl) return;

        setIsReady(false);

        // Create Regions Plugin
        regionsPlugin.current = RegionsPlugin.create();

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4c1d95',
            progressColor: '#8b5cf6',
            cursorColor: '#f472b6',
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            height: 100,
            normalize: true,
            minPxPerSec: zoom,
            autoScroll: true,
            interact: true,
            plugins: [regionsPlugin.current],
        });

        wavesurfer.current.load(videoUrl);
        wavesurfer.current.setVolume(0); // Mute - video plays audio

        wavesurfer.current.on('ready', () => {
            setIsReady(true);
        });

        // Click to seek
        wavesurfer.current.on('interaction', (newTime) => {
            setCurrentTime(newTime);
        });

        // Double-click to create a segment at that point
        wavesurfer.current.on('dblclick', (relX: number) => {
            const ws = wavesurfer.current;
            if (!ws) return;

            const clickTime = relX * ws.getDuration();

            // Create a 3-second segment at click position
            const newSegment = {
                id: crypto.randomUUID(),
                start: clickTime,
                end: Math.min(clickTime + 3, ws.getDuration()),
                note: '',
                color: '#8b5cf6'
            };

            addSegment(newSegment);
            showToast('Segmento creado');
        });

        return () => {
            wavesurfer.current?.destroy();
            setIsReady(false);
        };
    }, [videoUrl]);

    // Sync segments to regions
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;

        // Clear existing regions
        regionsPlugin.current.clearRegions();

        // Add regions for each segment with custom color
        segments.forEach((seg) => {
            // Convert hex color to rgba with transparency
            const hexColor = seg.color || '#8b5cf6';
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);

            regionsPlugin.current?.addRegion({
                id: seg.id,
                start: seg.start,
                end: seg.end,
                color: `rgba(${r}, ${g}, ${b}, 0.35)`,
                drag: true,
                resize: true,
            });
        });

    }, [segments, isReady]);

    // Handle region updates (drag/resize)
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;

        const handleRegionUpdate = (region: Region) => {
            const { updateSegment } = useProjectStore.getState();
            updateSegment(region.id, {
                start: region.start,
                end: region.end
            });
        };

        regionsPlugin.current.on('region-updated', handleRegionUpdate);

        return () => {
            regionsPlugin.current?.un('region-updated', handleRegionUpdate);
        };
    }, [isReady]);

    // Draw ghost segment (recording in progress)
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;

        const ghostId = '__ghost_segment__';

        // Remove existing ghost
        const existingGhost = regionsPlugin.current.getRegions().find(r => r.id === ghostId);
        if (existingGhost) {
            existingGhost.remove();
        }

        // Add new ghost if recording
        if (isRecording && activeSegmentStart !== null && currentTime > activeSegmentStart) {
            regionsPlugin.current.addRegion({
                id: ghostId,
                start: activeSegmentStart,
                end: currentTime,
                color: 'rgba(239, 68, 68, 0.4)',
                drag: false,
                resize: false,
            });
        }
    }, [isRecording, activeSegmentStart, currentTime, isReady]);

    // Sync Zoom
    useEffect(() => {
        if (wavesurfer.current && isReady) {
            try {
                wavesurfer.current.zoom(zoom);
            } catch (err) {
                console.warn("Zoom error:", err);
            }
        }
    }, [zoom, isReady]);

    // Sync Playback
    useEffect(() => {
        if (!wavesurfer.current || !isReady) return;
        if (isPlaying) {
            wavesurfer.current.play();
        } else {
            wavesurfer.current.pause();
        }
    }, [isPlaying, isReady]);

    // Sync Time
    useEffect(() => {
        if (!wavesurfer.current || !isReady) return;
        const t = wavesurfer.current.getCurrentTime();
        if (Math.abs(t - currentTime) > 0.1) {
            wavesurfer.current.setTime(currentTime);
        }
    }, [currentTime, isReady]);

    return (
        <div className="w-full h-full bg-black/50 border-t border-b border-neon-purple/30 backdrop-blur-sm relative">
            <div ref={containerRef} className="w-full h-full" />

            {/* Instructions overlay */}
            {isReady && segments.length === 0 && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/30 text-sm font-mono bg-black/50 px-4 py-2 rounded-lg">
                        Doble-click para crear un segmento • Arrastra para mover
                    </div>
                </div>
            )}
        </div>
    );
};
