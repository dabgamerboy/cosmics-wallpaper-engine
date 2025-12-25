
import React from 'react';
import { X, Wand2, Sparkles, Image as ImageIcon, Film, Bookmark, Palette, Zap, Key, Info, MousePointer2, Layers } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      icon: <Wand2 className="text-primary" size={24} />,
      title: "Generating Magic",
      content: "Enter a description in the bottom bar and hit 'Generate'. Use the dice icon to roll for a random prompt based on your selected categories. You can mix multiple categories (e.g., 'Space' + 'Anime') for unique results."
    },
    {
      icon: <ImageIcon className="text-secondary" size={24} />,
      title: "Still vs. Video",
      content: "Choose 'Still' for high-resolution images. 'Flash' is near-instant, while 'Pro' uses advanced reasoning for complex prompts. Choose 'Animate' to create a cinematic 1080p video loop (VEO) from scratch or from an uploaded image."
    },
    {
      icon: <Sparkles className="text-yellow-500" size={24} />,
      title: "AI Magic Tools",
      content: (
        <ul className="list-disc list-inside space-y-1 opacity-80">
          <li><strong>Object Removal:</strong> Describe an item to erase it from the scene.</li>
          <li><strong>Style Transfer:</strong> Apply a new aesthetic (e.g., 'Cyberpunk') to your current wallpaper.</li>
          <li><strong>Pro Upscale:</strong> Re-renders the image at 4K resolution using Gemini Pro.</li>
          <li><strong>Animate Loop:</strong> Turns your generated still image into a living video.</li>
        </ul>
      )
    },
    {
      icon: <Layers className="text-blue-500" size={24} />,
      title: "Library & History",
      content: "Everything you generate is saved in 'History'. Use the 'Save' button to move favorites to your permanent 'Library'. Use the multi-select tool (checkbox icon) in the sidebars to bulk-delete or bulk-save items."
    },
    {
      icon: <Palette className="text-purple-500" size={24} />,
      title: "Themes & Visuals",
      content: "Switch between light, dark, and specialized themes like 'Cyber' or 'Cosmic'. Select 'Custom' to build your own palette with the color pickers. You can also disable subtle UI animations in the settings for a more static experience."
    },
    {
      icon: <Key className="text-green-500" size={24} />,
      title: "Pro Mode (API Keys)",
      content: "High-quality 'Pro' images and all Video generations require a paid API key. Click the 'Key' icon in settings to connect your Google Cloud project. Backups can be exported and imported as JSON files."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Info className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">COSMIC GUIDE</h2>
              <p className="text-xs text-muted uppercase tracking-widest font-bold">Master the Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {sections.map((section, idx) => (
              <div key={idx} className="flex gap-4 group">
                <div className="shrink-0 mt-1 transition-transform group-hover:scale-110 duration-300">
                  {section.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {section.title}
                  </h3>
                  <div className="text-sm leading-relaxed text-muted font-medium">
                    {section.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
            <h4 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <MousePointer2 size={16} /> Pro Tip: High Performance
            </h4>
            <p className="text-sm text-muted leading-relaxed">
              When using the <strong>Edit AI</strong> tool, try to be specific. Instead of saying "change it", say "add a neon purple glow to the horizon" or "replace the trees with futuristic skyscrapers". The more descriptive your instructions, the better the result.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-background/50 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            Got it, Let's Create!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
