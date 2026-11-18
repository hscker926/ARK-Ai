import React, { useRef, useState } from 'react';
import { Upload, Loader2, Database, HardDrive, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { SafeImage } from '../components/SafeImage';
import { SupabaseStatusModal } from '../components/SupabaseStatusModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { deleteMediaAsset, uploadMediaFile } from '../services/dataService';
import type { AppRoute } from '../types/ark';

interface ProfilePageProps {
  onNavigate: (route: AppRoute) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, mediaAssets, saveProfile, removeMediaAssetLocal, plans, subscription } = useAuth();
  const { notify } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  const currentPlan = plans.find((p) => p.id === (subscription?.planId || 'starter')) || plans[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({
        fullName: fullName.trim(),
        handle: handle.trim(),
        bio: bio.trim(),
        newPassword: newPassword.length >= 6 ? newPassword : undefined,
      });
      setNewPassword('');
      notify('success', 'Profile updated');
    } catch (err) {
      notify('error', 'Profile update failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const asset = await uploadMediaFile({
        file,
        userId: user.id,
        bucket: 'avatars',
        mediaType: 'image',
      });
      await saveProfile({ avatarUrl: asset.objectUrl || user.avatarUrl });
      notify('success', 'Avatar updated');
    } catch (err) {
      notify('error', 'Avatar upload failed', err instanceof Error ? err.message : '');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = mediaAssets.find((a) => a.id === assetId);
    if (!asset) return;
    await deleteMediaAsset(asset);
    removeMediaAssetLocal(assetId);
    notify('info', `Removed ${asset.fileName}`);
  };

  return (
    <AppShell currentRoute="profile" onNavigate={onNavigate} breadcrumb="User Profile">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Form */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 space-y-5"
          >
            <div className="flex items-center gap-4 pb-5 border-b border-white/[0.07]">
              <SafeImage
                src={user?.avatarUrl}
                alt={user?.fullName || 'Creator Avatar'}
                className="w-16 h-16 rounded-full object-cover border border-white/10 shrink-0"
              />
              <div>
                <h1 className="font-display text-xl font-bold text-white">{user?.fullName}</h1>
                <p className="text-xs text-zinc-400">
                  {user?.email} · Role: <span className="capitalize text-zinc-200">{user?.role}</span>
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] hover:text-white"
                >
                  {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Change Avatar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Creator Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg bg-[#07070A] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                New Password (optional, min 6 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setDbModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <Database className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Supabase Connection
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>

          {/* Storage & Media Library */}
          <div className="lg:col-span-5 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Cloud Media & Quota</h2>
                <HardDrive className="w-4 h-4 text-[#A78BFA]" />
              </div>
              <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                {((user?.storageUsedBytes || 0) / (1024 * 1024)).toFixed(1)} MB used of{' '}
                {currentPlan?.storageLimitGb || 5} GB ({currentPlan?.name || 'Starter'})
              </p>

              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
                {mediaAssets.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Uploaded videos, images, audio, and exported renders appear here.
                  </p>
                ) : (
                  mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[#09090D] border border-white/[0.06] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{asset.fileName}</p>
                        <p className="text-[11px] text-zinc-400 tabular-nums">
                          {asset.bucket} · {(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        aria-label={`Delete ${asset.fileName}`}
                        className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('subscription')}
              className="w-full py-2.5 px-4 rounded-lg bg-[#161621] hover:bg-[#1F1F2E] border border-white/10 text-xs font-medium text-white transition-colors"
            >
              Upgrade Storage Plan
            </button>
          </div>
        </div>
      </div>

      <SupabaseStatusModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </AppShell>
  );
}
