import React, { useState, useEffect } from 'react';
import { AspectRatio, ModelType, GenerationConfig, ImageSize, WallpaperType } from '../types';
import { Wand2, LayoutTemplate, Zap, Lock, Settings2, ChevronDown, Film, Image as ImageIcon } from 'lucide-react';

interface ControlsProps {
  isGenerating: boolean;
  onGenerate: (config: GenerationConfig) => void;
  onRequestProKey: () => void;
  hasProKey: boolean;
}

const Controls: React.FC<ControlsProps> = ({ isGenerating, onGenerate, onRequestProKey, hasProKey }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape);
  const [model, setModel] = useState<ModelType>(ModelType.Standard);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.x1K);
  const [type, setType] = useState<WallpaperType>(WallpaperType.Image);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset incompatible aspect ratios when switching to video
  useEffect(() => {
    if (type === WallpaperType.Video) {
      if (aspectRatio !== AspectRatio.Landscape && aspectRatio !== AspectRatio.Portrait) {
        setAspectRatio(AspectRatio.Landscape);
      }
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate({ prompt, aspectRatio, model, imageSize, type });
  };

  const handleModelChange = (newModel: ModelType) => {
    setModel(newModel);
    if (newModel === ModelType.Pro && !hasProKey) {
       onRequestProKey();
    }
  };

  const toggleType = () => {
    const newType = type === WallpaperType.Image ? WallpaperType.Video : WallpaperType.Image;
    setType(newType);
    if (newType === WallpaperType.Video && !hasProKey) {
      onRequestProKey();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex justify-center items-end pointer-events-none">
      <div className="w-full max-w-3xl bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 pointer-events-auto transition-all duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Top Row: Input & Generate */}
          <div className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={type === WallpaperType.Video ? "Describe your video loop (e.g., 'Neon city rain loop, cyberpunk')..." : "Describe your dream wallpaper..."}
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 whitespace-nowrap
                ${isGenerating 
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300' 
                  : 'bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white'
                }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{type === WallpaperType.Video ? 'Rendering...' : 'Dreaming...'}</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Row: Settings */}
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4">
               
               {/* Type Toggle (Image/Video) */}
               <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                  <button
                    type="button"
                    onClick={() => { setType(WallpaperType.Image); }}
                    className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.Image ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    <ImageIcon size={14} />
                    <span>Still</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType(WallpaperType.Video); if (!hasProKey) onRequestProKey(); }}
                    className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.Video ? 'bg-gradient-to-r from-pink-900 to-rose-900 text-pink-100 shadow-sm border border-pink-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                     {type !== WallpaperType.Video && !hasProKey && <Lock size={12} className="text-pink-500/80" />}
                    <Film size={14} />
                    <span>Animate</span>
                  </button>
               </div>

               {/* Aspect Ratio Selector */}
               <div className="relative group">
                 <button type="button" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <LayoutTemplate size={16} />
                    <span>{aspectRatio}</span>
                    <ChevronDown size={14} className="opacity-50" />
                 </button>
                 <div className="absolute bottom-full mb-2 left-0 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block w-32">
                    {Object.values(AspectRatio).map((ratio) => {
                      // Video only supports 16:9 and 9:16
                      const disabled = type === WallpaperType.Video && ratio !== AspectRatio.Landscape && ratio !== AspectRatio.Portrait;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          disabled={disabled}
                          onClick={() => setAspectRatio(ratio)}
                          className={`w-full text-left px-4 py-2 ${
                            disabled ? 'opacity-30 cursor-not-allowed bg-black/20' : 'hover:bg-white/5'
                          } ${aspectRatio === ratio ? 'text-secondary' : 'text-gray-300'}`}
                        >
                          {ratio}
                        </button>
                      );
                    })}
                 </div>
               </div>

               {/* Model Selector (Only for Image) */}
               {type === WallpaperType.Image && (
                 <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                   <button
                     type="button"
                     onClick={() => handleModelChange(ModelType.Standard)}
                     className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Standard ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                   >
                     <Zap size={14} />
                     <span>Flash</span>
                   </button>
                   <button
                     type="button"
                     onClick={() => handleModelChange(ModelType.Pro)}
                     className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Pro ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-purple-100 shadow-sm border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                   >
                     {model !== ModelType.Pro && !hasProKey && <Lock size={12} className="text-yellow-500/80" />}
                     <span>Pro</span>
                   </button>
                 </div>
               )}
            </div>

            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 transition-colors ${showAdvanced ? 'text-secondary' : 'text-gray-400 hover:text-white'}`}
            >
               <Settings2 size={16} />
               <span>Settings</span>
            </button>
          </div>

          {/* Advanced Settings Panel */}
          {showAdvanced && (
            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                   {type === WallpaperType.Video ? 'Video Resolution' : 'Image Resolution (Pro)'}
                </label>
                <div className="flex gap-2">
                  {type === WallpaperType.Video ? (
                     <div className="px-3 py-1.5 rounded-lg border text-xs border-pink-500/30 bg-pink-500/10 text-pink-200">
                        1080p (HD)
                     </div>
                  ) : (
                    Object.values(ImageSize).map((size) => (
                      <button
                        key={size}
                        type="button"
                        disabled={model !== ModelType.Pro}
                        onClick={() => setImageSize(size)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          imageSize === size && model === ModelType.Pro
                            ? 'border-secondary bg-secondary/20 text-secondary'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                        } ${model !== ModelType.Pro ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {size}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-end">
                 {/* Key Status Messages */}
                 {type === WallpaperType.Video && !hasProKey && (
                     <div className="text-xs text-pink-400 bg-pink-500/10 p-2 rounded border border-pink-500/20">
                       Animated wallpapers (Veo) require a paid API Key.
                       <button onClick={onRequestProKey} className="underline ml-1 hover:text-pink-300">Select Key</button>
                    </div>
                 )}
                 {type === WallpaperType.Image && model === ModelType.Pro && !hasProKey && (
                    <div className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                       Pro model requires API Key. 
                       <button onClick={onRequestProKey} className="underline ml-1 hover:text-yellow-400">Select Key</button>
                    </div>
                 )}
                 {hasProKey && (
                     <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">
                       Custom API Key Active
                     </div>
                 )}
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};

export default Controls;