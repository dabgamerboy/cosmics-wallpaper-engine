export interface Wallpaper {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  aspectRatio: AspectRatio;
  model: ModelType | string; // Allow string for Veo models
  type: WallpaperType;
}

export enum WallpaperType {
  Image = 'image',
  Video = 'video',
}

export enum AspectRatio {
  Square = "1:1",
  Portrait = "9:16",
  Landscape = "16:9",
  Wide = "4:3", // Using 4:3 as proxy for standard monitor if needed, but 16:9 is better for wallpaper
}

export enum ModelType {
  Standard = "gemini-2.5-flash-image",
  Pro = "gemini-3-pro-image-preview",
}

export enum ImageSize {
  x1K = "1K",
  x2K = "2K",
  x4K = "4K",
}

export type RandomCategory = 'Any' | 'Anime' | 'Cyberpunk' | 'Earthy' | 'Sci-Fi' | 'Space' | 'Ocean' | 'Cars' | 'Fantasy' | 'Abstract' | 'Cityscape' | 'Surreal';

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
  imageSize: ImageSize;
  type: WallpaperType;
}

// Global augmentation for the AI Studio window object
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}