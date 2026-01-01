import { useRef } from 'react';
import { Play, Pause, FolderOpen, ZoomIn, ZoomOut, Scissors } from 'lucide-react';
import { VideoMonitor } from './components/Player/VideoMonitor';
import { Waveform } from './components/Timeline/Waveform';
import { SegmentList } from './components/Editor/SegmentList';
import { useProjectStore } from './store/useProjectStore';

function App() {
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

  return (
    <div className="h-screen bg-neon-dark text-cyber-text flex flex-col overflow-hidden font-sans selection:bg-neon-purple selection:text-white">
      {/* Header */}
      <header className="h-14 border-b border-neon-purple/20 flex items-center px-6 bg-black/40 backdrop-blur justify-between">
        <h1 className="text-2xl font-bold tracking-[0.2em] text-neon-purple shadow-neon">
          KUE<span className="text-white">STUDIO</span>
        </h1>

        <div className="flex items-center gap-4">
          {/* File Load */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/*,audio/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 hover:border-neon-purple rounded transition-all text-sm uppercase tracking-wider"
          >
            <FolderOpen size={16} className="text-neon-purple" />
            Load Media
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Segments */}
        <div className="w-80 border-r border-neon-purple/20 bg-cyber-gray">
          <SegmentList />
        </div>

        {/* Center: Monitor & Timeline */}
        <div className="flex-1 flex flex-col relative bg-black/80">
          {/* Top: Video Monitor Area */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl max-h-full aspect-video shadow-2xl">
              <VideoMonitor />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-14 border-t border-neon-purple/20 bg-black flex items-center justify-center gap-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-full hover:bg-neon-purple/20 text-white transition-all scale-100 hover:scale-110"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <button onClick={handleCut} className="group flex flex-col items-center gap-1">
              <div className="p-2 border border-neon-purple rounded text-neon-purple group-hover:bg-neon-purple group-hover:text-black transition-colors">
                <Scissors size={20} />
              </div>
            </button>
          </div>

          {/* Bottom: Waveform Timeline */}
          <div className="h-48 border-t border-neon-purple/30 bg-[#151520] relative flex flex-col">
            {/* Timeline Toolbar (Zoom) */}
            <div className="absolute top-2 right-4 z-10 flex gap-2 bg-black/50 p-1 rounded backdrop-blur">
              <button onClick={() => setZoom(Math.max(5, zoom - 5))} className="p-1 hover:text-neon-purple"><ZoomOut size={16} /></button>
              <span className="text-xs font-mono self-center w-8 text-center">{zoom}</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 5))} className="p-1 hover:text-neon-purple"><ZoomIn size={16} /></button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <Waveform />
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <div className="h-6 border-t border-white/5 bg-black text-[10px] uppercase tracking-widest text-white/30 flex items-center px-4 justify-between font-mono">
        <span>Ready</span>
        <span>v2.0.0 - PROTOTYPE</span>
      </div>
    </div>
  );
}

export default App;
