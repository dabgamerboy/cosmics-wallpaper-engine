import React from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { X } from 'lucide-react';

interface WallpaperDisplayProps {
  currentWallpaper: Wallpaper | null;
  onClose: () => void;
}

const WallpaperDisplay: React.FC<WallpaperDisplayProps> = ({ currentWallpaper, onClose }) => {
  if (!currentWallpaper) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none select-none">
        <h1 className="text-6xl font-black tracking-tighter mb-4 text-white/10">COSMIC'S</h1>
        <p className="text-xl font-light tracking-widest uppercase">Wallpaper Engine</p>
      </div>
    );
  }

  // Calculate container aspect ratio styles to fit the image nicely
  const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case AspectRatio.Portrait: return 'aspect-[9/16] h-[80vh]';
      case AspectRatio.Square: return 'aspect-square h-[80vh]';
      case AspectRatio.Landscape: return 'aspect-video w-[90vw] max-w-[1600px]';
      case AspectRatio.Wide: return 'aspect-[4/3] h-[80vh]';
      default: return 'aspect-video w-[80vw]';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 z-0">
      <div className={`relative group transition-all duration-500 ease-out ${getAspectRatioClass(currentWallpaper.aspectRatio)}`}>
        {/* Main Content */}
        {currentWallpaper.type === WallpaperType.Video ? (
          <video
            src={currentWallpaper.url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10 bg-black"
          />
        ) : (
          <img
            src={currentWallpaper.url}
            alt={currentWallpaper.prompt}
            className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10"
          />
        )}

        {/* Close Button (if viewing history item while creating new one) */}
        <button 
           onClick={onClose}
           className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md pointer-events-auto"
        >
          <X size={20} />
        </button>
      </div>

      {/* Ambient Background Glow matching the content */}
      <div 
        className="absolute inset-0 -z-10 opacity-30 blur-[100px] scale-110 transition-all duration-1000"
      >
        {currentWallpaper.type === WallpaperType.Video ? (
           <video src={currentWallpaper.url} autoPlay loop muted className="w-full h-full object-cover opacity-50" />
        ) : (
           <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${currentWallpaper.url})` }} />
        )}
      </div>
    </div>
  );
};

export default WallpaperDisplay;