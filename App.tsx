
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { History, Book, Download, Maximize2, Play, Bookmark, BookmarkCheck, Settings, DownloadCloud, UploadCloud, Key, ChevronRight, Sparkles, Undo2, Redo2, Bug, Sun, Moon, Palette, Check, Pipette, ZapOff, Info, ExternalLink, ShieldCheck, AlertCircle, Trash2, Cpu, Layout, Sliders, Database, X, Activity, RefreshCw, Database as StorageIcon, AlertTriangle, Zap, ShieldAlert, Rocket } from 'lucide-react';
import SidebarList from './components/HistorySidebar';
import Controls from './components/Controls';
import WallpaperDisplay from './components/WallpaperDisplay';
import EditingTools from './components/EditingTools';
import DebugOverlay from './components/DebugOverlay';
import HelpModal from './components/HelpModal';
import { Wallpaper, GenerationConfig, ModelType, WallpaperType, AspectRatio, ImageSize, Theme, CustomThemeColors } from './types';
import { generateWallpaperImage, generateWallpaperVideo, checkApiKeySelection, promptApiKeySelection } from './services/geminiService';
import * as db from './services/dbService';
import { logger } from './services/logService';

type SidebarMode = 'history' | 'library' | 'settings' | null;

const THEMES: { id: Theme; label: string; color: string; bg: string; description: string }[] = [
  { id: 'light', label: 'Ethereal', color: '#4f46e5', bg: '#f8fafc', description: 'Pure clarity and light' },
  { id: 'dark', label: 'Obsidian', color: '#818cf8', bg: '#020617', description: 'Deep space aesthetic' },
  { id: 'cosmic', label: 'Nebula', color: '#d946ef', bg: '#0f011d', description: 'Vibrant galactic violet' },
  { id: 'sunset', label: 'Horizon', color: '#f97316', bg: '#1a0a01', description: 'Warm golden hour' },
  { id: 'forest', label: 'Bioma', color: '#22c55e', bg: '#020a05', description: 'Organic deep greens' },
  { id: 'cyber', label: 'Neural', color: '#06b6d4', bg: '#000000', description: 'High-tech neon black' },
];

const App: React.FC = () => {
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [library, setLibrary] = useState<Wallpaper[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEditTools, setShowEditTools] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showKeyConfirmModal, setShowKeyConfirmModal] = useState(false);
  
  // States for purge confirmation
  const [confirmPurgeHistory, setConfirmPurgeHistory] = useState(false);
  const [confirmPurgeLibrary, setConfirmPurgeLibrary] = useState(false);
  
  const [showHelp, setShowHelp] = useState(() => {
    const seen = localStorage.getItem('cosmic-help-seen');
    return seen !== 'true';
  });

  const [hasProKey, setHasProKey] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cosmic-theme') as Theme;
    return saved || 'dark';
  });
  
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    return (localStorage.getItem('cosmic-sidebar-pos') as 'left' | 'right') || 'left';
  });
  
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cosmic-animations') !== 'false';
  });

  const [blurIntensity, setBlurIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('cosmic-blur');
    return saved ? parseInt(saved) : 32;
  });
  const [aiSystemInstruction, setAiSystemInstruction] = useState<string>(() => {
    return localStorage.getItem('cosmic-ai-vibe') || '';
  });

  useEffect(() => {
    window.document.documentElement.style.setProperty('--ui-blur', `${blurIntensity}px`);
    localStorage.setItem('cosmic-blur', blurIntensity.toString());
  }, [blurIntensity]);

  useEffect(() => {
    localStorage.setItem('cosmic-sidebar-pos', sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    localStorage.setItem('cosmic-ai-vibe', aiSystemInstruction);
  }, [aiSystemInstruction]);

  useEffect(() => {
    if (!animationsEnabled) {
      document.body.classList.add('animations-disabled');
    } else {
      document.body.classList.remove('animations-disabled');
    }
    localStorage.setItem('cosmic-animations', animationsEnabled.toString());
  }, [animationsEnabled]);

  useEffect(() => {
    const root = window.document.documentElement;
    THEMES.forEach(t => root.classList.remove(t.id));
    root.classList.add(theme);
    localStorage.setItem('cosmic-theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedHistory, savedLibrary, savedPrompts] = await Promise.all([
          db.getAllWallpapers('history'),
          db.getAllWallpapers('library'),
          db.getPromptHistory()
        ]);
        setHistory(savedHistory);
        setLibrary(savedLibrary);
        setPromptHistory(savedPrompts);
      } catch (e) {
        logger.error("App", "Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    checkApiKeySelection().then(setHasProKey);
  }, []);

  const handleKeySelection = async () => {
    if (!hasProKey && !showKeyConfirmModal) {
      setShowKeyConfirmModal(true);
      return;
    }
    
    try {
      setShowKeyConfirmModal(false);
      await promptApiKeySelection();
      setHasProKey(true); // Assume success per race condition guidelines
      setError(null);
    } catch (e) {
      logger.error("App", "Key selection failed", e);
    }
  };

  const handleDownload = async (wp: Wallpaper) => {
    try {
      const response = await fetch(wp.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cosmic-wallpaper-${wp.id}.${wp.type === WallpaperType.video ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      logger.error("App", "Download failed", e);
      setError("Failed to download media. Please try again.");
    }
  };

  const handleSaveToLibrary = async (wp: Wallpaper) => {
    const isSaved = library.some(item => item.id === wp.id);
    try {
      if (isSaved) {
        await db.deleteWallpaper('library', wp.id);
        setLibrary(prev => prev.filter(item => item.id !== wp.id));
      } else {
        await db.saveWallpaper('library', wp);
        setLibrary(prev => [wp, ...prev]);
      }
    } catch (e) {
      logger.error("App", "Library operation failed", e);
    }
  };

  const handlePurgeHistory = async () => {
    if (!confirmPurgeHistory) {
      setConfirmPurgeHistory(true);
      setTimeout(() => setConfirmPurgeHistory(false), 3000);
      return;
    }
    try {
      await db.clearStore('history');
      setHistory([]);
      setConfirmPurgeHistory(false);
      logger.info("App", "Generation history purged");
    } catch (e) {
      logger.error("App", "Purge history failed", e);
    }
  };

  const handlePurgeLibrary = async () => {
    if (!confirmPurgeLibrary) {
      setConfirmPurgeLibrary(true);
      setTimeout(() => setConfirmPurgeLibrary(false), 3000);
      return;
    }
    try {
      await db.clearStore('library');
      setLibrary([]);
      setConfirmPurgeLibrary(false);
      logger.info("App", "Saved library purged");
    } catch (e) {
      logger.error("App", "Purge library failed", e);
    }
  };

  const handleGenerate = async (config: GenerationConfig) => {
    setIsGenerating(true);
    setError(null);
    setGenerationStatus('Initiating neural link...');
    
    const finalPrompt = aiSystemInstruction ? `Style: ${aiSystemInstruction}\nPrompt: ${config.prompt}` : config.prompt;
    const modifiedConfig = { ...config, prompt: finalPrompt };

    try {
      setGenerationStatus(config.type === WallpaperType.video ? 'Waking Veo Engine...' : 'Consulting Gemini Flash...');
      
      const mediaData = config.type === WallpaperType.video 
        ? await generateWallpaperVideo(modifiedConfig) 
        : await generateWallpaperImage(modifiedConfig);
      
      setGenerationStatus('Finalizing composition...');
      
      const newWallpaper: Wallpaper = {
        id: Date.now().toString(),
        url: mediaData,
        prompt: config.prompt,
        timestamp: Date.now(),
        aspectRatio: config.aspectRatio,
        model: config.type === WallpaperType.video ? 'veo-3.1-fast-generate-preview' : config.model,
        type: config.type,
        categories: config.categories,
      };

      await db.saveWallpaper('history', newWallpaper);
      if (config.prompt.trim()) await db.addPromptToHistory(config.prompt);

      setHistory((prev) => [newWallpaper, ...prev]);
      setCurrentWallpaper(newWallpaper);
    } catch (err: any) {
      logger.error("App", "Generation failed", err);
      const msg = err.message || "An unexpected error occurred in the engine.";
      setError(msg);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const sidebarOffsetClass = activeSidebar ? (sidebarPosition === 'left' ? 'pl-80' : 'pr-80') : '';

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30 transition-all duration-700">
      
      {!currentWallpaper && <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-background to-secondary/5 -z-10" />}

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-[100]">
           <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="flex flex-col items-center">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">Quantum Link</p>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Establishing neural path...</p>
              </div>
           </div>
        </div>
      ) : (
        <>
          <div className={`absolute inset-0 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${sidebarOffsetClass}`}>
            <WallpaperDisplay currentWallpaper={currentWallpaper} onClose={() => setCurrentWallpaper(null)} />
          </div>

          {error && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-top-4 duration-500">
              <div className="glass-panel bg-red-500/10 border-red-500/20 rounded-[2rem] px-8 py-5 flex items-center gap-6 shadow-2xl backdrop-blur-3xl">
                 <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl">
                    <AlertCircle size={20} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Engine Disrupted</p>
                    <p className="text-[11px] text-muted max-w-xs line-clamp-2 mt-0.5">{error}</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setError(null)} className="p-3 text-muted hover:text-foreground transition-colors"><X size={18} /></button>
                    <button onClick={handleKeySelection} className="px-5 py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Relink Engine</button>
                 </div>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[140] animate-in slide-in-from-top-2">
              <div className="flex items-center gap-4 px-6 py-3 glass-panel bg-surface/50 rounded-full border border-primary/20">
                <RefreshCw size={14} className="text-primary animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">{generationStatus}</span>
              </div>
            </div>
          )}

          <div className={`absolute top-0 ${sidebarPosition === 'left' ? 'left-0' : 'right-0'} p-8 z-[50] transition-all duration-500 ${activeSidebar ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
            <button 
              onClick={() => setActiveSidebar('settings')}
              className="p-5 glass-panel rounded-3xl bg-surface hover:bg-white/10 text-foreground transition-all btn-magnetic shadow-2xl group"
            >
              <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          <div className={`absolute top-0 ${sidebarPosition === 'left' ? 'right-0' : 'left-0'} p-8 z-[50] flex gap-3 pointer-events-none transition-all duration-700 ${activeSidebar ? 'translate-x-full opacity-0' : ''}`}>
             {currentWallpaper && (
               <>
                 <button onClick={() => handleDownload(currentWallpaper)} className="pointer-events-auto px-6 py-4 glass-panel bg-surface rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 btn-magnetic group">
                    <Download size={16} className="text-primary group-hover:scale-110 transition-transform" /> Download
                 </button>
                 <button onClick={() => setShowEditTools(true)} className="pointer-events-auto px-6 py-4 glass-panel bg-surface rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 btn-magnetic group">
                    <Sparkles size={16} className="text-secondary group-hover:animate-pulse" /> Magic Edit
                 </button>
                 <button 
                    onClick={() => handleSaveToLibrary(currentWallpaper)} 
                    className="pointer-events-auto px-6 py-4 glass-panel bg-surface rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 btn-magnetic group"
                 >
                    <Bookmark 
                      size={16} 
                      className={library.some(wp => wp.id === currentWallpaper.id) ? 'text-primary fill-current' : 'text-muted'} 
                    /> 
                    {library.some(wp => wp.id === currentWallpaper.id) ? 'Saved' : 'Archive'}
                 </button>
               </>
             )}
          </div>

          <SidebarList 
            title="History" icon={<History size={18} />} 
            items={history} libraryItems={library} isOpen={activeSidebar === 'history'} 
            onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }} 
            onDelete={() => {}} onDeleteBulk={() => {}} onDownload={handleDownload} 
            onClose={() => setActiveSidebar(null)} sidebarPosition={sidebarPosition}
          />
          <SidebarList 
            title="Library" icon={<Book size={18} />} 
            items={library} isOpen={activeSidebar === 'library'} 
            onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }} 
            onDelete={() => {}} onDeleteBulk={() => {}} onDownload={handleDownload} categorized={true} 
            onClose={() => setActiveSidebar(null)} sidebarPosition={sidebarPosition}
          />

          <div className={`fixed top-0 bottom-0 w-80 glass-panel bg-surface/95 border-white/5 flex flex-col transition-all duration-500 z-[90] ${sidebarPosition === 'left' ? `left-0 border-r ${activeSidebar === 'settings' ? 'translate-x-0' : '-translate-x-full'}` : `right-0 border-l ${activeSidebar === 'settings' ? 'translate-x-0' : 'translate-x-full'}`}`}>
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 rounded-2xl bg-primary/20 text-primary"><Sliders size={18} /></div>
                   <div className="flex flex-col">
                      <h2 className="text-[11px] font-black uppercase tracking-[0.3em]">Engine Config</h2>
                      <span className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">V3.0 Quantum Ready</span>
                   </div>
                </div>
                <button onClick={() => setActiveSidebar(null)} className="p-2 text-muted hover:text-foreground transition-colors"><X size={20} /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10 pb-12">
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setActiveSidebar('history')} className="p-5 rounded-3xl bg-black/30 border border-white/5 hover:border-primary/50 transition-all group">
                      <History size={16} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[9px] font-black uppercase tracking-widest">History</p>
                      <span className="text-[8px] text-muted">{history.length} items</span>
                   </button>
                   <button onClick={() => setActiveSidebar('library')} className="p-5 rounded-3xl bg-black/30 border border-white/5 hover:border-secondary/50 transition-all group">
                      <Book size={16} className="text-secondary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Library</p>
                      <span className="text-[8px] text-muted">{library.length} items</span>
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <Activity size={12} className="text-primary" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Synapse Vibe</span>
                   </div>
                   <textarea 
                      value={aiSystemInstruction}
                      onChange={(e) => setAiSystemInstruction(e.target.value)}
                      placeholder="e.g. moody cyberpunk, ultra-realistic macro, ghibli textures..."
                      className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 text-[11px] h-28 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted/30"
                   />
                </div>

                <div className="space-y-5">
                   <div className="flex items-center gap-2">
                      <Palette size={12} className="text-secondary" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Atmosphere</span>
                   </div>
                   <div className="space-y-2.5">
                      {THEMES.map(t => (
                        <button key={t.id} onClick={() => setTheme(t.id)} className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${theme === t.id ? 'bg-primary/10 border-primary/50' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                           <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10" style={{ background: t.bg }}>
                              <div className="w-full h-full opacity-30 blur-sm" style={{ background: `linear-gradient(45deg, transparent, ${t.color})` }} />
                           </div>
                           <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                              <span className="text-[8px] text-muted tracking-tight">{t.description}</span>
                           </div>
                           {theme === t.id && <div className="ml-auto p-1 rounded-full bg-primary text-white"><Check size={10} strokeWidth={4} /></div>}
                        </button>
                      ))}
                   </div>
                </div>

                {/* System Optimization / Neural Dampening */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <Zap size={12} className="text-blue-400" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Neural Dampening</span>
                   </div>
                   <button 
                      onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${!animationsEnabled ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-black/20 border-white/5 text-muted hover:border-white/20'}`}
                   >
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest">{animationsEnabled ? 'Animations Active' : 'Dampening Active'}</span>
                        <span className="text-[8px] opacity-60 mt-0.5">{animationsEnabled ? 'High Energy Flow' : 'Reduced Resource Load'}</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${animationsEnabled ? 'bg-primary' : 'bg-muted/30'}`}>
                         <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${animationsEnabled ? 'right-1' : 'left-1'}`} />
                      </div>
                   </button>
                </div>

                <div className="space-y-5">
                   <div className="flex items-center gap-2">
                      <StorageIcon size={12} className="text-red-400" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Data Sanctum</span>
                   </div>
                   <div className="space-y-3">
                      <button 
                        onClick={handlePurgeHistory}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${confirmPurgeHistory ? 'bg-red-500/20 border-red-500/50' : 'bg-black/20 border-white/5 hover:border-red-500/20 group'}`}
                      >
                         <div className={`p-2 rounded-xl ${confirmPurgeHistory ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'}`}>
                            {confirmPurgeHistory ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                         </div>
                         <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest">{confirmPurgeHistory ? 'Are you sure?' : 'Purge History'}</span>
                            <span className="text-[8px] text-muted tracking-tight">{confirmPurgeHistory ? 'Click again to confirm' : `Erase ${history.length} items`}</span>
                         </div>
                      </button>

                      <button 
                        onClick={handlePurgeLibrary}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${confirmPurgeLibrary ? 'bg-red-500/20 border-red-500/50' : 'bg-black/20 border-white/5 hover:border-red-500/20 group'}`}
                      >
                         <div className={`p-2 rounded-xl ${confirmPurgeLibrary ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'}`}>
                            {confirmPurgeLibrary ? <AlertTriangle size={14} /> : <Book size={14} className="text-red-500" />}
                         </div>
                         <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest">{confirmPurgeLibrary ? 'Confirm Wipe?' : 'Purge Library'}</span>
                            <span className="text-[8px] text-muted tracking-tight">{confirmPurgeLibrary ? 'This cannot be undone' : `Delete ${library.length} saves`}</span>
                         </div>
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <Key size={12} className="text-yellow-500" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em]">Neural Link</span>
                   </div>
                   <div className="bg-black/40 rounded-3xl p-5 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                         <p className="text-[9px] font-black uppercase tracking-widest">Key Status</p>
                         <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${hasProKey ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {hasProKey ? 'Secure' : 'Unlinked'}
                         </div>
                      </div>
                      <button onClick={handleKeySelection} className="w-full py-4 bg-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        {hasProKey ? 'Manage Link' : 'Secure Pro Engine'}
                      </button>
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <button onClick={() => setShowDebug(true)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Engine Logs</span>
                      <Bug size={14} className="text-muted group-hover:text-foreground transition-colors" />
                   </button>
                </div>
             </div>
          </div>

          <Controls 
            isGenerating={isGenerating} onGenerate={handleGenerate} 
            onRequestProKey={handleKeySelection} hasProKey={hasProKey}
            promptHistory={promptHistory} onClearPromptHistory={() => {}}
            hasActiveWallpaper={!!currentWallpaper}
          />

          {showEditTools && currentWallpaper && (
            <EditingTools 
              onEdit={(instruction, model, size, mask) => {
                handleGenerate({
                  prompt: instruction,
                  aspectRatio: currentWallpaper.aspectRatio,
                  model: model || (currentWallpaper.model as ModelType) || ModelType.Standard,
                  imageSize: size || ImageSize.x1K,
                  type: WallpaperType.image,
                  categories: currentWallpaper.categories,
                  image: currentWallpaper.url,
                  maskImage: mask
                });
                setShowEditTools(false);
              }}
              onAnimate={(motionPrompt) => {
                handleGenerate({
                  prompt: motionPrompt,
                  aspectRatio: currentWallpaper.aspectRatio,
                  model: ModelType.Standard,
                  imageSize: ImageSize.x1K,
                  type: WallpaperType.video,
                  categories: currentWallpaper.categories,
                  image: currentWallpaper.url
                });
                setShowEditTools(false);
              }}
              onRequestProKey={handleKeySelection}
              onClose={() => setShowEditTools(false)}
              isProcessing={isGenerating}
              hasProKey={hasProKey}
              currentAspectRatio={currentWallpaper.aspectRatio}
            />
          )}

          {showKeyConfirmModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setShowKeyConfirmModal(false)} />
               <div className="relative w-full max-w-lg glass-panel bg-surface/95 rounded-[2.5rem] p-8 md:p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-yellow-500/20 animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center text-center space-y-6">
                     <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <ShieldAlert size={40} />
                     </div>
                     <div className="space-y-2">
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-foreground">Neural Link Required</h2>
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Unlocking the Full Pro Subsystem</p>
                     </div>
                     <div className="bg-black/30 border border-white/5 rounded-3xl p-6 text-left space-y-4 w-full">
                        <div className="flex gap-4 items-start">
                           <Rocket className="text-primary mt-1 shrink-0" size={16} />
                           <p className="text-[11px] text-muted leading-relaxed">
                              Enhanced Pro features, <span className="text-foreground font-bold">VEO Video Generation</span>, and <span className="text-foreground font-bold">4K Neural Reconstruction</span> require a paid API key from a Google Cloud project.
                           </p>
                        </div>
                        <div className="flex gap-4 items-start">
                           <Key className="text-secondary mt-1 shrink-0" size={16} />
                           <p className="text-[11px] text-muted leading-relaxed">
                              Your selected key remains locally secured. Ensure your GCP project has billing enabled to prevent engine timeouts.
                           </p>
                        </div>
                     </div>
                     <div className="flex flex-col gap-3 w-full pt-4">
                        <button 
                          onClick={handleKeySelection}
                          className="w-full py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                           Establish Neural Link
                        </button>
                        <button 
                          onClick={() => setShowKeyConfirmModal(false)}
                          className="w-full py-5 bg-white/5 text-muted hover:text-foreground rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] transition-all"
                        >
                           Abstain
                        </button>
                     </div>
                     <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[9px] text-muted hover:text-primary underline uppercase tracking-widest transition-colors">
                        Documentation: Neural Link & Billing
                     </a>
                  </div>
               </div>
            </div>
          )}

          {showDebug && <DebugOverlay isOpen={showDebug} onClose={() => setShowDebug(false)} />}
          {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
        </>
      )}
    </div>
  );
};

export default App;
