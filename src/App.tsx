import { useState } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { db } from './db';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';
import type { Project } from './types';

/**
 * KUE STUDIO v2.0
 * 
 * Main application component that handles navigation between:
 * - HomePage: Project listing and creation
 * - EditorPage: Full editor with timeline, waveform, and prompt builder
 */
function App() {
  const [currentView, setCurrentView] = useState<'HOME' | 'EDITOR'>('HOME');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  // Store actions
  const setVideoUrl = useProjectStore(state => state.setVideoUrl);
  const loadSegments = useProjectStore(state => state.loadSegments);
  const setBpm = useProjectStore(state => state.setBpm);

  // --- OPEN EXISTING PROJECT ---
  const handleOpenProject = (project: Project) => {
    const url = URL.createObjectURL(project.audioBlob);
    setProjectId(project.id);
    setProjectName(project.name);
    setVideoUrl(url);
    loadSegments(project.segments || []);
    setBpm(project.bpm || 0);
    setCurrentView('EDITOR');
  };

  // --- CREATE NEW PROJECT ---
  const handleCreateProject = async (file: File) => {
    const newId = crypto.randomUUID();
    const url = URL.createObjectURL(file);
    const name = file.name.split('.')[0];

    await db.projects.add({
      id: newId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      audioBlob: file,
      bpm: 0,
      segments: []
    });

    setProjectId(newId);
    setProjectName(name);
    setVideoUrl(url);
    loadSegments([]);
    setCurrentView('EDITOR');
  };

  // --- NAVIGATE BACK ---
  const handleBack = () => {
    setCurrentView('HOME');
    setProjectId(null);
  };

  // Render based on current view
  if (currentView === 'HOME') {
    return (
      <HomePage 
        onOpenProject={handleOpenProject}
        onCreateProject={handleCreateProject}
      />
    );
  }

  return (
    <EditorPage
      projectId={projectId || ''}
      projectName={projectName}
      setProjectName={setProjectName}
      onBack={handleBack}
    />
  );
}

export default App;
