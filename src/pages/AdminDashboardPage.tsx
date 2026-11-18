import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  FolderKanban,
  CreditCard,
  HardDrive,
  Search,
  Trash2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type {
  AppRoute,
  MediaAsset,
  StudioProject,
  SubscriptionPlan,
  UserProfile,
  UserSubscription,
} from '../types/ark';

interface AdminDashboardPageProps {
  onNavigate: (route: AppRoute) => void;
}

type AdminTab = 'overview' | 'users' | 'projects' | 'plans' | 'storage' | 'subscriptions';

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { user } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'local' | 'supabase'>('local');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Editable Plan Modal State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      setSource(data.source || 'local');
      setUsers(data.users || []);
      setProjects(data.projects || []);
      setPlans(data.plans || []);
      setSubscriptions(data.subscriptions || []);
      setMediaAssets(data.mediaAssets || []);
    } catch (err) {
      notify('error', 'Failed to load admin overview', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (user?.role !== 'admin') {
    return (
      <AppShell currentRoute="admin" onNavigate={onNavigate} breadcrumb="Admin Console">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="font-display text-xl font-bold text-white">Administrator Access Required</h1>
          <p className="text-sm text-zinc-400">
            Your current account role is <span className="text-white">{user?.role || 'guest'}</span>. Sign in with an admin account to manage users, plans, and storage.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const totalStorageMb = (
    users.reduce((acc, u) => acc + (u.storageUsedBytes || 0), 0) /
    (1024 * 1024)
  ).toFixed(1);

  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;

  const handleToggleUserRole = async (u: UserProfile) => {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, role: nextRole } : item)));
      notify('success', `Updated ${u.fullName} role to ${nextRole}`);
    }
  };

  const handleToggleUserStatus = async (u: UserProfile) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item))
      );
      notify('info', `${u.fullName} marked as ${nextStatus}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const res = await fetch(`/api/store/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      notify('info', 'Project removed');
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    const res = await fetch(`/api/admin/plans/${encodeURIComponent(editingPlan.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPlan),
    });
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans);
      setEditingPlan(null);
      notify('success', `Saved ${editingPlan.name} plan`);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const res = await fetch(`/api/store/media/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
    if (res.ok) {
      setMediaAssets((prev) => prev.filter((a) => a.id !== assetId));
      notify('info', 'Storage object removed');
    }
  };

  const handleUpdateSubscription = async (
    sub: UserSubscription,
    updates: Partial<Pick<UserSubscription, 'planId' | 'status'>>
  ) => {
    const res = await fetch(`/api/admin/subscriptions/${encodeURIComponent(sub.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? data.subscription : s)));
      notify('success', 'Subscription updated');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery.trim() ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bucketStats = ['media', 'exports', 'avatars'].map((bucket) => {
    const items = mediaAssets.filter((a) => a.bucket === bucket);
    const bytes = items.reduce((s, i) => s + (i.sizeBytes || 0), 0);
    return { bucket, count: items.length, mb: (bytes / (1024 * 1024)).toFixed(2) };
  });

  return (
    <AppShell
      currentRoute="admin"
      onNavigate={onNavigate}
      breadcrumb="Admin Console"
      headerActions={
        <span className="text-xs text-zinc-400">
          Data Source: <span className="text-zinc-200 capitalize">{source}</span>
        </span>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/[0.08]">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: `Users (${users.length})` },
              { id: 'projects', label: `Projects (${projects.length})` },
              { id: 'plans', label: `Plans (${plans.length})` },
              { id: 'storage', label: 'Storage' },
              { id: 'subscriptions', label: 'Subscriptions' },
            ] as Array<{ id: AdminTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#A78BFA]" />
            Loading admin workspace...
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total Users</span>
                      <Users className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
                      {users.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Active Subscriptions</span>
                      <CreditCard className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
                      {activeSubsCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Studio Projects</span>
                      <FolderKanban className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
                      {projects.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Storage Consumed</span>
                      <HardDrive className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
                      {totalStorageMb} MB
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5">
                  <h2 className="font-display text-base font-semibold text-white mb-4">
                    Storage Bucket Distribution
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {bucketStats.map((b) => (
                      <div key={b.bucket} className="rounded-lg bg-[#09090D] border border-white/[0.06] p-4">
                        <p className="font-mono text-xs text-[#A78BFA]">{b.bucket}</p>
                        <p className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                          {b.mb} MB
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">{b.count} stored objects</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGE USERS */}
            {tab === 'users' && (
              <div className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter users..."
                    className="w-full rounded-lg bg-[#0E0E14] border border-white/10 pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.07] text-zinc-400">
                      <tr>
                        <th className="py-3 px-4 font-medium">User</th>
                        <th className="py-3 px-4 font-medium">Role</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Storage</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <p className="font-medium text-white">{u.fullName}</p>
                            <p className="text-zinc-400">{u.email}</p>
                          </td>
                          <td className="py-3 px-4 capitalize text-zinc-300">{u.role}</td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                              }
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-300">
                            {((u.storageUsedBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              className="px-2.5 py-1 rounded bg-[#181824] hover:bg-[#232334] text-zinc-200"
                            >
                              Toggle Role
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className="px-2.5 py-1 rounded bg-[#181824] hover:bg-rose-500/20 text-zinc-200"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MANAGE PROJECTS */}
            {tab === 'projects' && (
              <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.07] text-zinc-400">
                    <tr>
                      <th className="py-3 px-4 font-medium">Project Title</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Aspect</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium text-white">{p.title}</td>
                        <td className="py-3 px-4 capitalize text-zinc-300">{p.type}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{p.aspectRatio}</td>
                        <td className="py-3 px-4 capitalize text-zinc-300">{p.status}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181824] hover:bg-rose-500/20 text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MANAGE PLANS */}
            {tab === 'plans' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{p.name}</h3>
                      <p className="font-mono text-xl font-semibold text-[#A78BFA] mt-2 tabular-nums">
                        ${(p.monthlyPriceCents / 100).toFixed(0)}/mo · ${(p.annualPriceCents / 100).toFixed(0)}/yr
                      </p>
                      <p className="text-xs text-zinc-400 mt-2 tabular-nums">
                        {p.storageLimitGb} GB · {p.maxExportResolution} · {p.aiCreditsMonthly} AI credits
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlan({ ...p })}
                      className="w-full py-2 rounded-lg bg-[#181824] hover:bg-[#7C3AED] text-xs font-medium text-white transition-colors"
                    >
                      Edit Plan Limits
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* MANAGE STORAGE */}
            {tab === 'storage' && (
              <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.07] text-zinc-400">
                    <tr>
                      <th className="py-3 px-4 font-medium">File Name</th>
                      <th className="py-3 px-4 font-medium">Bucket</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium text-right">Size</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {mediaAssets.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium text-white">{a.fileName}</td>
                        <td className="py-3 px-4 font-mono text-[#A78BFA]">{a.bucket}</td>
                        <td className="py-3 px-4 capitalize text-zinc-300">{a.mediaType}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-300">
                          {(a.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(a.id)}
                            className="px-2.5 py-1 rounded bg-[#181824] hover:bg-rose-500/20 text-rose-300"
                          >
                            Purge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MANAGE SUBSCRIPTIONS */}
            {tab === 'subscriptions' && (
              <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.07] text-zinc-400">
                    <tr>
                      <th className="py-3 px-4 font-medium">Subscriber</th>
                      <th className="py-3 px-4 font-medium">Plan</th>
                      <th className="py-3 px-4 font-medium">Cycle</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {subscriptions.map((sub) => {
                      const owner = users.find((u) => u.id === sub.userId);
                      return (
                        <tr key={sub.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-white">{owner?.fullName || sub.userId}</p>
                            <p className="text-zinc-400">{owner?.email || ''}</p>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={sub.planId}
                              onChange={(e) =>
                                handleUpdateSubscription(sub, { planId: e.target.value })
                              }
                              className="rounded bg-[#07070A] border border-white/10 px-2.5 py-1 text-xs text-white"
                            >
                              {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 capitalize text-zinc-300">{sub.billingCycle}</td>
                          <td className="py-3 px-4">
                            <select
                              value={sub.status}
                              onChange={(e) =>
                                handleUpdateSubscription(sub, {
                                  status: e.target.value as UserSubscription['status'],
                                })
                              }
                              className="rounded bg-[#07070A] border border-white/10 px-2.5 py-1 text-xs text-white"
                            >
                              <option value="active">Active</option>
                              <option value="trialing">Trialing</option>
                              <option value="past_due">Past Due</option>
                              <option value="canceled">Canceled</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#111118] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">
              Edit {editingPlan.name} Plan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400">Monthly Price (cents)</label>
                <input
                  type="number"
                  value={editingPlan.monthlyPriceCents}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, monthlyPriceCents: Number(e.target.value) })
                  }
                  className="w-full mt-1 rounded bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Storage Limit (GB)</label>
                <input
                  type="number"
                  value={editingPlan.storageLimitGb}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, storageLimitGb: Number(e.target.value) })
                  }
                  className="w-full mt-1 rounded bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Max Export</label>
                <select
                  value={editingPlan.maxExportResolution}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      maxExportResolution: e.target.value as '720p' | '1080p' | '4K',
                    })
                  }
                  className="w-full mt-1 rounded bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white"
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">AI Credits / Mo</label>
                <input
                  type="number"
                  value={editingPlan.aiCreditsMonthly}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, aiCreditsMonthly: Number(e.target.value) })
                  }
                  className="w-full mt-1 rounded bg-[#07070A] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-lg bg-[#191924] text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="px-4 py-2 rounded-lg bg-[#7C3AED] text-xs font-semibold text-white"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
