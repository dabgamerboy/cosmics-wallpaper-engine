
import React, { useState } from 'react';
import { Eraser, Palette, Sparkles, Wand2, X, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { ModelType, AspectRatio, ImageSize } from '../types';

interface EditingToolsProps {
  onEdit: (instruction: string, overrideModel?: ModelType, overrideSize?: ImageSize) => void;
  onClose: () => void;
  isProcessing: boolean;
  hasProKey: boolean;
  currentAspectRatio: AspectRatio;
}

type EditMode = 'remove' | 'transfer' | 'upscale' | null;

const EditingTools: React.FC<EditingToolsProps> = ({ 
  onEdit, 
  onClose, 
  isProcessing, 
  hasProKey,
  currentAspectRatio 
}) => {
  const [mode, setMode] = useState<EditMode>(null);
  const [input, setInput] = useState('');

  const handleApply = () => {
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

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-80 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right-4 duration-300 z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">AI Magic Tools</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {!mode ? (
        <div className="space-y-2">
          <button 
            onClick={() => setMode('remove')}
            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-left group"
          >
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
              <Eraser size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Object Removal</p>
              <p className="text-[10px] text-gray-400">Erase unwanted items from the scene</p>
            </div>
          </button>

          <button 
            onClick={() => setMode('transfer')}
            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-left group"
          >
            <div className="p-2 bg-primary/20 text-primary rounded-lg group-hover:scale-110 transition-transform">
              <Palette size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Style Transfer</p>
              <p className="text-[10px] text-gray-400">Apply a new artistic style to your wallpaper</p>
            </div>
          </button>

          <button 
            onClick={() => setMode('upscale')}
            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-left group"
          >
            <div className="p-2 bg-secondary/20 text-secondary rounded-lg group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Pro Upscale</p>
              <p className="text-[10px] text-gray-400">Enhance resolution to 4K using Gemini Pro</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <button 
            onClick={() => { setMode(null); setInput(''); }}
            className="text-[10px] font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest"
          >
            <X size={12} /> Back to tools
          </button>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-300">
              {mode === 'remove' && 'What should we remove?'}
              {mode === 'transfer' && 'Describe the new style:'}
              {mode === 'upscale' && 'Upscale to 4K Ultra HD'}
            </h4>
            
            {mode !== 'upscale' && (
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'remove' ? 'e.g. the red car, the person in the background' : 'e.g. Cyberpunk oil painting, Van Gogh starry night style'}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-none"
              />
            )}

            {mode === 'upscale' && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary-foreground leading-relaxed">
                This will re-render the image using the Gemini 3 Pro model at 4K resolution while preserving the original composition. 
                {!hasProKey && <p className="mt-2 text-yellow-500 font-bold">Pro key required for 4K.</p>}
              </div>
            )}

            <button 
              onClick={handleApply}
              disabled={isProcessing || (mode !== 'upscale' && !input.trim())}
              className="w-full py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Applying Magic...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Apply Edit
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
