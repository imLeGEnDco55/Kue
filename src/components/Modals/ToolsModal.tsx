import { memo, useState } from 'react';
import { Wand2, Scissors } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolsModal = memo(({ isOpen, onClose }: ToolsModalProps) => {
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const bpm = useProjectStore(state => state.bpm);
  const autoSplitByBpm = useProjectStore(state => state.autoSplitByBpm);

  if (!isOpen) return null;

  const handleAutoSplit = () => {
    if (confirm('⚠️ ARRIESGADO: Esto eliminará todos los Kues actuales y creará nuevos basados en el BPM. ¿Continuar?')) {
      autoSplitByBpm(beatsPerBar);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-cyber-gray border border-amber-500/30 rounded-xl p-6 max-w-sm mx-4 w-full shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        <div className="flex items-center gap-3 mb-4 text-amber-400">
          <Wand2 size={24} />
          <h3 className="font-bold text-lg">Herramientas Mágicas</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-lg">
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
              Auto-Split por BPM
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-white/60 mb-1">Beats por Compás</div>
                <input 
                  type="number" 
                  value={beatsPerBar}
                  onChange={(e) => setBeatsPerBar(parseInt(e.target.value) || 4)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex-1">
                <div className="text-xs text-white/60 mb-1">BPM Actual</div>
                <div className="px-3 py-2 text-white/40 font-mono bg-black/20 rounded border border-white/5">
                  {bpm > 0 ? bpm : 'No definido'}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleAutoSplit}
              disabled={bpm <= 0}
              className="w-full mt-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/30 rounded font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Scissors size={14} />
              {bpm > 0 ? 'Dividir Pista Completa' : 'Define BPM primero'}
            </button>
            <p className="text-[10px] text-white/30 mt-2 text-center">
              ⚠️ Sobreescribirá todos los Kues actuales
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 text-white/40 hover:text-white transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});

ToolsModal.displayName = 'ToolsModal';
