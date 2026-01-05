import { memo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Trash2 } from 'lucide-react';

/**
 * KueOverlay - Kues rendered as overlays on top of the waveform
 * Uses absolute positioning inside the waveform container
 * No separate scroll/zoom handlers - inherits from parent
 */
export const KueOverlay = memo(() => {
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const duration = useProjectStore(state => state.duration);

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const deleteSegment = useProjectStore(state => state.deleteSegment);

    if (segments.length === 0 || duration === 0) return null;

    const handleClick = (e: React.MouseEvent, seg: typeof segments[0]) => {
        e.stopPropagation();
        setActiveSegmentId(seg.id);
        setCurrentTime(seg.start);
        setIsPlaying(true);
    };

    return (
        <>
            {segments.map((seg, idx) => {
                const leftPercent = (seg.start / duration) * 100;
                const widthPercent = ((seg.end - seg.start) / duration) * 100;
                const isActive = activeSegmentId === seg.id;

                return (
                    <div
                        key={seg.id}
                        onClick={(e) => handleClick(e, seg)}
                        className={`
                            absolute top-1 cursor-pointer
                            flex items-center justify-between px-1 overflow-hidden
                            transition-all group rounded-t-md
                            ${isActive
                                ? 'ring-1 ring-white z-20 brightness-110'
                                : 'hover:brightness-125 z-10'
                            }
                        `}
                        style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(1.5, widthPercent)}%`,
                            height: '24px',
                            backgroundColor: `${seg.color || '#8b5cf6'}cc`, // Semi-transparent
                            borderBottom: `2px solid ${seg.color || '#8b5cf6'}`,
                        }}
                    >
                        {/* Kue Number - always visible */}
                        <span className="text-[9px] font-bold font-mono text-white bg-black/40 px-1 rounded shrink-0">
                            #{idx + 1}
                        </span>
                        
                        {/* Note - only show if wide enough and has content */}
                        {widthPercent > 8 && seg.note && (
                            <span className="text-[8px] font-mono text-white/70 truncate ml-1">
                                {seg.note}
                            </span>
                        )}

                        {/* Delete on hover */}
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                            className="p-0.5 rounded text-white/0 group-hover:text-white group-hover:bg-red-500/60 transition-all shrink-0"
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                );
            })}
        </>
    );
});
KueOverlay.displayName = 'KueOverlay';
