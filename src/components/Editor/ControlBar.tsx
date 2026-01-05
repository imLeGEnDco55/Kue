import { memo } from 'react';
import {
  Play, Pause, Square, Undo2, Scissors, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';
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
  const duration = useProjectStore(state => state.duration);
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

  const handleUndo = () => {
    if (undo()) {
      showToast('Deshecho');
    }
  };

  return (
    <div className="h-16 border-t border-white/10 bg-black/80 flex items-center justify-center gap-3 md:gap-6 shrink-0 px-3">
      {/* Time Display */}
      <div className="font-mono text-xs md:text-sm text-white/60">
        <span className="text-white font-bold">{formatTime(currentTime)}</span>
        <span className="mx-1 hidden md:inline">/</span>
        <span className="hidden md:inline">{formatTime(duration)}</span>
      </div>

      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>

      {/* STOP */}
      <button
        onClick={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="p-2.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
        title="Detener y reiniciar"
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

      {/* Expand list */}
      <button
        onClick={() => setShowMobileDrawer(!showMobileDrawer)}
        className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-neon-purple transition-all"
        title="Ver lista completa"
      >
        {showMobileDrawer ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
    </div>
  );
});

ControlBar.displayName = 'ControlBar';
