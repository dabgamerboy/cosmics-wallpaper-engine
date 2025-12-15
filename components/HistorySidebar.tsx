import React from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Trash2, Download, Image as ImageIcon, Clock, Film } from 'lucide-react';

interface HistorySidebarProps {
  history: Wallpaper[];
  onSelect: (wallpaper: Wallpaper) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, onDelete, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-surface/95 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-300 absolute z-20 left-0 top-0 bottom-0 shadow-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-secondary" />
          History
        </h2>
        <span className="text-xs text-gray-400">{history.length} items</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
            <p>No wallpapers generated yet.</p>
          </div>
        ) : (
          history.map((wp) => (
            <div 
              key={wp.id} 
              className="group relative bg-black/40 rounded-lg overflow-hidden border border-white/5 hover:border-secondary/50 transition-all cursor-pointer"
              onClick={() => onSelect(wp)}
            >
              <div className={`w-full ${wp.aspectRatio === AspectRatio.Portrait ? 'h-48' : 'h-32'} overflow-hidden relative`}>
                 {wp.type === WallpaperType.Video ? (
                    <video 
                      src={wp.url} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      muted
                      loop
                      onMouseOver={e => e.currentTarget.play()}
                      onMouseOut={e => e.currentTarget.pause()}
                    />
                 ) : (
                    <img 
                      src={wp.url} 
                      alt={wp.prompt} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      loading="lazy"
                    />
                 )}
                 
                 {/* Type Indicator */}
                 {wp.type === WallpaperType.Video && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1 rounded-full text-white">
                       <Film size={12} />
                    </div>
                 )}
              </div>
              
              <div className="p-3">
                <p className="text-sm text-gray-200 line-clamp-2 mb-2 font-medium">{wp.prompt}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                   <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{wp.aspectRatio}</span>
                   <span>{new Date(wp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>

              <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(wp.id); }}
                  className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;