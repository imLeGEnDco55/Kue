import { memo, useState, useRef } from 'react';
import {
  Play, Pause, Square, Undo2, Scissors, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useKueButton } from '../../hooks/useKueButton';

interface ControlBarProps {
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
  showMobileDrawer: boolean;
  setShowMobileDrawer: (show: boolean) => void;
}

export const ControlBar = memo(({ 
  showLyrics, 
  setShowLyrics, 
  showMobileDrawer, 
  setShowMobileDrawer 
}: ControlBarProps) => {
  const isPlaying = useProjectStore(state => state.isPlaying);
  const currentTime = useProjectStore(state => state.currentTime);
  const segments = useProjectStore(state => state.segments);
  const setIsPlaying = useProjectStore(state => state.setIsPlaying);
  const setCurrentTime = useProjectStore(state => state.setCurrentTime);
  const undo = useProjectStore(state => state.undo);
  const canUndo = useProjectStore(state => state.canUndo);
  const showToast = useProjectStore(state => state.showToast);

  const { 
    isLongPressing, 
    handlePress, 
    handleRelease, 
    handleCancel 
  } = useKueButton();

  // Smart Stop: track if we're at a Kue end
  const [lastStopWasEnd, setLastStopWasEnd] = useState(false);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUndo = () => {
    if (undo()) {
      showToast('Deshecho');
    }
  };

  /**
   * Smart Stop behavior:
   * 1st tap: Go to the END of the current/nearest Kue (or last Kue if none)
   * 2nd tap (within 1 second): Go to time 0
   */
  const handleSmartStop = () => {
    setIsPlaying(false);

    // If we just went to a Kue end, now go to start
    if (lastStopWasEnd) {
      setCurrentTime(0);
      setLastStopWasEnd(false);
      showToast('⏮ Inicio');
      return;
    }

    // Find the nearest Kue end
    if (segments.length > 0) {
      // Sort segments by start time
      const sorted = [...segments].sort((a, b) => a.start - b.start);
      
      // Find current Kue or the last one
      let targetTime = 0;
      let targetKue = null;

      // First, check if we're inside a Kue
      for (const seg of sorted) {
        if (currentTime >= seg.start && currentTime < seg.end) {
          targetTime = seg.end;
          targetKue = seg;
          break;
        }
      }

      // If not inside any Kue, find the nearest Kue end after current time
      if (!targetKue) {
        for (const seg of sorted) {
          if (seg.end > currentTime) {
            targetTime = seg.end;
            targetKue = seg;
            break;
          }
        }
      }

      // If still no target, go to the last Kue's end
      if (!targetKue && sorted.length > 0) {
        targetTime = sorted[sorted.length - 1].end;
        targetKue = sorted[sorted.length - 1];
      }

      if (targetKue) {
        const kueNum = useProjectStore.getState().getSegmentNumber(targetKue.id);
        setCurrentTime(targetTime);
        showToast(`⏹ Fin Kue #${kueNum}`);
        setLastStopWasEnd(true);

        // Reset after 1 second
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = setTimeout(() => {
          setLastStopWasEnd(false);
        }, 1000);
        return;
      }
    }

    // Default: go to start
    setCurrentTime(0);
    showToast('⏮ Inicio');
  };

  return (
    <div className="h-14 border-t border-white/10 bg-black/80 flex items-center justify-center gap-3 md:gap-4 shrink-0 px-3">

      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>

      {/* SMART STOP - 1st tap: end of Kue, 2nd tap: start */}
      <button
        onClick={handleSmartStop}
        className={`p-2.5 rounded-lg transition-all ${
          lastStopWasEnd 
            ? 'bg-red-500/30 text-red-400 ring-1 ring-red-500/50' 
            : 'bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400'
        }`}
        title={lastStopWasEnd ? "Toca de nuevo para ir al inicio" : "Ir al fin del Kue actual"}
      >
        <Square size={16} fill="currentColor" />
      </button>

      {/* KUE BUTTON */}
      <button
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onMouseLeave={handleCancel}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        className={`
          flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-base transition-all
          active:scale-95 shadow-lg select-none
          ${isLongPressing
            ? 'bg-linear-to-r from-green-500 to-green-700 text-white shadow-green-500/30'
            : 'bg-linear-to-r from-neon-purple to-pink-600 text-white shadow-neon-purple/30 hover:scale-105'
          }
        `}
      >
        <Scissors size={18} />
        KUE
      </button>

      {/* Undo */}
      <button
        onClick={handleUndo}
        disabled={!canUndo()}
        className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        title="Deshacer"
      >
        <Undo2 size={18} />
      </button>

      {/* Lyrics Toggle */}
      <button
        onClick={() => setShowLyrics(!showLyrics)}
        className={`p-2.5 rounded-lg transition-all ${showLyrics ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-neon-purple'}`}
        title="Mostrar/ocultar lyrics de referencia"
      >
        <FileText size={18} />
      </button>

      {/* Expand list - changed icon hint */}
      <button
        onClick={() => setShowMobileDrawer(!showMobileDrawer)}
        className={`p-2.5 rounded-lg transition-all ${showMobileDrawer ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-neon-purple'}`}
        title="Ver prompts/guión"
      >
        {showMobileDrawer ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
    </div>
  );
});

ControlBar.displayName = 'ControlBar';
