import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { calculateBrainCompleteness, getNextJourneyStep } from '../../utils/logic';
import type {
  AppRoute,
  BrandAsset,
  CompetitorProfileData,
  GrowthTask,
} from '../../types/brainwise';
import {
  EmptyStateIllustration,
  IntelligenceOrb,
  IntelligenceSurface,
  PriorityBadge,
  StatusBadge,
  TopoGridOverlay,
  type EmptyStateIllustrationVariant,
} from './DesignSystem';
import { typeClass } from '../../theme/typography';
import { useContextualLedger } from './ContextualActionLedger';

export const BusinessBrainContextBanner: React.FC<{
  departmentLabel: string;
  contextKey?: 'ideaIntelligence' | 'competitiveIntelligence' | 'brandStudio' | 'growthDirector';
}> = ({ departmentLabel, contextKey }) => {
  const { state, navigate } = useBrainWise();
  const [expanded, setExpanded] = useState(false);
  const comp = calculateBrainCompleteness(state.brain);
  const sharingEnabled = contextKey ? (state.contextSharing?.[contextKey] ?? true) : true;

  if (!sharingEnabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs border-b border-[#EFEFEB]">
        <div className="flex items-center gap-2 text-[#A85E16] min-w-0">
          <Brain className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            <strong className="font-semibold text-[#171717]">{departmentLabel}</strong> context
            syncing paused for {state.brain.businessName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('settings', { settingsTab: 'ai-preferences' })}
          className="text-xs font-medium text-[#171717] hover:text-[#C44D00] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Resume sync →
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-[#EFEFEB] pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-2 text-[#858585] hover:text-[#171717] min-w-0 transition-colors cursor-pointer"
        >
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#24724E] shrink-0" />
          <span className="truncate">
            Brain Memory ·{' '}
            <strong className="font-medium text-[#171717]">{state.brain.businessName}</strong>
            <span className="mx-1.5 text-[#D6D6D0]" aria-hidden="true">
              /
            </span>
            <span className="font-mono-num text-[#5C5C58]">{comp.percentage}% synced</span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#858585] shrink-0 transition-transform duration-150 ${
              expanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => navigate('business-brain')}
          className="text-xs font-medium text-[#858585] hover:text-[#171717] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
        >
          Edit shared memory →
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#F1F1EF] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className={`${typeClass.overline} text-[#858585]`}>Active Context</div>
            <p className="mt-1 text-[#252525] leading-relaxed line-clamp-2">
              {state.brain.overviewSummary}
            </p>
          </div>
          <div>
            <div className={`${typeClass.overline} text-[#858585]`}>Linked Signals</div>
            <div className="mt-1 font-mono-num text-[#171717]">
              {state.brain.primaryGoals.length} goals · {state.competitors.length} rivals ·{' '}
              {state.reports.length} dossiers
            </div>
          </div>
          <div className="sm:text-right">
            <div className={`${typeClass.overline} text-[#858585]`}>Scope</div>
            <div className="mt-1 text-[#5C5C58]">
              Auto-injected into{' '}
              <strong className="font-medium text-[#171717]">{departmentLabel}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const JourneyNextStep: React.FC<{ currentRoute: AppRoute }> = ({ currentRoute }) => {
  const { state, navigate } = useBrainWise();
  const next = getNextJourneyStep(currentRoute);
  if (!next) return null;

  const comp = calculateBrainCompleteness(state.brain);
  if (comp.percentage < 100) {
    return (
      <IntelligenceSurface
        variant="dark"
        className="mt-10 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1.5 max-w-xl">
          <div className={`inline-flex items-center gap-2 ${typeClass.overline} text-[#FF8A36]`}>
            <IntelligenceOrb size="xs" state="active" />
            <span>{next.label}</span>
          </div>
          <p className={`${typeClass.body} text-[#E6E6E2]`}>{next.description}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(next.nextRoute)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#FF7417] hover:bg-[#E55F08] text-white rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{next.cta}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </IntelligenceSurface>
    );
  }

  return (
    <div className="mt-10 pt-6 border-t border-[#EFEFEB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className={`${typeClass.bodySm} text-[#5C5C58] min-w-0`}>
        <span className="font-semibold text-[#C44D00] mr-2">{next.label}</span>
        <span>{next.description}</span>
      </div>
      <button
        type="button"
        onClick={() => navigate(next.nextRoute)}
        className={`inline-flex items-center gap-1.5 ${typeClass.bodySm} font-semibold text-[#252525] hover:text-[#C44D00] whitespace-nowrap shrink-0 cursor-pointer transition-colors self-start sm:self-auto`}
      >
        <span>{next.cta}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const TaskCard: React.FC<{
  task: GrowthTask;
  onToggleComplete: (id: string) => void;
  onSkip?: (id: string) => void;
  onInspect?: (task: GrowthTask) => void;
  flat?: boolean;
}> = ({ task, onToggleComplete, onSkip, onInspect, flat = false }) => {
  const isDone = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  let openLedger: ReturnType<typeof useContextualLedger>['openLedger'] | undefined;
  try {
    const ctx = useContextualLedger();
    openLedger = ctx.openLedger;
  } catch {
    // optional outside provider
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (openLedger) {
      e.preventDefault();
      e.stopPropagation();
      openLedger(e, {
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `${task.department} · ${task.estimatedMinutes}m · Due ${task.dueDate}`,
        category: 'Sprint Task',
        route: 'growth-director',
        data: task,
      });
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`bw-trace-card group/task transition-all duration-200 ${
        flat
          ? 'px-3 -mx-3 py-4 rounded-[14px] hover:bg-[#FFFFFF]/90 cursor-pointer'
          : isDone
            ? 'rounded-[18px] border p-5 bg-[#FAFAF9] border-[#EFEFEB]'
            : 'rounded-[18px] border p-5 bg-[#FFFFFF] border-[#ECECE8] bw-surface-raised cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-label={isDone ? `Mark "${task.title}" pending` : `Mark "${task.title}" complete`}
          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            isDone
              ? 'bg-[#24724E] border-[#24724E] text-white'
              : 'bg-white border-[#CFCFC7] hover:border-[#FF7417]'
          }`}
        >
          {isDone && <Check className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`${typeClass.body} font-medium ${
                isDone || isSkipped ? 'line-through text-[#858585]' : 'text-[#171717]'
              }`}
            >
              {task.title}
            </h3>
            <PriorityBadge priority={task.priority} />
          </div>
          {!flat && (
            <p className={`${typeClass.bodySm} text-[#5C5C58] mt-1`}>{task.whyItMatters}</p>
          )}
          <div
            className={`mt-1.5 flex flex-wrap items-center justify-between gap-2 ${typeClass.bodySm} text-[#5C5C58]`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#5C5C58]">{task.department}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Due {task.dueDate}</span>
            </div>
            <div
              className={`flex items-center gap-3 ${
                flat
                  ? 'sm:opacity-0 sm:group-hover/task:opacity-100 sm:focus-within:opacity-100 transition-opacity'
                  : ''
              }`}
            >
              {onSkip && !isDone && !isSkipped && (
                <button
                  type="button"
                  onClick={() => onSkip(task.id)}
                  className="text-xs text-[#858585] hover:text-[#252525] cursor-pointer"
                >
                  Skip
                </button>
              )}
              {onInspect && (
                <button
                  type="button"
                  onClick={() => onInspect(task)}
                  className="text-xs font-medium text-[#C44D00] hover:text-[#FF7417] cursor-pointer"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CompetitorCard: React.FC<{
  competitor: CompetitorProfileData;
  selected?: boolean;
  onSelect: (id: string) => void;
}> = ({ competitor, selected = false, onSelect }) => {
  let openLedger: ReturnType<typeof useContextualLedger>['openLedger'] | undefined;
  try {
    const ctx = useContextualLedger();
    openLedger = ctx.openLedger;
  } catch {
    // optional outside provider
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (openLedger) {
      e.preventDefault();
      e.stopPropagation();
      openLedger(e, {
        id: `competitor-${competitor.id}`,
        title: competitor.name,
        subtitle: `${competitor.category} · ${competitor.positioning}`,
        category: 'Competitor Profile',
        route: 'competitive-intelligence',
        data: competitor,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(competitor.id)}
      onContextMenu={handleContextMenu}
      className={`bw-trace-card w-full text-left rounded-[18px] border p-5 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-[#171717] bg-[#FFFFFF] bw-ceramic-control'
          : 'border-[#EFEFEB] bg-[#FFFFFF]/70 hover:bg-[#FFFFFF]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`${typeClass.body} font-semibold text-[#171717]`}>{competitor.name}</div>
          <div className={`${typeClass.bodySm} text-[#5C5C58] mt-0.5`}>{competitor.category}</div>
        </div>
        <StatusBadge
          status={competitor.monitoringEnabled ? 'Monitoring' : 'Analyzed'}
          tone={competitor.monitoringEnabled ? 'accent' : 'neutral'}
        />
      </div>
      <p className={`${typeClass.bodySm} text-[#5C5C58] mt-2.5 line-clamp-2`}>
        {competitor.positioning}
      </p>
      <div className="mt-3 pt-2.5 border-t border-[#E6E6E2] flex items-center justify-between text-[11px] text-[#5C5C58]">
        <span className="tabular-nums">{competitor.priceRange}</span>
        <span className="inline-flex items-center gap-1 text-[#252525] font-medium">
          Inspect <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
};

export const ResearchReportSection: React.FC<{
  id?: string;
  number: string;
  title: string;
  factType?: 'verified' | 'estimate' | 'mixed';
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}> = ({
  id,
  number,
  title,
  factType,
  collapsible = false,
  expanded = true,
  onToggle,
  children,
}) => {
  const factLabel =
    factType === 'verified'
      ? 'Verified Market Reference'
      : factType === 'estimate'
        ? 'Modelled Estimate'
        : 'Verified Data + Estimates';

  return (
    <section id={id} className="py-5 border-b border-[#E6E6E2] last:border-b-0 scroll-mt-20">
      {collapsible && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="w-full flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer group"
        >
          <h3
            className={`${typeClass.h4} text-[#171717] group-hover:text-[#C44D00] transition-colors`}
          >
            <span className={`${typeClass.monoMeta} text-[#858585] mr-2`}>{number}.</span>
            {title}
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            {factType && (
              <span className={`${typeClass.overline} normal-case tracking-normal text-[#858585]`}>
                {factLabel}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#858585] transition-transform duration-150 ${
                expanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className={`${typeClass.h4} text-[#171717]`}>
            {number}. {title}
          </h3>
          {factType && (
            <span className={`${typeClass.overline} normal-case tracking-normal text-[#5C5C58]`}>
              {factLabel}
            </span>
          )}
        </div>
      )}
      {(!collapsible || expanded) && (
        <div className={`${typeClass.bodySm} text-[#252525] ${collapsible ? 'mt-3.5' : ''}`}>
          {children}
        </div>
      )}
    </section>
  );
};

export const AssetCard: React.FC<{
  asset: BrandAsset;
  onPreview: (asset: BrandAsset) => void;
}> = ({ asset, onPreview }) => {
  let openLedger: ReturnType<typeof useContextualLedger>['openLedger'] | undefined;
  try {
    const ctx = useContextualLedger();
    openLedger = ctx.openLedger;
  } catch {
    // optional outside provider
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (openLedger) {
      e.preventDefault();
      e.stopPropagation();
      openLedger(e, {
        id: `asset-${asset.id}`,
        title: asset.title,
        subtitle: `${asset.folder} · ${asset.category}`,
        category: 'Brand Asset',
        route: 'asset-library',
        data: asset,
      });
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="bw-trace-card rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] overflow-hidden flex flex-col bw-surface-raised transition-all duration-200"
    >
      <button
        type="button"
        onClick={() => onPreview(asset)}
        aria-label={`Preview ${asset.title}`}
        className={`w-full text-left h-36 p-5 flex flex-col justify-between border-b border-[#EFEFEB] cursor-pointer focus-ring-inset ${
          asset.darkVariant ? 'bg-[#171717] text-white' : 'bg-[#FAFAF9] text-[#252525]'
        }`}
      >
        <div className="w-full flex items-center justify-between text-[10px] font-mono-num opacity-75">
          <span>{asset.category.toUpperCase()}</span>
          <span>
            {asset.slides && asset.slides.length > 1
              ? `${asset.slides.length} SLIDES`
              : asset.format.split('·')[0]}
          </span>
        </div>
        <div className="w-full flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-heading font-bold text-sm leading-snug line-clamp-2">
              {asset.headlineText}
            </div>
            <div
              className="w-8 h-0.5 mt-2 rounded-full"
              style={{ backgroundColor: asset.accentHex }}
            />
          </div>
          {asset.svgMarkup && asset.svgMarkup.includes('<svg') && (
            <div
              className="w-12 h-8 shrink-0 opacity-85 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: asset.svgMarkup }}
            />
          )}
        </div>
      </button>
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#252525] truncate">{asset.title}</div>
          <div className="text-xs text-[#5C5C58] mt-0.5">
            {asset.folder} · {asset.createdAt}
            {asset.aiGenerated ? ' · AI' : ''}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[#E6E6E2]">
          <StatusBadge
            status={asset.status}
            tone={
              asset.status === 'Approved'
                ? 'success'
                : asset.status === 'Draft'
                  ? 'warning'
                  : 'neutral'
            }
          />
          <button
            type="button"
            onClick={() => onPreview(asset)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#252525] hover:text-[#C44D00] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export const DepartmentQuickLink: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="bw-trace-card w-full text-left p-4 rounded-[16px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised hover:bg-[#FAFAF9] transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-[#FAFAF9] border border-[#EFEFEB] text-[#C44D00] flex items-center justify-center shrink-0">
        {icon ?? <Sparkles className="w-4 h-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#171717] truncate">{title}</div>
        <div className="text-xs text-[#5C5C58] truncate">{subtitle}</div>
      </div>
    </div>
    <ArrowRight className="w-4 h-4 text-[#858585] shrink-0" />
  </button>
);

export const ReportIconBadge: React.FC = () => <FileText className="w-4 h-4 text-[#FF7417]" />;

export const BrainLineagePopover: React.FC<{
  sourceDepartment: string;
  insight: string;
  targetRoute: AppRoute;
  editLabel?: string;
  darkSurface?: boolean;
  align?: 'left' | 'right';
}> = ({
  sourceDepartment,
  insight,
  targetRoute,
  editLabel,
  darkSurface = false,
  align = 'right',
}) => {
  const { navigate } = useBrainWise();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center no-print">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
          darkSurface ? 'text-[#A8A8A2] hover:text-white' : 'text-[#858585] hover:text-[#171717]'
        }`}
      >
        <Brain className="w-3 h-3 shrink-0" />
        <span>Sourced from Brain</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Business Brain provenance"
          className={`absolute top-full mt-2 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] text-[#252525] p-4 shadow-xl text-left ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C44D00]">
            Derived from {sourceDepartment}
          </div>
          <p className="mt-1.5 text-xs text-[#252525] leading-relaxed">{insight}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(targetRoute);
            }}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C44D00] hover:text-[#FF7417] cursor-pointer"
          >
            <span>{editLabel ?? `Edit assumption in ${sourceDepartment}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const GuidedActionEmptyCard: React.FC<{
  stepLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  illustration?: EmptyStateIllustrationVariant;
}> = ({
  stepLabel,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  illustration,
}) => (
  <div className="bw-trace-card relative overflow-hidden rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all duration-200">
    <TopoGridOverlay tone="light" fade="edges" density="compact" intensity="subtle" />
    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
      {illustration && (
        <EmptyStateIllustration
          variant={illustration}
          tone="light"
          className="w-[108px] h-[64px]"
        />
      )}
      <div className="space-y-1.5 max-w-xl">
        <div className={`inline-flex items-center gap-2 ${typeClass.overline} text-[#73736D]`}>
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#FF7417] shrink-0" />
          <span>{stepLabel}</span>
        </div>
        <h3 className={`${typeClass.h4} text-[#171717]`}>{title}</h3>
        <p className={`${typeClass.bodySm} text-[#5C5C58]`}>{description}</p>
      </div>
    </div>
    <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
      {secondaryLabel && onSecondaryAction && (
        <button
          type="button"
          onClick={onSecondaryAction}
          className="px-4 py-2 text-xs font-medium text-[#252525] bg-[#FFFFFF] hover:bg-[#FAFAF9] border border-[#E8E8E4] hover:border-[#D6D6D0] bw-ceramic-control rounded-full focus-ring cursor-pointer transition-colors"
        >
          {secondaryLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#171717] hover:bg-[#2A2A28] rounded-full focus-ring cursor-pointer transition-colors"
      >
        <span>{actionLabel}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
