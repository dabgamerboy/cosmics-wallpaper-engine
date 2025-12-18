
import React, { useState, useMemo, useEffect } from 'react';
import { Wallpaper, AspectRatio, WallpaperType } from '../types';
import { Trash2, Film, Image as ImageIcon, Download, ChevronRight, ChevronDown, CheckSquare, Square, Bookmark, BookmarkCheck, X, Check, Trash } from 'lucide-react';

interface SidebarListProps {
  title: string;
  icon: React.ReactNode;
  items: Wallpaper[];
  libraryItems?: Wallpaper[]; // Needed to check if history item is already in library
  onSelect: (wallpaper: Wallpaper) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  onDownload: (wp: Wallpaper) => void;
  onSaveToLibrary?: (wp: Wallpaper) => void;
  onSaveBulkToLibrary?: (ids: string[]) => void;
  isOpen: boolean;
  categorized?: boolean;
  emptyMessage?: string;
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
      className={`group relative bg-black/40 rounded-lg overflow-hidden border transition-all cursor-pointer 
        ${isDeleting ? 'animate-dust-blow pointer-events-none' : 'hover:scale-[1.02]'} 
        ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-white/5 hover:border-white/20'}`}
      onClick={handleClick}
    >
      <div className={`w-full ${wp.aspectRatio === AspectRatio.Portrait ? 'h-40' : 'h-24'} overflow-hidden relative`}>
         {wp.type === WallpaperType.video ? (
            <video src={wp.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
         ) : (
            <img src={wp.url} alt={wp.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
         )}
         
         {/* Status Indicators */}
         <div className="absolute top-2 right-2 flex flex-col gap-1">
            {wp.type === WallpaperType.video && (
                <div className="bg-black/60 backdrop-blur-sm p-1 rounded-full text-white">
                    <Film size={10} />
                </div>
            )}
            {isSaved && (
                <div className="bg-primary/80 backdrop-blur-sm p-1 rounded-full text-white">
                    <Bookmark size={10} fill="currentColor" />
                </div>
            )}
         </div>

         {/* Selection Checkbox */}
         {isSelectionMode && (
           <div className="absolute top-2 left-2 z-20">
             {isSelected ? (
               <div className="bg-primary text-white rounded p-0.5 shadow-lg"><Check size={14} strokeWidth={4} /></div>
             ) : (
               <div className="bg-black/40 border border-white/30 text-white rounded p-0.5 backdrop-blur-sm"><Square size={14} /></div>
             )}
           </div>
         )}
      </div>

      <div className="p-2">
        <p className="text-[10px] text-gray-200 line-clamp-1 font-medium">{wp.prompt}</p>
      </div>

      {/* Item Actions (Hidden in Selection Mode) */}
      {!isSelectionMode && (
        <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDownloadClick} className="p-1.5 bg-surface/80 hover:bg-white text-black rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" title="Download">
            <Download size={12} />
          </button>
          {onSaveToLibrary && !isSaved && (
            <button onClick={handleSaveClick} className="p-1.5 bg-primary/80 hover:bg-primary text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" title="Save to Library">
              <Bookmark size={12} />
            </button>
          )}
          <button onClick={handleDelete} className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110 active:scale-95" title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

const SidebarList: React.FC<SidebarListProps> = ({ 
  title, icon, items, libraryItems = [], onSelect, onDelete, onDeleteBulk, onDownload, onSaveToLibrary, onSaveBulkToLibrary, isOpen, categorized = false, emptyMessage = "No items found." 
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when closing sidebar or switching mode
  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const groupedItems = useMemo(() => {
    if (!categorized) return { 'All': items };
    const groups: Record<string, Wallpaper[]> = {};
    items.forEach(item => {
      const cat = item.categories && item.categories.length > 0 
        ? item.categories.length > 1 ? 'Mashups' : item.categories[0]
        : 'Custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items, categorized]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} items?`)) {
      onDeleteBulk(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleBatchSave = () => {
    if (!onSaveBulkToLibrary || selectedIds.size === 0) return;
    onSaveBulkToLibrary(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
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
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">{icon}{title}</h2>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  className={`p-1.5 rounded-lg transition-colors ${isSelectionMode ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  title="Multi-select"
                >
                  <CheckSquare size={18} />
                </button>
            </div>
          </div>
          
          {isSelectionMode && (
             <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                <button onClick={handleSelectAll} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors">
                  {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
                </button>
                <div className="flex-1"></div>
                {onSaveBulkToLibrary && (
                  <button 
                    onClick={handleBatchSave}
                    disabled={selectedIds.size === 0}
                    className="p-1.5 text-primary disabled:opacity-30 disabled:grayscale transition-all hover:scale-110"
                    title="Save selected to library"
                  >
                    <BookmarkCheck size={18} />
                  </button>
                )}
                <button 
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  className="p-1.5 text-red-400 disabled:opacity-30 disabled:grayscale transition-all hover:scale-110"
                  title="Delete selected"
                >
                  <Trash size={18} />
                </button>
                <button onClick={() => setIsSelectionMode(false)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([cat, val]) => {
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
                      <SidebarItem 
                        key={wp.id} 
                        wp={wp} 
                        isSaved={libraryItems.some(lib => lib.id === wp.id)}
                        isSelected={selectedIds.has(wp.id)}
                        isSelectionMode={isSelectionMode}
                        onToggleSelection={toggleItemSelection}
                        onSelect={onSelect} 
                        onDelete={onDelete} 
                        onDownload={onDownload}
                        onSaveToLibrary={onSaveToLibrary}
                      />
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
