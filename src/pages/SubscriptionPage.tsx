import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AppRoute, SubscriptionPlan } from '../types/ark';

interface SubscriptionPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function SubscriptionPage({ onNavigate }: SubscriptionPageProps) {
  const { user, plans, subscription, changePlan } = useAuth();
  const { notify } = useToast();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    subscription?.billingCycle || 'monthly'
  );
  const [confirmPlan, setConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [updating, setUpdating] = useState(false);

  const currentPlan = plans.find((p) => p.id === (subscription?.planId || 'starter')) || plans[0];
  const usedGb = ((user?.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2);

  const handleConfirmChange = async () => {
    if (!confirmPlan) return;
    setUpdating(true);
    try {
      await changePlan(confirmPlan.id, billingCycle);
      notify('success', `Switched to ${confirmPlan.name}`, `Billed ${billingCycle}`);
      setConfirmPlan(null);
    } catch (err) {
      notify('error', 'Plan update failed', err instanceof Error ? err.message : '');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppShell currentRoute="subscription" onNavigate={onNavigate} breadcrumb="Subscription & Billing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Current Plan Summary */}
        <div className="rounded-xl bg-[#0E0E14] border border-white/[0.08] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400">Active Subscription</p>
            <h1 className="font-display text-2xl font-bold text-white mt-1">
              {currentPlan?.name || 'Starter'} Plan
            </h1>
            <p className="text-xs text-zinc-400 mt-1 tabular-nums">
              Billing: <span className="capitalize text-zinc-200">{subscription?.billingCycle || 'monthly'}</span> ·
              Storage used: <span className="text-zinc-200 font-mono">{usedGb} / {currentPlan?.storageLimitGb || 5} GB</span> ·
              Max export: <span className="text-zinc-200">{currentPlan?.maxExportResolution || '720p'}</span>
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#07070A] border border-white/[0.08] self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                billingCycle === 'monthly' ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                billingCycle === 'annual' ? 'bg-[#7C3AED] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual (Save 20%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id && subscription?.billingCycle === billingCycle;
            const monthlyDisplay =
              billingCycle === 'monthly'
                ? plan.monthlyPriceCents / 100
                : Math.round(plan.annualPriceCents / 12 / 100);

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-6 border flex flex-col justify-between ${
                  plan.id === currentPlan?.id
                    ? 'bg-[#12101D] border-[#7C3AED]/70'
                    : 'bg-[#0E0E14] border-white/[0.08]'
                }`}
              >
                <div>
                  <p className="text-xs text-zinc-400">{plan.audience}</p>
                  <h2 className="font-display text-xl font-bold text-white mt-1">{plan.name}</h2>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-white tabular-nums">
                      ${monthlyDisplay}
                    </span>
                    <span className="text-xs text-zinc-400">/ month</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-3">{plan.description}</p>

                  <ul className="mt-6 space-y-2.5 text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span className="tabular-nums">{plan.storageLimitGb} GB cloud storage</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span>Up to {plan.maxExportResolution} FFmpeg exports</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#A78BFA] shrink-0" />
                      <span className="tabular-nums">{plan.aiCreditsMonthly} monthly AI credits</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setConfirmPlan(plan)}
                  className={`mt-8 w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#1A1A26] text-zinc-400 cursor-default'
                      : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                  }`}
                >
                  {isCurrent ? 'Current Active Plan' : `Select ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#111118] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">
              Confirm Plan Change
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Switch your workspace subscription to <span className="font-semibold text-white">{confirmPlan.name}</span> ({billingCycle}) with{' '}
              <span className="font-mono text-white">{confirmPlan.storageLimitGb} GB</span> cloud storage and{' '}
              <span className="font-mono text-white">{confirmPlan.maxExportResolution}</span> exports.
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmPlan(null)}
                className="px-4 py-2 rounded-lg bg-[#191924] text-xs font-medium text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleConfirmChange}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white"
              >
                {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
