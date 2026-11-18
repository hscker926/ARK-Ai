import React, { useRef, useState } from 'react';
import {
  Upload,
  Plus,
  Film,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ArrowRight,
  Copy,
  User,
  HardDrive,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VIDEO_TEMPLATES } from '../data/templates';
import { uploadMediaFile } from '../services/dataService';
import type { AppRoute, AspectRatio, StudioProject, VideoTemplate } from '../types/ark';

interface DashboardPageProps {
  onNavigate: (route: AppRoute) => void;
  onOpenProject: (project: StudioProject) => void;
  onUseTemplate: (template: VideoTemplate) => void;
}

export function DashboardPage({
  onNavigate,
  onOpenProject,
  onUseTemplate,
}: DashboardPageProps) {
  const { user, projects, plans, subscription, upsertProject, addMediaAssetLocal } = useAuth();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Untitled Sequence');
  const [newType, setNewType] = useState<'video' | 'photo'>('video');
  const [newAspect, setNewAspect] = useState<AspectRatio>('16:9');
  const [creating, setCreating] = useState(false);

  // AI Tools State
  const [aiMode, setAiMode] = useState<'script' | 'captions' | 'color'>('script');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiOutput, setAiOutput] = useState<string>('');

  const currentPlan = plans.find((p) => p.id === (subscription?.planId || 'starter')) || plans[0];
  const usedGb = ((user?.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
  const limitGb = currentPlan?.storageLimitGb || 5;
  const storagePct = Math.min(100, Math.round(((user?.storageUsedBytes || 0) / (limitGb * 1024 * 1024 * 1024)) * 100));

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        notify('error', 'Unsupported file', 'Please select an MP4, WebM, MOV, PNG, or JPG file.');
        return;
      }

      // Measure duration if video
      let duration = 5;
      if (isVideo) {
        duration = await new Promise<number>((resolve) => {
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.src = URL.createObjectURL(file);
          vid.onloadedmetadata = () => {
            resolve(Math.max(1, Math.round((vid.duration || 5) * 10) / 10));
            URL.revokeObjectURL(vid.src);
          };
          vid.onerror = () => resolve(5);
        });
      }

      const asset = await uploadMediaFile({
        file,
        userId: user.id,
        mediaType: isVideo ? 'video' : 'image',
        durationSeconds: duration,
      });
      addMediaAssetLocal(asset);

      const newProj: StudioProject = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: file.name.replace(/\.[^.]+$/, ''),
        type: 'video',
        aspectRatio: '16:9',
        durationSeconds: duration,
        thumbnailUrl: isImage
          ? asset.objectUrl || '/src/assets/images/template_cinematic_reel_1794986573258.jpg'
          : '/src/assets/images/hero_studio_suite_1794986574048.jpg',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timelineData: {
          clips: [
            {
              id: `clip_${Date.now()}`,
              mediaId: asset.id,
              name: file.name,
              kind: isVideo ? 'video' : 'image',
              srcUrl: asset.objectUrl || '',
              startTime: 0,
              duration,
              sourceDuration: duration,
              trimStart: 0,
              volume: 1,
              muted: false,
              transitionIn: 'none',
              transform: { rotation: 0, flipX: false, flipY: false, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 },
              adjustments: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
            },
          ],
          texts: [],
          audios: [],
        },
      };

      const saved = await upsertProject(newProj);
      notify('success', 'Media uploaded & timeline initialized');
      onOpenProject(saved);
    } catch (err) {
      notify('error', 'Upload failed', err instanceof Error ? err.message : 'Unable to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      const proj: StudioProject = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: newTitle.trim() || 'Untitled Project',
        type: newType,
        aspectRatio: newAspect,
        durationSeconds: newType === 'video' ? 5 : 0,
        thumbnailUrl:
          newType === 'video'
            ? '/src/assets/images/template_cinematic_reel_1794986573258.jpg'
            : '/src/assets/images/template_product_launch_1794986574426.jpg',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timelineData: { clips: [], texts: [], audios: [] },
        photoData:
          newType === 'photo'
            ? {
                imageUrl: '/src/assets/images/template_product_launch_1794986574426.jpg',
                fileName: 'studio-canvas.jpg',
                brightness: 0,
                contrast: 0,
                saturation: 0,
                blur: 0,
                vignette: 0,
                sepia: 0,
                hueRotate: 0,
                filter: 'none',
                rotation: 0,
                flipX: false,
                flipY: false,
                cropAspect: 'free',
                overlayText: '',
                overlayColor: '#FFFFFF',
                overlaySize: 28,
                overlayY: 85,
              }
            : undefined,
      };
      const saved = await upsertProject(proj);
      setNewModalOpen(false);
      onOpenProject(saved);
    } catch (err) {
      notify('error', 'Could not create project', err instanceof Error ? err.message : '');
    } finally {
      setCreating(false);
    }
  };

  const handleRunAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiOutput('');
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: aiMode, prompt: aiPrompt.trim(), durationSeconds: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'AI service returned an error.');
        return;
      }
      if (typeof data.result === 'string') {
        setAiOutput(data.result);
      } else {
        setAiOutput(JSON.stringify(data.result, null, 2));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error calling AI service.');
    } finally {
      setAiLoading(false);
    }
  };

  const recentProjects = projects.slice(0, 4);

  return (
    <AppShell
      currentRoute="dashboard"
      onNavigate={onNavigate}
      breadcrumb="Dashboard"
      headerActions={
        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Top Action Row: Upload Video + Create New Project + My Account */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Upload Video */}
          <div className="lg:col-span-5 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5 flex flex-col justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-white">Upload Video or Media</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Drop an MP4, WebM, MOV, or image to launch straight into the multi-track timeline.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              onChange={handleUploadVideo}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 w-full rounded-lg border border-dashed border-[#7C3AED]/50 bg-[#12101D] hover:bg-[#191529] p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-[#A78BFA] animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-[#A78BFA]" />
              )}
              <span className="text-sm font-medium text-white">
                {uploading ? 'Uploading & building timeline...' : 'Choose Video or Photo File'}
              </span>
              <span className="text-xs text-zinc-400">MP4 · WebM · MOV · PNG · JPG</span>
            </button>
          </div>

          {/* Create New Project Quick Launchers */}
          <div className="lg:col-span-4 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Create New Project</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Start from an empty canvas in Video Editor or Photo Studio.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setNewType('video');
                  setNewModalOpen(true);
                }}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#151520] hover:bg-[#1E1E2E] border border-white/[0.07] text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-white">
                  <Film className="w-4 h-4 text-[#A78BFA]" />
                  New Video Timeline
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('photo-editor')}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#151520] hover:bg-[#1E1E2E] border border-white/[0.07] text-left transition-colors"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-white">
                  <ImageIcon className="w-4 h-4 text-[#A78BFA]" />
                  New Photo Canvas
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* My Account Summary */}
          <div className="lg:col-span-3 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-white">My Account</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="text-xs text-[#A78BFA] hover:text-white transition-colors"
                >
                  Settings
                </button>
              </div>
              <p className="text-sm text-zinc-200 font-medium mt-3 truncate">{user?.fullName}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentPlan?.name || 'Starter'} Plan · {currentPlan?.maxExportResolution || '720p'}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage
                  </span>
                  <span className="font-mono tabular-nums text-zinc-300">
                    {usedGb} / {limitGb} GB
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                  <div
                    className="h-full bg-[#7C3AED] rounded-full transition-all"
                    style={{ width: `${Math.max(4, storagePct)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onNavigate('subscription')}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Manage Plan
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Profile
              </button>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-white">Recent Projects</h2>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-medium text-[#A78BFA] hover:text-white transition-colors"
            >
              View All ({projects.length})
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-8 text-center">
              <p className="text-sm text-zinc-400">
                No projects yet. Upload a clip or choose a template below to begin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onOpenProject(proj)}
                  className="text-left group rounded-xl bg-[#0E0E14] border border-white/[0.08] hover:border-[#7C3AED]/50 overflow-hidden transition-colors"
                >
                  <div className="aspect-video bg-[#151520] overflow-hidden">
                    <SafeImage
                      src={proj.thumbnailUrl}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-medium text-white truncate">{proj.title}</p>
                    <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                      {proj.type === 'video' ? `Video · ${proj.durationSeconds}s` : 'Photo'} · {proj.aspectRatio}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Video Templates */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-white">Video Templates</h2>
            <span className="text-xs text-zinc-400">Click to load into timeline</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VIDEO_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-[#151520]">
                    <SafeImage
                      src={tpl.thumbnailUrl}
                      alt={tpl.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-zinc-400">
                      {tpl.category} · {tpl.aspectRatio} · {tpl.durationSeconds}s
                    </p>
                    <h3 className="text-sm font-semibold text-white mt-1">{tpl.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{tpl.description}</p>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl)}
                    className="w-full py-2 px-3 rounded-lg bg-[#171722] hover:bg-[#7C3AED] border border-white/[0.07] text-xs font-medium text-white transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Tools */}
        <section className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#A78BFA]" />
              <div>
                <h2 className="font-display text-lg font-semibold text-white">AI Production Tools</h2>
                <p className="text-xs text-zinc-400">
                  Generate scripts, timed on-screen captions, and color grading presets.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center p-1 rounded-lg bg-[#07070A] border border-white/[0.08] self-start">
              {(
                [
                  { id: 'script', label: 'Script & Shots' },
                  { id: 'captions', label: 'Auto-Captions' },
                  { id: 'color', label: 'Color Advisor' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAiMode(tab.id);
                    setAiOutput('');
                    setAiError('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    aiMode === tab.id ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleRunAI} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={
                aiMode === 'script'
                  ? 'Describe your video topic (e.g. 20s product launch for matte black headphones)...'
                  : aiMode === 'captions'
                    ? 'Topic or narration summary for timed overlay captions...'
                    : 'Describe scene lighting & mood (e.g. rainy night street with neon reflections)...'
              }
              className="flex-1 rounded-lg bg-[#07070A] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#7C3AED]"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              {aiLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{aiLoading ? 'Generating...' : 'Generate'}</span>
            </button>
          </form>

          {aiError && (
            <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
              {aiError}
            </div>
          )}

          {aiOutput && (
            <div className="mt-4 rounded-lg bg-[#07070A] border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Generated Output</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(aiOutput);
                    notify('info', 'Copied to clipboard');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#A78BFA] hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-xs sm:text-sm text-zinc-200 font-sans leading-relaxed">
                {aiOutput}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* Create New Project Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-md rounded-xl bg-[#111118] border border-white/10 p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-white">Create New Project</h2>
            <div>
              <label htmlFor="proj-title" className="block text-xs text-zinc-400 mb-1.5">
                Project Title
              </label>
              <input
                id="proj-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Studio Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'video' | 'photo')}
                  className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="video">Video Editor</option>
                  <option value="photo">Photo Editor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Aspect Ratio</label>
                <select
                  value={newAspect}
                  onChange={(e) => setNewAspect(e.target.value as AspectRatio)}
                  className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="16:9">16:9 Widescreen</option>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="4:5">4:5 Portrait</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#191924] text-xs font-medium text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white"
              >
                {creating ? 'Creating...' : 'Create & Open'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
