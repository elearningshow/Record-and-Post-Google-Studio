
export enum SessionStatus {
  Idle = 'Idle',
  Recording = 'Recording',
  Paused = 'Paused',
  Finished = 'Finished'
}

export enum ArticleStyle {
  Professional = 'Professional',
  Casual = 'Casual',
  Technical = 'Technical'
}

export enum ArticleTone {
  Formal = 'Formal',
  Friendly = 'Friendly',
  Direct = 'Direct'
}

export enum ArticleLength {
  Short = 'Short (~300 words)',
  Medium = 'Medium (~600 words)',
  Long = 'Long (~1000 words)'
}

export enum ArticleAudience {
  General = 'General',
  Experts = 'Experts',
  Beginners = 'Beginners'
}

export interface Session {
  id: string;
  title: string;
  location?: string;
  date: string;
  durationSeconds: number;
  transcript: string;
  audioBlob?: Blob; // Using Blob for web compatibility in this demo
  article?: string;
  generatedImageUrl?: string;
  participants: string[];
}

export interface AppSettings {
  modelProvider: 'cloud' | 'local';
  model: string; // Cloud model name (e.g., gemini-2.5-flash)
  localModelId?: string; // Local model ID (e.g., gemma-2b)
  userName: string;
  isOnboardingComplete: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LocalModel {
  id: string;
  name: string;
  family: string;
  size: string;
  description: string;
  status: 'available' | 'downloading' | 'ready';
  progress: number; // 0-100
}

// Colors
export const COLORS = {
  RECORD_PURPLE: '#6A0DAD',
  POST_ORANGE: '#FF6F00',
  BG_GRAY: '#F9FAFB'
};