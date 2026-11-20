import React, { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, Search, X } from 'lucide-react';
import type { PriorityLevel } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';
import {
  AmbientLight,
  AnimatedMetric,
  BW_EASE,
  FluidProgress,
  FluidTransition,
  FocusGlow,
  InteractiveNode,
  LiquidButton,
  LiquidLoader,
  LiquidSkeletonBlock,
  LiquidSkeletonReveal,
  LiquidSurface,
  MorphingPanel,
  NeuralNetworkAnimation,
  StaggeredLiquidContainer,
  StaggeredLiquidItem,
  SuccessTransition,
} from '../motion/LiquidMotion';
import { Dialog, DialogBody, DialogFooter, DialogHeader, type DialogProps } from './Dialog';
import { useContextualLedger } from './ContextualActionLedger';
import {
  DashboardFeedSkeleton,
  DashboardLedgerSkeleton,
  DashboardPrioritySkeleton,
  DashboardPulseSkeleton,
  DashboardWidgetsSkeleton,
  Skeleton,
  type SkeletonProps,
} from './Skeleton';
import { TopoGridOverlay, type TopoGridOverlayProps } from './TopoGridOverlay';
import {
  EmptyState,
  EmptyStateIllustration,
  EmptyStateText,
  type EmptyStateIllustrationVariant,
  type EmptyStateProps,
  type EmptyStateTextProps,
} from './EmptyState';
import {
  PremiumDashboardSkeleton,
  PremiumSkeleton,
  PremiumSkeletonLine,
  type PremiumSkeletonLineProps,
  type PremiumSkeletonProps,
  type PremiumSkeletonVariant,
  type PremiumSkeletonWaveTone,
} from './PremiumSkeleton';
import {
  GrowthTrendChart,
  TactileBrushSlider,
  TactileCurveModeToggle,
  TactileRangeSelector,
  TrendStickyNoteOverlay,
  createAnnotation,
  filterAnnotationsForPoints,
  findAnnotationForPoint,
  loadPersistedAnnotations,
  removeAnnotation,
  savePersistedAnnotations,
  upsertAnnotation,
  type GrowthCurveMode,
  type GrowthTimeRange,
  type GrowthTrendAnnotation,
  type GrowthTrendChartProps,
  type GrowthTrendMilestone,
  type GrowthTrendMilestonesMap,
  type GrowthTrendPoint,
  type GrowthTrendSeriesMap,
  type TactileBrushSliderProps,
  type TrendStickyNoteOverlayProps,
} from './GrowthTrendChart';

export {
  AmbientLight,
  AnimatedMetric,
  DashboardFeedSkeleton,
  DashboardLedgerSkeleton,
  DashboardPrioritySkeleton,
  DashboardPulseSkeleton,
  DashboardWidgetsSkeleton,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  EmptyState,
  EmptyStateIllustration,
  EmptyStateText,
  FluidProgress,
  FluidTransition,
  FocusGlow,
  GrowthTrendChart,
  InteractiveNode,
  LiquidButton,
  LiquidLoader,
  LiquidSkeletonBlock,
  LiquidSkeletonReveal,
  LiquidSurface,
  MorphingPanel,
  NeuralNetworkAnimation,
  PremiumDashboardSkeleton,
  PremiumSkeleton,
  PremiumSkeletonLine,
  Skeleton,
  StaggeredLiquidContainer,
  StaggeredLiquidItem,
  SuccessTransition,
  TactileBrushSlider,
  TactileCurveModeToggle,
  TactileRangeSelector,
  TopoGridOverlay,
  TrendStickyNoteOverlay,
  createAnnotation,
  filterAnnotationsForPoints,
  findAnnotationForPoint,
  loadPersistedAnnotations,
  removeAnnotation,
  savePersistedAnnotations,
  upsertAnnotation,
};
export type {
  DialogProps,
  EmptyStateIllustrationVariant,
  EmptyStateProps,
  EmptyStateTextProps,
  GrowthCurveMode,
  GrowthTimeRange,
  GrowthTrendAnnotation,
  GrowthTrendChartProps,
  GrowthTrendMilestone,
  GrowthTrendMilestonesMap,
  GrowthTrendPoint,
  GrowthTrendSeriesMap,
  PremiumSkeletonLineProps,
  PremiumSkeletonProps,
  PremiumSkeletonVariant,
  PremiumSkeletonWaveTone,
  SkeletonProps,
  TactileBrushSliderProps,
  TopoGridOverlayProps,
  TrendStickyNoteOverlayProps,
};

export const BrandLogoMark: React.FC<{ size?: number; dark?: boolean }> = ({
  size = 28,
  dark = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="shrink-0"
  >
    <rect width="32" height="32" rx="9" fill={dark ? '#252525' : '#171717'} />
    <path
      d="M8.5 21.5V10.5L13.5 16L16 12.5L18.5 16L23.5 10.5V21.5"
      stroke="#FF7417"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="9" r="1.5" fill="#FFFFFF" />
  </svg>
);

/**
 * Signature Element 1: Intelligence Orb
 * Subtle illuminated radial sphere indicating active AI processing or live strategic synthesis.
 */
export const IntelligenceOrb: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg';
  state?: 'idle' | 'thinking' | 'active';
  className?: string;
}> = ({ size = 'sm', state = 'active', className = '' }) => {
  const dims = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  const haloScale = {
    xs: '-inset-1',
    sm: '-inset-1.5',
    md: '-inset-2',
    lg: '-inset-2.5',
  }[size];

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center shrink-0 ${dims} ${className}`}
    >
      {state !== 'idle' && (
        <span
          className={`absolute ${haloScale} rounded-full bg-[#FF7417]/25 blur-[3px] ${
            state === 'thinking' ? 'bw-orb-halo' : ''
          }`}
        />
      )}
      <span
        className="relative w-full h-full rounded-full block shadow-[0_0_10px_rgba(255,116,23,0.42)]"
        style={{
          background:
            'radial-gradient(circle at 32% 30%, #FFF0E5 0%, #FF9A45 38%, #FF7417 78%, #C44D00 100%)',
        }}
      />
    </span>
  );
};

/**
 * Signature Element 2: Growth Line / FluidChart
 * Animated flowing orange spline curve with soft area gradient and hoverable telemetry nodes.
 */
export interface GrowthLinePoint {
  label: string;
  value: number;
}

export const GrowthLine: React.FC<{
  points: GrowthLinePoint[];
  height?: number;
  dark?: boolean;
  unitPrefix?: string;
  unitSuffix?: string;
  showBaseline?: boolean;
  className?: string;
}> = ({
  points,
  height = 148,
  dark = false,
  unitPrefix = '',
  unitSuffix = '',
  showBaseline = true,
  className = '',
}) => {
  const gradId = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points.length) return null;

  const width = 560;
  const padX = 18;
  const padTop = 22;
  const padBottom = 26;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(1, rawMax - rawMin);
  const minVal = rawMin - span * 0.16;
  const maxVal = rawMax + span * 0.14;

  const coords = points.map((p, idx) => {
    const x = points.length === 1 ? padX + chartW / 2 : padX + (idx / (points.length - 1)) * chartW;
    const norm = (p.value - minVal) / Math.max(1, maxVal - minVal);
    const y = padTop + chartH - norm * chartH;
    return { x, y, ...p };
  });

  const linePath = coords.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = arr[idx - 1];
    const cpX = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(
      1
    )} ${pt.y.toFixed(1)}`;
  }, '');

  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${(padTop + chartH).toFixed(
    1
  )} L ${first.x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

  const activeIdx = hoveredIdx !== null ? hoveredIdx : coords.length - 1;
  const activePt = coords[activeIdx];
  const datasetKey = points.map((p) => `${p.label}:${p.value}`).join('|');

  return (
    <div className={`relative w-full select-none ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Growth performance trend line"
      >
        <defs>
          <linearGradient id={`bw-line-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF9A45" />
            <stop offset="55%" stopColor="#FF7417" />
            <stop offset="100%" stopColor="#FF9A45" />
          </linearGradient>
          <linearGradient id={`bw-area-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF7417" stopOpacity={dark ? '0.26' : '0.16'} />
            <stop offset="100%" stopColor="#FF7417" stopOpacity="0" />
          </linearGradient>
        </defs>

        {showBaseline &&
          [0, 0.5, 1].map((step) => {
            const yPos = padTop + chartH * step;
            return (
              <line
                key={step}
                x1={padX}
                x2={width - padX}
                y1={yPos}
                y2={yPos}
                stroke={dark ? '#2E2E2E' : '#F1F1EF'}
                strokeWidth="1"
                strokeDasharray={step === 1 ? undefined : '3 4'}
              />
            );
          })}

        {activePt && (
          <line
            x1={activePt.x}
            x2={activePt.x}
            y1={padTop}
            y2={padTop + chartH}
            stroke={dark ? 'rgba(255,116,23,0.34)' : 'rgba(255,116,23,0.28)'}
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        )}

        <path d={areaPath} fill={`url(#bw-area-${gradId})`} />

        <motion.path
          key={datasetKey}
          d={linePath}
          fill="none"
          stroke={`url(#bw-line-${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.72, ease: BW_EASE }}
        />

        {coords.map((pt, idx) => {
          const isActive = idx === activeIdx;
          return (
            <g
              key={pt.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

              {isActive && <circle cx={pt.x} cy={pt.y} r="7" fill="#FF7417" fillOpacity="0.22" />}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? '4.2' : '2.6'}
                fill={isActive ? '#FF7417' : dark ? '#171717' : '#FFFFFF'}
                stroke="#FF7417"
                strokeWidth={isActive ? '2' : '1.75'}
              />
              <text
                x={pt.x}
                y={height - 6}
                textAnchor="middle"
                className="text-[10px] font-mono-num"
                fill={isActive ? (dark ? '#FFFFFF' : '#252525') : '#858585'}
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>

      {activePt && (
        <div
          className={`mt-2 flex items-center justify-between text-[11px] font-mono-num px-1 ${
            dark ? 'text-[#B8B8B2]' : 'text-[#5C5C58]'
          }`}
        >
          <span>Selected period: {activePt.label}</span>
          <span className={`font-semibold ${dark ? 'text-[#FF9A45]' : 'text-[#C44D00]'}`}>
            {unitPrefix}
            {activePt.value.toLocaleString()}
            {unitSuffix}
          </span>
        </div>
      )}
    </div>
  );
};

export const FluidChart = GrowthLine;

/**
 * Signature Element 3: Intelligence Surface
 * Translucent architectural container with subtle orange edge illumination.
 */
export const IntelligenceSurface: React.FC<{
  variant?: 'light' | 'dark';
  interactiveGlow?: boolean;
  showGrid?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ variant = 'light', interactiveGlow = true, showGrid = true, className = '', children }) => (
  <LiquidSurface
    variant={variant === 'dark' ? 'dark' : 'intelligence'}
    interactiveGlow={interactiveGlow}
    backgroundLayer={
      showGrid ? (
        <TopoGridOverlay
          tone={variant === 'dark' ? 'dark' : 'light'}
          fade="edges"
          intensity={variant === 'dark' ? 'subtle' : 'whisper'}
        />
      ) : undefined
    }
    className={className}
  >
    {children}
  </LiquidSurface>
);

export const Tooltip: React.FC<{
  content: string;
  side?: 'top' | 'bottom';
  children: React.ReactNode;
}> = ({ content, side = 'top', children }) => (
  <span className="relative inline-flex group/tooltip">
    {children}
    <span
      role="tooltip"
      className={`pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 z-40 px-2.5 py-1 rounded-[8px] bg-[#171717] text-white text-[11px] font-medium whitespace-nowrap shadow-md border border-[#2C2C2C] ${
        side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      }`}
    >
      {content}
    </span>
  </span>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
    size?: 'sm' | 'md';
    loading?: boolean;
    success?: boolean;
  }
> = (props) => <LiquidButton {...props} />;

export const Field: React.FC<{
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-xs font-medium text-[#252525] mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-[#5C5C58] mt-1">{hint}</p>}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...rest
}) => (
  <FocusGlow>
    <input
      className={`w-full h-10 px-3.5 text-sm bg-[#FAFAF9] focus:bg-[#FFFFFF] border border-[#E8E8E4] rounded-[12px] text-[#252525] placeholder:text-[#858585] focus-ring focus:border-[#FF7417] transition-all ${className}`}
      {...rest}
    />
  </FocusGlow>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <FocusGlow>
    <select
      className={`w-full h-10 px-3.5 text-sm bg-[#FAFAF9] focus:bg-[#FFFFFF] border border-[#E8E8E4] rounded-[12px] text-[#252525] focus-ring focus:border-[#FF7417] transition-all ${className}`}
      {...rest}
    >
      {children}
    </select>
  </FocusGlow>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...rest
}) => (
  <FocusGlow>
    <textarea
      className={`w-full p-3.5 text-sm bg-[#FAFAF9] focus:bg-[#FFFFFF] border border-[#E8E8E4] rounded-[12px] text-[#252525] placeholder:text-[#858585] focus-ring focus:border-[#FF7417] transition-all ${className}`}
      {...rest}
    />
  </FocusGlow>
);

export const DarkSurfacePanel: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <LiquidSurface variant="dark" interactiveGlow className={className}>
    {children}
  </LiquidSurface>
);

export const PageHeader: React.FC<{
  title: React.ReactNode;
  mutedPrefix?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}> = ({ title, mutedPrefix, subtitle, actions, meta }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-7 border-b border-[#EFEFEB]">
    <div className="space-y-2 max-w-2xl">
      {meta && <div className={`${typeClass.overline} text-[#858585]`}>{meta}</div>}
      <h1 className={`${typeClass.h1} text-[#171717]`}>
        {mutedPrefix && <span className="font-normal text-[#858585] mr-2">{mutedPrefix}</span>}
        <span>{title}</span>
      </h1>
      {subtitle && <p className={`${typeClass.body} text-[#5C5C58]`}>{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export const SectionHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className={`${typeClass.h4} text-[#171717]`}>{title}</h2>
      {description && <p className={`${typeClass.bodySm} text-[#5C5C58] mt-0.5`}>{description}</p>}
    </div>
    {action && <div className="shrink-0 mt-2 sm:mt-0">{action}</div>}
  </div>
);

export const MetricCard: React.FC<{
  id?: string;
  label: string;
  value: string | number;
  detail?: string;
  delta?: string;
  deltaTone?: 'positive' | 'neutral' | 'warning';
  accent?: boolean;
  dark?: boolean;
  category?: string;
  route?: string;
  onClick?: () => void;
}> = ({
  id,
  label,
  value,
  detail,
  delta,
  deltaTone = 'neutral',
  accent = false,
  dark = false,
  category,
  route,
  onClick,
}) => {
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
        id: id || `metric-${label.toLowerCase().replace(/\s+/g, '-')}`,
        title: label,
        subtitle: detail ? `${detail} · ${value}` : String(value),
        category: category || 'Performance Metric',
        route,
        data: { label, value, detail, delta },
      });
    }
  };

  const isPureNumber = typeof value === 'number';
  const content = (
    <div
      onContextMenu={handleContextMenu}
      className={`bw-trace-card ${dark ? 'bw-trace-dark' : ''} ${onClick ? 'cursor-pointer' : ''} h-full flex flex-col justify-between rounded-[20px] p-5 sm:p-6 border transition-all duration-200 text-left w-full ${
        dark
          ? 'bg-[#171717] border-[#262626] text-white'
          : 'bg-[#FFFFFF] border-[#ECECE8] text-[#252525] bw-surface-raised'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`${typeClass.bodySm} font-medium ${dark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'}`}
          >
            {label}
          </span>
          {delta && (
            <span
              className={`${typeClass.overline} normal-case tracking-normal ${
                deltaTone === 'positive'
                  ? 'text-[#24724E]'
                  : deltaTone === 'warning'
                    ? 'text-[#A85E16]'
                    : dark
                      ? 'text-[#A8A8A2]'
                      : 'text-[#5C5C58]'
              }`}
            >
              {delta}
            </span>
          )}
        </div>
        <div
          className={`mt-2 ${
            typeof value === 'string' && value.length > 10 ? typeClass.metricSm : typeClass.metric
          } truncate ${
            accent
              ? dark
                ? 'text-[#FF9A45]'
                : 'text-[#C44D00]'
              : dark
                ? 'text-white'
                : 'text-[#171717]'
          }`}
        >
          {isPureNumber ? <AnimatedMetric value={value} /> : value}
        </div>
      </div>
      {detail && (
        <p className={`mt-1.5 ${typeClass.bodySm} ${dark ? 'text-[#858585]' : 'text-[#5C5C58]'}`}>
          {detail}
        </p>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="h-full w-full flex flex-col text-left rounded-[20px] focus-ring cursor-pointer"
      >
        {content}
      </button>
    );
  }
  return content;
};

export const StatusBadge: React.FC<{
  status: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'accent';
}> = ({ status, tone = 'neutral' }) => {
  const styles: Record<string, { text: string; dot: string }> = {
    neutral: { text: 'text-[#5C5C58]', dot: 'bg-[#858585]' },
    success: { text: 'text-[#24724E]', dot: 'bg-[#24724E]' },
    warning: { text: 'text-[#A85E16]', dot: 'bg-[#A85E16]' },
    error: { text: 'text-[#BC3E3E]', dot: 'bg-[#BC3E3E]' },
    accent: { text: 'text-[#C44D00]', dot: 'bg-[#FF7417]' },
  };
  const s = styles[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${s.text}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      <span>{status}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  const config: Record<PriorityLevel, { label: string; text: string; dot: string }> = {
    high: { label: 'High Priority', text: 'text-[#C44D00]', dot: 'bg-[#FF7417]' },
    medium: { label: 'Medium Priority', text: 'text-[#A85E16]', dot: 'bg-[#D97706]' },
    low: { label: 'Low Priority', text: 'text-[#5C5C58]', dot: 'bg-[#858585]' },
  };
  const c = config[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${c.text}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
  activeShimmer?: boolean;
  tone?: 'accent' | 'neutral';
}> = ({
  value,
  label,
  showPercent = true,
  size = 'md',
  activeShimmer = false,
  tone = 'neutral',
}) => (
  <FluidProgress
    value={value}
    label={label}
    showPercent={showPercent}
    size={size}
    activeShimmer={activeShimmer}
    tone={tone}
  />
);

export const Tabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => {
  const layoutGroupId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="tablist"
      className="flex items-center gap-2 overflow-x-auto border-b border-[#EFEFEB] pb-px"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative px-3 py-3 text-sm font-medium rounded-[8px] whitespace-nowrap shrink-0 transition-colors focus-ring cursor-pointer ${
              active ? 'text-[#171717]' : 'text-[#858585] hover:text-[#171717]'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`ml-1.5 text-xs tabular-nums font-mono-num ${
                  active ? 'text-[#171717] font-semibold' : 'text-[#A8A8A2]'
                }`}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={reduced ? undefined : `bw-tab-underline-${layoutGroupId}`}
                transition={{ duration: 0.22, ease: BW_EASE }}
                className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#171717] rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <FocusGlow className={`relative rounded-full ${className}`}>
    <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-9 pl-10 pr-8 text-sm bg-[#FFFFFF] border border-[#E8E8E4] rounded-full text-[#252525] placeholder:text-[#858585] focus-ring focus:border-[#FF7417] transition-colors"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[#858585] hover:text-[#252525] focus-ring cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </FocusGlow>
);

export const FilterBar: React.FC<{
  options: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
}> = ({ options, activeId, onChange }) => {
  const layoutGroupId = useId();
  const reduced = useReducedMotion();

  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F1F1EF] border border-[#EAEAE5] rounded-full bw-surface-inset">
      {options.map((opt) => {
        const active = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 focus-ring cursor-pointer ${
              active ? 'text-[#171717]' : 'text-[#686864] hover:text-[#171717]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : `bw-filter-bg-${layoutGroupId}`}
                transition={{ duration: 0.2, ease: BW_EASE }}
                className="absolute inset-0 bg-[#FFFFFF] border border-[#ECECE8]/80 rounded-full bw-ceramic-control"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const LoadingState: React.FC<{ label?: string; rows?: number }> = ({
  label = 'Loading intelligence workspace...',
  rows = 4,
}) => (
  <div
    role="status"
    aria-live="polite"
    className="rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-6 sm:p-7 space-y-5 bw-surface-raised"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-xs font-medium text-[#5C5C58]">
        <span
          className="relative inline-flex w-2.5 h-2.5 items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="absolute inset-0 rounded-full bg-[#FF7417]/35 bw-orb-halo" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-[#FF7417]" />
        </span>
        <span>{label}</span>
      </div>
      <Skeleton variant="accent" shape="pill" className="h-4 w-20" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-[14px] border border-[#F1F1EF] bg-[#FAFAF9]/75 p-3.5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton
              variant={idx === 0 ? 'accent' : 'default'}
              shape="circle"
              className="w-7 h-7 shrink-0"
            />
            <div className="space-y-1.5 flex-1">
              <Skeleton shape="pill" className="h-3" width={`${Math.max(46, 84 - idx * 10)}%`} />
              <Skeleton shape="pill" className="h-2.5" width={`${Math.max(30, 56 - idx * 6)}%`} />
            </div>
          </div>
          <Skeleton shape="pill" className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({
  title = 'Unable to load demonstration view',
  description = 'A simulated state interruption occurred. Retry to restore the workspace.',
  onRetry,
}) => (
  <div className="rounded-[20px] border border-[#F5CECE] bg-[#FDF0F0] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-[#BC3E3E] shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold text-[#252525]">{title}</h3>
        <p className="text-xs text-[#5C5C58] mt-0.5">{description}</p>
      </div>
    </div>
    {onRetry && (
      <LiquidButton variant="secondary" size="sm" onClick={onRetry}>
        Restore View
      </LiquidButton>
    )}
  </div>
);

export const Timeline: React.FC<{
  items: { id: string; date: string; title: string; subtitle?: string; active?: boolean }[];
}> = ({ items }) => (
  <div className="space-y-5">
    {items.map((item, idx) => (
      <div key={item.id} className="relative pl-6">
        {idx < items.length - 1 && (
          <span
            aria-hidden="true"
            className="absolute left-[7px] top-4 bottom-[-20px] w-px bg-[#EFEFEB]"
          />
        )}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
            item.active
              ? 'bg-[#FF7417] border-[#FFF0E5] shadow-[0_0_8px_rgba(255,116,23,0.4)]'
              : 'bg-[#FFFFFF] border-[#D6D6D0]'
          }`}
        />
        <div className="text-[11px] font-mono-num text-[#858585]">{item.date}</div>
        <div className="text-sm font-medium text-[#252525] mt-0.5">{item.title}</div>
        {item.subtitle && <div className="text-xs text-[#5C5C58] mt-0.5">{item.subtitle}</div>}
      </div>
    ))}
  </div>
);

export const ChartContainer: React.FC<{
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  dark?: boolean;
  showGrid?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, rightSlot, dark = false, showGrid = true, className = '', children }) => (
  <LiquidSurface
    variant={dark ? 'dark' : 'white'}
    interactiveGlow
    backgroundLayer={
      showGrid ? (
        <TopoGridOverlay
          tone={dark ? 'dark' : 'light'}
          fade="edges"
          density="compact"
          intensity={dark ? 'crisp' : 'subtle'}
        />
      ) : undefined
    }
    className={`p-6 sm:p-7 ${className}`}
  >
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
      <div>
        <h3 className={`${typeClass.h4} ${dark ? 'text-white' : 'text-[#171717]'}`}>{title}</h3>
        {subtitle && (
          <p className={`${typeClass.bodySm} mt-1 ${dark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
    {children}
  </LiquidSurface>
);
