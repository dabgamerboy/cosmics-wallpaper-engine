
import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Palette, Sparkles, Wand2, X, ArrowRight, Zap, Loader2, PlayCircle, CloudRain, Wind, Brush, Cpu, Layers, Image as ImageIcon, Sparkle, Key, MousePointer2, Undo, ChevronLeft, Maximize2, Trash2, RefreshCcw } from 'lucide-react';
import { ModelType, AspectRatio, ImageSize } from '../types';

interface EditingToolsProps {
  onEdit: (instruction: string, overrideModel?: ModelType, overrideSize?: ImageSize, maskImage?: string) => void;
  onAnimate: (motionPrompt: string) => void;
  onRequestProKey: () => void;
  onClose: () => void;
  isProcessing: boolean;
  hasProKey: boolean;
  currentAspectRatio: AspectRatio;
}

type EditMode = 'remove' | 'transfer' | 'upscale' | 'animate' | 'inpainting' | null;

const EditingTools: React.FC<EditingToolsProps> = ({ 
  onEdit, 
  onAnimate,
  onRequestProKey,
  onClose, 
  isProcessing, 
  hasProKey,
  currentAspectRatio 
}) => {
  const [mode, setMode] = useState<EditMode>(null);
  const [input, setInput] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    if (mode === 'inpainting' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasMask(false);
      }
    }
  }, [mode]);

  const handleApply = () => {
    if (mode === 'animate') {
      onAnimate(input || "subtle cinematic motion, slow movement, high quality loop");
      return;
    }

    let instruction = '';
    let overrideModel: ModelType | undefined;
    let overrideSize: ImageSize | undefined;
    let maskImage: string | undefined;

    if (mode === 'inpainting' && canvasRef.current) {
        maskImage = canvasRef.current.toDataURL('image/png');
    }

    switch (mode) {
      case 'remove':
        instruction = `Remove ${input} from the image. Blend the area perfectly.`;
        break;
      case 'transfer':
        instruction = `Apply the style of ${input} to this image while keeping the original composition.`;
        break;
      case 'upscale':
        instruction = `Upscale this image to 4K resolution, enhancing sharpness and fine details.`;
        overrideModel = ModelType.Pro;
        overrideSize = ImageSize.x4K;
        break;
      case 'inpainting':
        instruction = `Transform the masked area of the image into: ${input}. Match surroundings perfectly.`;
        break;
    }

    if (instruction) onEdit(instruction, overrideModel, overrideSize, maskImage);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? (e.touches[0].clientX - rect.left) * (canvas.width / rect.width) : (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = ('touches' in e) ? (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) : (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(129, 140, 248, 0.5)';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasMask(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasMask(false);
    }
  };

  const stylePresets = [
    { name: 'Studio Ghibli', value: 'Studio Ghibli anime style', icon: <Sparkle size={10} /> },
    { name: 'Cyberpunk', value: 'Cyberpunk neon aesthetics', icon: <Cpu size={10} /> },
    { name: 'Oil Painting', value: 'Classical thick oil painting', icon: <Brush size={10} /> },
    { name: 'Synthwave', value: '80s Synthwave grid style', icon: <Layers size={10} /> },
  ];

  return (
    <>
      {/* Inpainting Mask Canvas Overlay */}
      {mode === 'inpainting' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative group pointer-events-auto" style={{ 
            aspectRatio: currentAspectRatio === AspectRatio.Landscape ? '16/9' : currentAspectRatio === AspectRatio.Portrait ? '9/16' : '1/1',
            width: currentAspectRatio === AspectRatio.Landscape ? '90vw' : 'auto',
            height: currentAspectRatio === AspectRatio.Landscape ? 'auto' : '80vh',
            maxWidth: '1400px'
          }}>
            <canvas
              ref={canvasRef}
              width={1600}
              height={900}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
              className="absolute inset-0 w-full h-full cursor-crosshair z-10 rounded-3xl"
              style={{ touchAction: 'none' }}
            />
            
            {/* Contextual Mask Controls */}
            <div className="absolute top-8 left-8 z-20 animate-in slide-in-from-left-4 duration-500">
               <div className="glass-panel bg-surface/90 p-3 rounded-3xl border border-white/10 flex items-center gap-6 shadow-2xl pl-5 pr-4 py-3">
                  <div className="flex flex-col gap-1 px-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Brush Size</span>
                    <input 
                      type="range" min="10" max="150" value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-28 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <button 
                    onClick={clearCanvas} 
                    className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-muted hover:text-red-400 transition-all rounded-2xl group/reset"
                    title="Clear Current Mask"
                  >
                    <Trash2 size={16} className="group-hover/reset:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Reset Mask</span>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Dashboard Sidebar */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 w-[340px] glass-panel bg-surface/95 border-white/10 rounded-[2.5rem] p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] animate-in slide-in-from-right-8 duration-700 z-[110]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(129,140,248,0.3)]">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Magic Forge</h3>
              <span className="text-[8px] text-muted uppercase tracking-widest mt-0.5">Edit AI Subsystem</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-foreground hover:bg-white/5 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {!mode ? (
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'animate', label: 'Animate', desc: 'Add fluid motion loops', icon: <PlayCircle />, color: 'text-pink-400' },
              { id: 'inpainting', label: 'Inpaint', desc: 'Rewrite specific regions', icon: <Brush />, color: 'text-primary' },
              { id: 'remove', label: 'Erase', desc: 'Clean objects from scene', icon: <Eraser />, color: 'text-red-400' },
              { id: 'transfer', label: 'Reskin', desc: 'Swap artistic styles', icon: <Palette />, color: 'text-secondary' },
              { id: 'upscale', label: 'Upscale', desc: 'Enhance to 4K clarity', icon: <Maximize2 />, color: 'text-yellow-400' },
            ].map((tool) => (
              <button 
                key={tool.id} 
                onClick={() => setMode(tool.id as EditMode)}
                className="group w-full flex items-center gap-4 p-4 bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl transition-all text-left"
              >
                <div className={`p-3 rounded-xl bg-black/40 border border-white/5 group-hover:scale-110 transition-transform ${tool.color}`}>
                  {React.cloneElement(tool.icon as React.ReactElement, { size: 20 })}
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest">{tool.label}</p>
                  <p className="text-[8px] text-muted tracking-tight mt-0.5">{tool.desc}</p>
                </div>
                <ChevronLeft size={14} className="ml-auto text-muted opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all rotate-180" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <button 
              onClick={() => { setMode(null); setInput(''); setHasMask(false); }}
              className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted hover:text-primary transition-colors"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Return to Forge
            </button>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] ml-1">Instruction</p>
                {mode !== 'upscale' && (
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      mode === 'animate' ? "e.g. rain falling slowly, cinematic parallax..." :
                      mode === 'inpainting' ? "e.g. glowing crystals, ancient statue..." :
                      "Describe the transformation..."
                    }
                    className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 text-[11px] h-32 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted/20"
                  />
                )}
              </div>

              {/* Presets Group */}
              {(mode === 'transfer' || mode === 'animate') && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] ml-1">Vibe Library</p>
                  <div className="flex flex-wrap gap-2">
                    {(mode === 'transfer' ? stylePresets : [
                      { name: 'Soft Rain', value: 'subtle rain falling', icon: <CloudRain size={10} /> },
                      { name: 'Drift', value: 'soft wind blowing through', icon: <Wind size={10} /> },
                    ]).map((preset) => (
                      <button 
                        key={preset.name} onClick={() => setInput(preset.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${input === preset.value ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-muted hover:border-white/20'}`}
                      >
                        {preset.icon} {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'upscale' && (
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/20 rounded-xl text-primary"><Zap size={16} /></div>
                     <p className="text-[10px] font-black uppercase tracking-widest">4K Neural Reconstruction</p>
                  </div>
                  <p className="text-[9px] text-muted leading-relaxed">
                    <span className="text-foreground font-bold">Enhanced detail and clarity.</span> Reconstruct textures with <strong className="text-primary">Gemini 3 Pro</strong> for ultra-high fidelity 4K output.
                  </p>
                  {!hasProKey && (
                    <button onClick={onRequestProKey} className="w-full py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[9px] font-black uppercase text-yellow-500 flex items-center justify-center gap-2">
                      <Key size={12} /> Unlock Pro Engine
                    </button>
                  )}
                </div>
              )}

              <button 
                onClick={handleApply}
                disabled={isProcessing || (mode !== 'upscale' && mode !== 'animate' && !input.trim()) || (mode === 'inpainting' && (!input.trim() || !hasMask))}
                className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                  mode === 'animate' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/20' : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02]'
                }`}
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {isProcessing ? 'Processing' : 'Execute'}
              </button>
              
              {mode === 'inpainting' && !hasMask && !isProcessing && (
                <p className="text-[8px] font-black text-center text-primary uppercase tracking-[0.2em] animate-pulse">Select Region to Modify</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EditingTools;
