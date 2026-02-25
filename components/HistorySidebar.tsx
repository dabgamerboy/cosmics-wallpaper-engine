
import React, { useState, useMemo, useEffect } from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Trash2, Film, Image as ImageIcon, Download, ChevronRight, ChevronDown, CheckSquare, Square, Bookmark, BookmarkCheck, X, Check, Trash } from 'lucide-react';

interface SidebarListProps {
  title: string;
  icon: React.ReactNode;
  items: Wallpaper[];
  libraryItems?: Wallpaper[];
  onSelect: (wallpaper: Wallpaper) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  onDownload: (wp: Wallpaper) => void;
  onSaveToLibrary?: (wp: Wallpaper) => void;
  onSaveBulkToLibrary?: (ids: string[]) => void;
  onClose?: () => void;
  isOpen: boolean;
  categorized?: boolean;
  emptyMessage?: string;
  sidebarPosition?: 'left' | 'right';
}

interface SidebarItemProps {
  wp: Wallpaper;
  isSaved?: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onSelect: (wp: Wallpaper) => void;
  onDelete: (id: string) => void;
  onDownload: (wp: Wallpaper) => void;
  onSaveToLibrary?: (wp: Wallpaper) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  wp, isSaved, isSelected, isSelectionMode, onToggleSelection, onSelect, onDelete, onDownload, onSaveToLibrary 
}) => {
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

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveToLibrary?.(wp);
  };

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelection(wp.id);
    } else {
      if (!isDeleting) onSelect(wp);
    }
  };

  return (
    <div 
      className={`group relative bg-black/40 rounded-2xl overflow-hidden border transition-all cursor-pointer 
        ${isDeleting ? 'animate-dust-blow pointer-events-none' : 'hover:scale-[1.05] hover:shadow-2xl hover:z-10'} 
        ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-white/5 hover:border-white/20'}`}
      onClick={handleClick}
    >
      <div className={`w-full ${wp.aspectRatio === AspectRatio.Portrait ? 'h-52' : 'h-28'} overflow-hidden relative`}>
         {wp.type === WallpaperType.video ? (
            <video src={wp.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
         ) : (
            <img src={wp.url} alt={wp.prompt} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" loading="lazy" />
         )}
         
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

         <div className="absolute top-3 right-3 flex flex-col gap-2">
            {wp.type === WallpaperType.video && (
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white border border-white/10 shadow-lg">
                    <Film size={12} />
                </div>
            )}
            {isSaved && (
                <div className="bg-primary/80 backdrop-blur-md p-1.5 rounded-full text-white border border-white/10 shadow-lg">
                    <Bookmark size={12} fill="currentColor" />
                </div>
            )}
         </div>

         {isSelectionMode && (
           <div className="absolute top-3 left-3 z-20">
             <div className={`rounded-lg p-1.5 backdrop-blur-xl border transition-all ${isSelected ? 'bg-primary border-primary text-white scale-110' : 'bg-black/40 border-white/20 text-white'}`}>
                {isSelected ? <Check size={14} strokeWidth={4} /> : <Square size={14} />}
             </div>
           </div>
         )}
      </div>

      <div className="p-3">
        <p className="text-[10px] text-foreground/80 line-clamp-1 font-bold tracking-tight uppercase">{wp.prompt}</p>
      </div>

      {!isSelectionMode && (
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
          <button onClick={handleDownloadClick} className="p-2 bg-white/10 hover:bg-white text-foreground rounded-xl backdrop-blur-xl transition-all hover:scale-110">
            <Download size={12} />
          </button>
          {onSaveToLibrary && !isSaved && (
            <button onClick={handleSaveClick} className="p-2 bg-primary/20 hover:bg-primary text-white rounded-xl backdrop-blur-xl transition-all hover:scale-110 border border-primary/30">
              <Bookmark size={12} />
            </button>
          )}
          <button onClick={handleDelete} className="p-2 bg-red-500/20 hover:bg-red-500 text-white rounded-xl backdrop-blur-xl transition-all hover:scale-110 border border-red-500/30">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

const SidebarList: React.FC<SidebarListProps> = ({ 
  title, icon, items, libraryItems = [], onSelect, onDelete, onDeleteBulk, onDownload, onSaveToLibrary, onSaveBulkToLibrary, onClose, isOpen, categorized = false, sidebarPosition = 'left'
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const groupedItems = useMemo(() => {
    if (!categorized) return { 'Recent': items };
    const groups: Record<string, Wallpaper[]> = {};
    items.forEach(item => {
      const cat = item.categories && item.categories.length > 0 ? (item.categories.length > 1 ? 'Mashups' : item.categories[0]) : 'Custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items, categorized]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const positioningClasses = sidebarPosition === 'left' 
    ? `left-0 border-r ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `right-0 border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;

  return (
    <div className={`fixed top-0 bottom-0 w-80 glass-panel bg-surface/80 border-white/5 flex flex-col transition-all duration-500 ease-in-out z-[60] ${positioningClasses}`}>
      <div className="p-6 border-b border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>
             <h2 className="text-sm font-black uppercase tracking-[0.2em]">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`p-2 rounded-xl transition-all ${isSelectionMode ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white hover:bg-white/5'}`}
            >
              <CheckSquare size={18} />
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        {isSelectionMode && (
           <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <button onClick={() => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map(i => i.id)))} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                {selectedIds.size === items.length ? 'None' : 'All'}
              </button>
              <div className="flex-1"></div>
              <button onClick={() => {onDeleteBulk(Array.from(selectedIds)); setIsSelectionMode(false);}} disabled={selectedIds.size === 0} className="p-2 text-red-400 hover:text-red-500 disabled:opacity-30 transition-all hover:scale-110">
                <Trash size={18} />
              </button>
              <button onClick={() => setIsSelectionMode(false)} className="p-2 text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
           </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted opacity-30 text-center gap-4">
            <ImageIcon size={48} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest leading-loose">The cosmos is empty<br/>Start creating</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([cat, val]) => {
            const categoryItems = val as Wallpaper[];
            return (
              <div key={cat} className="space-y-3">
                <div onClick={() => categorized && toggleCategory(cat)} className={`flex items-center justify-between group cursor-pointer ${categorized ? 'hover:text-primary' : ''}`}>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted group-hover:text-foreground transition-colors">{cat} <span className="opacity-40 text-[8px] ml-1">({categoryItems.length})</span></span>
                   {categorized && (expandedCategories[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                </div>
                <div className={`grid grid-cols-2 gap-3 ${categorized && !expandedCategories[cat] ? 'hidden' : 'animate-in fade-in slide-in-from-top-2'}`}>
                  {categoryItems.map((wp) => (
                    <SidebarItem 
                      key={wp.id} wp={wp} isSaved={libraryItems.some(lib => lib.id === wp.id)}
                      isSelected={selectedIds.has(wp.id)} isSelectionMode={isSelectionMode}
                      onToggleSelection={(id) => setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      })}
                      onSelect={onSelect} onDelete={onDelete} onDownload={onDownload} onSaveToLibrary={onSaveToLibrary}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SidebarList;
