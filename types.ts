
export type Page = 'dashboard' | 'text' | 'image' | 'audio' | 'video' | 'roadmap' | 'sentiment' | 'analysis' | 'hashing';

export interface Asset {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video';
  content: string; // The text itself, or a data URL for image/audio/video
  prompt?: string; // The prompt that generated this asset
}

export interface Project {
  id:string;
  title: string;
  prompts: {
    text: string;
    image: string;
    tts: string;
    video: string;
  };
  assets: Asset[];
  lastModified: Date;
  lastActivePage?: Page;
}