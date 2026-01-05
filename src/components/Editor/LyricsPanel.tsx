import { memo } from 'react';
import { FileText, ArrowDown } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface LyricsPanelProps {
  projectLyrics: string;
  setProjectLyrics: (lyrics: string) => void;
}

export const LyricsPanel = memo(({ projectLyrics, setProjectLyrics }: LyricsPanelProps) => {
  const segments = useProjectStore(state => state.segments);
  const assignLyricsToKues = useProjectStore(state => state.assignLyricsToKues);
  const showToast = useProjectStore(state => state.showToast);

  const handleAssignLyrics = () => {
    if (!projectLyrics.trim()) {
      showToast('Escribe o pega la letra primero');
      return;
    }
    if (segments.length === 0) {
      showToast('Primero crea algunos Kues');
      return;
    }
    assignLyricsToKues(projectLyrics);
  };

  return (
    <div className="border-t border-neon-purple/30 bg-black/40 px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-neon-purple" />
        <span className="text-white/60 text-xs font-mono">LYRICS / REFERENCIA</span>
        <div className="flex-1" />
        <button
          onClick={handleAssignLyrics}
          className="flex items-center gap-1 text-[10px] bg-white/10 hover:bg-neon-purple/20 text-white/60 hover:text-neon-purple px-2 py-1 rounded transition-colors"
          title="Asignar cada línea de texto a un Kue existente"
        >
          <ArrowDown size={12} />
          Distribuir en Kues
        </button>
      </div>
      <textarea
        value={projectLyrics}
        onChange={(e) => setProjectLyrics(e.target.value)}
        placeholder="Pega aquí la letra de la canción como referencia...&#10;Línea 1&#10;Línea 2&#10;..."
        className="w-full h-24 md:h-32 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/20 outline-none focus:border-neon-purple/50 transition-colors resize-none font-mono leading-relaxed"
      />
    </div>
  );
});

LyricsPanel.displayName = 'LyricsPanel';
