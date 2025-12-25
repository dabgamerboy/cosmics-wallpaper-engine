
import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Palette, Sparkles, Wand2, X, ArrowRight, Zap, Loader2, PlayCircle, CloudRain, Wind, Brush, Cpu, Layers, Image as ImageIcon, Sparkle, Key, MousePointer2, Undo } from 'lucide-react';
import { ModelType, AspectRatio, ImageSize } from '../types';

interface EditingToolsProps {
  onEdit: (instruction: string, overrideModel?: ModelType, overrideSize?: ImageSize) => void;
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

  // Initialize and handle inpainting canvas
  useEffect(() => {
    if (mode === 'inpainting' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear and match container size
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

    switch (mode) {
      case 'remove':
        instruction = `Remove the ${input} from the image. Blend the area naturally with the surrounding background, textures, and lighting. The result must be seamless.`;
        break;
      case 'transfer':
        instruction = `Recreate this image but apply the style of ${input}. Keep the overall composition and subjects the same, but transform the visual style completely. The atmosphere, color palette, and brushwork should reflect the ${input} style.`;
        break;
      case 'upscale':
        instruction = `Upscale this image to a much higher resolution. Maintain all existing details, textures, and composition perfectly while enhancing sharpness and clarity. Do not change the subject.`;
        overrideModel = ModelType.Pro;
        overrideSize = ImageSize.x4K;
        break;
      case 'inpainting':
        instruction = `In the specific area I have highlighted, please add or transform it into: ${input}. Ensure the new content blends perfectly with the lighting, perspective, and style of the surrounding image.`;
        break;
    }

    if (instruction) {
      onEdit(instruction, overrideModel, overrideSize);
    }
  };

  const setPreset = (preset: string) => {
    setInput(preset);
  };

  // Canvas Drawing Logic
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
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)'; // Cosmic primary color with alpha
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#818cf8';

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
    { name: 'Studio Ghibli', value: 'Studio Ghibli anime style, lush hand-painted landscapes, soft lighting, whimsical atmosphere', icon: <Sparkle size={10} /> },
    { name: 'Cyberpunk', value: 'Cyberpunk aesthetic, neon lighting, rainy nights, high-tech low-life, gritty futuristic textures', icon: <Cpu size={10} /> },
    { name: 'Oil Painting', value: 'Classical oil painting, thick impasto brushstrokes, rich textures, dramatic lighting, canvas feel', icon: <Brush size={10} /> },
    { name: 'Watercolor', value: 'Soft watercolor style, ethereal washes, delicate paper texture, bleeding colors', icon: <Palette size={10} /> },
    { name: 'Synthwave', value: '80s Synthwave, retro-futurism, purple and pink gradients, digital grids, VHS glitch effects', icon: <Layers size={10} /> },
    { name: 'Sketch', value: 'Detailed charcoal and pencil sketch, rough paper texture, hatching and cross-hatching', icon: <ImageIcon size={10} /> },
  ];

  return (
    <>
      {/* Inpainting Overlay Portal-like Canvas */}
      {mode === 'inpainting' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative group pointer-events-auto" style={{ 
            aspectRatio: currentAspectRatio === AspectRatio.Landscape ? '16/9' : currentAspectRatio === AspectRatio.Portrait ? '9/16' : '1/1',
            width: currentAspectRatio === AspectRatio.Landscape ? '90vw' : 'auto',
            height: currentAspectRatio === AspectRatio.Landscape ? 'auto' : '80vh',
            maxWidth: '1600px'
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
              className="absolute inset-0 w-full h-full cursor-crosshair z-10 rounded-xl"
              style={{ touchAction: 'none' }}
            />
            <div className="absolute top-4 left-4 z-20 flex gap-2">
               <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Inpainting Mode</span>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted uppercase">Size</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="150" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <button onClick={clearCanvas} className="p-1 hover:text-red-400 transition-colors" title="Clear Mask">
                    <Undo size={14} />
                  </button>
               </div>
            </div>
            <div className="absolute inset-0 border-4 border-primary/40 rounded-xl pointer-events-none animate-pulse-slow" />
          </div>
          
          {/* Instructions Toast */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-primary/20 shadow-2xl animate-in fade-in slide-in-from-top-4">
             <div className="flex items-center gap-3">
                <MousePointer2 className="text-primary" size={18} />
                <p className="text-sm font-medium">Brush over the area you want the AI to transform.</p>
             </div>
          </div>
        </div>
      )}

      {/* Main Sidebar Tools */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-80 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right-4 duration-300 z-50 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">AI Magic Tools</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {!mode ? (
          <div className="space-y-2">
            <button 
              onClick={() => setMode('animate')}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-border transition-all text-left group"
            >
              <div className="p-2 bg-pink-500/20 text-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                <PlayCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Animate Loop</p>
                <p className="text-[10px] text-muted">Transform this still into a living video loop</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('inpainting')}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary shadow-lg shadow-primary/5 transition-all text-left group"
            >
              <div className="p-2 bg-primary/20 text-primary rounded-lg group-hover:scale-110 transition-transform">
                <Brush size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Inpainting</p>
                <p className="text-[10px] text-muted">Brush over a specific area to change it</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('remove')}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-border transition-all text-left group"
            >
              <div className="p-2 bg-red-500/20 text-red-500 rounded-lg group-hover:scale-110 transition-transform">
                <Eraser size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Object Removal</p>
                <p className="text-[10px] text-muted">Erase unwanted items from the scene</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('transfer')}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-border transition-all text-left group"
            >
              <div className="p-2 bg-primary/20 text-primary rounded-lg group-hover:scale-110 transition-transform">
                <Palette size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Style Transfer</p>
                <p className="text-[10px] text-muted">Apply a new artistic style to your wallpaper</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('upscale')}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-border transition-all text-left group"
            >
              <div className="p-2 bg-secondary/20 text-secondary rounded-lg group-hover:scale-110 transition-transform">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Pro Upscale</p>
                <p className="text-[10px] text-muted">Enhance resolution to 4K using Gemini Pro</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <button 
              onClick={() => { setMode(null); setInput(''); setHasMask(false); }}
              className="text-[10px] font-bold text-muted hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest"
            >
              <X size={12} /> Back to tools
            </button>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted uppercase">
                {mode === 'remove' && 'What should we remove?'}
                {mode === 'transfer' && 'Describe the new style:'}
                {mode === 'upscale' && 'Upscale to 4K Ultra HD'}
                {mode === 'animate' && 'Animation Motion Description'}
                {mode === 'inpainting' && 'What should we add here?'}
              </h4>
              
              {mode === 'animate' && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <button onClick={() => setPreset("add subtle falling rain and wet surfaces")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground transition-colors">
                     <CloudRain size={10} /> Rain
                  </button>
                  <button onClick={() => setPreset("soft wind blowing through trees and fabrics")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground transition-colors">
                     <Wind size={10} /> Soft Wind
                  </button>
                  <button onClick={() => setPreset("cinematic parallax movement with subtle depth")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground transition-colors">
                     <ArrowRight size={10} /> Parallax
                  </button>
                </div>
              )}

              {mode === 'transfer' && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {stylePresets.map((preset) => (
                    <button 
                      key={preset.name}
                      onClick={() => setPreset(preset.value)} 
                      className={`px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 transition-colors ${input === preset.value ? 'border-primary ring-1 ring-primary text-primary' : 'text-foreground'}`}
                    >
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>
              )}

              {mode !== 'upscale' && (
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === 'remove' ? 'e.g. the red car, the person in the background' : 
                    mode === 'animate' ? 'e.g. subtle rain, moving clouds, slow zoom...' :
                    mode === 'inpainting' ? 'e.g. a glowing white lotus, a futuristic drone...' :
                    'e.g. Cyberpunk oil painting, Van Gogh starry night style'
                  }
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-none"
                />
              )}

              {mode === 'upscale' && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                     <div className="mt-1 p-1 bg-primary/20 rounded-md text-primary shrink-0">
                        <Zap size={14} />
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">Pro Upscaling Engine</p>
                        <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                          This re-renders your wallpaper using the advanced <strong>Gemini 3 Pro</strong> model at <strong>4K resolution</strong>. The AI enhances details and clarity while maintaining original composition.
                        </p>
                     </div>
                  </div>
                  
                  {!hasProKey && (
                    <div className="pt-2 border-t border-primary/10">
                      <button 
                        onClick={onRequestProKey}
                        className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                      >
                        <Key size={12} />
                        Enable Pro Mode to Access
                      </button>
                      <p className="text-[9px] text-center text-muted mt-2">Requires a paid Google Cloud API Key</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleApply}
                disabled={isProcessing || (mode !== 'upscale' && mode !== 'animate' && !input.trim()) || (mode === 'inpainting' && (!input.trim() || !hasMask))}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  mode === 'animate' ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 text-white' : 'bg-primary hover:bg-primary/80 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Applying Magic...
                  </>
                ) : (
                  <>
                    {mode === 'animate' ? <PlayCircle size={18} /> : mode === 'inpainting' ? <Brush size={18} /> : <Wand2 size={18} />}
                    {mode === 'animate' ? 'Render Video' : 'Apply Edit'}
                  </>
                )}
              </button>
              {mode === 'inpainting' && !hasMask && !isProcessing && (
                <p className="text-[10px] text-center text-primary animate-pulse mt-2 font-bold">Brush over the image area first</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EditingTools;
