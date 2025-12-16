import React, { useState, useEffect } from 'react';
import { History, Book, Info, Download, Maximize2, Play, Bookmark, Check } from 'lucide-react';
import SidebarList from './components/HistorySidebar';
import Controls from './components/Controls';
import WallpaperDisplay from './components/WallpaperDisplay';
import { Wallpaper, GenerationConfig, ModelType, WallpaperType } from './types';
import { generateWallpaperImage, generateWallpaperVideo, checkApiKeySelection, promptApiKeySelection } from './services/geminiService';

type SidebarMode = 'history' | 'library' | null;

const App: React.FC = () => {
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [library, setLibrary] = useState<Wallpaper[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasProKey, setHasProKey] = useState(false);
  
  // Animation states
  const [animatingTab, setAnimatingTab] = useState<string | null>(null);
  const [downloadEffects, setDownloadEffects] = useState<{id: number, x: number, y: number}[]>([]);

  // Load data from local storage on mount
  useEffect(() => {
    // History
    const savedHistory = localStorage.getItem('nebula_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Library
    const savedLibrary = localStorage.getItem('nebula_library');
    if (savedLibrary) {
      try {
        const parsed = JSON.parse(savedLibrary);
        setLibrary(parsed);
      } catch (e) {
        console.error("Failed to parse library", e);
      }
    }

    // Check if user already has a key selected for this session context
    checkApiKeySelection().then(setHasProKey);
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nebula_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded.", e);
    }
  }, [history]);

  // Save library whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nebula_library', JSON.stringify(library));
    } catch (e) {
      console.warn("Storage quota exceeded.", e);
    }
  }, [library]);

  const handleGenerate = async (config: GenerationConfig) => {
    setIsGenerating(true);
    
    // Check key for Pro model OR Video generation
    if (config.model === ModelType.Pro || config.type === WallpaperType.Video) {
      const hasKey = await checkApiKeySelection();
      if (!hasKey) {
        try {
          await promptApiKeySelection();
          setHasProKey(true);
        } catch (e) {
          console.error("Key selection failed or cancelled", e);
          setIsGenerating(false);
          return;
        }
      }
    }

    try {
      let mediaData: string;
      if (config.type === WallpaperType.Video) {
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
        model: config.type === WallpaperType.Video ? 'veo-3.1-fast-generate-preview' : config.model,
        type: config.type,
      };

      setHistory((prev) => [newWallpaper, ...prev]);
      setCurrentWallpaper(newWallpaper);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate wallpaper. Please try again. If using Video or Pro Image, ensure your API key is valid and has billing enabled.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter(wp => wp.id !== id));
    if (currentWallpaper?.id === id && activeSidebar === 'history') {
      setCurrentWallpaper(null);
    }
  };

  const handleDeleteLibrary = (id: string) => {
    setLibrary((prev) => prev.filter(wp => wp.id !== id));
    if (currentWallpaper?.id === id && activeSidebar === 'library') {
      setCurrentWallpaper(null);
    }
  };

  const handleSaveToLibrary = () => {
    if (!currentWallpaper) return;
    if (!library.some(wp => wp.id === currentWallpaper.id)) {
      setLibrary(prev => [currentWallpaper, ...prev]);
    }
  };

  const handleRequestProKey = async () => {
    try {
      await promptApiKeySelection();
      const hasKey = await checkApiKeySelection();
      setHasProKey(hasKey);
    } catch (e) {
       console.error("Error selecting key:", e);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    if (!currentWallpaper) return;

    // Trigger Download Animation Effect
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const newEffect = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top };
    setDownloadEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setDownloadEffects(prev => prev.filter(ef => ef.id !== newEffect.id));
    }, 1500);

    const link = document.createElement('a');
    link.href = currentWallpaper.url;
    link.download = `cosmic-${currentWallpaper.id}.${currentWallpaper.type === WallpaperType.Video ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabClick = (tab: SidebarMode) => {
     setActiveSidebar(activeSidebar === tab ? null : tab);
     setAnimatingTab(tab || '');
     setTimeout(() => setAnimatingTab(null), 300);
  };

  const isSavedInLibrary = currentWallpaper && library.some(wp => wp.id === currentWallpaper.id);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-white font-sans selection:bg-secondary selection:text-white">
      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-pop {
          animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes flyUpFade {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -20px) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -60px) scale(1); opacity: 0; }
        }
        .animate-fly-up {
          animation: flyUpFade 1.2s ease-out forwards;
        }
      `}</style>
      
      {/* Background Ambient Animation (when empty) */}
      {!currentWallpaper && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-purple-900/20 animate-gradient-x -z-10" />
      )}

      {/* Main Content Area */}
      <WallpaperDisplay 
        currentWallpaper={currentWallpaper} 
        onClose={() => setCurrentWallpaper(null)}
      />

      {/* Top Left Navigation (History & Library) */}
      <div className="absolute top-0 left-0 p-6 flex flex-col gap-3 z-30 pointer-events-none">
        <button 
          onClick={() => handleTabClick('history')}
          className={`pointer-events-auto p-3 backdrop-blur-md rounded-xl text-white border transition-all hover:scale-105 active:scale-95 ${
            activeSidebar === 'history' 
              ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20' 
              : 'bg-surface/50 hover:bg-surface/80 border-white/10'
          } ${animatingTab === 'history' ? 'animate-pop' : ''}`}
          title="History"
        >
          <History size={24} />
        </button>
        <button 
          onClick={() => handleTabClick('library')}
          className={`pointer-events-auto p-3 backdrop-blur-md rounded-xl text-white border transition-all hover:scale-105 active:scale-95 ${
            activeSidebar === 'library' 
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
              : 'bg-surface/50 hover:bg-surface/80 border-white/10'
          } ${animatingTab === 'library' ? 'animate-pop' : ''}`}
          title="Library"
        >
          <Book size={24} />
        </button>
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-0 right-0 p-6 flex justify-end z-30 pointer-events-none">
        <div className="flex gap-2 items-center">
            {/* Action Buttons for Current Wallpaper */}
            {currentWallpaper && (
                <>
                    <button
                        onClick={handleSaveToLibrary}
                        disabled={!!isSavedInLibrary}
                        className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-xs text-white border transition-all shadow-lg ${
                          isSavedInLibrary 
                             ? 'bg-green-500/20 border-green-500/30 text-green-200 cursor-default'
                             : 'bg-secondary/20 hover:bg-secondary/40 border-secondary/20 hover:border-secondary/40 shadow-secondary/10'
                        }`}
                        title="Save to Library"
                    >
                        {isSavedInLibrary ? <Check size={14} /> : <Bookmark size={14} />}
                        <span className="hidden sm:inline font-medium">{isSavedInLibrary ? 'Saved' : 'Save'}</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 backdrop-blur-md rounded-full text-xs text-white border border-primary/20 transition-all shadow-lg shadow-primary/10 hover:scale-105 active:scale-95"
                        title="Download"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline font-medium">Download</span>
                    </button>
                    
                     <button
                        onClick={() => window.open(currentWallpaper.url, '_blank')}
                        className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-white border border-white/5 transition-all"
                        title="Open Full Size"
                     >
                        {currentWallpaper.type === WallpaperType.Video ? <Play size={14} /> : <Maximize2 size={14} />}
                     </button>
                     
                     <div className="w-px h-6 bg-white/10 mx-1"></div>
                </>
            )}

            <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-gray-400 hover:text-white border border-white/5 transition-all"
            >
                <Info size={14} />
                <span>Pricing</span>
            </a>
        </div>
      </div>

      {/* Floating Download Effects */}
      {downloadEffects.map(effect => (
        <div 
          key={effect.id}
          className="fixed z-50 pointer-events-none animate-fly-up text-primary flex items-center gap-1 font-bold text-sm shadow-black drop-shadow-md"
          style={{ left: effect.x, top: effect.y }}
        >
          <Download size={16} fill="currentColor" />
          <span>Saved!</span>
        </div>
      ))}

      {/* Sidebars */}
      <SidebarList 
        title="History"
        icon={<History size={20} className="text-secondary" />}
        items={history}
        isOpen={activeSidebar === 'history'}
        onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }}
        onDelete={handleDeleteHistory}
        emptyMessage="No generation history yet."
      />

      <SidebarList 
        title="Library"
        icon={<Book size={20} className="text-primary" />}
        items={library}
        isOpen={activeSidebar === 'library'}
        onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }}
        onDelete={handleDeleteLibrary}
        emptyMessage="Your library is empty. Save wallpapers you love!"
      />
      
      {/* Overlay to close sidebar on mobile/desktop */}
      {activeSidebar && (
        <div 
          className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm"
          onClick={() => setActiveSidebar(null)}
        />
      )}

      {/* Controls */}
      <Controls 
        isGenerating={isGenerating} 
        onGenerate={handleGenerate} 
        onRequestProKey={handleRequestProKey}
        hasProKey={hasProKey}
      />
    </div>
  );
};

export default App;