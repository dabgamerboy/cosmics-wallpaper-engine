
import React, { useState, useEffect } from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { X, Loader2 } from 'lucide-react';

interface WallpaperDisplayProps {
  currentWallpaper: Wallpaper | null;
  onClose: () => void;
}

const WallpaperDisplay: React.FC<WallpaperDisplayProps> = ({ currentWallpaper, onClose }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [currentWallpaper?.url]);

  if (!currentWallpaper) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5 pointer-events-none select-none z-0 pb-40">
        <h1 className="text-[12rem] font-black tracking-tighter leading-none animate-float">COSMIC</h1>
        <p className="text-2xl font-black tracking-[1.5em] uppercase opacity-40 -mt-8">Wallpaper Engine</p>
      </div>
    );
  }

  const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case AspectRatio.Portrait: return 'aspect-[9/16] h-[65vh]';
      case AspectRatio.Square: return 'aspect-square h-[65vh]';
      case AspectRatio.Landscape: return 'aspect-video w-[85vw] max-w-[1200px]';
      case AspectRatio.Wide: return 'aspect-[4/3] h-[65vh]';
      default: return 'aspect-video w-[80vw]';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-12 pb-[280px] z-0">
      <div className={`relative transition-all duration-700 ease-out ${getAspectRatioClass(currentWallpaper.aspectRatio)} ${loaded ? 'animate-reveal' : 'opacity-0 scale-95 blur-xl'}`}>
        
        {/* Loading Spinner for switch */}
        {!loaded && (
           <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-primary opacity-20" size={48} />
           </div>
        )}

        {/* Content Panel */}
        <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5 bg-black group/display">
          {currentWallpaper.type === WallpaperType.video ? (
            <video
              src={currentWallpaper.url}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setLoaded(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentWallpaper.url}
              alt={currentWallpaper.prompt}
              onLoad={() => setLoaded(true)}
              className="w-full h-full object-cover"
            />
          )}

          {/* Controls Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/display:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute bottom-8 left-8 right-8">
               <h2 className="text-white font-black text-lg tracking-tight line-clamp-2 max-w-2xl drop-shadow-lg">{currentWallpaper.prompt}</h2>
               <div className="flex gap-4 mt-3 opacity-60 text-[10px] font-black uppercase tracking-widest text-white/80">
                  <span>{currentWallpaper.model}</span>
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5" />
                  <span>{currentWallpaper.aspectRatio}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Floating Close */}
        <button 
           onClick={onClose}
           className="absolute -top-3 -right-3 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10 shadow-2xl z-20 hover:scale-110 active:scale-90"
        >
          <X size={18} />
        </button>
      </div>

      {/* Ambient Pulsating Glow */}
      <div className={`absolute inset-0 -z-10 opacity-40 blur-[120px] scale-125 transition-all duration-1000 ${loaded ? 'animate-pulse-slow' : 'opacity-0'}`}>
        {currentWallpaper.type === WallpaperType.video ? (
           <video src={currentWallpaper.url} autoPlay loop muted className="w-full h-full object-cover opacity-60" />
        ) : (
           <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${currentWallpaper.url})` }} />
        )}
      </div>
    </div>
  );
};

export default WallpaperDisplay;
