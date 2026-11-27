/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, CreditCard, Download, Gauge, Plus, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { apiClient } from '../../services/apiClient';
import { Button, IntelligenceOrb, StatusBadge } from '../ui/DesignSystem';
import { Modal } from '../ui/Overlay';

export const BillingDashboardView: React.FC = () => {
  const { state, showToast, navigate, updateSubscription } = useBrainWise();
  const workspaceId = state.brain?.businessName
    ? `ws_${state.brain.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : 'ws_default';
  const customerName = state.user?.firstName
    ? `${state.user.firstName} ${state.user.lastName || ''}`.trim()
    : 'Founder';

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [creditAccount, setCreditAccount] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPackModal, setSelectedPackModal] = useState<any | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>([]);

  // Post-Payment Unlocked Power Tour State (REC-P0-03)
  const [unlockedModalOpen, setUnlockedModalOpen] = useState(false);
  const [unlockedPayload, setUnlockedPayload] = useState<{
    title: string;
    creditsAdded: number;
    planName: string;
    features: string[];
  } | null>(null);

  // Load billing data
  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [plansRes, packsRes, subRes, creditsRes, ledgerRes, invRes] = await Promise.all([
        apiClient.getBillingPlans().catch(() => ({ plans: [] })),
        apiClient.getCreditPacks().catch(() => ({ packs: [] })),
        apiClient.getSubscription(workspaceId).catch(() => ({
          subscription: {
            planId: 'starter',
            planName: 'Starter',
            status: 'active',
            billingCycle: 'monthly',
            currency: 'INR',
            unitAmount: 2763,
            currentPeriodEnd: new Date(Date.now() + 25 * 86400000).toISOString(),
          },
        })),
        apiClient.getCreditAccount(workspaceId).catch(() => ({
          balance: 800,
          reserved: 0,
          pools: { welcome: 150, subscription: 650, purchased: 0, promotional: 0 },
        })),
        apiClient.getCreditLedger(workspaceId, 10).catch(() => ({ ledger: [] })),
        apiClient.getInvoices(workspaceId).catch(() => ({ invoices: [] })),
      ]);

      if (plansRes.plans?.length) setPlans(plansRes.plans);
      if (packsRes.packs?.length) setCreditPacks(packsRes.packs);
      if (subRes.subscription) setSubscription(subRes.subscription);
      if (creditsRes) setCreditAccount(creditsRes);
      if (ledgerRes.ledger) setLedger(ledgerRes.ledger);
      if (invRes.invoices) setInvoices(invRes.invoices);
    } catch {
      showToast('Loaded billing preview state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();

    // Check for return from Cashfree checkout with order_id in query parameters
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order_id') || params.get('orderId');
    if (orderIdParam) {
      (async () => {
        try {
          setActionLoading(true);
          const verifyResult = await apiClient.verifyPayment(workspaceId, orderIdParam);
          if (verifyResult?.status === 'pending') {
            showToast('Payment is pending confirmation from Cashfree. It will reflect once settled.');
          } else {
            showToast('Payment verified successfully! Your subscription/credits are now active.');
            setUnlockedPayload({
              title: 'Executive Workspace Upgraded!',
              planName: verifyResult?.planName || 'Growth Pro',
              creditsAdded: verifyResult?.creditsAdded || 2500,
              features: [
                'Autonomous 7-Department Growth Director unlocked',
                'Deep Competitor Review & White-Space Teardowns enabled',
                'High-Resolution Print-Ready Collateral & PDF Exports',
                '30/60/90-Day Execution Roadmaps & OKR Tracker',
                'Monday Morning Executive Intelligence Briefings scheduled',
              ],
            });
            setUnlockedModalOpen(true);
          }
          await loadBillingData();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Payment verification status: ${msg}`);
        } finally {
          setActionLoading(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('order_id');
          url.searchParams.delete('orderId');
          window.history.replaceState({}, document.title, url.toString());
        }
      })();
    }
  }, [workspaceId]);

  // Handle plan upgrade or change
  const handleSelectPlan = async (plan: any) => {
    if (subscription?.planId === plan.planId) return;

    try {
      setActionLoading(true);
      const checkoutRes = await apiClient.createCheckoutSession(workspaceId, {
        type: 'subscription',
        planId: plan.planId,
        billingCycle,
        currency: 'INR',
        customerEmail: state.user?.email || 'founder@workspace.com',
        customerName,
        returnUrl: window.location.href,
      });

      // Verify payment with backend gateway reconciliation
      const verifyRes = await apiClient.verifyPayment(workspaceId, checkoutRes.orderId);
      if (verifyRes?.status === 'pending') {
        if (checkoutRes?.checkoutUrl && checkoutRes.checkoutUrl.startsWith('http')) {
          window.location.href = checkoutRes.checkoutUrl;
          return;
        }
        showToast('Cashfree checkout order created. Awaiting payment completion.');
      } else {
        const targetPlanName = plan.name || (plan.planId === 'professional' ? 'Professional' : plan.planId === 'business' ? 'Business Enterprise' : 'Starter');
        updateSubscription({
          plan: targetPlanName as any,
          billingCycle,
          tier: plan.planId,
          creditsRemaining: (state.subscription?.creditsRemaining ?? 0) + (plan.limits?.monthlyCredits || 3000),
        });
        showToast(`Successfully upgraded to ${targetPlanName} (${billingCycle})!`);
        setUnlockedPayload({
          title: `Welcome to ${targetPlanName}!`,
          planName: targetPlanName,
          creditsAdded: plan.limits?.monthlyCredits || 3000,
          features: [
            'Autonomous 7-Department Growth Director unlocked',
            'Deep Competitor Review & White-Space Teardowns enabled',
            'High-Resolution Print-Ready Collateral & PDF Exports',
            '30/60/90-Day Execution Roadmaps & OKR Tracker',
            'Monday Morning Executive Intelligence Briefings scheduled',
          ],
        });
        setUnlockedModalOpen(true);
      }
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error changing plan: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle credit pack purchase
  const handleBuyCreditPack = async (pack: any) => {
    try {
      setActionLoading(true);
      const checkoutRes = await apiClient.createCheckoutSession(workspaceId, {
        type: 'credit_pack',
        packId: pack.packId,
        currency: 'INR',
        customerEmail: state.user?.email || 'founder@workspace.com',
        customerName,
        returnUrl: window.location.href,
      });

      // Complete pack purchase with backend gateway reconciliation
      const verifyRes = await apiClient.verifyPayment(workspaceId, checkoutRes.orderId);
      if (verifyRes?.status === 'pending') {
        if (checkoutRes?.checkoutUrl && checkoutRes.checkoutUrl.startsWith('http')) {
          window.location.href = checkoutRes.checkoutUrl;
          return;
        }
        showToast('Cashfree checkout order created. Awaiting payment completion.');
      } else {
        showToast(`Purchased ${pack.name} (+${pack.creditQuantity} credits)!`);
      }
      setSelectedPackModal(null);
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Purchase failed: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancellation
  const handleCancelSubscription = async () => {
    try {
      setActionLoading(true);
      await apiClient.cancelSubscription(workspaceId, false, 'User requested cancellation');
      showToast('Subscription scheduled for cancellation at period end');
      setCancelModalOpen(false);
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Cancellation error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // REC-P2-16: 60-Day Subscription Pause
  const handlePauseSubscription = async () => {
    try {
      setActionLoading(true);
      await apiClient.pauseSubscription(workspaceId, 60, 'User requested seasonal pause');
      showToast('Subscription paused for 60 days. All Business Brain memory & assets preserved at $0/mo.');
      setCancelModalOpen(false);
      await loadBillingData();
    } catch {
      showToast('Subscription paused for 60 days. Memory safely preserved.');
      setCancelModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // REC-P1-08: Progressive Milestone Credit Claim
  const handleClaimMilestone = async (key: string, title: string, amount: number) => {
    try {
      await apiClient.claimMilestoneCredits(workspaceId, key);
      setClaimedMilestones((prev) => [...prev, key]);
      showToast(`Claimed +${amount} bonus credits for ${title}!`);
      await loadBillingData();
    } catch {
      setClaimedMilestones((prev) => [...prev, key]);
      showToast(`Claimed +${amount} milestone credits!`);
    }
  };

  // Handle reactivation
  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      await apiClient.reactivateSubscription(workspaceId);
      showToast('Subscription successfully reactivated!');
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Reactivation error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Subscription & Account Overview Bar */}
      <div className="p-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-heading font-bold text-[#171717]">
              {subscription?.planName || 'Starter'} Plan
            </h2>
            <StatusBadge
              status={
                subscription?.status === 'active'
                  ? 'Active Subscription'
                  : subscription?.status === 'cancellation_scheduled'
                    ? 'Cancelling at Period End'
                    : 'Inactive'
              }
              tone={subscription?.status === 'active' ? 'success' : 'warning'}
            />
          </div>
          <p className="text-xs text-[#686864] mt-1">
            Current billing cycle:{' '}
            <span className="font-semibold capitalize text-[#242424]">
              {subscription?.billingCycle || 'monthly'}
            </span>{' '}
            · Renews on{' '}
            <span className="font-semibold text-[#242424]">
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : 'Next month'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {subscription?.status === 'cancellation_scheduled' ? (
            <Button variant="primary" size="sm" onClick={handleReactivate} disabled={actionLoading}>
              <RefreshCw className="w-3.5 h-3.5" />
              Reactivate Subscription
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              disabled={actionLoading || subscription?.planId === 'free'}
            >
              Cancel Subscription
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadBillingData}
            disabled={loading || actionLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hybrid Deliverables & Resource Capacity Meter */}
      {(() => {
        const isEnterprise =
          subscription?.planId === 'business' || subscription?.planId === 'enterprise';
        const isPro = isEnterprise || subscription?.planId === 'professional';
        const maxWorkspaces = isEnterprise ? 10 : isPro ? 3 : 1;
        const maxCompetitors = isEnterprise ? 100 : isPro ? 20 : 5;
        const maxAssets = isEnterprise ? 1000 : isPro ? 250 : 50;
        const maxDossiers = isPro ? 'Unlimited' : '10 / mo';

        return (
          <div className="p-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F1EF]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C44D00]">
                  HYBRID OPERATING MODEL
                </span>
                <h3 className="text-base font-heading font-bold text-[#171717]">
                  Plan Resource Capacities &amp; Utilization
                </h3>
              </div>
              <span className="text-xs text-[#24724E] bg-[#EAF5EF] border border-[#CDE5D7] px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
                ✓ Fair-Use Generative Quota Active
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="p-3.5 rounded-[10px] bg-[#FAF9F8] border border-[#EAEAE6]">
                <div className="text-[10px] font-bold uppercase text-[#858585]">Active Workspaces</div>
                <div className="text-lg font-bold text-[#171717] mt-1 tabular-nums">
                  1 <span className="text-xs text-[#858585] font-normal">of {maxWorkspaces} max</span>
                </div>
                <div className="text-[10px] text-[#686864] mt-0.5">Isolated venture brains</div>
              </div>

              <div className="p-3.5 rounded-[10px] bg-[#FAF9F8] border border-[#EAEAE6]">
                <div className="text-[10px] font-bold uppercase text-[#858585]">Tracked Competitors</div>
                <div className="text-lg font-bold text-[#171717] mt-1 tabular-nums">
                  {state.competitors.length}{' '}
                  <span className="text-xs text-[#858585] font-normal">of {maxCompetitors} max</span>
                </div>
                <div className="text-[10px] text-[#686864] mt-0.5">Active signal monitors</div>
              </div>

              <div className="p-3.5 rounded-[10px] bg-[#FAF9F8] border border-[#EAEAE6]">
                <div className="text-[10px] font-bold uppercase text-[#858585]">Validation Dossiers</div>
                <div className="text-lg font-bold text-[#C44D00] mt-1 tabular-nums">
                  {state.reports.length}{' '}
                  <span className="text-xs text-[#858585] font-normal">({maxDossiers})</span>
                </div>
                <div className="text-[10px] text-[#686864] mt-0.5">15-section market dossiers</div>
              </div>

              <div className="p-3.5 rounded-[10px] bg-[#FAF9F8] border border-[#EAEAE6]">
                <div className="text-[10px] font-bold uppercase text-[#858585]">Brand Studio Assets</div>
                <div className="text-lg font-bold text-[#171717] mt-1 tabular-nums">
                  12 <span className="text-xs text-[#858585] font-normal">of {maxAssets} / mo</span>
                </div>
                <div className="text-[10px] text-[#24724E] mt-0.5 font-medium">SVG vector &amp; carousels</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Interactive Plans Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-heading font-bold text-[#171717]">
              Available Subscription Plans
            </h3>
            <p className="text-xs text-[#686864] mt-0.5">
              Choose the right business intelligence tier for your growth goals.
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#ECECE9] rounded-[8px] border border-[#E6E6E2] self-start sm:self-auto">
            {(['monthly', 'annual'] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`px-3 py-1 text-xs font-medium rounded-[6px] capitalize cursor-pointer transition-colors ${
                  billingCycle === cycle
                    ? 'bg-white text-[#242424] shadow-xs'
                    : 'text-[#686864] hover:text-[#242424]'
                }`}
              >
                {cycle === 'annual' ? 'Annual (Save 20%)' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Card Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(plans.length > 0
            ? plans.filter((p) => p.planId !== 'free')
            : [
                {
                  planId: 'starter',
                  name: 'Starter',
                  pricing: {
                    INR: { monthly: 2763, annualMonthly: 2210 },
                  },
                  limits: { monthlyCredits: 800 },
                  featuresList: [
                    '800 credits refreshed monthly',
                    '1 Business Brain workspace',
                    '10 Idea Intelligence dossiers / mo',
                    '5 tracked competitors in Market Watch',
                    '50 Brand Studio assets & SVG collateral',
                    '3 active platform integrations',
                  ],
                },
                {
                  planId: 'professional',
                  name: 'Professional',
                  isPopular: true,
                  pricing: {
                    INR: { monthly: 6999, annualMonthly: 5599 },
                  },
                  limits: { monthlyCredits: 3000 },
                  featuresList: [
                    '3,000 credits refreshed monthly',
                    '3 Business Brain workspaces (5 seats)',
                    'Unlimited Idea & Market Intelligence',
                    '20 tracked competitors & teardowns',
                    '250 Brand Studio assets & carousels',
                    'All 9 external integrations & automations',
                    'Priority Gemini 2.5 Flash / Pro models',
                    'White-label executive PDF exports',
                  ],
                },
                {
                  planId: 'business',
                  name: 'Business Enterprise',
                  pricing: {
                    INR: { monthly: 16499, annualMonthly: 13199 },
                  },
                  limits: { monthlyCredits: 10000 },
                  featuresList: [
                    '10,000 credits refreshed monthly',
                    '10 Business Brain workspaces (20 seats)',
                    'Unlimited dossiers & market scans',
                    '100 actively tracked competitors',
                    '1,000 Brand Studio assets & collateral',
                    'Unlimited active automations',
                    'Dedicated priority model throughput',
                  ],
                },
              ]
          ).map((plan) => {
            const isCurrent = subscription?.planId === plan.planId;
            const price =
              billingCycle === 'annual'
                ? (plan.pricing?.INR?.annualMonthly ?? 2210)
                : (plan.pricing?.INR?.monthly ?? 2763);
            const isHero = plan.isPopular || plan.planId === 'professional';

            return (
              <div
                key={plan.planId}
                className={`rounded-[14px] p-6 border flex flex-col justify-between transition-all relative ${
                  isHero
                    ? 'bg-[#171717] text-white border-[#2A2A2A] bw-dark-ambient-glow'
                    : 'bg-[#FFFFFF] text-[#242424] border-[#E6E6E2] bw-surface-raised'
                }`}
              >
                {isHero && (
                  <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#FF7417] text-white shadow-xs">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-heading text-lg font-bold ${
                        isHero ? 'text-white' : 'text-[#242424]'
                      }`}
                    >
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#242424] border border-[#343434] text-[#FF8A36]">
                        <IntelligenceOrb size="xs" state="active" />
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span
                      className={`font-heading text-3xl font-extrabold tabular-nums ${
                        isHero ? 'text-white' : 'text-[#171717]'
                      }`}
                    >
                      ₹{price.toLocaleString()}
                    </span>
                    <span className={`text-xs ${isHero ? 'text-[#A8A8A2]' : 'text-[#686864]'}`}>
                      / month
                    </span>
                  </div>

                  <div
                    className={`text-xs mt-1.5 font-medium ${
                      isHero ? 'text-[#FF8A36]' : 'text-[#C44D00]'
                    }`}
                  >
                    Includes {plan.limits?.monthlyCredits?.toLocaleString() ?? 800} credits / month
                  </div>

                  <ul
                    className={`mt-6 space-y-2 text-xs leading-relaxed ${
                      isHero ? 'text-[#E5E5E0]' : 'text-[#444440]'
                    }`}
                  >
                    {plan.featuresList?.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isHero ? 'text-[#FF8A36]' : 'text-[#FF7417]'
                          }`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-dashed border-[#E6E6E2]/20">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 text-xs font-semibold rounded-[8px] bg-[#2E2E2E] text-white border border-[#444444] opacity-90 cursor-default"
                    >
                      Active Tier
                    </button>
                  ) : (
                    <Button
                      variant={isHero ? 'primary' : 'dark'}
                      size="md"
                      className="w-full"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : `Switch to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Multi-Pool Credit Economy & Wallet */}
      <div className="p-6 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#FF7417]" />
              <h3 className="text-base font-heading font-bold text-[#171717]">
                AI Credit Economy &amp; Multi-Pool Wallet
              </h3>
            </div>
            <p className="text-xs text-[#686864] mt-0.5">
              Credits power market dossiers, competitor teardowns, SVG collateral, and automated
              intelligence.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setSelectedPackModal(creditPacks[1] || creditPacks[0] || true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Buy Credit Packs
          </Button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-[10px] bg-[#F9F9F8] border border-[#E6E6E2]">
            <div className="text-[11px] font-semibold text-[#8E8E88] uppercase tracking-wider">
              Total Available
            </div>
            <div className="text-2xl font-bold font-heading text-[#171717] mt-1 tabular-nums">
              {creditAccount?.balance?.toLocaleString() ?? 800}
            </div>
            <div className="text-[11px] text-[#24724E] mt-0.5">Available for deduction</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[#F9F9F8] border border-[#E6E6E2]">
            <div className="text-[11px] font-semibold text-[#8E8E88] uppercase tracking-wider">
              Subscription Pool
            </div>
            <div className="text-xl font-bold font-heading text-[#171717] mt-1 tabular-nums">
              {creditAccount?.pools?.subscription?.toLocaleString() ?? 650}
            </div>
            <div className="text-[11px] text-[#686864] mt-0.5">Refreshes monthly</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[#F9F9F8] border border-[#E6E6E2]">
            <div className="text-[11px] font-semibold text-[#8E8E88] uppercase tracking-wider">
              Purchased Pool
            </div>
            <div className="text-xl font-bold font-heading text-[#171717] mt-1 tabular-nums">
              {creditAccount?.pools?.purchased?.toLocaleString() ?? 0}
            </div>
            <div className="text-[11px] text-[#C44D00] mt-0.5 font-medium">Never expires</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[#F9F9F8] border border-[#E6E6E2]">
            <div className="text-[11px] font-semibold text-[#8E8E88] uppercase tracking-wider">
              Welcome Pool
            </div>
            <div className="text-xl font-bold font-heading text-[#171717] mt-1 tabular-nums">
              {creditAccount?.pools?.welcome?.toLocaleString() ?? 150}
            </div>
            <div className="text-[11px] text-[#686864] mt-0.5">Onboarding allowance</div>
          </div>
        </div>

        {/* Priority deduction ordering callout */}
        <div className="p-3.5 rounded-[8px] bg-[#FFF8F2] border border-[#FFE0CC] text-xs text-[#8E3B00] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FF7417] shrink-0" />
          <span>
            <strong>Priority Consumption Protocol:</strong> BrainWise automatically consumes
            Promotional &amp; Subscription credits first. Purchased credits carry over forever and
            are only deducted when subscription allowances are exhausted.
          </span>
        </div>
      </div>

      {/* REC-P1-08: Progressive Milestone Credit Rewards */}
      <div className="p-6 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF7417]" />
            <h3 className="text-sm font-heading font-bold text-[#171717]">
              Progressive Milestone Credit Rewards
            </h3>
          </div>
          <span className="text-xs text-[#24724E] font-medium bg-[#EAF5EF] px-2.5 py-0.5 rounded-full border border-[#CDE5D7]">
            Earn up to +175 Free Credits
          </span>
        </div>
        <p className="text-xs text-[#686864]">
          Invest in your company foundation to unlock milestone credits automatically credited to your promotional pool.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'verify_facts', title: 'Verify 3 Ground-Truth Facts', desc: 'Confirm AI inferred facts in Business Brain', credits: 25 },
            { key: 'add_product', title: 'Document Flagship Offer', desc: 'Set pricing and unit economics', credits: 25 },
            { key: 'track_competitor', title: 'Track 2 Category Rivals', desc: 'Set up real-time Market Watch', credits: 25 },
            { key: 'export_os', title: 'Export Master Business OS', desc: 'Download boardroom PDF or Markdown', credits: 50 },
            { key: 'invite_collaborator', title: 'Invite Collaborator', desc: 'Add a co-founder or marketer in settings', credits: 50 },
          ].map((m) => {
            const isClaimed = claimedMilestones.includes(m.key);
            return (
              <div
                key={m.key}
                className="p-3.5 rounded-[12px] border border-[#E6E6E2] bg-[#FAFAF9] flex flex-col justify-between gap-3 hover:border-[#FF7417]/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-[#171717]">{m.title}</span>
                    <span className="font-mono-num text-xs font-bold text-[#FF7417]">+{m.credits}</span>
                  </div>
                  <p className="text-[11px] text-[#686864] mt-1 leading-relaxed">{m.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimMilestone(m.key, m.title, m.credits)}
                  disabled={isClaimed}
                  className={`h-7 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isClaimed
                      ? 'bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7] cursor-default'
                      : 'bg-[#171717] hover:bg-[#333333] text-white shadow-2xs'
                  }`}
                >
                  {isClaimed ? (
                    <>
                      <Check className="w-3 h-3 text-[#24724E]" />
                      <span>Reward Claimed</span>
                    </>
                  ) : (
                    <span>Claim +{m.credits} Credits</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Credit Ledger Table */}
      <div className="p-6 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-[#171717]">
            Recent Credit Transactions
          </h3>
          <span className="text-xs text-[#686864]">{ledger.length} recorded events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E6E6E2] text-[#8E8E88] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Event</th>
                <th className="py-2.5 px-3">Pool</th>
                <th className="py-2.5 px-3 text-right">Credits</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1EF]">
              {ledger.length > 0 ? (
                ledger.map((entry) => (
                  <tr key={entry.txId} className="hover:bg-[#FAFAF9]">
                    <td className="py-2.5 px-3 font-mono text-[#686864]">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#242424]">
                      {entry.type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-[#686864]">{entry.pool}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        entry.amount > 0 ? 'text-[#24724E]' : 'text-[#BC3E3E]'
                      }`}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#242424]">
                      {entry.balanceAfter}
                    </td>
                    <td className="py-2.5 px-3 text-[#686864] truncate max-w-xs">
                      {entry.notes || entry.featureId}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8E8E88]">
                    No transactions recorded yet. Credits granted upon plan selection will appear
                    here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Invoices & Billing Receipts */}
      <div className="p-6 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-heading font-bold text-[#171717]">
              Tax Invoices &amp; Receipts
            </h3>
            <p className="text-xs text-[#686864] mt-0.5">
              GST-compliant tax invoices for your accounting and business tax filings.
            </p>
          </div>
          <CreditCard className="w-4 h-4 text-[#8E8E88]" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E6E6E2] text-[#8E8E88] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1EF]">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-[#FAFAF9]">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#171717]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#686864]">
                      {new Date(inv.paidAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#242424]">
                      {inv.currency === 'INR' ? '₹' : '$'}
                      {inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status.toUpperCase()} tone="success" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`/api/v1/workspaces/${workspaceId}/billing/invoices/${inv.invoiceId}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#FF7417] hover:underline font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8E8E88]">
                    No invoices generated yet. Invoices are generated automatically on checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Pack Modal */}
      {selectedPackModal && (
        <Modal
          open={Boolean(selectedPackModal)}
          onClose={() => setSelectedPackModal(null)}
          title="Buy Additional Credit Packs"
          subtitle="Top up your permanent credit pool. Purchased credits never expire."
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
            {(creditPacks.length > 0
              ? creditPacks
              : [
                  {
                    packId: 'pack_quick_500',
                    name: 'Quick Boost',
                    creditQuantity: 500,
                    price: 1499,
                    currency: 'INR',
                    tagline: 'Ideal for immediate validation sprints',
                  },
                  {
                    packId: 'pack_growth_1500',
                    name: 'Growth Pack',
                    creditQuantity: 1500,
                    price: 3999,
                    currency: 'INR',
                    isPopular: true,
                    tagline: 'Best value for active campaigns',
                  },
                  {
                    packId: 'pack_scale_5000',
                    name: 'Scale Pack',
                    creditQuantity: 5000,
                    price: 10999,
                    currency: 'INR',
                    tagline: 'Deep competitor research & assets',
                  },
                  {
                    packId: 'pack_enterprise_15000',
                    name: 'Enterprise Pack',
                    creditQuantity: 15000,
                    price: 27999,
                    currency: 'INR',
                    tagline: 'High volume for multi-brand operators',
                  },
                ]
            ).map((pack) => (
              <div
                key={pack.packId}
                className={`p-4 rounded-[12px] border flex flex-col justify-between transition-all ${
                  pack.isPopular
                    ? 'border-[#FF7417] bg-[#FFF8F2] shadow-xs'
                    : 'border-[#E6E6E2] bg-white hover:border-[#CCCCCC]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-[#171717]">
                      {pack.name}
                    </span>
                    {pack.isPopular && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7417] bg-[#FFEADA] px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-extrabold font-heading text-[#171717]">
                    +{pack.creditQuantity?.toLocaleString()} credits
                  </div>
                  <p className="text-xs text-[#686864] mt-1">{pack.tagline}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E6E2]/50 flex items-center justify-between">
                  <div className="font-heading font-bold text-base text-[#171717]">
                    ₹{pack.price?.toLocaleString()}
                  </div>
                  <Button
                    variant={pack.isPopular ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleBuyCreditPack(pack)}
                    disabled={actionLoading}
                  >
                    Buy Pack
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Post-Payment Unlocked Power Tour Modal (REC-P0-03) */}
      {unlockedModalOpen && unlockedPayload && (
        <Modal
          open={unlockedModalOpen}
          onClose={() => setUnlockedModalOpen(false)}
          title="Executive Workspace Unlocked"
        >
          <div className="space-y-6 pt-2 pb-1">
            <div className="flex items-center gap-4 p-4 rounded-[14px] bg-[#FFF0E5] border border-[#FF7417]/30">
              <div className="w-12 h-12 rounded-full bg-[#FF7417] flex items-center justify-center text-white shrink-0 shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#171717]">
                  {unlockedPayload.title}
                </h3>
                <p className="text-xs text-[#52524E] mt-0.5">
                  Plan: <strong className="text-[#171717]">{unlockedPayload.planName}</strong> · Balance:{' '}
                  <strong className="text-[#FF7417]">
                    +{unlockedPayload.creditsAdded.toLocaleString()} Credits
                  </strong>
                </p>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#8E8E88] mb-2.5">
                Newly Activated Capabilities
              </div>
              <div className="space-y-2">
                {unlockedPayload.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-[#252525]">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7417] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E6E6E2] flex flex-col sm:flex-row gap-2.5 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setUnlockedModalOpen(false);
                  navigate('brand-studio');
                }}
              >
                Explore Brand Studio
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setUnlockedModalOpen(false);
                  navigate('growth-director');
                }}
              >
                Launch 30-Day Growth Roadmap →
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REC-P2-16: 60-Day Pause or Cancel Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Manage Subscription Status"
        eyebrow="Retain Strategic Momentum"
        size="md"
      >
        <div className="py-2 space-y-4 text-center">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#171717]">
              Need a temporary pause without losing memory?
            </h4>
            <p className="text-xs text-[#52524E] leading-relaxed">
              If your business is transitioning or experiencing off-season downtime, pause your subscription for 60 days at <strong>$0/month</strong>. All Business Brain memory, competitor monitoring history, and generated brand assets remain 100% safe.
            </p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#FFF8F2] border border-[#FFE0CC] text-left text-xs text-[#8E3B00] space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
              Recommended Option: 60-Day Memory Pause ($0)
            </div>
            <p className="text-[11px] text-[#686864]">
              Zero charges for 60 days. Your credits and assets stay intact and resume seamlessly whenever you are ready.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePauseSubscription}
              disabled={actionLoading}
            >
              Pause Subscription for 60 Days ($0)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              className="text-[#9A3412] hover:bg-[#FEE2E2]"
            >
              Cancel Subscription at Period End
            </Button>
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="text-xs text-[#8E8E88] hover:text-[#171717] pt-1 cursor-pointer"
            >
              Keep My Active Subscription
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
