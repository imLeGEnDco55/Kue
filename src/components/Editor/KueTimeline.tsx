import { memo, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Trash2 } from 'lucide-react';

/**
 * KueTimeline - Horizontal track of Kues below the waveform
 * FULLY SYNCHRONIZED: zoom + scroll with waveform
 */
export const KueTimeline = memo(() => {
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const duration = useProjectStore(state => state.duration);
    const zoom = useProjectStore(state => state.zoom);
    const currentTime = useProjectStore(state => state.currentTime);

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const deleteSegment = useProjectStore(state => state.deleteSegment);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync scroll with waveform (via currentTime)
    useEffect(() => {
        if (!scrollRef.current || !duration) return;
        const timelineWidth = duration * zoom;
        const containerWidth = scrollRef.current.clientWidth;
        const scrollPosition = (currentTime / duration) * timelineWidth - containerWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, scrollPosition);
    }, [currentTime, zoom, duration]);

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
            <div className="h-16 bg-cyber-gray border-t border-neon-purple/30 flex items-center justify-center">
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

    const timelineWidth = duration * zoom;

    return (
        <div
            ref={containerRef}
            className="h-16 bg-cyber-gray border-t border-neon-purple/30 flex flex-col shrink-0 touch-none"
        >
            {/* Timeline Track - Synced with waveform */}
            <div
                ref={scrollRef}
                className="flex-1 relative overflow-x-auto overflow-y-hidden scrollbar-hide"
            >
                <div
                    className="h-full relative"
                    style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
                >
                    {/* Playhead indicator */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-pink-500 z-20 pointer-events-none"
                        style={{ left: `${(currentTime / duration) * timelineWidth}px` }}
                    />

                    {segments.map((seg, idx) => {
                        const left = (seg.start / duration) * timelineWidth;
                        const width = ((seg.end - seg.start) / duration) * timelineWidth;
                        const isActive = activeSegmentId === seg.id;

                        return (
                            <div
                                key={seg.id}
                                onClick={() => handleClick(seg)}
                                className={`
                                    absolute top-1 bottom-1 rounded cursor-pointer
                                    flex items-center justify-between px-1.5 overflow-hidden
                                    transition-shadow group
                                    ${isActive ? 'ring-2 ring-white shadow-lg z-10' : 'hover:brightness-110'}
                                `}
                                style={{
                                    left: `${left}px`,
                                    width: `${Math.max(24, width)}px`,
                                    backgroundColor: seg.color || '#8b5cf6',
                                }}
                            >
                                {/* Content */}
                                <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
                                    {seg.thumbnail && width > 40 ? (
                                        <img
                                            src={seg.thumbnail}
                                            alt=""
                                            className="w-5 h-4 object-cover rounded shrink-0"
                                        />
                                    ) : null}
                                    {width > 24 && (
                                        <span className="text-[9px] font-mono text-white/90 truncate">
                                            {seg.note || `${idx + 1}`}
                                        </span>
                                    )}
                                </div>

                                {/* Delete on hover */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                                    className="p-0.5 bg-red-500/0 rounded text-white/0 group-hover:bg-red-500/60 group-hover:text-white transition-all shrink-0"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
KueTimeline.displayName = 'KueTimeline';
