import { useState } from 'react';
import { ArrowRight, Check, Film, Scissors, Sliders, Sparkles, Database } from 'lucide-react';
import { TopNavbar } from '../components/TopNavbar';
import { SafeImage } from '../components/SafeImage';
import { BrandLogo } from '../components/BrandLogo';
import { SupabaseStatusModal } from '../components/SupabaseStatusModal';
import { VIDEO_TEMPLATES } from '../data/templates';
import type { AppRoute, SubscriptionPlan, VideoTemplate } from '../types/ark';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
  onUseTemplate: (template: VideoTemplate) => void;
  plans: SubscriptionPlan[];
  isAuthenticated: boolean;
}

export function LandingPage({
  onNavigate,
  onUseTemplate,
  plans,
  isAuthenticated,
}: LandingPageProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [dbModalOpen, setDbModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07070A] text-[#F4F4F7]">
      <TopNavbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} />

      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-wide text-[#A78BFA] mb-4">
              ARK AI · Professional AI Video Editor
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] [text-wrap:balance]">
              Precision timeline editing and AI post-production in one dark studio.
            </h1>
            <p className="mt-5 text-base text-zinc-400 leading-relaxed max-w-lg">
              Cut multi-track video, grade color, layer typography, and export crisp MP4 files directly in your browser with FFmpeg.wasm—built for Android mobile, tablet, and desktop.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'video-editor' : 'register')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <span>{isAuthenticated ? 'Open Video Editor' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'login')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#12121A] hover:bg-[#191924] border border-white/10 text-zinc-200 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 flex">
            <div className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-[#101018]">
              <SafeImage
                src="/src/assets/images/hero_studio_suite_1794986574048.jpg"
                alt="ARK AI dual-monitor dark video color grading workstation"
                className="w-full h-64 sm:h-80 lg:h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#07070A] via-[#07070A]/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
                <span>Multi-track NLE · Photo Studio · FFmpeg.wasm</span>
                <span className="font-mono text-zinc-400 tabular-nums">16:9 · 9:16 · 1:1 · 4:5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quantitative Proof Row */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-white/[0.08]">
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">4K 60fps</p>
            <p className="text-xs text-zinc-400 mt-1">Browser-native FFmpeg.wasm render pipeline</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">3 Tracks</p>
            <p className="text-xs text-zinc-400 mt-1">Synchronized video, text overlay, and audio layers</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">2 Studios</p>
            <p className="text-xs text-zinc-400 mt-1">Full timeline video editor and canvas photo lab</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums">3 Viewports</p>
            <p className="text-xs text-zinc-400 mt-1">Responsive touch controls for mobile, tablet, desktop</p>
          </div>
        </div>
      </section>

      {/* 2. Capabilities Bento Grid */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-white/[0.07]">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Built for real cuts, real exports, and cross-device speed
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Every control connects directly to your browser media pipeline and cloud project store.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                <Film className="w-4 h-4" />
                <span>01. Multi-Track Timeline & FFmpeg.wasm</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                Trim, split, layer titles, and mix audio without leaving your browser
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed max-w-xl">
                Scrub frame-by-frame with keyboard and touch precision. Split clips at the playhead, apply crossfades or slide transitions, adjust crop and 90-degree rotation, and export MP4 or WebM locally via FFmpeg.wasm.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
              <span>Undo / Redo Stack</span>
              <span>·</span>
              <span>Custom Aspect Ratios</span>
              <span>·</span>
              <span>Real-Time Canvas Preview</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                <Sliders className="w-4 h-4" />
                <span>02. Dedicated Photo Studio</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                Color grade thumbnails and stills
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Adjust exposure, contrast, saturation, vignette, and aspect crop ratios, add typography overlays, and export high-resolution PNG, JPEG, or WebP files.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'photo-editor' : 'register')}
              className="mt-6 text-left text-xs font-medium text-[#A78BFA] hover:text-white transition-colors"
            >
              Open Photo Studio →
            </button>
          </div>

          <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                <Sparkles className="w-4 h-4" />
                <span>03. AI Creative Assistant</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                Shot scripts, timed captions, and color recipes
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Draft production shot lists, generate timed subtitle blocks, and get scene-specific color grading presets powered by server-side Gemini AI.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                <Scissors className="w-4 h-4" />
                <span>04. Supabase Cloud Storage & Admin Governance</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                PostgreSQL project state, bucket quotas, and role-based team controls
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed max-w-xl">
                Persist timelines in Supabase PostgreSQL, store raw clips and exports in private storage buckets, and manage users, plans, and storage allocations from the built-in Admin Console.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Video Templates Showcase */}
      <section id="templates" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-white/[0.07]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Production-ready timeline templates
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Load any sequence straight into the Video Editor with pre-timed clips, grades, and titles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIDEO_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="group rounded-xl bg-[#0E0E14] border border-white/[0.08] overflow-hidden flex flex-col"
            >
              <div className="aspect-video overflow-hidden bg-[#14141F]">
                <SafeImage
                  src={tpl.thumbnailUrl}
                  alt={tpl.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-zinc-400">
                    {tpl.category} · {tpl.aspectRatio} · {tpl.durationSeconds}s
                  </p>
                  <h3 className="font-display text-lg font-semibold text-white mt-1.5">
                    {tpl.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl)}
                  className="mt-5 w-full py-2.5 px-4 rounded-lg bg-[#181823] hover:bg-[#7C3AED] border border-white/[0.08] text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Open in Video Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-white/[0.07]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Transparent studio plans
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Start free with full browser editing and scale cloud storage as your library grows.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#12121A] border border-white/[0.08] self-start">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                billing === 'monthly' ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                billing === 'annual' ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price =
              billing === 'monthly'
                ? plan.monthlyPriceCents / 100
                : Math.round(plan.annualPriceCents / 12 / 100);
            const highlighted = plan.id === 'pro';
            return (
              <div
                key={plan.id}
                className={`rounded-xl p-6 flex flex-col justify-between border ${
                  highlighted
                    ? 'bg-[#12101D] border-[#7C3AED]/60'
                    : 'bg-[#0E0E14] border-white/[0.08]'
                }`}
              >
                <div>
                  <p className="text-xs text-zinc-400">{plan.audience}</p>
                  <h3 className="font-display text-xl font-bold text-white mt-1">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-white tabular-nums">
                      ${price}
                    </span>
                    <span className="text-xs text-zinc-400">/ month</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>

                  <ul className="mt-6 space-y-2.5 text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span className="tabular-nums">{plan.storageLimitGb} GB cloud storage</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span>Up to {plan.maxExportResolution} FFmpeg export</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span className="tabular-nums">{plan.aiCreditsMonthly} monthly AI assists</span>
                    </li>
                    {plan.features.slice(0, 1).map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? 'subscription' : 'register')}
                  className={`mt-8 w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    highlighted
                      ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                      : 'bg-[#181823] hover:bg-[#232334] text-white border border-white/10'
                  }`}
                >
                  {plan.monthlyPriceCents === 0 ? 'Start Free' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Quiet Footer */}
      <footer className="border-t border-white/[0.07] bg-[#060608]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo />
            <span className="text-xs text-zinc-500">Professional AI Video Editor</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => setDbModalOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Supabase Setup Guide
            </button>
            <button type="button" onClick={() => onNavigate('login')} className="hover:text-white transition-colors">
              Sign In
            </button>
            <button type="button" onClick={() => onNavigate('register')} className="hover:text-white transition-colors">
              Register
            </button>
            <span className="text-zinc-600">© {new Date().getFullYear()} ARK AI</span>
          </div>
        </div>
      </footer>

      <SupabaseStatusModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </div>
  );
}
