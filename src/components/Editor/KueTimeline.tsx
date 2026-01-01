import { memo, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Trash2, Play } from 'lucide-react';

/**
 * KueTimeline - Horizontal track of Kues below the waveform
 * Like a video editor timeline with clips
 * SYNCHRONIZED with waveform zoom!
 */
export const KueTimeline = memo(() => {
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const duration = useProjectStore(state => state.duration);
    const zoom = useProjectStore(state => state.zoom); // SYNC with waveform zoom!

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const deleteSegment = useProjectStore(state => state.deleteSegment);

    const containerRef = useRef<HTMLDivElement>(null);

    // Pinch-to-zoom handler (synced with waveform)
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

    if (segments.length === 0 || duration === 0) {
        return (
            <div className="h-20 bg-cyber-gray border-t border-neon-purple/30 flex items-center justify-center">
                <span className="text-white/30 text-sm font-mono">
                    Presiona GO! para crear Kues
                </span>
            </div>
        );
    }

    const handleClick = (seg: typeof segments[0]) => {
        setActiveSegmentId(seg.id);
        setCurrentTime(seg.start);
        setIsPlaying(true);
    };

    // Calculate total timeline width based on zoom (synced with waveform)
    const timelineWidth = duration * zoom;

    return (
        <div
            ref={containerRef}
            className="h-24 bg-cyber-gray border-t border-neon-purple/30 flex flex-col shrink-0 touch-none"
        >
            {/* Header */}
            <div className="h-6 flex items-center justify-between px-3 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neon-purple tracking-widest">KUES</span>
                    <span className="text-xs text-white/40 font-mono">{segments.length}</span>
                </div>
                <span className="text-[10px] text-white/30 font-mono">zoom: {zoom}x</span>
            </div>

            {/* Timeline Track - Synced width with waveform */}
            <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
                <div
                    className="h-full relative"
                    style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
                >
                    {segments.map((seg, idx) => {
                        // Position and width based on actual time (synced with waveform regions)
                        const left = (seg.start / duration) * timelineWidth;
                        const width = ((seg.end - seg.start) / duration) * timelineWidth;
                        const isActive = activeSegmentId === seg.id;

                        return (
                            <div
                                key={seg.id}
                                onClick={() => handleClick(seg)}
                                className={`
                                    absolute top-1 bottom-1 rounded cursor-pointer
                                    flex flex-col justify-between p-1 overflow-hidden
                                    transition-shadow group
                                    ${isActive ? 'ring-2 ring-white shadow-lg z-10' : 'hover:brightness-110'}
                                `}
                                style={{
                                    left: `${left}px`,
                                    width: `${Math.max(40, width)}px`,
                                    backgroundColor: seg.color || '#8b5cf6',
                                }}
                            >
                                {/* Content - adapts to width */}
                                <div className="flex items-center gap-1 overflow-hidden">
                                    {seg.thumbnail && width > 50 ? (
                                        <img
                                            src={seg.thumbnail}
                                            alt=""
                                            className="w-6 h-4 object-cover rounded shrink-0"
                                        />
                                    ) : null}
                                    {width > 30 && (
                                        <span className="text-[9px] font-mono text-white/90 truncate">
                                            {seg.note || `${idx + 1}`}
                                        </span>
                                    )}
                                </div>

                                {/* Duration - only show if wide enough */}
                                {width > 50 && (
                                    <div className="text-[8px] font-mono text-white/60">
                                        {(seg.end - seg.start).toFixed(1)}s
                                    </div>
                                )}

                                {/* Hover Actions */}
                                <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleClick(seg); }}
                                        className="p-0.5 bg-black/50 rounded text-white hover:bg-black/80"
                                    >
                                        <Play size={8} fill="currentColor" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                                        className="p-0.5 bg-red-500/50 rounded text-white hover:bg-red-500"
                                    >
                                        <Trash2 size={8} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
KueTimeline.displayName = 'KueTimeline';
