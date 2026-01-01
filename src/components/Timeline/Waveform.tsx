import { useEffect, useRef, useState, memo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
import { useProjectStore } from '../../store/useProjectStore';

export const Waveform = memo(() => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const regionsPlugin = useRef<RegionsPlugin | null>(null);
    const [isReady, setIsReady] = useState(false);

    const videoUrl = useProjectStore(state => state.videoUrl);
    const isPlaying = useProjectStore(state => state.isPlaying);
    const currentTime = useProjectStore(state => state.currentTime);
    const zoom = useProjectStore(state => state.zoom);
    const segments = useProjectStore(state => state.segments);
    const isRecording = useProjectStore(state => state.isRecording);
    const activeSegmentStart = useProjectStore(state => state.activeSegmentStart);

    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const addSegment = useProjectStore(state => state.addSegment);
    const showToast = useProjectStore(state => state.showToast);

    // 1. Initialize WaveSurfer
    useEffect(() => {
        if (!containerRef.current || !videoUrl) return;

        setIsReady(false);
        regionsPlugin.current = RegionsPlugin.create();

        const ws = WaveSurfer.create({
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

        wavesurfer.current = ws;
        ws.load(videoUrl);
        ws.setVolume(0);

        ws.on('ready', () => setIsReady(true));
        ws.on('interaction', (newTime) => setCurrentTime(newTime));
        // Critical: Update store time during playback
        ws.on('audioprocess', (t) => setCurrentTime(t));

        ws.on('dblclick', (relX: number) => {
            const duration = ws.getDuration();
            const clickTime = relX * duration;
            addSegment({
                id: crypto.randomUUID(),
                start: clickTime,
                end: Math.min(clickTime + 3, duration),
                note: '',
                color: '#8b5cf6'
            });
            showToast('Segmento creado');
        });

        return () => {
            try { ws.destroy(); } catch (e) { }
            wavesurfer.current = null;
            regionsPlugin.current = null;
            setIsReady(false);
        };
    }, [videoUrl]);

    // 2. Sync Zoom (using .zoom() which is faster than setOptions)
    useEffect(() => {
        if (wavesurfer.current && isReady) {
            try {
                wavesurfer.current.zoom(zoom);
            } catch (err) { }
        }
    }, [zoom, isReady]);

    // 3. Sync segments to regions (Stable Sync)
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;

        const plugin = regionsPlugin.current;
        const currentRegions = plugin.getRegions();

        // Remove old regions that are no longer in segments
        currentRegions.forEach(r => {
            if (r.id !== '__ghost_segment__' && !segments.find(s => s.id === r.id)) {
                try { r.remove(); } catch (e) { }
            }
        });

        // Add or Update regions
        segments.forEach((seg) => {
            const existing = currentRegions.find(r => r.id === seg.id);
            const hexColor = seg.color || '#8b5cf6';
            const rVal = parseInt(hexColor.slice(1, 3), 16);
            const gVal = parseInt(hexColor.slice(3, 5), 16);
            const bVal = parseInt(hexColor.slice(5, 7), 16);
            const rgba = `rgba(${rVal}, ${gVal}, ${bVal}, 0.35)`;

            if (existing) {
                if (existing.start !== seg.start || existing.end !== seg.end) {
                    try { existing.setOptions({ start: seg.start, end: seg.end, color: rgba }); } catch (e) { }
                }
            } else {
                try {
                    plugin.addRegion({
                        id: seg.id,
                        start: seg.start,
                        end: seg.end,
                        color: rgba,
                        drag: true,
                        resize: true
                    });
                } catch (e) { }
            }
        });
    }, [segments, isReady]);

    // 4. Handle region updates (drag/resize)
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;

        const handleUpdate = (region: Region) => {
            if (region.id === '__ghost_segment__') return;
            useProjectStore.getState().updateSegment(region.id, {
                start: region.start,
                end: region.end
            });
        };

        regionsPlugin.current.on('region-updated', handleUpdate);
        return () => regionsPlugin.current?.un('region-updated', handleUpdate);
    }, [isReady]);

    // 5. Draw ghost segment (OPTIMIZED: only recreation when necessary)
    useEffect(() => {
        if (!regionsPlugin.current || !isReady) return;
        const ghostId = '__ghost_segment__';
        const plugin = regionsPlugin.current;

        if (isRecording && activeSegmentStart !== null && currentTime > activeSegmentStart) {
            const existing = plugin.getRegions().find(r => r.id === ghostId);
            if (existing) {
                try { existing.setOptions({ start: activeSegmentStart, end: currentTime }); } catch (e) { }
            } else {
                try {
                    plugin.addRegion({
                        id: ghostId,
                        start: activeSegmentStart,
                        end: currentTime,
                        color: 'rgba(239, 68, 68, 0.4)',
                        drag: false,
                        resize: false,
                    });
                } catch (e) { }
            }
        } else {
            const existing = plugin.getRegions().find(r => r.id === ghostId);
            if (existing) try { existing.remove(); } catch (e) { }
        }
    }, [isRecording, activeSegmentStart, currentTime, isReady]);

    // 6. Sync Time & Playback
    useEffect(() => {
        if (!wavesurfer.current || !isReady) return;

        // Playback state
        if (isPlaying && !wavesurfer.current.isPlaying()) {
            wavesurfer.current.play().catch(() => { });
        } else if (!isPlaying && wavesurfer.current.isPlaying()) {
            wavesurfer.current.pause();
        }

        // Current time (only seek if diff > 100ms)
        const wsTime = wavesurfer.current.getCurrentTime();
        if (Math.abs(wsTime - currentTime) > 0.1) {
            wavesurfer.current.setTime(currentTime);
        }
    }, [isPlaying, currentTime, isReady]);

    // 7. Pinch-to-zoom & Wheel zoom (Refactored for efficiency)
    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const setZoom = useProjectStore.getState().setZoom;

        let initialDistance = 0;
        let initialZoom = 0;

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
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const scale = currentDistance / initialDistance;
                setZoom(Math.max(5, Math.min(200, Math.round(initialZoom * scale))));
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                const currentZoom = useProjectStore.getState().zoom;
                const delta = e.deltaY > 0 ? -10 : 10;
                setZoom(Math.max(5, Math.min(200, currentZoom + delta)));
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <div className="w-full h-full bg-black/50 border-t border-b border-neon-purple/30 backdrop-blur-sm relative touch-none">
            <div ref={containerRef} className="w-full h-full" />

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
});
Waveform.displayName = 'Waveform';
