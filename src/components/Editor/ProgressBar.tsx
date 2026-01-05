import { memo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';

export const ProgressBar = memo(() => {
  const segments = useProjectStore(state => state.segments);
  const duration = useProjectStore(state => state.duration);
  const currentTime = useProjectStore(state => state.currentTime);

  if (duration <= 0) return null;

  const totalCovered = segments.reduce((acc, s) => acc + (s.end - s.start), 0);

  return (
    <div className="h-8 bg-black/80 border-t border-white/10 flex items-center px-4 gap-3 shrink-0">
      {/* Progress bar showing Kue coverage */}
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden relative">
        {segments.map((seg) => {
          const leftPercent = (seg.start / duration) * 100;
          const widthPercent = ((seg.end - seg.start) / duration) * 100;
          return (
            <div
              key={seg.id}
              className="absolute top-0 h-full rounded-full"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: seg.color || '#8b5cf6',
              }}
            />
          );
        })}
        {/* Current time indicator */}
        <div 
          className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      {/* Stats */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 shrink-0">
        <span className="text-neon-purple">{segments.length} Kues</span>
        <span>•</span>
        <span>{formatTime(totalCovered)} cubiertos</span>
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
