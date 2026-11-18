import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchBootstrapData,
  getSavedSessionUserId,
  loginWithCredentials,
  logoutSession,
  registerAccount,
  removeProject,
  saveProject,
  switchSubscriptionPlan,
  updateUserProfile,
} from '../services/dataService';
import { isSupabaseConfigured } from '../lib/supabase';
import type { MediaAsset, StudioProject, SubscriptionPlan, UserProfile, UserSubscription } from '../types/ark';

interface AuthContextValue {
  user: UserProfile | null;
  plans: SubscriptionPlan[];
  subscription: UserSubscription | null;
  projects: StudioProject[];
  mediaAssets: MediaAsset[];
  loading: boolean;
  supabaseConnected: boolean;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upsertProject: (project: StudioProject) => Promise<StudioProject>;
  deleteProjectById: (projectId: string) => Promise<void>;
  addMediaAssetLocal: (asset: MediaAsset) => void;
  removeMediaAssetLocal: (assetId: string) => void;
  saveProfile: (updates: { fullName?: string; handle?: string; bio?: string; avatarUrl?: string; newPassword?: string }) => Promise<void>;
  changePlan: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const savedId = getSavedSessionUserId();
      const data = await fetchBootstrapData(savedId);
      setUser(data.user);
      setPlans(data.plans);
      setSubscription(data.subscription);
      setProjects(data.projects);
      setMediaAssets(data.mediaAssets);
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginWithCredentials(email, password);
      setUser(result.user);
      setSubscription(result.subscription);
      await refreshData();
    },
    [refreshData]
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const result = await registerAccount(fullName, email, password);
      setUser(result.user);
      setSubscription(result.subscription);
      await refreshData();
    },
    [refreshData]
  );

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    setSubscription(null);
    setProjects([]);
    setMediaAssets([]);
  }, []);

  const upsertProject = useCallback(async (project: StudioProject) => {
    const saved = await saveProject(project);
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return [saved, ...prev];
    });
    return saved;
  }, []);

  const deleteProjectById = useCallback(async (projectId: string) => {
    await removeProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const addMediaAssetLocal = useCallback((asset: MediaAsset) => {
    setMediaAssets((prev) => [asset, ...prev]);
    setUser((prev) =>
      prev ? { ...prev, storageUsedBytes: prev.storageUsedBytes + asset.sizeBytes } : prev
    );
  }, []);

  const removeMediaAssetLocal = useCallback((assetId: string) => {
    setMediaAssets((prev) => {
      const target = prev.find((a) => a.id === assetId);
      if (target) {
        setUser((u) =>
          u ? { ...u, storageUsedBytes: Math.max(0, u.storageUsedBytes - target.sizeBytes) } : u
        );
      }
      return prev.filter((a) => a.id !== assetId);
    });
  }, []);

  const saveProfile = useCallback(
    async (updates: { fullName?: string; handle?: string; bio?: string; avatarUrl?: string; newPassword?: string }) => {
      if (!user) return;
      const updated = await updateUserProfile(user.id, updates);
      setUser(updated);
    },
    [user]
  );

  const changePlan = useCallback(
    async (planId: string, billingCycle: 'monthly' | 'annual') => {
      if (!user) return;
      const updated = await switchSubscriptionPlan(user.id, planId, billingCycle);
      setSubscription(updated);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        plans,
        subscription,
        projects,
        mediaAssets,
        loading,
        supabaseConnected: isSupabaseConfigured(),
        refreshData,
        login,
        register,
        logout,
        upsertProject,
        deleteProjectById,
        addMediaAssetLocal,
        removeMediaAssetLocal,
        saveProfile,
        changePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
