import { useRef, useState, useEffect } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Scissors, ArrowLeft, Plus, Trash2, Calendar, Music } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks'; // <--- MAGIA PARA LA DB
import { db } from './db'; // <--- TU DB
import { VideoMonitor } from './components/Player/VideoMonitor';
import { Waveform } from './components/Timeline/Waveform';
import { SegmentList } from './components/Editor/SegmentList';
import { useProjectStore } from './store/useProjectStore';

function App() {
  const [currentView, setCurrentView] = useState<'HOME' | 'EDITOR'>('HOME');
  const [projectId, setProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store de Zustand
  const {
    setVideoUrl, isPlaying, setIsPlaying, zoom, setZoom,
    addSegment, currentTime, segments, loadSegments
  } = useProjectStore();

  // --- QUERY DE PROYECTOS (Automático) ---
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());

  // Auto-Guardado: Cada que cambian los segmentos, actualizamos la DB
  useEffect(() => {
    if (projectId && segments.length > 0) {
      db.projects.update(projectId, {
        segments,
        updatedAt: Date.now()
      });
    }
  }, [segments, projectId]);

  // --- ACCIONES ---

  // 1. Crear Nuevo Proyecto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newId = crypto.randomUUID();
    const url = URL.createObjectURL(file);

    // Guardar en DB
    await db.projects.add({
      id: newId,
      name: file.name.split('.')[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      audioBlob: file,
      bpm: 0,
      segments: []
    });

    // Cargar en Memoria
    setProjectId(newId);
    setVideoUrl(url);
    loadSegments([]); // Limpiar segmentos anteriores
    setCurrentView('EDITOR');
  };

  // 2. Abrir Proyecto Existente
  const openProject = (p: any) => {
    const url = URL.createObjectURL(p.audioBlob);
    setProjectId(p.id);
    setVideoUrl(url);
    loadSegments(p.segments || []);
    setCurrentView('EDITOR');
  };

  // 3. Borrar Proyecto
  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Seguro que quieres borrar este proyecto?')) {
      await db.projects.delete(id);
    }
  };

  const handleCut = () => {
    addSegment({
      id: crypto.randomUUID(),
      start: currentTime,
      end: currentTime + 5,
      note: 'Corte en ' + currentTime.toFixed(1) + 's',
      color: '#8b5cf6'
    });
  };

  // --- VISTA: HOME ---
  if (currentView === 'HOME') {
    return (
      <div className="h-screen bg-neon-dark text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-purple/20 via-black to-black -z-10" />

        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-purple">
          KUE<span className="font-light text-white">STUDIO</span>
        </h1>
        <p className="text-white/40 font-mono text-sm mb-12 tracking-widest">V9 DB EDITION</p>

        {/* LISTA DE PROYECTOS REAL */}
        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-h-[50vh] overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-neon-purple/20">
          {!projects || projects.length === 0 ? (
            <div className="col-span-full text-center text-white/30 py-10 border border-dashed border-white/10 rounded-xl">
              No hay proyectos. Crea uno nuevo 👇
            </div>
          ) : (
            projects.map(p => (
              <div
                key={p.id}
                onClick={() => openProject(p)}
                className="group bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-neon-purple/50 transition-all relative"
              >
                <div className="flex justify-between items-start mb-4">
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
                <div className="absolute bottom-4 right-4 text-xs font-mono bg-neon-purple/20 text-neon-purple px-2 py-1 rounded">
                  {p.segments?.length || 0} cortes
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Oculto */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*,audio/*" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative px-8 py-4 bg-neon-purple text-black font-bold rounded-full text-lg tracking-wider hover:scale-105 transition-all shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        >
          <div className="flex items-center gap-3">
            <Plus size={24} strokeWidth={3} />
            NUEVO PROYECTO
          </div>
        </button>
      </div>
    );
  }

  // --- VISTA: EDITOR ---
  return (
    <div className="h-screen bg-neon-dark text-cyber-text flex flex-col overflow-hidden font-sans">
      <header className="h-14 border-b border-neon-purple/20 flex items-center px-4 bg-black/60 backdrop-blur justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('HOME')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-[0.2em] text-white hidden md:block opacity-50">
            PROYECTO ACTIVO
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs border border-green-500/20 rounded flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            AUTOGUARDADO
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col relative bg-black order-1 md:order-2">
          <div className="flex-1 flex items-center justify-center p-2 md:p-8 overflow-hidden">
            <div className="w-full max-w-5xl aspect-video shadow-2xl bg-black border border-white/5 relative group">
              <VideoMonitor />
            </div>
          </div>

          <div className="h-16 border-t border-white/10 bg-black/80 flex items-center justify-center gap-8 shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 rounded-full bg-white/5 hover:bg-neon-purple text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button onClick={handleCut} className="flex flex-col items-center gap-1 group">
              <div className="p-3 border-2 border-neon-purple rounded-xl text-neon-purple group-hover:bg-neon-purple group-hover:text-black group-active:scale-95 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <Scissors size={24} />
              </div>
            </button>
          </div>

          <div className="h-32 md:h-48 border-t border-neon-purple/30 bg-[#111115] relative flex flex-col shrink-0">
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/60 p-1 rounded backdrop-blur border border-white/10">
              <button onClick={() => setZoom(Math.max(5, zoom - 5))} className="p-1 hover:text-neon-purple"><ZoomOut size={14} /></button>
              <button onClick={() => setZoom(Math.min(200, zoom + 5))} className="p-1 hover:text-neon-purple"><ZoomIn size={14} /></button>
            </div>
            <div className="flex-1 relative">
              <Waveform />
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 h-1/3 md:h-full border-t md:border-t-0 md:border-r border-neon-purple/20 bg-cyber-gray overflow-hidden order-2 md:order-1 flex flex-col z-10 shadow-2xl">
          <SegmentList />
        </div>
      </main>
    </div>
  );
}

export default App;
