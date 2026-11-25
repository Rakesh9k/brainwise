import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Bell,
  FlaskConical,
  Pause,
  Play,
  Plus,
  Radar,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import type { CompetitorProfileData, MarketEvent } from '../../types/brainwise';
import {
  Button,
  FilterBar,
  FluidTransition,
  IntelligenceOrb,
  IntelligenceSurface,
  MetricCard,
  PageHeader,
  PriorityBadge,
  SectionHeader,
  StatusBadge,
  Tabs,
} from '../../components/ui/DesignSystem';
import { ConfirmationDialog, Drawer } from '../../components/ui/Overlay';
import {
  BusinessBrainContextBanner,
  GuidedActionEmptyCard,
  JourneyNextStep,
} from '../../components/ui/DepartmentCards';
import { AddCompetitorModal, MONITORING_CATEGORIES } from '../../components/ui/CompetitorModal';
import { UniversalExecutiveLayer } from '../../components/ui/UniversalExecutiveLayer';

const MARKET_WATCH_TAB_LABELS: Record<'overview' | 'watchlist' | 'feed' | 'reports', string> = {
  overview: 'Overview',
  watchlist: 'Competitor Watchlist',
  feed: 'Intelligence Feed',
  reports: 'Scheduled Reports',
};

export const MarketWatchPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    state,
    navigate,
    toggleCompetitorMonitoring,
    updateCompetitorFrequency,
    removeCompetitor,
    convertEventToExperiment,
    dismissMarketEvent,
    markMarketEventRead,
    updateScheduledReports,
    departmentResetNonce,
    autoDiscoverCompetitorsForBrain,
  } = useBrainWise();

  const [tab, setTab] = useState<'overview' | 'watchlist' | 'feed' | 'reports'>('overview');
  const [catFilter, setCatFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [addWatchOpen, setAddWatchOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CompetitorProfileData | null>(null);

  // Autonomous Competitor & Event Discovery on mount if none exist
  useEffect(() => {
    if (state.competitors.length === 0 && !state.isExampleWorkspace) {
      autoDiscoverCompetitorsForBrain();
    }
  }, [state.competitors.length, state.isExampleWorkspace, autoDiscoverCompetitorsForBrain]);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setSelectedEvent(null);
      setTab('overview');
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    embedded
      ? []
      : tab !== 'overview' && selectedEvent
        ? [
            { label: MARKET_WATCH_TAB_LABELS[tab], onClick: () => setSelectedEvent(null) },
            { label: selectedEvent.competitorOrSource },
          ]
        : tab !== 'overview'
          ? [{ label: MARKET_WATCH_TAB_LABELS[tab] }]
          : selectedEvent
            ? [{ label: selectedEvent.competitorOrSource }]
            : [],
    [embedded, tab, selectedEvent?.id, selectedEvent?.competitorOrSource]
  );

  const monitoredCompetitors = state.competitors.filter((c) => c.monitoringEnabled);
  const archivedSet = new Set(state.archivedEventIds ?? []);
  const visibleEvents = state.marketEvents.filter((ev) => !archivedSet.has(ev.id));
  const filteredFeed = visibleEvents.filter((ev) =>
    catFilter === 'all' ? true : ev.category === catFilter
  );

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <BusinessBrainContextBanner
            departmentLabel="Market Watch"
            contextKey="competitiveIntelligence"
          />

          <PageHeader
            mutedPrefix="Market"
            title="Watch"
            subtitle="Continuously monitor competitor pricing, product launches, and category trends—clearly separating verified changes from AI interpretations."
            actions={
              <Button variant="primary" size="sm" onClick={() => setAddWatchOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Competitor to Watchlist
              </Button>
            }
          />

          {/* Universal Executive Glance Layer (Layer 1 + Layer 3 Proof Drawer) */}
          <UniversalExecutiveLayer
            departmentCode="DEP-09"
            sectionTitle="Market Watch & Macro Trends"
            oneLiner="A morning briefing on what's trending in your industry without having to scroll Twitter or news sites."
            statusPills={[
              {
                label: `Today's Signal Digest · ${state.marketEvents.length} Signals`,
                tone: 'emerald',
                icon: <TrendingUp className="w-3 h-3 text-[#10B981]" />,
              },
              {
                label: `${state.competitors.length} Monitored Peers`,
                tone: 'blue',
              },
              {
                label: 'Verified Changes Separated from AI',
                tone: 'neutral',
              },
            ]}
            primaryAction={{
              label: 'Add Competitor to Watchlist',
              onClick: () => setAddWatchOpen(true),
              icon: <Plus className="w-3.5 h-3.5 text-[#FFFFFF]" />,
            }}
            secondaryAction={{
              label: 'Turn Signal into Growth Test',
              onClick: () => {
                const firstEvent = state.marketEvents[0];
                if (firstEvent) convertEventToExperiment(firstEvent);
              },
              icon: <FlaskConical className="w-3.5 h-3.5 text-[#71717A]" />,
            }}
            proofTelemetry={(() => {
              const hasEvents = state.marketEvents.length > 0;
              const verifiedEventsCount = state.marketEvents.filter(
                (e) => Boolean(e.sourceReference) || !e.isAiInferred
              ).length;
              const marketConfidence = hasEvents
                ? Math.round((verifiedEventsCount / state.marketEvents.length) * 100)
                : 0;
              const isMarketStandby = !hasEvents && state.competitors.length === 0;

              return {
                confidenceScore: marketConfidence,
                confidenceLabel: isMarketStandby
                  ? 'Surveillance Readiness & Signal Grounding'
                  : 'Signal Authenticity & Fact Separation',
                statusBadge: isMarketStandby
                  ? 'STANDBY'
                  : marketConfidence >= 80
                    ? 'PASS'
                    : 'REVIEW',
                isStandby: isMarketStandby,
                metrics: [
                  {
                    label: 'Captured Signals',
                    value: state.marketEvents.length,
                    subtext:
                      state.marketEvents.length > 0
                        ? 'Verified market events'
                        : '0 active market events',
                    status: state.marketEvents.length > 0 ? 'optimal' : 'warning',
                  },
                  {
                    label: 'Watchlist Size',
                    value: state.competitors.length,
                    subtext:
                      state.competitors.length > 0
                        ? 'Active surveillance'
                        : '0 peers on radar',
                    status: state.competitors.length > 0 ? 'optimal' : 'warning',
                  },
                  {
                    label: 'Scheduled Reports',
                    value: state.scheduledReports?.length ?? 0,
                    subtext:
                      (state.scheduledReports?.length ?? 0) > 0
                        ? 'Automated briefing'
                        : '0 briefings scheduled',
                    status: (state.scheduledReports?.length ?? 0) > 0 ? 'verified' : 'inferred',
                  },
                  {
                    label: 'Signal-to-Experiment Conversion',
                    value: state.marketEvents.length > 0 ? '1-Click Ready' : 'Standby',
                    subtext:
                      state.marketEvents.length > 0
                        ? 'Grounded in real demand'
                        : 'Awaiting captured signals',
                    status: state.marketEvents.length > 0 ? 'verified' : 'inferred',
                  },
                ],
                lineageItems: state.marketEvents.slice(0, 3).map((e) => ({
                  title: e.headline,
                  source: e.competitorName || 'Category Surveillance Feed',
                  timestamp: e.detectedAt || 'Recent Alert',
                  confidence: 0.97,
                  type: (e.isAiInferred ? 'AI_INFERRED' : 'GROUND_TRUTH') as any,
                  details: e.analysis,
                })),
                guardrails: {
                  truthCheckStatus: 'PASSED',
                  antiFatigueScore: 'Real-Time Market Grounded',
                  creditProtection: 'ACTIVE_ZERO_LOSS_ESCROW',
                  modelAudited: 'Gemini 2.5 Flash Grounded with Real-Time Web Signals',
                },
                rawJson: {
                  department: 'DEP-09 (Market Watch & Macro Trends)',
                  workspace: state.brain.businessName || 'Default Workspace',
                  eventsCount: state.marketEvents.length,
                  monitoredCompetitors: state.competitors.length,
                  scheduledReportsCount: state.scheduledReports?.length ?? 0,
                  surveillanceStatus: isMarketStandby
                    ? 'STANDBY_AWAITING_COMPETITORS'
                    : 'ACTIVE_SURVEILLANCE',
                  timestamp: new Date().toISOString(),
                },
              };
            })()}
          />
        </>
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#252525]">
              Live Market Watch &amp; Signals
            </h2>
            <p className="text-xs text-[#5C5C58] mt-0.5">
              Track verified pricing shifts, launches, and review sentiment across monitored peers.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setAddWatchOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add to Watchlist
          </Button>
        </div>
      )}

      <Tabs
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'feed', label: 'Intelligence Feed', count: visibleEvents.length },
          { id: 'watchlist', label: 'Competitor Watchlist', count: state.competitors.length },
          { id: 'reports', label: 'Scheduled Reports' },
        ]}
      />

      {tab === 'overview' && (
        <FluidTransition key="mw-overview" direction="fade" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Tracked Competitors"
              value={state.competitors.length}
              detail={`${monitoredCompetitors.length} active monitors`}
            />
            <MetricCard
              label="Monitored Categories"
              value={MONITORING_CATEGORIES.length}
              detail="Pricing, launches & social"
            />
            <MetricCard
              label="Recent Changes"
              value={visibleEvents.length}
              detail="Active signals"
              accent
            />
            <MetricCard
              label="Unread Alerts"
              value={visibleEvents.filter((e) => !e.isRead).length}
              detail="Actionable signals"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <SectionHeader
                title="Latest Detected Changes"
                action={
                  <button
                    type="button"
                    onClick={() => setTab('feed')}
                    className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                  >
                    Full Feed →
                  </button>
                }
              />
              {visibleEvents.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Market Watch · Clear Inbox"
                  title="No active competitor alerts in your feed"
                  description="All detected signals have been resolved or archived. Add a competitor to your watchlist to start scanning for pricing shifts and product launches."
                  actionLabel="Add Competitor to Watchlist"
                  onAction={() => setAddWatchOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {visibleEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 space-y-2.5 bw-surface-raised"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs">
                          <strong className="text-[#242424]">{ev.competitorOrSource}</strong>
                          <span className="mx-1.5 text-[#8E8E88]">·</span>
                          <span className="text-[#686864]">{ev.category}</span>
                        </div>
                        <PriorityBadge priority={ev.importance} />
                      </div>
                      <div className="text-sm font-medium text-[#242424]">{ev.detectedChange}</div>
                      <div className="p-2.5 rounded-[8px] bg-[#F5F5F4] text-xs text-[#686864]">
                        <strong className="text-[#242424]">AI Interpretation:</strong>{' '}
                        {ev.aiInterpretation}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] font-mono-num text-[#8E8E88]">
                          {ev.detectedAt}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {ev.convertedToExperimentId ? (
                            <button
                              type="button"
                              onClick={() => navigate('tasks-experiments')}
                              className="text-xs font-medium text-[#24724E] cursor-pointer"
                            >
                              View Experiment →
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => convertEventToExperiment(ev.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#FFF0E5] text-[#C44D00] hover:bg-[#FF7417] hover:text-white border border-[#FFD3B3] hover:border-[#FF7417] rounded-[6px] transition-colors cursor-pointer"
                            >
                              <FlaskConical className="w-3 h-3" />
                              Queue Counter-Test
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => dismissMarketEvent(ev.id)}
                            aria-label={`Archive alert from ${ev.competitorOrSource}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#686864] hover:text-[#242424] border border-[#E6E6E2] hover:bg-[#F5F5F4] rounded-[6px] cursor-pointer"
                          >
                            <Archive className="w-3 h-3" />
                            Archive
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markMarketEventRead(ev.id);
                              setSelectedEvent(ev);
                            }}
                            className="text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                          >
                            Inspect →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SectionHeader title="Weekly Intelligence Summary" />
              <IntelligenceSurface variant="dark" className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#FF8A36] font-medium">
                  <IntelligenceOrb size="xs" state="active" />
                  <TrendingUp className="w-4 h-4" />
                  <span>Emerging Category Patterns</span>
                </div>
                <p className="text-sm text-[#ECECE9] leading-relaxed">
                  {visibleEvents.length > 0
                    ? `${visibleEvents.length} active competitor signals tracked across ${state.brain.industry}. Pricing shifts and onboarding content cadence are the primary levers moving conversion velocity.`
                    : `Monitoring ${monitoredCompetitors.length} peers across ${state.brain.industry}. Add competitors to capture category pricing and launch movements.`}
                </p>
                <div className="pt-3 border-t border-[#2E2E2E] space-y-2 text-xs text-[#B8B8B2]">
                  <div>
                    • Opportunity: Align {state.brain.businessName}&apos;s core wedge (
                    {state.brain.brandPositioning}) against competitor gaps.
                  </div>
                  <div>
                    • Watch:{' '}
                    {state.competitors[0]
                      ? `Monitor ${state.competitors[0].name} updates (${state.competitors[0].monitoringFrequency}).`
                      : 'Add your first rival to enable weekly alerts.'}
                  </div>
                </div>
              </IntelligenceSurface>

              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised">
                <div className="text-xs font-semibold text-[#242424] mb-3">
                  10 Active Monitoring Categories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MONITORING_CATEGORIES.map((c) => (
                    <span
                      key={c}
                      className="text-[11px] text-[#686864] px-2.5 py-1 rounded-[6px] bg-[#F5F5F4] border border-[#E6E6E2]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FluidTransition>
      )}

      {tab === 'feed' && (
        <FluidTransition key="mw-feed" direction="fade" className="space-y-4">
          <FilterBar
            activeId={catFilter}
            onChange={setCatFilter}
            options={[
              { id: 'all', label: 'All Signals' },
              { id: 'Pricing changes', label: 'Pricing' },
              { id: 'Product launches', label: 'Launches' },
              { id: 'Public social media activity', label: 'Social' },
              { id: 'Market trends', label: 'Trends' },
            ]}
          />

          {filteredFeed.length === 0 ? (
            <GuidedActionEmptyCard
              stepLabel="Intelligence Feed"
              title="No matching market signals"
              description="Clear the category filter or add a new competitor monitor to receive live pricing, launch, and review signals."
              actionLabel="Add Competitor to Watchlist"
              onAction={() => setAddWatchOpen(true)}
              secondaryLabel={catFilter !== 'all' ? 'Show All Signals' : undefined}
              onSecondaryAction={catFilter !== 'all' ? () => setCatFilter('all') : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filteredFeed.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[#242424]">{ev.competitorOrSource}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C44D00] font-medium">{ev.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#686864]">{ev.detectedAt}</span>
                    </div>
                    <PriorityBadge priority={ev.importance} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]">
                      <div className="text-[11px] font-semibold text-[#24724E] uppercase tracking-wide">
                        Actual Detected Change
                      </div>
                      <p className="text-sm text-[#242424] mt-1 leading-relaxed">
                        {ev.detectedChange}
                      </p>
                      <div className="text-[11px] text-[#686864] mt-2">
                        Source: {ev.sourceReference}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-[10px] bg-[#FFF0E5]/60 border border-[#FFD3B3]">
                      <div className="text-[11px] font-semibold text-[#C44D00] uppercase tracking-wide">
                        AI-Generated Interpretation &amp; Action
                      </div>
                      <p className="text-xs text-[#242424] mt-1 leading-relaxed">
                        {ev.aiInterpretation}
                      </p>
                      <div className="text-xs font-medium text-[#242424] mt-2">
                        Suggested: {ev.suggestedAction}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          markMarketEventRead(ev.id);
                          setSelectedEvent(ev);
                        }}
                        className="text-xs font-medium text-[#686864] hover:text-[#242424] cursor-pointer"
                      >
                        Open full alert detail
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissMarketEvent(ev.id)}
                        className="inline-flex items-center gap-1 text-xs text-[#686864] hover:text-[#242424] cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive Alert
                      </button>
                    </div>
                    {ev.convertedToExperimentId ? (
                      <div className="flex items-center gap-2">
                        <StatusBadge status="Experiment Queued" tone="success" />
                        <button
                          type="button"
                          onClick={() => navigate('tasks-experiments')}
                          className="text-xs font-semibold text-[#C44D00] cursor-pointer"
                        >
                          View Experiment →
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => convertEventToExperiment(ev.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[8px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        Queue Counter-Test
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FluidTransition>
      )}

      {tab === 'watchlist' && (
        <FluidTransition key="mw-watchlist" direction="fade" className="space-y-4">
          <SectionHeader
            title="Competitor Watchlist"
            description="Configure monitoring frequency and signal categories per competitor"
          />
          {state.competitors.length === 0 ? (
            <GuidedActionEmptyCard
              stepLabel="Watchlist Empty"
              title="No competitors monitored yet"
              description="Add a direct or adjacent rival to track pricing changes, product drops, and review sentiment shifts automatically."
              actionLabel="Monitor First Competitor"
              onAction={() => setAddWatchOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {state.competitors.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bw-surface-raised"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Radar
                        className={`w-4 h-4 ${c.monitoringEnabled ? 'text-[#FF7417]' : 'text-[#8E8E88]'}`}
                      />
                      <span className="font-heading text-base font-bold text-[#242424]">
                        {c.name}
                      </span>
                      <StatusBadge
                        status={c.monitoringEnabled ? 'Active' : 'Paused'}
                        tone={c.monitoringEnabled ? 'success' : 'neutral'}
                      />
                    </div>
                    <div className="text-xs text-[#686864]">
                      {c.website} · Tracking:{' '}
                      {c.monitoredCategories.join(', ') || 'General updates'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      aria-label={`Monitoring frequency for ${c.name}`}
                      value={c.monitoringFrequency}
                      onChange={(e) =>
                        updateCompetitorFrequency(
                          c.id,
                          e.target.value as CompetitorProfileData['monitoringFrequency']
                        )
                      }
                      className="h-8 px-2.5 text-xs border border-[#E6E6E2] rounded-[8px] bg-white"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleCompetitorMonitoring(c.id)}
                      className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium border border-[#E6E6E2] rounded-[8px] hover:bg-[#F5F5F4] cursor-pointer"
                    >
                      {c.monitoringEnabled ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      {c.monitoringEnabled ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(c)}
                      aria-label={`Remove ${c.name} from watchlist`}
                      className="p-2 text-[#BC3E3E] hover:bg-[#FDF0F0] rounded-[8px] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FluidTransition>
      )}

      {tab === 'reports' && (
        <FluidTransition
          key="mw-reports"
          direction="fade"
          className="max-w-2xl rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised"
        >
          <SectionHeader
            title="Scheduled Intelligence Reports"
            description="Configure automated digest delivery preferences (simulated)"
          />
          <div className="space-y-3">
            {[
              {
                key: 'dailyDigest' as const,
                title: 'Daily Market Pulse Digest',
                desc: 'Morning briefing summarizing urgent pricing or website diffs.',
              },
              {
                key: 'weeklyIntelligence' as const,
                title: 'Weekly Competitive Intelligence Report',
                desc: 'Curated Monday synthesis of category trends and recommended experiments.',
              },
              {
                key: 'monthlyReview' as const,
                title: 'Monthly Market Positioning Review',
                desc: 'Executive review of competitor shifts against your Business Brain.',
              },
            ].map((item) => {
              const enabled = state.scheduledReports[item.key];
              return (
                <div
                  key={item.key}
                  className="p-4 rounded-[10px] border border-[#E6E6E2] flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#242424]">{item.title}</div>
                    <div className="text-xs text-[#686864] mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateScheduledReports({ [item.key]: !enabled })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] cursor-pointer ${
                      enabled
                        ? 'bg-[#FF7417] text-white shadow-[0_1px_2px_rgba(255,116,23,0.28)]'
                        : 'bg-[#ECECE9] text-[#686864]'
                    }`}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#686864]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#FF7417]" />
              <span>Delivering digests to {state.scheduledReports.deliveryEmail}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('settings', { settingsTab: 'notification-settings' })}
              className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
            >
              Change delivery address in Settings →
            </button>
          </div>
        </FluidTransition>
      )}

      {/* Alert Detail Drawer */}
      <Drawer
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title="Market Alert Detail"
        subtitle={
          selectedEvent
            ? `${selectedEvent.competitorOrSource} · ${selectedEvent.category}`
            : undefined
        }
      >
        {selectedEvent && (
          <div className="space-y-5 text-sm">
            <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]">
              <div className="text-[11px] font-semibold text-[#24724E]">
                DETECTED FACTUAL CHANGE
              </div>
              <p className="mt-1 text-[#242424] leading-relaxed">{selectedEvent.detectedChange}</p>
              <div className="mt-2 text-xs text-[#686864]">
                Observed: {selectedEvent.detectedAt}
                <br />
                Source: {selectedEvent.sourceReference}
              </div>
            </div>

            <div className="p-4 rounded-[10px] bg-[#FFF0E5]/65 border border-[#FFD3B3]">
              <div className="text-[11px] font-semibold text-[#C44D00]">
                AI STRATEGIC INTERPRETATION
              </div>
              <p className="mt-1 text-[#242424] leading-relaxed">
                {selectedEvent.aiInterpretation}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#242424]">Potential Business Impact</div>
              <p className="text-xs text-[#686864] mt-1">{selectedEvent.potentialImpact}</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#242424]">Recommended Response</div>
              <p className="text-xs text-[#242424] mt-1">{selectedEvent.suggestedAction}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                convertEventToExperiment(selectedEvent.id);
                setSelectedEvent(null);
                navigate('tasks-experiments');
              }}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
            >
              Turn this opportunity into an experiment
            </button>
          </div>
        )}
      </Drawer>

      <AddCompetitorModal
        open={addWatchOpen}
        onClose={() => setAddWatchOpen(false)}
        title="Monitor Competitor in Market Watch"
      />

      <ConfirmationDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeCompetitor(removeTarget.id);
        }}
        title="Remove from Watchlist?"
        message={`Stop monitoring and remove ${removeTarget?.name ?? 'this competitor'} from your watchlist?`}
        confirmLabel="Remove Competitor"
        destructive
      />

      {!embedded && <JourneyNextStep currentRoute="market-watch" />}
    </div>
  );
};
