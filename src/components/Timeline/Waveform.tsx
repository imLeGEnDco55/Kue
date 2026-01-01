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
        segments, setCurrentTime, setZoom,
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
            // Safe cleanup - wrap in try-catch to prevent AbortError
            try {
                wavesurfer.current?.destroy();
            } catch (e) {
                // Ignore AbortError on cleanup
            }
            wavesurfer.current = null;
            regionsPlugin.current = null;
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
        try {
            const existingGhost = regionsPlugin.current.getRegions().find(r => r.id === ghostId);
            if (existingGhost) {
                existingGhost.remove();
            }
        } catch (e) {
            // Ignore errors during cleanup
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

    // Pinch-to-zoom for mobile & Wheel zoom for desktop
    useEffect(() => {
        if (!containerRef.current) return;

        let initialDistance = 0;
        let initialZoom = zoom;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialDistance = Math.sqrt(dx * dx + dy * dy);
                initialZoom = useProjectStore.getState().zoom;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialDistance > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);

                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(5, Math.min(200, initialZoom * scale));

                setZoom(Math.round(newZoom));
                e.preventDefault();
            }
        };

        const handleTouchEnd = () => {
            initialDistance = 0;
        };

        const handleWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -10 : 10;
                setZoom(Math.max(5, Math.min(200, useProjectStore.getState().zoom + delta)));
            }
        };

        const el = containerRef.current;
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('wheel', handleWheel);
        };
    }, [setZoom]);

    return (
        <div className="w-full h-full bg-black/50 border-t border-b border-neon-purple/30 backdrop-blur-sm relative touch-none">
            <div ref={containerRef} className="w-full h-full" />

            {/* Instructions overlay */}
            {isReady && segments.length === 0 && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/30 text-sm font-mono bg-black/50 px-4 py-2 rounded-lg text-center">
                        <div className="hidden md:block">Alt + Rueda: Zoom • Doble-click para crear</div>
                        <div className="md:hidden">Pellizca para zoom • Toca dos veces para crear</div>
                    </div>
                </div>
            )}
        </div>
    );
};
