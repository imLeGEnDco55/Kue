import { useRef, useEffect, memo, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useProjectStore, ENVIRONMENT_COLORS } from '../../store/useProjectStore';
import { Trash2, GripVertical, Palette, ImagePlus, Star, CircleDot } from 'lucide-react';

/**
 * Unified Timeline - Kues as the main visual
 * - Larger touch targets for mobile
 * - Color picker and image upload directly on Kues
 * - Blocks scroll when dragging handles
 */
export const Waveform = memo(() => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);

    // Store state
    const videoUrl = useProjectStore(state => state.videoUrl);
    const isPlaying = useProjectStore(state => state.isPlaying);
    const currentTime = useProjectStore(state => state.currentTime);
    const zoom = useProjectStore(state => state.zoom);
    const segments = useProjectStore(state => state.segments);
    const duration = useProjectStore(state => state.duration);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);

    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setDuration = useProjectStore(state => state.setDuration);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);
    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const deleteSegment = useProjectStore(state => state.deleteSegment);
    const updateSegment = useProjectStore(state => state.updateSegment);
    const showToast = useProjectStore(state => state.showToast);
    const cutAtPosition = useProjectStore(state => state.cutAtPosition);

    // Editing state
    const [editMode, setEditMode] = useState<'left' | 'right' | 'junction' | null>(null);
    const [junctionIndex, setJunctionIndex] = useState<number | null>(null);
    const dragStartRef = useRef<{ x: number; originalTime: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Total width in pixels
    const totalWidth = Math.max(duration * zoom, 100);

    // 1. Initialize WaveSurfer (audio only, hidden)
    useEffect(() => {
        if (!videoUrl) return;

        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        document.body.appendChild(hiddenDiv);

        const ws = WaveSurfer.create({
            container: hiddenDiv,
            waveColor: 'transparent',
            progressColor: 'transparent',
            height: 1,
            interact: false,
        });

        wavesurfer.current = ws;
        ws.load(videoUrl);
        ws.setVolume(0);

        ws.on('ready', () => {
            setDuration(ws.getDuration());
            setIsReady(true);
        });

        let lastUpdate = 0;
        ws.on('audioprocess', (t) => {
            const now = Date.now();
            if (now - lastUpdate > 50) {
                setCurrentTime(t);
                lastUpdate = now;
            }
        });

        return () => {
            try { ws.destroy(); } catch (e) { }
            wavesurfer.current = null;
            try { document.body.removeChild(hiddenDiv); } catch (e) { }
            setIsReady(false);
        };
    }, [videoUrl]);

    // 2. Sync playback state
    useEffect(() => {
        if (!wavesurfer.current || !isReady) return;
        if (isPlaying && !wavesurfer.current.isPlaying()) {
            wavesurfer.current.play().catch(() => { });
        } else if (!isPlaying && wavesurfer.current.isPlaying()) {
            wavesurfer.current.pause();
        }
    }, [isPlaying, isReady]);

    // 3. Sync seek
    useEffect(() => {
        if (!wavesurfer.current || !isReady) return;
        const wsTime = wavesurfer.current.getCurrentTime();
        if (Math.abs(wsTime - currentTime) > 0.1) {
            wavesurfer.current.setTime(currentTime);
        }
    }, [currentTime, isReady]);

    // 4. Auto-scroll to keep playhead visible
    useEffect(() => {
        if (!scrollRef.current || !isPlaying || isDragging) return;
        const playheadPx = currentTime * zoom;
        const container = scrollRef.current;
        const viewWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        if (playheadPx > scrollLeft + viewWidth - 50) {
            container.scrollLeft = playheadPx - viewWidth / 2;
        }
        if (playheadPx < scrollLeft + 50) {
            container.scrollLeft = Math.max(0, playheadPx - 50);
        }
    }, [currentTime, zoom, isPlaying, isDragging]);

    // 5. Handle click on timeline to seek
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!scrollRef.current || isDragging) return;
        // Don't seek if clicking on a Kue or color picker
        if ((e.target as HTMLElement).closest('.kue-block') || (e.target as HTMLElement).closest('.color-picker')) return;
        
        const rect = scrollRef.current.getBoundingClientRect();
        const scrollLeft = scrollRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        const clickTime = clickX / zoom;
        if (clickTime >= 0 && clickTime <= duration) {
            setCurrentTime(clickTime);
        }
    };

    // 6. Handle double-click to cut
    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        if ((e.target as HTMLElement).closest('.kue-block')) return;
        
        const rect = scrollRef.current.getBoundingClientRect();
        const scrollLeft = scrollRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        const clickTime = clickX / zoom;
        if (clickTime >= 0 && clickTime <= duration) {
            const newSeg = cutAtPosition(clickTime);
            if (newSeg) {
                const segNum = useProjectStore.getState().getSegmentNumber(newSeg.id);
                showToast(`Kue #${segNum} creado`);
            }
        }
    };

    // 7. Wheel zoom
    useEffect(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
        const setZoom = useProjectStore.getState().setZoom;

        const handleWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                const currentZoom = useProjectStore.getState().zoom;
                const delta = e.deltaY > 0 ? -5 : 5;
                setZoom(Math.max(5, Math.min(200, currentZoom + delta)));
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // 8. Pinch to zoom
    useEffect(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
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

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    // === KUE INTERACTION ===

    const handleKueClick = (e: React.MouseEvent, seg: typeof segments[0]) => {
        e.stopPropagation();
        if (activeSegmentId === seg.id) {
            setActiveSegmentId(null);
            setShowColorPicker(null);
        } else {
            setActiveSegmentId(seg.id);
            setCurrentTime(seg.start);
            setIsPlaying(false);
            setShowColorPicker(null);
        }
    };

    const activeSeg = segments.find(s => s.id === activeSegmentId);
    const activeIdx = activeSeg ? segments.indexOf(activeSeg) : -1;
    const prevSeg = activeIdx > 0 ? segments[activeIdx - 1] : null;
    const nextSeg = activeIdx < segments.length - 1 ? segments[activeIdx + 1] : null;

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, mode: 'left' | 'right' | 'junction', junctionIdx?: number) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        let originalTime = 0;
        if (mode === 'left' && activeSeg) {
            originalTime = activeSeg.start;
        } else if (mode === 'right' && activeSeg) {
            originalTime = activeSeg.end;
        } else if (mode === 'junction' && junctionIdx !== undefined) {
            originalTime = segments[junctionIdx].end;
        }
        
        dragStartRef.current = { x: clientX, originalTime };
        setEditMode(mode);
        if (junctionIdx !== undefined) setJunctionIndex(junctionIdx);

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (!dragStartRef.current) return;
            moveEvent.preventDefault(); // Block scroll
            
            const currentX = 'touches' in moveEvent 
                ? (moveEvent as TouchEvent).touches[0]?.clientX ?? dragStartRef.current.x
                : (moveEvent as MouseEvent).clientX;
            
            const deltaX = currentX - dragStartRef.current.x;
            const deltaTime = deltaX / zoom;
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
            setIsDragging(false);
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

    // Handle color change
    const handleColorChange = (segId: string, colorIdx: number, isHero: boolean) => {
        const env = ENVIRONMENT_COLORS[colorIdx];
        updateSegment(segId, {
            color: isHero ? env.hero : env.fill,
            colorName: env.name,
            isHero: isHero,
        });
        setShowColorPicker(null);
        showToast(`Color: ${env.name} (${isHero ? 'Hero' : 'Fill'})`);
    };

    // Handle image upload - Force 16:9 aspect ratio
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingFor) return;

        const img = new Image();
        img.onload = () => {
            // Create canvas with 16:9 aspect ratio
            const canvas = document.createElement('canvas');
            const targetWidth = 640;
            const targetHeight = 360; // 16:9
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d')!;

            // Calculate crop to center the image in 16:9
            const imgRatio = img.width / img.height;
            const targetRatio = 16 / 9;
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (imgRatio > targetRatio) {
                // Image is wider, crop sides
                sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2;
            } else {
                // Image is taller, crop top/bottom
                sHeight = img.width / targetRatio;
                sy = (img.height - sHeight) / 2;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            updateSegment(uploadingFor, { thumbnail: dataUrl });
            showToast('Imagen 16:9 ✓');
            setUploadingFor(null);
        };
        img.src = URL.createObjectURL(file);
        e.target.value = '';
    };

    const triggerImageUpload = (segId: string) => {
        setUploadingFor(segId);
        fileInputRef.current?.click();
    };

    // Find junctions
    const junctions: number[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
        if (Math.abs(segments[i].end - segments[i + 1].start) < 0.05) {
            junctions.push(i);
        }
    }

    return (
        <div 
            ref={containerRef}
            className="w-full h-full bg-black/80 border-t border-b border-neon-purple/30 relative"
        >
            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* Scrollable timeline - TALLER for easier touch */}
            <div
                ref={scrollRef}
                className={`w-full h-full overflow-x-auto overflow-y-hidden cursor-pointer ${isDragging ? 'overflow-hidden' : ''}`}
                onClick={handleTimelineClick}
                onDoubleClick={handleDoubleClick}
            >
                <div 
                    className="relative h-full"
                    style={{ width: `${totalWidth}px`, minWidth: '100%' }}
                >
                    {/* Time markers - TALLER */}
                    {isReady && Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                        <div
                            key={`marker-${i}`}
                            className="absolute top-0 h-full border-l border-white/10"
                            style={{ left: `${i * zoom}px` }}
                        >
                            <span className="absolute top-1 left-1 text-[10px] text-white/40 font-mono">
                                {Math.floor(i / 60)}:{String(i % 60).padStart(2, '0')}
                            </span>
                        </div>
                    ))}

                    {/* KUE BLOCKS - with thumbnail, color picker, image upload */}
                    {segments.map((seg, idx) => {
                        const leftPx = seg.start * zoom;
                        const widthPx = Math.max(40, (seg.end - seg.start) * zoom);
                        const isActive = activeSegmentId === seg.id;

                        return (
                            <div
                                key={seg.id}
                                onClick={(e) => handleKueClick(e, seg)}
                                className={`
                                    kue-block absolute top-3 bottom-3 cursor-pointer select-none
                                    flex flex-col overflow-visible transition-all group rounded-lg
                                    ${isActive
                                        ? 'ring-2 ring-white z-30 brightness-110 shadow-xl'
                                        : 'hover:brightness-110 z-10'
                                    }
                                `}
                                style={{
                                    left: `${leftPx}px`,
                                    width: `${widthPx}px`,
                                    backgroundColor: seg.color || '#8b5cf6',
                                    touchAction: isActive ? 'none' : 'auto', // Block scroll when active
                                    backgroundImage: seg.thumbnail ? `url(${seg.thumbnail})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                {/* Thumbnail overlay gradient */}
                                {seg.thumbnail && (
                                    <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent rounded-lg" />
                                )}

                                {/* Top bar: Number + Hero/Fill indicator */}
                                <div className="flex items-center justify-between px-2 py-1 relative z-10">
                                    <span className="text-xs font-bold font-mono text-white bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        #{idx + 1}
                                        {seg.isHero ? (
                                            <Star size={10} className="text-amber-400" fill="currentColor" />
                                        ) : (
                                            <CircleDot size={10} className="text-white/50" />
                                        )}
                                    </span>

                                    {/* Quick actions (only on hover or active) */}
                                    <div className={`flex gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        {/* Color picker trigger */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker === seg.id ? null : seg.id); }}
                                            className="p-1 bg-black/50 rounded hover:bg-white/20 transition-colors"
                                            title="Cambiar color"
                                        >
                                            <Palette size={12} className="text-white" />
                                        </button>
                                        {/* Image upload trigger */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); triggerImageUpload(seg.id); }}
                                            className="p-1 bg-black/50 rounded hover:bg-white/20 transition-colors"
                                            title="Cargar imagen"
                                        >
                                            <ImagePlus size={12} className="text-white" />
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); showToast(`Kue #${idx + 1} eliminado`); }}
                                            className="p-1 bg-red-500/50 rounded hover:bg-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={12} className="text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Note at bottom */}
                                {widthPx > 60 && seg.note && (
                                    <span className="absolute bottom-1 left-2 right-2 text-[10px] font-mono text-white/90 truncate bg-black/30 px-1 rounded z-10">
                                        {seg.note}
                                    </span>
                                )}

                                {/* COLOR PICKER POPUP */}
                                {showColorPicker === seg.id && (
                                    <div 
                                        className="color-picker absolute top-full left-0 mt-1 bg-black/95 border border-white/20 rounded-lg p-2 z-50 shadow-xl"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="text-[9px] text-white/50 mb-1 uppercase">Entorno</div>
                                        <div className="grid grid-cols-4 gap-1">
                                            {ENVIRONMENT_COLORS.map((env, i) => (
                                                <div key={env.name} className="flex flex-col gap-0.5">
                                                    {/* Hero variant */}
                                                    <button
                                                        onClick={() => handleColorChange(seg.id, i, true)}
                                                        className="w-6 h-6 rounded-t border border-white/20 hover:scale-110 transition-transform flex items-center justify-center"
                                                        style={{ backgroundColor: env.hero }}
                                                        title={`${env.name} (Hero)`}
                                                    >
                                                        <Star size={8} className="text-white/70" />
                                                    </button>
                                                    {/* Fill variant */}
                                                    <button
                                                        onClick={() => handleColorChange(seg.id, i, false)}
                                                        className="w-6 h-6 rounded-b border border-white/20 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: env.fill }}
                                                        title={`${env.name} (Fill)`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* HANDLES (only when active) */}
                                {isActive && (
                                    <>
                                        <div
                                            onMouseDown={(e) => handleDragStart(e, 'left')}
                                            onTouchStart={(e) => handleDragStart(e, 'left')}
                                            className={`absolute -left-4 top-0 bottom-0 w-8 flex items-center justify-center cursor-ew-resize bg-white rounded-l-xl shadow-xl hover:scale-105 transition-transform ${editMode === 'left' ? 'bg-amber-400 scale-105' : ''}`}
                                            style={{ touchAction: 'none' }}
                                        >
                                            <GripVertical size={16} className="text-black/70" />
                                        </div>
                                        <div
                                            onMouseDown={(e) => handleDragStart(e, 'right')}
                                            onTouchStart={(e) => handleDragStart(e, 'right')}
                                            className={`absolute -right-4 top-0 bottom-0 w-8 flex items-center justify-center cursor-ew-resize bg-white rounded-r-xl shadow-xl hover:scale-105 transition-transform ${editMode === 'right' ? 'bg-amber-400 scale-105' : ''}`}
                                            style={{ touchAction: 'none' }}
                                        >
                                            <GripVertical size={16} className="text-black/70" />
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Junction Handles */}
                    {junctions.map((jIdx) => {
                        const leftSeg = segments[jIdx];
                        const rightSeg = segments[jIdx + 1];
                        const junctionPx = leftSeg.end * zoom;
                        const isNearActive = activeSegmentId === leftSeg.id || activeSegmentId === rightSeg.id;

                        if (!isNearActive) return null;

                        return (
                            <div
                                key={`junction-${jIdx}`}
                                onMouseDown={(e) => handleDragStart(e, 'junction', jIdx)}
                                onTouchStart={(e) => handleDragStart(e, 'junction', jIdx)}
                                className={`absolute top-2 bottom-2 z-40 cursor-ew-resize flex items-center justify-center rounded-lg transition-all hover:scale-110 ${editMode === 'junction' && junctionIndex === jIdx ? 'bg-amber-400 scale-110' : 'bg-white/90 hover:bg-amber-300'}`}
                                style={{
                                    left: `${junctionPx - 10}px`,
                                    width: '20px',
                                    touchAction: 'none',
                                }}
                                title="Mueve el punto de corte"
                            >
                                <div className="w-1 h-1/2 bg-black/40 rounded" />
                            </div>
                        );
                    })}

                    {/* PLAYHEAD - LARGER for easier touch */}
                    <div 
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)] z-50 pointer-events-none"
                        style={{ left: `${currentTime * zoom}px` }}
                    >
                        {/* Playhead triangle - BIGGER */}
                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-10 border-t-white drop-shadow-lg" />
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {isReady && segments.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/40 text-sm font-mono bg-black/60 px-4 py-3 rounded-lg text-center">
                        <div className="hidden md:block">Doble-click para cortar • Alt + Rueda: Zoom</div>
                        <div className="md:hidden">Toca KUE para cortar • Pellizca: Zoom</div>
                    </div>
                </div>
            )}
        </div>
    );
});

Waveform.displayName = 'Waveform';
