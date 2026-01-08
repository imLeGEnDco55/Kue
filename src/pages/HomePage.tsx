import { useRef, useState } from 'react';
import { Plus, Trash2, Calendar, Music, Package } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Toast } from '../components/UI/Toast';
import { ImportModal } from '../components/UI/ImportModal';
import type { Project } from '../types';

interface HomePageProps {
  onOpenProject: (project: Project) => void;
  onCreateProject: (file: File) => void;
}

export function HomePage({ onOpenProject, onCreateProject }: HomePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCreateProject(file);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Seguro que quieres borrar este proyecto?')) {
      await db.projects.delete(id);
    }
  };

  return (
    <div className="h-screen bg-neon-dark text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-neon-purple/20 via-black to-black -z-10" />

      {/* Logo */}
      <img
        src="./logo.png"
        alt="KueStudio"
        className="w-24 h-24 mb-4 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]"
      />

      <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-linear-to-r from-white to-neon-purple">
        KUE<span className="font-light text-white">STUDIO</span>
      </h1>
      <p className="text-white/40 font-mono text-sm mb-6 tracking-widest">V2.0.0</p>

      {/* Action Buttons - ABOVE projects, always horizontal */}
      <div className="flex flex-row gap-3 mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative px-6 py-3 bg-neon-purple text-black font-bold rounded-full text-sm md:text-base tracking-wider hover:scale-105 transition-all shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        >
          <div className="flex items-center gap-2">
            <Plus size={20} strokeWidth={3} />
            <span className="hidden sm:inline">NUEVO</span> PROYECTO
          </div>
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="group relative px-6 py-3 bg-green-500 text-black font-bold rounded-full text-sm md:text-base tracking-wider hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.5)]"
        >
          <div className="flex items-center gap-2">
            <Package size={20} strokeWidth={2} />
            <span className="hidden sm:inline">CARGAR</span> .KUE
          </div>
        </button>
      </div>

      {/* Project List */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-neon-purple/20">
        {!projects || projects.length === 0 ? (
          <div className="col-span-full text-center text-white/30 py-10 border border-dashed border-white/10 rounded-xl">
            <div className="text-4xl mb-3">💿</div>
            Sin proyectos. Crea uno nuevo ☝️
          </div>
        ) : (
          projects.map(p => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p as Project)}
              className="group bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-neon-purple/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-neon-purple to-pink-500 opacity-70" />
              <div className="flex justify-between items-start mb-3 mt-1">
                <div className="p-2 bg-black/40 rounded-lg text-neon-purple">
                  <Music size={18} />
                </div>
                <button
                  onClick={(e) => deleteProject(p.id, e)}
                  className="text-white/20 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="font-bold text-base truncate mb-2 text-white group-hover:text-neon-purple transition-colors">{p.name}</h3>
              
              {/* Badges - now below title, not absolute */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {p.bpm > 0 && (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                    {p.bpm} BPM
                  </span>
                )}
                <span className="text-[10px] font-mono bg-neon-purple/20 text-neon-purple px-1.5 py-0.5 rounded">
                  {p.segments?.length || 0} Kues
                </span>
              </div>
              
              {/* Date at bottom */}
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <Calendar size={10} />
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hidden File Input */}
      <input
        id="audio-upload"
        name="audio-upload"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/*,audio/*"
      />

      {/* Import Modal */}
      <ImportModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(project) => onOpenProject(project)}
      />

      <Toast />
    </div>
  );
}
