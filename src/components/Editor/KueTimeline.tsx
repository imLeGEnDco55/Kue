import { memo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Trash2, Play } from 'lucide-react';

/**
 * KueTimeline - Horizontal track of Kues below the waveform
 * Like a video editor timeline with clips
 */
export const KueTimeline = memo(() => {
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const duration = useProjectStore(state => state.duration);

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const deleteSegment = useProjectStore(state => state.deleteSegment);

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

    return (
        <div className="h-24 bg-cyber-gray border-t border-neon-purple/30 flex flex-col shrink-0">
            {/* Header */}
            <div className="h-6 flex items-center px-3 border-b border-white/10 bg-black/40">
                <span className="text-xs font-bold text-neon-purple tracking-widest">KUES</span>
                <span className="ml-2 text-xs text-white/40 font-mono">{segments.length}</span>
            </div>

            {/* Timeline Track */}
            <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
                <div
                    className="h-full flex items-stretch gap-0.5 p-1"
                    style={{ minWidth: `${Math.max(100, segments.length * 120)}px` }}
                >
                    {segments.map((seg, idx) => {
                        const widthPercent = ((seg.end - seg.start) / duration) * 100;
                        const isActive = activeSegmentId === seg.id;

                        return (
                            <div
                                key={seg.id}
                                onClick={() => handleClick(seg)}
                                className={`
                                relative shrink-0 rounded cursor-pointer
                                    flex flex-col justify-between p-1.5 overflow-hidden
                                    transition-all group
                                    ${isActive ? 'ring-2 ring-white shadow-lg' : 'hover:brightness-110'}
                                `}
                                style={{
                                    backgroundColor: seg.color || '#8b5cf6',
                                    minWidth: '60px',
                                    width: `${Math.max(60, widthPercent * 3)}px`
                                }}
                            >
                                {/* Thumbnail or Index */}
                                <div className="flex items-center gap-1">
                                    {seg.thumbnail ? (
                                        <img
                                            src={seg.thumbnail}
                                            alt=""
                                            className="w-8 h-5 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded bg-black/30 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                    )}
                                    <span className="text-[10px] font-mono text-white/80 truncate">
                                        {seg.note || `Kue ${idx + 1}`}
                                    </span>
                                </div>

                                {/* Duration */}
                                <div className="text-[9px] font-mono text-white/60">
                                    {(seg.end - seg.start).toFixed(1)}s
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleClick(seg); }}
                                        className="p-1 bg-black/50 rounded text-white hover:bg-black/80"
                                    >
                                        <Play size={10} fill="currentColor" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                                        className="p-1 bg-red-500/50 rounded text-white hover:bg-red-500"
                                    >
                                        <Trash2 size={10} />
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
