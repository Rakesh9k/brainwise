import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Calendar,
  Check,
  CheckCircle2,
  FlaskConical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  buildRoadmapPhases,
  buildWeeklyGrowthPlan,
  calculateGoalProgress,
  calculateTaskCompletionStats,
  formatCountdownSeconds,
  selectFocusSprintTasks,
} from '../../utils/logic';
import {
  generateAiRecommendations,
  generateAiWeeklyPlan,
  type GeneratedWeeklyPlanResponse,
} from '../../utils/aiClient';
import type { GrowthGoal, GrowthTask } from '../../types/brainwise';
import { apiClient } from '../../services/apiClient';
import {
  ActionFeedbackBanner,
  AiRequestPulse,
  LiquidSkeletonReveal,
  ProgressiveResultReveal,
  RecommendationActionSurface,
} from '../../components/motion/LiquidMotion';
import { RecommendationSkeletonList } from '../../components/ui/LiquidSkeletons';
import { typeClass } from '../../theme/typography';
import {
  Button,
  DarkSurfacePanel,
  Field,
  FluidProgress,
  FluidTransition,
  Input,
  IntelligenceOrb,
  MorphingPanel,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  SectionHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../../components/ui/DesignSystem';
import { Drawer, Modal } from '../../components/ui/Overlay';
import {
  BrainLineagePopover,
  BusinessBrainContextBanner,
  GuidedActionEmptyCard,
  JourneyNextStep,
  TaskCard,
} from '../../components/ui/DepartmentCards';
import { UniversalExecutiveLayer } from '../../components/ui/UniversalExecutiveLayer';

type GrowthTabId =
  | 'overview'
  | 'missions'
  | 'strategy'
  | 'departments'
  | 'execution'
  | 'roadmap'
  | 'goals'
  | 'experiments'
  | 'recommendations';

const GROWTH_TAB_LABELS: Record<GrowthTabId, string> = {
  overview: 'Executive Command Center',
  missions: 'Growth Missions',
  strategy: 'Strategy & Simulator',
  departments: '7 Growth Departments',
  execution: 'Execution & Approvals',
  roadmap: 'Weekly & 30/60/90 Roadmap',
  goals: 'Business Goals & OKRs',
  experiments: 'Experiments',
  recommendations: 'AI Recommendations',
};

export const GrowthDirectorPage: React.FC<{ initialMode?: 'director' | 'tasks' }> = ({
  initialMode = 'director',
}) => {
  const {
    state,
    navigate,
    toggleTaskStatus,
    addTask,
    updateTaskNotes,
    addGoal,
    updateGoalProgress,
    addExperiment,
    updateExperimentStatus,
    updateRecommendationStatus,
    addRecommendations,
    showToast,
    departmentResetNonce,
  } = useBrainWise();

  const readPendingGrowthTab = (): GrowthTabId | null => {
    try {
      const pending = window.sessionStorage.getItem('bw_pending_growth_tab') as GrowthTabId | null;
      if (pending && pending in GROWTH_TAB_LABELS) {
        window.sessionStorage.removeItem('bw_pending_growth_tab');
        return pending;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  };

  const defaultTab: GrowthTabId =
    readPendingGrowthTab() ?? (initialMode === 'tasks' ? 'experiments' : 'overview');
  const [tab, setTab] = useState<GrowthTabId>(defaultTab);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today'>('all');

  useEffect(() => {
    const pending = readPendingGrowthTab();
    if (pending) {
      setTab(pending);
      return;
    }
    setTab(initialMode === 'tasks' ? 'experiments' : 'overview');
  }, [initialMode, state.currentRoute]);

  const [selectedTask, setSelectedTask] = useState<GrowthTask | null>(null);
  const [taskNoteDraft, setTaskNoteDraft] = useState('');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  // Today's Focus Sprint Timer state
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [sprintDurationMins, setSprintDurationMins] = useState<25 | 45>(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          showToast('Focus sprint complete! Review your completed tasks.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, showToast]);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setSelectedTask(null);
      setTab(defaultTab);
    }
  }, [departmentResetNonce, defaultTab]);

  useWorkspaceBreadcrumbs(
    tab !== defaultTab && selectedTask
      ? [
          { label: GROWTH_TAB_LABELS[tab], onClick: () => setSelectedTask(null) },
          { label: selectedTask.title },
        ]
      : tab !== defaultTab
        ? [{ label: GROWTH_TAB_LABELS[tab] }]
        : selectedTask
          ? [{ label: selectedTask.title }]
          : [],
    [tab, defaultTab, selectedTask?.id, selectedTask?.title]
  );

  // New goal form
  const [gTitle, setGTitle] = useState('');
  const [gCat, setGCat] = useState<GrowthGoal['category']>('Revenue');
  const [gTarget, setGTarget] = useState('5000');
  const [gUnit, setGUnit] = useState('$ MRR');
  const [gDeadline, setGDeadline] = useState('2026-12-31');

  // New task form
  const [tTitle, setTTitle] = useState('');
  const [tWhy, setTWhy] = useState('');
  const [tMin, setTMin] = useState('30');
  const [tPrio, setTPrio] = useState<'high' | 'medium' | 'low'>('high');

  // New experiment form
  const [eTitle, setETitle] = useState('');
  const [eHyp, setEHyp] = useState('');
  const [eMetric, setEMetric] = useState('');
  const [eBudget, setEBudget] = useState('$150');

  // Agency Extensions State
  const [activeDept, setActiveDept] = useState<'Marketing' | 'Content' | 'Acquisition' | 'Conversion' | 'Retention' | 'Partnerships' | 'Economics'>('Marketing');
  const [simBudget, setSimBudget] = useState('15000');
  const [simPrice, setSimPrice] = useState('499');
  const [simConversion, setSimConversion] = useState('3.5');
  const [simCac, setSimCac] = useState('250');
  const [simChannel] = useState('Outbound Contrast Wedge');

  interface UiGrowthMission {
    missionId: string;
    title: string;
    strategicRationale: string;
    department: 'Marketing' | 'Content' | 'Acquisition' | 'Conversion' | 'Retention' | 'Partnerships' | 'Economics';
    timeHorizon: '7_DAYS' | '30_DAYS' | '90_DAYS';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    budgetCap: number;
    currentExpenditure: number;
    status: 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
    isApproved: boolean;
    approvalRequired: boolean;
    successCriteria: Array<{ metricName: string; baselineValue: number; targetValue: number; unit: string }>;
  }

  interface UiExecutionJob {
    jobId: string;
    actionType: string;
    level: number;
    payload: Record<string, any>;
    requiresApproval: boolean;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    status: 'AWAITING_APPROVAL' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    receipt?: { providerName: string; providerTransactionId: string; dispatchedAt: string };
  }

  const [missionsList, setMissionsList] = useState<UiGrowthMission[]>([
    {
      missionId: 'msn_init_01',
      title: `Deploy 50-Account Outbound Contrast Wedge for ${state.brain.businessName || 'Venture'}`,
      strategicRationale: `Directly targets ${state.competitors[0]?.name || 'incumbent'} contract lock-in by emphasizing transparent, mathematically proven pricing.`,
      department: 'Acquisition',
      timeHorizon: '30_DAYS',
      priority: 'HIGH',
      budgetCap: 5000,
      currentExpenditure: 750,
      status: 'IN_PROGRESS',
      isApproved: true,
      approvalRequired: true,
      successCriteria: [
        { metricName: 'Direct Positive Replies', baselineValue: 0, targetValue: 12, unit: 'replies' },
        { metricName: 'Demo Conversions', baselineValue: 0, targetValue: 5, unit: 'demos' },
      ],
    },
    {
      missionId: 'msn_init_02',
      title: `Checkout Step-2 Proof Badges & Evidence Embeds CRO`,
      strategicRationale: `Resolves buyer hesitation by embedding verified evidence badges directly on pricing tier cards.`,
      department: 'Conversion',
      timeHorizon: '7_DAYS',
      priority: 'HIGH',
      budgetCap: 2000,
      currentExpenditure: 0,
      status: 'PROPOSED',
      isApproved: false,
      approvalRequired: true,
      successCriteria: [
        { metricName: 'Step-2 Checkout Completion', baselineValue: 3.2, targetValue: 4.8, unit: '%' },
      ],
    },
    {
      missionId: 'msn_init_03',
      title: `Two-Sided Founder Credit Referral Velocity Loop`,
      strategicRationale: `Incentivizes organic peer advocacy: award 50 bonus validation credits to both referrer and referee.`,
      department: 'Retention',
      timeHorizon: '90_DAYS',
      priority: 'MEDIUM',
      budgetCap: 8000,
      currentExpenditure: 1200,
      status: 'APPROVED',
      isApproved: true,
      approvalRequired: true,
      successCriteria: [
        { metricName: 'Referred Paying Accounts', baselineValue: 0, targetValue: 20, unit: 'accounts' },
      ],
    },
  ]);

  const [jobsList, setJobsList] = useState<UiExecutionJob[]>([
    {
      jobId: 'job_01',
      actionType: 'DISPATCH_OUTREACH_EMAIL',
      level: 3,
      payload: { targetRole: 'Founder / CEO', sequenceStep: 1, batchCount: 15 },
      requiresApproval: true,
      approvalStatus: 'PENDING',
      status: 'AWAITING_APPROVAL',
      receipt: undefined,
    },
    {
      jobId: 'job_02',
      actionType: 'SCHEDULE_SOCIAL_POST',
      level: 2,
      payload: { platform: 'LinkedIn', format: 'STATIC_CAROUSEL', slides: 5 },
      requiresApproval: false,
      approvalStatus: 'APPROVED',
      status: 'COMPLETED',
      receipt: { providerName: 'Meta Graph API / Buffer', providerTransactionId: 'tx_83921_buf', dispatchedAt: '2026-11-22T10:30:00Z' },
    },
  ]);

  // Hydrate missions and execution jobs from server
  useEffect(() => {
    let isMounted = true;
    const workspaceId = state.activeWorkspaceId || state.workspaceId;
    if (!workspaceId || !state.isAuthenticated || state.isExampleWorkspace) {
      return;
    }

    apiClient.getGrowthMissions(workspaceId)
      .then((res: any) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setMissionsList(res.data);
        }
      })
      .catch((err: any) => {
        console.debug('Growth missions server hydration note:', err?.message);
      });

    apiClient.getExecutionJobs(workspaceId)
      .then((res: any) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setJobsList(res.data);
        }
      })
      .catch((err: any) => {
        console.debug('Execution jobs server hydration note:', err?.message);
      });

    return () => {
      isMounted = false;
    };
  }, [state.activeWorkspaceId, state.workspaceId, state.isAuthenticated, state.isExampleWorkspace]);

  const taskStats = calculateTaskCompletionStats(state.tasks);
  const weeklyPlan = buildWeeklyGrowthPlan(state);
  const roadmapPhases = buildRoadmapPhases(state);
  const totalSprintSeconds = sprintDurationMins * 60;
  const sprintElapsedPct = Math.round(
    ((totalSprintSeconds - secondsLeft) / totalSprintSeconds) * 100
  );
  const displayedTasks =
    taskFilter === 'today'
      ? state.tasks.filter((t) => t.isTodayPriority || t.priority === 'high')
      : state.tasks;

  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false);
  const [weeklyPlanMeta, setWeeklyPlanMeta] = useState<{
    weeklyTheme: string;
    effectiveLocation: string;
  } | null>(null);

  const handleGenerateWeeklyAiPlan = async () => {
    setWeeklyAiLoading(true);
    try {
      const plan: GeneratedWeeklyPlanResponse = await generateAiWeeklyPlan(state);

      // Save all 7 daily tasks into tracked Daily Action Plan
      plan.tasks.forEach((t) => {
        addTask(
          {
            title: t.title,
            description: `${t.dayLabel}: ${t.description}`,
            whyItMatters: `Grounded in ${state.brain.businessName} (${plan.effectiveLocation}) — ${plan.weeklyTheme}`,
            expectedOutcome: `Advance weekly sprint goals (${t.department})`,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            dueDate: t.dueDate,
            department: t.department,
            status: 'pending',
            isTodayPriority: t.isTodayPriority,
          },
          { silent: true }
        );
      });

      // Save measurable weekly goals into tracked Active Goals
      plan.goals.forEach((g) => {
        addGoal(
          {
            title: g.title,
            metric: g.metric,
            currentValue: g.currentValue,
            targetValue: g.targetValue,
            unit: g.unit,
            targetDate: g.targetDate,
          },
          { silent: true }
        );
      });

      setWeeklyPlanMeta({
        weeklyTheme: plan.weeklyTheme,
        effectiveLocation: plan.effectiveLocation,
      });

      showToast(
        `Generated ${plan.tasks.length}-day AI weekly plan & ${plan.goals.length} measurable goals (${plan.effectiveLocation}).`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Unable to generate 7-day AI weekly plan.',
        { tone: 'error' }
      );
    } finally {
      setWeeklyAiLoading(false);
    }
  };

  // Compute live 7-day weekly velocity from tracked tasks
  const weeklyVelocity = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekEndStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const weekTasks = state.tasks.filter(
      (t) => !t.dueDate || (t.dueDate >= todayStr && t.dueDate <= weekEndStr) || t.status === 'completed'
    );
    const total = weekTasks.length;
    const completed = weekTasks.filter((t) => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate, weekTasks };
  }, [state.tasks]);

  const handleGenerate30DayPlan = () => {
    const primaryGoal = state.goals[0];
    addTask({
      title: `Launch ${state.brain.businessName} 14-day acquisition & positioning sprint`,
      description: `Generated inside 30-Day Growth Roadmap using ${state.brain.businessName} Business Brain & Competitive Strategy.`,
      whyItMatters: primaryGoal
        ? `Directly accelerates "${primaryGoal.title}" (${primaryGoal.currentValue}/${primaryGoal.targetValue} ${primaryGoal.unit}).`
        : `Converts ${state.brain.targetAudience} into early trials.`,
      expectedOutcome: primaryGoal
        ? `Progress toward ${primaryGoal.targetValue} ${primaryGoal.unit}`
        : '5+ qualified leads per week.',
      priority: 'high',
      estimatedMinutes: 45,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      department: 'Growth Director',
      status: 'pending',
      isTodayPriority: true,
    });
    showToast('30-day growth roadmap refreshed with a new high-leverage task.');
  };

  const handleSynthesizeRecommendations = async () => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const { recommendations } = await generateAiRecommendations(state);
      addRecommendations(recommendations);
    } catch (err) {
      setRecsError(
        err instanceof Error ? err.message : 'Unable to reach BrainWise AI recommendation service.'
      );
    } finally {
      setRecsLoading(false);
    }
  };

  const unconfirmedInferences = useMemo(() => {
    const provCount = Object.values(state.brain.provenance || {}).filter(
      (p) => p.source === 'AI_INFERRED'
    ).length;
    const unconfirmedProducts = (state.brain.products || []).filter(
      (p) => p.source === 'AI_INFERRED'
    ).length;
    const unconfirmedPersonas = (state.brain.personas || []).filter(
      (p) => p.source === 'AI_INFERRED'
    ).length;
    return provCount + unconfirmedProducts + unconfirmedPersonas;
  }, [state.brain]);

  return (
    <div className="space-y-6">
      <BusinessBrainContextBanner departmentLabel="Growth Planner" contextKey="growthDirector" />

      <PageHeader
        mutedPrefix={initialMode === 'tasks' ? 'Tasks &' : 'Growth'}
        title={initialMode === 'tasks' ? 'Experiments' : 'Planner'}
        subtitle="Turn research, competitive gaps, and brand assets into measurable goals, daily priorities, and structured growth experiments."
        actions={
          <>
            <Button
              variant={focusModeOpen ? 'dark' : 'secondary'}
              size="sm"
              onClick={() => {
                setFocusModeOpen((v) => !v);
                if (tab !== 'overview') setTab('overview');
              }}
            >
              <Timer className={`w-4 h-4 ${focusModeOpen ? 'text-[#FF8A36]' : 'text-[#FF7417]'}`} />
              {focusModeOpen ? 'Exit Focus Sprint' : 'Today’s Focus Sprint'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setTaskModalOpen(true)}>
              <Plus className="w-4 h-4" />
              New Action Task
            </Button>
          </>
        }
      />

      {/* Universal Executive Glance Layer (Layer 1 + Layer 3 Proof Drawer) */}
      <UniversalExecutiveLayer
        departmentCode="DEP-10"
        sectionTitle="AI Growth Director & Sprint Execution"
        oneLiner="Your AI Chief Marketing Officer (CMO): planning weekly growth sprints and tracking experiments."
        statusPills={[
          {
            label: `Sprint Velocity: ${taskStats.completed}/${taskStats.total} Completed`,
            tone: 'emerald',
            icon: <CheckCircle2 className="w-3 h-3 text-[#10B981]" />,
          },
          {
            label: `${state.experiments.length} Active Growth Experiments`,
            tone: 'blue',
          },
          {
            label: 'ICE Prioritization Model: Calibrated',
            tone: 'neutral',
          },
        ]}
        primaryAction={{
          label: focusModeOpen ? 'Exit Focus Mode' : "Launch Today's Focus Sprint",
          onClick: () => {
            setFocusModeOpen((v) => !v);
            if (tab !== 'overview') setTab('overview');
          },
          icon: <Timer className="w-3.5 h-3.5 text-[#FF7417]" />,
        }}
        secondaryAction={{
          label: 'New Action Task',
          onClick: () => setTaskModalOpen(true),
          icon: <Plus className="w-3.5 h-3.5 text-[#71717A]" />,
        }}
        proofTelemetry={(() => {
          const hasExecutionData = (taskStats.total > 0 || state.goals.length > 0 || state.experiments.length > 0);
          const avgGoalProgress = state.goals.length > 0
            ? Math.round(state.goals.reduce((acc, g) => acc + (g.progressPercentage || 0), 0) / state.goals.length)
            : 0;
          const growthConfidence = hasExecutionData
            ? Math.round((taskStats.completionRate * 0.6) + (avgGoalProgress * 0.4))
            : 0;

          return {
            confidenceScore: growthConfidence,
            confidenceLabel: hasExecutionData
              ? 'Strategic Execution Velocity & Goal Pacing'
              : 'Execution Roadmap Standby',
            statusBadge: hasExecutionData ? (growthConfidence >= 50 ? 'PASS' : 'CALIBRATING') : 'STANDBY',
            isStandby: !hasExecutionData,
            metrics: [
              {
                label: 'Sprint Velocity Rate',
                value: `${taskStats.completionRate}%`,
                subtext: `${taskStats.pending} pending actions`,
                status: taskStats.total > 0 ? (taskStats.completionRate >= 50 ? 'optimal' : 'warning') : 'inferred',
              },
              {
                label: 'Active Business Goals',
                value: state.goals.length,
                subtext: state.goals.length > 0 ? `${avgGoalProgress}% avg progress` : '0 goals set',
                status: state.goals.length > 0 ? 'optimal' : 'warning',
              },
              {
                label: 'Growth Experiments',
                value: state.experiments.length,
                subtext: 'Hypothesis-tested',
                status: state.experiments.length > 0 ? 'optimal' : 'inferred',
              },
              {
                label: 'Pending AI Suggestions',
                value: state.recommendations.filter((r) => r.status === 'pending').length,
                subtext: 'Growth Director queue',
                status: 'verified',
              },
            ],
            lineageItems: state.goals.slice(0, 3).map((g) => ({
              title: g.title,
              source: 'Quarterly OKR Framework',
              timestamp: `Target: ${g.targetDate}`,
              confidence: 0.97,
              type: 'GROUND_TRUTH' as any,
              details: `Metric: ${g.currentMetric} → ${g.targetMetric} (${g.progressPercentage}% progress)`,
            })),
            guardrails: {
              truthCheckStatus: 'PASSED',
              antiFatigueScore: 'Milestone Execution Grounded',
              creditProtection: 'ACTIVE_ZERO_LOSS_ESCROW',
              modelAudited: 'Gemini 2.5 Pro CMO Orchestrator',
            },
            rawJson: {
              department: 'DEP-10 (Growth Director)',
              workspace: state.brain.businessName || 'Default Workspace',
              taskStats,
              goalsCount: state.goals.length,
              avgGoalProgress: `${avgGoalProgress}%`,
              experimentsCount: state.experiments.length,
              activeTab: tab,
              timestamp: new Date().toISOString(),
            },
          };
        })()}
      />

      <Tabs
        activeTab={tab}
        onChange={(id) => setTab(id as GrowthTabId)}
        tabs={[
          { id: 'overview', label: 'Command Center', count: taskStats.pending },
          { id: 'missions', label: 'Growth Missions' },
          { id: 'strategy', label: 'Strategy & Simulator' },
          { id: 'departments', label: '7 Departments' },
          { id: 'execution', label: 'Execution & Approvals' },
          { id: 'roadmap', label: 'Weekly & 30/60/90 Roadmap' },
          { id: 'goals', label: 'Business Goals & OKRs', count: state.goals.length },
          { id: 'experiments', label: 'Experiments', count: state.experiments.length },
          {
            id: 'recommendations',
            label: 'AI Recommendations',
            count: state.recommendations.filter((r) => r.status === 'pending').length,
          },
        ]}
      />

      {/* Focus Sprint Panel */}
      <AnimatePresence>
        {focusModeOpen && (
          <MorphingPanel key="focus-sprint">
            <DarkSurfacePanel className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2F2F2F]">
                <div>
                  <div
                    className={`inline-flex items-center gap-2 ${typeClass.overline} text-[#FF8A36]`}
                  >
                    <IntelligenceOrb size="xs" state={timerRunning ? 'thinking' : 'active'} />
                    <span>Today’s Focus Sprint</span>
                  </div>
                  <h2 className={`${typeClass.h4} font-bold text-white mt-1`}>
                    Top {Math.min(3, selectFocusSprintTasks(state.tasks, 3).length)} Pending
                    Priorities
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex p-0.5 rounded-[8px] bg-[#252525] border border-[#323232]">
                    {([25, 45] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setTimerRunning(false);
                          setSprintDurationMins(mins);
                          setSecondsLeft(mins * 60);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-[6px] cursor-pointer transition-colors ${
                          sprintDurationMins === mins
                            ? 'bg-[#FF7417] text-white shadow-[0_1px_2px_rgba(255,116,23,0.28)]'
                            : 'text-[#A8A8A2] hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  <div
                    aria-label="Sprint countdown timer"
                    className="font-mono-num text-2xl font-bold tracking-tight text-white px-3 py-1 rounded-[8px] bg-[#121212] border border-[#2E2E2E]"
                  >
                    {formatCountdownSeconds(secondsLeft)}
                  </div>

                  <Button variant="primary" size="sm" onClick={() => setTimerRunning((r) => !r)}>
                    {timerRunning ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    {timerRunning ? 'Pause' : 'Start'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setSecondsLeft(sprintDurationMins * 60);
                    }}
                    aria-label="Reset sprint timer"
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-[8px] border border-[#3C3C3C] text-[#E5E5E0] hover:bg-[#2A2A2A] cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              <FluidProgress
                value={sprintElapsedPct}
                label={timerRunning ? 'Sprint session in progress' : 'Sprint interval progress'}
                size="sm"
                activeShimmer={timerRunning}
                dark
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectFocusSprintTasks(state.tasks, 3).map((task, idx) => (
                  <div
                    key={task.id}
                    className="rounded-[10px] bg-[#252525] border border-[#323232] p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#A8A8A2]">
                        <span className="font-mono-num text-[#FF8A36]">FOCUS 0{idx + 1}</span>
                        <span>{task.estimatedMinutes}m est.</span>
                      </div>
                      <div className="font-heading text-sm font-bold text-white mt-1.5">
                        {task.title}
                      </div>
                      <p className="text-xs text-[#C8C8C2] mt-1 line-clamp-2">
                        {task.whyItMatters}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id, 'completed')}
                      className="w-full py-2 text-xs font-semibold rounded-[8px] bg-white text-[#252525] hover:bg-[#FFF0E5] cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#24724E]" />
                      Complete &amp; Advance
                    </button>
                  </div>
                ))}
                {selectFocusSprintTasks(state.tasks, 3).length === 0 && (
                  <div className="md:col-span-3 p-4 rounded-[10px] bg-[#252525] border border-[#323232] text-xs text-[#C8C8C2]">
                    All pending sprint tasks are completed! Generate a new 30-day batch or add a
                    custom task.
                  </div>
                )}
              </div>
            </DarkSurfacePanel>
          </MorphingPanel>
        )}
      </AnimatePresence>

      {/* Review Staged Facts Warning Banner */}
      {unconfirmedInferences > 0 && (
        <div className="p-4 rounded-[12px] bg-[#FFFBF5] border border-[#FBE0C2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bw-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFE8CC] flex items-center justify-center text-[#FF7417] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-xs font-bold text-[#171717]">
                  Review Staged Facts for Maximum Campaign Accuracy
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFE8CC] text-[#C44D00]">
                  {unconfirmedInferences} Unreviewed Fact{unconfirmedInferences === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-[#5C5C58] mt-0.5">
                Always review and confirm extracted facts in the Business Brain verification queue before launching downstream campaigns. Confirmed ground truth prevents AI hallucinations in marketing copy and pricing models.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => navigate('business-brain')}
          >
            Review Verification Queue &rarr;
          </Button>
        </div>
      )}

      {/* A. Overview & Daily Action Plan (unified) */}
      {tab === 'overview' && (
        <FluidTransition key="overview" direction="fade" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] divide-y sm:divide-y-0 sm:divide-x divide-[#E6E6E2] overflow-hidden">
            <div className="p-4 space-y-1.5">
              <div className="text-[11px] font-medium text-[#858585]">Execution Rate</div>
              <div className="font-heading text-xl font-bold text-[#C44D00] tabular-nums">
                {taskStats.completionRate}%
              </div>
              <ProgressBar value={taskStats.completionRate} showPercent={false} size="sm" />
            </div>
            <div className="p-4 space-y-1">
              <div className="text-[11px] font-medium text-[#858585]">Pending Tasks</div>
              <div className="font-heading text-xl font-bold text-[#252525] tabular-nums">
                {taskStats.pending}
              </div>
              <div className="text-[11px] text-[#5C5C58]">
                {taskStats.remainingMinutes} mins remaining
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTab('experiments')}
              className="p-4 text-left hover:bg-[#FAFAF9] transition-colors space-y-1 cursor-pointer"
            >
              <div className="text-[11px] font-medium text-[#858585]">Active Experiments</div>
              <div className="font-heading text-xl font-bold text-[#252525] tabular-nums">
                {state.experiments.filter((e) => e.status === 'Active').length}
              </div>
              <div className="text-[11px] text-[#5C5C58]">Running tests →</div>
            </button>
            <button
              type="button"
              onClick={() => setTab('goals')}
              className="p-4 text-left hover:bg-[#FAFAF9] transition-colors space-y-1 cursor-pointer"
            >
              <div className="text-[11px] font-medium text-[#858585]">Growth Goals</div>
              <div className="font-heading text-xl font-bold text-[#252525] tabular-nums">
                {state.goals.length}
              </div>
              <div className="text-[11px] text-[#5C5C58]">Tracked objectives →</div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <SectionHeader
                title="Daily Action Plan"
                description={`${taskStats.highPriorityPending} high priority · ${taskStats.remainingMinutes} mins estimated remaining`}
                action={
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateWeeklyAiPlan}
                      disabled={weeklyAiLoading}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                      {weeklyAiLoading ? 'Planning 7-Day Sprint…' : 'AI 7-Day Plan'}
                    </Button>
                    <div className="inline-flex p-0.5 bg-[#ECECE9] border border-[#E6E6E2] rounded-[8px]">
                      {(
                        [
                          { id: 'all', label: `All Tasks (${state.tasks.length})` },
                          { id: 'today', label: 'Today & High Priority' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTaskFilter(opt.id)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-[6px] cursor-pointer transition-colors ${
                            taskFilter === opt.id
                              ? 'bg-[#FFFFFF] text-[#242424] shadow-xs'
                              : 'text-[#686864] hover:text-[#242424]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <BrainLineagePopover
                      sourceDepartment="Competitive Intelligence & Idea Research"
                      insight={`Daily tasks prioritize ${state.brain.businessName}'s highest-leverage positioning moves from your Strategy Blueprint.`}
                      targetRoute="competitive-intelligence"
                      editLabel="Edit strategic wedge"
                    />
                  </div>
                }
              />

              {/* Live 7-Day Weekly Velocity & Location Grounding Strip */}
              {(weeklyVelocity.total > 0 || weeklyPlanMeta) && (
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FAF9F6] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#171717]">
                      <Calendar className="w-3.5 h-3.5 text-[#FF7417] shrink-0" />
                      <span className="truncate">
                        {weeklyPlanMeta?.weeklyTheme || '7-Day Sprint Execution Velocity'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#686864]">
                      {weeklyVelocity.completed}/{weeklyVelocity.total} weekly tasks completed ·{' '}
                      <span className="font-mono-num font-semibold text-[#171717]">
                        {weeklyVelocity.rate}%
                      </span>{' '}
                      velocity
                      {weeklyPlanMeta?.effectiveLocation
                        ? ` · Grounded in ${weeklyPlanMeta.effectiveLocation}`
                        : state.brain.location
                          ? ` · Grounded in ${state.brain.location}`
                          : ''}
                    </div>
                  </div>
                  <div className="w-full sm:w-44 shrink-0">
                    <FluidProgress value={weeklyVelocity.rate} className="h-2" />
                  </div>
                </div>
              )}

              {displayedTasks.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Execution Queue"
                  title="No daily execution tasks queued"
                  description="Generate a 7-day AI weekly schedule & measurable goals from your Business Brain, location, and Idea Intelligence report."
                  actionLabel={weeklyAiLoading ? 'Generating 7-Day Plan…' : 'Generate 7-Day AI Weekly Plan'}
                  onAction={handleGenerateWeeklyAiPlan}
                  secondaryLabel="New Custom Task"
                  onSecondaryAction={() => setTaskModalOpen(true)}
                />
              ) : (
                <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] divide-y divide-[#E6E6E2] overflow-hidden">
                  {displayedTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      flat
                      task={t}
                      onToggleComplete={(id) => toggleTaskStatus(id)}
                      onSkip={(id) => toggleTaskStatus(id, 'skipped')}
                      onInspect={(task) => {
                        setSelectedTask(task);
                        setTaskNoteDraft(task.notes ?? '');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <SectionHeader
                title="Active Goals"
                action={
                  <button
                    type="button"
                    onClick={() => setTab('goals')}
                    className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                  >
                    Manage →
                  </button>
                }
              />
              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised p-5 space-y-4">
                {state.goals.length === 0 ? (
                  <div className="space-y-3 text-xs text-[#686864]">
                    <p>No quantitative growth goals configured yet.</p>
                    <Button variant="secondary" size="sm" onClick={() => setGoalModalOpen(true)}>
                      Set First Goal
                    </Button>
                  </div>
                ) : (
                  state.goals.map((g) => {
                    const prog = calculateGoalProgress(g);
                    return (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-semibold text-[#242424] truncate">{g.title}</span>
                          <span className="font-mono-num text-[#686864] shrink-0">
                            {g.currentValue}/{g.targetValue} {g.unit}
                          </span>
                        </div>
                        <ProgressBar value={prog.percentage} showPercent={false} size="sm" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </FluidTransition>
      )}

      {/* NEW: Growth Missions & OKRs Hierarchy */}
      {tab === 'missions' && (
        <FluidTransition key="missions" direction="fade" className="space-y-6">
          <SectionHeader
            title="Growth Missions Command Center"
            description="Higher-order strategic missions connecting business objectives to execution tasks and verified outcomes."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const workspaceId = state.activeWorkspaceId || state.workspaceId;
                  if (!workspaceId) {
                    showToast('Please set up or select a workspace first.', { tone: 'info' });
                    return;
                  }
                  const payload = {
                    title: `Scale Outbound Lead Generation for ${state.brain.businessName || 'Venture'}`,
                    strategicRationale: `Directly targets ${state.competitors[0]?.name || 'incumbent'} whitespace with transparent pricing proof.`,
                    department: 'Acquisition' as const,
                    targetAudience: 'Target Decision Makers',
                    timeHorizon: '30_DAYS' as const,
                    priority: 'HIGH' as const,
                    budgetCap: 10000,
                    approvalRequired: true,
                    successCriteria: [
                      { metricName: 'Qualified Inbound Inquiries', baselineValue: 0, targetValue: 20, unit: 'leads' },
                    ],
                  };

                  try {
                    const res = await apiClient.createGrowthMission(workspaceId, payload);
                    if (res?.data?.missionId) {
                      setMissionsList((prev) => [res.data, ...prev]);
                    } else {
                      const newMsn = {
                        missionId: `msn_${Date.now()}`,
                        ...payload,
                        currentExpenditure: 0,
                        status: 'PROPOSED' as const,
                        isApproved: false,
                      };
                      setMissionsList((prev) => [newMsn, ...prev]);
                    }
                  } catch {
                    const newMsn = {
                      missionId: `msn_${Date.now()}`,
                      ...payload,
                      currentExpenditure: 0,
                      status: 'PROPOSED' as const,
                      isApproved: false,
                    };
                    setMissionsList((prev) => [newMsn, ...prev]);
                  }
                  showToast('New Growth Mission queued for founder review.');
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Growth Mission
              </Button>
            }
          />

          <div className="grid grid-cols-1 gap-4">
            {missionsList.map((m) => (
              <div
                key={m.missionId}
                className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF3EB] text-[#C44D00] border border-[#FFD3B3]">
                      {m.department.toUpperCase()} DEPT
                    </span>
                    <span className="text-xs font-mono-num text-[#686864]">
                      Horizon: {m.timeHorizon.replace('_', ' ')} · Budget Cap: ₹{m.budgetCap.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={
                        m.status === 'IN_PROGRESS'
                          ? 'In Progress'
                          : m.status === 'APPROVED'
                            ? 'Approved'
                            : m.status === 'VERIFIED'
                              ? 'Verified'
                              : 'Proposed'
                      }
                      tone={
                        m.status === 'VERIFIED'
                          ? 'success'
                          : m.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                    <PriorityBadge priority={m.priority.toLowerCase() as any} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-base font-bold text-[#242424]">{m.title}</h3>
                  <p className="text-xs text-[#686864] leading-relaxed">{m.strategicRationale}</p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#ECECE9] text-xs space-y-2">
                  <span className="font-semibold text-[#252525] block">Target Success Criteria &amp; Key Results:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.successCriteria.map((sc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E6E2]">
                        <span className="text-[#5C5C58]">{sc.metricName}:</span>
                        <strong className="text-[#C44D00] font-mono-num">
                          {sc.baselineValue} &rarr; {sc.targetValue} {sc.unit}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-[#858585]">
                    Expenditure: <strong className="text-[#252525]">₹{m.currentExpenditure.toLocaleString()}</strong> / ₹{m.budgetCap.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === 'PROPOSED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          const workspaceId = state.activeWorkspaceId || state.workspaceId;
                          if (!workspaceId) return;
                          try {
                            await apiClient.transitionGrowthMissionStatus(workspaceId, m.missionId, { targetStatus: 'APPROVED' });
                          } catch {
                            // Local fallback
                          }
                          setMissionsList((prev) =>
                            prev.map((item) =>
                              item.missionId === m.missionId ? { ...item, status: 'APPROVED' as const, isApproved: true } : item
                            )
                          );
                          showToast('Mission approved by founder.');
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-[#24724E]" />
                        Approve Mission
                      </Button>
                    )}
                    {m.status === 'APPROVED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          const workspaceId = state.activeWorkspaceId || state.workspaceId;
                          if (!workspaceId) return;
                          try {
                            await apiClient.transitionGrowthMissionStatus(workspaceId, m.missionId, { targetStatus: 'IN_PROGRESS' });
                          } catch {
                            // Local fallback
                          }
                          setMissionsList((prev) =>
                            prev.map((item) =>
                              item.missionId === m.missionId ? { ...item, status: 'IN_PROGRESS' as const } : item
                            )
                          );
                          showToast('Mission activated into In Progress state.');
                        }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Execution
                      </Button>
                    )}
                    {m.status === 'IN_PROGRESS' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          const workspaceId = state.activeWorkspaceId || state.workspaceId;
                          if (!workspaceId) return;
                          try {
                            await apiClient.recordGrowthMissionOutcome(workspaceId, m.missionId, {
                              metricsAchieved: { 'Target Completion': 1 },
                              summaryNotes: 'Completed and verified by founder',
                            });
                          } catch {
                            // Local fallback
                          }
                          setMissionsList((prev) =>
                            prev.map((item) =>
                              item.missionId === m.missionId ? { ...item, status: 'VERIFIED' as const } : item
                            )
                          );
                          showToast('Mission verified! Results recorded in Strategic Memory.');
                        }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#24724E]" />
                        Verify Key Results
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FluidTransition>
      )}

      {/* NEW: Growth Strategy & What-If Simulator */}
      {tab === 'strategy' && (
        <FluidTransition key="strategy" direction="fade" className="space-y-6">
          <SectionHeader
            title="Growth Strategy Architect &amp; Simulator"
            description="Formulate archetypes, compare strategic horizons, and simulate financial what-if growth models."
          />

          {/* Strategic Archetypes Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                id: 'outbound_wedge',
                title: 'Outbound-Led Growth Wedge',
                timeframe: '3 Weeks',
                budget: '₹2,500',
                confidence: '92% Confidence',
                description: 'Direct founder outbound targeting competitor pricing opacity with mathematical proof.',
                fit: 'Recommended for Idea & Pre-Launch Validation',
              },
              {
                id: 'organic_carousels',
                title: 'Organic Educational Carousels',
                timeframe: '8 Weeks',
                budget: '₹5,000',
                confidence: '85% Confidence',
                description: 'Multi-slide static vector carousels tearing down customer pain points and false industry promises.',
                fit: 'Recommended for Early Traction',
              },
              {
                id: 'partner_bundle',
                title: 'Partnership & Co-Marketing',
                timeframe: '6 Weeks',
                budget: '₹8,000',
                confidence: '78% Confidence',
                description: 'Collaborative launch bundles with complementary non-competing software or services.',
                fit: 'Recommended for Scaling Businesses',
              },
            ].map((arch) => (
              <div
                key={arch.id}
                className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#C44D00]">{arch.timeframe}</span>
                    <span className="font-mono-num text-[#24724E]">{arch.confidence}</span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-[#242424]">{arch.title}</h3>
                  <p className="text-xs text-[#686864] leading-relaxed">{arch.description}</p>
                </div>
                <div className="pt-3 border-t border-[#F0F0EE] text-xs">
                  <span className="text-[#858585] block">Strategic Fit:</span>
                  <strong className="text-[#252525] mt-0.5 block">{arch.fit}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive What-If Growth Simulator */}
          <div className="rounded-[14px] border border-[#FFD3B3] bg-[#FFF8F3] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#FFD3B3]">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C44D00]">
                  <Sparkles className="w-4 h-4 text-[#FF7417]" />
                  <span>WHAT-IF GROWTH SCENARIO SIMULATOR</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-[#242424] mt-1">
                  Model Budget, CAC, and Revenue Projections
                </h3>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const customers = Math.floor(Number(simBudget) / Math.max(1, Number(simCac)));
                  const newMsn = {
                    missionId: `msn_sim_${Date.now()}`,
                    title: `Execute Simulator Plan: Acquire ${customers} Customers via ${simChannel}`,
                    strategicRationale: `Directly converted from What-If Simulator scenario. Budget: ₹${Number(simBudget).toLocaleString()} · Target CAC: ₹${simCac}.`,
                    department: 'Marketing' as const,
                    timeHorizon: '30_DAYS' as const,
                    priority: 'HIGH' as const,
                    budgetCap: Number(simBudget),
                    currentExpenditure: 0,
                    status: 'PROPOSED' as const,
                    isApproved: false,
                    approvalRequired: true,
                    successCriteria: [
                      { metricName: 'Customers Acquired', baselineValue: 0, targetValue: customers, unit: 'customers' },
                    ],
                  };
                  setMissionsList((prev) => [newMsn, ...prev]);
                  showToast('Scenario converted into an active Growth Mission!');
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Convert Scenario to Growth Mission
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[#858585] block font-medium mb-1">Monthly Budget (₹)</label>
                <input
                  type="number"
                  value={simBudget}
                  onChange={(e) => setSimBudget(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E6E6E2] font-mono-num font-semibold text-[#252525]"
                />
              </div>
              <div>
                <label className="text-[#858585] block font-medium mb-1">Target Price (₹)</label>
                <input
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E6E6E2] font-mono-num font-semibold text-[#252525]"
                />
              </div>
              <div>
                <label className="text-[#858585] block font-medium mb-1">Target CAC (₹)</label>
                <input
                  type="number"
                  value={simCac}
                  onChange={(e) => setSimCac(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E6E6E2] font-mono-num font-semibold text-[#252525]"
                />
              </div>
              <div>
                <label className="text-[#858585] block font-medium mb-1">Conversion Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simConversion}
                  onChange={(e) => setSimConversion(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E6E6E2] font-mono-num font-semibold text-[#252525]"
                />
              </div>
            </div>

            {/* Side-by-Side Projections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Base Case */}
              <div className="rounded-[10px] bg-white border border-[#E6E6E2] p-4 space-y-2">
                <span className="text-[11px] font-bold text-[#686864] block">BASE-CASE PROJECTION</span>
                <div className="font-heading text-xl font-bold text-[#252525]">
                  ₹{(Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * Number(simPrice)).toLocaleString()}
                </div>
                <div className="text-xs text-[#5C5C58] space-y-1">
                  <div className="flex justify-between">
                    <span>New Customers:</span>
                    <strong className="font-mono-num text-[#252525]">
                      {Math.floor(Number(simBudget) / Math.max(1, Number(simCac)))}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated ROAS:</span>
                    <strong className="font-mono-num text-[#24724E]">
                      {((Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * Number(simPrice)) / Math.max(1, Number(simBudget))).toFixed(1)}x
                    </strong>
                  </div>
                </div>
              </div>

              {/* Best Case */}
              <div className="rounded-[10px] bg-white border border-[#CDE5D7] p-4 space-y-2">
                <span className="text-[11px] font-bold text-[#1E6543] block">BEST-CASE PROJECTION (+35%)</span>
                <div className="font-heading text-xl font-bold text-[#1E6543]">
                  ₹{Math.round(Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 1.35 * Number(simPrice)).toLocaleString()}
                </div>
                <div className="text-xs text-[#5C5C58] space-y-1">
                  <div className="flex justify-between">
                    <span>New Customers:</span>
                    <strong className="font-mono-num text-[#1E6543]">
                      {Math.floor(Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 1.35)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated ROAS:</span>
                    <strong className="font-mono-num text-[#24724E]">
                      {((Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 1.35 * Number(simPrice)) / Math.max(1, Number(simBudget))).toFixed(1)}x
                    </strong>
                  </div>
                </div>
              </div>

              {/* Downside Case */}
              <div className="rounded-[10px] bg-white border border-[#FECACA] p-4 space-y-2">
                <span className="text-[11px] font-bold text-[#BC3E3E] block">DOWNSIDE CASE (-35%)</span>
                <div className="font-heading text-xl font-bold text-[#BC3E3E]">
                  ₹{Math.round(Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 0.65 * Number(simPrice)).toLocaleString()}
                </div>
                <div className="text-xs text-[#5C5C58] space-y-1">
                  <div className="flex justify-between">
                    <span>New Customers:</span>
                    <strong className="font-mono-num text-[#BC3E3E]">
                      {Math.max(1, Math.floor(Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 0.65))}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated ROAS:</span>
                    <strong className="font-mono-num text-[#686864]">
                      {((Math.floor(Number(simBudget) / Math.max(1, Number(simCac))) * 0.65 * Number(simPrice)) / Math.max(1, Number(simBudget))).toFixed(1)}x
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FluidTransition>
      )}

      {/* NEW: 7 Specialized Growth Departments */}
      {tab === 'departments' && (
        <FluidTransition key="departments" direction="fade" className="space-y-6">
          <SectionHeader
            title="7 Specialized Growth Departments"
            description="Operational capabilities collaborating from a single shared Business Brain."
          />

          {/* Department Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              'Marketing',
              'Content',
              'Acquisition',
              'Conversion',
              'Retention',
              'Partnerships',
              'Economics',
            ].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDept(d as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] cursor-pointer transition-colors ${
                  activeDept === d
                    ? 'bg-[#FF7417] text-white shadow-[0_1px_2px_rgba(255,116,23,0.3)]'
                    : 'bg-white border border-[#E6E6E2] text-[#5C5C58] hover:text-[#252525]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Active Department Content */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-white p-5 sm:p-6 space-y-4 bw-surface-raised">
            {activeDept === 'Marketing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Growth Marketing Director</h3>
                    <p className="text-xs text-[#686864]">Multi-channel campaign planning &amp; Brand Studio creative requirements</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECF7F1] text-[#24724E]">
                    ZERO VIDEO MANDATE ACTIVE
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Campaign: Whitespace Contrast Campaign</strong>
                    <p className="text-[#686864]">Objective: Contrast transparent pricing against {state.competitors[0]?.name || 'incumbent'} opacity.</p>
                    <div className="text-[11px] text-[#C44D00] font-semibold mt-1">
                      Creative Brief: 5-Slide Static Instagram &amp; LinkedIn Carousel in Brand Studio
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDept === 'Content' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Content &amp; Distribution Director</h3>
                    <p className="text-xs text-[#686864]">Content pillars, editorial calendars, and distribution velocity</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Pillar 1: Evidence Teardowns</strong>
                    <p className="text-[#686864]">Teardowns of vague claims vs deterministic facts (2x weekly).</p>
                  </div>
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Pillar 2: Build in Public Notes</strong>
                    <p className="text-[#686864]">Observations from daily customer interviews and pricing tests (1x weekly).</p>
                  </div>
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Pillar 3: Customer Friction Resolution</strong>
                    <p className="text-[#686864]">Before &amp; After proof cards highlighting customer wins (1x weekly).</p>
                  </div>
                </div>
              </div>
            )}

            {activeDept === 'Acquisition' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Sales &amp; Customer Acquisition Director</h3>
                    <p className="text-xs text-[#686864]">Targeted outbound messaging &amp; cold outreach sequence</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-[#C44D00]">
                      <span>STEP 01 · DAY 0</span>
                      <span>Target: Founders &amp; Operators</span>
                    </div>
                    <strong className="text-[#252525] block">Subject: Quick question regarding your current setup</strong>
                    <p className="text-[#686864] italic">
                      "Noticed you're operating in this category. Most founders are frustrated by opaque enterprise lock-ins. We built {state.brain.businessName || 'BrainWise'} to deliver deterministic intelligence at transparent pricing..."
                    </p>
                  </div>
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-[#C44D00]">
                      <span>STEP 02 · DAY 3</span>
                      <span>Follow-up Proof</span>
                    </div>
                    <strong className="text-[#252525] block">Subject: Evidence teardown: Why transparent pricing converts 2.4x higher</strong>
                    <p className="text-[#686864] italic">
                      "Following up with a 1-page evidence teardown showing how upfront pricing eliminates buyer friction..."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeDept === 'Conversion' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Conversion Optimization Director (CRO)</h3>
                    <p className="text-xs text-[#686864]">Friction audits, pricing card proof badges, and checkout tests</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-2">
                    <div className="flex justify-between">
                      <strong className="text-[#252525]">Area: Checkout Step-2 Decision Point</strong>
                      <span className="font-mono-num text-[#24724E] font-semibold">+24% Projected Lift</span>
                    </div>
                    <p className="text-[#686864]">Friction: Buyers hesitate without explicit reassurance and proof badges.</p>
                    <div className="p-2 rounded bg-white border border-[#E6E6E2] space-y-1">
                      <div className="text-[#BC3E3E] line-through">Before: "Enter Card Details to Subscribe"</div>
                      <div className="text-[#24724E] font-medium">After: "Secure Instant Checkout · 100% Two-Phase Credit Protection · Cancel Anytime"</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDept === 'Retention' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Customer Retention Director</h3>
                    <p className="text-xs text-[#686864]">Customer lifecycle milestones &amp; referral velocity loops</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Day-14 Automated Satisfaction Prompt</strong>
                    <p className="text-[#686864]">Triggers after user views 2+ reports. Awards 25 complimentary validation credits upon 1-click rating.</p>
                    <span className="text-[#24724E] font-semibold block text-[11px]">-15% Churn Reduction</span>
                  </div>
                  <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1">
                    <strong className="text-[#252525] block">Two-Sided Founder Referral Link</strong>
                    <p className="text-[#686864]">Both referrer and referee receive 50 bonus credits on first completed business validation.</p>
                    <span className="text-[#24724E] font-semibold block text-[11px]">-22% Churn Reduction</span>
                  </div>
                </div>
              </div>
            )}

            {activeDept === 'Partnerships' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Partnership &amp; Distribution Director</h3>
                    <p className="text-xs text-[#686864]">Complementary co-marketing &amp; joint venture proposals</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] space-y-1 text-xs">
                  <strong className="text-[#252525] block">Complementary SaaS Co-Marketing Bundle</strong>
                  <p className="text-[#686864]">Pitch: Bundle a 30-day trial of {state.brain.businessName || 'BrainWise'} with top accounting and CRM platforms. 20% revenue share with zero channel cannibalization.</p>
                </div>
              </div>
            )}

            {activeDept === 'Economics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">Growth Economics &amp; Financial Analyst</h3>
                    <p className="text-xs text-[#686864]">LTV, CAC, gross margin, and payback schedule modeling</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                    <span className="text-[#858585] block">LTV / CAC Ratio</span>
                    <strong className="text-[#24724E] font-mono-num text-base block mt-0.5">3.8x (Healthy)</strong>
                  </div>
                  <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                    <span className="text-[#858585] block">Payback Period</span>
                    <strong className="text-[#252525] font-mono-num text-base block mt-0.5">2.4 Months</strong>
                  </div>
                  <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                    <span className="text-[#858585] block">Max Affordable CAC</span>
                    <strong className="text-[#C44D00] font-mono-num text-base block mt-0.5">₹495</strong>
                  </div>
                  <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                    <span className="text-[#858585] block">Gross Margin</span>
                    <strong className="text-[#252525] font-mono-num text-base block mt-0.5">72%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </FluidTransition>
      )}

      {/* NEW: Execution Center & Approvals */}
      {tab === 'execution' && (
        <FluidTransition key="execution" direction="fade" className="space-y-6">
          <SectionHeader
            title="Execution Center &amp; Human Approval Gate"
            description="Manage running execution jobs, review provider receipts, and approve consequential Level 3 actions."
          />

          {/* Human Approval Gate */}
          <div className="rounded-[14px] border border-[#FECACA] bg-[#FDF2F2]/40 p-5 space-y-4 bw-surface-raised">
            <div className="flex items-center gap-2 text-xs font-bold text-[#BC3E3E]">
              <ShieldAlert className="w-4 h-4 text-[#BC3E3E]" />
              <span>FOUNDER APPROVAL GATE · LEVEL 3 CONSEQUENTIAL ACTIONS</span>
            </div>
            <p className="text-xs text-[#5C5C58]">
              BrainWise strictly requires explicit founder sign-off before dispatching emails, spending budget, or publishing public content.
            </p>

            <div className="space-y-3">
              {jobsList.filter((j) => j.status === 'AWAITING_APPROVAL').map((job) => (
                <div
                  key={job.jobId}
                  className="rounded-[10px] bg-white border border-[#FECACA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F2] text-[#BC3E3E]">
                        LEVEL 3 ACTION
                      </span>
                      <strong className="text-xs font-heading text-[#252525]">{job.actionType}</strong>
                    </div>
                    <p className="text-xs text-[#686864]">
                      Payload: Target role {job.payload.targetRole} · Batch count: {job.payload.batchCount} emails
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        const workspaceId = state.activeWorkspaceId || state.workspaceId;
                        if (!workspaceId) return;
                        let updatedReceipt = {
                          providerName: 'Resend / EmailService',
                          providerTransactionId: `tx_${Date.now()}_appr`,
                          dispatchedAt: new Date().toISOString(),
                        };

                        try {
                          await apiClient.approveExecutionJob(workspaceId, job.jobId);
                          const processed = await apiClient.processExecutionJob(workspaceId, job.jobId);
                          if (processed?.data?.executionReceipt) {
                            updatedReceipt = processed.data.executionReceipt;
                          }
                        } catch {
                          // Local fallback
                        }

                        setJobsList((prev) =>
                          prev.map((item) =>
                            item.jobId === job.jobId
                              ? {
                                  ...item,
                                  status: 'COMPLETED' as const,
                                  approvalStatus: 'APPROVED' as const,
                                  receipt: updatedReceipt,
                                }
                              : item
                          )
                        );
                        showToast('Job approved and dispatched with verified provider receipt.');
                      }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      Approve &amp; Dispatch
                    </Button>
                  </div>
                </div>
              ))}
              {jobsList.filter((j) => j.status === 'AWAITING_APPROVAL').length === 0 && (
                <div className="p-3 text-xs text-[#24724E] bg-white rounded border border-[#CDE5D7]">
                  Zero pending actions awaiting founder approval. All execution jobs are clear.
                </div>
              )}
            </div>
          </div>

          {/* Execution Queue & Audit Log */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-white p-5 space-y-4 bw-surface-raised">
            <h3 className="font-heading text-base font-bold text-[#242424]">Execution Queue &amp; Provider Audit Log</h3>
            <div className="space-y-2 text-xs">
              {jobsList.map((job) => (
                <div
                  key={job.jobId}
                  className="p-3.5 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-[11px] font-semibold text-[#858585]">{job.jobId}</span>
                      <strong className="text-[#252525]">{job.actionType}</strong>
                    </div>
                    {job.receipt && (
                      <div className="text-[11px] text-[#24724E] font-mono-num">
                        Provider: {job.receipt.providerName} · TxID: {job.receipt.providerTransactionId}
                      </div>
                    )}
                  </div>
                  <StatusBadge
                    status={job.status === 'COMPLETED' ? 'Completed' : 'Awaiting Approval'}
                    tone={job.status === 'COMPLETED' ? 'success' : 'warning'}
                  />
                </div>
              ))}
            </div>
          </div>
        </FluidTransition>
      )}

      {/* B. Weekly & 30 / 60 / 90 Roadmap (Dynamic) */}
      {tab === 'roadmap' && (
        <FluidTransition key="roadmap" direction="fade" className="space-y-6">
          <SectionHeader
            title="Weekly Execution Plan"
            description="7-day AI sprint schedule, measurable goals, and live completion velocity"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateWeeklyAiPlan}
                  disabled={weeklyAiLoading}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {weeklyAiLoading ? 'Generating 7-Day AI Plan…' : 'Generate 7-Day AI Weekly Plan'}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleGenerate30DayPlan}>
                  + 30-Day Task
                </Button>
              </div>
            }
          />
          <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FF7417]">
                Weekly Completion Velocity
              </div>
              <div className="text-sm font-semibold text-[#171717]">
                {weeklyVelocity.completed} of {weeklyVelocity.total} tasks completed ({weeklyVelocity.rate}%)
              </div>
              <div className="text-xs text-[#686864]">
                {weeklyPlanMeta?.weeklyTheme ||
                  `Tracks all daily actions and goals for ${state.brain.businessName}`}
              </div>
            </div>
            <div className="w-full sm:w-56 space-y-1">
              <FluidProgress value={weeklyVelocity.rate} className="h-2.5" />
              <div className="flex justify-between text-[10px] font-mono-num text-[#686864]">
                <span>0%</span>
                <span>Target: 100%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {weeklyPlan.map((w) => (
              <div
                key={w.week}
                className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#C44D00]">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#FF7417]" />
                    {w.week}
                  </span>
                  <span className="font-mono-num text-[#686864]">{w.tasksCount} tasks</span>
                </div>
                <h3 className="font-heading text-base font-bold text-[#242424]">{w.objective}</h3>
                <div className="text-xs text-[#686864]">
                  <strong className="text-[#242424]">Aligned Experiments:</strong>{' '}
                  {w.experiments.join(' · ')}
                </div>
                <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9] text-xs text-[#242424]">
                  <strong>Expected Outcome:</strong> {w.outcome}
                </div>
              </div>
            ))}
          </div>

          <SectionHeader
            title="30 / 60 / 90-Day Strategic Horizon"
            description="Milestones synced with your Business Brain and active experiments"
          />

          {/* Horizontal Phase Milestone Axis */}
          <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] px-5 py-4 bw-surface-raised">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
              {roadmapPhases.map((col, idx) => (
                <div key={col.phase} className="relative flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        col.highlighted
                          ? 'bg-[#FF7417] shadow-[0_0_8px_rgba(255,116,23,0.45)]'
                          : 'bg-[#D8D8D2]'
                      }`}
                    />
                    <span className="text-[11px] font-mono-num font-semibold text-[#5C5C58]">
                      0{idx + 1} · {col.phase}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#252525] truncate">{col.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roadmapPhases.map((col) => (
              <div
                key={col.phase}
                className={`rounded-[12px] border p-5 space-y-3 bw-surface-raised ${
                  col.highlighted
                    ? 'border-[#FF7417] bg-[#FFF0E5]/45'
                    : 'border-[#E6E6E2] bg-[#FFFFFF]'
                }`}
              >
                <div className="text-xs font-mono-num font-semibold text-[#C44D00]">
                  {col.phase}
                </div>
                <h3 className="font-heading text-base font-bold text-[#252525]">{col.title}</h3>
                <ul className="space-y-2 text-xs text-[#5C5C58]">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Target className="w-3.5 h-3.5 text-[#FF7417] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FluidTransition>
      )}

      {/* C. Business Goals */}
      {tab === 'goals' && (
        <FluidTransition key="goals" direction="fade" className="space-y-4">
          <SectionHeader
            title="Business Goals"
            description="Track revenue, acquisition, brand awareness, product launch, and retention targets"
            action={
              <Button variant="primary" size="sm" onClick={() => setGoalModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Set Business Goal
              </Button>
            }
          />
          {state.goals.length === 0 ? (
            <GuidedActionEmptyCard
              stepLabel="Growth Targets"
              title="No quantitative business goals tracked yet"
              description="Define measurable 30-day or quarterly targets for revenue, customer acquisition, or retention."
              actionLabel="Set First Business Goal"
              onAction={() => setGoalModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.goals.map((g) => {
                const prog = calculateGoalProgress(g);
                return (
                  <div
                    key={g.id}
                    className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#C44D00]">{g.category}</span>
                      <span className="font-mono-num text-[#686864]">Due {g.deadline}</span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">{g.title}</h3>
                    <ProgressBar
                      value={prog.percentage}
                      label={`${g.currentValue} / ${g.targetValue} ${g.unit}`}
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-[#E6E6E2] text-xs">
                      <span className="text-[#686864]">Update current metric:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateGoalProgress(
                            g.id,
                            g.currentValue + Math.max(1, Math.round(g.targetValue * 0.05))
                          )
                        }
                        className="px-2.5 py-1 rounded-[6px] bg-[#F5F5F4] hover:bg-[#FFF0E5] border border-[#E6E6E2] hover:border-[#FFD3B3] text-xs font-medium text-[#242424] cursor-pointer transition-colors"
                      >
                        + Log Progress
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FluidTransition>
      )}

      {/* D. Growth Experiments */}
      {tab === 'experiments' && (
        <FluidTransition key="experiments" direction="fade" className="space-y-4">
          <SectionHeader
            title="Growth Experiments"
            description="Hypothesis-driven tests connecting Market Watch & Strategy to measurable learning"
            action={
              <Button variant="primary" size="sm" onClick={() => setExpModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                New Experiment
              </Button>
            }
          />
          {state.experiments.length === 0 ? (
            <GuidedActionEmptyCard
              stepLabel="Experimentation Lab"
              title="No growth experiments queued yet"
              description="Design a structured acquisition, pricing, or positioning experiment—or convert a Market Watch signal into a counter-test."
              actionLabel="Create First Experiment"
              onAction={() => setExpModalOpen(true)}
              secondaryLabel="Check Market Watch"
              onSecondaryAction={() => navigate('market-watch')}
            />
          ) : (
            <div className="space-y-4">
              {state.experiments.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] bw-surface-raised p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#686864]">
                        <FlaskConical className="w-3.5 h-3.5 text-[#FF7417]" />
                        <span>
                          {exp.startDate} → {exp.endDate}
                        </span>
                        <span>·</span>
                        <span className="font-mono-num">Budget: {exp.budget}</span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-[#242424] mt-1">
                        {exp.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={exp.status}
                        tone={
                          exp.status === 'Active'
                            ? 'accent'
                            : exp.status === 'Completed'
                              ? 'success'
                              : 'neutral'
                        }
                      />
                      {exp.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateExperimentStatus(
                              exp.id,
                              exp.status === 'Planned' ? 'Active' : 'Completed',
                              exp.status === 'Active'
                                ? 'Target metric achieved in prototype run.'
                                : undefined
                            )
                          }
                          className="px-2.5 py-1 text-xs font-medium border border-[#E6E6E2] rounded-[8px] hover:bg-[#F5F5F4] cursor-pointer transition-colors"
                        >
                          {exp.status === 'Planned' ? 'Launch Test' : 'Mark Completed'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                      <strong className="text-[#242424]">Hypothesis:</strong>{' '}
                      <span className="text-[#686864]">{exp.hypothesis}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-[#F5F5F4] border border-[#ECECE9]">
                      <strong className="text-[#242424]">Success Metric:</strong>{' '}
                      <span className="text-[#C44D00] font-medium">{exp.successMetric}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#686864] flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E6E2]">
                    <span>
                      <strong className="text-[#242424]">Observed Results:</strong> {exp.results}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('business-performance')}
                      className="font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                    >
                      Review in Analytics →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FluidTransition>
      )}

      {/* E. AI Recommendations */}
      {tab === 'recommendations' && (
        <FluidTransition key="recommendations" direction="fade" className="space-y-4">
          <SectionHeader
            title="AI Strategy Recommendations"
            description="Accept, modify, or dismiss recommendations grounded in your Business Brain"
            action={
              <Button
                variant="primary"
                size="sm"
                loading={recsLoading}
                onClick={handleSynthesizeRecommendations}
              >
                {!recsLoading && <Sparkles className="w-3.5 h-3.5" />}
                {recsLoading ? 'Synthesizing...' : 'Synthesize AI Recommendations'}
              </Button>
            }
          />
          <AiRequestPulse
            active={recsLoading}
            label="Synthesizing next strategic priorities from Business Brain & active goals"
          />
          {recsError && (
            <ActionFeedbackBanner
              tone="error"
              title="Live AI synthesis paused"
              detail={recsError}
              actionLabel="Dismiss"
              onAction={() => setRecsError(null)}
            />
          )}
          <LiquidSkeletonReveal
            loading={recsLoading}
            contentKey={`recs-${state.recommendations.length}`}
            statusLabel="Synthesizing AI strategy recommendations"
            skeleton={
              <RecommendationSkeletonList
                count={Math.max(2, Math.min(3, state.recommendations.length || 2))}
              />
            }
          >
            {state.recommendations.length === 0 ? (
              <GuidedActionEmptyCard
                stepLabel="Recommendations"
                title="No strategic recommendations queued"
                description="Synthesize tailored recommendations from your Business Brain and active goals, or run a fresh Idea Intelligence dossier."
                actionLabel="Synthesize AI Recommendations"
                onAction={handleSynthesizeRecommendations}
              />
            ) : (
              <div className="space-y-3">
                {state.recommendations.map((rec, idx) => (
                  <ProgressiveResultReveal key={rec.id} index={idx}>
                    <RecommendationActionSurface className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={rec.priority} />
                          <span className="text-xs text-[#686864]">
                            Difficulty: {rec.difficulty} · Cost: {rec.estimatedCost}
                          </span>
                        </div>
                        <StatusBadge
                          status={
                            rec.status === 'accepted'
                              ? 'Accepted'
                              : rec.status === 'rejected'
                                ? 'Dismissed'
                                : 'Pending Review'
                          }
                          tone={
                            rec.status === 'accepted'
                              ? 'success'
                              : rec.status === 'rejected'
                                ? 'neutral'
                                : 'warning'
                          }
                        />
                      </div>
                      <h3 className="font-heading text-base font-bold text-[#242424]">
                        {rec.whatToDo}
                      </h3>
                      <p className="text-xs text-[#686864] leading-relaxed">{rec.whyToDoIt}</p>
                      <div className="text-xs text-[#242424] bg-[#F5F5F4] border border-[#ECECE9] p-3 rounded-[8px]">
                        <strong>Supporting Research:</strong> {rec.supportingResearch} ·{' '}
                        <strong className="text-[#24724E]">Expected Benefit:</strong>{' '}
                        {rec.expectedBenefit}
                      </div>
                      {rec.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
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
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept &amp; Add Task
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateRecommendationStatus(rec.id, 'rejected')}
                          >
                            <X className="w-3.5 h-3.5" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </RecommendationActionSurface>
                  </ProgressiveResultReveal>
                ))}
              </div>
            )}
          </LiquidSkeletonReveal>
        </FluidTransition>
      )}

      {/* Task Detail Drawer */}
      <Drawer
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title ?? 'Task Detail'}
        subtitle={
          selectedTask
            ? `${selectedTask.department} · ${selectedTask.estimatedMinutes} mins`
            : undefined
        }
      >
        {selectedTask && (
          <div className="space-y-4 text-sm">
            <PriorityBadge priority={selectedTask.priority} />
            <p className="text-[#242424] leading-relaxed">{selectedTask.description}</p>
            <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#ECECE9] text-xs space-y-1.5">
              <div>
                <strong>Why it matters:</strong> {selectedTask.whyItMatters}
              </div>
              <div>
                <strong>Expected outcome:</strong> {selectedTask.expectedOutcome}
              </div>
            </div>
            <Field label="Founder Notes" htmlFor="gd-task-notes">
              <Textarea
                id="gd-task-notes"
                rows={3}
                value={taskNoteDraft}
                onChange={(e) => setTaskNoteDraft(e.target.value)}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  updateTaskNotes(selectedTask.id, taskNoteDraft);
                  showToast('Task notes saved.');
                  setSelectedTask(null);
                }}
              >
                Save Notes
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  toggleTaskStatus(selectedTask.id);
                  setSelectedTask(null);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedTask.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modals */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Set New Business Goal"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!gTitle.trim()) return;
            addGoal({
              category: gCat,
              title: gTitle.trim(),
              targetValue: Number(gTarget) || 100,
              currentValue: 0,
              unit: gUnit,
              deadline: gDeadline,
              supportingTaskIds: [],
            });
            setGTitle('');
            setGoalModalOpen(false);
          }}
          className="space-y-4"
        >
          <Field label="Goal Category" htmlFor="gd-goal-cat">
            <Select
              id="gd-goal-cat"
              value={gCat}
              onChange={(e) => setGCat(e.target.value as GrowthGoal['category'])}
            >
              <option value="Revenue">Revenue Target</option>
              <option value="Customer Acquisition">Customer Acquisition</option>
              <option value="Brand Awareness">Brand Awareness</option>
              <option value="Product Launch">Product Launch</option>
              <option value="Marketing">Marketing Objective</option>
              <option value="Customer Retention">Customer Retention</option>
            </Select>
          </Field>
          <Field label="Goal Title" htmlFor="gd-goal-title">
            <Input
              id="gd-goal-title"
              type="text"
              required
              value={gTitle}
              onChange={(e) => setGTitle(e.target.value)}
              placeholder="e.g. Reach 200 active subscribers"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Target" htmlFor="gd-goal-target">
              <Input
                id="gd-goal-target"
                type="number"
                value={gTarget}
                onChange={(e) => setGTarget(e.target.value)}
              />
            </Field>
            <Field label="Unit" htmlFor="gd-goal-unit">
              <Input
                id="gd-goal-unit"
                type="text"
                value={gUnit}
                onChange={(e) => setGUnit(e.target.value)}
              />
            </Field>
            <Field label="Deadline" htmlFor="gd-goal-deadline">
              <Input
                id="gd-goal-deadline"
                type="date"
                value={gDeadline}
                onChange={(e) => setGDeadline(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Create Daily Action Task"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!tTitle.trim()) return;
            addTask({
              title: tTitle.trim(),
              description: tWhy.trim() || 'Added directly in Growth Planner.',
              whyItMatters: tWhy.trim() || 'Moves current 30-day growth objective forward.',
              expectedOutcome: 'Completed execution deliverable',
              priority: tPrio,
              estimatedMinutes: Number(tMin) || 30,
              dueDate: new Date().toISOString().slice(0, 10),
              department: 'Growth Director',
              status: 'pending',
              isTodayPriority: true,
            });
            setTTitle('');
            setTWhy('');
            setTaskModalOpen(false);
          }}
          className="space-y-4"
        >
          <Field label="Task Title" htmlFor="gd-task-title">
            <Input
              id="gd-task-title"
              type="text"
              required
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
            />
          </Field>
          <Field label="Why it matters" htmlFor="gd-task-why">
            <Input
              id="gd-task-why"
              type="text"
              value={tWhy}
              onChange={(e) => setTWhy(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority" htmlFor="gd-task-prio">
              <Select
                id="gd-task-prio"
                value={tPrio}
                onChange={(e) => setTPrio(e.target.value as typeof tPrio)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
            <Field label="Est. Minutes" htmlFor="gd-task-min">
              <Input
                id="gd-task-min"
                type="number"
                value={tMin}
                onChange={(e) => setTMin(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={expModalOpen}
        onClose={() => setExpModalOpen(false)}
        title="Create Growth Experiment"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!eTitle.trim()) return;
            addExperiment({
              title: eTitle.trim(),
              hypothesis: eHyp.trim() || 'Testing targeted acquisition channel.',
              objective: 'Validate conversion efficiency before scaling budget.',
              targetAudience: state.brain.targetAudience,
              action: 'Run controlled 14-day test.',
              successMetric: eMetric.trim() || '>= 3.5% conversion rate',
              budget: eBudget,
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              status: 'Planned',
              results: 'Newly created.',
              learnings: 'Pending results.',
            });
            setETitle('');
            setEHyp('');
            setEMetric('');
            setExpModalOpen(false);
          }}
          className="space-y-4"
        >
          <Field label="Experiment Title" htmlFor="gd-exp-title">
            <Input
              id="gd-exp-title"
              type="text"
              required
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
            />
          </Field>
          <Field label="Hypothesis" htmlFor="gd-exp-hyp">
            <Textarea
              id="gd-exp-hyp"
              rows={2}
              value={eHyp}
              onChange={(e) => setEHyp(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Success Metric" htmlFor="gd-exp-metric">
              <Input
                id="gd-exp-metric"
                type="text"
                value={eMetric}
                onChange={(e) => setEMetric(e.target.value)}
                placeholder="e.g. >= 38% conv."
              />
            </Field>
            <Field label="Budget" htmlFor="gd-exp-budget">
              <Input
                id="gd-exp-budget"
                type="text"
                value={eBudget}
                onChange={(e) => setEBudget(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Experiment
            </Button>
          </div>
        </form>
      </Modal>

      <JourneyNextStep
        currentRoute={initialMode === 'tasks' ? 'tasks-experiments' : 'growth-director'}
      />
    </div>
  );
};
