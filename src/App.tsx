import { useRef, useState } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Scissors, ArrowLeft, Plus, Music } from 'lucide-react';
import { VideoMonitor } from './components/Player/VideoMonitor';
import { Waveform } from './components/Timeline/Waveform';
import { SegmentList } from './components/Editor/SegmentList';
import { useProjectStore } from './store/useProjectStore';

function App() {
  // Estado para controlar la VISTA (Como en la V7)
  const [currentView, setCurrentView] = useState<'HOME' | 'EDITOR'>('HOME');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    setVideoUrl,
    isPlaying,
    setIsPlaying,
    zoom,
    setZoom,
    addSegment,
    currentTime
  } = useProjectStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setCurrentView('EDITOR'); // Al cargar archivo, nos vamos al editor
    }
  };

  const handleCut = () => {
    addSegment({
      id: crypto.randomUUID(),
      start: currentTime,
      end: currentTime + 5,
      note: 'Cut ' + currentTime.toFixed(1),
      color: '#8b5cf6'
    });
  };

  // --- VISTA: HOME (La que extrañabas) ---
  if (currentView === 'HOME') {
    return (
      <div className="h-screen bg-neon-dark text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-purple/20 via-black to-black -z-10" />

        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-purple">
          KUE<span className="font-light text-white">STUDIO</span>
        </h1>
        <p className="text-white/40 font-mono text-sm mb-12 tracking-widest">V8 REACT EDITION</p>

        {/* Lista de Proyectos (Simulada por ahora) */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-8 opacity-50 pointer-events-none">
          {/* Aquí conectaremos la Base de Datos después */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl aspect-square flex flex-col justify-end">
            <span className="text-sm font-bold">Demo Project</span>
            <span className="text-xs text-white/40">Hace 2 días</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl aspect-square flex items-center justify-center">
            <Music className="text-white/20" />
          </div>
        </div>

        {/* Botón Nuevo Proyecto */}
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

  // --- VISTA: EDITOR (Corregida para Móvil) ---
  return (
    <div className="h-screen bg-neon-dark text-cyber-text flex flex-col overflow-hidden font-sans">
      {/* Header Compacto */}
      <header className="h-14 border-b border-neon-purple/20 flex items-center px-4 bg-black/60 backdrop-blur justify-between shrink-0 z-20">
        <button onClick={() => setCurrentView('HOME')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-bold tracking-[0.2em] text-neon-purple hidden md:block">
          KUE<span className="text-white">STUDIO</span>
        </h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-xs border border-neon-purple/50 rounded hover:bg-neon-purple hover:text-white transition-all">
            EXPORTAR
          </button>
        </div>
      </header>

      {/* Main Workspace: Aquí está el truco del Layout */}
      {/* "flex-col" en móvil (uno arriba de otro), "md:flex-row" en PC (lado a lado) */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* 1. MONITOR DE VIDEO (Arriba en móvil, Centro en PC) */}
        {/* El "order" controla quién va primero. En móvil video va primero */}
        <div className="flex-1 flex flex-col relative bg-black order-1 md:order-2">

          {/* Video Area */}
          <div className="flex-1 flex items-center justify-center p-2 md:p-8 overflow-hidden">
            <div className="w-full max-w-5xl aspect-video shadow-2xl bg-black border border-white/5 relative group">
              <VideoMonitor />
            </div>
          </div>

          {/* Controls Bar */}
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

          {/* Waveform Timeline (Abajo del video siempre) */}
          <div className="h-32 md:h-48 border-t border-neon-purple/30 bg-[#111115] relative flex flex-col shrink-0">
            {/* Zoom flotante */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/60 p-1 rounded backdrop-blur border border-white/10">
              <button onClick={() => setZoom(Math.max(5, zoom - 5))} className="p-1 hover:text-neon-purple"><ZoomOut size={14} /></button>
              <button onClick={() => setZoom(Math.min(200, zoom + 5))} className="p-1 hover:text-neon-purple"><ZoomIn size={14} /></button>
            </div>
            <div className="flex-1 relative">
              <Waveform />
            </div>
          </div>
        </div>

        {/* 2. SEGMENT LIST (Sidebar) */}
        {/* En Móvil: Oculto o abajo? Por ahora dejémoslo visible pero colapsable si quieres, 
            o simplemente debajo del todo. En este layout 'flex-col', quedaría abajo del video si quitamos el 'order'.
            Pero para PC lo queremos a la izquierda (order-1).
        */}
        <div className="w-full md:w-80 h-1/3 md:h-full border-t md:border-t-0 md:border-r border-neon-purple/20 bg-cyber-gray overflow-hidden order-2 md:order-1 flex flex-col z-10 shadow-2xl">
          <SegmentList />
        </div>

      </main>
    </div>
  );
}

export default App;
