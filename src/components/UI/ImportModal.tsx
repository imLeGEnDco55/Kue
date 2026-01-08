/**
 * IMPORT PROJECT MODAL
 * 
 * Handles importing .kue files with conflict resolution
 */

import { useState, useRef } from 'react';
import { X, Package, Upload, AlertTriangle, Loader2, Check, Clock, FileWarning } from 'lucide-react';
import { parseKueFile, checkConflict, importProject, formatDate } from '../../utils/projectPackager';
import type { Project } from '../../types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: (project: Project) => void;
}

type ImportState = 
    | { status: 'idle' }
    | { status: 'loading'; message: string }
    | { status: 'conflict'; manifest: any; mediaBlob: Blob; images: Map<string, Blob>; localProject: Project; localIsNewer: boolean }
    | { status: 'success'; project: Project }
    | { status: 'error'; message: string };

export const ImportModal = ({ isOpen, onClose, onImportSuccess }: ImportModalProps) => {
    const [state, setState] = useState<ImportState>({ status: 'idle' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate extension
        if (!file.name.endsWith('.kue') && !file.name.endsWith('.zip')) {
            setState({ status: 'error', message: 'Por favor selecciona un archivo .kue válido' });
            return;
        }

        setState({ status: 'loading', message: 'Leyendo archivo...' });

        try {
            const { manifest, mediaBlob, images } = await parseKueFile(file);
            
            setState({ status: 'loading', message: 'Verificando conflictos...' });
            const conflict = await checkConflict(manifest);

            if (conflict.exists && conflict.localProject) {
                setState({
                    status: 'conflict',
                    manifest,
                    mediaBlob,
                    images,
                    localProject: conflict.localProject,
                    localIsNewer: conflict.localIsNewer || false
                });
            } else {
                // No conflict, import directly
                setState({ status: 'loading', message: 'Importando proyecto...' });
                const project = await importProject(manifest, mediaBlob, images, false);
                setState({ status: 'success', project });
            }
        } catch (error) {
            console.error('Import error:', error);
            setState({ 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Error al importar el proyecto'
            });
        }

        // Reset file input
        if (e.target) e.target.value = '';
    };

    const handleConflictChoice = async (overwrite: boolean) => {
        if (state.status !== 'conflict') return;

        setState({ status: 'loading', message: overwrite ? 'Sobrescribiendo proyecto...' : 'Importando como copia...' });

        try {
            const project = await importProject(state.manifest, state.mediaBlob, state.images, overwrite);
            setState({ status: 'success', project });
        } catch (error) {
            console.error('Import error:', error);
            setState({ 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Error al importar el proyecto'
            });
        }
    };

    const handleSuccess = () => {
        if (state.status === 'success') {
            onImportSuccess(state.project);
            handleClose();
        }
    };

    const handleClose = () => {
        setState({ status: 'idle' });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-cyber-gray border border-green-500/30 rounded-2xl w-full max-w-md flex flex-col shadow-2xl shadow-green-500/20">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package size={24} className="text-green-400" />
                        Importar Proyecto
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".kue,.zip"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* IDLE STATE */}
                    {state.status === 'idle' && (
                        <div className="text-center">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-green-400/50 hover:bg-green-500/5 transition-all cursor-pointer group"
                            >
                                <Upload size={48} className="mx-auto mb-4 text-white/40 group-hover:text-green-400 transition-colors" />
                                <p className="text-white/60 group-hover:text-white transition-colors">
                                    Haz clic para seleccionar un archivo <strong>.kue</strong>
                                </p>
                                <p className="text-white/30 text-sm mt-2">
                                    o arrastra y suelta aquí
                                </p>
                            </div>
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {state.status === 'loading' && (
                        <div className="text-center py-8">
                            <Loader2 size={48} className="mx-auto mb-4 text-green-400 animate-spin" />
                            <p className="text-white/80">{state.message}</p>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {state.status === 'error' && (
                        <div className="text-center">
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-4">
                                <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
                                <p className="text-red-400 font-medium">{state.message}</p>
                            </div>
                            <button
                                onClick={() => setState({ status: 'idle' })}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {/* CONFLICT STATE */}
                    {state.status === 'conflict' && (
                        <div>
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <FileWarning size={24} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-400 font-medium mb-1">
                                            ¡Este proyecto ya existe!
                                        </p>
                                        <p className="text-white/60 text-sm">
                                            "{state.manifest.name}" ya está en tu biblioteca.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {/* Local */}
                                <div className={`p-3 rounded-lg border ${state.localIsNewer ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={14} className="text-white/40" />
                                        <span className="text-xs font-mono text-white/40">LOCAL</span>
                                        {state.localIsNewer && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">MÁS NUEVO</span>
                                        )}
                                    </div>
                                    <p className="text-white text-sm font-medium truncate">{state.localProject.name}</p>
                                    <p className="text-white/40 text-xs">{formatDate(state.localProject.updatedAt)}</p>
                                    <p className="text-white/40 text-xs">{state.localProject.segments?.length || 0} Kues</p>
                                </div>

                                {/* Imported */}
                                <div className={`p-3 rounded-lg border ${!state.localIsNewer ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package size={14} className="text-white/40" />
                                        <span className="text-xs font-mono text-white/40">ARCHIVO</span>
                                        {!state.localIsNewer && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">MÁS NUEVO</span>
                                        )}
                                    </div>
                                    <p className="text-white text-sm font-medium truncate">{state.manifest.name}</p>
                                    <p className="text-white/40 text-xs">{formatDate(state.manifest.updatedAt)}</p>
                                    <p className="text-white/40 text-xs">{state.manifest.segments?.length || 0} Kues</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleConflictChoice(false)}
                                    className="flex-1 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors text-sm"
                                >
                                    Guardar como copia
                                </button>
                                <button
                                    onClick={() => handleConflictChoice(true)}
                                    className={`flex-1 p-3 rounded-xl font-medium transition-colors text-sm ${
                                        state.localIsNewer 
                                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                                            : 'bg-green-500 hover:bg-green-600 text-black'
                                    }`}
                                >
                                    {state.localIsNewer ? 'Sobrescribir (perder cambios)' : 'Actualizar proyecto'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {state.status === 'success' && (
                        <div className="text-center">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-4">
                                <Check size={48} className="mx-auto mb-4 text-green-400" />
                                <p className="text-green-400 font-medium mb-1">¡Proyecto importado!</p>
                                <p className="text-white text-lg font-bold">{state.project.name}</p>
                                <p className="text-white/40 text-sm">{state.project.segments?.length || 0} Kues</p>
                            </div>
                            <button
                                onClick={handleSuccess}
                                className="w-full p-3 bg-green-500 hover:bg-green-600 rounded-xl text-black font-bold transition-colors"
                            >
                                Abrir Proyecto
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
