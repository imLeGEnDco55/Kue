import { Plus, Trash2 } from 'lucide-react';
import { useProjectStore, type Segment } from '../../store/useProjectStore';

export const SegmentList = () => {
    const { segments, currentTime, addSegment, deleteSegment, updateSegment } = useProjectStore();

    const handleCreateSegment = () => {
        const newSegment: Segment = {
            id: crypto.randomUUID(),
            start: currentTime,
            end: currentTime + 5, // Default 5s
            note: 'New Cut',
            color: '#8b5cf6'
        };
        addSegment(newSegment);
    };

    return (
        <div className="h-full flex flex-col bg-cyber-gray border-l border-neon-purple/30 p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-neon-purple tracking-widest">SEGMENTS</h2>
                <button
                    onClick={handleCreateSegment}
                    className="p-2 bg-neon-purple text-black rounded hover:bg-white transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {segments.map((seg) => (
                    <div
                        key={seg.id}
                        className="group p-3 bg-black/40 border border-white/5 rounded hover:border-neon-purple/50 transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <input
                                value={seg.note}
                                onChange={(e) => updateSegment(seg.id, { note: e.target.value })}
                                className="bg-transparent text-sm font-mono text-white focus:outline-none w-full"
                            />
                            <button
                                onClick={() => deleteSegment(seg.id)}
                                className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex justify-between text-xs text-secondary-text font-mono text-white/50">
                            <span>{seg.start.toFixed(2)}s</span>
                            <span className="text-neon-purple">→</span>
                            <span>{(seg.end - seg.start).toFixed(2)}s</span>
                        </div>
                    </div>
                ))}

                {segments.length === 0 && (
                    <div className="text-center text-white/20 mt-10 font-mono text-sm">
                        NO DATA
                    </div>
                )}
            </div>
        </div>
    );
};
