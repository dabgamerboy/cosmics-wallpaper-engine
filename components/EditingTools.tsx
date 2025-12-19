
import React, { useState } from 'react';
import { Eraser, Palette, Sparkles, Wand2, X, ArrowRight, Zap, Loader2, PlayCircle, CloudRain, Wind } from 'lucide-react';
import { ModelType, AspectRatio, ImageSize } from '../types';

interface EditingToolsProps {
  onEdit: (instruction: string, overrideModel?: ModelType, overrideSize?: ImageSize) => void;
  onAnimate: (motionPrompt: string) => void;
  onClose: () => void;
  isProcessing: boolean;
  hasProKey: boolean;
  currentAspectRatio: AspectRatio;
}

type EditMode = 'remove' | 'transfer' | 'upscale' | 'animate' | null;

const EditingTools: React.FC<EditingToolsProps> = ({ 
  onEdit, 
  onAnimate,
  onClose, 
  isProcessing, 
  hasProKey,
  currentAspectRatio 
}) => {
  const [mode, setMode] = useState<EditMode>(null);
  const [input, setInput] = useState('');

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
        instruction = `Recreate this image but apply the style of ${input}. Keep the overall composition and subjects the same, but transform the visual style completely.`;
        break;
      case 'upscale':
        instruction = `Upscale this image to a much higher resolution. Maintain all existing details, textures, and composition perfectly while enhancing sharpness and clarity. Do not change the subject.`;
        overrideModel = ModelType.Pro;
        overrideSize = ImageSize.x4K;
        break;
    }

    if (instruction) {
      onEdit(instruction, overrideModel, overrideSize);
    }
  };

  const setAnimatePreset = (preset: string) => {
    setInput(preset);
  };

  return (
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
            onClick={() => { setMode(null); setInput(''); }}
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
            </h4>
            
            {mode === 'animate' && (
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={() => setAnimatePreset("add subtle falling rain and wet surfaces")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground">
                   <CloudRain size={10} /> Rain
                </button>
                <button onClick={() => setAnimatePreset("soft wind blowing through trees and fabrics")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground">
                   <Wind size={10} /> Soft Wind
                </button>
                <button onClick={() => setAnimatePreset("cinematic parallax movement with subtle depth")} className="px-2 py-1 bg-background hover:bg-surface border border-border rounded text-[10px] flex items-center gap-1 text-foreground">
                   <ArrowRight size={10} /> Parallax
                </button>
              </div>
            )}

            {mode !== 'upscale' && (
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === 'remove' ? 'e.g. the red car, the person in the background' : 
                  mode === 'animate' ? 'e.g. subtle rain, moving clouds, slow zoom...' :
                  'e.g. Cyberpunk oil painting, Van Gogh starry night style'
                }
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-none"
              />
            )}

            {mode === 'upscale' && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs text-foreground leading-relaxed">
                This will re-render the image using the Gemini 3 Pro model at 4K resolution while preserving the original composition. 
                {!hasProKey && <p className="mt-2 text-yellow-600 font-bold">Pro key required for 4K.</p>}
              </div>
            )}

            <button 
              onClick={handleApply}
              disabled={isProcessing || (mode !== 'upscale' && mode !== 'animate' && !input.trim())}
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
                  {mode === 'animate' ? <PlayCircle size={18} /> : <Wand2 size={18} />}
                  {mode === 'animate' ? 'Render Video' : 'Apply Edit'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditingTools;
