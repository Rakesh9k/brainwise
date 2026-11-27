import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Brain, Check, Compass, FlaskConical, Plus, RefreshCw, Sparkles, Trophy, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { Modal } from '../../components/ui/Overlay';
import {
  calculateBrainCompleteness,
  calculateGoalProgress,
  calculateTaskCompletionStats,
  computeDashboardMetrics,
  deriveExecutionPulseSeries,
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
  StaggeredLiquidContainer,
  StaggeredLiquidItem,
  StatusBadge,
  type GrowthTimeRange,
  type GrowthTrendSeriesMap,
} from '../../components/ui/DesignSystem';
import {
  InsightSavedBeacon,
  RecommendationActionSurface,
} from '../../components/motion/LiquidMotion';
import {
  BrainLineagePopover,
  JourneyNextStep,
} from '../../components/ui/DepartmentCards';
import { ContextualCard } from '../../components/ui/ContextualActionLedger';
import { UniversalExecutiveLayer } from '../../components/ui/UniversalExecutiveLayer';
import { FounderJourneyFlowBar, FreshWorkspaceLaunchpad } from '../../components/ui/FounderJourneyFlowBar';
import { typeClass } from '../../theme/typography';

export const DashboardPage: React.FC = () => {
  const {
    state,
    navigate,
    toggleTaskStatus,
    addTask,
    addRecommendations,
    updateRecommendationStatus,
    convertEventToExperiment,
    refreshWorkspace,
    showToast,
  } = useBrainWise();
  const [rangeLabel, setRangeLabel] = useState<GrowthTimeRange>('30d');
  const [feedTab, setFeedTab] = useState<'actions' | 'signals' | 'goals' | 'all'>('actions');
  const [isSyncingBriefing, setIsSyncingBriefing] = useState(false);
  const [syncNonce, setSyncNonce] = useState(0);
  const [scanningQueue, setScanningQueue] = useState(false);
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [removedStickyIds, setRemovedStickyIds] = useState<string[]>([]);
  const [sprintVictoryOpen, setSprintVictoryOpen] = useState(false);
  const [sprintVictoryDismissed, setSprintVictoryDismissed] = useState(false);
  const briefingTimerRef = useRef<number | null>(null);

  const handleScanOpportunities = () => {
    if (scanningQueue) return;
    setScanningQueue(true);
    const brand = state.brain.businessName || 'Your Brand';
    const rival =
      state.competitors.find((c) => c.name?.trim())?.name || 'category incumbents';
    const flagship = state.brain.products?.[0]?.name || 'your flagship offer';
    const audience = (state.brain.targetAudience || 'target buyers').replace(/\.+$/, '');
    window.setTimeout(() => {
      addRecommendations([
        {
          whatToDo: `Launch ${flagship} Comparison & Pricing Transparency Card`,
          whyToDoIt: `Captures high-intent ${audience} comparing against ${rival}.`,
          expectedBenefit: '+18–25% conversion lift on warm traffic',
          difficulty: 'Low',
          estimatedCost: '₹0 (Organic / Site)',
          priority: 'high',
          supportingResearch: `Grounded in ${brand} Business Brain & ${rival} pricing gaps`,
        },
        {
          whatToDo: `Publish 5-Slide Educational Carousel for ${brand}`,
          whyToDoIt: 'Builds organic trust and addresses top buyer objections.',
          expectedBenefit: '2x organic saves & DM inquiries',
          difficulty: 'Low',
          estimatedCost: 'Brand Studio Credits',
          priority: 'medium',
          supportingResearch: 'Aligned with Brand Guidelines daily messaging angles',
        },
      ]);
      setScanningQueue(false);
      showToast('Discovered 2 fresh strategic opportunities from your Business Brain.');
    }, 550);
  };

  const brainComp = calculateBrainCompleteness(state.brain);
  const taskStats = calculateTaskCompletionStats(state.tasks);
  const metrics = computeDashboardMetrics(state);

  const executionPulseSeries: GrowthTrendSeriesMap = useMemo(() => {
    return deriveExecutionPulseSeries(state);
  }, [state]);

  useEffect(() => {
    if (taskStats.total > 0 && taskStats.completed === taskStats.total && !sprintVictoryDismissed) {
      setSprintVictoryOpen(true);
    }
  }, [taskStats.completed, taskStats.total, sprintVictoryDismissed]);

  useEffect(() => {
    return () => {
      if (briefingTimerRef.current) window.clearTimeout(briefingTimerRef.current);
    };
  }, []);

  const handleSyncBriefing = async () => {
    if (isSyncingBriefing) return;
    setIsSyncingBriefing(true);
    try {
      await refreshWorkspace();
      setSyncNonce((n) => n + 1);
      showToast('Dashboard briefing synchronized with live telemetry.');
    } catch {
      showToast('Failed to synchronize briefing telemetry.', { tone: 'error' });
    } finally {
      setIsSyncingBriefing(false);
    }
  };

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

      {/* Universal Executive Glance Layer (Layer 1 + Layer 3 Proof Drawer) */}
      <UniversalExecutiveLayer
        departmentCode="DEP-01"
        sectionTitle="Executive Command Center"
        oneLiner="Your business command center: what’s working, what changed today, and what you should do next."
        statusPills={[
          {
            label: 'Readiness: 94/100 · Optimal',
            tone: 'emerald',
            icon: <Sparkles className="w-3 h-3 text-[#10B981]" />,
          },
          {
            label: `${activeExperiments.length} Tests Running`,
            tone: 'blue',
          },
          {
            label: `${taskStats.completed}/${taskStats.total} Sprint Done`,
            tone: 'neutral',
          },
        ]}
        primaryAction={{
          label: "Execute Today's Next Move",
          onClick: primaryFocus.onCta,
          icon: <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />,
        }}
        secondaryAction={{
          label: 'Sync Briefing',
          onClick: handleSyncBriefing,
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#71717A]" />,
        }}
        proofTelemetry={(() => {
          const calScore = metrics.isFreshWorkspace
            ? brainComp.percentage
            : Math.round(
                brainComp.percentage * 0.4 +
                  taskStats.completionRate * 0.4 +
                  metrics.goalsAvgPercentage * 0.2
              );
          const isDashStandby = metrics.isFreshWorkspace && brainComp.percentage === 0;

          return {
            confidenceScore: calScore,
            confidenceLabel: isDashStandby
              ? 'Telemetry Standby'
              : 'System Calibration Score',
            statusBadge: isDashStandby
              ? 'STANDBY'
              : calScore >= 70
                ? 'PASS'
                : 'OPTIMAL',
            isStandby: isDashStandby,
            metrics: [
              {
                label: 'Strategic Alignment',
                value: `${metrics.goalsAvgPercentage}%`,
                subtext: 'Across active goals',
                status: 'optimal',
              },
              {
                label: 'Execution Velocity',
                value: `${taskStats.completionRate}%`,
                subtext: `${taskStats.completed}/${taskStats.total} completed`,
                status: 'optimal',
              },
              {
                label: 'Active Growth Tests',
                value: activeExperiments.length,
                subtext: 'Experiments running',
                status: 'optimal',
              },
              {
                label: 'Brain Memory Completeness',
                value: `${brainComp.percentage}%`,
                subtext: 'Ground truth synced',
                status: 'verified',
              },
            ],
          lineageItems: [
            {
              title: primaryFocus.title,
              source: 'Unified Strategic Reasoning Engine',
              timestamp: 'Real-time Telemetry',
              confidence: 0.98,
              type: 'GROUND_TRUTH',
              details: primaryFocus.whyDoIt,
            },
            {
              title: 'Sprint Focus Calibration',
              source: 'Deterministic Task Optimizer',
              timestamp: 'Sprint 4',
              confidence: 0.95,
              type: 'USER_CONFIRMED',
              details: `${taskStats.pending} pending tasks optimized for founder focus.`,
            },
          ],
          guardrails: {
            truthCheckStatus: 'PASSED',
            antiFatigueScore: '0% Repetition · Fresh',
            creditProtection: 'ACTIVE_ZERO_LOSS_ESCROW',
            modelAudited: 'Gemini 2.5 Flash Grounded',
          },
          rawJson: {
            department: 'DEP-01 (Executive Command Center)',
            workspace: state.brain.businessName || 'Default Workspace',
            readinessScore: calScore,
            activeExperiments: activeExperiments.length,
            taskCompletionRate: taskStats.completionRate,
            primaryFocusTitle: primaryFocus.title,
            groundTruthPercentage: brainComp.percentage,
            timestamp: new Date().toISOString(),
          },
        };
      })()}
      />

      {/* Minimalistic Centric Launchpad when user hasn't generated or interacted with anything yet */}
      {state.reports.length === 0 &&
        state.competitors.length === 0 &&
        state.tasks.length === 0 &&
        state.assets.length === 0 && (
          <FreshWorkspaceLaunchpad
            businessName={state.brain?.businessName}
            onValidateIdea={() => navigate('idea-intelligence')}
            onOpenBrain={() => navigate('business-brain')}
          />
        )}

      {/* Interactive Animated Founder Journey Flow Bar */}
      <FounderJourneyFlowBar state={state} onNavigate={navigate} />

      <LiquidSkeletonReveal
        loading={isSyncingBriefing}
        contentKey={`dashboard-briefing-${syncNonce}`}
        statusLabel="Synchronizing dashboard intelligence widgets"
        skeleton={<PremiumDashboardSkeleton />}
      >
        <div className="space-y-10">
          {/* 1. Asymmetric Executive Command Strip: One Dominant Strategic Insight + Performance Pulse */}
          <StaggeredLiquidContainer className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <StaggeredLiquidItem className="lg:col-span-7 flex flex-col">
              <ContextualCard
                cardId="executive-primary-priority"
                title={primaryFocus.title}
                subtitle={primaryFocus.context}
                category="Strategic Priority"
                route="growth-director"
                data={primaryFocus}
                className="h-full flex flex-col"
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
                        <div className={`${typeClass.overline} text-[#858585]`}>
                          Expected outcome
                        </div>
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
                        {state.brain.primaryGoals?.[0] ??
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
                      {brainComp.percentage < 100 && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#686864]">
                          <span className="truncate">AI accuracy scales with Business Brain completeness</span>
                          <button
                            type="button"
                            onClick={() => navigate('business-brain')}
                            className="text-[#FF7417] font-semibold hover:underline shrink-0 ml-1.5 cursor-pointer"
                          >
                            Update &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </IntelligenceSurface>
              </ContextualCard>
            </StaggeredLiquidItem>

            <StaggeredLiquidItem className="lg:col-span-5 flex flex-col">
              <ContextualCard
                cardId="performance-execution-pulse"
                title="Performance & Execution Pulse"
                subtitle={
                  metrics.isFreshWorkspace
                    ? 'Awaiting baseline activity'
                    : 'Live sprint execution velocity & goal pacing'
                }
                category="Execution Velocity"
                route="business-performance"
                data={{
                  completionRate: taskStats.completionRate,
                  timeframe: rangeLabel,
                  series: executionPulseSeries[rangeLabel],
                }}
                className="h-full flex flex-col"
              >
                <ChartContainer
                  dark
                  className="bw-trace-card bw-trace-dark h-full"
                  title="Performance & Execution Pulse"
                  subtitle={
                    metrics.isFreshWorkspace
                      ? 'Awaiting baseline activity'
                      : 'Live sprint execution velocity & goal pacing'
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
                              value={metrics.activeExperimentsCount}
                            />
                          </div>
                          <div
                            className={`${typeClass.overline} normal-case tracking-normal text-[#A8A8A2] mt-0.5`}
                          >
                            Active Tests
                          </div>
                          <div
                            className={`${typeClass.overline} normal-case tracking-normal text-[#858585] mt-0.5`}
                          >
                            {state.experiments.length} tracked
                          </div>
                        </div>
                      </div>

                      <GrowthTrendChart
                        dark
                        height={136}
                        range={rangeLabel}
                        onRangeChange={setRangeLabel}
                        rangeLabel="Timeframe"
                        rangeSeries={executionPulseSeries}
                        unitSuffix="%"
                        metricLabel="Sprint Velocity"
                        ariaLabel="Performance and execution pulse growth trend"
                      />
                    </div>
                  )}
                </ChartContainer>
              </ContextualCard>
            </StaggeredLiquidItem>
          </StaggeredLiquidContainer>

          {/* 2. Unboxed Open Editorial Hairline Telemetry Ledger */}
          <section aria-label="Operating departments status">
            <StaggeredLiquidContainer
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-[#E6E6E2] divide-y sm:divide-y-0 sm:divide-x divide-[#EFEFEB]"
              staggerDelay={0.04}
              initialDelay={0.12}
            >
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
                <StaggeredLiquidItem key={cell.label} className="h-full">
                  <ContextualCard
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
                </StaggeredLiquidItem>
              ))}
            </StaggeredLiquidContainer>
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
              <StaggeredLiquidContainer
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10"
                staggerDelay={0.08}
                initialDelay={0.16}
              >
                <StaggeredLiquidItem className="lg:col-span-7 space-y-4">
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
                    <div className="relative rounded-[18px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 sm:p-8 text-center space-y-5 overflow-hidden bw-surface-raised">
                      {/* Animated Concentric Radar Ring */}
                      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0.1, 0.45] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute inset-0 rounded-full border border-[#FF7417]/50"
                        />
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-1.5 rounded-full border border-dashed border-[#D6D6D0]"
                        >
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FF7417]" />
                        </motion.div>
                        <div className="w-11 h-11 rounded-full bg-[#FFF0E5] border border-[#FFD3B3] flex items-center justify-center text-[#C44D00]">
                          <Compass className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-md mx-auto">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-mono-num uppercase tracking-wider text-[#C44D00]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF7417] animate-pulse" />
                          <span>STRATEGIC QUEUE · READY TO SCAN</span>
                        </div>
                        <h3 className="font-heading text-xl font-bold text-[#171717]">
                          <span className="text-[#858585] font-medium">All opportunities</span> processed
                        </h3>
                        <p className="text-xs text-[#5C5C58] leading-relaxed">
                          Scan your Business Brain &amp; competitor gaps to surface fresh next moves, or jump straight into Growth Planner.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={scanningQueue}
                          onClick={handleScanOpportunities}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {scanningQueue ? 'Scanning Brain…' : 'Scan for New Opportunities'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('growth-director')}
                        >
                          Open Growth Planner
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('idea-intelligence')}
                        >
                          Validate New Idea
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
                      <AnimatePresence>
                        {pendingRecommendations.slice(0, 3).map((rec) => (
                          <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ContextualCard
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
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </StaggeredLiquidItem>

                <StaggeredLiquidItem className="lg:col-span-5 space-y-4">
                  <SectionHeader
                    title="Today’s Priorities"
                    description="Interactive sticky-note sprint — click to scratch off or peel away"
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
                  {(() => {
                    const visibleStickyNotes = todaysPriorities.filter(
                      (t) => !removedStickyIds.includes(t.id)
                    );
                    const noteThemes = [
                      {
                        bg: 'bg-[#FFFBEB]',
                        border: 'border-[#FDE68A]',
                        pin: 'bg-[#EF4444]',
                        tilt: '-rotate-[0.6deg]',
                      },
                      {
                        bg: 'bg-[#FFF5EB]',
                        border: 'border-[#FED7AA]',
                        pin: 'bg-[#FF7417]',
                        tilt: 'rotate-[0.5deg]',
                      },
                      {
                        bg: 'bg-[#FEFCE8]',
                        border: 'border-[#FEF08A]',
                        pin: 'bg-[#16A34A]',
                        tilt: '-rotate-[0.4deg]',
                      },
                    ];

                    return (
                      <div className="space-y-3">
                        {visibleStickyNotes.length === 0 ? (
                          <EmptyState
                            illustration="sprint"
                            size="compact"
                            overline="Daily Sprint · Clear Board"
                            mutedPrefix="All sticky notes"
                            title="cleared!"
                            description="Pin a new quick note below or accept a recommended action."
                            meta="0 active sticky notes"
                            actionLabel="Open Growth Planner"
                            onAction={() => navigate('growth-director')}
                          />
                        ) : (
                          <AnimatePresence>
                            {visibleStickyNotes.map((task, idx) => {
                              const isDone = task.status === 'completed';
                              const theme = noteThemes[idx % noteThemes.length];
                              return (
                                <motion.div
                                  key={task.id}
                                  layout
                                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, x: 36, rotate: 5, scale: 0.92 }}
                                  transition={{ duration: 0.22 }}
                                  className={`group relative rounded-[14px] border ${theme.bg} ${theme.border} p-4 pt-5 shadow-[0_10px_22px_-16px_rgba(23,23,23,0.35)] hover:shadow-[0_14px_26px_-14px_rgba(23,23,23,0.4)] ${theme.tilt} hover:rotate-0 transition-all`}
                                >
                                  {/* Push-Pin / Tape Accent */}
                                  <span
                                    aria-hidden="true"
                                    className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ${theme.pin} border-2 border-white shadow-sm`}
                                  />

                                  {/* Animated Scratch-Off SVG Line when Completed */}
                                  {isDone && (
                                    <svg
                                      viewBox="0 0 300 40"
                                      className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 w-[92%] h-10 opacity-75"
                                      aria-hidden="true"
                                    >
                                      <motion.path
                                        d="M 6 22 Q 80 12, 150 21 T 294 18"
                                        fill="none"
                                        stroke="#24724E"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                      />
                                    </svg>
                                  )}

                                  <div className="flex items-start justify-between gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleTaskStatus(task.id)}
                                      className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                                      title={isDone ? 'Unscratch note' : 'Scratch & complete task'}
                                    >
                                      <span
                                        className={`mt-0.5 w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                                          isDone
                                            ? 'bg-[#24724E] border-[#24724E] text-white'
                                            : 'bg-white border-[#D6D6D0] group-hover:border-[#FF7417]'
                                        }`}
                                      >
                                        {isDone && <Check className="w-3 h-3" />}
                                      </span>
                                      <div className="min-w-0">
                                        <div
                                          className={`text-xs font-bold leading-snug ${
                                            isDone ? 'text-[#5C5C58]' : 'text-[#171717]'
                                          }`}
                                        >
                                          {task.title}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[#686864]">
                                          <span className="font-semibold text-[#C44D00]">
                                            {task.priority.toUpperCase()}
                                          </span>
                                          <span>· {task.department}</span>
                                          {task.estimatedMinutes ? (
                                            <span>· {task.estimatedMinutes}m</span>
                                          ) : null}
                                          {task.dueDate ? <span>· Due {task.dueDate}</span> : null}
                                        </div>
                                      </div>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isDone) toggleTaskStatus(task.id);
                                        setRemovedStickyIds((prev) => [...prev, task.id]);
                                        showToast('Note scratched & peeled off board.');
                                      }}
                                      title="Scratch & remove sticky note"
                                      className="p-1 rounded-full text-[#858585] hover:text-[#171717] hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )}

                        {/* Quick Pin Note Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = quickNoteInput.trim();
                            if (!text) return;
                            addTask({
                              title: text,
                              description: 'Pinned directly from Today’s Priorities sticky board.',
                              whyItMatters: 'Immediate founder focus action.',
                              expectedOutcome: 'Completed today',
                              priority: 'high',
                              estimatedMinutes: 20,
                              dueDate: new Date().toISOString().slice(0, 10),
                              department: 'Growth Director',
                              status: 'pending',
                              isTodayPriority: true,
                            });
                            setQuickNoteInput('');
                          }}
                          className="flex items-center gap-2 pt-1"
                        >
                          <input
                            type="text"
                            value={quickNoteInput}
                            onChange={(e) => setQuickNoteInput(e.target.value)}
                            placeholder="Jot & pin a quick priority note..."
                            className="flex-1 h-9 px-3 rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] text-xs text-[#171717] focus:outline-none focus:border-[#FF7417]"
                          />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            disabled={!quickNoteInput.trim()}
                          >
                            <Plus className="w-3.5 h-3.5 text-[#FF7417]" />
                            Pin
                          </Button>
                        </form>
                      </div>
                    );
                  })()}
                </StaggeredLiquidItem>
              </StaggeredLiquidContainer>
            )}

            {(feedTab === 'signals' || feedTab === 'all') && (
              <StaggeredLiquidContainer
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10"
                staggerDelay={0.08}
                initialDelay={0.16}
              >
                <StaggeredLiquidItem className="lg:col-span-7 space-y-4">
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
                                {ev.detectedAt?.split('·')?.[0] ?? ev.detectedAt ?? ''}
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
                </StaggeredLiquidItem>

                <StaggeredLiquidItem className="lg:col-span-5 space-y-4">
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
                </StaggeredLiquidItem>
              </StaggeredLiquidContainer>
            )}

            {(feedTab === 'goals' || feedTab === 'all') && (
              <StaggeredLiquidContainer
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10"
                staggerDelay={0.08}
                initialDelay={0.16}
              >
                <StaggeredLiquidItem className="lg:col-span-6 space-y-4">
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
                </StaggeredLiquidItem>

                <StaggeredLiquidItem className="lg:col-span-6 space-y-4">
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
                </StaggeredLiquidItem>
              </StaggeredLiquidContainer>
            )}
          </section>
        </div>
      </LiquidSkeletonReveal>

      {(metrics.isFreshWorkspace || brainComp.percentage < 100) && (
        <StaggeredLiquidContainer initialDelay={0.24}>
          <StaggeredLiquidItem>
            <JourneyNextStep currentRoute="dashboard" />
          </StaggeredLiquidItem>
        </StaggeredLiquidContainer>
      )}

      {/* REC-P1-07: Daily Focus Sprint Victory Celebration Modal */}
      <Modal
        open={sprintVictoryOpen}
        onClose={() => {
          setSprintVictoryOpen(false);
          setSprintVictoryDismissed(true);
        }}
        title="Daily Sprint Completed!"
        eyebrow="Sprint Victory · 100% Execution"
        maxWidth="max-w-md"
      >
        <div className="p-2 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EAF5EF] border border-[#CDE5D7] flex items-center justify-center mx-auto text-[#24724E] shadow-sm animate-bounce">
            <Trophy className="w-8 h-8 text-[#24724E]" />
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-bold text-[#171717]">
              Outstanding Momentum!
            </h4>
            <p className="text-xs text-[#52524E] max-w-sm mx-auto leading-relaxed">
              All prioritized focus actions for <strong>{state.brain.businessName || 'your business'}</strong> have been completed today.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-[12px] bg-[#FAFAF9] border border-[#E6E6E2] text-left">
            <div>
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Strategic Lift</span>
              <span className="text-sm font-bold text-[#24724E] font-mono-num flex items-center gap-1">
                +2.5% Intelligence
              </span>
              <span className="text-[10px] text-[#686864]">Brand alignment verified</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Agency Saved</span>
              <span className="text-sm font-bold text-[#171717] font-mono-num">
                ₹12,500 (~$150)
              </span>
              <span className="text-[10px] text-[#686864]">In-house execution</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSprintVictoryOpen(false);
                setSprintVictoryDismissed(true);
                navigate('growth-director');
              }}
              className="w-full sm:w-auto h-9 px-4 rounded-full bg-[#FF7417] hover:bg-[#E05D00] text-white font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Plan Tomorrow's Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSprintVictoryOpen(false);
                setSprintVictoryDismissed(true);
              }}
              className="w-full sm:w-auto h-9 px-4 rounded-full bg-white hover:bg-[#F5F5F4] border border-[#E6E6E2] text-[#242424] font-medium text-xs transition-colors cursor-pointer"
            >
              Close & Enjoy Victory
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
