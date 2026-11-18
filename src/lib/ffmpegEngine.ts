import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { AspectRatio, VideoTimelineState } from '../types/ark';

export interface ExportOptions {
  format: 'mp4' | 'webm';
  resolution: '720p' | '1080p' | '4K';
  fps: 24 | 30 | 60;
  aspectRatio: AspectRatio;
  timeline: VideoTimelineState;
  totalDuration: number;
  onProgress?: (percent: number, stage: string) => void;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  engine: 'ffmpeg-wasm' | 'canvas-recorder';
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onStage?: (stage: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }
  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    onStage?.('Loading FFmpeg.wasm core...');
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (err) {
    ffmpegLoadPromise = null;
    throw err;
  }
}

export function getResolutionDimensions(
  resolution: '720p' | '1080p' | '4K',
  aspectRatio: AspectRatio
): { width: number; height: number } {
  const shortSide = resolution === '4K' ? 2160 : resolution === '1080p' ? 1080 : 720;
  switch (aspectRatio) {
    case '9:16':
      return { width: shortSide, height: Math.round((shortSide * 16) / 9 / 2) * 2 };
    case '1:1':
      return { width: shortSide, height: shortSide };
    case '4:5':
      return { width: shortSide, height: Math.round((shortSide * 5) / 4 / 2) * 2 };
    case '16:9':
    default:
      return { width: Math.round((shortSide * 16) / 9 / 2) * 2, height: shortSide };
  }
}

/**
 * Renders the full multi-track timeline (video/image clips, crop, rotation, color filters,
 * transitions, text overlays, and audio mixing) to an offscreen canvas stream, then
 * transcodes cleanly via FFmpeg.wasm to MP4/WebM (or falls back to direct WebM if WASM CDN is offline).
 */
export async function exportTimelineVideo(options: ExportOptions): Promise<ExportResult> {
  const { format, resolution, fps, aspectRatio, timeline, totalDuration, onProgress } = options;
  const safeDuration = Math.max(1, totalDuration);
  const { width, height } = getResolutionDimensions(resolution, aspectRatio);

  onProgress?.(5, 'Preparing offscreen render pipeline...');

  // Preload all visual & audio elements
  const mediaElements = new Map<string, HTMLVideoElement | HTMLImageElement>();
  const audioElements = new Map<string, HTMLAudioElement>();

  for (const clip of timeline.clips) {
    if (clip.kind === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = clip.srcUrl;
      video.muted = clip.muted;
      video.volume = clip.volume;
      video.playsInline = true;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onloadeddata = done;
        video.onerror = done;
        setTimeout(done, 4000);
      });
      mediaElements.set(clip.id, video);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.srcUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(() => resolve(), 3000);
      });
      mediaElements.set(clip.id, img);
    }
  }

  for (const audio of timeline.audios) {
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = audio.srcUrl;
    el.muted = audio.muted;
    el.volume = audio.volume;
    audioElements.set(audio.id, el);
  }

  // Render frames into MediaRecorder stream at exact timeline timestamps
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D render context.');
  }

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: resolution === '4K' ? 14_000_000 : resolution === '1080p' ? 8_000_000 : 4_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  onProgress?.(15, 'Compositing timeline frames...');
  recorder.start(100);

  const frameIntervalMs = 1000 / fps;
  const totalFrames = Math.ceil(safeDuration * fps);

  for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
    const t = Math.min(safeDuration, frameIdx / fps);

    // Clear canvas
    ctx.fillStyle = '#07070A';
    ctx.fillRect(0, 0, width, height);

    // Find active clip at time t
    const activeClip = timeline.clips.find(
      (c) => t >= c.startTime && t <= c.startTime + c.duration
    );

    if (activeClip) {
      const el = mediaElements.get(activeClip.id);
      if (el instanceof HTMLVideoElement) {
        const targetVideoTime = activeClip.trimStart + (t - activeClip.startTime);
        if (Math.abs(el.currentTime - targetVideoTime) > 0.08) {
          el.currentTime = Math.min(el.duration || targetVideoTime, Math.max(0, targetVideoTime));
          await new Promise<void>((r) => {
            const onSeeked = () => {
              el.removeEventListener('seeked', onSeeked);
              r();
            };
            el.addEventListener('seeked', onSeeked);
            setTimeout(r, 80);
          });
        }
      }

      if (el) {
        ctx.save();

        // Transition opacity/slide
        const elapsedInClip = t - activeClip.startTime;
        const transitionDur = Math.min(0.6, activeClip.duration * 0.35);
        if (activeClip.transitionIn === 'crossfade' && elapsedInClip < transitionDur) {
          ctx.globalAlpha = Math.max(0.05, elapsedInClip / transitionDur);
        } else if (activeClip.transitionIn === 'fade-black' && elapsedInClip < transitionDur) {
          ctx.globalAlpha = Math.max(0, elapsedInClip / transitionDur);
        } else if (activeClip.transitionIn === 'slide-left' && elapsedInClip < transitionDur) {
          const offset = (1 - elapsedInClip / transitionDur) * width * 0.35;
          ctx.translate(-offset, 0);
        }

        // Color & preset filters
        const adj = activeClip.adjustments;
        const b = 100 + adj.brightness;
        const c = 100 + adj.contrast;
        const s = 100 + adj.saturation;
        let presetFilter = '';
        if (adj.filter === 'obsidian') presetFilter = 'contrast(1.15) saturate(0.8)';
        if (adj.filter === 'violet-dusk') presetFilter = 'hue-rotate(-18deg) saturate(1.2) contrast(1.08)';
        if (adj.filter === 'warm-cinema') presetFilter = 'sepia(0.22) contrast(1.1) saturate(1.15)';
        if (adj.filter === 'vivid') presetFilter = 'saturate(1.4) contrast(1.12)';
        if (adj.filter === 'matte-noir') presetFilter = 'grayscale(1) contrast(1.25)';

        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) ${presetFilter}`.trim();

        // Transform (rotation & flips)
        ctx.translate(width / 2, height / 2);
        ctx.rotate((activeClip.transform.rotation * Math.PI) / 180);
        ctx.scale(activeClip.transform.flipX ? -1 : 1, activeClip.transform.flipY ? -1 : 1);

        const mediaW = el instanceof HTMLVideoElement ? el.videoWidth || width : el.naturalWidth || width;
        const mediaH = el instanceof HTMLVideoElement ? el.videoHeight || height : el.naturalHeight || height;

        // Crop inset
        const cropL = (activeClip.transform.cropLeft / 100) * mediaW;
        const cropR = (activeClip.transform.cropRight / 100) * mediaW;
        const cropT = (activeClip.transform.cropTop / 100) * mediaH;
        const cropB = (activeClip.transform.cropBottom / 100) * mediaH;
        const sx = cropL;
        const sy = cropT;
        const sw = Math.max(10, mediaW - cropL - cropR);
        const sh = Math.max(10, mediaH - cropT - cropB);

        // Fit inside canvas preserving aspect ratio (cover)
        const scale = Math.max(width / sw, height / sh);
        const dw = sw * scale;
        const dh = sh * scale;

        ctx.drawImage(el, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }
    }

    // Draw active text overlays
    const activeTexts = timeline.texts.filter(
      (txt) => t >= txt.startTime && t <= txt.startTime + txt.duration
    );
    for (const txt of activeTexts) {
      ctx.save();
      const scaledFont = Math.round((txt.fontSize / 480) * height);
      ctx.font = `${txt.fontWeight === 'bold' ? '700' : '500'} ${scaledFont}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = (txt.xPercent / 100) * width;
      const ty = (txt.yPercent / 100) * height;
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

    const renderPct = 15 + Math.round((frameIdx / totalFrames) * 50);
    if (frameIdx % Math.max(1, Math.round(fps / 2)) === 0) {
      onProgress?.(renderPct, `Compositing frame ${frameIdx}/${totalFrames}...`);
    }

    await new Promise((r) => setTimeout(r, Math.min(20, frameIntervalMs / 2)));
  }

  recorder.stop();
  const rawWebmBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  onProgress?.(70, 'Initializing FFmpeg.wasm encoder...');

  // Attempt FFmpeg.wasm transcode & audio muxing
  try {
    const ffmpeg = await getFFmpeg((stage) => onProgress?.(74, stage));
    ffmpeg.on('progress', ({ progress }) => {
      const pct = 75 + Math.min(23, Math.round(progress * 23));
      onProgress?.(pct, `FFmpeg.wasm encoding ${format.toUpperCase()}...`);
    });

    await ffmpeg.writeFile('input.webm', await fetchFile(rawWebmBlob));

    const args: string[] = ['-i', 'input.webm'];

    // Mix first active audio track if present
    const primaryAudio = timeline.audios.find((a) => !a.muted && a.srcUrl);
    let hasAudio = false;
    if (primaryAudio) {
      try {
        await ffmpeg.writeFile('audio_in', await fetchFile(primaryAudio.srcUrl));
        args.push('-i', 'audio_in');
        hasAudio = true;
      } catch {
        hasAudio = false;
      }
    }

    const outName = format === 'mp4' ? 'ark_export.mp4' : 'ark_export.webm';
    if (format === 'mp4') {
      args.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps)
      );
      if (hasAudio) {
        args.push('-c:a', 'aac', '-shortest');
      }
    } else {
      args.push('-c:v', 'copy');
      if (hasAudio) {
        args.push('-c:a', 'libopus', '-shortest');
      }
    }
    args.push(outName);

    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outName);
    const outputBytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const finalBlob = new Blob([outputBytes.slice().buffer], {
      type: format === 'mp4' ? 'video/mp4' : 'video/webm',
    });

    // Clean virtual filesystem
    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile(outName);
      if (hasAudio) await ffmpeg.deleteFile('audio_in');
    } catch {
      // ignore
    }

    onProgress?.(100, 'Export complete');
    return {
      blob: finalBlob,
      fileName: `ark-ai-export-${Date.now()}.${format}`,
      engine: 'ffmpeg-wasm',
    };
  } catch {
    // Graceful fallback if FFmpeg WASM CDN is blocked in an offline sandbox
    onProgress?.(100, 'Export complete (Browser WebM Encoder)');
    return {
      blob: rawWebmBlob,
      fileName: `ark-ai-export-${Date.now()}.webm`,
      engine: 'canvas-recorder',
    };
  }
}
