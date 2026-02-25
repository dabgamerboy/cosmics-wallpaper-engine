
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AspectRatio, ModelType, GenerationConfig, ImageSize, WallpaperType, RandomCategory } from '../types';
import { generateRandomPrompt } from '../services/geminiService';
import { 
  Wand2, LayoutTemplate, Zap, Star, ChevronDown, Film, 
  Image as ImageIcon, Dice5, Check, X, Clock, Monitor, 
  Sparkles, Binary, Aperture, Cpu, Boxes, Compass, Layers, 
  Hash, History, Key, Lock, Search, Sliders, ChevronRight,
  RefreshCw
} from 'lucide-react';

interface ControlsProps {
  isGenerating: boolean;
  onGenerate: (config: GenerationConfig) => void;
  onRequestProKey: () => void;
  hasProKey: boolean;
  promptHistory: string[];
  onClearPromptHistory: () => void;
  hasActiveWallpaper: boolean;
}

interface CategoryDef {
  label: string;
  icon: React.ReactNode;
  subs: string[];
}

const CATEGORIES: CategoryDef[] = [
  { label: 'Abstract', icon: <Boxes size={14} />, subs: ['Minimal', 'Organic', 'Geometric', 'Fluid', 'Fractal', 'Gradient'] },
  { label: 'Nature', icon: <Compass size={14} />, subs: ['Forest', 'Ocean', 'Mountain', 'Macro', 'Desert', 'Stormy'] },
  { label: 'Space', icon: <Star size={14} />, subs: ['Nebula', 'Planetary', 'Starfield', 'Sci-Fi', 'Black Hole', 'Station'] },
  { label: 'Anime', icon: <Sparkles size={14} />, subs: ['Lo-fi', 'Cinematic', 'Manga', 'Cyber-Anime', 'Ghibli-esque', '90s Retro'] },
  { label: 'Cyberpunk', icon: <Cpu size={14} />, subs: ['Neon City', 'Android', 'Retro-tech', 'Glitch', 'Rainy Night', 'Dystopian'] },
  { label: 'Surreal', icon: <Layers size={14} />, subs: ['Dreamcore', 'Ethereal', 'Distortion', 'Liminal', 'Upside Down', 'Psychedelic'] },
  { label: 'Cityscape', icon: <LayoutTemplate size={14} />, subs: ['Futuristic', 'Historic', 'Aerial', 'Midnight', 'Skyscrapers', 'Street Level'] },
  { label: 'Fantasy', icon: <History size={14} />, subs: ['Kingdom', 'Mystical', 'Legendary', 'Gothic', 'Dragon Nest', 'Magic Forest'] },
];

const Controls: React.FC<ControlsProps> = ({ isGenerating, onGenerate, onRequestProKey, hasProKey, hasActiveWallpaper }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Landscape);
  const [type, setType] = useState<WallpaperType>(WallpaperType.image);
  const [model, setModel] = useState<ModelType>(ModelType.Standard);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.x1K);
  
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [customSeed, setCustomSeed] = useState('');
  
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(CATEGORIES[0].label);

  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const isPaidActive = hasProKey;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate({
        prompt, aspectRatio, model, imageSize, type,
        categories: selectedCategories.length > 0 ? [...selectedCategories, ...selectedSubs] : ['Any']
    });
  };

  const handleRandom = async () => {
    if (isRandomizing || isGenerating) return;
    setIsRandomizing(true);
    
    const filters = [
        ...selectedCategories,
        ...selectedSubs,
        ...(customSeed.trim() ? [customSeed] : [])
    ];

    try {
      const result = await generateRandomPrompt(filters.length > 0 ? filters : ['Any']);
      setPrompt(result);
      if (showCategoryMenu) setShowCategoryMenu(false);
    } finally {
      setIsRandomizing(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setActiveTab(cat);
  };

  const toggleSub = (sub: string) => {
    setSelectedSubs(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const activeCategoryDef = useMemo(() => 
    CATEGORIES.find(c => c.label === activeTab), 
  [activeTab]);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-10 z-[60] flex flex-col items-center pointer-events-none">
      
      {/* Main Control Hub */}
      <div className="w-full max-w-5xl glass-panel bg-surface rounded-[3.5rem] p-4 pointer-events-auto shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] flex flex-col gap-5 border border-white/5 relative group">
        
        {isGenerating && (
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-t-[3.5rem]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-[40%] animate-scan"></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Top Row: Input & Randomizer */}
          <div className="flex gap-4 items-center">
            
            {/* Status Indicator Module */}
            {!hasActiveWallpaper && (
              <div className="hidden lg:flex flex-shrink-0 w-24 h-[68px] items-center justify-center rounded-[2.2rem] bg-black/40 border border-white/5 overflow-hidden relative animate-in zoom-in-95 duration-700">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-30"></div>
                {isGenerating ? (
                  <RefreshCw size={20} className="text-primary animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Monitor size={18} className="text-muted/60" />
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-muted/40">Engine On</span>
                  </div>
                )}
                <div className="absolute inset-0 border border-primary/20 rounded-[2.2rem] animate-pulse"></div>
              </div>
            )}

            {/* Combined Randomizer Segment */}
            <div className="flex items-center rounded-[2.2rem] bg-black/30 border border-white/5 p-1 shadow-inner h-[68px] relative">
               <button 
                  type="button" 
                  onClick={handleRandom} 
                  disabled={isGenerating || isRandomizing} 
                  className="w-16 h-14 flex items-center justify-center hover:bg-white/5 text-primary transition-all disabled:opacity-30 group rounded-l-[1.8rem]"
                >
                  <Dice5 size={24} className={isRandomizing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform duration-500'} />
               </button>
               
               <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
               
               {/* Synapse Selector Dropdown */}
               <div className="relative h-full" ref={categoryMenuRef}>
                 <button 
                    type="button" 
                    onClick={() => setShowCategoryMenu(!showCategoryMenu)} 
                    className={`px-6 h-full hover:bg-white/5 text-[10px] font-black uppercase tracking-[0.25em] transition-all flex items-center gap-3 whitespace-nowrap rounded-r-[1.8rem] ${selectedCategories.length > 0 || customSeed ? 'text-primary opacity-100' : 'text-muted opacity-60'}`}
                  >
                   {(selectedCategories.length === 0 && !customSeed) ? 'Any Filter' : 
                    customSeed ? `Seed: ${customSeed.length > 8 ? customSeed.slice(0, 8) + '...' : customSeed}` :
                    selectedCategories.length === 1 ? selectedCategories[0] : 
                    `${selectedCategories.length + selectedSubs.length} Nodes`} 
                   <ChevronDown size={14} className={`transition-transform duration-500 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                 </button>

                 {showCategoryMenu && (
                   <div className="absolute bottom-[calc(100%+1.8rem)] left-0 w-[420px] glass-panel bg-surface/98 rounded-[2.5rem] p-7 z-[100] animate-in slide-in-from-bottom-4 shadow-2xl border border-white/10">
                     
                     {/* Custom Seed Section */}
                     <div className="mb-6 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-2">
                                <Binary size={12} className="text-primary" /> Custom Neural Seed
                            </span>
                            {customSeed && (
                              <button onClick={() => setCustomSeed('')} className="text-[8px] font-black text-red-400 uppercase tracking-widest hover:underline">Clear</button>
                            )}
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={customSeed} 
                            onChange={(e) => setCustomSeed(e.target.value)}
                            placeholder="Inject concept (e.g. 'Glitchy Grapes')..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-[11px] focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted/30 font-medium"
                          />
                        </div>
                     </div>

                     {/* Multi-Pane Selector */}
                     <div className="grid grid-cols-[160px_1fr] gap-4">
                        {/* Roots Column */}
                        <div className="space-y-1.5 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
                           <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted mb-2 px-1">Root Pathways</p>
                           {CATEGORIES.map(cat => (
                             <button 
                                key={cat.label} 
                                type="button" 
                                onClick={() => toggleCategory(cat.label)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-[10px] font-bold transition-all border group/node ${selectedCategories.includes(cat.label) ? 'bg-primary/20 border-primary/40 text-primary' : (activeTab === cat.label ? 'bg-white/5 border-white/20 text-foreground' : 'bg-transparent border-transparent text-muted hover:bg-white/5')}`}
                             >
                               <span className={selectedCategories.includes(cat.label) ? 'text-primary' : 'text-muted group-hover/node:text-foreground'}>{cat.icon}</span>
                               {cat.label}
                               {selectedCategories.includes(cat.label) && <div className="w-1 h-1 rounded-full bg-primary ml-auto shadow-[0_0_8px_#818cf8]"></div>}
                             </button>
                           ))}
                        </div>

                        {/* Subs Column */}
                        <div className="bg-black/25 rounded-3xl p-4 border border-white/5 min-h-[320px]">
                           {activeCategoryDef ? (
                             <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                               <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted mb-4 px-1">{activeCategoryDef.label} Nodes</p>
                               <div className="grid grid-cols-1 gap-1.5">
                                 {activeCategoryDef.subs.map(sub => (
                                   <button 
                                      key={sub} 
                                      type="button" 
                                      onClick={() => toggleSub(sub)}
                                      className={`w-full text-left p-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between ${selectedSubs.includes(sub) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-white/5 hover:text-foreground'}`}
                                   >
                                     {sub}
                                     {selectedSubs.includes(sub) && <Check size={12} strokeWidth={4} />}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-4">
                               <Sliders size={32} className="mb-3" />
                               <p className="text-[9px] font-black uppercase tracking-[0.2em]">Select root to expand neural branches</p>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
                        <button 
                          type="button"
                          onClick={() => { setSelectedCategories([]); setSelectedSubs([]); setCustomSeed(''); }}
                          className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted transition-all"
                        >
                           Reset
                        </button>
                        <button 
                          type="button"
                          onClick={handleRandom}
                          className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.02] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group/roll"
                        >
                           <Dice5 size={14} className="group-hover/roll:rotate-45 transition-transform" /> Roll Integrated Mashup
                        </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Prompt Input Area */}
            <div className="flex-1 relative group/input">
              <input 
                type="text" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a cinematic journey..."
                className="w-full h-[68px] bg-black/40 border border-white/5 rounded-[2.2rem] px-8 text-[14px] font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner placeholder:text-muted/30 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-[0.3em]"
              />
            </div>

            {/* Execution Button */}
            <button 
              type="submit" 
              disabled={isGenerating || (!prompt.trim())} 
              className={`h-[68px] px-12 rounded-[2.2rem] font-black text-[12px] uppercase tracking-[0.4em] transition-all flex items-center gap-4 shadow-2xl active:scale-95 disabled:opacity-30 ${type === WallpaperType.video ? 'bg-gradient-to-r from-secondary to-purple-600 text-white shadow-secondary/30' : 'bg-primary text-white hover:scale-[1.03] shadow-primary/30'}`}
            >
              {isGenerating ? <Aperture className="animate-spin" size={20} /> : <Sparkles size={20} />}
              <span>{isGenerating ? 'Processing' : 'Create'}</span>
            </button>
          </div>

          {/* Secondary Control Row */}
          <div className="flex items-center justify-between px-6 pt-1">
             <div className="flex items-center gap-8">
                
                {/* Modality Segment (Moved here) */}
                <div className="flex items-center gap-4">
                   <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Modality</span>
                   <div className="flex bg-black/30 rounded-xl p-1 border border-white/5 shadow-inner">
                      <button 
                        type="button" 
                        onClick={() => setType(WallpaperType.image)} 
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${type === WallpaperType.image ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-muted hover:text-foreground'}`}
                      >
                        <ImageIcon size={14} /> Still
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setType(WallpaperType.video)} 
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${type === WallpaperType.video ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-muted hover:text-foreground'}`}
                      >
                        <Film size={14} /> Motion
                      </button>
                   </div>
                </div>

                <div className="w-[1px] h-5 bg-white/5"></div>

                {/* Viewport Config */}
                <div className="flex items-center gap-4">
                   <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Viewport</span>
                   <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                      {[AspectRatio.Landscape, AspectRatio.Portrait, AspectRatio.Square].map(ratio => (
                        <button 
                          key={ratio} 
                          type="button" 
                          onClick={() => setAspectRatio(ratio)} 
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${aspectRatio === ratio ? 'bg-white/10 text-white border border-white/10' : 'text-muted hover:text-foreground'}`}
                        >
                          {ratio}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="w-[1px] h-5 bg-white/5"></div>

                {/* Model Path Config */}
                {type === WallpaperType.image && (
                   <div className="flex items-center gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex items-center gap-4">
                         <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Neural Core</span>
                         <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                            <button 
                              type="button" 
                              onClick={() => setModel(ModelType.Standard)} 
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${model === ModelType.Standard ? 'bg-primary/20 border border-primary/40 text-primary' : 'text-muted hover:text-foreground'}`}
                            >
                              <Zap size={10} /> Flash
                            </button>
                            <button 
                              type="button" 
                              onClick={() => isPaidActive ? setModel(ModelType.Pro) : onRequestProKey()} 
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${model === ModelType.Pro ? 'bg-secondary/20 border border-secondary/40 text-secondary' : 'text-muted hover:text-foreground'}`}
                            >
                              <Star size={10} /> Pro {!isPaidActive && <Lock size={10} />}
                            </button>
                         </div>
                      </div>

                      {model === ModelType.Pro && (
                         <div className="flex items-center gap-4 animate-in zoom-in-95 duration-300">
                            <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Density</span>
                            <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                               <button type="button" onClick={() => setImageSize(ImageSize.x1K)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${imageSize === ImageSize.x1K ? 'bg-white/10 text-white' : 'text-muted hover:text-foreground'}`}>1K</button>
                               <button type="button" onClick={() => setImageSize(ImageSize.x4K)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${imageSize === ImageSize.x4K ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' : 'text-muted hover:text-foreground'}`}>4K</button>
                            </div>
                         </div>
                      )}
                   </div>
                )}
             </div>

             <div className="flex items-center gap-6">
                {!isPaidActive && (model === ModelType.Pro || type === WallpaperType.video) && (
                   <button 
                    type="button" 
                    onClick={onRequestProKey} 
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[8px] font-black uppercase text-yellow-500 hover:bg-yellow-500/20 transition-all animate-pulse"
                  >
                      <Key size={12} /> Neural Pathway Restricted
                   </button>
                )}
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Controls;
