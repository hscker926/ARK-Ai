import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VideoEditorPage } from './pages/VideoEditorPage';
import { PhotoEditorPage } from './pages/PhotoEditorPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import type { AppRoute, StudioProject, VideoTemplate } from './types/ark';

const PROTECTED_ROUTES: AppRoute[] = [
  'dashboard',
  'video-editor',
  'photo-editor',
  'projects',
  'subscription',
  'profile',
  'admin',
];

function parseHashRoute(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').trim() as AppRoute;
  const valid: AppRoute[] = [
    'landing',
    'login',
    'register',
    'dashboard',
    'video-editor',
    'photo-editor',
    'projects',
    'subscription',
    'profile',
    'admin',
  ];
  return valid.includes(raw) ? raw : 'landing';
}

function ArkRouter() {
  const { user, plans, loading, upsertProject } = useAuth();
  const { notify } = useToast();

  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    window.location.hash = nextRoute === 'landing' ? '' : `#/${nextRoute}`;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Redirect unauthenticated users trying to open protected studio pages
  const effectiveRoute: AppRoute =
    !loading && !user && PROTECTED_ROUTES.includes(route) ? 'login' : route;

  const handleOpenProject = useCallback(
    (proj: StudioProject) => {
      setActiveProject(proj);
      navigate(proj.type === 'photo' ? 'photo-editor' : 'video-editor');
    },
    [navigate]
  );

  const handleUseTemplate = useCallback(
    async (tpl: VideoTemplate) => {
      if (!user) {
        notify('info', 'Sign in to edit templates', 'Create a free account or sign in to customize this timeline.');
        navigate('register');
        return;
      }
      const proj: StudioProject = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: tpl.title,
        type: 'video',
        aspectRatio: tpl.aspectRatio,
        durationSeconds: tpl.durationSeconds,
        thumbnailUrl: tpl.thumbnailUrl,
        status: 'draft',
        timelineData: structuredClone(tpl.timelineData),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const saved = await upsertProject(proj);
      setActiveProject(saved);
      notify('success', `Loaded template "${tpl.title}"`);
      navigate('video-editor');
    },
    [user, upsertProject, notify, navigate]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070A] text-zinc-300 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
        <p className="text-xs font-medium tracking-wide text-zinc-400">
          Loading ARK AI Studio...
        </p>
      </div>
    );
  }

  switch (effectiveRoute) {
    case 'login':
      return <LoginPage onNavigate={navigate} />;
    case 'register':
      return <RegisterPage onNavigate={navigate} />;
    case 'dashboard':
      return (
        <DashboardPage
          onNavigate={navigate}
          onOpenProject={handleOpenProject}
          onUseTemplate={handleUseTemplate}
        />
      );
    case 'video-editor':
      return (
        <VideoEditorPage
          key={activeProject?.id || 'default-video'}
          project={activeProject?.type === 'video' ? activeProject : null}
          onNavigate={navigate}
          onProjectSaved={(saved) => setActiveProject(saved)}
        />
      );
    case 'photo-editor':
      return (
        <PhotoEditorPage
          key={activeProject?.id || 'default-photo'}
          project={activeProject?.type === 'photo' ? activeProject : null}
          onNavigate={navigate}
          onProjectSaved={(saved) => setActiveProject(saved)}
        />
      );
    case 'projects':
      return <ProjectsPage onNavigate={navigate} onOpenProject={handleOpenProject} />;
    case 'subscription':
      return <SubscriptionPage onNavigate={navigate} />;
    case 'profile':
      return <ProfilePage onNavigate={navigate} />;
    case 'admin':
      return <AdminDashboardPage onNavigate={navigate} />;
    case 'landing':
    default:
      return (
        <LandingPage
          onNavigate={navigate}
          onUseTemplate={handleUseTemplate}
          plans={plans}
          isAuthenticated={Boolean(user)}
        />
      );
  }
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ArkRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
