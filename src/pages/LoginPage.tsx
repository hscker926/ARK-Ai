import React, { useState } from 'react';
import { ArrowLeft, Loader2, Shield, User } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AppRoute } from '../types/ark';

interface LoginPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, supabaseConnected } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      notify('success', 'Signed in to ARK AI Studio');
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLocalLogin = async (presetEmail: string, presetPass: string, target: AppRoute) => {
    setError('');
    setSubmitting(true);
    try {
      await login(presetEmail, presetPass);
      notify('success', 'Signed in to local workspace');
      onNavigate(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070A] text-[#F4F4F7] flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </button>

        <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 sm:p-8">
          <div className="mb-6">
            <BrandLogo />
            <h1 className="font-display text-2xl font-bold text-white mt-5">
              Sign in to your studio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Access your video timelines, cloud media library, and exports.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg bg-[#07070A] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {!supabaseConnected && (
            <div className="mt-6 pt-5 border-t border-white/[0.08]">
              <p className="text-xs text-zinc-400 mb-3">
                Local preview accounts (active until Supabase env keys are connected):
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => quickLocalLogin('creator@arkstudio.app', 'ArkStudio2026!', 'dashboard')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151520] hover:bg-[#1D1D2C] border border-white/10 text-xs font-medium text-zinc-200 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#A78BFA]" />
                  Creator Demo
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => quickLocalLogin('admin@arkstudio.app', 'ArkAdmin2026!', 'admin')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151520] hover:bg-[#1D1D2C] border border-white/10 text-xs font-medium text-zinc-200 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-[#A78BFA]" />
                  Admin Demo
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-zinc-400">
            New to ARK AI?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-[#A78BFA] hover:text-white font-medium transition-colors"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
