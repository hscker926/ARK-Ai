import { useMemo, useState } from 'react';
import { Search, Plus, Film, Image as ImageIcon, Trash2, Copy, Edit3 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AppRoute, StudioProject } from '../types/ark';

interface ProjectsPageProps {
  onNavigate: (route: AppRoute) => void;
  onOpenProject: (project: StudioProject) => void;
}

export function ProjectsPage({ onNavigate, onOpenProject }: ProjectsPageProps) {
  const { user, projects, upsertProject, deleteProjectById } = useAuth();
  const { notify } = useToast();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'photo'>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (query.trim() && !p.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [projects, filterType, query]);

  const handleCreateQuick = async (type: 'video' | 'photo') => {
    if (!user) return;
    const proj: StudioProject = {
      id: crypto.randomUUID(),
      userId: user.id,
      title: type === 'video' ? 'New Video Sequence' : 'New Photo Grade',
      type,
      aspectRatio: type === 'video' ? '16:9' : '4:5',
      durationSeconds: type === 'video' ? 5 : 0,
      thumbnailUrl:
        type === 'video'
          ? '/src/assets/images/template_cinematic_reel_1794986573258.jpg'
          : '/src/assets/images/template_product_launch_1794986574426.jpg',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timelineData: { clips: [], texts: [], audios: [] },
    };
    const saved = await upsertProject(proj);
    onOpenProject(saved);
  };

  const handleDuplicate = async (proj: StudioProject) => {
    const copy: StudioProject = {
      ...proj,
      id: crypto.randomUUID(),
      title: `${proj.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertProject(copy);
    notify('success', 'Project duplicated');
  };

  const handleSaveRename = async (proj: StudioProject) => {
    if (!renameText.trim()) return;
    await upsertProject({ ...proj, title: renameText.trim() });
    setRenamingId(null);
    notify('success', 'Project renamed');
  };

  const handleDelete = async (proj: StudioProject) => {
    await deleteProjectById(proj.id);
    notify('info', `Deleted "${proj.title}"`);
  };

  return (
    <AppShell
      currentRoute="projects"
      onNavigate={onNavigate}
      breadcrumb="My Projects"
      headerActions={
        <button
          type="button"
          onClick={() => handleCreateQuick('video')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-medium whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Video</span>
        </button>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects by title..."
              className="w-full rounded-lg bg-[#0E0E14] border border-white/10 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#0E0E14] border border-white/[0.08] self-start">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'video', label: 'Video' },
                { id: 'photo', label: 'Photo' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === tab.id ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-12 text-center space-y-4">
            <p className="text-sm text-zinc-400">
              {projects.length === 0
                ? 'You have no saved projects yet.'
                : 'No projects match your current filter.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCreateQuick('video')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-xs font-medium"
              >
                <Film className="w-4 h-4" />
                Create Video Project
              </button>
              <button
                type="button"
                onClick={() => handleCreateQuick('photo')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161621] border border-white/10 text-zinc-200 text-xs font-medium"
              >
                <ImageIcon className="w-4 h-4" />
                Create Photo Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
              >
                <button
                  type="button"
                  onClick={() => onOpenProject(proj)}
                  className="text-left group block"
                >
                  <div className="aspect-video bg-[#151520] overflow-hidden">
                    <SafeImage
                      src={proj.thumbnailUrl}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                </button>

                <div className="p-4 space-y-3">
                  {renamingId === proj.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        className="flex-1 rounded bg-[#07070A] border border-[#7C3AED] px-2.5 py-1 text-xs text-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(proj)}
                        className="px-2.5 py-1 rounded bg-[#7C3AED] text-xs text-white"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj)}
                        className="text-sm font-semibold text-white hover:text-[#A78BFA] transition-colors truncate block w-full text-left"
                      >
                        {proj.title}
                      </button>
                      <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                        {proj.type === 'video' ? `Video · ${proj.durationSeconds}s` : 'Photo'} · {proj.aspectRatio} ·{' '}
                        <span className="capitalize">{proj.status}</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenProject(proj)}
                      className="text-xs font-medium text-[#A78BFA] hover:text-white transition-colors"
                    >
                      Open in Studio
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(proj.id);
                          setRenameText(proj.title);
                        }}
                        aria-label="Rename project"
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(proj)}
                        aria-label="Duplicate project"
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(proj)}
                        aria-label="Delete project"
                        className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
