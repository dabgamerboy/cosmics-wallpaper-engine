

export interface Wallpaper {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  aspectRatio: AspectRatio;
  model: ModelType | string; // Allow string for Veo models
  type: WallpaperType;
  categories: RandomCategory[];
}

export enum WallpaperType {
  image = 'image',
  video = 'video',
}

export enum AspectRatio {
  Square = "1:1",
  Portrait = "9:16",
  Landscape = "16:9",
  Wide = "4:3", 
}

// Added Pro model type for high quality generations
export enum ModelType {
  Standard = "gemini-2.5-flash-image",
  Pro = "gemini-3-pro-image-preview",
}

// Added x4K image size support
export enum ImageSize {
  x1K = "1K",
  x4K = "4K",
}

export type Theme = 'light' | 'dark' | 'cosmic' | 'sunset' | 'forest' | 'cyber' | 'custom';

export interface CustomThemeColors {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  secondary: string;
}

export type RandomCategory = string;

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
  imageSize: ImageSize;
  type: WallpaperType;
  categories: RandomCategory[];
  image?: string;
  maskImage?: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}