import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Wand2 } from 'lucide-react';
import { db } from '../db';
import { useProjectStore } from '../store/useProjectStore';
import { useKueButton } from '../hooks/useKueButton';
import { formatTime } from '../utils/audioAnalysis';

// Components
import { VideoMonitor } from '../components/Player/VideoMonitor';
import { StoryboardPlayer } from '../components/Player/StoryboardPlayer';
import { Waveform } from '../components/Timeline/Waveform';
import { SegmentList } from '../components/Editor/SegmentList';
import { ControlBar } from '../components/Editor/ControlBar';
import { KueInfoBar } from '../components/Editor/KueInfoBar';
import { LyricsPanel } from '../components/Editor/LyricsPanel';
import { ProgressBar } from '../components/Editor/ProgressBar';
import { Toast } from '../components/UI/Toast';
import { ExportModal } from '../components/UI/ExportModal';
import { CloseConfirmModal } from '../components/Modals/CloseConfirmModal';
import { ToolsModal } from '../components/Modals/ToolsModal';

interface EditorPageProps {
  projectId: string;
  projectName: string;
  setProjectName: (name: string) => void;
  onBack: () => void;
}

export function EditorPage({ projectId, projectName, setProjectName, onBack }: EditorPageProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [projectLyrics, setProjectLyrics] = useState('');

  // Store
  const segments = useProjectStore(state => state.segments);
  const bpm = useProjectStore(state => state.bpm);
  const currentTime = useProjectStore(state => state.currentTime);
  const duration = useProjectStore(state => state.duration);
  const setBpm = useProjectStore(state => state.setBpm);
  const getSegmentNumber = useProjectStore(state => state.getSegmentNumber);

  // KUE button hook
  const { showCloseConfirm, handleCloseConfirm } = useKueButton();

  // Auto-save segments
  useEffect(() => {
    if (projectId && segments.length >= 0) {
      db.projects.update(projectId, {
        segments,
        updatedAt: Date.now()
      });
    }
  }, [segments, projectId]);

  // Get current Kue info
  const currentKue = segments.find(s => currentTime >= s.start && currentTime < s.end);
  const currentKueNumber = currentKue ? getSegmentNumber(currentKue.id) : null;


  return (
    <div className="h-screen bg-neon-dark text-cyber-text flex flex-col overflow-hidden font-sans fixed inset-0 touch-pan-x overscroll-none">
      {/* Header */}
      <header className="h-14 border-b border-neon-purple/20 flex items-center px-4 bg-black/60 backdrop-blur justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
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
              db.projects.update(projectId, { name: e.target.value });
            }}
            className="bg-transparent border-none text-white font-bold text-lg outline-none w-40 md:w-60"
          />
        </div>
        <div className="flex gap-2 items-center">
          {/* BPM Input */}
          <input
            type="number"
            value={bpm || ''}
            onChange={(e) => {
              const newBpm = parseInt(e.target.value) || 0;
              setBpm(newBpm);
              db.projects.update(projectId, { bpm: newBpm });
            }}
            placeholder="BPM"
            className="w-16 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 rounded font-mono text-center outline-none focus:border-amber-400"
          />
          {/* Export */}
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-neon-purple"
            title="Exportar proyecto"
          >
            <Download size={18} />
          </button>
          {/* Magic Tools */}
          <button
            onClick={() => setShowToolsModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-amber-400"
            title="Herramientas Mágicas"
          >
            <Wand2 size={18} />
          </button>
          {/* Autosave indicator */}
          <div className="hidden md:flex px-3 py-1 bg-green-500/10 text-green-400 text-xs border border-green-500/20 rounded items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            AUTO
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Storyboard Player */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-4 bg-black overflow-hidden min-h-0">
          <div className="w-full max-w-4xl aspect-video shadow-2xl bg-black border border-neon-purple/30 rounded-lg overflow-hidden relative group">
            {/* Time Overlay - Top Right */}
            <div className="absolute top-2 right-2 z-20 px-2 py-1 bg-black/70 backdrop-blur-sm rounded font-mono text-xs md:text-sm text-white/90 border border-white/10">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-white/50 mx-1">/</span>
              <span className="text-white/60">{formatTime(duration)}</span>
            </div>
            
            <StoryboardPlayer />
            <div className="hidden">
              <VideoMonitor />
            </div>
          </div>
        </div>

        {/* Kue Info Bar */}
        {currentKue && currentKueNumber && (
          <KueInfoBar currentKue={currentKue} currentKueNumber={currentKueNumber} />
        )}

        {/* Control Bar */}
        <ControlBar
          showLyrics={showLyrics}
          setShowLyrics={setShowLyrics}
          showMobileDrawer={showMobileDrawer}
          setShowMobileDrawer={setShowMobileDrawer}
        />

        {/* Lyrics Panel */}
        {showLyrics && (
          <LyricsPanel 
            projectLyrics={projectLyrics} 
            setProjectLyrics={setProjectLyrics} 
          />
        )}

        {/* Waveform - TALLER for easier touch */}
        <div className="h-32 md:h-44 border-t border-neon-purple/30 bg-[#111115] relative shrink-0">
          {/* Kues counter - moved to not overlap */}
          <div className="absolute bottom-1 left-2 z-10 px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-[10px] font-mono rounded border border-neon-purple/30">
            {segments.length} Kues
          </div>
          <Waveform />
        </div>

        {/* Expanded Segment List */}
        {showMobileDrawer && (
          <div className="h-64 md:h-80 border-t border-neon-purple/30 bg-cyber-gray overflow-hidden shrink-0">
            <SegmentList />
          </div>
        )}

        {/* Progress Bar */}
        <ProgressBar />
      </main>

      <Toast />
      
      {/* Modals */}
      <CloseConfirmModal isOpen={showCloseConfirm} onConfirm={handleCloseConfirm} />
      <ToolsModal isOpen={showToolsModal} onClose={() => setShowToolsModal(false)} />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectName={projectName}
        projectId={projectId}
      />
    </div>
  );
}
