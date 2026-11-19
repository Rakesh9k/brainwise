import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  Download,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  buildDynamicDossier,
  compareMarketScenarios,
  estimateMarketSizing,
} from '../../utils/logic';
import { generateAiDossier } from '../../utils/aiClient';
import type { MarketScenarioPreset, ResearchReport } from '../../types/brainwise';
import {
  ActionFeedbackBanner,
  AiRequestPulse,
  InsightSavedBeacon,
  LiquidSkeletonReveal,
} from '../../components/motion/LiquidMotion';
import { DossierPreviewSkeleton } from '../../components/ui/LiquidSkeletons';
import {
  FluidProgress,
  IntelligenceOrb,
  IntelligenceSurface,
  NeuralNetworkAnimation,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from '../../components/ui/DesignSystem';
import {
  BusinessBrainContextBanner,
  GuidedActionEmptyCard,
  JourneyNextStep,
  ResearchReportSection,
} from '../../components/ui/DepartmentCards';
import { typeClass } from '../../theme/typography';

const RESEARCH_STAGES = [
  'Understanding the idea',
  'Investigating market demand',
  'Analysing customers',
  'Identifying competitors',
  'Researching pricing',
  'Identifying market gaps',
  'Evaluating risks',
  'Preparing the final report',
];

export const IdeaIntelligencePage: React.FC = () => {
  const {
    state,
    navigate,
    addReport,
    toggleSaveReportToBrain,
    updateReportAssumption,
    setCustomScenarioB,
    addTask,
    showToast,
    departmentResetNonce,
    prefilledIdeaPrompt,
    setPrefilledIdeaPrompt,
    pendingReportOpen,
    consumeReportOpen,
  } = useBrainWise();

  const [view, setView] = useState<'home' | 'wizard' | 'progress' | 'report'>('home');
  const [selectedReportId, setSelectedReportId] = useState(
    state.activeReportId || state.reports[0]?.id
  );
  const [scenarioChoiceB, setScenarioChoiceB] = useState<'regional' | 'custom'>(
    state.customScenarioB ? 'custom' : 'regional'
  );
  const customScenarioB = state.customScenarioB ?? null;

  // 7-step guided workflow state
  const [wizardStep, setWizardStep] = useState(1);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [industry, setIndustry] = useState(state.brain.industry);
  const [targetMarket, setTargetMarket] = useState(state.brain.targetAudience);
  const [geography, setGeography] = useState('India (Tier-1 Metros)');
  const [depth, setDepth] = useState<ResearchReport['depth']>('Deep Market Dossier');
  const [progressStageIdx, setProgressStageIdx] = useState(0);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [synthesisAttempt, setSynthesisAttempt] = useState(0);
  const [quickIdeaInput, setQuickIdeaInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '01': true,
    '03': true,
    '15': true,
  });

  const toggleReportSection = (num: string) => {
    setExpandedSections((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const allReportSectionsExpanded = Array.from({ length: 15 }, (_, i) =>
    String(i + 1).padStart(2, '0')
  ).every((num) => Boolean(expandedSections[num]));

  const toggleAllReportSections = () => {
    const nextVal = !allReportSectionsExpanded;
    const nextState: Record<string, boolean> = {};
    for (let i = 1; i <= 15; i++) {
      nextState[String(i).padStart(2, '0')] = nextVal;
    }
    setExpandedSections(nextState);
  };

  const activeReport = state.reports.find((r) => r.id === selectedReportId) ?? state.reports[0];

  useEffect(() => {
    if (prefilledIdeaPrompt.trim()) {
      setIdeaPrompt(prefilledIdeaPrompt);
      setWizardStep(1);
      setView('wizard');
      setPrefilledIdeaPrompt('');
    }
  }, [prefilledIdeaPrompt, setPrefilledIdeaPrompt]);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setView('home');
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    view === 'wizard'
      ? [
          { label: 'Guided Research', onClick: () => setWizardStep(1) },
          { label: `Step ${wizardStep} of 7` },
        ]
      : view === 'progress'
        ? [{ label: 'Research Pipeline' }, { label: 'Synthesizing Dossier' }]
        : view === 'report' && activeReport
          ? [
              { label: 'Research Reports', onClick: () => setView('home') },
              { label: activeReport.title },
            ]
          : [],
    [view, wizardStep, activeReport?.id, activeReport?.title]
  );

  useEffect(() => {
    if (state.activeReportId && state.activeReportId !== selectedReportId) {
      setSelectedReportId(state.activeReportId);
    }
  }, [state.activeReportId, selectedReportId]);

  useEffect(() => {
    if (pendingReportOpen && state.activeReportId) {
      setSelectedReportId(state.activeReportId);
      setView('report');
      consumeReportOpen();
    }
  }, [pendingReportOpen, state.activeReportId, consumeReportOpen]);

  // Live AI synthesis pipeline coupled with 8-stage progress indicators
  useEffect(() => {
    if (view !== 'progress') return;
    let cancelled = false;
    let currentIdx = 0;
    setProgressStageIdx(0);
    setSynthesisError(null);

    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (currentIdx < RESEARCH_STAGES.length - 2) {
        currentIdx += 1;
        setProgressStageIdx(currentIdx);
      }
    }, 340);

    generateAiDossier({
      ideaSummary: ideaPrompt,
      industry,
      targetMarket,
      geography,
      depth,
      brain: state.brain,
    })
      .then(({ report }) => {
        if (cancelled) return;
        window.clearInterval(interval);
        setProgressStageIdx(RESEARCH_STAGES.length - 1);
        window.setTimeout(() => {
          if (cancelled) return;
          addReport(report);
          setSelectedReportId(report.id);
          setView('report');
        }, 280);
      })
      .catch((err) => {
        if (cancelled) return;
        window.clearInterval(interval);
        const msg =
          err instanceof Error ? err.message : 'Unable to reach BrainWise AI synthesis endpoint.';
        setSynthesisError(msg);
      });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    view,
    synthesisAttempt,
    addReport,
    depth,
    geography,
    ideaPrompt,
    industry,
    state.brain,
    targetMarket,
  ]);

  const handleUseLocalTemplateFallback = () => {
    const created = buildDynamicDossier({
      ideaSummary: ideaPrompt,
      industry,
      targetMarket,
      geography,
      depth,
      brain: state.brain,
    });
    addReport(created);
    setSelectedReportId(created.id);
    setSynthesisError(null);
    setView('report');
    showToast('Loaded local template dossier preview.');
  };

  const startGuidedResearch = (presetIdea?: string) => {
    if (presetIdea) setIdeaPrompt(presetIdea);
    setWizardStep(1);
    setView('wizard');
  };

  const handleConvertFindingsToTasks = () => {
    if (!activeReport) return;
    activeReport.validationExperiments.forEach((ex, idx) => {
      addTask({
        title: `Validate: ${ex.title}`,
        description: `Derived from Idea Intelligence report "${activeReport.title}". Target metric: ${ex.metric}.`,
        whyItMatters: 'Tests primary report assumption before scaling capital commitment.',
        expectedOutcome: ex.metric,
        priority: idx === 0 ? 'high' : 'medium',
        estimatedMinutes: 35,
        dueDate: '2026-11-22',
        department: 'Idea Intelligence',
        status: 'pending',
      });
    });
    showToast('Converted validation findings into Growth Planner tasks.');
  };

  if (view === 'wizard') {
    return (
      <div className="space-y-6">
        <BusinessBrainContextBanner
          departmentLabel="Idea Intelligence"
          contextKey="ideaIntelligence"
        />
        <div className="max-w-2xl mx-auto rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 bw-surface-raised">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView('home')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#686864] hover:text-[#242424] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Idea Intelligence
            </button>
            <span className="text-xs font-mono-num text-[#686864]">Step {wizardStep} of 7</span>
          </div>
          <ProgressBar value={(wizardStep / 7) * 100} showPercent={false} size="sm" />

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                  1. Describe the business idea or product concept
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIdeaPrompt(`${state.brain.businessName}: ${state.brain.overviewSummary}`);
                    setWizardError(null);
                  }}
                  className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                >
                  Use Business Brain concept →
                </button>
              </div>
              <p className={`${typeClass.bodySm} text-[#686864]`}>
                Write plainly—what problem does it solve and what are you offering?
              </p>
              <textarea
                rows={4}
                value={ideaPrompt}
                onChange={(e) => {
                  setIdeaPrompt(e.target.value);
                  if (wizardError) setWizardError(null);
                }}
                placeholder="e.g. A corporate wellness & artisan coffee tasting subscription for 25–100 person hybrid studios..."
                className="w-full p-3.5 text-sm border border-[#E6E6E2] rounded-[10px] bw-surface-inset focus:outline-none focus:border-[#FF7417] focus:ring-2 focus:ring-[#FF7417]/12"
              />
              {wizardError && (
                <p role="alert" className="text-xs font-medium text-[#BC3E3E]">
                  {wizardError}
                </p>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                2. Select or refine the industry
              </h2>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-[#E6E6E2] rounded-[10px] bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  'Specialty Food & Beverage',
                  'B2B SaaS & Productivity',
                  'Consumer Health',
                  'Boutique Hospitality',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setIndustry(preset)}
                    className={`px-3 py-1.5 text-xs rounded-[8px] border cursor-pointer transition-colors ${
                      industry === preset
                        ? 'border-[#FF7417] bg-[#FFF0E5] text-[#C44D00] font-medium'
                        : 'border-[#E6E6E2] bg-[#F5F5F4] text-[#242424] hover:bg-[#ECECE9]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                3. Define the target market
              </h2>
              <textarea
                rows={3}
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                className="w-full p-3.5 text-sm border border-[#E6E6E2] rounded-[10px] bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                4. Select target geography
              </h2>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-[#E6E6E2] rounded-[10px] bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  'India (Tier-1 Metros)',
                  'North America',
                  'United Kingdom & Europe',
                  'Global Remote',
                ].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGeography(g)}
                    className={`px-3 py-1.5 text-xs rounded-[8px] border cursor-pointer transition-colors ${
                      geography === g
                        ? 'border-[#FF7417] bg-[#FFF0E5] text-[#C44D00] font-medium'
                        : 'border-[#E6E6E2] bg-[#F5F5F4] text-[#242424] hover:bg-[#ECECE9]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="space-y-4">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                5. Choose research depth
              </h2>
              <div className="space-y-2.5">
                {(
                  [
                    { id: 'Rapid Pulse', desc: 'Fast demand check & top 3 risks' },
                    {
                      id: 'Standard Validation',
                      desc: 'Market sizing bands, segments & pricing ladder',
                    },
                    {
                      id: 'Deep Market Dossier',
                      desc: 'Full 15-section commercial validation + startup costs + experiments',
                    },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDepth(d.id)}
                    className={`w-full text-left p-4 rounded-[10px] border cursor-pointer transition-colors ${
                      depth === d.id
                        ? 'border-[#FF7417] bg-[#FFF0E5]/55'
                        : 'border-[#E6E6E2] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#242424]">{d.id}</div>
                    <div className="text-xs text-[#686864] mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 6 && (
            <div className="space-y-4">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                6. Review research scope
              </h2>
              <div className="rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] p-4 space-y-2.5 text-xs">
                <div>
                  <span className="text-[#686864]">Concept:</span>{' '}
                  <strong className="text-[#242424]">
                    {ideaPrompt || 'Using Business Brain concept'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#686864]">Industry:</span>{' '}
                  <strong className="text-[#242424]">{industry}</strong>
                </div>
                <div>
                  <span className="text-[#686864]">Target Market:</span>{' '}
                  <strong className="text-[#242424]">{targetMarket}</strong>
                </div>
                <div>
                  <span className="text-[#686864]">Geography:</span>{' '}
                  <strong className="text-[#242424]">{geography}</strong>
                </div>
                <div>
                  <span className="text-[#686864]">Depth:</span>{' '}
                  <strong className="text-[#C44D00]">{depth}</strong>
                </div>
              </div>
              <p className="text-xs text-[#686864]">
                Generates a structured commercial research dossier grounded in your Business Brain
                context with transparent estimates and editable assumptions.
              </p>
            </div>
          )}

          {wizardStep === 7 && (
            <div className="space-y-4 py-2">
              <h2 className={`${typeClass.h4} font-bold text-[#171717]`}>
                7. Ready to launch Idea Intelligence
              </h2>
              <p className={`${typeClass.bodySm} text-[#686864]`}>
                Click Start Research to run the 8-stage market synthesis and compile your 15-section
                deliverable.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#E6E6E2]">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 text-xs font-medium text-[#686864] hover:text-[#242424] disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            {wizardStep < 7 ? (
              <button
                type="button"
                onClick={() => {
                  if (wizardStep === 1 && !ideaPrompt.trim()) {
                    setWizardError(
                      'Describe your concept above, or click "Use Business Brain concept" to prefill.'
                    );
                    return;
                  }
                  setWizardError(null);
                  setWizardStep((s) => s + 1);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setView('progress')}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start Research
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'progress') {
    const pct = Math.round(((progressStageIdx + 1) / RESEARCH_STAGES.length) * 100);
    return (
      <div className="space-y-6">
        <BusinessBrainContextBanner
          departmentLabel="Idea Intelligence"
          contextKey="ideaIntelligence"
        />
        <IntelligenceSurface variant="dark" className="max-w-3xl mx-auto p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <IntelligenceOrb size="md" state="thinking" />
              <div>
                <h2 className={`${typeClass.h4} font-bold text-white`}>
                  Synthesizing &ldquo;{ideaPrompt || state.brain.businessName}&rdquo;
                </h2>
                <p className={`${typeClass.bodySm} text-[#A8A8A2]`}>
                  Live AI strategy synthesis · {depth}
                </p>
              </div>
            </div>
            <span className="font-mono-num text-xs font-semibold text-[#FF9A45]">
              Stage {progressStageIdx + 1} / {RESEARCH_STAGES.length}
            </span>
          </div>

          <div className="rounded-[12px] border border-[#252525] bg-[#141414] overflow-hidden">
            <NeuralNetworkAnimation
              mode="synthesizing"
              dark
              height={188}
              label={`Synthesizing market intelligence for ${ideaPrompt || state.brain.businessName}`}
            />
          </div>

          <AiRequestPulse
            active={!synthesisError}
            label={`Stage ${progressStageIdx + 1}/${RESEARCH_STAGES.length} · ${RESEARCH_STAGES[progressStageIdx]}`}
          />

          <FluidProgress
            value={pct}
            label={synthesisError ? 'Synthesis paused' : RESEARCH_STAGES[progressStageIdx]}
            activeShimmer={!synthesisError}
            dark
          />

          {synthesisError && (
            <div className="space-y-2.5">
              <ActionFeedbackBanner
                tone="error"
                title="Live AI synthesis could not complete"
                detail={synthesisError}
                actionLabel="Retry Live AI Synthesis"
                onAction={() => setSynthesisAttempt((n) => n + 1)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleUseLocalTemplateFallback}
                  className="px-3.5 py-2 text-xs font-medium text-[#ECECE9] bg-[#171717] hover:bg-[#2F2F2F] border border-[#3A3A3A] rounded-[8px] cursor-pointer transition-colors"
                >
                  Use Local Template Preview
                </button>
                <button
                  type="button"
                  onClick={() => setView('wizard')}
                  className="text-xs text-[#A8A8A2] hover:text-white cursor-pointer"
                >
                  ← Back to Research Scope
                </button>
              </div>
            </div>
          )}

          <DossierPreviewSkeleton />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {RESEARCH_STAGES.map((stage, idx) => {
              const done = idx < progressStageIdx;
              const current = idx === progressStageIdx;
              return (
                <div
                  key={stage}
                  className={`px-3.5 py-2.5 rounded-[10px] border flex items-center justify-between text-xs transition-colors ${
                    current
                      ? 'border-[#FF7417]/70 bg-[#252525] text-white font-semibold'
                      : done
                        ? 'border-[#252525] bg-[#1C1C1C] text-[#4FA87B]'
                        : 'border-[#222222] bg-[#171717] text-[#858585]'
                  }`}
                >
                  <span className="truncate">{stage}</span>
                  <span className="font-mono-num text-[11px] shrink-0 ml-2">
                    {done ? 'Done' : current ? 'Active' : 'Queued'}
                  </span>
                </div>
              );
            })}
          </div>
        </IntelligenceSurface>
      </div>
    );
  }

  if (view === 'report' && activeReport) {
    const tamVal = activeReport.tamSamSom.assumptions[0]?.value ?? 2.6;
    const samVal = activeReport.tamSamSom.assumptions[1]?.value ?? 12;
    const somVal = activeReport.tamSamSom.assumptions[2]?.value ?? 0.8;
    const dynamicBands = estimateMarketSizing(tamVal, samVal, somVal);

    return (
      <LiquidSkeletonReveal
        loading={false}
        contentKey={`dossier-${activeReport.id}`}
        skeleton={<DossierPreviewSkeleton />}
        className="space-y-6"
      >
        <BusinessBrainContextBanner
          departmentLabel="Idea Intelligence"
          contextKey="ideaIntelligence"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView('home')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#686864] hover:text-[#242424] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Research Projects
          </button>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#E6E6E2] hover:bg-[#F5F5F4] rounded-[8px] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => toggleSaveReportToBrain(activeReport.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] border cursor-pointer ${
                activeReport.savedToBrain
                  ? 'bg-[#ECF7F1] text-[#24724E] border-[#CEE8DA]'
                  : 'bg-[#FFFFFF] text-[#242424] border-[#E6E6E2] hover:bg-[#F5F5F4]'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              {activeReport.savedToBrain ? 'Saved to Business Brain' : 'Save to Business Brain'}
            </button>
            <InsightSavedBeacon saved={Boolean(activeReport.savedToBrain)} label="Synced" />
            <button
              type="button"
              onClick={handleConvertFindingsToTasks}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#E6E6E2] hover:bg-[#F5F5F4] rounded-[8px] cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#FF7417]" />
              Convert Findings to Tasks
            </button>
            <button
              type="button"
              onClick={() => navigate('competitive-intelligence')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[8px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              Analyse these competitors
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Minimalist sticky frosted section jump rail */}
          <aside
            aria-label="Report section navigation"
            data-frosted-nav="report-sections"
            className="hidden xl:block w-56 shrink-0 sticky top-20 space-y-2 text-xs no-print rounded-[14px] border border-[#E6E6E2]/75 bw-frosted-nav p-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E6E2]">
              <span className="font-semibold text-[#252525]">Sections (15)</span>
              <button
                type="button"
                onClick={toggleAllReportSections}
                className="text-[11px] font-medium text-[#C44D00] hover:text-[#FF7417] cursor-pointer"
              >
                {allReportSectionsExpanded ? 'Collapse' : 'Expand all'}
              </button>
            </div>
            <nav className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
              {[
                ['01', 'Executive Summary'],
                ['02', 'Market Overview'],
                ['03', 'TAM / SAM / SOM'],
                ['04', 'Market Demand'],
                ['05', 'Customer Segments'],
                ['06', 'Pain Points'],
                ['07', 'Competitor Landscape'],
                ['08', 'Pricing Analysis'],
                ['09', 'Market Opportunities'],
                ['10', 'Business Models'],
                ['11', 'Revenue Potential'],
                ['12', 'Startup Costs'],
                ['13', 'Risks & Challenges'],
                ['14', 'Experiments'],
                ['15', 'Strategic Verdict'],
              ].map(([num, label]) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setExpandedSections((prev) => ({ ...prev, [num]: true }));
                    window.requestAnimationFrame(() => {
                      document
                        .getElementById(`section-${num}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                    });
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-[7px] transition-colors flex items-center gap-2 cursor-pointer ${
                    expandedSections[num]
                      ? 'text-[#252525] font-medium bg-[#FFFFFF]'
                      : 'text-[#686864] hover:text-[#252525] hover:bg-[#F1F1EF]/70'
                  }`}
                >
                  <span className="font-mono-num text-[10px] text-[#858585] shrink-0">{num}</span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 w-full rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 sm:p-8 bw-surface-raised">
            <div className="pb-6 border-b border-[#E6E6E2]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#686864] mb-2">
                <span className="font-medium text-[#C44D00]">{activeReport.depth}</span>
                <span aria-hidden="true">·</span>
                <span>{activeReport.industry}</span>
                <span aria-hidden="true">·</span>
                <span>{activeReport.geography}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">Researched {activeReport.createdAt}</span>
              </div>
              <h1 className={`${typeClass.h2} text-[#171717]`}>{activeReport.title}</h1>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge
                    status={`Confidence: ${activeReport.overallConfidence}`}
                    tone="success"
                  />
                  <StatusBadge status={`Signal: ${activeReport.viabilitySignal}`} tone="accent" />
                  {activeReport.truthCheck && (
                    <span
                      title={`Truth Engine verification score: ${activeReport.truthCheck.truthScore}% grounded against confirmed Business Brain facts`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        activeReport.truthCheck.status === 'VERIFIED'
                          ? 'bg-[#EAF5EF] text-[#24724E] border-[#CDE5D7]'
                          : activeReport.truthCheck.status === 'REMEDIATED'
                            ? 'bg-[#FFF4E5] text-[#A85E16] border-[#FBE0C2]'
                            : 'bg-[#FDF2F2] text-[#BC3E3E] border-[#F8D7D7]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Truth Score: {activeReport.truthCheck.truthScore}%
                    </span>
                  )}
                  <span className="text-xs text-[#686864]">
                    Demo Deliverable · Verified references and modelled estimates separated
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleAllReportSections}
                  className="text-xs font-medium text-[#52524E] hover:text-[#171717] px-3 py-1 rounded-full bw-ceramic-control transition-colors cursor-pointer no-print"
                >
                  {allReportSectionsExpanded ? 'Collapse sections' : 'Expand all 15 sections'}
                </button>
              </div>
            </div>

            <ResearchReportSection
              id="section-01"
              number="01"
              title="Executive Summary"
              factType="mixed"
              collapsible
              expanded={Boolean(expandedSections['01'])}
              onToggle={() => toggleReportSection('01')}
            >
              <p>{activeReport.executiveSummary}</p>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-02"
              number="02"
              title="Market Overview"
              factType={activeReport.marketOverview.factType}
              collapsible
              expanded={Boolean(expandedSections['02'])}
              onToggle={() => toggleReportSection('02')}
            >
              <p>{activeReport.marketOverview.text}</p>
              <div className="mt-2 text-xs text-[#686864]">
                Sources: {activeReport.marketOverview.sources.join(' · ')}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-03"
              number="03"
              title="TAM, SAM and SOM (Range Bands & Editable Assumptions)"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['03'])}
              onToggle={() => toggleReportSection('03')}
            >
              <p className="text-xs text-[#686864] mb-4">
                BrainWise uses realistic range bands rather than false single-point precision.
                Adjust assumptions below to test sensitivity.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]">
                  <div className="text-xs text-[#686864]">TAM (Total Addressable)</div>
                  <div className="text-xl font-bold font-mono-num text-[#242424] mt-1">
                    {dynamicBands.tamBand}
                  </div>
                  <div className="text-xs text-[#686864] mt-1.5">
                    {activeReport.tamSamSom.tamBasis}
                  </div>
                </div>
                <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]">
                  <div className="text-xs text-[#686864]">SAM (Serviceable Available)</div>
                  <div className="text-xl font-bold font-mono-num text-[#242424] mt-1">
                    {dynamicBands.samBand}
                  </div>
                  <div className="text-xs text-[#686864] mt-1.5">
                    {activeReport.tamSamSom.samBasis}
                  </div>
                </div>
                <div className="p-4 rounded-[10px] bg-[#FFF0E5]/70 border border-[#FFD3B3]">
                  <div className="text-xs text-[#C44D00] font-medium">SOM (3-Year Target)</div>
                  <div className="text-xl font-bold font-mono-num text-[#242424] mt-1">
                    {dynamicBands.somBand}
                  </div>
                  <div className="text-xs text-[#686864] mt-1.5">
                    {activeReport.tamSamSom.somBasis}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF]">
                {activeReport.tamSamSom.assumptions.map((a) => (
                  <div key={a.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#686864]">{a.label}</span>
                      <span className="font-mono-num font-semibold text-[#C44D00]">
                        {a.value} {a.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={a.min}
                      max={a.max}
                      step={a.step}
                      value={a.value}
                      aria-label={a.label}
                      onChange={(e) =>
                        updateReportAssumption(activeReport.id, a.id, parseFloat(e.target.value))
                      }
                      className="w-full accent-[#FF7417] cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {(() => {
                const baseScenario: MarketScenarioPreset = {
                  id: 'conservative',
                  name: 'Conservative Metro Pilot (Current Sliders)',
                  tamBillion: tamVal,
                  samSharePct: samVal,
                  somSharePct: somVal,
                  targetArpuUsd: 20,
                  breakEvenMonths: 7,
                };
                const regionalPreset: MarketScenarioPreset = {
                  id: 'regional',
                  name: 'Regional Expansion (4-City Rollout)',
                  tamBillion: Number((tamVal * 1.35).toFixed(1)),
                  samSharePct: Math.min(35, Math.round(samVal * 1.4)),
                  somSharePct: Math.min(8, Number((somVal * 1.5).toFixed(1))),
                  targetArpuUsd: 24,
                  breakEvenMonths: 11,
                };
                const scenarioB =
                  scenarioChoiceB === 'custom' && customScenarioB
                    ? customScenarioB
                    : regionalPreset;
                const comparison = compareMarketScenarios(baseScenario, scenarioB);

                return (
                  <div className="mt-5 rounded-[12px] border border-[#E6E6E2] bg-[#F5F5F4] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#242424]">
                          Side-by-Side Scenario Comparison
                        </div>
                        <p className="text-[11px] text-[#686864]">
                          Benchmark your current slider assumptions against a regional rollout or
                          saved custom target.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 no-print">
                        <button
                          type="button"
                          onClick={() => setScenarioChoiceB('regional')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-[6px] border cursor-pointer ${
                            scenarioChoiceB === 'regional'
                              ? 'bg-[#171717] text-white border-[#171717]'
                              : 'bg-white text-[#686864] border-[#E6E6E2]'
                          }`}
                        >
                          Regional Expansion
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomScenarioB({
                              id: 'custom',
                              name: 'Saved Custom Snapshot',
                              tamBillion: tamVal,
                              samSharePct: samVal,
                              somSharePct: somVal,
                              targetArpuUsd: 22,
                              breakEvenMonths: 9,
                            });
                            setScenarioChoiceB('custom');
                            showToast('Saved current slider assumptions as Scenario B.');
                          }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-[6px] border cursor-pointer ${
                            scenarioChoiceB === 'custom'
                              ? 'bg-[#FF7417] text-white border-[#FF7417]'
                              : 'bg-white text-[#242424] border-[#E6E6E2] hover:border-[#FF7417]'
                          }`}
                        >
                          Save Current Sliders as Scenario B
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E6E2] space-y-1.5">
                        <div className="font-semibold text-[#242424]">
                          {comparison.scenarioA.name}
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>3-Year SOM Band</span>
                          <strong className="font-mono-num text-[#242424]">
                            {comparison.scenarioA.somBand}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>SOM Midpoint · ARPU</span>
                          <strong className="font-mono-num text-[#242424]">
                            ${comparison.scenarioA.somMidpointMillion}M · $
                            {comparison.scenarioA.targetArpuUsd}/mo
                          </strong>
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>Estimated Break-Even</span>
                          <strong className="font-mono-num text-[#242424]">
                            {comparison.scenarioA.breakEvenMonths} months
                          </strong>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-[10px] bg-white border border-[#FFD3B3] space-y-1.5">
                        <div className="font-semibold text-[#C44D00]">
                          {comparison.scenarioB.name}
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>3-Year SOM Band</span>
                          <strong className="font-mono-num text-[#242424]">
                            {comparison.scenarioB.somBand}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>SOM Midpoint · ARPU</span>
                          <strong className="font-mono-num text-[#C44D00]">
                            ${comparison.scenarioB.somMidpointMillion}M · $
                            {comparison.scenarioB.targetArpuUsd}/mo
                          </strong>
                        </div>
                        <div className="flex justify-between text-[#686864]">
                          <span>Break-Even Delta vs Pilot</span>
                          <strong className="font-mono-num text-[#242424]">
                            {comparison.breakEvenDeltaMonths >= 0
                              ? `+${comparison.breakEvenDeltaMonths}`
                              : comparison.breakEvenDeltaMonths}{' '}
                            mo ({comparison.somUpsideRatio}× SOM)
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </ResearchReportSection>

            <ResearchReportSection
              id="section-04"
              number="04"
              title="Market Demand"
              factType="mixed"
              collapsible
              expanded={Boolean(expandedSections['04'])}
              onToggle={() => toggleReportSection('04')}
            >
              <p className="mb-3">{activeReport.marketDemand.summary}</p>
              <div className="space-y-2">
                {activeReport.marketDemand.signals.map((sig) => (
                  <div
                    key={sig.label}
                    className="p-3 rounded-[8px] bg-[#F5F5F4] flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-[#242424]">{sig.label}</span>
                    <span className="text-[#24724E] font-medium">
                      {sig.trend} · {sig.factType === 'verified' ? 'Verified' : 'Estimate'}
                    </span>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-05"
              number="05"
              title="Customer Segments"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['05'])}
              onToggle={() => toggleReportSection('05')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeReport.customerSegments.map((seg) => (
                  <div key={seg.name} className="p-4 rounded-[10px] border border-[#E6E6E2]">
                    <div className="text-xs font-mono-num text-[#C44D00]">{seg.share}</div>
                    <div className="font-semibold text-[#242424] mt-1">{seg.name}</div>
                    <p className="text-xs text-[#686864] mt-1.5">{seg.need}</p>
                    <div className="text-[11px] text-[#242424] mt-2 pt-2 border-t border-[#E6E6E2]">
                      Urgency: {seg.urgency}
                    </div>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-06"
              number="06"
              title="Customer Pain Points"
              factType="verified"
              collapsible
              expanded={Boolean(expandedSections['06'])}
              onToggle={() => toggleReportSection('06')}
            >
              <div className="space-y-2.5">
                {activeReport.customerPainPoints.map((pp) => (
                  <div
                    key={pp.title}
                    className="p-3.5 rounded-[10px] border border-[#E6E6E2] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[#242424]">{pp.title}</div>
                      <div className="text-xs text-[#686864] mt-0.5">{pp.evidence}</div>
                    </div>
                    <PriorityBadge priority={pp.severity} />
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-07"
              number="07"
              title="Competitor Landscape"
              factType="verified"
              collapsible
              expanded={Boolean(expandedSections['07'])}
              onToggle={() => toggleReportSection('07')}
            >
              <p>{activeReport.competitorLandscapeSummary}</p>
              <button
                type="button"
                onClick={() => navigate('competitive-intelligence')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
              >
                Inspect {state.competitors.length} mapped competitors in Competitive Intelligence →
              </button>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-08"
              number="08"
              title="Pricing Analysis"
              factType="mixed"
              collapsible
              expanded={Boolean(expandedSections['08'])}
              onToggle={() => toggleReportSection('08')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {activeReport.pricingAnalysis.tiers.map((t) => (
                  <div
                    key={t.tier}
                    className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]"
                  >
                    <div className="text-xs text-[#686864]">{t.tier}</div>
                    <div className="font-mono-num font-bold text-[#242424] mt-0.5">{t.range}</div>
                    <div className="text-xs text-[#686864] mt-1">{t.positioning}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#242424] font-medium">
                Recommendation: {activeReport.pricingAnalysis.recommendation}
              </p>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-09"
              number="09"
              title="Market Opportunities"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['09'])}
              onToggle={() => toggleReportSection('09')}
            >
              <ul className="space-y-1.5 text-sm">
                {activeReport.marketOpportunities.map((op) => (
                  <li key={op} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7417] shrink-0 mt-0.5" />
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-10"
              number="10"
              title="Business Model Options"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['10'])}
              onToggle={() => toggleReportSection('10')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeReport.businessModelOptions.map((bm) => (
                  <div key={bm.model} className="p-4 rounded-[10px] border border-[#E6E6E2]">
                    <div className="text-xs font-semibold text-[#C44D00]">{bm.fit}</div>
                    <div className="font-semibold text-[#242424] mt-0.5">{bm.model}</div>
                    <div className="text-xs text-[#686864] mt-2">Pros: {bm.pros}</div>
                    <div className="text-xs text-[#686864] mt-1">Trade-off: {bm.cons}</div>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-11"
              number="11"
              title="Revenue Potential"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['11'])}
              onToggle={() => toggleReportSection('11')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                  <div className="text-xs text-[#686864]">Year 1 Conservative Band</div>
                  <div className="font-mono-num font-bold text-base text-[#242424] mt-1">
                    {activeReport.revenuePotential.year1Conservative}
                  </div>
                </div>
                <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                  <div className="text-xs text-[#686864]">Year 1 Target Band</div>
                  <div className="font-mono-num font-bold text-base text-[#C44D00] mt-1">
                    {activeReport.revenuePotential.year1Target}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#686864] mt-2">
                {activeReport.revenuePotential.unitEconomicsNote}
              </p>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-12"
              number="12"
              title="Startup Cost Estimates"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['12'])}
              onToggle={() => toggleReportSection('12')}
            >
              <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px]">
                {activeReport.startupCostEstimates.map((c) => (
                  <div
                    key={c.category}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#242424]">{c.category}</div>
                      <div className="text-[#686864]">{c.note}</div>
                    </div>
                    <span className="font-mono-num font-semibold text-[#242424]">{c.range}</span>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-13"
              number="13"
              title="Risks & Challenges"
              factType="mixed"
              collapsible
              expanded={Boolean(expandedSections['13'])}
              onToggle={() => toggleReportSection('13')}
            >
              <div className="space-y-2.5">
                {activeReport.risksAndChallenges.map((r) => (
                  <div key={r.risk} className="p-3.5 rounded-[10px] border border-[#E6E6E2]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#242424]">{r.risk}</span>
                      <PriorityBadge priority={r.severity} />
                    </div>
                    <div className="text-xs text-[#686864] mt-1">Mitigation: {r.mitigation}</div>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-14"
              number="14"
              title="Validation Experiments"
              factType="estimate"
              collapsible
              expanded={Boolean(expandedSections['14'])}
              onToggle={() => toggleReportSection('14')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeReport.validationExperiments.map((ex) => (
                  <div
                    key={ex.title}
                    className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]"
                  >
                    <div className="font-semibold text-[#242424] text-sm">{ex.title}</div>
                    <div className="text-xs text-[#C44D00] mt-1">
                      Success threshold: {ex.metric}
                    </div>
                    <div className="text-xs text-[#686864] mt-0.5">Timeframe: {ex.timeframe}</div>
                  </div>
                ))}
              </div>
            </ResearchReportSection>

            <ResearchReportSection
              id="section-15"
              number="15"
              title="Final Recommendation & Source References"
              factType="mixed"
              collapsible
              expanded={Boolean(expandedSections['15'])}
              onToggle={() => toggleReportSection('15')}
            >
              <IntelligenceSurface variant="dark" className="p-4 sm:p-5 mb-4">
                <div className="text-xs text-[#FF8A36] font-semibold inline-flex items-center gap-2">
                  <IntelligenceOrb size="xs" state="active" />
                  <span>Strategic Verdict</span>
                </div>
                <p className="text-sm text-white mt-1.5 leading-relaxed">
                  {activeReport.finalRecommendation.verdict}
                </p>
              </IntelligenceSurface>
              <div className="text-xs text-[#686864] space-y-1">
                <div className="font-semibold text-[#242424]">Cited References</div>
                {activeReport.sources.map((s) => (
                  <div key={s.title}>
                    • {s.title} — {s.publisher} ({s.date}) · {s.reliability}
                  </div>
                ))}
              </div>
            </ResearchReportSection>
          </div>
        </div>

        <JourneyNextStep currentRoute="idea-intelligence" />
      </LiquidSkeletonReveal>
    );
  }

  // Home View
  return (
    <div className="space-y-6">
      <BusinessBrainContextBanner
        departmentLabel="Idea Intelligence"
        contextKey="ideaIntelligence"
      />

      <PageHeader
        mutedPrefix="Idea"
        title="Intelligence"
        subtitle="Discover, research, size, and validate business opportunities before committing capital."
        actions={
          <button
            type="button"
            onClick={() => startGuidedResearch('')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Research My Idea
          </button>
        }
      />

      {/* Compact Quick-Start Research Prompt + Preset Lenses */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startGuidedResearch(quickIdeaInput.trim());
        }}
        className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickIdeaInput}
              onChange={(e) => setQuickIdeaInput(e.target.value)}
              aria-label="Enter a business idea or market to validate"
              placeholder="Enter an idea or industry (e.g. Boutique Pilates Studio in Austin)..."
              className="w-full h-10 pl-10 pr-3.5 text-sm bg-[#FAFAF9] border border-[#E6E6E2] rounded-[10px] text-[#252525] placeholder:text-[#858585] focus:outline-none focus:border-[#FF7417] focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 text-xs sm:text-sm font-semibold text-white bg-[#171717] hover:bg-[#252525] rounded-[10px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Start Workflow
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#858585] mr-1">Or launch preset lens:</span>
          {[
            { label: 'Enter your business idea', preset: '' },
            {
              label: 'Discover adjacent niche',
              preset: 'White-label specialty cold brew subscription for boutique co-working spaces',
            },
            {
              label: 'Research an industry',
              preset: 'Direct-to-consumer functional & specialty coffee landscape in Tier-1 metros',
            },
            {
              label: 'Validate existing funnel',
              preset: 'Solstice $15 3-origin Discovery Flight subscription funnel',
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => startGuidedResearch(item.preset)}
              className="px-2.5 py-1 rounded-[7px] border border-[#E6E6E2] bg-[#FAFAF9] hover:border-[#FF7417] hover:text-[#C44D00] text-[#5C5C58] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </form>

      {/* Previous Research Projects (Hairline Ledger) */}
      <section className="space-y-3">
        <SectionHeader
          title="Previous Research Projects"
          description="Open any dossier to inspect editable market assumptions or export to Business Brain"
        />
        {state.reports.length === 0 ? (
          <GuidedActionEmptyCard
            stepLabel="Step 01 · Idea Validation"
            title="No research dossiers generated yet"
            description="Launch the 7-step guided validation workflow or pick a preset lens above to generate a 15-section market dossier."
            actionLabel="Start Guided Validation"
            onAction={() => startGuidedResearch('')}
          />
        ) : (
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] divide-y divide-[#E6E6E2] overflow-hidden">
            {state.reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAF9]/70 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#686864]">
                    <span>{rep.depth}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{rep.createdAt}</span>
                    <span aria-hidden="true">·</span>
                    <StatusBadge
                      status={rep.viabilitySignal}
                      tone={rep.viabilitySignal === 'Strong Fit' ? 'success' : 'accent'}
                    />
                  </div>
                  <h3 className="font-heading text-base font-bold text-[#242424]">{rep.title}</h3>
                  <p className="text-xs text-[#686864] leading-relaxed line-clamp-1">
                    {rep.executiveSummary}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                  <div className="text-xs text-[#686864]">
                    <span className="block text-[11px] text-[#858585]">TAM Band</span>
                    <strong className="font-mono-num text-[#242424]">
                      {rep.tamSamSom.tamLabel}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportId(rep.id);
                      setView('report');
                    }}
                    className="text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] whitespace-nowrap cursor-pointer"
                  >
                    View 15-Section Report →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <JourneyNextStep currentRoute="idea-intelligence" />
    </div>
  );
};
