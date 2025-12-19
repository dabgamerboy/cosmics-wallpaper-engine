
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { History, Book, Download, Maximize2, Play, Bookmark, BookmarkCheck, Settings, DownloadCloud, UploadCloud, Key, ChevronRight, Sparkles, Undo2, Redo2, Bug, Sun, Moon } from 'lucide-react';
import SidebarList from './components/HistorySidebar';
import Controls from './components/Controls';
import WallpaperDisplay from './components/WallpaperDisplay';
import EditingTools from './components/EditingTools';
import DebugOverlay from './components/DebugOverlay';
import { Wallpaper, GenerationConfig, ModelType, WallpaperType, AspectRatio, ImageSize } from './types';
import { generateWallpaperImage, generateWallpaperVideo, checkApiKeySelection, promptApiKeySelection, editWallpaper } from './services/geminiService';
import * as db from './services/dbService';
import { logger } from './services/logService';

type SidebarMode = 'history' | 'library' | null;
type Theme = 'light' | 'dark';

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
  const [hasProKey, setHasProKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cosmic-theme') as Theme;
    return saved || 'dark';
  });
  
  // Undo/Redo stacks for the current editing session
  const [undoStack, setUndoStack] = useState<Wallpaper[]>([]);
  const [redoStack, setRedoStack] = useState<Wallpaper[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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
      
      // Clear session stacks on new generation
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

      // Handle Undo Stack: Push current before updating
      setUndoStack(prev => [...prev, currentWallpaper]);
      setRedoStack([]); // Clear redo on new action

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
        model: ModelType.Standard, // Video model is fixed in service
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
      
      // Clear undo/redo as we switched modality to video
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
      await Promise.all(ids.map(id => db.deleteWallpaper('library', id)));
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

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-foreground font-sans selection:bg-secondary selection:text-white transition-colors duration-300">
      {!currentWallpaper && <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-purple-900/20 animate-gradient-x -z-10" />}

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

          {/* Cog Menu */}
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
                <div className="absolute top-full left-6 mt-3 w-64 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
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
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Appearance</div>
                    
                    <button 
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {theme === 'dark' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-500" />}
                        <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                      <div className="w-8 h-4 bg-border rounded-full relative">
                        <div className={`absolute top-0.5 w-3 h-3 bg-foreground rounded-full transition-all ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
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
                    {/* Undo/Redo Buttons */}
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
              isProcessing={isEditing}
              hasProKey={hasProKey}
              currentAspectRatio={currentWallpaper.aspectRatio}
            />
          )}

          <DebugOverlay isOpen={showDebug} onClose={() => setShowDebug(false)} />

          <Controls 
            isGenerating={isGenerating || isEditing} 
            onGenerate={handleGenerate} 
            onRequestProKey={() => promptApiKeySelection().then(checkApiKeySelection).then(setHasProKey)} 
            hasProKey={hasProKey}
            promptHistory={promptHistory}
            onClearPromptHistory={handleClearPromptHistory}
          />
        </>
      )}
    </div>
  );
};

export default App;
