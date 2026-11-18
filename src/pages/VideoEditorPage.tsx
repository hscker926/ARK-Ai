import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Undo2,
  Redo2,
  Download,
  Save,
  Upload,
  Plus,
  Type,
  Music,
  Sliders,
  Crop,
  Film,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportTimelineVideo } from '../lib/ffmpegEngine';
import { uploadMediaFile } from '../services/dataService';
import type {
  AppRoute,
  AspectRatio,
  FilterPreset,
  MediaAsset,
  StudioProject,
  TimelineAudioClip,
  TimelineTextOverlay,
  TimelineVideoClip,
  TransitionType,
  VideoTimelineState,
} from '../types/ark';

interface VideoEditorPageProps {
  project: StudioProject | null;
  onNavigate: (route: AppRoute) => void;
  onProjectSaved: (project: StudioProject) => void;
}

type LeftTab = 'media' | 'text' | 'audio' | 'ai';
type RightTab = 'adjust' | 'crop' | 'export';

const SAMPLE_MEDIA = [
  {
    id: 'sample_nocturne',
    name: 'Nocturne Rain Street.jpg',
    kind: 'image' as const,
    url: '/src/assets/images/template_cinematic_reel_1794986573258.jpg',
  },
  {
    id: 'sample_hardware',
    name: 'Master Prime Lens.jpg',
    kind: 'image' as const,
    url: '/src/assets/images/template_product_launch_1794986574426.jpg',
  },
  {
    id: 'sample_filmmaker',
    name: 'Soundstage Rig.jpg',
    kind: 'image' as const,
    url: '/src/assets/images/template_portrait_vlog_1794986574664.jpg',
  },
  {
    id: 'sample_workstation',
    name: 'Grading Desk.jpg',
    kind: 'image' as const,
    url: '/src/assets/images/hero_studio_suite_1794986574048.jpg',
  },
];

function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function getPreviewDimensions(aspectRatio: AspectRatio): { w: number; h: number } {
  switch (aspectRatio) {
    case '9:16':
      return { w: 405, h: 720 };
    case '1:1':
      return { w: 540, h: 540 };
    case '4:5':
      return { w: 480, h: 600 };
    case '16:9':
    default:
      return { w: 800, h: 450 };
  }
}

function createSynthToneWavBlob(durationSec = 6, freq = 196): Blob {
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 2) * Math.min(1, (durationSec - t) * 2);
    const sample =
      (Math.sin(2 * Math.PI * freq * t) * 0.45 +
        Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.25) *
      env;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 16000, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function VideoEditorPage({ project, onNavigate, onProjectSaved }: VideoEditorPageProps) {
  const { user, mediaAssets, upsertProject, addMediaAssetLocal } = useAuth();
  const { notify } = useToast();

  // Active Project Metadata
  const [projectId] = useState<string>(() => project?.id || crypto.randomUUID());
  const [title, setTitle] = useState<string>(project?.title || 'Untitled Video Cut');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project?.aspectRatio || '16:9');

  // Undo / Redo History for Timeline State
  const initialTimeline: VideoTimelineState = useMemo(
    () =>
      project?.timelineData?.clips
        ? project.timelineData
        : {
            clips: [
              {
                id: 'clip_init_1',
                mediaId: 'sample_nocturne',
                name: 'Nocturne Rain Street.jpg',
                kind: 'image',
                srcUrl: '/src/assets/images/template_cinematic_reel_1794986573258.jpg',
                startTime: 0,
                duration: 5,
                sourceDuration: 5,
                trimStart: 0,
                volume: 1,
                muted: false,
                transitionIn: 'fade-black',
                transform: { rotation: 0, flipX: false, flipY: false, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 },
                adjustments: { brightness: 0, contrast: 6, saturation: 8, filter: 'violet-dusk' },
              },
            ],
            texts: [
              {
                id: 'txt_init_1',
                text: 'ARK AI STUDIO',
                startTime: 0.5,
                duration: 3.5,
                xPercent: 50,
                yPercent: 82,
                fontSize: 32,
                color: '#FFFFFF',
                bgColor: 'rgba(124, 58, 237, 0.78)',
                fontWeight: 'bold',
              },
            ],
            audios: [],
          },
    [project]
  );

  const [history, setHistory] = useState<{
    past: VideoTimelineState[];
    present: VideoTimelineState;
    future: VideoTimelineState[];
  }>({
    past: [],
    present: initialTimeline,
    future: [],
  });

  const timeline = history.present;

  const commitTimeline = useCallback((next: VideoTimelineState) => {
    setHistory((h) => ({
      past: [...h.past.slice(-29), h.present],
      present: next,
      future: [],
    }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  // Keyboard shortcuts for Undo / Redo / Spacebar Play-Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Selection & Panels
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    initialTimeline.clips[0]?.id || null
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>('media');
  const [rightTab, setRightTab] = useState<RightTab>('adjust');

  // Playback & Timeline Zoom
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [pxPerSec, setPxPerSec] = useState(52);

  // Total Duration
  const totalDuration = useMemo(() => {
    const maxClip = timeline.clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
    const maxText = timeline.texts.reduce((m, t) => Math.max(m, t.startTime + t.duration), 0);
    const maxAudio = timeline.audios.reduce((m, a) => Math.max(m, a.startTime + a.duration), 0);
    return Math.max(5, maxClip, maxText, maxAudio);
  }, [timeline]);

  // Media Refs for Canvas Compositor
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaCacheRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);

  // Text Draft State
  const [newTextValue, setNewTextValue] = useState('NEW SCENE TITLE');

  // AI Caption Helper State
  const [aiCaptionPrompt, setAiCaptionPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Export State
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Preload media elements whenever timeline clips change
  useEffect(() => {
    for (const clip of timeline.clips) {
      if (!clip.srcUrl) continue;
      const existing = mediaCacheRef.current.get(clip.srcUrl);
      if (!existing) {
        if (clip.kind === 'video') {
          const vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.src = clip.srcUrl;
          vid.playsInline = true;
          vid.preload = 'auto';
          mediaCacheRef.current.set(clip.srcUrl, vid);
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.srcUrl;
          mediaCacheRef.current.set(clip.srcUrl, img);
        }
      }
    }
    for (const aud of timeline.audios) {
      if (!aud.srcUrl) continue;
      if (!audioCacheRef.current.has(aud.srcUrl)) {
        const el = new Audio();
        el.crossOrigin = 'anonymous';
        el.src = aud.srcUrl;
        audioCacheRef.current.set(aud.srcUrl, el);
      }
    }
  }, [timeline]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      // Pause all audio & video elements when stopped
      mediaCacheRef.current.forEach((el) => {
        if (el instanceof HTMLVideoElement && !el.paused) el.pause();
      });
      audioCacheRef.current.forEach((el) => {
        if (!el.paused) el.pause();
      });
      return;
    }

    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  // Canvas Frame Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = getPreviewDimensions(aspectRatio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.fillStyle = '#07070A';
    ctx.fillRect(0, 0, w, h);

    const activeClip = timeline.clips.find(
      (c) => currentTime >= c.startTime && currentTime <= c.startTime + c.duration
    );

    if (activeClip) {
      const el = mediaCacheRef.current.get(activeClip.srcUrl);
      if (el instanceof HTMLVideoElement) {
        el.muted = activeClip.muted;
        el.volume = activeClip.volume;
        const targetTime = activeClip.trimStart + (currentTime - activeClip.startTime);
        if (isPlaying) {
          if (el.paused) {
            el.currentTime = Math.min(el.duration || targetTime, targetTime);
            el.play().catch(() => {});
          } else if (Math.abs(el.currentTime - targetTime) > 0.35) {
            el.currentTime = Math.min(el.duration || targetTime, targetTime);
          }
        } else if (Math.abs(el.currentTime - targetTime) > 0.05) {
          el.currentTime = Math.min(el.duration || targetTime, targetTime);
        }
      }

      const drawFrame = () => {
        if (!el) return;
        ctx.save();
        const elapsed = currentTime - activeClip.startTime;
        const transDur = Math.min(0.6, activeClip.duration * 0.35);
        if (activeClip.transitionIn === 'crossfade' && elapsed < transDur) {
          ctx.globalAlpha = Math.max(0.05, elapsed / transDur);
        } else if (activeClip.transitionIn === 'fade-black' && elapsed < transDur) {
          ctx.globalAlpha = Math.max(0, elapsed / transDur);
        } else if (activeClip.transitionIn === 'slide-left' && elapsed < transDur) {
          ctx.translate(-((1 - elapsed / transDur) * w * 0.35), 0);
        }

        const adj = activeClip.adjustments;
        let preset = '';
        if (adj.filter === 'obsidian') preset = 'contrast(1.15) saturate(0.8)';
        if (adj.filter === 'violet-dusk') preset = 'hue-rotate(-18deg) saturate(1.2) contrast(1.08)';
        if (adj.filter === 'warm-cinema') preset = 'sepia(0.22) contrast(1.1) saturate(1.15)';
        if (adj.filter === 'vivid') preset = 'saturate(1.4) contrast(1.12)';
        if (adj.filter === 'matte-noir') preset = 'grayscale(1) contrast(1.25)';

        ctx.filter = `brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturation}%) ${preset}`.trim();

        ctx.translate(w / 2, h / 2);
        ctx.rotate((activeClip.transform.rotation * Math.PI) / 180);
        ctx.scale(activeClip.transform.flipX ? -1 : 1, activeClip.transform.flipY ? -1 : 1);

        const mw = el instanceof HTMLVideoElement ? el.videoWidth || w : el.naturalWidth || w;
        const mh = el instanceof HTMLVideoElement ? el.videoHeight || h : el.naturalHeight || h;

        const cropL = (activeClip.transform.cropLeft / 100) * mw;
        const cropR = (activeClip.transform.cropRight / 100) * mw;
        const cropT = (activeClip.transform.cropTop / 100) * mh;
        const cropB = (activeClip.transform.cropBottom / 100) * mh;
        const sw = Math.max(10, mw - cropL - cropR);
        const sh = Math.max(10, mh - cropT - cropB);

        const scale = Math.max(w / sw, h / sh);
        const dw = sw * scale;
        const dh = sh * scale;

        if ((el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) || (el instanceof HTMLVideoElement && el.readyState >= 2)) {
          ctx.drawImage(el, cropL, cropT, sw, sh, -dw / 2, -dh / 2, dw, dh);
        }
        ctx.restore();
      };

      drawFrame();
    } else {
      ctx.fillStyle = '#52525B';
      ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No clip at playhead — Add media or scrub timeline', w / 2, h / 2);
    }

    // Audio Track synchronization during playback
    for (const aud of timeline.audios) {
      const aEl = audioCacheRef.current.get(aud.srcUrl);
      if (!aEl) continue;
      aEl.muted = aud.muted;
      aEl.volume = aud.volume;
      const inRange = currentTime >= aud.startTime && currentTime <= aud.startTime + aud.duration;
      if (isPlaying && inRange) {
        const target = aud.trimStart + (currentTime - aud.startTime);
        if (aEl.paused) {
          aEl.currentTime = target;
          aEl.play().catch(() => {});
        }
      } else if (!aEl.paused) {
        aEl.pause();
      }
    }

    // Text Overlays
    const activeTexts = timeline.texts.filter(
      (txt) => currentTime >= txt.startTime && currentTime <= txt.startTime + txt.duration
    );
    for (const txt of activeTexts) {
      ctx.save();
      const scaledFont = Math.round((txt.fontSize / 450) * h);
      ctx.font = `${txt.fontWeight === 'bold' ? '700' : '500'} ${scaledFont}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = (txt.xPercent / 100) * w;
      const ty = (txt.yPercent / 100) * h;
      const metrics = ctx.measureText(txt.text);
      const padX = scaledFont * 0.55;
      const padY = scaledFont * 0.3;
      if (txt.bgColor && txt.bgColor !== 'transparent') {
        ctx.fillStyle = txt.bgColor;
        ctx.beginPath();
        ctx.roundRect(
          tx - metrics.width / 2 - padX,
          ty - scaledFont / 2 - padY,
          metrics.width + padX * 2,
          scaledFont + padY * 2,
          8
        );
        ctx.fill();
      }
      ctx.fillStyle = txt.color;
      ctx.fillText(txt.text, tx, ty);
      ctx.restore();
    }
  }, [timeline, currentTime, aspectRatio, isPlaying]);

  const selectedClip = timeline.clips.find((c) => c.id === selectedClipId) || null;
  const selectedText = timeline.texts.find((t) => t.id === selectedTextId) || null;
  const selectedAudio = timeline.audios.find((a) => a.id === selectedAudioId) || null;

  const updateSelectedClip = (updater: (clip: TimelineVideoClip) => TimelineVideoClip) => {
    if (!selectedClip) return;
    commitTimeline({
      ...timeline,
      clips: timeline.clips.map((c) => (c.id === selectedClip.id ? updater(c) : c)),
    });
  };

  const updateSelectedText = (updater: (txt: TimelineTextOverlay) => TimelineTextOverlay) => {
    if (!selectedText) return;
    commitTimeline({
      ...timeline,
      texts: timeline.texts.map((t) => (t.id === selectedText.id ? updater(t) : t)),
    });
  };

  const updateSelectedAudio = (updater: (aud: TimelineAudioClip) => TimelineAudioClip) => {
    if (!selectedAudio) return;
    commitTimeline({
      ...timeline,
      audios: timeline.audios.map((a) => (a.id === selectedAudio.id ? updater(a) : a)),
    });
  };

  const appendClipToTimeline = (params: {
    mediaId: string;
    name: string;
    kind: 'video' | 'image';
    srcUrl: string;
    duration: number;
  }) => {
    const endTime = timeline.clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
    const clip: TimelineVideoClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      mediaId: params.mediaId,
      name: params.name,
      kind: params.kind,
      srcUrl: params.srcUrl,
      startTime: endTime,
      duration: params.duration,
      sourceDuration: params.duration,
      trimStart: 0,
      volume: 1,
      muted: false,
      transitionIn: 'none',
      transform: { rotation: 0, flipX: false, flipY: false, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 },
      adjustments: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
    };
    commitTimeline({ ...timeline, clips: [...timeline.clips, clip] });
    setSelectedClipId(clip.id);
    setSelectedTextId(null);
    setSelectedAudioId(null);
    notify('success', `Added ${params.name} to timeline`);
  };

  const handleUploadVisualMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      notify('error', 'Unsupported file', 'Choose an MP4, WebM, MOV, PNG, or JPG file.');
      return;
    }

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

    try {
      const asset = await uploadMediaFile({
        file,
        userId: user.id,
        projectId,
        mediaType: isVideo ? 'video' : 'image',
        durationSeconds: duration,
      });
      addMediaAssetLocal(asset);
      appendClipToTimeline({
        mediaId: asset.id,
        name: file.name,
        kind: isVideo ? 'video' : 'image',
        srcUrl: asset.objectUrl || '',
        duration,
      });
    } catch (err) {
      notify('error', 'Upload error', err instanceof Error ? err.message : '');
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const duration = await new Promise<number>((resolve) => {
      const aud = document.createElement('audio');
      aud.preload = 'metadata';
      aud.src = URL.createObjectURL(file);
      aud.onloadedmetadata = () => {
        resolve(Math.max(2, Math.round((aud.duration || 8) * 10) / 10));
        URL.revokeObjectURL(aud.src);
      };
      aud.onerror = () => resolve(8);
    });

    try {
      const asset = await uploadMediaFile({
        file,
        userId: user.id,
        projectId,
        mediaType: 'audio',
        durationSeconds: duration,
      });
      addMediaAssetLocal(asset);
      const endAudio = timeline.audios.reduce((m, a) => Math.max(m, a.startTime + a.duration), 0);
      const audClip: TimelineAudioClip = {
        id: `aud_${Date.now()}`,
        mediaId: asset.id,
        name: file.name,
        srcUrl: asset.objectUrl || '',
        startTime: endAudio,
        duration,
        sourceDuration: duration,
        trimStart: 0,
        volume: 0.85,
        muted: false,
      };
      commitTimeline({ ...timeline, audios: [...timeline.audios, audClip] });
      setSelectedAudioId(audClip.id);
      setSelectedClipId(null);
      setSelectedTextId(null);
      notify('success', `Added audio track: ${file.name}`);
    } catch (err) {
      notify('error', 'Audio upload error', err instanceof Error ? err.message : '');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddSynthAudio = () => {
    const blob = createSynthToneWavBlob(6, 174);
    const url = URL.createObjectURL(blob);
    const endAudio = timeline.audios.reduce((m, a) => Math.max(m, a.startTime + a.duration), 0);
    const audClip: TimelineAudioClip = {
      id: `aud_synth_${Date.now()}`,
      mediaId: 'synth_pad',
      name: 'Studio Ambient Pad.wav',
      srcUrl: url,
      startTime: endAudio,
      duration: 6,
      sourceDuration: 6,
      trimStart: 0,
      volume: 0.65,
      muted: false,
    };
    commitTimeline({ ...timeline, audios: [...timeline.audios, audClip] });
    setSelectedAudioId(audClip.id);
    setSelectedClipId(null);
    setSelectedTextId(null);
    notify('success', 'Added Studio Ambient Pad audio');
  };

  const handleAddTextOverlay = () => {
    const txt: TimelineTextOverlay = {
      id: `txt_${Date.now()}`,
      text: newTextValue.trim() || 'TITLE TEXT',
      startTime: Math.min(currentTime, Math.max(0, totalDuration - 1)),
      duration: 3,
      xPercent: 50,
      yPercent: 80,
      fontSize: 32,
      color: '#FFFFFF',
      bgColor: 'rgba(124, 58, 237, 0.78)',
      fontWeight: 'bold',
    };
    commitTimeline({ ...timeline, texts: [...timeline.texts, txt] });
    setSelectedTextId(txt.id);
    setSelectedClipId(null);
    setSelectedAudioId(null);
  };

  const handleSplitAtPlayhead = () => {
    const clip = timeline.clips.find(
      (c) => currentTime > c.startTime + 0.15 && currentTime < c.startTime + c.duration - 0.15
    );
    if (!clip) {
      notify('info', 'Move playhead inside a clip to split it');
      return;
    }
    const splitOffset = Math.round((currentTime - clip.startTime) * 100) / 100;
    const firstHalf: TimelineVideoClip = {
      ...clip,
      duration: splitOffset,
    };
    const secondHalf: TimelineVideoClip = {
      ...clip,
      id: `clip_${Date.now()}_split`,
      name: `${clip.name} (Part 2)`,
      startTime: clip.startTime + splitOffset,
      duration: Math.round((clip.duration - splitOffset) * 100) / 100,
      trimStart: clip.trimStart + splitOffset,
      transitionIn: 'none',
    };
    const nextClips = timeline.clips.flatMap((c) => (c.id === clip.id ? [firstHalf, secondHalf] : [c]));
    commitTimeline({ ...timeline, clips: nextClips });
    setSelectedClipId(secondHalf.id);
    notify('success', 'Split clip at playhead');
  };

  const handleDeleteSelected = () => {
    if (selectedClip) {
      commitTimeline({
        ...timeline,
        clips: timeline.clips.filter((c) => c.id !== selectedClip.id),
      });
      setSelectedClipId(null);
    } else if (selectedText) {
      commitTimeline({
        ...timeline,
        texts: timeline.texts.filter((t) => t.id !== selectedText.id),
      });
      setSelectedTextId(null);
    } else if (selectedAudio) {
      commitTimeline({
        ...timeline,
        audios: timeline.audios.filter((a) => a.id !== selectedAudio.id),
      });
      setSelectedAudioId(null);
    }
  };

  const handleGenerateAICaptions = async () => {
    if (!aiCaptionPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'captions',
          prompt: aiCaptionPrompt.trim(),
          durationSeconds: Math.round(totalDuration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI caption request failed');
      const items = Array.isArray(data.result) ? data.result : [];
      if (items.length === 0) throw new Error('No caption segments returned');
      const newTexts: TimelineTextOverlay[] = items.map((item: { text: string; startTime: number; duration: number }, idx: number) => ({
        id: `txt_ai_${Date.now()}_${idx}`,
        text: String(item.text || ''),
        startTime: Number(item.startTime || 0),
        duration: Math.max(1, Number(item.duration || 2.5)),
        xPercent: 50,
        yPercent: 84,
        fontSize: 28,
        color: '#FFFFFF',
        bgColor: 'rgba(13, 13, 18, 0.85)',
        fontWeight: 'bold',
      }));
      commitTimeline({ ...timeline, texts: [...timeline.texts, ...newTexts] });
      notify('success', `Added ${newTexts.length} AI caption blocks to timeline`);
      setAiCaptionPrompt('');
    } catch (err) {
      notify('error', 'AI Captions unavailable', err instanceof Error ? err.message : '');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!user) return;
    setSavingProject(true);
    try {
      const firstThumb =
        timeline.clips.find((c) => c.kind === 'image')?.srcUrl ||
        project?.thumbnailUrl ||
        '/src/assets/images/template_cinematic_reel_1794986573258.jpg';
      const saved = await upsertProject({
        id: projectId,
        userId: user.id,
        title: title.trim() || 'Untitled Video',
        type: 'video',
        aspectRatio,
        durationSeconds: Math.round(totalDuration * 10) / 10,
        thumbnailUrl: firstThumb,
        status: 'draft',
        timelineData: timeline,
        createdAt: project?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onProjectSaved(saved);
      notify('success', 'Project saved');
    } catch (err) {
      notify('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSavingProject(false);
    }
  };

  const handleExportVideo = async () => {
    if (timeline.clips.length === 0) {
      notify('error', 'Timeline is empty', 'Add at least one video or image clip before exporting.');
      return;
    }
    setIsPlaying(false);
    setExporting(true);
    setExportProgress(2);
    setExportStage('Starting export pipeline...');

    try {
      const result = await exportTimelineVideo({
        format: exportFormat,
        resolution: exportRes,
        fps: exportFps,
        aspectRatio,
        timeline,
        totalDuration,
        onProgress: (pct, stage) => {
          setExportProgress(pct);
          setExportStage(stage);
        },
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      if (user) {
        const exportFile = new File([result.blob], result.fileName, { type: result.blob.type });
        const asset = await uploadMediaFile({
          file: exportFile,
          userId: user.id,
          projectId,
          bucket: 'exports',
          mediaType: 'export',
          durationSeconds: totalDuration,
        });
        addMediaAssetLocal(asset);
        await upsertProject({
          id: projectId,
          userId: user.id,
          title: title.trim() || 'Untitled Video',
          type: 'video',
          aspectRatio,
          durationSeconds: Math.round(totalDuration * 10) / 10,
          thumbnailUrl:
            timeline.clips.find((c) => c.kind === 'image')?.srcUrl ||
            '/src/assets/images/template_cinematic_reel_1794986573258.jpg',
          status: 'exported',
          timelineData: timeline,
          createdAt: project?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      notify(
        'success',
        'Video exported successfully',
        result.engine === 'ffmpeg-wasm' ? 'Rendered via FFmpeg.wasm' : 'Rendered via Browser WebM Encoder'
      );
    } catch (err) {
      notify('error', 'Export failed', err instanceof Error ? err.message : 'Unable to render timeline');
    } finally {
      setExporting(false);
    }
  };

  const userVisualMedia: MediaAsset[] = mediaAssets.filter(
    (m) => m.mediaType === 'video' || m.mediaType === 'image'
  );
  const userAudioMedia: MediaAsset[] = mediaAssets.filter((m) => m.mediaType === 'audio');

  return (
    <AppShell
      currentRoute="video-editor"
      onNavigate={onNavigate}
      breadcrumb={`Video Editor · ${title}`}
      compactEditor
      headerActions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hidden sm:block w-44 rounded-lg bg-[#111118] border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
          />
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg bg-[#12121A] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="p-2 rounded-lg bg-[#12121A] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSaveProject}
            disabled={savingProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161621] hover:bg-[#1E1E2D] border border-white/10 text-xs font-medium text-zinc-200 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{savingProject ? 'Saving...' : 'Save'}</span>
          </button>
          <button
            type="button"
            onClick={() => setRightTab('export')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
        {/* Upper Studio Workspace (3 Columns on Desktop, Stacked/Tabbed on Mobile & Tablet) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 border-b border-white/[0.08] overflow-y-auto lg:overflow-hidden">
          {/* LEFT PANEL: Media Library / Text / Audio / AI */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0B0B10] flex flex-col min-h-[260px] lg:min-h-0">
            <div className="grid grid-cols-4 border-b border-white/[0.07] bg-[#0E0E14]">
              {(
                [
                  { id: 'media', label: 'Media', icon: Film },
                  { id: 'text', label: 'Text', icon: Type },
                  { id: 'audio', label: 'Audio', icon: Music },
                  { id: 'ai', label: 'AI', icon: Sparkles },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = leftTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLeftTab(tab.id)}
                    className={`py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium border-b-2 transition-colors ${
                      active
                        ? 'border-[#7C3AED] text-white bg-[#14141F]'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {leftTab === 'media' && (
                <>
                  <input
                    ref={fileUploadRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleUploadVisualMedia}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Add Video or Image
                  </button>

                  {userVisualMedia.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-zinc-400 mb-2">Your Uploads</p>
                      <div className="grid grid-cols-2 gap-2">
                        {userVisualMedia.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              appendClipToTimeline({
                                mediaId: item.id,
                                name: item.fileName,
                                kind: item.mediaType === 'video' ? 'video' : 'image',
                                srcUrl: item.objectUrl || '',
                                duration: item.durationSeconds || 5,
                              })
                            }
                            className="group rounded-lg bg-[#14141D] border border-white/[0.07] hover:border-[#7C3AED] p-2 text-left transition-colors"
                          >
                            <div className="flex items-center justify-between text-[11px] text-zinc-300">
                              <span className="truncate">{item.fileName}</span>
                              <Plus className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 capitalize">
                              {item.mediaType} · {item.durationSeconds || 5}s
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-medium text-zinc-400 mb-2">Studio Stock Footage</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SAMPLE_MEDIA.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() =>
                            appendClipToTimeline({
                              mediaId: sample.id,
                              name: sample.name,
                              kind: 'image',
                              srcUrl: sample.url,
                              duration: 5,
                            })
                          }
                          className="group rounded-lg overflow-hidden bg-[#14141D] border border-white/[0.07] hover:border-[#7C3AED] text-left transition-colors"
                        >
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={sample.url}
                              alt={sample.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <p className="p-1.5 text-[11px] text-zinc-300 truncate">{sample.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {leftTab === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-400">Title or Subtitle Text</label>
                  <input
                    type="text"
                    value={newTextValue}
                    onChange={(e) => setNewTextValue(e.target.value)}
                    className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTextOverlay}
                    className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Text at Playhead
                  </button>

                  {selectedText && (
                    <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
                      <p className="text-xs font-medium text-white">Selected Text Overlay</p>
                      <input
                        type="text"
                        value={selectedText.text}
                        onChange={(e) =>
                          updateSelectedText((t) => ({ ...t, text: e.target.value }))
                        }
                        className="w-full rounded-lg bg-[#07070A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-zinc-400">Size (px)</label>
                          <input
                            type="number"
                            min={14}
                            max={72}
                            value={selectedText.fontSize}
                            onChange={(e) =>
                              updateSelectedText((t) => ({ ...t, fontSize: Number(e.target.value) || 24 }))
                            }
                            className="w-full mt-1 rounded bg-[#07070A] border border-white/10 px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-400">Color</label>
                          <input
                            type="color"
                            value={selectedText.color}
                            onChange={(e) =>
                              updateSelectedText((t) => ({ ...t, color: e.target.value }))
                            }
                            className="w-full h-8 mt-1 rounded bg-[#07070A] border border-white/10 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="flex justify-between text-[11px] text-zinc-400">
                          <span>Vertical Position</span>
                          <span className="font-mono">{selectedText.yPercent}%</span>
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={selectedText.yPercent}
                          onChange={(e) =>
                            updateSelectedText((t) => ({ ...t, yPercent: Number(e.target.value) }))
                          }
                          className="w-full accent-[#7C3AED]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {leftTab === 'audio' && (
                <div className="space-y-3">
                  <input
                    ref={audioUploadRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleUploadAudio}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioUploadRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Audio (MP3 / WAV)
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSynthAudio}
                    className="w-full py-2 px-3 rounded-lg bg-[#161621] hover:bg-[#202030] border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <Music className="w-3.5 h-3.5 text-[#A78BFA]" />
                    Add Studio Ambient Pad (6s)
                  </button>

                  {userAudioMedia.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[11px] text-zinc-400">Uploaded Audio</p>
                      {userAudioMedia.map((aud) => (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => {
                            const endAudio = timeline.audios.reduce(
                              (m, a) => Math.max(m, a.startTime + a.duration),
                              0
                            );
                            const clip: TimelineAudioClip = {
                              id: `aud_${Date.now()}`,
                              mediaId: aud.id,
                              name: aud.fileName,
                              srcUrl: aud.objectUrl || '',
                              startTime: endAudio,
                              duration: aud.durationSeconds || 6,
                              sourceDuration: aud.durationSeconds || 6,
                              trimStart: 0,
                              volume: 0.85,
                              muted: false,
                            };
                            commitTimeline({ ...timeline, audios: [...timeline.audios, clip] });
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#14141D] border border-white/[0.07] text-xs text-zinc-300 hover:border-[#7C3AED]"
                        >
                          <span className="truncate">{aud.fileName}</span>
                          <Plus className="w-3.5 h-3.5 text-[#A78BFA]" />
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedAudio && (
                    <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
                      <p className="text-xs font-medium text-white truncate">{selectedAudio.name}</p>
                      <div>
                        <label className="flex justify-between text-[11px] text-zinc-400">
                          <span>Volume</span>
                          <span className="font-mono">{Math.round(selectedAudio.volume * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={selectedAudio.volume}
                          onChange={(e) =>
                            updateSelectedAudio((a) => ({ ...a, volume: Number(e.target.value) }))
                          }
                          className="w-full accent-[#7C3AED]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedAudio((a) => ({ ...a, muted: !a.muted }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161621] border border-white/10 text-xs text-zinc-200"
                      >
                        {selectedAudio.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {selectedAudio.muted ? 'Unmute Track' : 'Mute Track'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {leftTab === 'ai' && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Generate timed text captions directly onto your timeline using ARK AI.
                  </p>
                  <textarea
                    rows={3}
                    value={aiCaptionPrompt}
                    onChange={(e) => setAiCaptionPrompt(e.target.value)}
                    placeholder="Topic or voiceover summary (e.g. Night street cinematography breakdown)..."
                    className="w-full rounded-lg bg-[#07070A] border border-white/10 p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7C3AED]"
                  />
                  <button
                    type="button"
                    disabled={aiLoading || !aiCaptionPrompt.trim()}
                    onClick={handleGenerateAICaptions}
                    className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{aiLoading ? 'Generating...' : 'Insert Timed Captions'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CENTER PANEL: Live Canvas Preview + Transport Controls */}
          <div className="lg:col-span-6 bg-[#07070A] flex flex-col justify-between p-4 min-h-[300px]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                {(['16:9', '9:16', '1:1', '4:5'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#12121A] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-zinc-300 tabular-nums">
                {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
              </span>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 min-h-0 flex items-center justify-center py-2">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full rounded-lg border border-white/10 bg-black shadow-2xl object-contain"
              />
            </div>

            {/* Transport Controls */}
            <div className="mt-2 pt-2 border-t border-white/[0.07] flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentTime(0)}
                aria-label="Jump to start"
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-10 h-10 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => setCurrentTime(totalDuration)}
                aria-label="Jump to end"
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Filters/Transitions, Crop/Rotate, Export */}
          <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0B0B10] flex flex-col min-h-[260px] lg:min-h-0">
            <div className="grid grid-cols-3 border-b border-white/[0.07] bg-[#0E0E14]">
              {(
                [
                  { id: 'adjust', label: 'Filters', icon: Sliders },
                  { id: 'crop', label: 'Crop/Trim', icon: Crop },
                  { id: 'export', label: 'Export', icon: Download },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = rightTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightTab(tab.id)}
                    className={`py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium border-b-2 transition-colors ${
                      active
                        ? 'border-[#7C3AED] text-white bg-[#14141F]'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {rightTab === 'adjust' && (
                <>
                  {!selectedClip ? (
                    <p className="text-xs text-zinc-400">Select a video or image clip on the timeline to edit filters and transitions.</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-white truncate">{selectedClip.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Filter Preset</p>
                        <div className="grid grid-cols-3 gap-1.5 mt-2">
                          {(
                            [
                              { id: 'none', label: 'None' },
                              { id: 'obsidian', label: 'Obsidian' },
                              { id: 'violet-dusk', label: 'Violet' },
                              { id: 'warm-cinema', label: 'Warm' },
                              { id: 'vivid', label: 'Vivid' },
                              { id: 'matte-noir', label: 'Noir' },
                            ] as Array<{ id: FilterPreset; label: string }>
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  adjustments: { ...c.adjustments, filter: f.id },
                                }))
                              }
                              className={`py-1.5 px-2 rounded text-[11px] font-medium border transition-colors ${
                                selectedClip.adjustments.filter === f.id
                                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                  : 'bg-[#14141D] border-white/[0.07] text-zinc-300'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="flex justify-between text-[11px] text-zinc-400">
                            <span>Brightness</span>
                            <span className="font-mono">{selectedClip.adjustments.brightness}</span>
                          </label>
                          <input
                            type="range"
                            min={-50}
                            max={50}
                            value={selectedClip.adjustments.brightness}
                            onChange={(e) =>
                              updateSelectedClip((c) => ({
                                ...c,
                                adjustments: { ...c.adjustments, brightness: Number(e.target.value) },
                              }))
                            }
                            className="w-full accent-[#7C3AED]"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-[11px] text-zinc-400">
                            <span>Contrast</span>
                            <span className="font-mono">{selectedClip.adjustments.contrast}</span>
                          </label>
                          <input
                            type="range"
                            min={-50}
                            max={50}
                            value={selectedClip.adjustments.contrast}
                            onChange={(e) =>
                              updateSelectedClip((c) => ({
                                ...c,
                                adjustments: { ...c.adjustments, contrast: Number(e.target.value) },
                              }))
                            }
                            className="w-full accent-[#7C3AED]"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-[11px] text-zinc-400">
                            <span>Saturation</span>
                            <span className="font-mono">{selectedClip.adjustments.saturation}</span>
                          </label>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            value={selectedClip.adjustments.saturation}
                            onChange={(e) =>
                              updateSelectedClip((c) => ({
                                ...c,
                                adjustments: { ...c.adjustments, saturation: Number(e.target.value) },
                              }))
                            }
                            className="w-full accent-[#7C3AED]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1.5">Transition In</label>
                        <select
                          value={selectedClip.transitionIn}
                          onChange={(e) =>
                            updateSelectedClip((c) => ({
                              ...c,
                              transitionIn: e.target.value as TransitionType,
                            }))
                          }
                          className="w-full rounded-lg bg-[#07070A] border border-white/10 px-2.5 py-2 text-xs text-white"
                        >
                          <option value="none">None (Hard Cut)</option>
                          <option value="crossfade">Crossfade</option>
                          <option value="fade-black">Fade Through Black</option>
                          <option value="slide-left">Slide Left</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {rightTab === 'crop' && (
                <>
                  {!selectedClip ? (
                    <p className="text-xs text-zinc-400">Select a clip on the timeline to trim, crop, or rotate.</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] text-zinc-400 mb-2">Rotate & Flip</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedClip((c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  rotation: (((c.transform.rotation + 90) % 360) as 0 | 90 | 180 | 270),
                                },
                              }))
                            }
                            className="py-2 rounded-lg bg-[#14141D] border border-white/10 text-xs text-zinc-200 hover:border-[#7C3AED] flex items-center justify-center gap-1"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            90°
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedClip((c) => ({
                                ...c,
                                transform: { ...c.transform, flipX: !c.transform.flipX },
                              }))
                            }
                            className={`py-2 rounded-lg border text-xs flex items-center justify-center gap-1 ${
                              selectedClip.transform.flipX
                                ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                : 'bg-[#14141D] border-white/10 text-zinc-200'
                            }`}
                          >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                            Flip H
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedClip((c) => ({
                                ...c,
                                transform: { ...c.transform, flipY: !c.transform.flipY },
                              }))
                            }
                            className={`py-2 rounded-lg border text-xs flex items-center justify-center gap-1 ${
                              selectedClip.transform.flipY
                                ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                : 'bg-[#14141D] border-white/10 text-zinc-200'
                            }`}
                          >
                            <FlipVertical className="w-3.5 h-3.5" />
                            Flip V
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] text-zinc-400">Trim Clip</p>
                        <div>
                          <label className="flex justify-between text-[11px] text-zinc-400">
                            <span>Duration (sec)</span>
                            <span className="font-mono">{selectedClip.duration.toFixed(1)}s</span>
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={Math.max(15, selectedClip.sourceDuration)}
                            step={0.5}
                            value={selectedClip.duration}
                            onChange={(e) =>
                              updateSelectedClip((c) => ({
                                ...c,
                                duration: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#7C3AED]"
                          />
                        </div>
                        {selectedClip.kind === 'video' && (
                          <div>
                            <label className="flex justify-between text-[11px] text-zinc-400">
                              <span>Trim Start Offset</span>
                              <span className="font-mono">{selectedClip.trimStart.toFixed(1)}s</span>
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, selectedClip.sourceDuration - 0.5)}
                              step={0.2}
                              value={selectedClip.trimStart}
                              onChange={(e) =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  trimStart: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-[#7C3AED]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] text-zinc-400">Crop Margins (%)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-zinc-500">Top ({selectedClip.transform.cropTop}%)</label>
                            <input
                              type="range"
                              min={0}
                              max={35}
                              value={selectedClip.transform.cropTop}
                              onChange={(e) =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  transform: { ...c.transform, cropTop: Number(e.target.value) },
                                }))
                              }
                              className="w-full accent-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500">Bottom ({selectedClip.transform.cropBottom}%)</label>
                            <input
                              type="range"
                              min={0}
                              max={35}
                              value={selectedClip.transform.cropBottom}
                              onChange={(e) =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  transform: { ...c.transform, cropBottom: Number(e.target.value) },
                                }))
                              }
                              className="w-full accent-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500">Left ({selectedClip.transform.cropLeft}%)</label>
                            <input
                              type="range"
                              min={0}
                              max={35}
                              value={selectedClip.transform.cropLeft}
                              onChange={(e) =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  transform: { ...c.transform, cropLeft: Number(e.target.value) },
                                }))
                              }
                              className="w-full accent-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500">Right ({selectedClip.transform.cropRight}%)</label>
                            <input
                              type="range"
                              min={0}
                              max={35}
                              value={selectedClip.transform.cropRight}
                              onChange={(e) =>
                                updateSelectedClip((c) => ({
                                  ...c,
                                  transform: { ...c.transform, cropRight: Number(e.target.value) },
                                }))
                              }
                              className="w-full accent-[#7C3AED]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {rightTab === 'export' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-white">FFmpeg.wasm Render Export</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Renders timeline filters, transitions, text overlays, and audio locally.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Container Format</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value as 'mp4' | 'webm')}
                        className="w-full rounded-lg bg-[#07070A] border border-white/10 px-2.5 py-2 text-xs text-white"
                      >
                        <option value="mp4">MP4 (H.264)</option>
                        <option value="webm">WebM (VP9)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Resolution</label>
                      <select
                        value={exportRes}
                        onChange={(e) => setExportRes(e.target.value as '720p' | '1080p' | '4K')}
                        className="w-full rounded-lg bg-[#07070A] border border-white/10 px-2.5 py-2 text-xs text-white"
                      >
                        <option value="720p">720p HD</option>
                        <option value="1080p">1080p Full HD</option>
                        <option value="4K">4K Ultra HD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Frame Rate</label>
                      <select
                        value={exportFps}
                        onChange={(e) => setExportFps(Number(e.target.value) as 24 | 30 | 60)}
                        className="w-full rounded-lg bg-[#07070A] border border-white/10 px-2.5 py-2 text-xs text-white"
                      >
                        <option value={24}>24 fps (Cinema)</option>
                        <option value={30}>30 fps (Standard)</option>
                        <option value={60}>60 fps (Smooth)</option>
                      </select>
                    </div>
                  </div>

                  {exporting && (
                    <div className="rounded-lg bg-[#14141D] border border-[#7C3AED]/40 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 truncate">{exportStage}</span>
                        <span className="font-mono text-[#A78BFA] tabular-nums">{exportProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#7C3AED] transition-all"
                          style={{ width: `${exportProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={exporting}
                    onClick={handleExportVideo}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{exporting ? 'Rendering Video...' : `Export ${exportFormat.toUpperCase()}`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM MULTI-TRACK TIMELINE */}
        <div className="h-56 sm:h-60 shrink-0 bg-[#0A0A0F] flex flex-col">
          {/* Timeline Toolbar */}
          <div className="h-10 px-3 border-b border-white/[0.07] bg-[#0F0F16] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSplitAtPlayhead}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181823] hover:bg-[#222232] border border-white/10 text-xs text-zinc-200 whitespace-nowrap"
              >
                <Scissors className="w-3.5 h-3.5 text-[#A78BFA]" />
                Split at Playhead
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={!selectedClip && !selectedText && !selectedAudio}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181823] hover:bg-rose-500/20 border border-white/10 text-xs text-zinc-300 disabled:opacity-40 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPxPerSec((z) => Math.max(24, z - 10))}
                aria-label="Zoom out timeline"
                className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums w-12 text-center">
                {pxPerSec}px/s
              </span>
              <button
                type="button"
                onClick={() => setPxPerSec((z) => Math.min(120, z + 10))}
                aria-label="Zoom in timeline"
                className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable Tracks Canvas */}
          <div className="flex-1 overflow-x-auto overflow-y-auto relative select-none">
            <div
              className="relative min-h-full"
              style={{ width: `${Math.max(700, (totalDuration + 4) * pxPerSec + 110)}px` }}
            >
              {/* Scrubbable Time Ruler */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, e.clientX - rect.left - 88);
                  setCurrentTime(Math.min(totalDuration, Math.round((x / pxPerSec) * 100) / 100));
                }}
                className="h-7 border-b border-white/[0.07] bg-[#0D0D13] flex items-end pl-[88px] cursor-pointer relative"
              >
                {Array.from({ length: Math.ceil(totalDuration) + 3 }).map((_, sec) => (
                  <div
                    key={sec}
                    className="shrink-0 border-l border-white/15 h-3 pl-1 text-[10px] font-mono text-zinc-500 tabular-nums"
                    style={{ width: `${pxPerSec}px` }}
                  >
                    {sec}s
                  </div>
                ))}
              </div>

              {/* Playhead Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#A78BFA] z-20 pointer-events-none"
                style={{ left: `${88 + currentTime * pxPerSec}px` }}
              >
                <div className="w-2.5 h-2.5 -ml-[4px] bg-[#A78BFA] rotate-45" />
              </div>

              {/* Track 1: Video / Image */}
              <div className="h-14 border-b border-white/[0.05] flex items-center relative">
                <div className="w-[88px] shrink-0 h-full bg-[#0D0D13] border-r border-white/[0.07] px-2.5 flex items-center text-[11px] font-medium text-zinc-400">
                  Video
                </div>
                <div className="relative flex-1 h-full">
                  {timeline.clips.map((clip) => {
                    const selected = clip.id === selectedClipId;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => {
                          setSelectedClipId(clip.id);
                          setSelectedTextId(null);
                          setSelectedAudioId(null);
                          setCurrentTime(clip.startTime);
                        }}
                        style={{
                          left: `${clip.startTime * pxPerSec}px`,
                          width: `${Math.max(28, clip.duration * pxPerSec)}px`,
                        }}
                        className={`absolute top-2 bottom-2 rounded-md px-2 text-left overflow-hidden border transition-colors ${
                          selected
                            ? 'bg-[#7C3AED]/35 border-[#A78BFA] text-white'
                            : 'bg-[#191926] border-white/15 text-zinc-200 hover:border-white/30'
                        }`}
                      >
                        <p className="text-[11px] font-medium truncate">{clip.name}</p>
                        <p className="text-[10px] font-mono text-zinc-400 tabular-nums">
                          {clip.duration.toFixed(1)}s
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Track 2: Text Overlays */}
              <div className="h-12 border-b border-white/[0.05] flex items-center relative">
                <div className="w-[88px] shrink-0 h-full bg-[#0D0D13] border-r border-white/[0.07] px-2.5 flex items-center text-[11px] font-medium text-zinc-400">
                  Text
                </div>
                <div className="relative flex-1 h-full">
                  {timeline.texts.map((txt) => {
                    const selected = txt.id === selectedTextId;
                    return (
                      <button
                        key={txt.id}
                        type="button"
                        onClick={() => {
                          setSelectedTextId(txt.id);
                          setSelectedClipId(null);
                          setSelectedAudioId(null);
                          setLeftTab('text');
                          setCurrentTime(txt.startTime);
                        }}
                        style={{
                          left: `${txt.startTime * pxPerSec}px`,
                          width: `${Math.max(24, txt.duration * pxPerSec)}px`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded-md px-2 text-left overflow-hidden border transition-colors ${
                          selected
                            ? 'bg-violet-500/40 border-violet-300 text-white'
                            : 'bg-[#161325] border-violet-500/30 text-violet-200 hover:border-violet-400'
                        }`}
                      >
                        <p className="text-[11px] truncate">{txt.text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Track 3: Audio */}
              <div className="h-12 flex items-center relative">
                <div className="w-[88px] shrink-0 h-full bg-[#0D0D13] border-r border-white/[0.07] px-2.5 flex items-center text-[11px] font-medium text-zinc-400">
                  Audio
                </div>
                <div className="relative flex-1 h-full">
                  {timeline.audios.map((aud) => {
                    const selected = aud.id === selectedAudioId;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => {
                          setSelectedAudioId(aud.id);
                          setSelectedClipId(null);
                          setSelectedTextId(null);
                          setLeftTab('audio');
                          setCurrentTime(aud.startTime);
                        }}
                        style={{
                          left: `${aud.startTime * pxPerSec}px`,
                          width: `${Math.max(28, aud.duration * pxPerSec)}px`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded-md px-2 text-left overflow-hidden border transition-colors ${
                          selected
                            ? 'bg-emerald-500/30 border-emerald-300 text-white'
                            : 'bg-[#111D1B] border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
                        }`}
                      >
                        <p className="text-[11px] truncate">{aud.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
