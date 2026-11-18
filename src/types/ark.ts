export type AppRoute =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'video-editor'
  | 'photo-editor'
  | 'projects'
  | 'subscription'
  | 'profile'
  | 'admin';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  storageUsedBytes: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  audience: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  storageLimitGb: number;
  maxExportResolution: '720p' | '1080p' | '4K';
  aiCreditsMonthly: number;
  watermark: boolean;
  features: string[];
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';
export type FilterPreset = 'none' | 'obsidian' | 'violet-dusk' | 'warm-cinema' | 'vivid' | 'matte-noir';
export type TransitionType = 'none' | 'crossfade' | 'fade-black' | 'slide-left';

export interface ClipTransform {
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
}

export interface ClipAdjustments {
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  saturation: number; // -100 to 100
  filter: FilterPreset;
}

export interface TimelineVideoClip {
  id: string;
  mediaId: string;
  name: string;
  kind: 'video' | 'image';
  srcUrl: string;
  startTime: number; // timeline start in seconds
  duration: number; // clip duration in seconds
  sourceDuration: number; // total source file duration
  trimStart: number; // offset inside source video
  volume: number; // 0 to 1
  muted: boolean;
  transitionIn: TransitionType;
  transform: ClipTransform;
  adjustments: ClipAdjustments;
}

export interface TimelineTextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  xPercent: number; // 0-100
  yPercent: number; // 0-100
  fontSize: number;
  color: string;
  bgColor: string;
  fontWeight: 'medium' | 'bold';
}

export interface TimelineAudioClip {
  id: string;
  mediaId: string;
  name: string;
  srcUrl: string;
  startTime: number;
  duration: number;
  sourceDuration: number;
  trimStart: number;
  volume: number; // 0 to 1
  muted: boolean;
}

export interface VideoTimelineState {
  clips: TimelineVideoClip[];
  texts: TimelineTextOverlay[];
  audios: TimelineAudioClip[];
}

export interface PhotoProjectState {
  imageUrl: string;
  fileName: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  vignette: number;
  sepia: number;
  hueRotate: number;
  filter: FilterPreset;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  cropAspect: 'free' | '1:1' | '4:3' | '16:9' | '9:16';
  overlayText: string;
  overlayColor: string;
  overlaySize: number;
  overlayY: number;
}

export interface StudioProject {
  id: string;
  userId: string;
  title: string;
  type: 'video' | 'photo';
  aspectRatio: AspectRatio;
  durationSeconds: number;
  thumbnailUrl: string;
  status: 'draft' | 'exported' | 'archived';
  timelineData: VideoTimelineState;
  photoData?: PhotoProjectState;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  userId: string;
  projectId?: string;
  bucket: 'media' | 'exports' | 'avatars';
  storagePath: string;
  fileName: string;
  mediaType: 'video' | 'image' | 'audio' | 'export';
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  objectUrl?: string;
  createdAt: string;
}

export interface VideoTemplate {
  id: string;
  title: string;
  category: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  thumbnailUrl: string;
  description: string;
  timelineData: VideoTimelineState;
}

export interface StorageSummary {
  totalBytes: number;
  mediaBytes: number;
  exportsBytes: number;
  avatarsBytes: number;
  assetCount: number;
}
