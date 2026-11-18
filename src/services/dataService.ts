import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { deleteMediaBlob, getMediaBlob, saveMediaBlob } from '../lib/mediaDB';
import type {
  MediaAsset,
  StudioProject,
  SubscriptionPlan,
  UserProfile,
  UserRole,
  UserStatus,
  UserSubscription,
} from '../types/ark';

const SESSION_KEY = 'ark_ai_session_user_id';

export function getSavedSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSavedSessionUserId(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function mapSupabaseProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email || ''),
    fullName: String(row.full_name || ''),
    handle: String(row.handle || ''),
    bio: String(row.bio || ''),
    avatarUrl: String(row.avatar_url || '/src/assets/images/avatar_creator_1794986574763.jpg'),
    role: (row.role as UserRole) || 'user',
    status: (row.status as UserStatus) || 'active',
    storageUsedBytes: Number(row.storage_used_bytes || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapSupabasePlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    audience: String(row.audience || ''),
    description: String(row.description || ''),
    monthlyPriceCents: Number(row.monthly_price_cents || 0),
    annualPriceCents: Number(row.annual_price_cents || 0),
    storageLimitGb: Number(row.storage_limit_gb || 5),
    maxExportResolution: (row.max_export_resolution as '720p' | '1080p' | '4K') || '720p',
    aiCreditsMonthly: Number(row.ai_credits_monthly || 25),
    watermark: Boolean(row.watermark),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    isActive: row.is_active !== false,
  };
}

function mapSupabaseSubscription(row: Record<string, unknown>): UserSubscription {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    planId: String(row.plan_id),
    billingCycle: (row.billing_cycle as 'monthly' | 'annual') || 'monthly',
    status: (row.status as UserSubscription['status']) || 'active',
    currentPeriodStart: String(row.current_period_start || new Date().toISOString()),
    currentPeriodEnd: String(row.current_period_end || new Date().toISOString()),
  };
}

function mapSupabaseProject(row: Record<string, unknown>): StudioProject {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title || 'Untitled Project'),
    type: (row.type as 'video' | 'photo') || 'video',
    aspectRatio: (row.aspect_ratio as StudioProject['aspectRatio']) || '16:9',
    durationSeconds: Number(row.duration_seconds || 0),
    thumbnailUrl: String(row.thumbnail_url || '/src/assets/images/template_cinematic_reel_1794986573258.jpg'),
    status: (row.status as StudioProject['status']) || 'draft',
    timelineData: (row.timeline_data as StudioProject['timelineData']) || { clips: [], texts: [], audios: [] },
    photoData: row.photo_data as StudioProject['photoData'],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function loginWithCredentials(email: string, password: string): Promise<{
  user: UserProfile;
  subscription: UserSubscription | null;
}> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new Error(error?.message || 'Unable to sign in with Supabase.');
    }
    const { data: profileRow, error: pErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (pErr || !profileRow) {
      throw new Error(pErr?.message || 'Profile record missing in Supabase.');
    }
    const { data: subRow } = await sb
      .from('subscriptions')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle();

    setSavedSessionUserId(data.user.id);
    return {
      user: mapSupabaseProfile(profileRow),
      subscription: subRow ? mapSupabaseSubscription(subRow) : null,
    };
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Login failed');
  }
  setSavedSessionUserId(payload.user.id);
  return payload;
}

export async function registerAccount(fullName: string, email: string, password: string): Promise<{
  user: UserProfile;
  subscription: UserSubscription | null;
}> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error || !data.user) {
      throw new Error(error?.message || 'Supabase registration failed.');
    }
    // Wait briefly for trigger to insert profile row
    await new Promise((r) => setTimeout(r, 400));
    const { data: profileRow } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    const { data: subRow } = await sb.from('subscriptions').select('*').eq('user_id', data.user.id).maybeSingle();
    setSavedSessionUserId(data.user.id);
    return {
      user: profileRow
        ? mapSupabaseProfile(profileRow)
        : {
            id: data.user.id,
            email,
            fullName,
            handle: email.split('@')[0],
            bio: '',
            avatarUrl: '/src/assets/images/avatar_creator_1794986574763.jpg',
            role: 'user',
            status: 'active',
            storageUsedBytes: 0,
            createdAt: new Date().toISOString(),
          },
      subscription: subRow ? mapSupabaseSubscription(subRow) : null,
    };
  }

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Registration failed');
  }
  setSavedSessionUserId(payload.user.id);
  return payload;
}

export async function logoutSession(): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    await sb.auth.signOut();
  }
  setSavedSessionUserId(null);
}

export async function fetchBootstrapData(userId: string | null): Promise<{
  user: UserProfile | null;
  plans: SubscriptionPlan[];
  subscription: UserSubscription | null;
  projects: StudioProject[];
  mediaAssets: MediaAsset[];
}> {
  const sb = getSupabaseClient();
  if (sb && isSupabaseConfigured()) {
    const { data: sessionData } = await sb.auth.getSession();
    const uid = sessionData.session?.user?.id || userId;
    const { data: planRows } = await sb.from('plans').select('*').order('monthly_price_cents');
    const plans = (planRows || []).map(mapSupabasePlan);

    if (!uid) {
      return { user: null, plans, subscription: null, projects: [], mediaAssets: [] };
    }

    const [{ data: profileRow }, { data: subRow }, { data: projectRows }, { data: assetRows }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('projects').select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
      sb.from('media_assets').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);

    const mediaAssets: MediaAsset[] = [];
    for (const row of assetRows || []) {
      const bucket = String(row.bucket || 'media') as MediaAsset['bucket'];
      const storagePath = String(row.storage_path || '');
      let signedOrPublicUrl = '';
      if (bucket === 'avatars') {
        signedOrPublicUrl = sb.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
      } else {
        const { data: signed } = await sb.storage.from(bucket).createSignedUrl(storagePath, 3600);
        signedOrPublicUrl = signed?.signedUrl || '';
      }
      mediaAssets.push({
        id: String(row.id),
        userId: String(row.user_id),
        projectId: row.project_id ? String(row.project_id) : undefined,
        bucket,
        storagePath,
        fileName: String(row.file_name),
        mediaType: row.media_type as MediaAsset['mediaType'],
        mimeType: String(row.mime_type),
        sizeBytes: Number(row.size_bytes || 0),
        durationSeconds: Number(row.duration_seconds || 0),
        objectUrl: signedOrPublicUrl,
        createdAt: String(row.created_at),
      });
    }

    return {
      user: profileRow ? mapSupabaseProfile(profileRow) : null,
      plans,
      subscription: subRow ? mapSupabaseSubscription(subRow) : null,
      projects: (projectRows || []).map(mapSupabaseProject),
      mediaAssets,
    };
  }

  const res = await fetch(`/api/store/bootstrap?userId=${encodeURIComponent(userId || '')}`);
  const data = await res.json();

  // Rehydrate local media blobs from IndexedDB so uploaded files persist across reloads
  const hydratedAssets: MediaAsset[] = [];
  for (const asset of (data.mediaAssets || []) as MediaAsset[]) {
    if (asset.objectUrl && asset.objectUrl.startsWith('/src/assets/')) {
      hydratedAssets.push(asset);
    } else {
      const blob = await getMediaBlob(asset.id);
      hydratedAssets.push({
        ...asset,
        objectUrl: blob ? URL.createObjectURL(blob) : asset.objectUrl,
      });
    }
  }

  return {
    user: data.user || null,
    plans: data.plans || [],
    subscription: data.subscription || null,
    projects: data.projects || [],
    mediaAssets: hydratedAssets,
  };
}

export async function saveProject(project: StudioProject): Promise<StudioProject> {
  const sb = getSupabaseClient();
  if (sb) {
    const payload = {
      id: project.id,
      user_id: project.userId,
      title: project.title,
      type: project.type,
      aspect_ratio: project.aspectRatio,
      duration_seconds: project.durationSeconds,
      thumbnail_url: project.thumbnailUrl,
      status: project.status,
      timeline_data: project.timelineData,
      photo_data: project.photoData || {},
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from('projects').upsert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapSupabaseProject(data);
  }

  const res = await fetch('/api/store/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save project');
  return data.project;
}

export async function removeProject(projectId: string): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    const { error } = await sb.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(error.message);
    return;
  }

  const res = await fetch(`/api/store/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function uploadMediaFile(params: {
  file: File;
  userId: string;
  projectId?: string;
  bucket?: 'media' | 'exports' | 'avatars';
  mediaType: 'video' | 'image' | 'audio' | 'export';
  durationSeconds?: number;
}): Promise<MediaAsset> {
  const { file, userId, projectId, bucket = 'media', mediaType, durationSeconds = 0 } = params;
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${Date.now()}_${safeName}`;

  const sb = getSupabaseClient();
  if (sb) {
    const { error: uploadErr } = await sb.storage.from(bucket).upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: row, error: dbErr } = await sb
      .from('media_assets')
      .insert({
        id,
        user_id: userId,
        project_id: projectId || null,
        bucket,
        storage_path: storagePath,
        file_name: file.name,
        media_type: mediaType,
        mime_type: file.type,
        size_bytes: file.size,
        duration_seconds: durationSeconds,
      })
      .select('*')
      .single();

    if (dbErr) throw new Error(dbErr.message);

    let url = '';
    if (bucket === 'avatars') {
      url = sb.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
    } else {
      const { data: signed } = await sb.storage.from(bucket).createSignedUrl(storagePath, 3600);
      url = signed?.signedUrl || URL.createObjectURL(file);
    }

    return {
      id: String(row.id),
      userId,
      projectId,
      bucket,
      storagePath,
      fileName: file.name,
      mediaType,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds,
      objectUrl: url,
      createdAt: String(row.created_at),
    };
  }

  // Local persistent mode: store binary blob in IndexedDB + metadata on Express store
  await saveMediaBlob(id, file);
  const objectUrl = URL.createObjectURL(file);
  const asset: MediaAsset = {
    id,
    userId,
    projectId,
    bucket,
    storagePath,
    fileName: file.name,
    mediaType,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    durationSeconds,
    objectUrl,
    createdAt: new Date().toISOString(),
  };

  await fetch('/api/store/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...asset, objectUrl: '' }),
  });

  return asset;
}

export async function deleteMediaAsset(asset: MediaAsset): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    await sb.storage.from(asset.bucket).remove([asset.storagePath]);
    await sb.from('media_assets').delete().eq('id', asset.id);
    return;
  }

  await deleteMediaBlob(asset.id);
  await fetch(`/api/store/media/${encodeURIComponent(asset.id)}`, { method: 'DELETE' });
}

export async function updateUserProfile(
  userId: string,
  updates: { fullName?: string; handle?: string; bio?: string; avatarUrl?: string; newPassword?: string }
): Promise<UserProfile> {
  const sb = getSupabaseClient();
  if (sb) {
    if (updates.newPassword && updates.newPassword.length >= 6) {
      const { error: pwErr } = await sb.auth.updateUser({ password: updates.newPassword });
      if (pwErr) throw new Error(pwErr.message);
    }
    const { data, error } = await sb
      .from('profiles')
      .update({
        full_name: updates.fullName,
        handle: updates.handle,
        bio: updates.bio,
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapSupabaseProfile(data);
  }

  const res = await fetch(`/api/store/profile/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  return data.user;
}

export async function switchSubscriptionPlan(
  userId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual'
): Promise<UserSubscription> {
  const sb = getSupabaseClient();
  if (sb) {
    const now = new Date();
    const end = new Date(now.getTime() + (billingCycle === 'annual' ? 365 : 30) * 86400 * 1000);
    const { data, error } = await sb
      .from('subscriptions')
      .update({
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapSupabaseSubscription(data);
  }

  const res = await fetch('/api/store/subscriptions/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, planId, billingCycle }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update subscription');
  return data.subscription;
}
