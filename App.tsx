
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
  
  const [animatingTab, setAnimatingTab] = useState<string | null>(null);
  const [downloadEffects, setDownloadEffects] = useState<{id: number, x: number, y: number}[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('nebula_history');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}

    const savedLibrary = localStorage.getItem('nebula_library');
    if (savedLibrary) try { setLibrary(JSON.parse(savedLibrary)); } catch (e) {}

    checkApiKeySelection().then(setHasProKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('nebula_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('nebula_library', JSON.stringify(library));
  }, [library]);

  const handleGenerate = async (config: GenerationConfig) => {
    setIsGenerating(true);
    
    if (config.model === ModelType.Pro || config.type === WallpaperType.Video) {
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
        category: config.category,
      };

      setHistory((prev) => [newWallpaper, ...prev]);
      // Also automatically save to library as requested
      setLibrary((prev) => [newWallpaper, ...prev]);
      setCurrentWallpaper(newWallpaper);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate wallpaper. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter(wp => wp.id !== id));
    if (currentWallpaper?.id === id && activeSidebar === 'history') setCurrentWallpaper(null);
  };

  const handleDeleteLibrary = (id: string) => {
    setLibrary((prev) => prev.filter(wp => wp.id !== id));
    if (currentWallpaper?.id === id && activeSidebar === 'library') setCurrentWallpaper(null);
  };

  const handleDownload = (wp: Wallpaper, e?: React.MouseEvent) => {
    if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const newEffect = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top };
        setDownloadEffects(prev => [...prev, newEffect]);
        setTimeout(() => setDownloadEffects(prev => prev.filter(ef => ef.id !== newEffect.id)), 1500);
    }

    const link = document.createElement('a');
    link.href = wp.url;
    link.download = `cosmic-${wp.id}.${wp.type === WallpaperType.Video ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (data.library && Array.isArray(data.library)) {
          setLibrary(data.library);
        }
        alert("Backup imported successfully!");
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to import backup. Please make sure it's a valid cosmic backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-white font-sans selection:bg-secondary selection:text-white">
      {!currentWallpaper && <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-purple-900/20 animate-gradient-x -z-10" />}

      <WallpaperDisplay currentWallpaper={currentWallpaper} onClose={() => setCurrentWallpaper(null)} />

      <div className="absolute top-0 left-0 p-6 flex flex-col gap-3 z-30 pointer-events-none">
        <button onClick={() => { setActiveSidebar(activeSidebar === 'history' ? null : 'history'); setAnimatingTab('history'); setTimeout(() => setAnimatingTab(null), 300); }}
          className={`pointer-events-auto p-3 backdrop-blur-md rounded-xl text-white border transition-all hover:scale-105 active:scale-95 ${activeSidebar === 'history' ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20' : 'bg-surface/50 border-white/10'}`}>
          <History size={24} />
        </button>
        <button onClick={() => { setActiveSidebar(activeSidebar === 'library' ? null : 'library'); setAnimatingTab('library'); setTimeout(() => setAnimatingTab(null), 300); }}
          className={`pointer-events-auto p-3 backdrop-blur-md rounded-xl text-white border transition-all hover:scale-105 active:scale-95 ${activeSidebar === 'library' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface/50 border-white/10'}`}>
          <Book size={24} />
        </button>
      </div>

      <div className="absolute top-0 right-0 p-6 flex justify-end z-30 pointer-events-none">
        {currentWallpaper && (
            <div className="flex gap-2 items-center">
                <button onClick={(e) => handleDownload(currentWallpaper, e)} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 backdrop-blur-md rounded-full text-xs text-white border border-primary/20 transition-all shadow-lg shadow-primary/10 hover:scale-105 active:scale-95">
                    <Download size={14} />
                    <span className="hidden sm:inline font-medium">Download</span>
                </button>
                 <button onClick={() => window.open(currentWallpaper.url, '_blank')} className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-white border border-white/5 transition-all">
                    {currentWallpaper.type === WallpaperType.Video ? <Play size={14} /> : <Maximize2 size={14} />}
                 </button>
            </div>
        )}
      </div>

      <SidebarList title="History" icon={<History size={20} className="text-secondary" />} items={history} isOpen={activeSidebar === 'history'} onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }} onDelete={handleDeleteHistory} onDownload={handleDownload} categorized={false} />
      <SidebarList title="Library" icon={<Book size={20} className="text-primary" />} items={library} isOpen={activeSidebar === 'library'} onSelect={(wp) => { setCurrentWallpaper(wp); setActiveSidebar(null); }} onDelete={handleDeleteLibrary} onDownload={handleDownload} categorized={true} />
      
      {activeSidebar && <div className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm" onClick={() => setActiveSidebar(null)} />}
      <Controls 
        isGenerating={isGenerating} 
        onGenerate={handleGenerate} 
        onExport={handleExportData}
        onImport={handleImportData}
        onRequestProKey={() => promptApiKeySelection().then(checkApiKeySelection).then(setHasProKey)} 
        hasProKey={hasProKey} 
      />
    </div>
  );
};

export default App;
