import React, { useState, useEffect } from 'react';
import { Menu, Info } from 'lucide-react';
import HistorySidebar from './components/HistorySidebar';
import Controls from './components/Controls';
import WallpaperDisplay from './components/WallpaperDisplay';
import { Wallpaper, GenerationConfig, ModelType, WallpaperType } from './types';
import { generateWallpaperImage, generateWallpaperVideo, checkApiKeySelection, promptApiKeySelection } from './services/geminiService';

const App: React.FC = () => {
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasProKey, setHasProKey] = useState(false);

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('nebula_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setCurrentWallpaper(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
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
      console.warn("History storage quota exceeded or failed. Video wallpapers might be too large for localStorage.", e);
      // Optional: Logic to trim old items or just ignore saving this specific update
    }
  }, [history]);

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

  const handleDelete = (id: string) => {
    setHistory((prev) => prev.filter(wp => wp.id !== id));
    if (currentWallpaper?.id === id) {
      setCurrentWallpaper(null);
    }
  };

  const handleRequestProKey = async () => {
    try {
      await promptApiKeySelection();
      // We assume success if no error, but we can verify
      const hasKey = await checkApiKeySelection();
      setHasProKey(hasKey);
    } catch (e) {
       console.error("Error selecting key:", e);
    }
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden text-white font-sans selection:bg-secondary selection:text-white">
      
      {/* Background Ambient Animation (when empty) */}
      {!currentWallpaper && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-purple-900/20 animate-gradient-x -z-10" />
      )}

      {/* Main Content Area */}
      <WallpaperDisplay 
        currentWallpaper={currentWallpaper} 
        onClose={() => setCurrentWallpaper(null)}
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="pointer-events-auto p-3 bg-surface/50 hover:bg-surface/80 backdrop-blur-md rounded-xl text-white border border-white/10 transition-all hover:scale-105 active:scale-95"
        >
          <Menu size={24} />
        </button>

        <div className="flex gap-2">
            <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-surface/30 hover:bg-surface/60 backdrop-blur-md rounded-full text-xs text-gray-400 hover:text-white border border-white/5 transition-all"
            >
                <Info size={14} />
                <span>Pricing & Billing</span>
            </a>
        </div>
      </div>

      {/* Sidebar */}
      <HistorySidebar 
        history={history}
        isOpen={isSidebarOpen}
        onSelect={(wp) => { setCurrentWallpaper(wp); setIsSidebarOpen(false); }}
        onDelete={handleDelete}
      />
      
      {/* Overlay to close sidebar on mobile/desktop */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-10 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
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