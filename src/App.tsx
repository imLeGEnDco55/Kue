import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Square, ZoomIn, ZoomOut, ArrowLeft, Plus, Trash2,
  Calendar, Music, Download, Undo2, ChevronDown, ChevronUp, Scissors, FileText, Wand2, ArrowDown
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { VideoMonitor } from './components/Player/VideoMonitor';
import { StoryboardPlayer } from './components/Player/StoryboardPlayer';
import { Waveform } from './components/Timeline/Waveform';
import { KueOverlay } from './components/Editor/KueOverlay';
import { SegmentList } from './components/Editor/SegmentList';
import { Toast } from './components/UI/Toast';
import { ExportModal } from './components/UI/ExportModal';
import { useProjectStore } from './store/useProjectStore';
import { formatTime } from './utils/audioAnalysis';

function App() {
  const [currentView, setCurrentView] = useState<'HOME' | 'EDITOR'>('HOME');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [projectLyrics, setProjectLyrics] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store de Zustand
  const isPlaying = useProjectStore(state => state.isPlaying);
  const zoom = useProjectStore(state => state.zoom);
  const currentTime = useProjectStore(state => state.currentTime);
  const duration = useProjectStore(state => state.duration);
  const segments = useProjectStore(state => state.segments);
  const bpm = useProjectStore(state => state.bpm);

  const setVideoUrl = useProjectStore(state => state.setVideoUrl);
  const setIsPlaying = useProjectStore(state => state.setIsPlaying);
  const setCurrentTime = useProjectStore(state => state.setCurrentTime);
  const setZoom = useProjectStore(state => state.setZoom);
  const loadSegments = useProjectStore(state => state.loadSegments);
  const setBpm = useProjectStore(state => state.setBpm);
  const undo = useProjectStore(state => state.undo);
  const canUndo = useProjectStore(state => state.canUndo);
  const showToast = useProjectStore(state => state.showToast);
  const cutAtPosition = useProjectStore(state => state.cutAtPosition);
  const closeToEnd = useProjectStore(state => state.closeToEnd);
  const getSegmentNumber = useProjectStore(state => state.getSegmentNumber);
  const updateSegment = useProjectStore(state => state.updateSegment);
  const autoSplitByBpm = useProjectStore(state => state.autoSplitByBpm);
  const assignLyricsToKues = useProjectStore(state => state.assignLyricsToKues);

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
    setCurrentView('EDITOR');
  };

  // --- ABRIR PROYECTO EXISTENTE ---
  const openProject = async (p: any) => {
    const url = URL.createObjectURL(p.audioBlob);
    setProjectId(p.id);
    setProjectName(p.name);
    setVideoUrl(url);
    loadSegments(p.segments || []);
    setBpm(p.bpm || 0);
    setCurrentView('EDITOR');
  };

  // --- BORRAR PROYECTO ---
  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Seguro que quieres borrar este proyecto?')) {
      await db.projects.delete(id);
    }
  };

  // --- KUE BUTTON: TAP = CUT, LONG-PRESS = CLOSE TO END ---
  const handleKuePress = useCallback(() => {
    // Start long-press timer
    setIsLongPressing(false);
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(100);
      setShowCloseConfirm(true);
    }, 1500); // 1.5 seconds for long-press
  }, []);

  const handleKueRelease = useCallback(() => {
    // Clear timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If it was a long-press, we already showed the confirm dialog
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    // Short tap = cut at current position
    const newSeg = cutAtPosition(currentTime);
    if (newSeg) {
      const segNum = getSegmentNumber(newSeg.id);
      showToast(`Kue #${segNum} creado`);
      if (!isPlaying) setIsPlaying(true); // Auto-play after first cut
    }
  }, [isLongPressing, currentTime, cutAtPosition, getSegmentNumber, showToast, isPlaying, setIsPlaying]);

  const handleCloseConfirm = useCallback((confirmed: boolean) => {
    setShowCloseConfirm(false);
    if (confirmed) {
      const newSeg = closeToEnd();
      if (newSeg) {
        const segNum = getSegmentNumber(newSeg.id);
        showToast(`Kue #${segNum} cerrado hasta el final`);
      } else {
        showToast('Ya está cerrado hasta el final');
      }
    }
  }, [closeToEnd, getSegmentNumber, showToast]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // --- DESHACER ---
  const handleUndo = () => {
    if (undo()) {
      showToast('Deshecho');
    }
  };

  // --- EXPORTAR (abre modal) ---
  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleAutoSplit = () => {
    if (confirm('⚠️ ARRIESGADO: Esto eliminará todos los Kues actuales y creará nuevos basados en el BPM. ¿Continuar?')) {
      autoSplitByBpm(beatsPerBar);
      setShowToolsModal(false);
    }
  };

  const handleAssignLyrics = () => {
    if (!projectLyrics.trim()) {
      showToast('Escribe o pega la letra primero');
      return;
    }
    assignLyricsToKues(projectLyrics);
  };

  // Get current Kue info
  const currentKue = segments.find(s => currentTime >= s.start && currentTime < s.end);
  const currentKueNumber = currentKue ? getSegmentNumber(currentKue.id) : null;

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
        <p className="text-white/40 font-mono text-sm mb-12 tracking-widest">V2.0.0</p>

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
                    {p.segments?.length || 0} Kues
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Oculto */}
        <input
          id="audio-upload"
          name="audio-upload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="video/*,audio/*"
        />

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
            onClick={() => setCurrentView('HOME')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <input
            type="text"
            name="project-name"
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
          {/* BPM Badge - Editable */}
          <input
            type="number"
            value={bpm || ''}
            onChange={(e) => {
              const newBpm = parseInt(e.target.value) || 0;
              setBpm(newBpm);
              if (projectId) {
                db.projects.update(projectId, { bpm: newBpm });
              }
            }}
            placeholder="BPM"
            className="w-16 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 rounded font-mono text-center outline-none focus:border-amber-400"
          />
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-neon-purple"
            title="Exportar proyecto"
          >
            <Download size={18} />
          </button>
          
          {/* Magic Tools Button */}
          <button
            onClick={() => setShowToolsModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-amber-400"
            title="Herramientas Mágicas (Auto-split)"
          >
            <Wand2 size={18} />
          </button>

          {/* Autosave indicator - hidden on mobile */}
          <div className="hidden md:flex px-3 py-1 bg-green-500/10 text-green-400 text-xs border border-green-500/20 rounded items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            AUTO
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP: Storyboard Player */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-4 bg-black overflow-hidden min-h-0">
          <div className="w-full max-w-4xl aspect-video shadow-2xl bg-black border border-neon-purple/30 rounded-lg overflow-hidden relative group">
            <StoryboardPlayer />
            {/* Hidden VideoMonitor for audio playback */}
            <div className="hidden">
              <VideoMonitor />
            </div>
          </div>
        </div>

        {/* KUE INFO BAR - Shows current Kue info with editable note */}
        {currentKue && (
          <div className="bg-black/60 border-t border-white/10 px-4 py-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: currentKue.color || '#8b5cf6' }}
                />
                <span className="text-white font-bold text-sm shrink-0">#{currentKueNumber}</span>
                <span className="text-white/40 text-xs shrink-0 hidden md:inline">
                  {formatTime(currentKue.start)} → {formatTime(currentKue.end)}
                </span>
              </div>
              <span className="text-white/60 text-xs font-mono shrink-0">
                {((currentKue.end - currentKue.start)).toFixed(1)}s
              </span>
            </div>
            {/* Editable Note for current Kue */}
            <input
              type="text"
              value={currentKue.note || ''}
              onChange={(e) => updateSegment(currentKue.id, { note: e.target.value })}
              placeholder="Escribe la nota/lyric de este Kue..."
              className="w-full mt-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/30 outline-none focus:border-neon-purple/50 transition-colors"
            />
          </div>
        )}

        {/* MIDDLE: Control Bar - Compact */}
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

          {/* STOP - Full reset */}
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

          {/* KUE BUTTON - Tap to cut, Long-press to close */}
          <button
            onMouseDown={handleKuePress}
            onMouseUp={handleKueRelease}
            onMouseLeave={() => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
              }
              setIsLongPressing(false);
            }}
            onTouchStart={handleKuePress}
            onTouchEnd={handleKueRelease}
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

          {/* Expand to full list */}
          <button
            onClick={() => setShowMobileDrawer(!showMobileDrawer)}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-neon-purple transition-all"
            title="Ver lista completa"
          >
            {showMobileDrawer ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* LYRICS REFERENCE AREA - Collapsible */}
        {showLyrics && (
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
        )}

        {/* WAVEFORM */}
        <div className="h-24 md:h-32 border-t border-neon-purple/30 bg-[#111115] relative shrink-0">
          {/* Zoom Controls */}
          <div className="absolute top-1 right-2 z-10 flex gap-1 bg-black/60 p-0.5 rounded backdrop-blur border border-white/10">
            <button onClick={() => setZoom(Math.max(5, zoom - 5))} className="p-1 hover:text-neon-purple">
              <ZoomOut size={12} />
            </button>
            <button onClick={() => setZoom(Math.min(200, zoom + 5))} className="p-1 hover:text-neon-purple">
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Kue Count */}
          <div className="absolute top-1 left-2 z-10 px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-[10px] font-mono rounded border border-neon-purple/30">
            {segments.length} Kues
          </div>

          <Waveform />

          {/* KUE OVERLAY - Rendered on top of waveform */}
          <KueOverlay />
        </div>

        {/* EXPANDED SEGMENT LIST (optional) */}
        {showMobileDrawer && (
          <div className="h-64 md:h-80 border-t border-neon-purple/30 bg-cyber-gray overflow-hidden shrink-0">
            <SegmentList />
          </div>
        )}

        {/* BOTTOM PROGRESS BAR - Shows coverage */}
        {duration > 0 && (
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
              <span>
                {formatTime(segments.reduce((acc, s) => acc + (s.end - s.start), 0))} cubiertos
              </span>
            </div>
          </div>
        )}
      </main>

      <Toast />

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-cyber-gray border border-neon-purple/30 rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-white font-bold text-lg mb-2">¿Cerrar hasta el final?</h3>
            <p className="text-white/60 text-sm mb-6">
              Esto creará el último Kue desde la posición actual hasta el final de la pista.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleCloseConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCloseConfirm(true)}
                className="flex-1 px-4 py-2 bg-neon-purple text-black font-bold rounded-lg hover:bg-neon-purple/80 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Modal (Auto Split) */}
      {showToolsModal && (
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
                onClick={() => setShowToolsModal(false)}
                className="w-full py-3 text-white/40 hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
