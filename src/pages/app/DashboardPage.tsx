import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Brain, Check, FlaskConical, RefreshCw, Sparkles, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import {
  calculateBrainCompleteness,
  calculateGoalProgress,
  calculateTaskCompletionStats,
  computeDashboardMetrics,
  selectFocusSprintTasks,
} from '../../utils/logic';
import {
  AnimatedMetric,
  Button,
  ChartContainer,
  EmptyState,
  FilterBar,
  FluidProgress,
  GrowthTrendChart,
  IntelligenceOrb,
  IntelligenceSurface,
  LiquidSkeletonReveal,
  PageHeader,
  PremiumDashboardSkeleton,
  PriorityBadge,
  ProgressBar,
  SectionHeader,
  StatusBadge,
  type GrowthTimeRange,
  type GrowthTrendSeriesMap,
} from '../../components/ui/DesignSystem';
import {
  InsightSavedBeacon,
  RecommendationActionSurface,
  TaskCompleteRowTransition,
} from '../../components/motion/LiquidMotion';
import {
  BrainLineagePopover,
  JourneyNextStep,
  TaskCard,
} from '../../components/ui/DepartmentCards';
import { ContextualCard } from '../../components/ui/ContextualActionLedger';
import { typeClass } from '../../theme/typography';

const DASHBOARD_FUNNEL_BY_RANGE: Record<GrowthTimeRange, number> = {
  '7d': 9,
  '30d': 28,
  '90d': 41,
  ytd: 64,
};

const DASHBOARD_PULSE_SERIES: GrowthTrendSeriesMap = {
  '7d': [
    { label: 'Mon', value: 4, detail: 'Weekly roast email drop' },
    { label: 'Tue', value: 5, detail: 'Free Tuesday shipping hook live', milestone: 'Ship Hook' },
    { label: 'Wed', value: 6, detail: 'Studio tasting kit follow-ups' },
    { label: 'Thu', value: 7, detail: 'Cart recovery cadence tuned' },
    {
      label: 'Fri',
      value: 8,
      detail: 'Influencer brew guide mention',
      milestone: 'Brew Guide',
      milestoneTone: 'accent',
    },
    { label: 'Now', value: 9, detail: 'Current 7-day conversion lift' },
  ],
  '30d': [
    { label: 'W1', value: 12, detail: 'Baseline onboarding sprint' },
    { label: 'W2', value: 16, detail: 'Roast-date carousel live', milestone: 'Carousel' },
    { label: 'W3', value: 15, detail: 'Checkout shipping copy test' },
    {
      label: 'W4',
      value: 22,
      detail: 'Studio tasting kit outreach',
      milestone: 'Tasting Kits',
      milestoneTone: 'accent',
    },
    { label: 'Now', value: 28, detail: 'Current 30-day momentum' },
  ],
  '90d': [
    { label: 'Sep', value: 14, detail: 'Initial subscriber cohort' },
    { label: 'Oct 1', value: 21, detail: 'Discovery flight launch', milestone: 'Flight Launch' },
    { label: 'Oct 15', value: 29, detail: 'Local design studio referrals' },
    {
      label: 'Nov 1',
      value: 35,
      detail: 'Free Tuesday shipping hook',
      milestone: 'Free Ship',
      milestoneTone: 'accent',
    },
    { label: 'Now', value: 41, detail: 'Current 90-day momentum' },
  ],
  ytd: [
    { label: 'Jan', value: 11, detail: 'Foundation funnel baseline' },
    { label: 'Mar', value: 22, detail: 'Direct subscription landing page', milestone: 'Sub LP' },
    { label: 'May', value: 31, detail: 'First retail partner pop-up' },
    {
      label: 'Jul',
      value: 44,
      detail: 'Roast transparency campaign',
      milestone: 'Roast Push',
      milestoneTone: 'accent',
    },
    { label: 'Sep', value: 53, detail: 'Office tasting kit expansion' },
    { label: 'Now', value: 64, detail: 'Year-to-date funnel trajectory' },
  ],
};

export const DashboardPage: React.FC = () => {
  const {
    state,
    navigate,
    toggleTaskStatus,
    addTask,
    updateRecommendationStatus,
    convertEventToExperiment,
  } = useBrainWise();
  const [rangeLabel, setRangeLabel] = useState<GrowthTimeRange>('30d');
  const [feedTab, setFeedTab] = useState<'actions' | 'signals' | 'goals' | 'all'>('actions');
  const [isSyncingBriefing, setIsSyncingBriefing] = useState(false);
  const [syncNonce, setSyncNonce] = useState(0);
  const briefingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (briefingTimerRef.current) window.clearTimeout(briefingTimerRef.current);
    };
  }, []);

  const handleSyncBriefing = () => {
    if (isSyncingBriefing) return;
    setIsSyncingBriefing(true);
    if (briefingTimerRef.current) window.clearTimeout(briefingTimerRef.current);
    briefingTimerRef.current = window.setTimeout(() => {
      setSyncNonce((n) => n + 1);
      setIsSyncingBriefing(false);
    }, 680);
  };

  const brainComp = calculateBrainCompleteness(state.brain);
  const taskStats = calculateTaskCompletionStats(state.tasks);
  const metrics = computeDashboardMetrics(state);

  const flaggedPriorities = state.tasks.filter((t) => t.isTodayPriority);
  const todaysPriorities =
    flaggedPriorities.length > 0
      ? flaggedPriorities.slice(0, 3)
      : selectFocusSprintTasks(state.tasks, 3);

  const activeExperiments = state.experiments.filter((e) => e.status === 'Active');
  const pendingRecommendations = state.recommendations.filter((r) => r.status === 'pending');
  const archivedSet = new Set(state.archivedEventIds ?? []);
  const visibleEvents = state.marketEvents.filter((e) => !archivedSet.has(e.id));

  // Single dominant strategic insight structured around the 5 founder questions
  const leadRecommendation = pendingRecommendations[0];
  const leadTask = todaysPriorities.find((t) => t.status !== 'completed') ?? todaysPriorities[0];

  const primaryFocus = leadRecommendation
    ? {
        badge: 'Primary Strategic Priority',
        title: leadRecommendation.whatToDo,
        whyDoIt: leadRecommendation.whyToDoIt || leadRecommendation.supportingResearch,
        expectedOutcome: leadRecommendation.expectedBenefit,
        context: `${leadRecommendation.difficulty} Effort · ${leadRecommendation.estimatedCost}`,
        ctaLabel: 'Accept to Today’s Sprint',
        onCta: () => {
          updateRecommendationStatus(leadRecommendation.id, 'accepted');
          addTask({
            title: leadRecommendation.whatToDo,
            description: leadRecommendation.whyToDoIt,
            whyItMatters: leadRecommendation.expectedBenefit,
            expectedOutcome: leadRecommendation.expectedBenefit,
            priority: leadRecommendation.priority,
            estimatedMinutes: 30,
            dueDate: new Date().toISOString().slice(0, 10),
            department: 'Growth Director',
            status: 'pending',
            isTodayPriority: true,
          });
        },
        secondaryLabel: 'Inspect Growth Planner',
        onSecondary: () => navigate('growth-director'),
      }
    : leadTask && leadTask.status !== 'completed'
      ? {
          badge: 'Next Action in Sprint',
          title: leadTask.title,
          whyDoIt: leadTask.whyItMatters,
          expectedOutcome: leadTask.expectedOutcome,
          context: `${leadTask.department} · ${leadTask.estimatedMinutes} mins estimated`,
          ctaLabel: 'Mark Focus Action Done',
          onCta: () => toggleTaskStatus(leadTask.id, 'completed'),
          secondaryLabel: 'Open Focus Sprint',
          onSecondary: () => navigate('growth-director'),
        }
      : {
          badge: 'Strategic Alignment',
          title: `Expand ${state.brain.businessName} intelligence`,
          whyDoIt:
            brainComp.percentage < 100
              ? 'Missing Business Brain context limits precision across competitive briefs and growth recommendations.'
              : 'Fresh market validation and competitor triggers keep your weekly execution sprint anchored in real demand.',
          expectedOutcome:
            brainComp.percentage < 100
              ? '100% cross-department context sync across all 5 modules.'
              : 'New opportunity sizing dossier & counter-experiments ready for launch.',
          context: `${brainComp.percentage}% Business Brain synced · ${activeExperiments.length} active experiments`,
          ctaLabel: brainComp.percentage < 100 ? 'Complete Business Brain' : 'Research New Idea',
          onCta: () =>
            navigate(brainComp.percentage < 100 ? 'business-brain' : 'idea-intelligence'),
          secondaryLabel: 'Review Market Watch',
          onSecondary: () => navigate('market-watch'),
        };

  const situationSummary = metrics.isFreshWorkspace
    ? `${state.brain.businessName} workspace initialized · Ready for first validation & baseline targets.`
    : `${taskStats.completed}/${taskStats.total} sprint tasks complete · ${activeExperiments.length} active tests · ${metrics.unreadHighImpactCount} high-impact market signal${metrics.unreadHighImpactCount === 1 ? '' : 's'}.`;

  return (
    <div className="space-y-10">
      <PageHeader
        meta={
          <span>
            {state.brain.businessName} · {state.brain.industry} · {state.brain.stage}
          </span>
        }
        mutedPrefix="Good morning,"
        title={`${state.user.firstName}.`}
        subtitle={situationSummary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncBriefing}
              disabled={isSyncingBriefing}
              aria-label="Sync executive briefing widgets"
              className="h-9 px-3.5 rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] border border-[#EAEAE5] hover:border-[#D6D6D0] bw-ceramic-control text-xs font-medium text-[#52524E] hover:text-[#171717] inline-flex items-center gap-1.5 transition-all focus-ring cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#858585]" />
              <span>{isSyncingBriefing ? 'Syncing…' : 'Sync Briefing'}</span>
            </button>
            <Button variant="secondary" size="sm" onClick={() => navigate('idea-intelligence')}>
              Research an Idea
            </Button>
          </div>
        }
      />

      <LiquidSkeletonReveal
        loading={isSyncingBriefing}
        contentKey={`dashboard-briefing-${syncNonce}`}
        statusLabel="Synchronizing dashboard intelligence widgets"
        skeleton={<PremiumDashboardSkeleton />}
      >
        <div className="space-y-10">
          {/* 1. Asymmetric Executive Command Strip: One Dominant Strategic Insight + Performance Pulse */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <ContextualCard
              cardId="executive-primary-priority"
              title={primaryFocus.title}
              subtitle={primaryFocus.context}
              category="Strategic Priority"
              route="growth-director"
              data={primaryFocus}
              className="lg:col-span-7 flex flex-col"
            >
              <IntelligenceSurface
                variant="light"
                className="bw-trace-card h-full p-7 sm:p-8 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#171717]">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <IntelligenceOrb size="xs" state="active" />
                        <span>{primaryFocus.badge}</span>
                      </span>
                      <span className="hidden sm:inline text-[#D6D6D0]" aria-hidden="true">
                        ·
                      </span>
                      <span className={`${typeClass.monoMeta} font-normal text-[#858585]`}>
                        {primaryFocus.context}
                      </span>
                    </div>
                    <StatusBadge status={metrics.trajectoryLabel} tone={metrics.trajectoryTone} />
                  </div>

                  <div>
                    <h2 className={`${typeClass.h2} text-[#171717]`}>{primaryFocus.title}</h2>
                  </div>

                  {/* Structured Reasoning & Expected Outcome (Answers "Why?" and "Expected Outcome?") */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-[#EFEFEB]">
                    <div>
                      <div className={`${typeClass.overline} text-[#858585]`}>
                        Why this matters now
                      </div>
                      <p className={`mt-1.5 ${typeClass.bodySm} text-[#252525]`}>
                        {primaryFocus.whyDoIt}
                      </p>
                    </div>
                    <div>
                      <div className={`${typeClass.overline} text-[#858585]`}>Expected outcome</div>
                      <p className={`mt-1.5 ${typeClass.bodySm} text-[#171717] font-medium`}>
                        {primaryFocus.expectedOutcome}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button variant="primary" size="md" onClick={primaryFocus.onCta}>
                      {primaryFocus.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="md" onClick={primaryFocus.onSecondary}>
                      {primaryFocus.secondaryLabel}
                    </Button>
                  </div>
                </div>

                <div className="mt-7 pt-6 border-t border-[#EFEFEB] grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                  <div className="sm:col-span-7 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`${typeClass.overline} text-[#858585]`}>
                        Primary Objective
                      </span>
                      <InsightSavedBeacon
                        saved={brainComp.percentage === 100}
                        label={brainComp.percentage === 100 ? 'Synced' : 'Partial'}
                      />
                    </div>
                    <div className={`${typeClass.bodySm} font-semibold text-[#171717] mt-1`}>
                      {state.brain.primaryGoals[0] ??
                        'Set primary growth objective in Business Brain'}
                    </div>
                  </div>
                  <div className="sm:col-span-5">
                    <FluidProgress
                      value={brainComp.percentage}
                      label="Business Brain Completeness"
                      size="sm"
                      tone="neutral"
                      activeShimmer={brainComp.percentage < 100}
                    />
                  </div>
                </div>
              </IntelligenceSurface>
            </ContextualCard>

            <ContextualCard
              cardId="performance-execution-pulse"
              title="Performance & Execution Pulse"
              subtitle={
                metrics.isFreshWorkspace
                  ? 'Awaiting baseline activity'
                  : 'Workspace execution + simulated storefront telemetry'
              }
              category="Storefront Telemetry"
              route="business-performance"
              data={{
                funnelPercent: DASHBOARD_FUNNEL_BY_RANGE[rangeLabel],
                timeframe: rangeLabel,
                series: DASHBOARD_PULSE_SERIES[rangeLabel],
              }}
              className="lg:col-span-5 flex flex-col"
            >
              <ChartContainer
                dark
                className="bw-trace-card bw-trace-dark h-full"
                title="Performance & Execution Pulse"
                subtitle={
                  metrics.isFreshWorkspace
                    ? 'Awaiting baseline activity'
                    : 'Workspace execution + simulated storefront telemetry'
                }
              >
                {metrics.isFreshWorkspace ? (
                  <EmptyState
                    tone="dark"
                    surface="embedded"
                    size="compact"
                    illustration="pulse"
                    overline="Telemetry · Awaiting Baseline"
                    title="Execution pulse on standby"
                    description="Complete your Business Brain context, run an Idea Intelligence validation, or add your first growth goal to unlock live execution tracking."
                    actionLabel="Run First Validation"
                    onAction={() => navigate('idea-intelligence')}
                    secondaryActionLabel="Update Business Brain"
                    onSecondaryAction={() => navigate('business-brain')}
                    showTopoGrid={false}
                  />
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-3.5">
                      <div>
                        <div className={`${typeClass.metricSm} text-white`}>
                          <AnimatedMetric value={metrics.goalsAvgPercentage} suffix="%" />
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#A8A8A2] mt-0.5`}
                        >
                          Goal Progress
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#4FA87B] mt-0.5`}
                        >
                          {state.goals.length} tracked
                        </div>
                      </div>
                      <div>
                        <div className={`${typeClass.metricSm} text-white`}>
                          <AnimatedMetric value={taskStats.completionRate} suffix="%" />
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#A8A8A2] mt-0.5`}
                        >
                          Sprint Rate
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#4FA87B] mt-0.5`}
                        >
                          {taskStats.completed}/{taskStats.total} done
                        </div>
                      </div>
                      <div>
                        <div className={`${typeClass.metricSm} text-[#FF9A45]`}>
                          <AnimatedMetric
                            value={DASHBOARD_FUNNEL_BY_RANGE[rangeLabel]}
                            prefix="+"
                            suffix="%"
                          />
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#A8A8A2] mt-0.5`}
                        >
                          Sample Funnel
                        </div>
                        <div
                          className={`${typeClass.overline} normal-case tracking-normal text-[#858585] mt-0.5`}
                        >
                          Simulated
                        </div>
                      </div>
                    </div>

                    <GrowthTrendChart
                      dark
                      height={136}
                      range={rangeLabel}
                      onRangeChange={setRangeLabel}
                      rangeLabel="Timeframe"
                      rangeSeries={DASHBOARD_PULSE_SERIES}
                      unitPrefix="+"
                      unitSuffix="%"
                      metricLabel="Sample Funnel"
                      ariaLabel="Performance and execution pulse growth trend"
                    />
                  </div>
                )}
              </ChartContainer>
            </ContextualCard>
          </div>

          {/* 2. Unboxed Open Editorial Hairline Telemetry Ledger */}
          <section aria-label="Operating departments status">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-[#E6E6E2] divide-y sm:divide-y-0 sm:divide-x divide-[#EFEFEB]">
              {[
                {
                  label: 'Market Position',
                  value: metrics.marketPositionLabel,
                  detail: metrics.marketPositionDetail,
                  route: 'competitive-intelligence' as const,
                },
                {
                  label: 'Competitors',
                  value: state.competitors.length,
                  detail: `${state.competitors.filter((c) => c.monitoringEnabled).length} monitored`,
                  route: 'competitive-intelligence' as const,
                },
                {
                  label: 'Experiments',
                  value: metrics.activeExperimentsCount,
                  detail: 'Active growth tests',
                  route: 'tasks-experiments' as const,
                },
                {
                  label: 'Pending Tasks',
                  value: taskStats.pending,
                  detail: `${taskStats.completionRate}% completed`,
                  route: 'growth-director' as const,
                },
                {
                  label: 'Dossiers',
                  value: state.reports.length,
                  detail: 'Idea Intelligence',
                  route: 'idea-intelligence' as const,
                },
                {
                  label: 'Brand Assets',
                  value: metrics.activeAssetsCount,
                  detail: state.brand.status,
                  route: 'asset-library' as const,
                },
              ].map((cell) => (
                <ContextualCard
                  key={cell.label}
                  cardId={`telemetry-${cell.label.toLowerCase().replace(/\s+/g, '-')}`}
                  title={cell.label}
                  subtitle={cell.detail}
                  category="Operating Ledger"
                  route={cell.route}
                  data={{ label: cell.label, value: cell.value, detail: cell.detail }}
                  showActionTrigger={false}
                  className="h-full"
                >
                  <button
                    type="button"
                    onClick={() => navigate(cell.route)}
                    className="bw-trace-card w-full h-full group px-4 sm:px-5 py-5 text-left hover:bg-[#FFFFFF] transition-all flex flex-col justify-between gap-2.5 focus-ring-inset cursor-pointer"
                  >
                    <span
                      className={`${typeClass.overline} text-[#858585] group-hover:text-[#171717] transition-colors`}
                    >
                      {cell.label}
                    </span>
                    <div>
                      <div
                        className={`truncate ${
                          typeof cell.value === 'string' && cell.value.length > 10
                            ? typeClass.body + ' font-bold'
                            : typeClass.metric
                        } text-[#171717]`}
                      >
                        {typeof cell.value === 'number' ? (
                          <AnimatedMetric value={cell.value} />
                        ) : (
                          cell.value
                        )}
                      </div>
                      <div className={`${typeClass.bodySm} text-[#858585] mt-1 truncate`}>
                        {cell.detail}
                      </div>
                    </div>
                  </button>
                </ContextualCard>
              ))}
            </div>
          </section>

          {/* 3. Progressive Disclosure Workspace Feed Switcher */}
          <section aria-label="Workspace feeds" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <FilterBar
                activeId={feedTab}
                onChange={(id) => setFeedTab(id as 'actions' | 'signals' | 'goals' | 'all')}
                options={[
                  {
                    id: 'actions',
                    label: `Actions & Sprint (${pendingRecommendations.length + todaysPriorities.length})`,
                  },
                  { id: 'signals', label: `Market Signals (${visibleEvents.length})` },
                  { id: 'goals', label: `Goals & Activity (${state.goals.length})` },
                  { id: 'all', label: 'Show All' },
                ]}
              />
              <BrainLineagePopover
                sourceDepartment="Business Brain & Analytics"
                insight={`Workspace priorities synthesize ${state.brain.businessName}'s active goals, competitor gaps, and pending growth tasks.`}
                targetRoute="business-brain"
                editLabel="Adjust strategic context"
                align="right"
              />
            </div>

            {(feedTab === 'actions' || feedTab === 'all') && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-7 space-y-4">
                  <SectionHeader
                    title="Recommended Next Actions"
                    description={`${pendingRecommendations.length} opportunities synthesized from Business Brain`}
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('growth-director')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer transition-colors"
                      >
                        Open Growth Planner →
                      </button>
                    }
                  />
                  {pendingRecommendations.length === 0 ? (
                    <EmptyState
                      illustration="actions"
                      overline="Strategic Queue · Caught Up"
                      mutedPrefix="All opportunities"
                      title="processed"
                      description="Review active tasks in Growth Planner or run a new Idea Intelligence dossier to uncover fresh leverage moves."
                      meta="0 pending · Synced with Business Brain"
                      actionLabel="Open Growth Planner"
                      onAction={() => navigate('growth-director')}
                      secondaryActionLabel="Validate New Idea"
                      onSecondaryAction={() => navigate('idea-intelligence')}
                    />
                  ) : (
                    <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                      {pendingRecommendations.slice(0, 3).map((rec) => (
                        <ContextualCard
                          key={rec.id}
                          cardId={`rec-${rec.id}`}
                          title={rec.whatToDo}
                          subtitle={`${rec.difficulty} Effort · ${rec.estimatedCost}`}
                          category="Strategy Opportunity"
                          route="growth-director"
                          data={rec}
                          showActionTrigger={false}
                        >
                          <RecommendationActionSurface className="bw-trace-card py-5 px-3 -mx-3 rounded-[14px] space-y-2.5 hover:bg-[#FFFFFF] transition-all cursor-pointer">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-num text-[#858585]">
                                <Sparkles className="w-3 h-3 text-[#858585]" />
                                {rec.difficulty} Effort · {rec.estimatedCost}
                              </span>
                              <PriorityBadge priority={rec.priority} />
                            </div>
                            <div className={`${typeClass.body} font-semibold text-[#171717]`}>
                              {rec.whatToDo}
                            </div>
                            <p className={`${typeClass.bodySm} text-[#5C5C58]`}>
                              {rec.expectedBenefit}
                            </p>
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-[#858585] truncate max-w-[260px]">
                                {rec.supportingResearch}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateRecommendationStatus(rec.id, 'rejected')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-[#5C5C58] hover:text-[#171717] bg-[#FFFFFF] border border-[#E8E8E4] hover:border-[#D6D6D0] bw-ceramic-control rounded-full transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  Dismiss
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateRecommendationStatus(rec.id, 'accepted');
                                    addTask({
                                      title: rec.whatToDo,
                                      description: rec.whyToDoIt,
                                      whyItMatters: rec.expectedBenefit,
                                      expectedOutcome: rec.expectedBenefit,
                                      priority: rec.priority,
                                      estimatedMinutes: 30,
                                      dueDate: new Date().toISOString().slice(0, 10),
                                      department: 'Growth Director',
                                      status: 'pending',
                                      isTodayPriority: true,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-semibold text-white bg-[#171717] hover:bg-[#252525] rounded-full transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  Accept to Tasks
                                </button>
                              </div>
                            </div>
                          </RecommendationActionSurface>
                        </ContextualCard>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <SectionHeader
                    title="Today’s Priorities"
                    description="Focused sprint synced with Growth Planner"
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('growth-director')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer transition-colors"
                      >
                        Full sprint →
                      </button>
                    }
                  />
                  {todaysPriorities.length === 0 ? (
                    <EmptyState
                      illustration="sprint"
                      size="compact"
                      overline="Daily Sprint · Standby"
                      mutedPrefix="No sprint tasks"
                      title="queued yet"
                      description="Accept a recommended action or create your first priority inside Growth Planner."
                      meta="0 active priorities"
                      actionLabel="Open Growth Planner"
                      onAction={() => navigate('growth-director')}
                    />
                  ) : (
                    <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                      {todaysPriorities.map((task) => (
                        <ContextualCard
                          key={task.id}
                          cardId={`task-${task.id}`}
                          title={task.title}
                          subtitle={`${task.department} · Due ${task.dueDate}`}
                          category="Sprint Priority"
                          route="growth-director"
                          data={task}
                          showActionTrigger={false}
                        >
                          <TaskCompleteRowTransition completed={task.status === 'completed'}>
                            <TaskCard
                              task={task}
                              flat
                              onToggleComplete={(id) => toggleTaskStatus(id)}
                              onInspect={() => navigate('growth-director')}
                            />
                          </TaskCompleteRowTransition>
                        </ContextualCard>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(feedTab === 'signals' || feedTab === 'all') && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-7 space-y-4">
                  <SectionHeader
                    title="Competitor Developments"
                    description={`${metrics.unreadHighImpactCount} urgent · ${visibleEvents.length} active alerts`}
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('market-watch')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer transition-colors"
                      >
                        Open Market Watch →
                      </button>
                    }
                  />
                  {visibleEvents.length === 0 ? (
                    <EmptyState
                      illustration="signals"
                      overline="Market Watch · Listening"
                      mutedPrefix="No competitor signals"
                      title="detected yet"
                      description="Add tracked rivals in Market Watch to monitor pricing shifts, launches, and review velocity in real time."
                      actionLabel="Configure Market Watch"
                      onAction={() => navigate('market-watch')}
                    />
                  ) : (
                    <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                      {visibleEvents.slice(0, 3).map((ev) => (
                        <ContextualCard
                          key={ev.id}
                          cardId={`signal-${ev.id}`}
                          title={ev.competitorOrSource}
                          subtitle={ev.detectedChange}
                          category="Market Watch Alert"
                          route="market-watch"
                          data={ev}
                          showActionTrigger={false}
                        >
                          <div className="bw-trace-card py-5 px-3 -mx-3 rounded-[14px] hover:bg-[#FFFFFF] transition-all space-y-2.5 cursor-pointer">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-[#171717] truncate">
                                  {ev.competitorOrSource}
                                </span>
                                <PriorityBadge priority={ev.importance} />
                              </div>
                              <span className="text-[11px] font-mono-num text-[#858585] shrink-0">
                                {ev.detectedAt.split('·')[0]}
                              </span>
                            </div>
                            <p className={`${typeClass.bodySm} text-[#252525]`}>
                              {ev.detectedChange}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <span className="text-[11px] text-[#5C5C58] truncate max-w-[260px]">
                                {ev.suggestedAction}
                              </span>
                              {ev.convertedToExperimentId ? (
                                <button
                                  type="button"
                                  onClick={() => navigate('tasks-experiments')}
                                  className="text-[11px] font-semibold text-[#24724E] cursor-pointer shrink-0"
                                >
                                  View Test →
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => convertEventToExperiment(ev.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-[#FFFFFF] text-[#171717] hover:bg-[#171717] hover:text-white border border-[#E8E8E4] hover:border-[#171717] bw-ceramic-control rounded-full transition-colors cursor-pointer shrink-0"
                                >
                                  <FlaskConical className="w-3 h-3" />
                                  Counter-Test
                                </button>
                              )}
                            </div>
                          </div>
                        </ContextualCard>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <SectionHeader
                    title="Active Growth Experiments"
                    description={`${activeExperiments.length} running tests`}
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('tasks-experiments')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer transition-colors"
                      >
                        Manage experiments →
                      </button>
                    }
                  />
                  <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                    {activeExperiments.length === 0 ? (
                      <div className="pt-5">
                        <EmptyState
                          illustration="experiments"
                          size="compact"
                          surface="embedded"
                          overline="Experiment Lab · Ready"
                          title="No active growth tests"
                          description="Promote a planned counter-test or launch a structured acquisition experiment to measure lift."
                          actionLabel="Launch Experiment"
                          onAction={() => navigate('tasks-experiments')}
                        />
                      </div>
                    ) : (
                      activeExperiments.slice(0, 3).map((exp) => (
                        <ContextualCard
                          key={exp.id}
                          cardId={`exp-${exp.id}`}
                          title={exp.title}
                          subtitle={exp.successMetric}
                          category="Growth Experiment"
                          route="tasks-experiments"
                          data={exp}
                          showActionTrigger={false}
                        >
                          <button
                            type="button"
                            onClick={() => navigate('tasks-experiments')}
                            className="bw-trace-card w-full text-left py-4 px-3 -mx-3 rounded-[14px] hover:bg-[#FFFFFF] transition-all flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#171717] truncate">
                                {exp.title}
                              </div>
                              <div className="text-[11px] text-[#5C5C58] truncate mt-0.5">
                                {exp.successMetric}
                              </div>
                            </div>
                            <StatusBadge status={exp.status} tone="neutral" />
                          </button>
                        </ContextualCard>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {(feedTab === 'goals' || feedTab === 'all') && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                <div className="lg:col-span-6 space-y-4">
                  <SectionHeader
                    title="Goal Progress"
                    description="Primary workspace targets"
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('business-performance')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer transition-colors"
                      >
                        Analytics →
                      </button>
                    }
                  />
                  <div className="border-t border-[#E6E6E2] pt-5 space-y-5">
                    {state.goals.length === 0 ? (
                      <EmptyState
                        illustration="goals"
                        size="compact"
                        surface="embedded"
                        overline="Objective Tracker · Unset"
                        title="No quantitative goals configured"
                        description="Define 30- and 90-day growth targets in Growth Planner to track workspace trajectory."
                        actionLabel="Set 30-Day Goals"
                        onAction={() => navigate('growth-director')}
                      />
                    ) : (
                      state.goals.slice(0, 4).map((goal) => {
                        const prog = calculateGoalProgress(goal);
                        return (
                          <ContextualCard
                            key={goal.id}
                            cardId={`goal-${goal.id}`}
                            title={goal.title}
                            subtitle={`${goal.currentValue} / ${goal.targetValue} ${goal.unit}`}
                            category="Growth Goal"
                            route="business-performance"
                            data={{ ...goal, progressPercentage: prog.percentage }}
                            showActionTrigger={false}
                          >
                            <div
                              className="bw-trace-card p-3 rounded-[12px] hover:bg-[#FFFFFF] transition-all space-y-1.5 cursor-pointer"
                              onClick={() => navigate('business-performance')}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  navigate('business-performance');
                                }
                              }}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-[#171717] truncate">
                                  {goal.title}
                                </span>
                                <span className="font-mono-num text-[#5C5C58] shrink-0">
                                  {goal.currentValue} / {goal.targetValue} {goal.unit}
                                </span>
                              </div>
                              <ProgressBar
                                value={prog.percentage}
                                showPercent={false}
                                size="sm"
                                tone="neutral"
                              />
                            </div>
                          </ContextualCard>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <SectionHeader
                    title="Recent Activity"
                    description="Cross-department Business Brain log"
                    action={
                      <button
                        type="button"
                        onClick={() => navigate('business-brain')}
                        className="text-xs font-medium text-[#5C5C58] hover:text-[#171717] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Brain className="w-3.5 h-3.5 text-[#858585]" />
                        Open Brain →
                      </button>
                    }
                  />
                  {state.brain.history.length === 0 ? (
                    <EmptyState
                      illustration="activity"
                      size="compact"
                      surface="embedded"
                      overline="Brain Log · Standby"
                      title="No cross-department activity yet"
                      description="Strategic decisions, dossier syntheses, and brand approvals will stream here automatically."
                      actionLabel="Open Business Brain"
                      onAction={() => navigate('business-brain')}
                    />
                  ) : (
                    <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                      {state.brain.history.slice(0, 4).map((h) => (
                        <ContextualCard
                          key={h.id}
                          cardId={`activity-${h.id}`}
                          title={`${h.department} Event`}
                          subtitle={`${h.date} · ${h.event}`}
                          category="Business Brain Log"
                          route="business-brain"
                          data={h}
                          showActionTrigger={false}
                        >
                          <div
                            className="bw-trace-card py-3 px-2 -mx-2 rounded-[12px] hover:bg-[#FFFFFF] transition-all cursor-pointer"
                            onClick={() => navigate('business-brain')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('business-brain');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#858585]">
                              <span className="text-[#171717] font-medium">{h.department}</span>
                              <span className="font-mono-num">{h.date}</span>
                            </div>
                            <p className={`${typeClass.bodySm} text-[#5C5C58] mt-1`}>{h.event}</p>
                          </div>
                        </ContextualCard>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </LiquidSkeletonReveal>

      {(metrics.isFreshWorkspace || brainComp.percentage < 100) && (
        <JourneyNextStep currentRoute="dashboard" />
      )}
    </div>
  );
};
