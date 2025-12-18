
import React, { useState, useMemo } from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Trash2, Film, Image as ImageIcon, Download, ChevronRight, ChevronDown } from 'lucide-react';

interface SidebarListProps {
  title: string;
  icon: React.ReactNode;
  items: Wallpaper[];
  onSelect: (wallpaper: Wallpaper) => void;
  onDelete: (id: string) => void;
  onDownload: (wp: Wallpaper) => void;
  isOpen: boolean;
  categorized?: boolean;
  emptyMessage?: string;
}

interface SidebarItemProps {
  wp: Wallpaper;
  onSelect: (wp: Wallpaper) => void;
  onDelete: (id: string) => void;
  onDownload: (wp: Wallpaper) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ wp, onSelect, onDelete, onDownload }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => onDelete(wp.id), 700);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(wp);
  };

  return (
    <div 
      className={`group relative bg-black/40 rounded-lg overflow-hidden border border-white/5 transition-all cursor-pointer ${isDeleting ? 'animate-dust-blow pointer-events-none' : 'hover:border-secondary/50 hover:scale-[1.02]'}`}
      onClick={() => !isDeleting && onSelect(wp)}
    >
      <div className={`w-full ${wp.aspectRatio === AspectRatio.Portrait ? 'h-40' : 'h-24'} overflow-hidden relative`}>
         {wp.type === WallpaperType.Video ? (
            <video src={wp.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
         ) : (
            <img src={wp.url} alt={wp.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
         )}
         {wp.type === WallpaperType.Video && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1 rounded-full text-white">
               <Film size={12} />
            </div>
         )}
      </div>
      <div className="p-2">
        <p className="text-[10px] text-gray-200 line-clamp-1 font-medium">{wp.prompt}</p>
      </div>
      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleDownloadClick} className="p-1.5 bg-primary/80 hover:bg-primary text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" title="Download">
          <Download size={12} />
        </button>
        <button onClick={handleDelete} className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" title="Delete">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const SidebarList: React.FC<SidebarListProps> = ({ title, icon, items, onSelect, onDelete, onDownload, isOpen, categorized = false, emptyMessage = "No items found." }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const groupedItems = useMemo(() => {
    if (!categorized) return { 'All': items };
    const groups: Record<string, Wallpaper[]> = {};
    items.forEach(item => {
      const cat = item.category || 'Custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items, categorized]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <>
      <style>{`
        @keyframes dustBlow {
          0% { transform: translateX(0) scale(1); opacity: 1; filter: blur(0); }
          100% { transform: translateX(40px) translateY(-20px) scale(0.8); opacity: 0; filter: blur(8px); }
        }
        .animate-dust-blow { animation: dustBlow 0.7s ease-in forwards; z-index: 50; }
      `}</style>
      <div className={`fixed left-0 top-0 bottom-0 w-80 bg-surface/95 backdrop-blur-md border-r border-white/10 flex flex-col transition-transform duration-300 z-40 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">{icon}{title}</h2>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([cat, val]) => {
              // Fix: Explicitly cast the value to Wallpaper[] to avoid 'unknown' type errors in some TS environments
              const categoryItems = val as Wallpaper[];
              return (
                <div key={cat} className="space-y-2">
                  {categorized && (
                    <button 
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between py-2 border-b border-white/5 group hover:text-primary transition-colors"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-primary">{cat} ({categoryItems.length})</span>
                      {expandedCategories[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  <div className={`grid grid-cols-2 gap-2 ${categorized && !expandedCategories[cat] ? 'hidden' : 'animate-in fade-in slide-in-from-top-2 duration-300'}`}>
                    {categoryItems.map((wp) => (
                      <SidebarItem key={wp.id} wp={wp} onSelect={onSelect} onDelete={onDelete} onDownload={onDownload} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarList;
