import { memo, useState } from 'react';
import { Copy, Check, Sparkles, Camera, Sun, Palette, Star, CircleDot } from 'lucide-react';
import { 
  useProjectStore, 
  ENVIRONMENT_COLORS, 
  LIGHTING_OPTIONS, 
  CAMERA_OPTIONS, 
  STYLE_OPTIONS,
} from '../../store/useProjectStore';
import type { Segment, PromptFields } from '../../store/useProjectStore';

interface PromptBuilderProps {
  segment: Segment;
  segmentNumber: number;
}

// Generate a VEO-compatible prompt from structured fields
const generatePrompt = (segment: Segment): string => {
  const parts: string[] = [];
  const p = segment.prompt;
  
  if (p?.subject) parts.push(p.subject);
  if (p?.action) parts.push(p.action);
  
  // Add custom environment name if set
  if (segment.colorName) {
    parts.push(`in ${segment.colorName}`);
  }
  
  if (p?.lighting) parts.push(`${p.lighting} lighting`);
  if (p?.camera && p.camera !== 'Static') parts.push(`${p.camera} camera`);
  if (p?.style) parts.push(`${p.style} style`);
  
  return parts.join(', ') || segment.note || '';
};

export const PromptBuilder = memo(({ segment, segmentNumber }: PromptBuilderProps) => {
  const [copied, setCopied] = useState(false);
  const updateSegment = useProjectStore(state => state.updateSegment);
  
  const prompt = segment.prompt || { subject: '', action: '', lighting: '', camera: '', style: '' };
  
  const updatePromptField = (field: keyof PromptFields, value: string) => {
    updateSegment(segment.id, {
      prompt: { ...prompt, [field]: value }
    });
  };
  
  const setEnvironment = (envIndex: number, isHero: boolean) => {
    const env = ENVIRONMENT_COLORS[envIndex];
    updateSegment(segment.id, {
      color: isHero ? env.hero : env.fill,
      isHero
    });
  };

  const setEnvironmentName = (name: string) => {
    updateSegment(segment.id, { colorName: name });
  };
  
  const handleCopy = async () => {
    const text = generatePrompt(segment);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded"
            style={{ backgroundColor: segment.color || '#8b5cf6' }}
          />
          <span className="text-white font-bold">Kue #{segmentNumber}</span>
          {segment.isHero ? (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Star size={10} /> HERO
            </span>
          ) : (
            <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CircleDot size={10} /> FILL
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar Prompt'}
        </button>
      </div>
      
      {/* Environment: Colors + Custom Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Color Selector */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Palette size={10} /> Color
          </label>
          <div className="flex flex-wrap gap-1">
            {ENVIRONMENT_COLORS.map((env, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                {/* Hero variant */}
                <button
                  onClick={() => setEnvironment(idx, true)}
                  title="Hero (brillante)"
                  className={`w-6 h-5 rounded-t border transition-all ${
                    segment.color === env.hero && segment.isHero 
                      ? 'ring-2 ring-white scale-110 border-white' 
                      : 'hover:scale-105 border-white/20'
                  }`}
                  style={{ backgroundColor: env.hero }}
                />
                {/* Fill variant */}
                <button
                  onClick={() => setEnvironment(idx, false)}
                  title="Fill (apagado)"
                  className={`w-6 h-5 rounded-b border transition-all ${
                    segment.color === env.fill && !segment.isHero 
                      ? 'ring-2 ring-white scale-110 border-white' 
                      : 'hover:scale-105 border-white/20'
                  }`}
                  style={{ backgroundColor: env.fill }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Custom Environment Name */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Sparkles size={10} /> Entorno (texto libre)
          </label>
          <input
            type="text"
            value={segment.colorName || ''}
            onChange={(e) => setEnvironmentName(e.target.value)}
            placeholder="Ej: Playa al atardecer, Club nocturno..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/30 outline-none focus:border-neon-purple/50"
          />
        </div>
      </div>
      
      {/* Subject & Action - Free text */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Sparkles size={10} /> Sujeto
          </label>
          <input
            type="text"
            value={prompt.subject}
            onChange={(e) => updatePromptField('subject', e.target.value)}
            placeholder="Mujer joven, vestido rojo..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/20 outline-none focus:border-neon-purple/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Sparkles size={10} /> Acción
          </label>
          <input
            type="text"
            value={prompt.action}
            onChange={(e) => updatePromptField('action', e.target.value)}
            placeholder="Caminando, mirando a cámara..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-white/20 outline-none focus:border-neon-purple/50"
          />
        </div>
      </div>
      
      {/* Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Lighting */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Sun size={10} /> Iluminación
          </label>
          <select
            value={prompt.lighting}
            onChange={(e) => updatePromptField('lighting', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm outline-none focus:border-neon-purple/50 cursor-pointer"
          >
            <option value="" className="bg-cyber-gray">Seleccionar...</option>
            {LIGHTING_OPTIONS.map(opt => (
              <option key={opt} value={opt} className="bg-cyber-gray">{opt}</option>
            ))}
          </select>
        </div>
        
        {/* Camera */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Camera size={10} /> Cámara
          </label>
          <select
            value={prompt.camera}
            onChange={(e) => updatePromptField('camera', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm outline-none focus:border-neon-purple/50 cursor-pointer"
          >
            <option value="" className="bg-cyber-gray">Seleccionar...</option>
            {CAMERA_OPTIONS.map(opt => (
              <option key={opt} value={opt} className="bg-cyber-gray">{opt}</option>
            ))}
          </select>
        </div>
        
        {/* Style */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Palette size={10} /> Estilo
          </label>
          <select
            value={prompt.style}
            onChange={(e) => updatePromptField('style', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm outline-none focus:border-neon-purple/50 cursor-pointer"
          >
            <option value="" className="bg-cyber-gray">Seleccionar...</option>
            {STYLE_OPTIONS.map(opt => (
              <option key={opt} value={opt} className="bg-cyber-gray">{opt}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Generated Prompt Preview */}
      <div className="bg-white/5 border border-white/10 rounded p-3">
        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Prompt Generado</div>
        <p className="text-white/80 text-sm italic">
          {generatePrompt(segment) || 'Completa los campos para generar el prompt...'}
        </p>
      </div>
    </div>
  );
});

PromptBuilder.displayName = 'PromptBuilder';
