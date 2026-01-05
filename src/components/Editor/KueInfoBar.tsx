import { memo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';
import type { Segment } from '../../types';

interface KueInfoBarProps {
  currentKue: Segment;
  currentKueNumber: number;
}

export const KueInfoBar = memo(({ currentKue, currentKueNumber }: KueInfoBarProps) => {
  const updateSegment = useProjectStore(state => state.updateSegment);

  return (
    <div className="bg-black/60 border-t border-white/10 px-4 py-2 shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded shrink-0"
            style={{ backgroundColor: currentKue.color || '#8b5cf6' }}
          />
          <span className="text-white font-bold text-sm shrink-0">#{currentKueNumber}</span>
          <span className="text-white/40 text-xs shrink-0 hidden md:inline">
            {formatTime(currentKue.start)} → {formatTime(currentKue.end)}
          </span>
        </div>
        <span className="text-white/60 text-xs font-mono shrink-0">
          {((currentKue.end - currentKue.start)).toFixed(1)}s
        </span>
      </div>
      {/* Editable Note */}
      <input
        type="text"
        value={currentKue.note || ''}
        onChange={(e) => updateSegment(currentKue.id, { note: e.target.value })}
        placeholder="Escribe la nota/lyric de este Kue..."
        className="w-full mt-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/30 outline-none focus:border-neon-purple/50 transition-colors"
      />
    </div>
  );
});

KueInfoBar.displayName = 'KueInfoBar';
