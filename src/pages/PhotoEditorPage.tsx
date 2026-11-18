import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  Download,
  Save,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Sliders,
  Type,
  Crop,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadMediaFile } from '../services/dataService';
import type { AppRoute, FilterPreset, PhotoProjectState, StudioProject } from '../types/ark';

interface PhotoEditorPageProps {
  project: StudioProject | null;
  onNavigate: (route: AppRoute) => void;
  onProjectSaved: (project: StudioProject) => void;
}

const DEFAULT_PHOTO_STATE: PhotoProjectState = {
  imageUrl: '/src/assets/images/template_product_launch_1794986574426.jpg',
  fileName: 'studio-canvas.jpg',
  brightness: 0,
  contrast: 8,
  saturation: 4,
  blur: 0,
  vignette: 20,
  sepia: 0,
  hueRotate: 0,
  filter: 'obsidian',
  rotation: 0,
  flipX: false,
  flipY: false,
  cropAspect: 'free',
  overlayText: '',
  overlayColor: '#FFFFFF',
  overlaySize: 32,
  overlayY: 85,
};

export function PhotoEditorPage({ project, onNavigate, onProjectSaved }: PhotoEditorPageProps) {
  const { user, upsertProject, addMediaAssetLocal } = useAuth();
  const { notify } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [projectId] = useState<string>(() => project?.id || crypto.randomUUID());
  const [title, setTitle] = useState<string>(project?.title || 'Untitled Photo Grade');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(0.92);
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop' | 'text'>('adjust');
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<{
    past: PhotoProjectState[];
    present: PhotoProjectState;
    future: PhotoProjectState[];
  }>({
    past: [],
    present: project?.photoData || DEFAULT_PHOTO_STATE,
    future: [],
  });

  const state = history.present;

  const commit = useCallback((next: PhotoProjectState) => {
    setHistory((h) => ({
      past: [...h.past.slice(-24), h.present],
      present: next,
      future: [],
    }));
  }, []);

  const undo = () =>
    setHistory((h) =>
      h.past.length === 0
        ? h
        : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    );

  const redo = () =>
    setHistory((h) =>
      h.future.length === 0
        ? h
        : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rotated90 = state.rotation === 90 || state.rotation === 270;
    const baseW = rotated90 ? img.naturalHeight : img.naturalWidth;
    const baseH = rotated90 ? img.naturalWidth : img.naturalHeight;

    let targetW = baseW;
    let targetH = baseH;
    if (state.cropAspect === '1:1') {
      const s = Math.min(baseW, baseH);
      targetW = s;
      targetH = s;
    } else if (state.cropAspect === '4:3') {
      targetW = Math.min(baseW, Math.round((baseH * 4) / 3));
      targetH = Math.round((targetW * 3) / 4);
    } else if (state.cropAspect === '16:9') {
      targetW = baseW;
      targetH = Math.min(baseH, Math.round((baseW * 9) / 16));
    } else if (state.cropAspect === '9:16') {
      targetH = baseH;
      targetW = Math.min(baseW, Math.round((baseH * 9) / 16));
    }

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.save();

    let preset = '';
    if (state.filter === 'obsidian') preset = 'contrast(1.14) saturate(0.82)';
    if (state.filter === 'violet-dusk') preset = 'hue-rotate(-18deg) saturate(1.2) contrast(1.08)';
    if (state.filter === 'warm-cinema') preset = 'sepia(0.22) contrast(1.1) saturate(1.14)';
    if (state.filter === 'vivid') preset = 'saturate(1.4) contrast(1.12)';
    if (state.filter === 'matte-noir') preset = 'grayscale(1) contrast(1.24)';

    ctx.filter = `brightness(${100 + state.brightness}%) contrast(${100 + state.contrast}%) saturate(${100 + state.saturation}%) blur(${state.blur}px) sepia(${state.sepia}%) hue-rotate(${state.hueRotate}deg) ${preset}`.trim();

    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.flipX ? -1 : 1, state.flipY ? -1 : 1);

    const scale = Math.max(targetW / baseW, targetH / baseH);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if (state.vignette > 0) {
      const grad = ctx.createRadialGradient(
        targetW / 2,
        targetH / 2,
        Math.min(targetW, targetH) * 0.25,
        targetW / 2,
        targetH / 2,
        Math.max(targetW, targetH) * 0.72
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(state.vignette / 100) * 0.85})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    if (state.overlayText.trim()) {
      ctx.save();
      const fontPx = Math.round((state.overlaySize / 600) * targetH);
      ctx.font = `700 ${fontPx}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = state.overlayColor;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 12;
      ctx.fillText(state.overlayText, targetW / 2, (state.overlayY / 100) * targetH);
      ctx.restore();
    }
  }, [state]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = state.imageUrl;
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };
  }, [state.imageUrl, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const asset = await uploadMediaFile({
        file,
        userId: user.id,
        projectId,
        mediaType: 'image',
      });
      addMediaAssetLocal(asset);
      commit({
        ...state,
        imageUrl: asset.objectUrl || URL.createObjectURL(file),
        fileName: file.name,
      });
      notify('success', 'Photo loaded into studio');
    } catch (err) {
      notify('error', 'Failed to load photo', err instanceof Error ? err.message : '');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const saved = await upsertProject({
        id: projectId,
        userId: user.id,
        title: title.trim() || 'Untitled Photo',
        type: 'photo',
        aspectRatio: state.cropAspect === 'free' ? '4:5' : state.cropAspect === '4:3' ? '16:9' : state.cropAspect,
        durationSeconds: 0,
        thumbnailUrl: state.imageUrl,
        status: 'draft',
        timelineData: { clips: [], texts: [], audios: [] },
        photoData: state,
        createdAt: project?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onProjectSaved(saved);
      notify('success', 'Photo project saved');
    } catch (err) {
      notify('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime =
      exportFormat === 'jpeg'
        ? 'image/jpeg'
        : exportFormat === 'webp'
          ? 'image/webp'
          : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        notify('success', `Exported ${exportFormat.toUpperCase()} image`);
      },
      mime,
      exportQuality
    );
  };

  return (
    <AppShell
      currentRoute="photo-editor"
      onNavigate={onNavigate}
      breadcrumb={`Photo Editor · ${title}`}
      compactEditor
      headerActions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Photo project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hidden sm:block w-44 rounded-lg bg-[#111118] border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
          />
          <button
            type="button"
            onClick={undo}
            disabled={history.past.length === 0}
            className="p-2 rounded-lg bg-[#12121A] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={history.future.length === 0}
            className="p-2 rounded-lg bg-[#12121A] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161621] border border-white/10 text-xs font-medium text-zinc-200"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
        {/* Left/Center Photo Canvas */}
        <div className="lg:col-span-8 bg-[#07070A] p-4 sm:p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/[0.08]">
          <div className="w-full max-w-3xl flex items-center justify-between mb-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#14141D] hover:bg-[#1C1C29] border border-white/10 text-xs font-medium text-white"
            >
              <Upload className="w-3.5 h-3.5 text-[#A78BFA]" />
              Upload Photo
            </button>

            <div className="flex items-center gap-2">
              {[
                { label: 'Lens', url: '/src/assets/images/template_product_launch_1794986574426.jpg' },
                { label: 'Street', url: '/src/assets/images/template_cinematic_reel_1794986573258.jpg' },
                { label: 'Studio', url: '/src/assets/images/template_portrait_vlog_1794986574664.jpg' },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => commit({ ...state, imageUrl: s.url, fileName: `${s.label}.jpg` })}
                  className="px-2.5 py-1.5 rounded-md bg-[#12121A] border border-white/[0.07] text-[11px] text-zinc-300 hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-3xl flex-1 flex items-center justify-center rounded-xl bg-[#0C0C11] border border-white/[0.06] p-4 min-h-[320px]">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[62vh] rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>

        {/* Right Controls Inspector */}
        <div className="lg:col-span-4 bg-[#0B0B10] flex flex-col">
          <div className="grid grid-cols-3 border-b border-white/[0.07] bg-[#0E0E14]">
            {(
              [
                { id: 'adjust', label: 'Color & LUT', icon: Sliders },
                { id: 'crop', label: 'Crop & Flip', icon: Crop },
                { id: 'text', label: 'Overlay & Export', icon: Type },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`py-3 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-[#7C3AED] text-white bg-[#14141F]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {activeTab === 'adjust' && (
              <>
                <div>
                  <p className="text-xs font-medium text-zinc-300 mb-2">Filter Presets</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'none', label: 'Original' },
                        { id: 'obsidian', label: 'Obsidian' },
                        { id: 'violet-dusk', label: 'Violet Dusk' },
                        { id: 'warm-cinema', label: 'Warm Film' },
                        { id: 'vivid', label: 'Vivid' },
                        { id: 'matte-noir', label: 'Matte Noir' },
                      ] as Array<{ id: FilterPreset; label: string }>
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => commit({ ...state, filter: f.id })}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border ${
                          state.filter === f.id
                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                            : 'bg-[#14141D] border-white/[0.08] text-zinc-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {[
                  { key: 'brightness', label: 'Brightness', min: -50, max: 50 },
                  { key: 'contrast', label: 'Contrast', min: -50, max: 50 },
                  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
                  { key: 'sepia', label: 'Warm Sepia', min: 0, max: 100 },
                  { key: 'blur', label: 'Soft Blur', min: 0, max: 10 },
                ].map((ctrl) => (
                  <div key={ctrl.key}>
                    <label className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>{ctrl.label}</span>
                      <span className="font-mono text-zinc-200 tabular-nums">
                        {state[ctrl.key as keyof PhotoProjectState] as number}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      value={state[ctrl.key as keyof PhotoProjectState] as number}
                      onChange={(e) =>
                        commit({ ...state, [ctrl.key]: Number(e.target.value) })
                      }
                      className="w-full accent-[#7C3AED]"
                    />
                  </div>
                ))}
              </>
            )}

            {activeTab === 'crop' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-zinc-300 mb-2">Crop Aspect Ratio</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['free', '1:1', '4:3', '16:9', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => commit({ ...state, cropAspect: ratio })}
                        className={`py-2 rounded-lg text-xs font-mono border ${
                          state.cropAspect === ratio
                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                            : 'bg-[#14141D] border-white/[0.08] text-zinc-300'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-300 mb-2">Orientation</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        commit({ ...state, rotation: (((state.rotation + 90) % 360) as 0 | 90 | 180 | 270) })
                      }
                      className="py-2 rounded-lg bg-[#14141D] border border-white/10 text-xs text-zinc-200 flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => commit({ ...state, flipX: !state.flipX })}
                      className={`py-2 rounded-lg border text-xs flex items-center justify-center gap-1.5 ${
                        state.flipX
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                          : 'bg-[#14141D] border-white/10 text-zinc-200'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      Flip H
                    </button>
                    <button
                      type="button"
                      onClick={() => commit({ ...state, flipY: !state.flipY })}
                      className={`py-2 rounded-lg border text-xs flex items-center justify-center gap-1.5 ${
                        state.flipY
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                          : 'bg-[#14141D] border-white/10 text-zinc-200'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      Flip V
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-zinc-300">Typography Watermark / Caption</p>
                  <input
                    type="text"
                    value={state.overlayText}
                    onChange={(e) => commit({ ...state, overlayText: e.target.value })}
                    placeholder="Enter overlay text..."
                    className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400">Size</label>
                      <input
                        type="range"
                        min={16}
                        max={72}
                        value={state.overlaySize}
                        onChange={(e) => commit({ ...state, overlaySize: Number(e.target.value) })}
                        className="w-full accent-[#7C3AED] mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400">Text Color</label>
                      <input
                        type="color"
                        value={state.overlayColor}
                        onChange={(e) => commit({ ...state, overlayColor: e.target.value })}
                        className="w-full h-8 mt-1 rounded bg-[#07070A] border border-white/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <p className="text-xs font-medium text-zinc-300">Export Image Settings</p>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                    className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Compact)</option>
                    <option value="webp">WebP (Modern Web)</option>
                  </select>
                  {exportFormat !== 'png' && (
                    <div>
                      <label className="flex justify-between text-[11px] text-zinc-400">
                        <span>Quality</span>
                        <span className="font-mono">{Math.round(exportQuality * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min={0.5}
                        max={1}
                        step={0.02}
                        value={exportQuality}
                        onChange={(e) => setExportQuality(Number(e.target.value))}
                        className="w-full accent-[#7C3AED]"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download {exportFormat.toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
