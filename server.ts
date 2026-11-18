import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'ark-store.json');

interface StoreSchema {
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    handle: string;
    bio: string;
    avatarUrl: string;
    role: 'user' | 'admin';
    status: 'active' | 'suspended';
    storageUsedBytes: number;
    createdAt: string;
  }>;
  plans: Array<{
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
  }>;
  subscriptions: Array<{
    id: string;
    userId: string;
    planId: string;
    billingCycle: 'monthly' | 'annual';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }>;
  projects: Array<Record<string, unknown>>;
  mediaAssets: Array<Record<string, unknown>>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getDefaultStore(): StoreSchema {
  const now = new Date().toISOString();
  const nextMonth = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

  return {
    users: [
      {
        id: 'usr_creator_01',
        email: 'creator@arkstudio.app',
        passwordHash: hashPassword('ArkStudio2026!'),
        fullName: 'Elena Vance',
        handle: 'elenavance',
        bio: 'Commercial director & colorist crafting short-form cinema.',
        avatarUrl: '/src/assets/images/avatar_creator_1794986574763.jpg',
        role: 'user',
        status: 'active',
        storageUsedBytes: 428_500_000,
        createdAt: now,
      },
      {
        id: 'usr_admin_01',
        email: 'admin@arkstudio.app',
        passwordHash: hashPassword('ArkAdmin2026!'),
        fullName: 'Marcus Chen',
        handle: 'ark_admin',
        bio: 'ARK AI Studio Operations & Infrastructure Lead.',
        avatarUrl: '/src/assets/images/avatar_creator_1794986574763.jpg',
        role: 'admin',
        status: 'active',
        storageUsedBytes: 184_200_000,
        createdAt: now,
      },
    ],
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        audience: 'For individual creators getting started',
        description: 'Full browser timeline editing, photo studio tools, and 720p MP4 exports.',
        monthlyPriceCents: 0,
        annualPriceCents: 0,
        storageLimitGb: 5,
        maxExportResolution: '720p',
        aiCreditsMonthly: 25,
        watermark: false,
        features: [
          '5 GB cloud media storage',
          '720p MP4 & WebM FFmpeg exports',
          'Multi-track timeline & photo studio',
          '25 monthly AI assist requests',
        ],
        isActive: true,
      },
      {
        id: 'pro',
        name: 'Pro Studio',
        audience: 'For solo filmmakers and daily channels',
        description: 'Full 1080p & 4K FFmpeg exports, 100 GB storage, and priority AI scripting.',
        monthlyPriceCents: 1900,
        annualPriceCents: 18000,
        storageLimitGb: 100,
        maxExportResolution: '4K',
        aiCreditsMonthly: 500,
        watermark: false,
        features: [
          '100 GB cloud media storage',
          '4K 60fps MP4 & WebM FFmpeg exports',
          'Unlimited timeline tracks & LUT presets',
          '500 monthly AI assist requests',
        ],
        isActive: true,
      },
      {
        id: 'studio',
        name: 'Studio Team',
        audience: 'For production houses and creative agencies',
        description: '1 TB shared archive, 4K mastering, and dedicated workspace controls.',
        monthlyPriceCents: 4900,
        annualPriceCents: 46800,
        storageLimitGb: 1024,
        maxExportResolution: '4K',
        aiCreditsMonthly: 2500,
        watermark: false,
        features: [
          '1 TB cloud media storage',
          '4K 60fps uncompressed mastering',
          'Priority team project review',
          '2,500 monthly AI assist requests',
        ],
        isActive: true,
      },
    ],
    subscriptions: [
      {
        id: 'sub_01',
        userId: 'usr_creator_01',
        planId: 'pro',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
      {
        id: 'sub_02',
        userId: 'usr_admin_01',
        planId: 'studio',
        billingCycle: 'annual',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
    ],
    projects: [
      {
        id: 'proj_nocturne_01',
        userId: 'usr_creator_01',
        title: 'Nocturne Rain Sequence',
        type: 'video',
        aspectRatio: '16:9',
        durationSeconds: 10,
        thumbnailUrl: '/src/assets/images/template_cinematic_reel_1794986573258.jpg',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        timelineData: {
          clips: [
            {
              id: 'clip_seed_1',
              mediaId: 'sample_nocturne',
              name: 'Nocturne Rain Street',
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
              adjustments: { brightness: 0, contrast: 8, saturation: 10, filter: 'violet-dusk' },
            },
            {
              id: 'clip_seed_2',
              mediaId: 'sample_cinema_rig',
              name: 'Studio Camera Rig',
              kind: 'image',
              srcUrl: '/src/assets/images/template_portrait_vlog_1794986574664.jpg',
              startTime: 5,
              duration: 5,
              sourceDuration: 5,
              trimStart: 0,
              volume: 1,
              muted: false,
              transitionIn: 'crossfade',
              transform: { rotation: 0, flipX: false, flipY: false, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 },
              adjustments: { brightness: 0, contrast: 6, saturation: 0, filter: 'obsidian' },
            },
          ],
          texts: [
            {
              id: 'txt_seed_1',
              text: 'ARK STUDIO CUT',
              startTime: 0.6,
              duration: 3.5,
              xPercent: 50,
              yPercent: 82,
              fontSize: 32,
              color: '#FFFFFF',
              bgColor: 'rgba(124, 58, 237, 0.72)',
              fontWeight: 'bold',
            },
          ],
          audios: [],
        },
      },
      {
        id: 'proj_lens_ad_02',
        userId: 'usr_creator_01',
        title: 'Anamorphic Lens Reveal',
        type: 'photo',
        aspectRatio: '4:5',
        durationSeconds: 0,
        thumbnailUrl: '/src/assets/images/template_product_launch_1794986574426.jpg',
        status: 'exported',
        createdAt: now,
        updatedAt: now,
        timelineData: { clips: [], texts: [], audios: [] },
        photoData: {
          imageUrl: '/src/assets/images/template_product_launch_1794986574426.jpg',
          fileName: 'lens-campaign-master.jpg',
          brightness: 4,
          contrast: 12,
          saturation: 6,
          blur: 0,
          vignette: 28,
          sepia: 0,
          hueRotate: 0,
          filter: 'obsidian',
          rotation: 0,
          flipX: false,
          flipY: false,
          cropAspect: '4:3',
          overlayText: '35MM MASTER PRIME',
          overlayColor: '#FFFFFF',
          overlaySize: 28,
          overlayY: 86,
        },
      },
    ],
    mediaAssets: [
      {
        id: 'asset_seed_1',
        userId: 'usr_creator_01',
        projectId: 'proj_nocturne_01',
        bucket: 'media',
        storagePath: 'usr_creator_01/nocturne_street.jpg',
        fileName: 'nocturne_street.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 1_840_000,
        durationSeconds: 0,
        objectUrl: '/src/assets/images/template_cinematic_reel_1794986573258.jpg',
        createdAt: now,
      },
      {
        id: 'asset_seed_2',
        userId: 'usr_creator_01',
        projectId: 'proj_lens_ad_02',
        bucket: 'exports',
        storagePath: 'usr_creator_01/lens_reveal_master.png',
        fileName: 'lens_reveal_master.png',
        mediaType: 'export',
        mimeType: 'image/png',
        sizeBytes: 3_420_000,
        durationSeconds: 0,
        objectUrl: '/src/assets/images/template_product_launch_1794986574426.jpg',
        createdAt: now,
      },
    ],
  };
}

function readStore(): StoreSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial = getDefaultStore();
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw) as StoreSchema;
  } catch {
    return getDefaultStore();
  }
}

function writeStore(data: StoreSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sanitizeUser(u: StoreSchema['users'][number]) {
  const { passwordHash: _ignored, ...rest } = u;
  return rest;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health & Environment status (never leaks secret values)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ark-ai-studio', timestamp: new Date().toISOString() });
  });

  app.get('/api/config/status', (_req, res) => {
    res.json({
      supabaseClientConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      supabaseAdminConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Server-side Gemini AI Creative Assistant (/api/ai/assist)
  app.post('/api/ai/assist', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in environment secrets. Please set GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { mode, prompt, durationSeconds } = req.body as {
      mode?: 'script' | 'captions' | 'color';
      prompt?: string;
      durationSeconds?: number;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please provide a brief or scene description.' });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      if (mode === 'color') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Analyze this video scene description and recommend exact color grading settings: "${prompt}"`,
          config: {
            systemInstruction:
              'You are a senior DI colorist for ARK AI. Return concise, practical color grade settings matching the scene mood.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                filter: {
                  type: Type.STRING,
                  description: 'One of: none, obsidian, violet-dusk, warm-cinema, vivid, matte-noir',
                },
                brightness: { type: Type.INTEGER, description: 'Integer between -30 and 30' },
                contrast: { type: Type.INTEGER, description: 'Integer between -25 and 35' },
                saturation: { type: Type.INTEGER, description: 'Integer between -60 and 45' },
                rationale: { type: Type.STRING, description: '2 sentence explanation of why this grade works.' },
              },
              required: ['filter', 'brightness', 'contrast', 'saturation', 'rationale'],
            },
          },
        });
        const parsed = JSON.parse((response.text ?? '{}').trim());
        return res.json({ mode: 'color', result: parsed });
      }

      if (mode === 'captions') {
        const dur = Math.max(5, Math.min(120, Number(durationSeconds || 15)));
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Create punchy, high-retention timed video captions totaling ${dur} seconds for this topic: "${prompt}"`,
          config: {
            systemInstruction:
              'You are a video editor creating short, readable on-screen caption overlays. Keep each line under 7 words.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  startTime: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                },
                required: ['text', 'startTime', 'duration'],
              },
            },
          },
        });
        const parsed = JSON.parse((response.text ?? '[]').trim());
        return res.json({ mode: 'captions', result: parsed });
      }

      // Default: script & shot list
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Write a production-ready short video script & shot plan for: "${prompt}". Target length: ${durationSeconds || 30}s.`,
        config: {
          systemInstruction:
            'You are a commercial film director. Output clean plain-text sections: Hook (0-3s), Body Shots, Audio/Music Cue, and Closing CTA. Keep it concise and actionable.',
        },
      });
      return res.json({ mode: 'script', result: response.text ?? '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      return res.status(500).json({ error: msg });
    }
  });

  // Auth endpoints (Local workspace auth when Supabase is not yet connected)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const store = readStore();
    const user = store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }
    const sub = store.subscriptions.find((s) => s.userId === user.id);
    return res.json({ user: sanitizeUser(user), subscription: sub || null });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, fullName } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
    };
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const store = readStore();
    const exists = store.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const now = new Date().toISOString();
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const cleanHandle = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'creator';
    const newUser: StoreSchema['users'][number] = {
      id,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      handle: `${cleanHandle}_${id.slice(-3)}`,
      bio: 'Video creator at ARK AI Studio.',
      avatarUrl: '/src/assets/images/avatar_creator_1794986574763.jpg',
      role: 'user',
      status: 'active',
      storageUsedBytes: 0,
      createdAt: now,
    };
    const newSub: StoreSchema['subscriptions'][number] = {
      id: `sub_${crypto.randomUUID().slice(0, 8)}`,
      userId: id,
      planId: 'starter',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    };
    store.users.push(newUser);
    store.subscriptions.push(newSub);
    writeStore(store);
    return res.status(201).json({ user: sanitizeUser(newUser), subscription: newSub });
  });

  // Bootstrap endpoint
  app.get('/api/store/bootstrap', (req, res) => {
    const userId = String(req.query.userId || '');
    const store = readStore();
    const user = store.users.find((u) => u.id === userId);
    const projects = userId ? store.projects.filter((p) => p.userId === userId) : [];
    const mediaAssets = userId ? store.mediaAssets.filter((m) => m.userId === userId) : [];
    const subscription = store.subscriptions.find((s) => s.userId === userId) || null;
    res.json({
      user: user ? sanitizeUser(user) : null,
      plans: store.plans,
      subscription,
      projects,
      mediaAssets,
    });
  });

  // Profile update
  app.patch('/api/store/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const store = readStore();
    const idx = store.users.findIndex((u) => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { fullName, handle, bio, avatarUrl, newPassword } = req.body as {
      fullName?: string;
      handle?: string;
      bio?: string;
      avatarUrl?: string;
      newPassword?: string;
    };

    if (fullName !== undefined) store.users[idx].fullName = fullName.trim();
    if (handle !== undefined) store.users[idx].handle = handle.trim();
    if (bio !== undefined) store.users[idx].bio = bio.trim();
    if (avatarUrl !== undefined) store.users[idx].avatarUrl = avatarUrl;
    if (newPassword && newPassword.length >= 6) {
      store.users[idx].passwordHash = hashPassword(newPassword);
    }
    writeStore(store);
    return res.json({ user: sanitizeUser(store.users[idx]) });
  });

  // Projects CRUD
  app.post('/api/store/projects', (req, res) => {
    const store = readStore();
    const project = req.body as Record<string, unknown>;
    if (!project.id || !project.userId) {
      return res.status(400).json({ error: 'Project id and userId required' });
    }
    const idx = store.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      store.projects[idx] = { ...store.projects[idx], ...project, updatedAt: new Date().toISOString() };
    } else {
      store.projects.unshift({
        ...project,
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    writeStore(store);
    return res.json({ project: idx >= 0 ? store.projects[idx] : store.projects[0] });
  });

  app.delete('/api/store/projects/:id', (req, res) => {
    const store = readStore();
    store.projects = store.projects.filter((p) => p.id !== req.params.id);
    writeStore(store);
    return res.json({ deleted: true });
  });

  // Media assets metadata
  app.post('/api/store/media', (req, res) => {
    const store = readStore();
    const asset = req.body as Record<string, unknown>;
    store.mediaAssets.unshift(asset);
    const uid = String(asset.userId || '');
    const size = Number(asset.sizeBytes || 0);
    const uIdx = store.users.findIndex((u) => u.id === uid);
    if (uIdx >= 0) {
      store.users[uIdx].storageUsedBytes += size;
    }
    writeStore(store);
    return res.json({ asset });
  });

  app.delete('/api/store/media/:id', (req, res) => {
    const store = readStore();
    const asset = store.mediaAssets.find((m) => m.id === req.params.id);
    if (asset) {
      const uid = String(asset.userId || '');
      const size = Number(asset.sizeBytes || 0);
      const uIdx = store.users.findIndex((u) => u.id === uid);
      if (uIdx >= 0) {
        store.users[uIdx].storageUsedBytes = Math.max(0, store.users[uIdx].storageUsedBytes - size);
      }
      store.mediaAssets = store.mediaAssets.filter((m) => m.id !== req.params.id);
      writeStore(store);
    }
    return res.json({ deleted: true });
  });

  // Subscriptions
  app.post('/api/store/subscriptions/change', (req, res) => {
    const { userId, planId, billingCycle } = req.body as {
      userId: string;
      planId: string;
      billingCycle: 'monthly' | 'annual';
    };
    const store = readStore();
    const plan = store.plans.find((p) => p.id === planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    const end = new Date(now.getTime() + (billingCycle === 'annual' ? 365 : 30) * 86400 * 1000);
    const idx = store.subscriptions.findIndex((s) => s.userId === userId);
    const record: StoreSchema['subscriptions'][number] = {
      id: idx >= 0 ? store.subscriptions[idx].id : `sub_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      planId,
      billingCycle,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
    };
    if (idx >= 0) {
      store.subscriptions[idx] = record;
    } else {
      store.subscriptions.push(record);
    }
    writeStore(store);
    return res.json({ subscription: record });
  });

  // Admin endpoints (bridges to Supabase Admin if configured, otherwise manages local store)
  app.get('/api/admin/overview', async (_req, res) => {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      try {
        const [uRes, pRes, plRes, sRes, mRes] = await Promise.all([
          sbAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
          sbAdmin.from('projects').select('*').order('updated_at', { ascending: false }),
          sbAdmin.from('plans').select('*'),
          sbAdmin.from('subscriptions').select('*'),
          sbAdmin.from('media_assets').select('*'),
        ]);
        if (!uRes.error && !pRes.error && !plRes.error) {
          return res.json({
            source: 'supabase',
            users: (uRes.data || []).map((r) => ({
              id: r.id,
              email: r.email,
              fullName: r.full_name,
              handle: r.handle,
              bio: r.bio,
              avatarUrl: r.avatar_url,
              role: r.role,
              status: r.status,
              storageUsedBytes: r.storage_used_bytes,
              createdAt: r.created_at,
            })),
            projects: (pRes.data || []).map((r) => ({
              id: r.id,
              userId: r.user_id,
              title: r.title,
              type: r.type,
              aspectRatio: r.aspect_ratio,
              durationSeconds: r.duration_seconds,
              thumbnailUrl: r.thumbnail_url,
              status: r.status,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            })),
            plans: (plRes.data || []).map((r) => ({
              id: r.id,
              name: r.name,
              audience: r.audience,
              description: r.description,
              monthlyPriceCents: r.monthly_price_cents,
              annualPriceCents: r.annual_price_cents,
              storageLimitGb: r.storage_limit_gb,
              maxExportResolution: r.max_export_resolution,
              aiCreditsMonthly: r.ai_credits_monthly,
              watermark: r.watermark,
              features: r.features,
              isActive: r.is_active,
            })),
            subscriptions: (sRes.data || []).map((r) => ({
              id: r.id,
              userId: r.user_id,
              planId: r.plan_id,
              billingCycle: r.billing_cycle,
              status: r.status,
              currentPeriodStart: r.current_period_start,
              currentPeriodEnd: r.current_period_end,
            })),
            mediaAssets: (mRes.data || []).map((r) => ({
              id: r.id,
              userId: r.user_id,
              projectId: r.project_id,
              bucket: r.bucket,
              storagePath: r.storage_path,
              fileName: r.file_name,
              mediaType: r.media_type,
              mimeType: r.mime_type,
              sizeBytes: r.size_bytes,
              durationSeconds: r.duration_seconds,
              createdAt: r.created_at,
            })),
          });
        }
      } catch {
        // fallback below if tables haven't been migrated yet
      }
    }

    const store = readStore();
    return res.json({
      source: 'local',
      users: store.users.map(sanitizeUser),
      projects: store.projects,
      plans: store.plans,
      subscriptions: store.subscriptions,
      mediaAssets: store.mediaAssets,
    });
  });

  app.patch('/api/admin/users/:id', (req, res) => {
    const store = readStore();
    const idx = store.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const { role, status } = req.body as { role?: 'user' | 'admin'; status?: 'active' | 'suspended' };
    if (role) store.users[idx].role = role;
    if (status) store.users[idx].status = status;
    writeStore(store);
    return res.json({ user: sanitizeUser(store.users[idx]) });
  });

  app.put('/api/admin/plans/:id', (req, res) => {
    const store = readStore();
    const idx = store.plans.findIndex((p) => p.id === req.params.id);
    const updated = req.body as StoreSchema['plans'][number];
    if (idx >= 0) {
      store.plans[idx] = { ...store.plans[idx], ...updated };
    } else {
      store.plans.push(updated);
    }
    writeStore(store);
    return res.json({ plans: store.plans });
  });

  app.patch('/api/admin/subscriptions/:id', (req, res) => {
    const store = readStore();
    const idx = store.subscriptions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Subscription not found' });
    const { planId, status } = req.body as { planId?: string; status?: 'active' | 'trialing' | 'past_due' | 'canceled' };
    if (planId) store.subscriptions[idx].planId = planId;
    if (status) store.subscriptions[idx].status = status;
    writeStore(store);
    return res.json({ subscription: store.subscriptions[idx] });
  });

  // Vite dev middleware vs static production serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARK AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
