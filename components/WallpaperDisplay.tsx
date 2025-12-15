import React from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Download, Maximize2, X, Play } from 'lucide-react';

interface WallpaperDisplayProps {
  currentWallpaper: Wallpaper | null;
  onClose: () => void;
}

const WallpaperDisplay: React.FC<WallpaperDisplayProps> = ({ currentWallpaper, onClose }) => {
  if (!currentWallpaper) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none select-none">
        <h1 className="text-6xl font-black tracking-tighter mb-4 text-white/10">NEBULA</h1>
        <p className="text-xl font-light tracking-widest uppercase">Wallpaper Engine</p>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentWallpaper.url;
    link.download = `nebula-${currentWallpaper.id}.${currentWallpaper.type === WallpaperType.Video ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        {/* Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center gap-4 backdrop-blur-[2px]">
          <button
            onClick={handleDownload}
            className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl flex items-center gap-2 font-bold"
          >
            <Download size={24} />
            <span>Download</span>
          </button>
          
          <button
             onClick={() => window.open(currentWallpaper.url, '_blank')}
             className="p-4 bg-white/10 text-white border border-white/20 rounded-full hover:bg-white/20 hover:scale-110 transition-all backdrop-blur-md"
             title="Open Full Size"
          >
             {currentWallpaper.type === WallpaperType.Video ? <Play size={24} /> : <Maximize2 size={24} />}
          </button>
        </div>

        {/* Close Button (if viewing history item while creating new one) */}
        <button 
           onClick={onClose}
           className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
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