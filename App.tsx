
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { History, Book, Download, Maximize2, Play, Bookmark, BookmarkCheck, Settings, DownloadCloud, UploadCloud, Key, ChevronRight, Sparkles, Undo2, Redo2, Bug, Sun, Moon, Palette, Check, Pipette, ZapOff, Info } from 'lucide-react';
import SidebarList from './components/HistorySidebar';
import Controls from './components/Controls';
import WallpaperDisplay from './components/WallpaperDisplay';
import EditingTools from './components/EditingTools';
import DebugOverlay from './components/DebugOverlay';
import HelpModal from './components/HelpModal';
import { Wallpaper, GenerationConfig, ModelType, WallpaperType, AspectRatio, ImageSize, Theme, CustomThemeColors } from './types';
import { generateWallpaperImage, generateWallpaperVideo, checkApiKeySelection, promptApiKeySelection, editWallpaper } from './services/geminiService';
import * as db from './services/dbService';
import { logger } from './services/logService';

type SidebarMode = 'history' | 'library' | null;

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'light', label: 'Light', color: '#f8fafc' },
  { id: 'dark', label: 'Dark', color: '#1e293b' },
  { id: 'cosmic', label: 'Cosmic', color: '#220135' },
  { id: 'sunset', label: 'Sunset', color: '#2d1616' },
  { id: 'forest', label: 'Forest', color: '#0c2212' },
  { id: 'cyber', label: 'Cyber', color: '#000000' },
  { id: 'custom', label: 'Custom', color: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)' },
];

const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: '#0f172a',
  surface: '#1e293b',
  foreground: '#f8fafc',
  muted: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.1)',
  primary: '#818cf8',
  secondary: '#c084fc',
};

const App: React.FC = () => {
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [library, setLibrary] = useState<Wallpaper[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditTools, setShowEditTools] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Initialize help modal visibility based on first-time visit
  const [showHelp, setShowHelp] = useState(() => {
    const seen = localStorage.getItem('cosmic-help-seen');
    return seen !== 'true';
  });

  const [hasProKey, setHasProKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cosmic-theme') as Theme;
    return saved || 'dark';
  });
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('cosmic-animations');
    return saved === null ? true : saved === 'true';
  });
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    const saved = localStorage.getItem('cosmic-custom-colors');
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_COLORS;
  });
  
  // Undo/Redo stacks for the current editing session
  const [undoStack, setUndoStack] = useState<Wallpaper[]>([]);
  const [redoStack, setRedoStack] = useState<Wallpaper[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Apply animations toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (animationsEnabled) {
      root.classList.remove('animations-disabled');
    } else {
      root.classList.add('animations-disabled');
    }
    localStorage.setItem('cosmic-animations', String(animationsEnabled));
  }, [animationsEnabled]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    THEMES.forEach(t => root.classList.remove(t.id));
    root.classList.add(theme);
    localStorage.setItem('cosmic-theme', theme);

    if (theme === 'custom') {
      root.style.setProperty('--color-background', customColors.background);
      root.style.setProperty('--color-surface', customColors.surface);
      root.style.setProperty('--color-foreground', customColors.foreground);
      root.style.setProperty('--color-muted', customColors.muted);
      root.style.setProperty('--color-border', customColors.border);
      root.style.setProperty('--color-primary', customColors.primary);
      root.style.setProperty('--color-secondary', customColors.secondary);
    } else {
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-surface');
      root.style.removeProperty('--color-foreground');
      root.style.removeProperty('--color-muted');
      root.style.removeProperty('--color-border');
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
    }
  }, [theme, customColors]);

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
        logger.info("App", "Initial data loaded successfully");
      } catch (e) {
        logger.error("App", "Failed to load data from IndexedDB", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    checkApiKeySelection().then(setHasProKey);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isInLibrary = useMemo(() => {
    if (!currentWallpaper) return false;
    return library.some(wp => wp.id === currentWallpaper.id);
  }, [currentWallpaper, library]);

  const updateCustomColor = (key: keyof CustomThemeColors, value: string) => {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    localStorage.setItem('cosmic-custom-colors', JSON.stringify(updated));
  };

  const handleGenerate = async (config: GenerationConfig) => {
    setIsGenerating(true);
    
    if (config.model === ModelType.Pro || config.type === WallpaperType.video) {
      const hasKey = await checkApiKeySelection();
      if (!hasKey) {
        try {
          await promptApiKeySelection();
          setHasProKey(true);
        } catch (e) {
          setIsGenerating(false);
          return;
        }
      }
    }

    try {
      let mediaData: string;
      if (config.type === WallpaperType.video) {
         mediaData = await generateWallpaperVideo(config);
      } else {
         mediaData = await generateWallpaperImage(config);
      }
      
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
      if (config.prompt.trim()) {
        await db.addPromptToHistory(config.prompt);
        setPromptHistory(prev => [config.prompt, ...prev.filter(p => p !== config.prompt)].slice(0, 50));
      }

      setHistory((prev) => [newWallpaper, ...prev]);
      setCurrentWallpaper(newWallpaper);
      setUndoStack([]);
      setRedoStack([]);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate wallpaper. Check debug logs for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyEdit = async (instruction: string, overrideModel?: ModelType, overrideSize?: ImageSize) => {
    if (!currentWallpaper) return;
    setIsEditing(true);

    try {
      const config: GenerationConfig = {
        prompt: instruction,
        aspectRatio: currentWallpaper.aspectRatio,
        model: overrideModel || ModelType.Standard,
        imageSize: overrideSize || ImageSize.x1K,
        type: WallpaperType.image,
        categories: ['Edit'],
      };

      const resultUrl = await editWallpaper(currentWallpaper.url, instruction, config);

      const editedWallpaper: Wallpaper = {
        id: Date.now().toString(),
        url: resultUrl,
        prompt: `[EDIT] ${instruction}`,
        timestamp: Date.now(),
        aspectRatio: currentWallpaper.aspectRatio,
        model: config.model,
        type: WallpaperType.image,
        categories: ['Edit'],
      };

      setUndoStack(prev => [...prev, currentWallpaper]);
      setRedoStack([]);

      await db.saveWallpaper('history', editedWallpaper);
      setHistory((prev) => [editedWallpaper, ...prev]);
      setCurrentWallpaper(editedWallpaper);
      setShowEditTools(false);
    } catch (error) {
      console.error("Edit failed:", error);
      alert("Failed to edit wallpaper. Check debug logs for details.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleAnimateWallpaper = async (motionPrompt: string) => {
    if (!currentWallpaper) return;
    setIsEditing(true);

    try {
      const config: GenerationConfig = {
        prompt: motionPrompt,
        aspectRatio: currentWallpaper.aspectRatio,
        model: ModelType.Standard,
        imageSize: ImageSize.x1K,
        type: WallpaperType.video,
        categories: ['Animate'],
        image: currentWallpaper.url
      };

      const resultUrl = await generateWallpaperVideo(config);

      const animatedWallpaper: Wallpaper = {
        id: Date.now().toString(),
        url: resultUrl,
        prompt: `[ANIMATED] ${motionPrompt}`,
        timestamp: Date.now(),
        aspectRatio: currentWallpaper.aspectRatio,
        model: 'veo-3.1-fast-generate-preview',
        type: WallpaperType.video,
        categories: ['Animate'],
      };

      await db.saveWallpaper('history', animatedWallpaper);
      setHistory((prev) => [animatedWallpaper, ...prev]);
      setCurrentWallpaper(animatedWallpaper);
      setShowEditTools(false);
      setUndoStack([]);
      setRedoStack([]);
    } catch (error) {
      console.error("Animation failed:", error);
      alert("Failed to animate wallpaper. Check debug logs for details.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !currentWallpaper) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(prevRedo => [...prevRedo, currentWallpaper]);
    setUndoStack(prevUndo => prevUndo.slice(0, -1));
    setCurrentWallpaper(prev);
    logger.info("App", "Undo action performed");
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !currentWallpaper) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prevUndo => [...prevUndo, currentWallpaper]);
    setRedoStack(prevRedo => prevRedo.slice(0, -1));
    setCurrentWallpaper(next);
    logger.info("App", "Redo action performed");
  };

  const handleSaveToLibrary = async (wp: Wallpaper) => {
    if (library.some(item => item.id === wp.id)) {
      await db.deleteWallpaper('library', wp.id);
      setLibrary(prev => prev.filter(item => item.id !== wp.id));
    } else {
      await db.saveWallpaper('library', wp);
      setLibrary(prev => [wp, ...prev]);
    }
  };

  const handleSaveBulkToLibrary = async (ids: string[]) => {
    const toSave = history.filter(wp => ids.includes(wp.id) && !library.some(lib => lib.id === wp.id));
    if (toSave.length === 0) return;
    
    await db.bulkSaveWallpapers('library', toSave);
    setLibrary(prev => [...toSave, ...prev]);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await db.deleteWallpaper('history', id);
      setHistory((prev) => prev.filter(wp => wp.id !== id));
      if (currentWallpaper?.id === id) {
        setCurrentWallpaper(null);
        setUndoStack([]);
        setRedoStack([]);
      }
    } catch (e) {
      console.error("Delete from history failed:", e);
    }
  };

  const handleDeleteHistoryBulk = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => db.deleteWallpaper('history', id)));
      setHistory((prev) => prev.filter(wp => !ids.includes(wp.id)));
      if (currentWallpaper && ids.includes(currentWallpaper.id)) {
        setCurrentWallpaper(null);
        setUndoStack([]);
        setRedoStack([]);
      }
    } catch (e) {
      console.error("Bulk delete history failed:", e);
    }
  };

  const handleDeleteLibrary = async (id: string) => {
    try {
      await db.deleteWallpaper('library', id);
      setLibrary((prev) => prev.filter(wp => wp.id !== id));
      if (currentWallpaper?.id === id) setCurrentWallpaper(null);
    } catch (e) {
      console.error("Delete from library failed:", e);
    }
  };

  const handleDeleteLibraryBulk = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => db.deleteWallpaper('history', id)));
      setLibrary((prev) => prev.filter(wp => !ids.includes(wp.id)));
      if (currentWallpaper && ids.includes(currentWallpaper.id)) setCurrentWallpaper(null);
    } catch (e) {
      console.error("Bulk delete library failed:", e);
    }
  };

  const handleClearPromptHistory = async () => {
    await db.clearPromptHistory();
    setPromptHistory([]);
  };

  const handleDownload = (wp: Wallpaper, e?: React.MouseEvent) => {
    const link = document.createElement('a');
    link.href = wp.url;
    link.download = `cosmic-${wp.id}.${wp.type === WallpaperType.video ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logger.info("App", `Downloaded wallpaper: ${wp.id}`);
  };

  const handleExportData = () => {
    const data = {
      history,
      library,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cosmic-wallpaper-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
    logger.info("App", "Library data exported");
  };

  const handleImportData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.history && Array.isArray(data.history)) {
          await db.clearStore('history');
          await db.bulkSaveWallpapers('history', data.history);
          setHistory(data.history);
        }
        if (data.library && Array.isArray(data.library)) {
          await db.clearStore('library');
          await db.bulkSaveWallpapers('library', data.library);
          setLibrary(data.library);
        }
        alert("Backup imported successfully!");
        logger.info("App", "Library backup imported successfully");
      } catch (err) {
        logger.error("App", "Import failed", err);
        alert("Failed to import backup. Please make sure it's a valid cosmic backup file.");
      } finally {
        setIsMenuOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
    localStorage.setItem('cosmic-help-seen', 'true');
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-foreground font-sans selection:bg-secondary selection:text-white transition-colors duration-500">
      {!currentWallpaper && <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-background to-purple-900/10 animate-gradient-x -z-10" />}

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-primary animate-pulse">Initializing Cosmic Engine...</p>
           </div>
        </div>
      ) : (
        <>
          <WallpaperDisplay currentWallpaper={currentWallpaper} onClose={() => { setCurrentWallpaper(null); setUndoStack([]); setRedoStack([]); }} />

          {!activeSidebar && (
            <div className="absolute top-0 left-0 p-6 z-50" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-3 backdrop-blur-md rounded-xl text-foreground border transition-all hover:scale-105 active:scale-95 group overflow-hidden ${isMenuOpen ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white' : 'bg-surface/50 border-border hover:bg-surface/80'}`}
                aria-label="Toggle Menu"
              >
                <Settings 
                  size={24} 
                  className={`transition-transform duration-700 ease-in-out ${isMenuOpen ? 'rotate-[180deg]' : 'group-hover:rotate-45'}`} 
                />
              </button>

              {isMenuOpen && (
                <div className="absolute top-full left-6 mt-3 w-80 max-h-[85vh] overflow-y-auto custom-scrollbar bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Navigation</div>
                    <button 
                      onClick={() => { setActiveSidebar('history'); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <History size={18} className="text-secondary" />
                        <span className="text-sm font-medium">History</span>
                      </div>
                      <ChevronRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => { setActiveSidebar('library'); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Book size={18} className="text-primary" />
                        <span className="text-sm font-medium">Library</span>
                      </div>
                      <ChevronRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="my-2 h-px bg-border mx-3"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                       <Palette size={12} /> Color Mode
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 px-2 pb-2">
                       {THEMES.map((t) => (
                         <button
                           key={t.id}
                           onClick={() => setTheme(t.id)}
                           className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${theme === t.id ? 'bg-primary/20 border-primary' : 'bg-background/40 border-border hover:border-muted'}`}
                         >
                           <div 
                             className="w-8 h-8 rounded-full border border-white/20 shadow-sm flex items-center justify-center overflow-hidden" 
                             style={{ background: t.color }}
                           >
                              {theme === t.id && <Check size={14} className={t.id === 'light' ? 'text-black' : 'text-white'} />}
                           </div>
                           <span className="text-[10px] font-bold">{t.label}</span>
                         </button>
                       ))}
                    </div>

                    {theme === 'custom' && (
                      <div className="px-3 py-3 mt-2 bg-background/30 rounded-2xl border border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center gap-2 mb-1">
                            <Pipette size={12} className="text-primary" />
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Custom Palette</span>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] text-muted block ml-1">Background</label>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={customColors.background} 
                                    onChange={(e) => updateCustomColor('background', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                  />
                                  <span className="text-[10px] font-mono uppercase opacity-60">{customColors.background}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-muted block ml-1">Surface</label>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={customColors.surface} 
                                    onChange={(e) => updateCustomColor('surface', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                  />
                                  <span className="text-[10px] font-mono uppercase opacity-60">{customColors.surface}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-muted block ml-1">Primary</label>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={customColors.primary} 
                                    onChange={(e) => updateCustomColor('primary', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                  />
                                  <span className="text-[10px] font-mono uppercase opacity-60">{customColors.primary}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-muted block ml-1">Secondary</label>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={customColors.secondary} 
                                    onChange={(e) => updateCustomColor('secondary', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                  />
                                  <span className="text-[10px] font-mono uppercase opacity-60">{customColors.secondary}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-muted block ml-1">Text</label>
                               <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={customColors.foreground} 
                                    onChange={(e) => updateCustomColor('foreground', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                  />
                                  <span className="text-[10px] font-mono uppercase opacity-60">{customColors.foreground}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="my-2 h-px bg-border mx-3"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Preferences</div>
                    
                    <button 
                      onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <ZapOff size={18} className={animationsEnabled ? 'text-muted' : 'text-primary'} />
                        <span className="text-sm font-medium">Subtle Animations</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${animationsEnabled ? 'bg-primary' : 'bg-muted/30'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${animationsEnabled ? 'left-4.5' : 'left-0.5'}`} />
                      </div>
                    </button>

                    <div className="my-2 h-px bg-border mx-3"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Support</div>

                    <button 
                      onClick={() => { setShowHelp(true); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors text-primary"
                    >
                      <span className="hidden sm:inline font-medium">Help & Instructions</span>
                      <Info size={18} />
                    </button>

                    <div className="my-2 h-px bg-border mx-3"></div>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">System</div>
                    
                    <button 
                      onClick={handleExportData}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors text-primary"
                    >
                      <DownloadCloud size={18} />
                      <span className="text-sm font-medium">Back up Library</span>
                    </button>
                    
                    <button 
                      onClick={() => importInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors text-secondary"
                    >
                      <UploadCloud size={18} />
                      <span className="text-sm font-medium">Import Library</span>
                    </button>

                    <button 
                      onClick={() => { setShowDebug(!showDebug); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors ${showDebug ? 'text-primary' : 'text-muted'}`}
                    >
                      <Bug size={18} />
                      <span className="text-sm font-medium">Debug Console</span>
                    </button>

                    <button 
                      onClick={() => { promptApiKeySelection().then(checkApiKeySelection).then(setHasProKey); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors ${hasProKey ? 'text-green-500' : 'text-yellow-600'}`}
                    >
                      <Key size={18} />
                      <span className="text-sm font-medium">{hasProKey ? 'Pro Mode Active' : 'Enable Pro Mode'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <input 
            type="file" 
            ref={importInputRef} 
            onChange={(e) => e.target.files?.[0] && handleImportData(e.target.files[0])} 
            className="hidden" 
            accept="application/json" 
          />

          <div className="absolute top-0 right-0 p-6 flex justify-end z-30 pointer-events-none">
            {currentWallpaper && (
                <div className="flex gap-2 items-center">
                    <div className="flex gap-1 mr-2 pointer-events-auto">
                        <button 
                          onClick={handleUndo}
                          disabled={undoStack.length === 0}
                          className="p-2.5 backdrop-blur-md rounded-full bg-surface/30 border border-border text-foreground/70 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-surface/50"
                          title="Undo last edit"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                          onClick={handleRedo}
                          disabled={redoStack.length === 0}
                          className="p-2.5 backdrop-blur-md rounded-full bg-surface/30 border border-border text-foreground/70 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-surface/50"
                          title="Redo edit"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>

                    <button 
                      onClick={() => setShowEditTools(!showEditTools)}
                      className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-xs transition-all shadow-lg hover:scale-105 active:scale-95 border ${showEditTools ? 'bg-secondary border-secondary text-white' : 'bg-surface/30 border-border text-foreground/70 hover:text-foreground'}`}
                      title="AI Editing Tools"
                    >
                        <Sparkles size={14} className={showEditTools ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline font-medium">Edit AI</span>
                    </button>
                    <button 
                      onClick={() => handleSaveToLibrary(currentWallpaper)} 
                      className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-xs transition-all shadow-lg hover:scale-105 active:scale-95 border ${isInLibrary ? 'bg-primary border-primary text-white' : 'bg-surface/30 border-border text-foreground/70 hover:text-foreground'}`}
                      title={isInLibrary ? "Remove from Library" : "Save to Library"}
                    >
                        {isInLibrary ? <BookmarkCheck size={14} className="text-white" /> : <Bookmark size={14} />}
                        <span className="hidden sm:inline font-medium">{isInLibrary ? 'Saved' : 'Save'}</span>
                    </button>
                    <button onClick={(e) => handleDownload(currentWallpaper, e)} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-foreground border border-border transition-all shadow-lg hover:scale-105 active:scale-95">
                        <Download size={14} />
                        <span className="hidden sm:inline font-medium">Download</span>
                    </button>
                    <button onClick={() => window.open(currentWallpaper.url, '_blank')} className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-foreground border border-border transition-all">
                        {currentWallpaper.type === WallpaperType.video ? <Play size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            )}
          </div>

          <SidebarList 
            title="History" 
            icon={<History size={20} className="text-secondary" />} 
            items={history} 
            libraryItems={library}
            isOpen={activeSidebar === 'history'} 
            onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); setUndoStack([]); setRedoStack([]); }} 
            onDelete={handleDeleteHistory} 
            onDeleteBulk={handleDeleteHistoryBulk}
            onDownload={handleDownload} 
            onSaveToLibrary={handleSaveToLibrary}
            onSaveBulkToLibrary={handleSaveBulkToLibrary}
            categorized={false} 
          />

          <SidebarList 
            title="Library" 
            icon={<Book size={20} className="text-primary" />} 
            items={library} 
            isOpen={activeSidebar === 'library'} 
            onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); setUndoStack([]); setRedoStack([]); }} 
            onDelete={handleDeleteLibrary} 
            onDeleteBulk={handleDeleteLibraryBulk}
            onDownload={handleDownload} 
            categorized={true} 
          />
          
          {(activeSidebar || isMenuOpen) && <div className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity duration-300" onClick={() => { setActiveSidebar(null); setIsMenuOpen(false); }} />}
          
          {showEditTools && currentWallpaper && (
            <EditingTools 
              onClose={() => setShowEditTools(false)}
              onEdit={handleApplyEdit}
              onAnimate={handleAnimateWallpaper}
              onRequestProKey={promptApiKeySelection}
              isProcessing={isEditing}
              hasProKey={hasProKey}
              currentAspectRatio={currentWallpaper.aspectRatio}
            />
          )}

          <DebugOverlay isOpen={showDebug} onClose={() => setShowDebug(false)} />
          <HelpModal isOpen={showHelp} onClose={handleCloseHelp} />
        </>
      )}

      <Controls 
        isGenerating={isGenerating} 
        onGenerate={handleGenerate} 
        onRequestProKey={promptApiKeySelection} 
        hasProKey={hasProKey}
        promptHistory={promptHistory}
        onClearPromptHistory={handleClearPromptHistory}
        hasActiveWallpaper={!!currentWallpaper}
      />
    </div>
  );
};

export default App;
