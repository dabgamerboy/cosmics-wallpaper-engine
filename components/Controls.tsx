
import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, ModelType, GenerationConfig, ImageSize, WallpaperType, RandomCategory } from '../types';
import { generateRandomPrompt } from '../services/geminiService';
import { Wand2, LayoutTemplate, Zap, Lock, Settings2, ChevronDown, Film, Image as ImageIcon, Dice5, Check, Upload, X, DownloadCloud, UploadCloud } from 'lucide-react';

interface ControlsProps {
  isGenerating: boolean;
  onGenerate: (config: GenerationConfig) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onRequestProKey: () => void;
  hasProKey: boolean;
}

const CATEGORIES: RandomCategory[] = ['Any', 'Anime', 'Cyberpunk', 'Earthy', 'Sci-Fi', 'Space', 'Ocean', 'Cars', 'Fantasy', 'Abstract', 'Cityscape', 'Surreal'];

const Controls: React.FC<ControlsProps> = ({ isGenerating, onGenerate, onExport, onImport, onRequestProKey, hasProKey }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape);
  const [model, setModel] = useState<ModelType>(ModelType.Standard);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.x1K);
  const [type, setType] = useState<WallpaperType>(WallpaperType.Image);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [randomCategory, setRandomCategory] = useState<RandomCategory>('Any');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (type === WallpaperType.Video) {
      if (aspectRatio !== AspectRatio.Landscape && aspectRatio !== AspectRatio.Portrait) {
        setAspectRatio(AspectRatio.Landscape);
      }
    }
  }, [type]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating) {
      setSecondsRemaining(prev => {
        if (prev === null) {
          if (type === WallpaperType.Video) return 55;
          if (model === ModelType.Pro) return 18;
          return 4;
        }
        return prev;
      });
      interval = setInterval(() => {
        setSecondsRemaining(prev => (prev === null || prev <= 0) ? 0 : prev - 1);
      }, 1000);
    } else {
      setSecondsRemaining(null);
    }
    return () => clearInterval(interval);
  }, [isGenerating, type, model]); 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedImage) return;

    onGenerate({
        prompt,
        aspectRatio,
        model,
        imageSize,
        type,
        category: randomCategory,
        image: selectedImage || undefined
    });
  };

  const handleRandom = async () => {
    if (isRandomizing || isGenerating) return;
    setIsRandomizing(true);
    try {
      const randomPrompt = await generateRandomPrompt(randomCategory, selectedImage || undefined);
      setPrompt(randomPrompt);
    } catch (e) {
      console.error("Error generating random prompt", e);
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleModelChange = (newModel: ModelType) => {
    setModel(newModel);
    if (newModel === ModelType.Pro && !hasProKey) {
       onRequestProKey();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPlaceholder = () => {
    if (type === WallpaperType.Video) {
        if (selectedImage) return "Describe animation movement...";
        return "Describe your video loop...";
    } else {
        if (selectedImage) return "How should we use this image?";
        return `Describe your ${randomCategory !== 'Any' ? randomCategory.toLowerCase() + ' ' : ''}dream wallpaper...`;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex justify-center items-end pointer-events-none">
      <style>{`
        @keyframes figure8 {
          0% { transform: translate(0, 0); }
          25% { transform: translate(3px, -3px); }
          50% { transform: translate(0, 3px); }
          75% { transform: translate(-3px, -3px); }
          100% { transform: translate(0, 0); }
        }
        .animate-figure8 {
          animation: figure8 1s linear infinite;
        }
      `}</style>
      <div className="w-full max-w-3xl bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 pointer-events-auto transition-all duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3 relative z-20">
            <div className="relative flex items-stretch rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 transition-all hover:scale-105 active:scale-95 group" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={handleRandom}
                  disabled={isGenerating || isRandomizing}
                  className="pl-3 pr-2 flex items-center justify-center hover:bg-white/5 text-indigo-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-l-xl"
                  title={`Roll Dice (${randomCategory})`}
                >
                   <Dice5 size={24} className={`transition-all duration-1000 ease-out ${isRandomizing ? 'rotate-[720deg] text-white scale-110' : 'group-hover:rotate-45'}`} />
                </button>
                <div className="w-px bg-white/10 my-2"></div>
                <button
                  type="button"
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="px-2 hover:bg-white/5 text-indigo-300 hover:text-white transition-colors rounded-r-xl"
                >
                   <ChevronDown size={14} className={`transition-transform duration-300 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-48 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 z-50">
                     <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">Surprise Me</div>
                     <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                        {CATEGORIES.map((cat) => (
                           <button
                              key={cat}
                              type="button"
                              onClick={() => { setRandomCategory(cat); setShowCategoryMenu(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${randomCategory === cat ? 'bg-primary/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                           >
                              <span>{cat}</span>
                              {randomCategory === cat && <Check size={14} className="text-primary" />}
                           </button>
                        ))}
                     </div>
                  </div>
                )}
            </div>
            
            <div className="relative">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-full px-3 rounded-xl border transition-all flex items-center justify-center ${selectedImage ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    disabled={isGenerating}
                >
                    <Upload size={20} />
                </button>
            </div>

            <div className="flex-1 relative">
                {selectedImage && (
                    <div className="absolute bottom-full mb-3 left-0 p-1.5 bg-surface/90 backdrop-blur border border-white/10 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 z-50">
                        <div className="relative">
                            <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg object-cover border border-white/10" />
                            <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 border border-white/20 transition-transform hover:scale-110">
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                )}
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full h-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  disabled={isGenerating}
                />
            </div>
            
            <button
              type="submit"
              disabled={isGenerating || (!prompt.trim() && !selectedImage)}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 whitespace-nowrap overflow-hidden ${isGenerating ? 'bg-gradient-to-r from-primary/80 to-secondary/80 cursor-wait text-white ring-2 ring-white/20' : 'bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white'}`}
            >
              {isGenerating ? (
                <>
                  <Wand2 size={20} className="animate-figure8 text-yellow-200" />
                  <div className="flex flex-col items-start leading-none gap-0.5">
                    <span>{type === WallpaperType.Video ? 'Rendering...' : 'Dreaming...'}</span>
                    {secondsRemaining !== null && <span className="text-[10px] font-normal opacity-90">{secondsRemaining > 0 ? `~${secondsRemaining}s remaining` : 'Finalizing...'}</span>}
                  </div>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4">
               <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                  <button type="button" onClick={() => setType(WallpaperType.Image)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.Image ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                    <ImageIcon size={14} />
                    <span>Still</span>
                  </button>
                  <button type="button" onClick={() => { setType(WallpaperType.Video); if (!hasProKey) onRequestProKey(); }} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.Video ? 'bg-gradient-to-r from-pink-900 to-rose-900 text-pink-100 shadow-sm border border-pink-500/30' : 'text-gray-400 hover:text-gray-200'}`}>
                     {type !== WallpaperType.Video && !hasProKey && <Lock size={12} className="text-pink-500/80" />}
                    <Film size={14} />
                    <span>Animate</span>
                  </button>
               </div>

               <div className="relative group">
                 <button type="button" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <LayoutTemplate size={16} />
                    <span>{aspectRatio}</span>
                    <ChevronDown size={14} className="opacity-50" />
                 </button>
                 <div className="absolute bottom-full mb-2 left-0 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block w-32">
                    {Object.values(AspectRatio).map((ratio) => {
                      const disabled = type === WallpaperType.Video && ratio !== AspectRatio.Landscape && ratio !== AspectRatio.Portrait;
                      return (
                        <button key={ratio} type="button" disabled={disabled} onClick={() => setAspectRatio(ratio)} className={`w-full text-left px-4 py-2 ${disabled ? 'opacity-30 cursor-not-allowed bg-black/20' : 'hover:bg-white/5'} ${aspectRatio === ratio ? 'text-secondary' : 'text-gray-300'}`}>
                          {ratio}
                        </button>
                      );
                    })}
                 </div>
               </div>

               {type === WallpaperType.Image && (
                 <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                   <button type="button" onClick={() => handleModelChange(ModelType.Standard)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Standard ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                     <Zap size={14} />
                     <span>Flash</span>
                   </button>
                   <button type="button" onClick={() => handleModelChange(ModelType.Pro)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Pro ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-purple-100 shadow-sm border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'}`}>
                     {model !== ModelType.Pro && !hasProKey && <Lock size={12} className="text-yellow-500/80" />}
                     <span>Pro</span>
                   </button>
                 </div>
               )}
            </div>

            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className={`flex items-center gap-2 transition-colors ${showAdvanced ? 'text-secondary' : 'text-gray-400 hover:text-white'}`}>
               <Settings2 size={16} />
               <span>Settings</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">{type === WallpaperType.Video ? 'Video Resolution' : 'Image Resolution (Pro)'}</label>
                <div className="flex gap-2">
                  {type === WallpaperType.Video ? (
                     <div className="px-3 py-1.5 rounded-lg border text-xs border-pink-500/30 bg-pink-500/10 text-pink-200">1080p (HD)</div>
                  ) : (
                    Object.values(ImageSize).map((size) => (
                      <button key={size} type="button" disabled={model !== ModelType.Pro} onClick={() => setImageSize(size)} className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${imageSize === size && model === ModelType.Pro ? 'border-secondary bg-secondary/20 text-secondary' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'} ${model !== ModelType.Pro ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {size}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Data Management (Backup/Import) */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Data Management</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onExport}
                    className="flex-1 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                    title="Export backup as JSON"
                  >
                    <DownloadCloud size={14} />
                    <span>Back up</span>
                  </button>
                  <input 
                    type="file" 
                    ref={importInputRef} 
                    onChange={handleImportFileChange} 
                    className="hidden" 
                    accept="application/json" 
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="flex-1 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                    title="Import backup from JSON"
                  >
                    <UploadCloud size={14} />
                    <span>Import</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Controls;
