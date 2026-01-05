import { useEffect, useRef, useState, memo } from 'react';
import { Trash2, Clock, Image, Play, Upload, ChevronDown, ChevronRight, Star, CircleDot } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';
import { PromptBuilder } from './PromptBuilder';

export const SegmentList = memo(() => {
    const segments = useProjectStore(state => state.segments);
    const activeSegmentId = useProjectStore(state => state.activeSegmentId);
    const isPlaying = useProjectStore(state => state.isPlaying);

    const setActiveSegmentId = useProjectStore(state => state.setActiveSegmentId);
    const deleteSegment = useProjectStore(state => state.deleteSegment);
    const updateSegment = useProjectStore(state => state.updateSegment);
    const setCurrentTime = useProjectStore(state => state.setCurrentTime);
    const setIsPlaying = useProjectStore(state => state.setIsPlaying);

    const listRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // Auto-highlight and scroll to active segment
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            const { currentTime, segments: segs, activeSegmentId: activeId } = useProjectStore.getState();
            const active = segs.find(s => currentTime >= s.start && currentTime < s.end);

            if (active && activeId !== active.id) {
                setActiveSegmentId(active.id);

                if (listRef.current) {
                    const el = listRef.current.querySelector(`[data-seg-id="${active.id}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    }
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isPlaying, setActiveSegmentId]);

    const handleJumpTo = (time: number) => {
        setCurrentTime(time);
        setIsPlaying(true);
    };

    const handleImageUpload = (segId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            updateSegment(segId, { thumbnail: dataUrl });
        };
        reader.readAsDataURL(file);
    };

    const toggleExpand = (segId: string) => {
        setExpandedId(expandedId === segId ? null : segId);
    };

    return (
        <div className="h-full flex flex-col bg-cyber-gray">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40">
                <h2 className="text-lg font-bold text-neon-purple tracking-widest flex items-center gap-2">
                    <Clock size={18} className="opacity-60" />
                    GUIÓN
                </h2>
                <span className="text-xs font-mono bg-neon-purple/20 text-neon-purple px-2 py-1 rounded">
                    {segments.length} Kues
                </span>
            </div>

            {/* Segment List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-neon-purple/20">
                {segments.map((seg, idx) => {
                    const isExpanded = expandedId === seg.id;
                    const isActive = activeSegmentId === seg.id;
                    
                    return (
                        <div
                            key={seg.id}
                            data-seg-id={seg.id}
                            className={`
                                rounded-lg border transition-all overflow-hidden
                                ${isActive
                                    ? 'border-white/30'
                                    : 'border-white/5 hover:border-white/20'
                                }
                            `}
                            style={{
                                boxShadow: isActive ? `0 0 10px ${seg.color || '#8b5cf6'}40` : 'none'
                            }}
                        >
                            {/* Compact Row - Always visible */}
                            <div 
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5"
                                onClick={() => toggleExpand(seg.id)}
                            >
                                {/* Expand Arrow */}
                                <button className="text-white/40 hover:text-white shrink-0">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                
                                {/* Color + Number */}
                                <div 
                                    className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm shrink-0"
                                    style={{ backgroundColor: seg.color || '#8b5cf6' }}
                                >
                                    {idx + 1}
                                </div>
                                
                                {/* Hero/Fill indicator */}
                                {seg.isHero ? (
                                    <Star size={12} className="text-yellow-400 shrink-0" />
                                ) : (
                                    <CircleDot size={12} className="text-white/30 shrink-0" />
                                )}
                                
                                {/* Time Range */}
                                <div className="font-mono text-xs text-white/60 shrink-0">
                                    {formatTime(seg.start)}
                                </div>
                                
                                {/* Note preview */}
                                <div className="flex-1 text-sm text-white/70 truncate">
                                    {seg.prompt?.subject || seg.note || <span className="text-white/30 italic">Sin descripción</span>}
                                </div>
                                
                                {/* Duration */}
                                <div className="text-xs font-mono text-white/40 shrink-0">
                                    {(seg.end - seg.start).toFixed(1)}s
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleJumpTo(seg.start); }}
                                        className="p-1.5 rounded hover:bg-neon-purple/20 text-white/50 hover:text-neon-purple transition-colors"
                                        title="Reproducir"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Expanded Content - Prompt Builder */}
                            {isExpanded && (
                                <div className="border-t border-white/10">
                                    {/* Thumbnail Section */}
                                    <div className="p-3 bg-black/20">
                                        <div 
                                            className="relative aspect-video rounded-lg overflow-hidden cursor-pointer"
                                            style={{ backgroundColor: `${seg.color || '#8b5cf6'}20` }}
                                        >
                                            {seg.thumbnail ? (
                                                <img
                                                    src={seg.thumbnail}
                                                    alt={`Storyboard ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                    onClick={() => handleJumpTo(seg.start)}
                                                />
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                                    <Upload size={32} className="text-white/20 mb-2" />
                                                    <span className="text-xs text-white/30">Click para subir imagen de referencia</span>
                                                    <input
                                                        id={`image-upload-${seg.id}`}
                                                        name={`image-upload-${seg.id}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload(seg.id, e)}
                                                        ref={(el) => { if (el) fileInputRefs.current.set(seg.id, el); }}
                                                    />
                                                </label>
                                            )}
                                            
                                            {seg.thumbnail && (
                                                <button
                                                    onClick={() => fileInputRefs.current.get(seg.id)?.click()}
                                                    className="absolute bottom-2 right-2 p-2 bg-black/60 rounded text-white/70 hover:text-white transition-colors"
                                                    title="Cambiar imagen"
                                                >
                                                    <Image size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Prompt Builder */}
                                    <div className="p-3">
                                        <PromptBuilder segment={seg} segmentNumber={idx + 1} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {segments.length === 0 && (
                    <div className="text-center text-white/20 mt-10 font-mono text-sm py-8 border border-dashed border-white/10 rounded-lg">
                        <div className="text-3xl mb-3">🎬</div>
                        <div className="mb-2">Aún no hay Kues</div>
                        <div className="text-xs text-white/40">
                            Presiona KUE para crear cortes
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
SegmentList.displayName = 'SegmentList';
