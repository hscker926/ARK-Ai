import React, { useState } from 'react';
import {
  LayoutDashboard,
  Film,
  Image as ImageIcon,
  FolderKanban,
  CreditCard,
  User,
  ShieldCheck,
  LogOut,
  Database,
  Menu,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { SafeImage } from './SafeImage';
import { SupabaseStatusModal } from './SupabaseStatusModal';
import { useAuth } from '../context/AuthContext';
import type { AppRoute } from '../types/ark';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  breadcrumb: string;
  headerActions?: React.ReactNode;
  compactEditor?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  currentRoute,
  onNavigate,
  breadcrumb,
  headerActions,
  compactEditor = false,
  children,
}: AppShellProps) {
  const { user, logout, supabaseConnected } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  const navItems: Array<{ route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { route: 'video-editor', label: 'Video Editor', icon: Film },
    { route: 'photo-editor', label: 'Photo Editor', icon: ImageIcon },
    { route: 'projects', label: 'My Projects', icon: FolderKanban },
    { route: 'subscription', label: 'Subscription', icon: CreditCard },
    { route: 'profile', label: 'User Profile', icon: User },
  ];

  if (user?.role === 'admin') {
    navItems.push({ route: 'admin', label: 'Admin Console', icon: ShieldCheck });
  }

  const handleNav = (route: AppRoute) => {
    setDrawerOpen(false);
    onNavigate(route);
  };

  const handleSignOut = async () => {
    await logout();
    onNavigate('landing');
  };

  const mobileTabs: Array<{ route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { route: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { route: 'video-editor', label: 'Video', icon: Film },
    { route: 'photo-editor', label: 'Photo', icon: ImageIcon },
    { route: 'projects', label: 'Projects', icon: FolderKanban },
    { route: 'profile', label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#07070A] text-[#F4F4F7] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#0C0C11] border-r border-white/[0.07] ${
          compactEditor ? 'w-56' : 'w-64'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07]">
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded-md"
          >
            <BrandLogo />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.07] space-y-2">
          <button
            type="button"
            onClick={() => setDbModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Database className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Supabase Sync
            </span>
            <span className={supabaseConnected ? 'text-emerald-400' : 'text-zinc-500'}>
              {supabaseConnected ? 'Cloud' : 'Setup'}
            </span>
          </button>

          {user && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-[#12121A] border border-white/[0.06]">
              <SafeImage
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
                <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#07070A]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open workspace navigation"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="lg:hidden font-display font-bold text-white whitespace-nowrap">ARK AI</span>
              <span className="lg:hidden text-zinc-600" aria-hidden="true">/</span>
              <span className="text-zinc-200 font-medium truncate">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}
          </div>
        </header>

        {/* Main Viewport */}
        <main className={`flex-1 min-w-0 ${compactEditor ? 'pb-16 lg:pb-0' : 'pb-20 lg:pb-8'}`}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (<= 15% mobile height) */}
      {!compactEditor && (
        <nav
          aria-label="Mobile workspace navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#0C0C11]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5"
        >
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentRoute === tab.route;
            return (
              <button
                key={tab.route}
                type="button"
                onClick={() => handleNav(tab.route)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-medium transition-colors ${
                  active ? 'text-[#A78BFA]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Tablet / Mobile Slide-Out Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0C0C11] border-r border-white/[0.08] flex flex-col h-full z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07]">
              <BrandLogo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close drawer"
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-[#7C3AED] text-white' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-white/[0.07] space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setDbModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5"
              >
                <Database className="w-4 h-4 text-[#8B5CF6]" />
                Supabase Connection Setup
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <SupabaseStatusModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </div>
  );
}
