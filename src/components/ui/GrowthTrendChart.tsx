import React, { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { typeClass } from '../../theme/typography';
import { BW_EASE } from '../motion/LiquidMotion';
import {
  GROWTH_CURVE_MODE_OPTIONS,
  GROWTH_TIME_RANGE_OPTIONS,
  type GrowthCurveMode,
  type GrowthTimeRange,
  type GrowthTrendMilestone,
  type GrowthTrendMilestonesMap,
  type GrowthTrendPoint,
  type GrowthTrendSeriesMap,
  type ResolvedGrowthMilestone,
  buildEditorialTickValues,
  computeGrowthTrendSummary,
  findMilestoneForPoint,
  formatGrowthMetricValue,
  formatSignedDeltaPercent,
  resolveChartMilestones,
  resolveCurveModeConfig,
  resolveTimeRangePoints,
} from './growthTrendUtils';

export type {
  GrowthCurveMode,
  GrowthTimeRange,
  GrowthTrendMilestone,
  GrowthTrendMilestonesMap,
  GrowthTrendPoint,
  GrowthTrendSeriesMap,
  ResolvedGrowthMilestone,
};
export { findMilestoneForPoint };

export interface GrowthTrendChartProps {
  /** Base point series (used for the active range or as anchor when rangeSeries is omitted). */
  points?: GrowthTrendPoint[];
  /** Optional curated per-range datasets (`7d`, `30d`, `90d`, `ytd`). */
  rangeSeries?: GrowthTrendSeriesMap;
  /** Optional major milestone event markers applied across ranges (matched by `xLabel`). */
  milestones?: GrowthTrendMilestone[];
  /** Optional per-range milestone event markers (`7d`, `30d`, `90d`, `ytd`). */
  rangeMilestones?: GrowthTrendMilestonesMap;
  /** Toggle rendering of dashed vertical milestone indicator lines & `.bw-type-mono-meta` labels (default true). */
  showMilestones?: boolean;
  /** Toggle interactive annotation markers on significant data points (defaults to true). */
  showAnnotations?: boolean;
  /** Callback fired when an annotation marker is hovered or unhovered. */
  onAnnotationHover?: (milestone: ResolvedGrowthMilestone | null) => void;
  /** Callback fired when an annotation marker is clicked/selected. */
  onAnnotationClick?: (milestone: ResolvedGrowthMilestone) => void;
  /** Controlled active/selected milestone X label. */
  activeMilestoneX?: string | null;
  /** Controlled time range selection. */
  range?: GrowthTimeRange;
  /** Uncontrolled initial time range (default `'30d'`). */
  defaultRange?: GrowthTimeRange;
  /** Callback fired whenever a Tactile Pill time-range button is selected. */
  onRangeChange?: (range: GrowthTimeRange) => void;
  /** Shows the 7d / 30d / 90d / YTD Tactile Pill selector row (defaults to true). */
  showRangeSelector?: boolean;
  /** Controlled curve rendering mode (`'smooth'` spline interpolation vs `'raw'` linear points). */
  curveMode?: GrowthCurveMode;
  /** Uncontrolled initial curve mode (default `'smooth'`). */
  defaultCurveMode?: GrowthCurveMode;
  /** Callback fired whenever the user toggles between smooth spline and raw data points. */
  onCurveModeChange?: (mode: GrowthCurveMode) => void;
  /** Shows the Spline / Raw tactile toggle alongside the chart controls (default true). */
  showCurveToggle?: boolean;
  /** Optional quiet overline label beside the range selector (shown when curve toggle is hidden). */
  rangeLabel?: string;
  /** Chart viewport height in pixels (default 180). */
  height?: number;
  /** Dark obsidian variant for Performance & Execution Pulse surfaces. */
  dark?: boolean;
  /** Value formatting prefix (e.g. "$", "+"). */
  unitPrefix?: string;
  /** Value formatting suffix (e.g. "%", " subs"). */
  unitSuffix?: string;
  /** Semantic series label shown in tooltip and summary footer. */
  metricLabel?: string;
  /** Optional label for the dashed comparison baseline series when `point.baseline` is present. */
  baselineLabel?: string;
  /** Show minimal 3-tick Y-axis labels (defaults to false for ultra-clean compact panels). */
  showYAxis?: boolean;
  /** Show subtle horizontal editorial hairlines (never vertical grid clutter). */
  showHairlines?: boolean;
  /** Show bottom period & trajectory readout bar. */
  showFooter?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface CustomTooltipPayloadItem {
  dataKey?: string;
  value?: number;
  payload?: GrowthTrendPoint;
}

interface EditorialTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  dark: boolean;
  unitPrefix: string;
  unitSuffix: string;
  metricLabel: string;
  baselineLabel: string;
  milestonesByX: Map<string, ResolvedGrowthMilestone>;
}

const EditorialChartTooltip: React.FC<EditorialTooltipProps> = ({
  active,
  payload,
  label,
  dark,
  unitPrefix,
  unitSuffix,
  metricLabel,
  baselineLabel,
  milestonesByX,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const primary = payload.find((item) => item.dataKey === 'value') ?? payload[0];
  const baseline = payload.find((item) => item.dataKey === 'baseline');
  const point = primary?.payload;
  const milestone = label ? milestonesByX.get(label) : undefined;

  if (typeof primary?.value !== 'number') return null;

  return (
    <div
      className={`rounded-[14px] border px-3.5 py-2.5 min-w-[152px] transition-opacity ${
        dark
          ? 'bg-[#1D1D1B]/95 border-[#343430] text-white shadow-[0_14px_32px_-12px_rgba(0,0,0,0.65)]'
          : 'bg-[#FFFFFF]/96 border-[#E6E6E2] text-[#171717] bw-surface-elevated'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`${typeClass.overline} ${dark ? 'text-[#A8A8A2]' : 'text-[#858585]'}`}>
          {label}
        </div>
        {milestone && (
          <span
            className={`${typeClass.monoMeta} ${
              milestone.tone === 'accent'
                ? dark
                  ? 'text-[#FF9A45]'
                  : 'text-[#C44D00]'
                : dark
                  ? 'text-[#D6D6D0]'
                  : 'text-[#5C5C58]'
            }`}
          >
            {milestone.label}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-4">
        <span className={`text-[11px] ${dark ? 'text-[#B8B8B2]' : 'text-[#5C5C58]'}`}>
          {metricLabel}
        </span>
        <span
          className="font-mono-num text-sm font-semibold tabular-nums"
          style={{ color: dark ? '#FF9A45' : 'var(--bw-orange)' }}
        >
          {formatGrowthMetricValue(primary.value, unitPrefix, unitSuffix)}
        </span>
      </div>

      {typeof baseline?.value === 'number' && (
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <span className="text-[11px] text-[#858585]">{baselineLabel}</span>
          <span
            className={`font-mono-num text-xs tabular-nums ${
              dark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'
            }`}
          >
            {formatGrowthMetricValue(baseline.value, unitPrefix, unitSuffix)}
          </span>
        </div>
      )}

      {milestone ? (
        <div
          data-milestone-tooltip-card="true"
          className={`mt-2.5 rounded-[10px] border p-2.5 transition-all ${
            dark
              ? 'bg-white/[0.05] border-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'bg-[#F9F9F7] border-[#ECECE8] text-[#171717] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--bw-orange)' }}
              />
              <span
                className={`${typeClass.overline} tracking-wider text-[9.5px] truncate ${
                  dark ? 'text-[#FF9A45]' : 'text-[#C44D00]'
                }`}
              >
                Milestone Event
              </span>
            </div>
            {milestone.impact && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono-num font-semibold shrink-0 border ${
                  dark
                    ? 'bg-[#FF9A45]/15 border-[#FF9A45]/30 text-[#FF9A45]'
                    : 'bg-[#FFF3EB] border-[#FFD2B3] text-[#C44D00]'
                }`}
              >
                {milestone.impact}
              </span>
            )}
          </div>
          <div className="font-semibold text-xs leading-snug">{milestone.label}</div>
          {(milestone.detail || point?.detail) && (
            <div
              className={`mt-1 text-[11px] leading-relaxed ${
                dark ? 'text-[#B8B8B2]' : 'text-[#5C5C58]'
              }`}
            >
              {milestone.detail || point?.detail}
            </div>
          )}
        </div>
      ) : point?.detail ? (
        <div
          className={`mt-1.5 pt-1.5 border-t text-[11px] ${
            dark ? 'border-white/[0.08] text-[#A8A8A2]' : 'border-[#EFEFEB] text-[#5C5C58]'
          }`}
        >
          {point.detail}
        </div>
      ) : null}
    </div>
  );
};

interface MilestoneSvgLabelProps {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  milestone: ResolvedGrowthMilestone;
  dark: boolean;
  isHovered?: boolean;
  isActive?: boolean;
  onHover?: (milestone: ResolvedGrowthMilestone | null) => void;
  onClick?: (milestone: ResolvedGrowthMilestone) => void;
}

/**
 * Editorial SVG milestone annotation anchored cleanly above the dashed vertical stem
 * using `.bw-type-mono-meta` typography (`--bw-font-mono`, `--bw-text-step-n1`).
 * Interactive: hoverable and clickable to reveal rich milestone details.
 */
const MilestoneSvgLabel: React.FC<MilestoneSvgLabelProps> = ({
  viewBox,
  milestone,
  dark,
  isHovered = false,
  isActive = false,
  onHover,
  onClick,
}) => {
  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number') {
    return null;
  }

  const x = viewBox.x;
  const topY = viewBox.y;
  const isAccent = milestone.tone === 'accent' || isHovered || isActive;
  const dotFill = isAccent
    ? 'var(--bw-orange)'
    : dark
      ? 'rgba(255, 255, 255, 0.48)'
      : 'rgba(23, 23, 23, 0.36)';
  const textFill = isAccent ? (dark ? '#FF9A45' : '#B94700') : dark ? '#B8B8B2' : '#5C5C58';

  const textAnchor =
    milestone.alignment === 'start' ? 'start' : milestone.alignment === 'end' ? 'end' : 'middle';
  const xOffset = milestone.alignment === 'start' ? 2 : milestone.alignment === 'end' ? -2 : 0;

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={`Milestone: ${milestone.label}. ${milestone.detail || ''}`}
      data-milestone-marker={milestone.xLabel}
      data-milestone-label={milestone.label}
      data-milestone-hovered={isHovered ? 'true' : 'false'}
      className="cursor-pointer outline-none focus:outline-none"
      onMouseEnter={() => onHover?.(milestone)}
      onMouseLeave={() => onHover?.(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(milestone);
      }}
      onFocus={() => onHover?.(milestone)}
      onBlur={() => onHover?.(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(milestone);
        }
      }}
    >
      <circle
        cx={x}
        cy={topY}
        r={isHovered || isActive ? 3.5 : 2.25}
        fill={dotFill}
        className="transition-all duration-150"
      />
      <text
        x={x + xOffset}
        y={topY - 9}
        textAnchor={textAnchor}
        fill={textFill}
        className={`${typeClass.monoMeta} transition-colors select-none`}
        style={{ fontWeight: isHovered || isActive ? 600 : 500 }}
      >
        {milestone.label}
      </text>
    </g>
  );
};

interface EditorialSeriesDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  total: number;
  dark: boolean;
  showAllPointDots: boolean;
  milestone?: ResolvedGrowthMilestone;
  isHovered?: boolean;
  isActive?: boolean;
  onHover?: (milestone: ResolvedGrowthMilestone | null) => void;
  onClick?: (milestone: ResolvedGrowthMilestone) => void;
}

const EditorialSeriesDot: React.FC<EditorialSeriesDotProps> = ({
  cx,
  cy,
  index,
  total,
  dark,
  showAllPointDots,
  milestone,
  isHovered = false,
  isActive = false,
  onHover,
  onClick,
}) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || typeof index !== 'number') {
    return null;
  }

  // Interactive Ceramic Annotation Marker on significant data points
  if (milestone) {
    const isAccent = milestone.tone === 'accent' || isHovered || isActive;
    const auraRadius = isHovered || isActive ? 13 : 9;
    const outerRadius = isHovered || isActive ? 6.5 : 5.5;
    const innerRadius = isHovered || isActive ? 3 : 2.25;

    return (
      <g
        tabIndex={0}
        role="button"
        aria-label={`Milestone: ${milestone.label}. ${milestone.detail || ''}`}
        data-annotation-marker={milestone.xLabel}
        data-annotation-active={isHovered || isActive ? 'true' : 'false'}
        data-annotation-tone={milestone.tone}
        className="cursor-pointer outline-none focus:outline-none"
        onMouseEnter={() => onHover?.(milestone)}
        onMouseLeave={() => onHover?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(milestone);
        }}
        onFocus={() => onHover?.(milestone)}
        onBlur={() => onHover?.(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(milestone);
          }
        }}
      >
        {/* Soft Ceramic Beacon Aura */}
        <circle
          cx={cx}
          cy={cy}
          r={auraRadius}
          fill="var(--bw-orange)"
          fillOpacity={isHovered || isActive ? (dark ? 0.35 : 0.22) : dark ? 0.18 : 0.1}
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* Tactile Ceramic Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          fill={dark ? '#1D1D1B' : '#FFFFFF'}
          stroke={
            isAccent
              ? 'var(--bw-orange)'
              : dark
                ? 'rgba(255, 255, 255, 0.7)'
                : 'rgba(23, 23, 23, 0.6)'
          }
          strokeWidth={isHovered || isActive ? 2.25 : 1.75}
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* High-Precision Core Pin */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill={isAccent ? 'var(--bw-orange)' : dark ? '#FFFFFF' : '#171717'}
          style={{ transition: 'all 0.15s ease' }}
        />
      </g>
    );
  }

  // Terminal Point Dot
  if (index === total - 1) {
    return (
      <g aria-hidden="true" data-terminal-dot="true">
        <circle cx={cx} cy={cy} r={8} fill="var(--bw-orange)" fillOpacity={dark ? 0.2 : 0.14} />
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="var(--bw-orange)"
          stroke={dark ? '#171717' : '#FFFFFF'}
          strokeWidth={2}
        />
      </g>
    );
  }

  if (!showAllPointDots) return null;

  return (
    <circle
      aria-hidden="true"
      data-raw-point-dot={index}
      cx={cx}
      cy={cy}
      r={3}
      fill={dark ? '#171717' : '#FFFFFF'}
      stroke="var(--bw-orange)"
      strokeWidth={1.75}
    />
  );
};

/**
 * Tactile Pill toggle switching between smooth spline interpolation and raw linear data points.
 */
export const TactileCurveModeToggle: React.FC<{
  value: GrowthCurveMode;
  onChange: (mode: GrowthCurveMode) => void;
  dark?: boolean;
}> = ({ value, onChange, dark = false }) => {
  const toggleGroupId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Chart line interpolation"
      data-curve-toggle={dark ? 'dark' : 'light'}
      className={`inline-flex items-center gap-0.5 p-1 rounded-full border ${
        dark
          ? 'bg-white/[0.06] border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]'
          : 'bg-[#F1F1EF] border-[#EAEAE5] bw-surface-inset'
      }`}
    >
      {GROWTH_CURVE_MODE_OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.ariaLabel}
            data-curve-pill={opt.id}
            onClick={() => onChange(opt.id)}
            className={`relative px-2.5 py-1 text-[11px] font-mono-num font-medium rounded-full transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-ring ${
              dark ? 'focus-ring-dark' : ''
            } ${
              active
                ? 'text-[#171717]'
                : dark
                  ? 'text-[#A8A8A2] hover:text-white'
                  : 'text-[#686864] hover:text-[#171717]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : `bw-tactile-curve-${toggleGroupId}`}
                transition={{ duration: 0.24, ease: BW_EASE }}
                className={`absolute inset-0 rounded-full ${
                  dark
                    ? 'bg-[#FFFFFF] shadow-[0_2px_8px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,1)]'
                    : 'bg-[#FFFFFF] border border-[#ECECE8] bw-tactile-pill'
                }`}
              />
            )}
            <svg
              aria-hidden="true"
              viewBox="0 0 14 10"
              className="relative z-10 w-3 h-2.5 shrink-0 overflow-visible"
              fill="none"
            >
              {opt.id === 'smooth' ? (
                <path
                  d="M1 8C4 8 4.5 2 7.5 2C10.5 2 10.5 6 13 3"
                  stroke={active ? 'var(--bw-orange)' : 'currentColor'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <path
                    d="M1 8L5 3.5L9 6L13 2"
                    stroke={active ? 'var(--bw-orange)' : 'currentColor'}
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="5"
                    cy="3.5"
                    r="1.1"
                    fill={active ? 'var(--bw-orange)' : 'currentColor'}
                  />
                  <circle
                    cx="9"
                    cy="6"
                    r="1.1"
                    fill={active ? 'var(--bw-orange)' : 'currentColor'}
                  />
                </>
              )}
            </svg>
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Tactile Pill segmented time-range selector (`7d`, `30d`, `90d`, `YTD`)
 * with shared-element `layoutId` spring-eased glide and high-contrast `.focus-ring`.
 */
export const TactileRangeSelector: React.FC<{
  value: GrowthTimeRange;
  onChange: (range: GrowthTimeRange) => void;
  dark?: boolean;
  label?: string;
}> = ({ value, onChange, dark = false, label }) => {
  const pillGroupId = useId();
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center justify-between gap-3">
      {label ? (
        <span className={`${typeClass.overline} ${dark ? 'text-[#8A8A84]' : 'text-[#858585]'}`}>
          {label}
        </span>
      ) : (
        <span className="sr-only">Time range</span>
      )}

      <div
        role="tablist"
        aria-label="Chart time range"
        data-tactile-range-selector={dark ? 'dark' : 'light'}
        className={`inline-flex items-center gap-0.5 p-1 rounded-full border ${
          dark
            ? 'bg-white/[0.06] border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]'
            : 'bg-[#F1F1EF] border-[#EAEAE5] bw-surface-inset'
        }`}
      >
        {GROWTH_TIME_RANGE_OPTIONS.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={opt.ariaLabel}
              data-range-pill={opt.id}
              onClick={() => onChange(opt.id)}
              className={`relative px-2.5 sm:px-3 py-1 text-[11px] font-mono-num font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring ${
                dark ? 'focus-ring-dark' : ''
              } ${
                active
                  ? 'text-[#171717]'
                  : dark
                    ? 'text-[#A8A8A2] hover:text-white'
                    : 'text-[#686864] hover:text-[#171717]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduced ? undefined : `bw-tactile-range-${pillGroupId}`}
                  transition={{ duration: 0.24, ease: BW_EASE }}
                  className={`absolute inset-0 rounded-full ${
                    dark
                      ? 'bg-[#FFFFFF] shadow-[0_2px_8px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,1)]'
                      : 'bg-[#FFFFFF] border border-[#ECECE8] bw-tactile-pill'
                  }`}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * GrowthTrendChart
 * Recharts-powered business performance trend visualizer styled with `--bw-orange`,
 * editorial monotone curves, Tactile Pill 7d / 30d / 90d / YTD range toggles,
 * ultra-faint horizontal hairlines, and zero grid clutter.
 */
export const GrowthTrendChart: React.FC<GrowthTrendChartProps> = ({
  points = [],
  rangeSeries,
  milestones,
  rangeMilestones,
  showMilestones = true,
  showAnnotations = true,
  onAnnotationHover,
  onAnnotationClick,
  activeMilestoneX: controlledActiveMilestoneX,
  range: controlledRange,
  defaultRange = '30d',
  onRangeChange,
  showRangeSelector = true,
  curveMode: controlledCurveMode,
  defaultCurveMode = 'smooth',
  onCurveModeChange,
  showCurveToggle = true,
  rangeLabel,
  height = 180,
  dark = false,
  unitPrefix = '',
  unitSuffix = '',
  metricLabel = 'Performance',
  baselineLabel = 'Baseline',
  showYAxis = false,
  showHairlines = true,
  showFooter = true,
  ariaLabel = 'Business growth performance trend chart',
  className = '',
}) => {
  const reduced = useReducedMotion();
  const rawId = useId().replace(/:/g, '');
  const gradientId = `bw-growth-area-${rawId}`;
  const [internalRange, setInternalRange] = useState<GrowthTimeRange>(defaultRange);
  const [internalCurveMode, setInternalCurveMode] = useState<GrowthCurveMode>(defaultCurveMode);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredMilestoneX, setHoveredMilestoneX] = useState<string | null>(null);
  const [selectedMilestoneX, setSelectedMilestoneX] = useState<string | null>(null);

  const activeRange = controlledRange ?? internalRange;
  const activeCurveMode = controlledCurveMode ?? internalCurveMode;
  const curveConfig = useMemo(() => resolveCurveModeConfig(activeCurveMode), [activeCurveMode]);

  const handleSelectRange = (nextRange: GrowthTimeRange) => {
    if (nextRange === activeRange) return;
    setHoveredIndex(null);
    setHoveredMilestoneX(null);
    setSelectedMilestoneX(null);
    if (controlledRange === undefined) {
      setInternalRange(nextRange);
    }
    onRangeChange?.(nextRange);
  };

  const handleSelectCurveMode = (nextMode: GrowthCurveMode) => {
    if (nextMode === activeCurveMode) return;
    if (controlledCurveMode === undefined) {
      setInternalCurveMode(nextMode);
    }
    onCurveModeChange?.(nextMode);
  };

  const resolvedPoints = useMemo(
    () =>
      resolveTimeRangePoints({
        range: activeRange,
        points,
        rangeSeries,
      }),
    [activeRange, points, rangeSeries]
  );

  const resolvedMilestones = useMemo(
    () =>
      showMilestones
        ? resolveChartMilestones({
            points: resolvedPoints,
            range: activeRange,
            milestones,
            rangeMilestones,
          })
        : [],
    [showMilestones, resolvedPoints, activeRange, milestones, rangeMilestones]
  );

  const milestonesByX = useMemo(() => {
    const map = new Map<string, ResolvedGrowthMilestone>();
    for (const m of resolvedMilestones) {
      map.set(m.xLabel, m);
    }
    return map;
  }, [resolvedMilestones]);

  const activeMilestone = useMemo(() => {
    const targetX = controlledActiveMilestoneX ?? hoveredMilestoneX ?? selectedMilestoneX;
    return targetX ? milestonesByX.get(targetX) : null;
  }, [controlledActiveMilestoneX, hoveredMilestoneX, selectedMilestoneX, milestonesByX]);

  const handleAnnotationHover = (milestone: ResolvedGrowthMilestone | null) => {
    setHoveredMilestoneX(milestone?.xLabel ?? null);
    if (milestone) {
      setHoveredIndex(milestone.pointIndex);
    }
    onAnnotationHover?.(milestone);
  };

  const handleAnnotationClick = (milestone: ResolvedGrowthMilestone) => {
    setSelectedMilestoneX((prev) => (prev === milestone.xLabel ? null : milestone.xLabel));
    onAnnotationClick?.(milestone);
  };

  const summary = useMemo(() => computeGrowthTrendSummary(resolvedPoints), [resolvedPoints]);
  const yTicks = useMemo(() => buildEditorialTickValues(summary.yDomain), [summary.yDomain]);
  const hasBaseline = useMemo(
    () => resolvedPoints.some((p) => typeof p.baseline === 'number'),
    [resolvedPoints]
  );
  const hasMilestones = resolvedMilestones.length > 0;

  if (resolvedPoints.length === 0) {
    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-growth-trend-chart="empty"
        className={`flex items-center justify-center rounded-[14px] border text-xs ${
          dark
            ? 'border-white/[0.08] bg-white/[0.02] text-[#858585]'
            : 'border-[#EFEFEB] bg-[#FAFAF9] text-[#858585]'
        } ${className}`}
        style={{ height }}
      >
        Awaiting performance telemetry
      </div>
    );
  }

  const activePoint =
    hoveredIndex !== null && resolvedPoints[hoveredIndex]
      ? resolvedPoints[hoveredIndex]
      : (summary.latest ?? resolvedPoints[resolvedPoints.length - 1]);
  const signedDeltaPct = formatSignedDeltaPercent(summary.deltaPercent);

  const axisTickColor = dark ? '#8A8A84' : '#858585';
  const hairlineColor = dark ? 'rgba(255, 255, 255, 0.065)' : 'rgba(23, 23, 23, 0.06)';
  const cursorColor = dark ? 'rgba(255, 116, 23, 0.36)' : 'rgba(255, 116, 23, 0.28)';

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-growth-trend-chart={dark ? 'dark' : 'light'}
      data-active-range={activeRange}
      data-curve-mode={activeCurveMode}
      className={`w-full min-w-0 ${className}`}
    >
      {(showRangeSelector || showCurveToggle) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {showCurveToggle ? (
            <TactileCurveModeToggle
              value={activeCurveMode}
              onChange={handleSelectCurveMode}
              dark={dark}
            />
          ) : rangeLabel ? (
            <span className={`${typeClass.overline} ${dark ? 'text-[#8A8A84]' : 'text-[#858585]'}`}>
              {rangeLabel}
            </span>
          ) : (
            <span />
          )}

          {showRangeSelector && (
            <TactileRangeSelector value={activeRange} onChange={handleSelectRange} dark={dark} />
          )}
        </div>
      )}

      <div className="w-full min-w-0" style={{ height }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRange}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: BW_EASE }}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={resolvedPoints}
                margin={{
                  top: hasMilestones ? 28 : 10,
                  right: 12,
                  bottom: 2,
                  left: showYAxis ? 0 : 8,
                }}
                onMouseMove={(state) => {
                  const idx =
                    typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : null;
                  setHoveredIndex(idx);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--bw-orange)"
                      stopOpacity={dark ? 0.22 : 0.14}
                    />
                    <stop
                      offset="75%"
                      stopColor="var(--bw-orange)"
                      stopOpacity={dark ? 0.03 : 0.02}
                    />
                    <stop offset="100%" stopColor="var(--bw-orange)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {showHairlines && (
                  <CartesianGrid
                    vertical={false}
                    horizontal
                    stroke={hairlineColor}
                    strokeDasharray="2 6"
                  />
                )}

                {resolvedMilestones.map((m) => {
                  const isHovered =
                    hoveredMilestoneX === m.xLabel || activeMilestone?.xLabel === m.xLabel;
                  const isSelected = selectedMilestoneX === m.xLabel;
                  return (
                    <ReferenceLine
                      key={`milestone-${activeRange}-${m.xLabel}`}
                      x={m.xLabel}
                      stroke={
                        m.tone === 'accent' || isHovered || isSelected
                          ? dark
                            ? 'rgba(255, 154, 69, 0.48)'
                            : 'rgba(255, 116, 23, 0.44)'
                          : dark
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(23, 23, 23, 0.18)'
                      }
                      strokeWidth={isHovered || isSelected ? 1.5 : 1}
                      strokeDasharray="2.5 3.5"
                      label={(labelProps) => (
                        <MilestoneSvgLabel
                          viewBox={labelProps.viewBox}
                          milestone={m}
                          dark={dark}
                          isHovered={isHovered}
                          isActive={isSelected}
                          onHover={handleAnnotationHover}
                          onClick={handleAnnotationClick}
                        />
                      )}
                    />
                  );
                })}

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                  interval="preserveStartEnd"
                  tick={{
                    fill: axisTickColor,
                    fontSize: 10.5,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                />

                <YAxis
                  hide={!showYAxis}
                  domain={summary.yDomain}
                  ticks={yTicks}
                  axisLine={false}
                  tickLine={false}
                  width={showYAxis ? 48 : 0}
                  tickFormatter={(val: number) =>
                    formatGrowthMetricValue(val, unitPrefix, unitSuffix)
                  }
                  tick={{
                    fill: axisTickColor,
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                />

                <Tooltip
                  cursor={{
                    stroke: cursorColor,
                    strokeWidth: 1,
                    strokeDasharray: '3 3',
                  }}
                  content={
                    <EditorialChartTooltip
                      dark={dark}
                      unitPrefix={unitPrefix}
                      unitSuffix={unitSuffix}
                      metricLabel={metricLabel}
                      baselineLabel={baselineLabel}
                      milestonesByX={milestonesByX}
                    />
                  }
                />

                {hasBaseline && (
                  <Area
                    type={curveConfig.areaType}
                    dataKey="baseline"
                    stroke={dark ? 'rgba(255,255,255,0.28)' : '#C8C8C1'}
                    strokeWidth={1.25}
                    strokeDasharray="4 4"
                    fill="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!reduced}
                    animationDuration={420}
                  />
                )}

                <Area
                  type={curveConfig.areaType}
                  dataKey="value"
                  stroke="var(--bw-orange)"
                  strokeWidth={curveConfig.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={`url(#${gradientId})`}
                  dot={(dotProps) => {
                    const pt =
                      dotProps.index !== undefined ? resolvedPoints[dotProps.index] : undefined;
                    const m = pt ? milestonesByX.get(pt.label) : undefined;
                    const isHovered = Boolean(
                      m && (hoveredMilestoneX === m.xLabel || activeMilestone?.xLabel === m.xLabel)
                    );
                    const isSelected = Boolean(m && selectedMilestoneX === m.xLabel);
                    return (
                      <EditorialSeriesDot
                        key={`dot-${dotProps.index}`}
                        cx={dotProps.cx}
                        cy={dotProps.cy}
                        index={dotProps.index}
                        total={resolvedPoints.length}
                        dark={dark}
                        showAllPointDots={curveConfig.showAllPointDots}
                        milestone={showAnnotations ? m : undefined}
                        isHovered={isHovered}
                        isActive={isSelected}
                        onHover={handleAnnotationHover}
                        onClick={handleAnnotationClick}
                      />
                    );
                  }}
                  activeDot={{
                    r: 5,
                    fill: 'var(--bw-orange)',
                    stroke: dark ? '#171717' : '#FFFFFF',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={!reduced}
                  animationDuration={460}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {showFooter && activePoint && (
        <div
          className={`mt-2.5 pt-2.5 border-t flex items-center justify-between gap-3 ${
            dark ? 'border-white/[0.08]' : 'border-[#EFEFEB]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--bw-orange)' }}
            />
            {activeMilestone ? (
              <span
                className={`${typeClass.monoMeta} truncate ${
                  dark ? 'text-[#D6D6D0]' : 'text-[#3D3D3A]'
                }`}
              >
                <span
                  className="font-semibold"
                  style={{ color: dark ? '#FF9A45' : 'var(--bw-orange)' }}
                >
                  Milestone: {activeMilestone.label}
                </span>{' '}
                {activeMilestone.detail && (
                  <span className={dark ? 'text-[#8A8A84]' : 'text-[#858585]'}>
                    — {activeMilestone.detail}
                  </span>
                )}
              </span>
            ) : (
              <span
                className={`${typeClass.monoMeta} truncate ${
                  dark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'
                }`}
              >
                {hoveredIndex !== null ? 'Inspecting' : 'Latest'}:{' '}
                <span className={dark ? 'text-white' : 'text-[#171717]'}>{activePoint.label}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {signedDeltaPct && (
              <span
                className={`${typeClass.overline} normal-case tracking-normal ${
                  summary.trend === 'up'
                    ? dark
                      ? 'text-[#4FA87B]'
                      : 'text-[#24724E]'
                    : summary.trend === 'down'
                      ? 'text-[#BC3E3E]'
                      : 'text-[#858585]'
                }`}
              >
                {signedDeltaPct} ({activeRange.toUpperCase()})
              </span>
            )}
            <span
              className="font-mono-num text-xs font-semibold tabular-nums"
              style={{ color: dark ? '#FF9A45' : 'var(--bw-orange)' }}
            >
              {formatGrowthMetricValue(activePoint.value, unitPrefix, unitSuffix)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
