import { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, ZoomIn, ZoomOut, Scissors, ArrowLeft, Plus, Trash2,
  Calendar, Music, Download, Undo2, Zap
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { VideoMonitor } from './components/Player/VideoMonitor';
import { StoryboardPlayer } from './components/Player/StoryboardPlayer';
import { Waveform } from './components/Timeline/Waveform';
import { SegmentList } from './components/Editor/SegmentList';
import { Toast } from './components/UI/Toast';
import { ExportModal } from './components/UI/ExportModal';
import { MobileDrawer, MobileDrawerButton } from './components/UI/MobileDrawer';
import { useProjectStore } from './store/useProjectStore';
import { analyzeAudioBlob, formatTime } from './utils/audioAnalysis';

function App() {
  const [currentView, setCurrentView] = useState<'HOME' | 'EDITOR'>('HOME');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store de Zustand
  const {
    setVideoUrl, isPlaying, setIsPlaying, zoom, setZoom,
    currentTime, duration, segments, loadSegments,
    isRecording, activeSegmentStart, startRecording, finishRecording, cancelRecording,
    bpm, setBpm, undoLastSegment, showToast
  } = useProjectStore();

  // Query de proyectos
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());

  // Auto-guardado cuando cambian los segmentos
  useEffect(() => {
    if (projectId && segments.length >= 0) {
      db.projects.update(projectId, {
        segments,
        updatedAt: Date.now()
      });
    }
  }, [segments, projectId]);

  // --- CREAR NUEVO PROYECTO ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newId = crypto.randomUUID();
    const url = URL.createObjectURL(file);
    const name = file.name.split('.')[0];

    // Guardar en DB
    await db.projects.add({
      id: newId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      audioBlob: file,
      bpm: 0,
      segments: []
    });

    // Cargar en memoria
    setProjectId(newId);
    setProjectName(name);
    setVideoUrl(url);
    loadSegments([]);
    cancelRecording();
    setCurrentView('EDITOR');

    // Analizar audio para BPM
    try {
      const { bpm: detectedBpm } = await analyzeAudioBlob(file);
      if (detectedBpm > 0) {
        setBpm(detectedBpm);
        await db.projects.update(newId, { bpm: detectedBpm });
        showToast(`BPM detectado: ${detectedBpm}`);
      }
    } catch (err) {
      console.warn('Error analyzing audio:', err);
    }
  };

  // --- ABRIR PROYECTO EXISTENTE ---
  const openProject = async (p: any) => {
    const url = URL.createObjectURL(p.audioBlob);
    setProjectId(p.id);
    setProjectName(p.name);
    setVideoUrl(url);
    loadSegments(p.segments || []);
    setBpm(p.bpm || 0);
    cancelRecording();
    setCurrentView('EDITOR');

    // Si no tiene BPM, analizamos
    if (!p.bpm) {
      try {
        const { bpm: detectedBpm } = await analyzeAudioBlob(p.audioBlob);
        if (detectedBpm > 0) {
          setBpm(detectedBpm);
          await db.projects.update(p.id, { bpm: detectedBpm });
          showToast(`BPM detectado: ${detectedBpm}`);
        }
      } catch (err) {
        console.warn('Error analyzing audio:', err);
      }
    }
  };

  // --- BORRAR PROYECTO ---
  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Seguro que quieres borrar este proyecto?')) {
      await db.projects.delete(id);
    }
  };

  // --- LÓGICA DE CORTE (LEGACY + INTERMEDIATE CUTS) ---
  const handleMark = () => {
    // Check if we're inside an existing segment (for splitting)
    const existingSegment = segments.find(s =>
      currentTime > s.start + 0.1 && currentTime < s.end - 0.1
    );

    if (existingSegment) {
      // SPLIT MODE: Divide the existing segment into two
      const { updateSegment, addSegment } = useProjectStore.getState();

      // Update the original segment to end at current time
      updateSegment(existingSegment.id, { end: currentTime });

      // Create a new segment from current time to original end
      const newSegment = {
        id: crypto.randomUUID(),
        start: currentTime,
        end: existingSegment.end,
        note: '',
        color: '#8b5cf6'
      };
      addSegment(newSegment);

      showToast('Segmento dividido');
      if (navigator.vibrate) navigator.vibrate([40, 50, 40]); // Double vibration for split
      return;
    }

    // NORMAL MODE: Recording chain
    if (!isRecording) {
      // INICIAR grabación
      startRecording(currentTime);
      if (!isPlaying) setIsPlaying(true); // Auto-play
    } else {
      // CORTAR (cerrar segmento actual y encadenar al siguiente)
      const newSeg = finishRecording(currentTime);
      if (newSeg) {
        showToast('¡Corte guardado!');
      }
    }
  };

  // --- DESHACER ---
  const handleUndo = () => {
    const removed = undoLastSegment();
    if (removed) {
      showToast('Deshecho');
    }
  };

  // --- EXPORTAR (abre modal) ---
  const handleExport = () => {
    setShowExportModal(true);
  };

  // --- VISTA: HOME ---
  if (currentView === 'HOME') {
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
        <p className="text-white/40 font-mono text-sm mb-12 tracking-widest">V1.0.2</p>

        {/* LISTA DE PROYECTOS */}
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
                onClick={() => openProject(p)}
                className="group bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-neon-purple/50 transition-all relative overflow-hidden"
              >
                {/* Accent bar */}
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
                    {p.segments?.length || 0} cortes
                  </span>
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

        <Toast />
      </div>
    );
  }

  // --- VISTA: EDITOR ---
  return (
    <div className="h-screen bg-neon-dark text-cyber-text flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-neon-purple/20 flex items-center px-4 bg-black/60 backdrop-blur justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { cancelRecording(); setCurrentView('HOME'); }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              if (projectId) {
                db.projects.update(projectId, { name: e.target.value });
              }
            }}
            className="bg-transparent border-none text-white font-bold text-lg outline-none w-40 md:w-60"
          />
        </div>
        <div className="flex gap-2 items-center">
          {/* BPM Badge */}
          {bpm > 0 && (
            <div className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 rounded font-mono">
              {bpm} BPM
            </div>
          )}
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-neon-purple"
            title="Exportar proyecto"
          >
            <Download size={18} />
          </button>
          {/* Autosave indicator */}
          <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs border border-green-500/20 rounded flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            AUTO
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-black order-1 md:order-2">
          {/* Storyboard Player - Shows uploaded images synced with audio */}
          <div className="flex-1 flex items-center justify-center p-2 md:p-8 overflow-hidden">
            <div className="w-full max-w-5xl aspect-video shadow-2xl bg-black border border-neon-purple/30 rounded-lg overflow-hidden relative group">
              <StoryboardPlayer />
              {/* Hidden VideoMonitor for audio playback */}
              <div className="hidden">
                <VideoMonitor />
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="h-20 border-t border-white/10 bg-black/80 flex items-center justify-center gap-4 md:gap-8 shrink-0 px-4">
            {/* Time Display */}
            <div className="hidden md:flex font-mono text-sm text-white/60">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            {/* MARK BUTTON - The Star! */}
            <button
              onClick={handleMark}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all
                active:scale-95 shadow-lg
                ${isRecording
                  ? 'bg-linear-to-r from-red-500 to-red-700 text-white animate-pulse shadow-red-500/30'
                  : 'bg-linear-to-r from-neon-purple to-pink-600 text-white shadow-neon-purple/30 hover:scale-105'
                }
              `}
            >
              {isRecording ? (
                <>
                  <Scissors size={20} />
                  KUE
                </>
              ) : (
                <>
                  <Zap size={20} />
                  GO!
                </>
              )}
            </button>

            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={segments.length === 0}
              className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Deshacer"
            >
              <Undo2 size={20} />
            </button>
          </div>

          {/* Waveform Timeline */}
          <div className="h-32 md:h-48 border-t border-neon-purple/30 bg-[#111115] relative flex flex-col shrink-0">
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/60 p-1 rounded backdrop-blur border border-white/10">
              <button onClick={() => setZoom(Math.max(5, zoom - 5))} className="p-1 hover:text-neon-purple">
                <ZoomOut size={14} />
              </button>
              <button onClick={() => setZoom(Math.min(200, zoom + 5))} className="p-1 hover:text-neon-purple">
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Ghost Segment Indicator */}
            {isRecording && activeSegmentStart !== null && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-mono border border-red-500/30 animate-pulse">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                REC: {formatTime(currentTime - activeSegmentStart)}
              </div>
            )}

            <div className="flex-1 relative">
              <Waveform />
            </div>
          </div>
        </div>

        {/* Sidebar - Desktop only */}
        <div className="hidden md:flex w-80 h-full border-r border-neon-purple/20 bg-cyber-gray overflow-hidden order-1 flex-col z-10 shadow-2xl">
          <SegmentList />
        </div>

        {/* Mobile Drawer Button */}
        <MobileDrawerButton
          onClick={() => setShowMobileDrawer(true)}
          label="Kues"
          count={segments.length}
        />

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={showMobileDrawer}
          onClose={() => setShowMobileDrawer(false)}
          title={`KUES (${segments.length})`}
        >
          <SegmentList />
        </MobileDrawer>
      </main>

      <Toast />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectName={projectName}
        projectId={projectId || ''}
      />
    </div>
  );
}

export default App;
