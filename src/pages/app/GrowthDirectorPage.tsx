import React, { useEffect, useRef, useState } from 'react';
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
import { generateAiRecommendations } from '../../utils/aiClient';
import type { GrowthGoal, GrowthTask } from '../../types/brainwise';
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

type GrowthTabId = 'overview' | 'roadmap' | 'goals' | 'experiments' | 'recommendations';

const GROWTH_TAB_LABELS: Record<GrowthTabId, string> = {
  overview: 'Overview & Daily Plan',
  roadmap: 'Weekly & 30/60/90 Roadmap',
  goals: 'Business Goals',
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

  const defaultTab: GrowthTabId = initialMode === 'tasks' ? 'experiments' : 'overview';
  const [tab, setTab] = useState<GrowthTabId>(defaultTab);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today'>('all');

  useEffect(() => {
    setTab(initialMode === 'tasks' ? 'experiments' : 'overview');
  }, [initialMode]);

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

  const taskStats = calculateTaskCompletionStats(state.tasks);
  const weeklyPlan = buildWeeklyGrowthPlan(state);
  const roadmapPhases = buildRoadmapPhases(state);
  const totalSprintSeconds = sprintDurationMins * 60;
  const sprintElapsedPct = Math.round(((totalSprintSeconds - secondsLeft) / totalSprintSeconds) * 100);
  const displayedTasks =
    taskFilter === 'today'
      ? state.tasks.filter((t) => t.isTodayPriority || t.priority === 'high')
      : state.tasks;

  const handleGenerate30DayPlan = () => {
    const primaryGoal = state.goals[0];
    addTask({
      title: `Launch ${state.brain.businessName} 14-day acquisition & positioning sprint`,
      description: `Generated inside 30-Day Growth Roadmap using ${state.brain.businessName} Business Brain & Competitive Strategy.`,
      whyItMatters: primaryGoal
        ? `Directly accelerates "${primaryGoal.title}" (${primaryGoal.currentValue}/${primaryGoal.targetValue} ${primaryGoal.unit}).`
        : `Converts ${state.brain.targetAudience} into early trials.`,
      expectedOutcome: primaryGoal ? `Progress toward ${primaryGoal.targetValue} ${primaryGoal.unit}` : '5+ qualified leads per week.',
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
        err instanceof Error
          ? err.message
          : 'Unable to reach BrainWise AI recommendation service.'
      );
    } finally {
      setRecsLoading(false);
    }
  };

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

      <Tabs
        activeTab={tab}
        onChange={(id) => setTab(id as GrowthTabId)}
        tabs={[
          { id: 'overview', label: 'Overview & Daily Plan', count: taskStats.pending },
          { id: 'roadmap', label: 'Weekly & 30/60/90 Roadmap' },
          { id: 'goals', label: 'Business Goals', count: state.goals.length },
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
                  <div className={`inline-flex items-center gap-2 ${typeClass.overline} text-[#FF8A36]`}>
                    <IntelligenceOrb size="xs" state={timerRunning ? 'thinking' : 'active'} />
                    <span>Today’s Focus Sprint</span>
                  </div>
                  <h2 className={`${typeClass.h4} font-bold text-white mt-1`}>
                    Top {Math.min(3, selectFocusSprintTasks(state.tasks, 3).length)} Pending Priorities
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

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
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
                      <div className="font-heading text-sm font-bold text-white mt-1.5">{task.title}</div>
                      <p className="text-xs text-[#C8C8C2] mt-1 line-clamp-2">{task.whyItMatters}</p>
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
                    All pending sprint tasks are completed! Generate a new 30-day batch or add a custom task.
                  </div>
                )}
              </div>
            </DarkSurfacePanel>
          </MorphingPanel>
        )}
      </AnimatePresence>

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
              <div className="text-[11px] text-[#5C5C58]">{taskStats.remainingMinutes} mins remaining</div>
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

              {displayedTasks.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Execution Queue"
                  title="No daily execution tasks queued"
                  description="Generate a 30-day growth task from your Business Brain or create a custom action task to start tracking velocity."
                  actionLabel="Generate 30-Day Growth Task"
                  onAction={handleGenerate30DayPlan}
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

      {/* B. Weekly & 30 / 60 / 90 Roadmap (Dynamic) */}
      {tab === 'roadmap' && (
        <FluidTransition key="roadmap" direction="fade" className="space-y-6">
          <SectionHeader
            title="Weekly Execution Plan"
            description="Generated dynamically from your pending priorities, active experiments, and growth targets"
            action={
              <Button variant="secondary" size="sm" onClick={handleGenerate30DayPlan}>
                <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                Generate 30-Day Growth Task
              </Button>
            }
          />
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
            skeleton={<RecommendationSkeletonList count={Math.max(2, Math.min(3, state.recommendations.length || 2))} />}
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
                <RecommendationActionSurface
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised"
                >
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
                  <h3 className="font-heading text-base font-bold text-[#242424]">{rec.whatToDo}</h3>
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
          selectedTask ? `${selectedTask.department} · ${selectedTask.estimatedMinutes} mins` : undefined
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
      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Set New Business Goal">
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
