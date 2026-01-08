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
      <p className="text-white/40 font-mono text-sm mb-12 tracking-widest">V2.0.0</p>

      {/* Project List */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-h-[50vh] overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-neon-purple/20">
        {!projects || projects.length === 0 ? (
          <div className="col-span-full text-center text-white/30 py-10 border border-dashed border-white/10 rounded-xl">
            <div className="text-4xl mb-3">💿</div>
            Sin proyectos. Crea uno nuevo 👇
          </div>
        ) : (
          projects.map(p => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p as Project)}
              className="group bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-neon-purple/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-neon-purple to-pink-500 opacity-70" />
              <div className="flex justify-between items-start mb-4 mt-1">
                <div className="p-3 bg-black/40 rounded-lg text-neon-purple">
                  <Music size={20} />
                </div>
                <button
                  onClick={(e) => deleteProject(p.id, e)}
                  className="text-white/20 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-bold text-lg truncate mb-1 text-white group-hover:text-neon-purple transition-colors">{p.name}</h3>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Calendar size={12} />
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                {p.bpm > 0 && (
                  <span className="text-xs font-mono bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                    {p.bpm} BPM
                  </span>
                )}
                <span className="text-xs font-mono bg-neon-purple/20 text-neon-purple px-2 py-1 rounded">
                  {p.segments?.length || 0} Kues
                </span>
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative px-8 py-4 bg-neon-purple text-black font-bold rounded-full text-lg tracking-wider hover:scale-105 transition-all shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        >
          <div className="flex items-center gap-3">
            <Plus size={24} strokeWidth={3} />
            NUEVO PROYECTO
          </div>
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="group relative px-8 py-4 bg-green-500 text-black font-bold rounded-full text-lg tracking-wider hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.5)]"
        >
          <div className="flex items-center gap-3">
            <Package size={24} strokeWidth={2} />
            CARGAR .KUE
          </div>
        </button>
      </div>

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
