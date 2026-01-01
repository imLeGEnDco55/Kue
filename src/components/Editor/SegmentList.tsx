import { useEffect, useRef, useState } from 'react';
import { Trash2, Clock, Image, Play, Palette, Upload, Copy, Check } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';

// Preset colors for quick selection
const PRESET_COLORS = [
    '#8b5cf6', // Purple (default)
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

export const SegmentList = () => {
    const {
        segments,
        currentTime,
        activeSegmentId,
        setActiveSegmentId,
        deleteSegment,
        updateSegment,
        setCurrentTime,
        setIsPlaying
    } = useProjectStore();

    const listRef = useRef<HTMLDivElement>(null);
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // Auto-highlight and scroll to active segment during playback
    useEffect(() => {
        const active = segments.find(s => currentTime >= s.start && currentTime < s.end);
        if (active && activeSegmentId !== active.id) {
            setActiveSegmentId(active.id);

            const el = document.getElementById(`seg-${active.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentTime, segments, activeSegmentId, setActiveSegmentId]);

    // Jump to time
    const handleJumpTo = (time: number) => {
        setCurrentTime(time);
        setIsPlaying(true);
    };

    // Handle image upload for storyboard
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

    // Handle color change
    const handleColorChange = (segId: string, color: string) => {
        updateSegment(segId, { color });
        setColorPickerOpen(null);
    };

    // Copy prompt for Veo (optimized format)
    const handleCopyForVeo = async (seg: typeof segments[0]) => {
        const duration = (seg.end - seg.start).toFixed(1);
        const prompt = seg.note
            ? `Cinematic shot, ${seg.note}, duration ${duration}s`
            : `[Agrega descripción], duration ${duration}s`;

        await navigator.clipboard.writeText(prompt);
        setCopiedId(seg.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-cyber-gray">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40">
                <h2 className="text-lg font-bold text-neon-purple tracking-widest flex items-center gap-2">
                    <Clock size={18} className="opacity-60" />
                    KUES
                </h2>
                <span className="text-xs font-mono bg-neon-purple/20 text-neon-purple px-2 py-1 rounded">
                    {segments.length}
                </span>
            </div>

            {/* Segment List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-neon-purple/20">
                {segments.map((seg, idx) => (
                    <div
                        key={seg.id}
                        id={`seg-${seg.id}`}
                        className={`
                            group rounded-xl border-2 transition-all overflow-hidden
                            ${activeSegmentId === seg.id
                                ? 'shadow-lg'
                                : 'hover:border-white/30'
                            }
                        `}
                        style={{
                            borderColor: activeSegmentId === seg.id ? seg.color || '#8b5cf6' : 'rgba(255,255,255,0.05)',
                            boxShadow: activeSegmentId === seg.id ? `0 0 20px ${seg.color || '#8b5cf6'}40` : 'none'
                        }}
                    >
                        {/* Thumbnail/Storyboard Section */}
                        <div
                            className="relative aspect-video overflow-hidden cursor-pointer"
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
                                    <Upload size={24} className="text-white/30 mb-2" />
                                    <span className="text-xs text-white/40">Subir imagen</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(seg.id, e)}
                                        ref={(el) => { if (el) fileInputRefs.current.set(seg.id, el); }}
                                    />
                                </label>
                            )}

                            {/* Overlay controls - always visible on mobile, hover on desktop */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                                <button
                                    onClick={() => handleJumpTo(seg.start)}
                                    className="p-2 rounded-full text-white hover:scale-110 transition-transform"
                                    style={{ backgroundColor: seg.color || '#8b5cf6' }}
                                    title="Reproducir desde aquí"
                                >
                                    <Play size={14} fill="currentColor" />
                                </button>

                                <div className="flex gap-1">
                                    {/* Color picker button */}
                                    <button
                                        onClick={() => setColorPickerOpen(colorPickerOpen === seg.id ? null : seg.id)}
                                        className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-all"
                                        title="Cambiar color"
                                    >
                                        <Palette size={14} />
                                    </button>

                                    {/* Upload new image */}
                                    <button
                                        onClick={() => fileInputRefs.current.get(seg.id)?.click()}
                                        className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-all"
                                        title="Cambiar imagen"
                                    >
                                        <Image size={14} />
                                    </button>

                                    <button
                                        onClick={() => deleteSegment(seg.id)}
                                        className="p-2 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                        title="Eliminar corte"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Color picker dropdown */}
                            {colorPickerOpen === seg.id && (
                                <div className="absolute bottom-12 right-2 bg-black/90 p-2 rounded-lg border border-white/20 flex gap-1 flex-wrap w-36 z-10">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => handleColorChange(seg.id, color)}
                                            className="w-6 h-6 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Time badge - top left */}
                            <div
                                className="absolute top-2 left-2 font-mono text-xs px-2 py-1 rounded backdrop-blur-sm text-white"
                                style={{ backgroundColor: `${seg.color || '#8b5cf6'}cc` }}
                            >
                                {formatTime(seg.start)}
                            </div>

                            {/* Duration badge - top right */}
                            <div className="absolute top-2 right-2 font-mono text-xs bg-black/70 text-white/80 px-2 py-1 rounded backdrop-blur-sm">
                                {(seg.end - seg.start).toFixed(3)}s
                            </div>
                        </div>

                        {/* Note Input + Copy Button */}
                        <div className="p-3 border-t border-white/5 flex items-center gap-2">
                            {/* Color indicator */}
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: seg.color || '#8b5cf6' }}
                            />

                            <input
                                value={seg.note}
                                onChange={(e) => updateSegment(seg.id, { note: e.target.value })}
                                placeholder={`Prompt para Veo...`}
                                className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30 placeholder:italic"
                            />

                            {/* Copy for Veo button */}
                            <button
                                onClick={() => handleCopyForVeo(seg)}
                                className={`p-2 rounded-lg transition-all ${copiedId === seg.id
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 text-white/50 hover:bg-neon-purple hover:text-white'
                                    }`}
                                title="Copiar prompt para Veo"
                            >
                                {copiedId === seg.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                ))}

                {segments.length === 0 && (
                    <div className="text-center text-white/20 mt-10 font-mono text-sm py-8 border border-dashed border-white/10 rounded-lg">
                        <div className="text-3xl mb-3">🎬</div>
                        <div className="mb-2">Aún no hay Kues</div>
                        <div className="text-xs text-white/40">
                            Presiona INICIAR o doble-click en la onda
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
