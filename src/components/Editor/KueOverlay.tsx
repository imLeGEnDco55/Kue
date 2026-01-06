import { memo, useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Trash2, GripVertical } from 'lucide-react';

/**
 * KueOverlay - Kues rendered as overlays on top of the waveform
 * Now with CapCut-style handles for editing:
 * - Tap to select (shows handles)
 * - Drag handles to resize
 * - Tap junction of two Kues to edit both at once
 * - Prevents overlapping
 */
export const KueOverlay = memo(() => {
    // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const duration = useProjectStore(state => state.duration);
    const zoom = useProjectStore(state => state.zoom);

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const deleteSegment = useProjectStore(state => state.deleteSegment);
    const updateSegment = useProjectStore(state => state.updateSegment);
    const showToast = useProjectStore(state => state.showToast);

    // State for editing mode
    const [editMode, setEditMode] = useState<'left' | 'right' | 'junction' | null>(null);
    const [junctionIndex, setJunctionIndex] = useState<number | null>(null);
    const dragStartRef = useRef<{ x: number; originalTime: number } | null>(null);

    // Convert pixel position to time (MUST be before any return)
    const pixelToTime = useCallback((deltaX: number) => {
        return deltaX / zoom;
    }, [zoom]);

    // Early return AFTER all hooks
    if (segments.length === 0 || duration === 0) return null;

    // Handle tap on a Kue - select it
    const handleClick = (e: React.MouseEvent, seg: typeof segments[0]) => {
        e.stopPropagation();
        if (activeSegmentId === seg.id) {
            setActiveSegmentId(null);
        } else {
            setActiveSegmentId(seg.id);
            setCurrentTime(seg.start);
            setIsPlaying(false);
        }
    };

    // Find the active segment
    const activeSeg = segments.find(s => s.id === activeSegmentId);
    const activeIdx = activeSeg ? segments.indexOf(activeSeg) : -1;

    // Check if there's an adjacent segment (for junction editing)
    const prevSeg = activeIdx > 0 ? segments[activeIdx - 1] : null;
    const nextSeg = activeIdx < segments.length - 1 ? segments[activeIdx + 1] : null;

    // Handle start dragging
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, mode: 'left' | 'right' | 'junction', junctionIdx?: number) => {
        e.stopPropagation();
        e.preventDefault();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        let originalTime = 0;
        if (mode === 'left' && activeSeg) {
            originalTime = activeSeg.start;
        } else if (mode === 'right' && activeSeg) {
            originalTime = activeSeg.end;
        } else if (mode === 'junction' && junctionIdx !== undefined) {
            const leftSeg = segments[junctionIdx];
            originalTime = leftSeg.end;
        }
        
        dragStartRef.current = { x: clientX, originalTime };
        setEditMode(mode);
        if (junctionIdx !== undefined) {
            setJunctionIndex(junctionIdx);
        }

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (!dragStartRef.current) return;
            
            const currentX = 'touches' in moveEvent 
                ? (moveEvent as TouchEvent).touches[0]?.clientX ?? dragStartRef.current.x
                : (moveEvent as MouseEvent).clientX;
            
            const deltaX = currentX - dragStartRef.current.x;
            const deltaTime = pixelToTime(deltaX);
            let newTime = dragStartRef.current.originalTime + deltaTime;
            
            if (mode === 'left' && activeSeg) {
                const minTime = prevSeg ? prevSeg.end : 0;
                const maxTime = activeSeg.end - 0.5;
                newTime = Math.max(minTime, Math.min(maxTime, newTime));
                updateSegment(activeSeg.id, { start: newTime });
            } else if (mode === 'right' && activeSeg) {
                const minTime = activeSeg.start + 0.5;
                const maxTime = nextSeg ? nextSeg.start : duration;
                newTime = Math.max(minTime, Math.min(maxTime, newTime));
                updateSegment(activeSeg.id, { end: newTime });
            } else if (mode === 'junction' && junctionIdx !== undefined) {
                const leftSeg = segments[junctionIdx];
                const rightSeg = segments[junctionIdx + 1];
                if (leftSeg && rightSeg) {
                    const minTime = leftSeg.start + 0.5;
                    const maxTime = rightSeg.end - 0.5;
                    newTime = Math.max(minTime, Math.min(maxTime, newTime));
                    updateSegment(leftSeg.id, { end: newTime });
                    updateSegment(rightSeg.id, { start: newTime });
                }
            }
        };

        const handleEnd = () => {
            dragStartRef.current = null;
            setEditMode(null);
            setJunctionIndex(null);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            if (navigator.vibrate) navigator.vibrate(20);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    // Find junctions (where two segments touch)
    const junctions: number[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
        if (Math.abs(segments[i].end - segments[i + 1].start) < 0.05) {
            junctions.push(i);
        }
    }

    return (
        <>
            {/* Render Kue segments */}
            {segments.map((seg, idx) => {
                const leftPercent = (seg.start / duration) * 100;
                const widthPercent = ((seg.end - seg.start) / duration) * 100;
                const isActive = activeSegmentId === seg.id;

                return (
                    <div
                        key={seg.id}
                        onClick={(e) => handleClick(e, seg)}
                        className={`
                            absolute top-1 cursor-pointer select-none
                            flex items-center justify-between px-1 overflow-visible
                            transition-all group rounded-t-md
                            ${isActive
                                ? 'ring-2 ring-white z-30 brightness-110'
                                : 'hover:brightness-125 z-10'
                            }
                        `}
                        style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(1.5, widthPercent)}%`,
                            height: '24px',
                            backgroundColor: `${seg.color || '#8b5cf6'}cc`,
                            borderBottom: `2px solid ${seg.color || '#8b5cf6'}`,
                        }}
                    >
                        {/* Kue Number */}
                        <span className="text-[9px] font-bold font-mono text-white bg-black/40 px-1 rounded shrink-0">
                            #{idx + 1}
                        </span>
                        
                        {/* Note */}
                        {widthPercent > 8 && seg.note && (
                            <span className="text-[8px] font-mono text-white/70 truncate ml-1 flex-1">
                                {seg.note}
                            </span>
                        )}

                        {/* Delete button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); showToast(`Kue #${idx + 1} eliminado`); }}
                            className="p-0.5 rounded text-white/0 group-hover:text-white group-hover:bg-red-500/60 transition-all shrink-0"
                        >
                            <Trash2 size={10} />
                        </button>

                        {/* === CAPCUT-STYLE HANDLES (only when selected) === */}
                        {isActive && (
                            <>
                                {/* LEFT HANDLE */}
                                <div
                                    onMouseDown={(e) => handleDragStart(e, 'left')}
                                    onTouchStart={(e) => handleDragStart(e, 'left')}
                                    className={`
                                        absolute -left-2 top-0 bottom-0 w-4 
                                        flex items-center justify-center cursor-ew-resize
                                        bg-white rounded-l-md shadow-lg
                                        transition-transform hover:scale-110
                                        ${editMode === 'left' ? 'bg-neon-purple scale-110' : ''}
                                    `}
                                    style={{ height: '100%' }}
                                >
                                    <GripVertical size={12} className="text-black/60" />
                                </div>

                                {/* RIGHT HANDLE */}
                                <div
                                    onMouseDown={(e) => handleDragStart(e, 'right')}
                                    onTouchStart={(e) => handleDragStart(e, 'right')}
                                    className={`
                                        absolute -right-2 top-0 bottom-0 w-4 
                                        flex items-center justify-center cursor-ew-resize
                                        bg-white rounded-r-md shadow-lg
                                        transition-transform hover:scale-110
                                        ${editMode === 'right' ? 'bg-neon-purple scale-110' : ''}
                                    `}
                                    style={{ height: '100%' }}
                                >
                                    <GripVertical size={12} className="text-black/60" />
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {/* === JUNCTION HANDLES (where two Kues meet) === */}
            {junctions.map((jIdx) => {
                const leftSeg = segments[jIdx];
                const rightSeg = segments[jIdx + 1];
                const junctionTime = leftSeg.end;
                const leftPercent = (junctionTime / duration) * 100;
                
                const isNearActive = activeSegmentId === leftSeg.id || activeSegmentId === rightSeg.id;

                if (!isNearActive) return null;

                return (
                    <div
                        key={`junction-${jIdx}`}
                        onMouseDown={(e) => handleDragStart(e, 'junction', jIdx)}
                        onTouchStart={(e) => handleDragStart(e, 'junction', jIdx)}
                        className={`
                            absolute top-0 z-40 cursor-ew-resize
                            flex items-center justify-center
                            transition-all hover:scale-125
                            ${editMode === 'junction' && junctionIndex === jIdx
                                ? 'bg-amber-400 scale-125'
                                : 'bg-white/90 hover:bg-amber-300'
                            }
                        `}
                        style={{
                            left: `calc(${leftPercent}% - 6px)`,
                            width: '12px',
                            height: '32px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                        title="Arrastra para mover el punto de corte"
                    >
                        <div className="w-0.5 h-4 bg-black/30 rounded" />
                    </div>
                );
            })}
        </>
    );
});
KueOverlay.displayName = 'KueOverlay';
