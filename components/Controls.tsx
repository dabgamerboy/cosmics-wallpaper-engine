
import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, ModelType, GenerationConfig, ImageSize, WallpaperType, RandomCategory } from '../types';
import { generateRandomPrompt } from '../services/geminiService';
import { Wand2, LayoutTemplate, Zap, Lock, ChevronDown, Film, Image as ImageIcon, Dice5, Check, Upload, X, Plus, Clock, ListRestart, Trash2 } from 'lucide-react';

interface ControlsProps {
  isGenerating: boolean;
  onGenerate: (config: GenerationConfig) => void;
  onRequestProKey: () => void;
  hasProKey: boolean;
  promptHistory: string[];
  onClearPromptHistory: () => void;
}

const INITIAL_CATEGORIES: RandomCategory[] = [
  'Any', 'Anime', 'Cyberpunk', 'Earthy', 'Sci-Fi', 'Space', 'Ocean', 'Cars', 'Fantasy', 
  'Abstract', 'Cityscape', 'Surreal', 'Funny', 'Liminal', 'Horror', 'Animals', 'Food', 'Sports', 'Glitch', 'Matrix', 'Soundwave'
];

const Controls: React.FC<ControlsProps> = ({ isGenerating, onGenerate, onRequestProKey, hasProKey, promptHistory, onClearPromptHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape);
  const [model, setModel] = useState<ModelType>(ModelType.Standard);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.x1K);
  const [type, setType] = useState<WallpaperType>(WallpaperType.image);
  const [isRandomizing, setIsRandomizing] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [allCategories, setAllCategories] = useState<RandomCategory[]>(INITIAL_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<RandomCategory[]>(['Any']);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const promptHistoryRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [initialEta, setInitialEta] = useState<number>(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
        setIsAddingCustom(false);
      }
      if (promptHistoryRef.current && !promptHistoryRef.current.contains(event.target as Node)) {
        setShowPromptHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (type === WallpaperType.video) {
      if (aspectRatio !== AspectRatio.Landscape && aspectRatio !== AspectRatio.Portrait) {
        setAspectRatio(AspectRatio.Landscape);
      }
    }
  }, [type]);

  // Improved ETA logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating) {
      setSecondsRemaining(prev => {
        if (prev === null) {
          // Calculate dynamic ETA
          let eta = 0;
          const complexityFactor = Math.min(Math.floor(prompt.length / 40), 5); // Max 5s bonus for complexity
          
          if (type === WallpaperType.video) {
            eta = 65 + (complexityFactor * 2); // Videos take ~1min+
          } else if (model === ModelType.Pro) {
            eta = 22 + complexityFactor; // Pro is ~20s
          } else {
            eta = 5 + complexityFactor; // Flash is fast
          }
          
          setInitialEta(eta);
          return eta;
        }
        return prev;
      });
      
      interval = setInterval(() => {
        setSecondsRemaining(prev => (prev === null || prev <= 0) ? 0 : prev - 1);
      }, 1000);
    } else {
      setSecondsRemaining(null);
      setInitialEta(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, type, model, prompt]); 

  const toggleCategory = (cat: RandomCategory) => {
    setSelectedCategories(prev => {
      if (cat === 'Any') return ['Any'];
      const withoutAny = prev.filter(c => c !== 'Any');
      if (prev.includes(cat)) {
        const next = withoutAny.filter(c => c !== cat);
        return next.length === 0 ? ['Any'] : next;
      } else {
        return [...withoutAny, cat];
      }
    });
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    
    if (!allCategories.includes(trimmed)) {
      setAllCategories(prev => [...prev, trimmed]);
    }
    
    setSelectedCategories(prev => {
      const withoutAny = prev.filter(c => c !== 'Any');
      if (!withoutAny.includes(trimmed)) {
        return [...withoutAny, trimmed];
      }
      return withoutAny;
    });
    
    setCustomInput('');
    setIsAddingCustom(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedImage) return;

    onGenerate({
        prompt,
        aspectRatio,
        model,
        imageSize,
        type,
        categories: selectedCategories,
        image: selectedImage || undefined
    });
    setShowPromptHistory(false);
  };

  const handleRandom = async () => {
    if (isRandomizing || isGenerating) return;
    setIsRandomizing(true);
    try {
      const catsToUse = selectedCategories.length === 0 ? ['Any'] : selectedCategories;
      const randomPrompt = await generateRandomPrompt(catsToUse, selectedImage || undefined);
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

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPlaceholder = () => {
    if (type === WallpaperType.video) {
        if (selectedImage) return "Describe animation movement...";
        return "Describe your video loop...";
    } else {
        if (selectedImage) return "How should we use this image?";
        const catLabel = selectedCategories.length === 0 
          ? '' 
          : selectedCategories.includes('Any') 
            ? '' 
            : selectedCategories.join(' + ').toLowerCase() + ' ';
        return `Describe your ${catLabel}dream wallpaper...`;
    }
  };

  const currentCategoryLabel = selectedCategories.length === 0
    ? 'Custom'
    : selectedCategories.includes('Any') 
      ? 'Any' 
      : selectedCategories.length > 2 
        ? `Mix (${selectedCategories.length})` 
        : selectedCategories.join(' + ');

  // Calculate progress percentage for a subtle bar
  const progress = initialEta > 0 && secondsRemaining !== null 
    ? Math.max(0, Math.min(100, ((initialEta - secondsRemaining) / initialEta) * 100))
    : 0;

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
      <div className="w-full max-w-3xl bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 pointer-events-auto transition-all duration-300 relative">
        {/* Subtle Progress Bar */}
        {isGenerating && (
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary transition-all duration-1000 rounded-t-2xl z-10" style={{ width: `${progress}%` }} />
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3 relative z-20">
            <div className="relative flex items-stretch rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-border transition-all hover:scale-105 active:scale-95 group" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={handleRandom}
                  disabled={isGenerating || isRandomizing}
                  className="pl-3 pr-2 flex items-center justify-center hover:bg-primary/10 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-l-xl"
                  title={`Roll for ${currentCategoryLabel}`}
                >
                   <Dice5 size={24} className={`transition-all duration-1000 ease-out ${isRandomizing ? 'rotate-[720deg] text-primary scale-110' : 'group-hover:rotate-45'}`} />
                </button>
                <div className="w-px bg-border my-2"></div>
                <button
                  type="button"
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="px-3 hover:bg-primary/10 text-foreground transition-colors rounded-r-xl flex items-center gap-2"
                >
                   <span className="text-[10px] font-bold tracking-tighter uppercase whitespace-nowrap min-w-[30px]">{currentCategoryLabel}</span>
                   <ChevronDown size={14} className={`transition-transform duration-300 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryMenu && (
                  <div className="absolute bottom-full mb-3 left-0 w-64 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-1 z-[100] animate-in slide-in-from-bottom-4 duration-200">
                     <div className="px-3 py-2 flex items-center justify-between border-b border-border mb-1">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">Mix & Match</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedCategories(['Any'])}
                          className="text-[10px] text-primary hover:underline font-bold"
                        >RESET ALL</button>
                     </div>
                     <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar mb-1 px-1">
                        {allCategories.map((cat) => (
                           <button
                              key={cat}
                              type="button"
                              onClick={() => toggleCategory(cat)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategories.includes(cat) ? 'bg-primary/20 text-foreground' : 'text-muted hover:bg-primary/10 hover:text-foreground'}`}
                           >
                              <span className="truncate pr-2">{cat}</span>
                              {selectedCategories.includes(cat) && <Check size={14} className="text-primary shrink-0" />}
                           </button>
                        ))}
                     </div>
                     <div className="border-t border-border p-1 pt-2">
                        {!isAddingCustom ? (
                          <button 
                            type="button" 
                            onClick={() => { setIsAddingCustom(true); setTimeout(() => customInputRef.current?.focus(), 50); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-muted hover:bg-primary/10 hover:text-foreground transition-colors uppercase tracking-wider"
                          >
                            <Plus size={14} />
                            Other
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-1 animate-in slide-in-from-left-2 duration-200">
                             <input 
                               ref={customInputRef}
                               type="text" 
                               value={customInput}
                               onChange={(e) => setCustomInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                               placeholder="Type category..."
                               className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                             />
                             <button 
                               type="button" 
                               onClick={() => handleAddCustom()}
                               className="p-1.5 bg-primary/20 hover:bg-primary hover:text-white text-primary rounded-lg transition-colors"
                             >
                                <Plus size={14} />
                             </button>
                             <button 
                               type="button" 
                               onClick={() => setIsAddingCustom(false)}
                               className="p-1.5 hover:bg-border text-muted rounded-lg transition-colors"
                             >
                                <X size={14} />
                             </button>
                          </div>
                        )}
                     </div>
                  </div>
                )}
            </div>
            
            <div className="relative">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-full px-3 rounded-xl border transition-all flex items-center justify-center ${selectedImage ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-background border-border text-muted hover:text-foreground hover:bg-surface'}`}
                    disabled={isGenerating}
                >
                    <Upload size={20} />
                </button>
            </div>

            <div className="flex-1 relative flex items-center">
                <div className="absolute left-3 z-10" ref={promptHistoryRef}>
                   <button 
                    type="button" 
                    onClick={() => setShowPromptHistory(!showPromptHistory)}
                    disabled={isGenerating || promptHistory.length === 0}
                    className="p-1 text-muted hover:text-primary transition-colors disabled:opacity-0"
                    title="Prompt History"
                   >
                     <ListRestart size={18} />
                   </button>
                   {showPromptHistory && (
                     <div className="absolute bottom-full mb-3 left-0 w-80 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-1 z-[100] animate-in slide-in-from-bottom-4 duration-200">
                        <div className="px-3 py-2 flex items-center justify-between border-b border-border mb-1">
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Recent Prompts</span>
                          <button 
                            type="button" 
                            onClick={onClearPromptHistory}
                            className="p-1 text-red-400 hover:text-red-500 transition-colors"
                            title="Clear History"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5 p-1">
                          {promptHistory.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { setPrompt(p); setShowPromptHistory(false); }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted hover:bg-primary/10 hover:text-foreground transition-colors line-clamp-2"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
                {selectedImage && (
                    <div className="absolute bottom-full mb-3 left-0 p-1.5 bg-surface/90 backdrop-blur border border-border rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 z-50">
                        <div className="relative">
                            <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg object-cover border border-border" />
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
                  className="w-full h-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
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
                  <div className="flex flex-col items-start leading-none gap-0.5 min-w-[100px]">
                    <span>{type === WallpaperType.video ? 'Rendering...' : 'Dreaming...'}</span>
                    {secondsRemaining !== null && (
                      <div className="flex items-center gap-1 text-[10px] font-normal opacity-90 text-white">
                        <Clock size={10} />
                        <span>{secondsRemaining > 0 ? `ETA: ${secondsRemaining}s` : 'Finalizing...'}</span>
                      </div>
                    )}
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
               <div className="flex bg-background rounded-lg p-1 border border-border">
                  <button type="button" onClick={() => setType(WallpaperType.image)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.image ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>
                    <ImageIcon size={14} />
                    <span>Still</span>
                  </button>
                  <button type="button" onClick={() => { setType(WallpaperType.video); if (!hasProKey) onRequestProKey(); }} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${type === WallpaperType.video ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm border border-pink-500/30' : 'text-muted hover:text-foreground'}`}>
                     {type !== WallpaperType.video && !hasProKey && <Lock size={12} className="text-pink-500/80" />}
                    <Film size={14} />
                    <span>Animate</span>
                  </button>
               </div>

               <div className="relative group pointer-events-auto">
                 <button type="button" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
                    <LayoutTemplate size={16} />
                    <span>{aspectRatio}</span>
                    <ChevronDown size={14} className="opacity-50" />
                 </button>
                 <div className="absolute bottom-full mb-2 left-0 bg-surface border border-border rounded-lg shadow-xl overflow-hidden hidden group-hover:block w-32 z-[100] transition-colors">
                    {Object.values(AspectRatio).map((ratio) => {
                      const disabled = type === WallpaperType.video && ratio !== AspectRatio.Landscape && ratio !== AspectRatio.Portrait;
                      return (
                        <button key={ratio} type="button" disabled={disabled} onClick={() => setAspectRatio(ratio)} className={`w-full text-left px-4 py-2 ${disabled ? 'opacity-30 cursor-not-allowed bg-background' : 'hover:bg-primary/10'} ${aspectRatio === ratio ? 'text-secondary font-bold' : 'text-foreground'}`}>
                          {ratio}
                        </button>
                      );
                    })}
                 </div>
               </div>

               {type === WallpaperType.image && (
                 <div className="flex bg-background rounded-lg p-1 border border-border">
                   <button type="button" onClick={() => handleModelChange(ModelType.Standard)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Standard ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>
                     <Zap size={14} />
                     <span>Flash</span>
                   </button>
                   <button type="button" onClick={() => handleModelChange(ModelType.Pro)} className={`px-3 py-1 rounded-md flex items-center gap-2 transition-all ${model === ModelType.Pro ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm border border-purple-500/30' : 'text-muted hover:text-foreground'}`}>
                     {model !== ModelType.Pro && !hasProKey && <Lock size={12} className="text-yellow-500/80" />}
                     <span>Pro</span>
                   </button>
                 </div>
               )}
            </div>

            {/* High Res Options for Pro Model */}
            {model === ModelType.Pro && type === WallpaperType.image && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted uppercase">Res</span>
                <div className="flex bg-background rounded-lg p-0.5 border border-border">
                   {["1K", "2K", "4K"].map((size: any) => (
                      <button 
                        key={size}
                        type="button" 
                        onClick={() => setImageSize(size)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-all ${imageSize === size ? 'bg-secondary text-white' : 'text-muted hover:text-foreground'}`}
                      >{size}</button>
                   ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Controls;
