import { useEffect, useState } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';

interface SupabaseStatusModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupabaseStatusModal({ open, onClose }: SupabaseStatusModalProps) {
  const [status, setStatus] = useState<{
    supabaseClientConfigured: boolean;
    supabaseAdminConfigured: boolean;
    geminiConfigured: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/config/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open]);

  if (!open) return null;

  const envSnippet = `VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"`;

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded-xl bg-[#111118] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="font-display text-lg font-semibold text-white">
              Supabase Connection Requirements
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-zinc-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#0B0B10] border border-white/[0.07] p-3">
              <p className="text-xs text-zinc-400">Client SDK</p>
              <div className="flex items-center gap-1.5 mt-1 font-medium">
                {status?.supabaseClientConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Local Mode</span>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-[#0B0B10] border border-white/[0.07] p-3">
              <p className="text-xs text-zinc-400">Admin Bridge</p>
              <div className="flex items-center gap-1.5 mt-1 font-medium">
                {status?.supabaseAdminConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Pending Key</span>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-[#0B0B10] border border-white/[0.07] p-3">
              <p className="text-xs text-zinc-400">AI Assist API</p>
              <div className="flex items-center gap-1.5 mt-1 font-medium">
                {status?.geminiConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Ready</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Not Set</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-zinc-400 leading-relaxed">
            ARK AI automatically activates Supabase Authentication, PostgreSQL persistence, and Storage buckets
            (<code className="text-zinc-200 font-mono text-xs">media</code>,{' '}
            <code className="text-zinc-200 font-mono text-xs">exports</code>,{' '}
            <code className="text-zinc-200 font-mono text-xs">avatars</code>) once your environment variables are set and{' '}
            <code className="text-zinc-200 font-mono text-xs">supabase/schema.sql</code> is executed in your Supabase SQL Editor.
          </p>

          <div className="rounded-lg bg-[#07070A] border border-white/[0.08] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">Required Environment Variables</span>
              <button
                type="button"
                onClick={copyEnv}
                className="inline-flex items-center gap-1.5 text-xs text-[#A78BFA] hover:text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy template'}
              </button>
            </div>
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
              {envSnippet}
            </pre>
          </div>

          <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400">
            <li>Create a Supabase project and run <code className="text-zinc-200">supabase/schema.sql</code> in SQL Editor.</li>
            <li>Enable Email/Password authentication in Supabase Auth &gt; Providers.</li>
            <li>Set the 4 variables above in your environment or Settings &gt; Secrets panel and restart the server.</li>
          </ol>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
