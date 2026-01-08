import { X, FileJson, FileSpreadsheet, Film, Copy, Check, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { formatTime } from '../../utils/audioAnalysis';
import { exportProject } from '../../utils/projectPackager';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectName: string;
    projectId: string;
}

// Maximum recommended duration for AI video generators like Veo
const MAX_AI_SHOT_DURATION = 8;

export const ExportModal = ({ isOpen, onClose, projectName, projectId }: ExportModalProps) => {
    const { segments, bpm } = useProjectStore();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'project' | 'json' | 'csv' | 'script'>('script');
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Generate JSON backup
    const generateJSON = () => {
        const data = {
            projectName,
            projectId,
            bpm,
            exportedAt: new Date().toISOString(),
            segments: segments.map(s => ({
                id: s.id,
                start: s.start,
                end: s.end,
                duration: s.end - s.start,
                note: s.note,
                color: s.color,
                hasThumbnail: !!s.thumbnail
            }))
        };
        return JSON.stringify(data, null, 2);
    };

    // Generate CSV
    const generateCSV = () => {
        const headers = 'Shot,Start,End,Duration,Note';
        const rows = segments.map((s, i) =>
            `${i + 1},${s.start.toFixed(3)},${s.end.toFixed(3)},${(s.end - s.start).toFixed(3)},"${s.note.replace(/"/g, '""')}"`
        );
        return [headers, ...rows].join('\n');
    };

    // Generate AI Script optimized for AI video generators like Veo
    const generateAIScript = () => {
        const lines: string[] = [];

        // Header
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push(`   🎬 ${projectName.toUpperCase()}`);
        lines.push('   Guión Cinematográfico para IA');
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('');
        lines.push(`📊 BPM: ${bpm || 'No detectado'}`);
        lines.push(`📁 Total Shots: ${segments.length}`);
        lines.push(`⏱️  Duración Total: ${formatTime(segments.reduce((acc, s) => acc + (s.end - s.start), 0), false)}`);
        lines.push('');

        // Warning about long shots
        const longShots = segments.filter(s => (s.end - s.start) > MAX_AI_SHOT_DURATION);
        if (longShots.length > 0) {
            lines.push('⚠️  ADVERTENCIA: Los siguientes shots exceden 8 segundos.');
            lines.push('    Considera dividirlos para mejor generación');
            longShots.forEach((s) => {
                const idx = segments.findIndex(seg => seg.id === s.id) + 1;
                lines.push(`    - Shot ${idx.toString().padStart(2, '0')}: ${(s.end - s.start).toFixed(1)}s`);
            });
            lines.push('');
        }

        lines.push('───────────────────────────────────────────────────────────');
        lines.push('');

        // Each shot
        segments.forEach((s, i) => {
            const duration = s.end - s.start;
            const frames = Math.round(duration * 24); // Assuming 24fps
            const shotNum = (i + 1).toString().padStart(2, '0');
            const isLong = duration > MAX_AI_SHOT_DURATION;

            lines.push(`┌─────────────────────────────────────────────────────────┐`);
            lines.push(`│  SHOT ${shotNum}  ${isLong ? '⚠️' : '  '}                                            │`);
            lines.push(`├─────────────────────────────────────────────────────────┤`);
            lines.push(`│  ⏱️  Duración: ${duration.toFixed(2)}s (${frames} frames @ 24fps)`);
            lines.push(`│  🕐 Tiempo: ${formatTime(s.start)} → ${formatTime(s.end)}`);
            lines.push(`│`);
            lines.push(`│  📝 PROMPT:`);

            // Format the note/prompt with word wrap
            const promptText = s.note || '[Sin descripción - Agrega una nota en el editor]';
            const wrappedPrompt = wrapText(promptText, 55);
            wrappedPrompt.forEach(line => {
                lines.push(`│     ${line}`);
            });

            lines.push(`│`);
            lines.push(`└─────────────────────────────────────────────────────────┘`);
            lines.push('');
        });

        // Footer with tips
        lines.push('───────────────────────────────────────────────────────────');
        lines.push('');
        lines.push('💡 TIPS PARA GENERACIÓN DE VIDEO CON IA:');
        lines.push('   • Máximo recomendado por clip: 8 segundos');
        lines.push('   • Incluye estilo visual: "cinematic", "anime", "realistic"');
        lines.push('   • Describe movimientos de cámara: "slow pan", "dolly in"');
        lines.push('   • Mantén consistencia de personajes entre shots');
        lines.push('');
        lines.push(`Generado con KueStudio • ${new Date().toLocaleString()}`);

        return lines.join('\n');
    };

    // Helper to wrap text
    const wrapText = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length <= maxWidth) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) lines.push(currentLine);

        return lines.length > 0 ? lines : [''];
    };

    // Get current export content
    const getContent = () => {
        switch (activeTab) {
            case 'json': return generateJSON();
            case 'csv': return generateCSV();
            case 'script': return generateAIScript();
            case 'project': return `📦 Proyecto: ${projectName}\n\n` +
                `Este archivo .kue contiene:\n` +
                `• Audio/Video original\n` +
                `• ${segments.length} Kues con toda su información\n` +
                `• ${segments.filter(s => s.thumbnail).length} imágenes en alta calidad (1280x720)\n` +
                `• Metadata (BPM: ${bpm || 'N/A'})\n\n` +
                `El archivo .kue es un ZIP que puedes abrir\n` +
                `con cualquier programa de descompresión\n` +
                `para extraer las imágenes si lo necesitas.`;
        }
    };

    // Download project as .kue
    const downloadKueFile = async () => {
        setIsExporting(true);
        setExportError(null);
        try {
            const blob = await exportProject(projectId);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${projectName}.kue`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error('Error exporting project:', error);
            setExportError('Error al exportar el proyecto');
        } finally {
            setIsExporting(false);
        }
    };

    // Download file
    const downloadFile = () => {
        if (activeTab === 'project') {
            downloadKueFile();
            return;
        }
        
        const content = getContent();
        const extensions = { json: 'json', csv: 'csv', script: 'txt', project: 'kue' };
        const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            script: 'text/plain',
            project: 'application/zip'
        };

        const blob = new Blob([content || ''], { type: mimeTypes[activeTab] });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${projectName}_${activeTab}.${extensions[activeTab]}`;
        a.click();
    };

    // Copy to clipboard
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(getContent());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-cyber-gray border border-neon-purple/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-neon-purple/20">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Film size={24} className="text-neon-purple" />
                        Exportar Proyecto
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('project')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors min-w-fit ${activeTab === 'project'
                            ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Package size={18} />
                        <span className="font-medium whitespace-nowrap">.kue</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('script')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'script'
                            ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Film size={18} />
                        <span className="font-medium">Guión</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'json'
                            ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <FileJson size={18} />
                        <span className="font-medium hidden sm:inline">JSON</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('csv')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'csv'
                            ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <FileSpreadsheet size={18} />
                        <span className="font-medium hidden sm:inline">CSV</span>
                    </button>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto p-4">
                    <pre className="bg-black/50 rounded-lg p-4 text-sm text-white/80 font-mono whitespace-pre-wrap overflow-auto max-h-[400px] border border-white/10">
                        {getContent()}
                    </pre>
                </div>

                {/* Warning if no segments */}
                {segments.length === 0 && (
                    <div className="mx-4 mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3 text-amber-400">
                        <AlertTriangle size={20} />
                        <span className="text-sm">No hay segmentos para exportar. Crea algunos Kues primero.</span>
                    </div>
                )}

                {/* Error message */}
                {exportError && (
                    <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                        <AlertTriangle size={20} />
                        <span className="text-sm">{exportError}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-white/10">
                    {activeTab !== 'project' && (
                        <button
                            onClick={copyToClipboard}
                            className="flex-1 p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-white transition-colors"
                        >
                            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    )}
                    <button
                        onClick={downloadFile}
                        disabled={isExporting || (activeTab !== 'project' && segments.length === 0)}
                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'project' 
                                ? 'bg-green-500 hover:bg-green-600 text-black' 
                                : 'bg-neon-purple hover:bg-neon-purple/80 text-black'
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Empaquetando...
                            </>
                        ) : activeTab === 'project' ? (
                            <>
                                <Package size={18} />
                                Descargar .kue
                            </>
                        ) : (
                            <>
                                <Film size={18} />
                                Descargar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
