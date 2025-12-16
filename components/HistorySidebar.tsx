import React, { useState } from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Trash2, Film, Image as ImageIcon } from 'lucide-react';

interface SidebarListProps {
  title: string;
  icon: React.ReactNode;
  items: Wallpaper[];
  onSelect: (wallpaper: Wallpaper) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  emptyMessage?: string;
}

const SidebarItem = ({ 
  wp, 
  onSelect, 
  onDelete 
}: { 
  wp: Wallpaper; 
  onSelect: (wp: Wallpaper) => void; 
  onDelete: (id: string) => void; 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    // Wait for animation to finish before reporting delete to parent
    setTimeout(() => {
      onDelete(wp.id);
    }, 700);
  };

  return (
    <div 
      className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/5 transition-all cursor-pointer ${
        isDeleting 
          ? 'animate-dust-blow pointer-events-none' 
          : 'hover:border-secondary/50 hover:scale-[1.02]'
      }`}
      onClick={() => !isDeleting && onSelect(wp)}
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
          onClick={handleDelete}
          className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const SidebarList: React.FC<SidebarListProps> = ({ title, icon, items, onSelect, onDelete, isOpen, emptyMessage = "No items found." }) => {
  return (
    <>
      <style>{`
        @keyframes dustBlow {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
            filter: contrast(1) brightness(1) blur(0);
          }
          30% {
            transform: translateX(-5px) scale(0.95);
            filter: contrast(1.2) brightness(1.1) blur(0.5px);
          }
          100% {
            transform: translateX(60px) translateY(-30px) scale(0.8) rotate(5deg);
            opacity: 0;
            filter: contrast(0.5) brightness(2) blur(12px) grayscale(1);
          }
        }
        .animate-dust-blow {
          animation: dustBlow 0.7s ease-in forwards;
          z-index: 50; /* Ensure it floats above others while dissolving */
        }
      `}</style>
      <div 
        className={`fixed left-0 top-0 bottom-0 w-80 bg-surface/95 backdrop-blur-md border-r border-white/10 flex flex-col transition-transform duration-300 z-40 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            items.map((wp) => (
              <SidebarItem 
                key={wp.id} 
                wp={wp} 
                onSelect={onSelect} 
                onDelete={onDelete} 
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarList;