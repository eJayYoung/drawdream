// User types
export interface User {
  id: string;
  unionId: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserPhone {
  id: string;
  userId: string;
  phone: string;
  verified: boolean;
}

export interface UserWechat {
  id: string;
  userId: string;
  openid: string;
  unionid: string | null;
}

// Project types
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type ProjectStyle = 'ancient' | 'scifi' | 'modern' | 'fantasy' | 'romance' | 'horror';
export type ProjectStatus = 'draft' | 'creating' | 'completed' | 'published' | 'archived';

export type ImageModel = 'sdxl' | 'sd15' | 'sdxl-turbo' | 'dalle3';
export type VideoModel = 'svd' | 'animatediff' | 'sora' | 'pika';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aspectRatio: AspectRatio;
  style: ProjectStyle;
  imageModel: ImageModel;
  videoModel: VideoModel;
  coverImageUrl?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  aspectRatio: AspectRatio;
  style: ProjectStyle;
  imageModel: ImageModel;
  videoModel: VideoModel;
}

// Script & Episode types
export interface Script {
  id: string;
  projectId: string;
  content: string; // JSON string of script content
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EpisodeStatus = 'pending' | 'in_progress' | 'completed';

export interface Episode {
  id: string;
  projectId: string;
  episodeNumber: number;
  title: string;
  scriptContent: string;
  estimatedDuration: number; // seconds
  status: EpisodeStatus;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// Character types
export type VoiceType = 'male_1' | 'male_2' | 'female_1' | 'female_2' | 'narrator';

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  appearance: string; // Description for image generation
  voiceType: VoiceType;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Storyboard types
export type ShotType = 'extreme_close_up' | 'close_up' | 'medium' | 'full' | 'wide' | 'establishing';
export type StoryboardStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Storyboard {
  id: string;
  episodeId: string;
  sceneNumber: number;
  shotType: ShotType;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  durationFrames: number;
  narration?: string;
  dialogue?: string;
  audioUrl?: string;
  orderIndex: number;
  status: StoryboardStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Generation task types
export type TaskType = 'script' | 'episode_split' | 'character_image' | 'storyboard_image' | 'storyboard_video' | 'audio' | 'composition';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface GenerationTask {
  id: string;
  taskType: TaskType;
  projectId: string;
  episodeId?: string;
  storyboardId?: string;
  workflowId: string;
  comfyuiJobId?: string;
  status: TaskStatus;
  inputParams: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  error?: string;
  progress?: number; // 0-100
  createdAt: Date;
  completedAt?: Date;
}

// Material types
export type MaterialType = 'image' | 'video' | 'audio';

export interface Material {
  id: string;
  userId: string;
  filename: string;
  url: string;
  type: MaterialType;
  size: number; // bytes
  width?: number;
  height?: number;
  duration?: number; // seconds for audio/video
  createdAt: Date;
}

// Workflow types
export interface WorkflowTemplate {
  id: string;
  name: string;
  type: TaskType;
  config: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

// ComfyUI types
export interface ComfyUIWorkflow {
  nodes: ComfyUINode[];
  edges: [string, string, string][];
}

export interface ComfyUINode {
  id: string;
  type: string;
  inputs?: Record<string, unknown>;
  outputs?: unknown[];
  widgets?: Record<string, unknown>;
}

export interface ComfyUIJobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  outputs?: Record<string, unknown>;
  error?: string;
}
