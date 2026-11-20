import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  buildBrushSparklinePath,
  buildEditorialTickValues,
  clampBrushRange,
  computeGrowthTrendSummary,
  createAnnotation,
  filterAnnotationsForPoints,
  findAnnotationForPoint,
  findMilestoneForPoint,
  formatGrowthMetricValue,
  formatSignedDeltaPercent,
  indexFromClientX,
  isBrushActive,
  loadPersistedAnnotations,
  removeAnnotation,
  resolveChartMilestones,
  resolveCurveModeConfig,
  resolveTimeRangePoints,
  savePersistedAnnotations,
  slicePointsByBrush,
  type GrowthTrendAnnotation,
  upsertAnnotation,
} from './growthTrendUtils';

export type {
  GrowthCurveMode,
  GrowthTimeRange,
  GrowthTrendAnnotation,
  GrowthTrendMilestone,
  GrowthTrendMilestonesMap,
  GrowthTrendPoint,
  GrowthTrendSeriesMap,
  ResolvedGrowthMilestone,
};
export {
  createAnnotation,
  filterAnnotationsForPoints,
  findAnnotationForPoint,
  findMilestoneForPoint,
  loadPersistedAnnotations,
  removeAnnotation,
  savePersistedAnnotations,
  upsertAnnotation,
};

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
  /** Toggle rendering of the time-range brush slider below the chart (defaults to true). */
  showBrushSlider?: boolean;
  /** Controlled brush selection range `[startIndex, endIndex]`. */
  brushRange?: [number, number];
  /** Uncontrolled initial brush selection range `[startIndex, endIndex]`. */
  defaultBrushRange?: [number, number];
  /** Callback fired whenever the user adjusts the brush zoom selection. */
  onBrushChange?: (brush: {
    startIndex: number;
    endIndex: number;
    points: GrowthTrendPoint[];
    isZoomed: boolean;
  }) => void;
  /** Minimum number of points that can be selected in a zoom window (default 2). */
  minBrushPoints?: number;
  /** Slider track height in pixels (default 32). */
  brushSliderHeight?: number;
  /** Toggle interactive trend annotations (click data points to add sticky notes/comments) (defaults to true). */
  allowAnnotations?: boolean;
  /** Controlled list of user annotations / sticky notes. */
  annotations?: GrowthTrendAnnotation[];
  /** Initial uncontrolled list of annotations. */
  defaultAnnotations?: GrowthTrendAnnotation[];
  /** Callback fired whenever user annotations are added, modified, or removed. */
  onAnnotationsChange?: (annotations: GrowthTrendAnnotation[]) => void;
  /** Storage key for persisting annotations in localStorage. Defaults to auto-generated from ariaLabel/metricLabel. Pass `false` to disable localStorage. */
  storageKey?: string | false;
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
  annotationsByX?: Map<string, GrowthTrendAnnotation>;
  allowAnnotations?: boolean;
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
  annotationsByX,
  allowAnnotations = true,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const primary = payload.find((item) => item.dataKey === 'value') ?? payload[0];
  const baseline = payload.find((item) => item.dataKey === 'baseline');
  const point = primary?.payload;
  const milestone = label ? milestonesByX.get(label) : undefined;
  const userNote = label && annotationsByX ? annotationsByX.get(label) : undefined;

  if (typeof primary?.value !== 'number') return null;

  return (
    <div
      className={`rounded-[14px] border px-3.5 py-2.5 min-w-[152px] max-w-[280px] transition-opacity ${
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

      {userNote && (
        <div
          data-sticky-note-tooltip="true"
          className={`mt-2 p-2 rounded-[8px] border text-left ${
            userNote.color === 'accent'
              ? dark
                ? 'bg-[#2B1B14] border-[#8C3B14] text-white'
                : 'bg-[#FFF7ED] border-[#FED7AA] text-[#171717]'
              : userNote.color === 'neutral'
                ? dark
                  ? 'bg-white/[0.06] border-white/[0.12] text-white'
                  : 'bg-[#F4F4F1] border-[#E2E2DC] text-[#171717]'
                : dark
                  ? 'bg-[#2A2318] border-[#805018] text-white'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#171717]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px]" aria-hidden="true">
                📝
              </span>
              <span
                className={`${typeClass.overline} tracking-wider text-[9px] truncate ${
                  userNote.color === 'accent'
                    ? dark
                      ? 'text-[#FF9A45]'
                      : 'text-[#C44D00]'
                    : dark
                      ? 'text-[#F59E0B]'
                      : 'text-[#B45309]'
                }`}
              >
                {userNote.author || 'Trend Note'}
              </span>
            </div>
            {userNote.updatedAt && (
              <span
                className={`text-[8.5px] font-mono-num shrink-0 ${
                  dark ? 'text-[#858585]' : 'text-[#8A8A84]'
                }`}
              >
                {new Date(userNote.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <div className="text-[11px] font-normal leading-snug break-words">{userNote.text}</div>
        </div>
      )}

      {milestone ? (
        <div
          data-milestone-tooltip-card="true"
          className={`mt-2 rounded-[10px] border p-2.5 transition-all ${
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
      ) : point?.detail && !userNote ? (
        <div
          className={`mt-1.5 pt-1.5 border-t text-[11px] ${
            dark ? 'border-white/[0.08] text-[#A8A8A2]' : 'border-[#EFEFEB] text-[#5C5C58]'
          }`}
        >
          {point.detail}
        </div>
      ) : null}

      {allowAnnotations && (
        <div
          className={`mt-2 pt-1 border-t text-[9px] font-mono-num flex items-center justify-between ${
            dark ? 'border-white/[0.06] text-[#787872]' : 'border-[#EFEFEB] text-[#9A9A94]'
          }`}
        >
          <span>{userNote ? 'Click point to edit note' : 'Click point to add note'}</span>
          <span className="text-[9px] opacity-70">✎</span>
        </div>
      )}
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
  userAnnotation?: GrowthTrendAnnotation;
  point?: GrowthTrendPoint;
  allowAnnotations?: boolean;
  isHovered?: boolean;
  isActive?: boolean;
  onHover?: (milestone: ResolvedGrowthMilestone | null) => void;
  onClickMilestone?: (milestone: ResolvedGrowthMilestone) => void;
  onPointSelect?: (point: GrowthTrendPoint, index: number, cx: number, cy: number) => void;
}

const EditorialSeriesDot: React.FC<EditorialSeriesDotProps> = ({
  cx,
  cy,
  index,
  total,
  dark,
  showAllPointDots,
  milestone,
  userAnnotation,
  point,
  allowAnnotations = true,
  isHovered = false,
  isActive = false,
  onHover,
  onClickMilestone,
  onPointSelect,
}) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || typeof index !== 'number') {
    return null;
  }

  // Interactive Sticky Note Pin on user-annotated data points
  if (userAnnotation) {
    const isNoteAccent = userAnnotation.color === 'accent';
    const isNoteNeutral = userAnnotation.color === 'neutral';
    const noteToneColor = isNoteAccent
      ? 'var(--bw-orange)'
      : isNoteNeutral
        ? dark
          ? '#A8A8A2'
          : '#71717A'
        : '#F59E0B'; // amber default

    return (
      <g
        tabIndex={0}
        role="button"
        aria-label={`Trend note on ${point?.label ?? userAnnotation.xLabel}: ${userAnnotation.text}`}
        data-trend-annotation-pin={userAnnotation.xLabel}
        data-annotation-tone={userAnnotation.color || 'amber'}
        className="cursor-pointer outline-none focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          if (point) {
            onPointSelect?.(point, index, cx, cy);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (point) {
              onPointSelect?.(point, index, cx, cy);
            }
          }
        }}
      >
        {/* Soft Glowing Beacon Aura */}
        <circle
          cx={cx}
          cy={cy}
          r={13}
          fill={noteToneColor}
          fillOpacity={dark ? 0.35 : 0.22}
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* Tactile Pin Surface */}
        <circle
          cx={cx}
          cy={cy}
          r={6.5}
          fill={dark ? '#1D1D1B' : '#FFFFFF'}
          stroke={noteToneColor}
          strokeWidth={2}
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* Core Pin Dot */}
        <circle
          cx={cx}
          cy={cy}
          r={2.5}
          fill={noteToneColor}
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* Folded Sticky Flag Icon badge anchored slightly above */}
        <g transform={`translate(${cx - 4}, ${cy - 16})`}>
          <rect
            x={0}
            y={0}
            width={8}
            height={8}
            rx={1.5}
            fill={noteToneColor}
            stroke={dark ? '#1D1D1B' : '#FFFFFF'}
            strokeWidth={1}
          />
          <path d="M 5 0 L 8 3 L 5 3 Z" fill={dark ? '#1D1D1B' : '#FFFFFF'} fillOpacity={0.65} />
        </g>
      </g>
    );
  }

  // Interactive Ceramic Milestone Annotation Marker on significant data points
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
          onClickMilestone?.(milestone);
          if (allowAnnotations && point) {
            onPointSelect?.(point, index, cx, cy);
          }
        }}
        onFocus={() => onHover?.(milestone)}
        onBlur={() => onHover?.(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClickMilestone?.(milestone);
            if (allowAnnotations && point) {
              onPointSelect?.(point, index, cx, cy);
            }
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
      <g
        aria-hidden={!allowAnnotations}
        tabIndex={allowAnnotations ? 0 : -1}
        role={allowAnnotations ? 'button' : undefined}
        aria-label={allowAnnotations && point ? `Add note on ${point.label}` : undefined}
        data-terminal-dot="true"
        className={allowAnnotations ? 'cursor-pointer outline-none' : ''}
        onClick={(e) => {
          if (allowAnnotations && point) {
            e.stopPropagation();
            onPointSelect?.(point, index, cx, cy);
          }
        }}
        onKeyDown={(e) => {
          if (allowAnnotations && point && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            onPointSelect?.(point, index, cx, cy);
          }
        }}
      >
        <circle cx={cx} cy={cy} r={8} fill="var(--bw-orange)" fillOpacity={dark ? 0.2 : 0.14} />
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="var(--bw-orange)"
          stroke={dark ? '#171717' : '#FFFFFF'}
          strokeWidth={2}
        />
        {allowAnnotations && <circle cx={cx} cy={cy} r={14} fill="transparent" />}
      </g>
    );
  }

  if (showAllPointDots) {
    return (
      <g
        aria-hidden={!allowAnnotations}
        tabIndex={allowAnnotations ? 0 : -1}
        role={allowAnnotations ? 'button' : undefined}
        aria-label={allowAnnotations && point ? `Add note on ${point.label}` : undefined}
        className={allowAnnotations ? 'cursor-pointer outline-none' : ''}
        onClick={(e) => {
          if (allowAnnotations && point) {
            e.stopPropagation();
            onPointSelect?.(point, index, cx, cy);
          }
        }}
        onKeyDown={(e) => {
          if (allowAnnotations && point && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            onPointSelect?.(point, index, cx, cy);
          }
        }}
      >
        <circle
          data-raw-point-dot={index}
          cx={cx}
          cy={cy}
          r={3}
          fill={dark ? '#171717' : '#FFFFFF'}
          stroke="var(--bw-orange)"
          strokeWidth={1.75}
        />
        {allowAnnotations && <circle cx={cx} cy={cy} r={12} fill="transparent" />}
      </g>
    );
  }

  // Clickable transparent hit area for unadorned points along the curve
  if (allowAnnotations && point) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill="transparent"
        tabIndex={0}
        role="button"
        aria-label={`Add note on ${point.label}`}
        data-point-hit-target={index}
        className="cursor-pointer outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onPointSelect?.(point, index, cx, cy);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onPointSelect?.(point, index, cx, cy);
          }
        }}
      />
    );
  }

  return null;
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

export interface TactileBrushSliderProps {
  /** Full point series representing the macro overview horizon. */
  points: GrowthTrendPoint[];
  /** Current start index of the brush window. */
  startIndex: number;
  /** Current end index of the brush window. */
  endIndex: number;
  /** Callback fired when the user adjusts the brush zoom selection. */
  onChange: (range: [number, number]) => void;
  /** Dark obsidian variant for Performance & Execution Pulse surfaces. */
  dark?: boolean;
  /** Minimum selectable points span (defaults to 2). */
  minPoints?: number;
  /** Track height in pixels (defaults to 32). */
  height?: number;
  /** Value formatting prefix (e.g. "$", "+"). */
  unitPrefix?: string;
  /** Value formatting suffix (e.g. "%", " subs"). */
  unitSuffix?: string;
  /** Optional accessible label. */
  ariaLabel?: string;
  className?: string;
}

/**
 * TactileBrushSlider
 * Precision time-range overview slider allowing users to brush-select and zoom in
 * on a subset of chart data points, with dual draggable travellers, interactive window panning,
 * sparkline overview silhouette, and keyboard step support.
 */
export const TactileBrushSlider: React.FC<TactileBrushSliderProps> = ({
  points,
  startIndex,
  endIndex,
  onChange,
  dark = false,
  minPoints = 2,
  height = 32,
  unitPrefix = '',
  unitSuffix = '',
  ariaLabel = 'Time range zoom slider',
  className = '',
}) => {
  const rawId = useId().replace(/:/g, '');
  const sparklineGradId = `bw-sparkline-grad-${rawId}`;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'window' | null>(null);

  const totalPoints = points.length;
  const [clampedStart, clampedEnd] = clampBrushRange(startIndex, endIndex, totalPoints, minPoints);
  const isZoomed = isBrushActive([clampedStart, clampedEnd], totalPoints);

  const currentBoundsRef = useRef<[number, number]>([clampedStart, clampedEnd]);
  currentBoundsRef.current = [clampedStart, clampedEnd];

  const dragRef = useRef<{
    mode: 'start' | 'end' | 'window';
    startX: number;
    startIndices: [number, number];
  } | null>(null);

  const sparkline = useMemo(() => buildBrushSparklinePath(points, 100, height), [points, height]);

  const startPct = totalPoints > 1 ? (clampedStart / (totalPoints - 1)) * 100 : 0;
  const endPct = totalPoints > 1 ? (clampedEnd / (totalPoints - 1)) * 100 : 100;
  const widthPct = Math.max(0, endPct - startPct);

  // Global pointer listeners for smooth dragging outside element bounds
  useEffect(() => {
    if (!dragMode) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const { mode, startX, startIndices } = dragRef.current;
      const total = points.length;

      if (mode === 'start') {
        const newStart = indexFromClientX(e.clientX, rect.left, rect.width, total);
        const currentEnd = currentBoundsRef.current[1];
        const next = clampBrushRange(newStart, currentEnd, total, minPoints);
        onChange(next);
      } else if (mode === 'end') {
        const newEnd = indexFromClientX(e.clientX, rect.left, rect.width, total);
        const currentStart = currentBoundsRef.current[0];
        const next = clampBrushRange(currentStart, newEnd, total, minPoints);
        onChange(next);
      } else if (mode === 'window') {
        const deltaX = e.clientX - startX;
        const deltaIndex = Math.round((deltaX / rect.width) * (total - 1));
        const span = startIndices[1] - startIndices[0];
        const maxStart = total - 1 - span;
        const targetStart = Math.max(0, Math.min(startIndices[0] + deltaIndex, maxStart));
        const targetEnd = targetStart + span;
        onChange([targetStart, targetEnd]);
      }
    };

    const onPointerUp = () => {
      dragRef.current = null;
      setDragMode(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragMode, points.length, minPoints, onChange]);

  if (totalPoints < minPoints) {
    return null;
  }

  const handleStartPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode: 'start',
      startX: e.clientX,
      startIndices: [clampedStart, clampedEnd],
    };
    setDragMode('start');
  };

  const handleEndPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode: 'end',
      startX: e.clientX,
      startIndices: [clampedStart, clampedEnd],
    };
    setDragMode('end');
  };

  const handleWindowPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode: 'window',
      startX: e.clientX,
      startIndices: [clampedStart, clampedEnd],
    };
    setDragMode('window');
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickedIdx = indexFromClientX(e.clientX, rect.left, rect.width, totalPoints);

    if (clickedIdx < clampedStart) {
      const next = clampBrushRange(clickedIdx, clampedEnd, totalPoints, minPoints);
      onChange(next);
      dragRef.current = {
        mode: 'start',
        startX: e.clientX,
        startIndices: next,
      };
      setDragMode('start');
    } else if (clickedIdx > clampedEnd) {
      const next = clampBrushRange(clampedStart, clickedIdx, totalPoints, minPoints);
      onChange(next);
      dragRef.current = {
        mode: 'end',
        startX: e.clientX,
        startIndices: next,
      };
      setDragMode('end');
    }
  };

  const handleStartKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clampBrushRange(clampedStart - 1, clampedEnd, totalPoints, minPoints));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clampBrushRange(clampedStart + 1, clampedEnd, totalPoints, minPoints));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(clampBrushRange(0, clampedEnd, totalPoints, minPoints));
    }
  };

  const handleEndKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clampBrushRange(clampedStart, clampedEnd - 1, totalPoints, minPoints));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clampBrushRange(clampedStart, clampedEnd + 1, totalPoints, minPoints));
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(clampBrushRange(clampedStart, totalPoints - 1, totalPoints, minPoints));
    }
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([0, totalPoints - 1]);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-tactile-brush-slider={dark ? 'dark' : 'light'}
      data-brush-is-zoomed={isZoomed ? 'true' : 'false'}
      data-brush-start-index={clampedStart}
      data-brush-end-index={clampedEnd}
      className={`w-full select-none ${className}`}
    >
      {/* Slider Track Area */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        style={{ height }}
        className={`relative w-full rounded-[8px] overflow-hidden border cursor-crosshair touch-none transition-colors ${
          dark
            ? 'bg-[#151514] border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]'
            : 'bg-[#F4F4F1] border-[#E5E5DF] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Sparkline Overview Vector Silhouette */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
        >
          <defs>
            <linearGradient id={sparklineGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--bw-orange)" stopOpacity={dark ? 0.32 : 0.22} />
              <stop offset="100%" stopColor="var(--bw-orange)" stopOpacity={dark ? 0.04 : 0.02} />
            </linearGradient>
          </defs>
          {sparkline.areaPath && <path d={sparkline.areaPath} fill={`url(#${sparklineGradId})`} />}
          {sparkline.linePath && (
            <path
              d={sparkline.linePath}
              fill="none"
              stroke="var(--bw-orange)"
              strokeWidth="1.25"
              strokeOpacity={dark ? 0.65 : 0.55}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Left Unselected Dimming Mask */}
        <div
          aria-hidden="true"
          className={`absolute top-0 bottom-0 left-0 pointer-events-none transition-opacity ${
            dark ? 'bg-black/55' : 'bg-white/60'
          }`}
          style={{ width: `${startPct}%` }}
        />

        {/* Right Unselected Dimming Mask */}
        <div
          aria-hidden="true"
          className={`absolute top-0 bottom-0 right-0 pointer-events-none transition-opacity ${
            dark ? 'bg-black/55' : 'bg-white/60'
          }`}
          style={{ width: `${100 - endPct}%` }}
        />

        {/* Active Selection Zoom Window */}
        <div
          role="region"
          aria-label="Zoom selection window. Drag to pan."
          data-brush-window="true"
          onPointerDown={handleWindowPointerDown}
          className={`absolute top-0 bottom-0 cursor-grab active:cursor-grabbing border-y z-10 transition-colors ${
            dark
              ? 'border-[#FF9A45]/45 bg-[#FF9A45]/[0.08] shadow-[inset_0_0_0_1px_rgba(255,154,69,0.12)]'
              : 'border-[var(--bw-orange)]/55 bg-[var(--bw-orange)]/[0.08] shadow-[inset_0_0_0_1px_rgba(255,116,23,0.12)]'
          } ${dragMode === 'window' ? (dark ? '!bg-[#FF9A45]/[0.16]' : '!bg-[var(--bw-orange)]/[0.14]') : 'hover:bg-[var(--bw-orange)]/[0.12]'}`}
          style={{
            left: `${startPct}%`,
            width: `${widthPct}%`,
          }}
        >
          {/* Central Grip Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-1 opacity-40">
              <div
                className={`w-0.5 h-3 rounded-full ${dark ? 'bg-[#FF9A45]' : 'bg-[var(--bw-orange)]'}`}
              />
              <div
                className={`w-0.5 h-3 rounded-full ${dark ? 'bg-[#FF9A45]' : 'bg-[var(--bw-orange)]'}`}
              />
            </div>
          </div>
        </div>

        {/* Start Traveller Handle (Left) */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Zoom window start"
          aria-valuenow={clampedStart}
          aria-valuemin={0}
          aria-valuemax={clampedEnd - minPoints + 1}
          aria-valuetext={points[clampedStart]?.label}
          data-brush-handle="start"
          onPointerDown={handleStartPointerDown}
          onKeyDown={handleStartKeyDown}
          className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 outline-none focus:outline-none group"
          style={{ left: `${startPct}%` }}
        >
          <div
            className={`w-2 h-5 rounded-[4px] border transition-all flex items-center justify-center shadow-sm ${
              dark
                ? 'bg-[#2A2A28] border-[#52524D] group-hover:border-[#FF9A45] group-focus:border-[#FF9A45] group-focus:ring-1 group-focus:ring-[#FF9A45]'
                : 'bg-white border-[#C8C8C2] group-hover:border-[var(--bw-orange)] group-focus:border-[var(--bw-orange)] group-focus:ring-1 group-focus:ring-[var(--bw-orange)]'
            } ${dragMode === 'start' ? (dark ? '!border-[#FF9A45] !bg-[#363632]' : '!border-[var(--bw-orange)] !bg-[#FFF8F4]') : ''}`}
          >
            <div className={`w-[1px] h-2.5 ${dark ? 'bg-[#A8A8A2]' : 'bg-[#686864]'}`} />
          </div>
        </div>

        {/* End Traveller Handle (Right) */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Zoom window end"
          aria-valuenow={clampedEnd}
          aria-valuemin={clampedStart + minPoints - 1}
          aria-valuemax={totalPoints - 1}
          aria-valuetext={points[clampedEnd]?.label}
          data-brush-handle="end"
          onPointerDown={handleEndPointerDown}
          onKeyDown={handleEndKeyDown}
          className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 outline-none focus:outline-none group"
          style={{ left: `${endPct}%` }}
        >
          <div
            className={`w-2 h-5 rounded-[4px] border transition-all flex items-center justify-center shadow-sm ${
              dark
                ? 'bg-[#2A2A28] border-[#52524D] group-hover:border-[#FF9A45] group-focus:border-[#FF9A45] group-focus:ring-1 group-focus:ring-[#FF9A45]'
                : 'bg-white border-[#C8C8C2] group-hover:border-[var(--bw-orange)] group-focus:border-[var(--bw-orange)] group-focus:ring-1 group-focus:ring-[var(--bw-orange)]'
            } ${dragMode === 'end' ? (dark ? '!border-[#FF9A45] !bg-[#363632]' : '!border-[var(--bw-orange)] !bg-[#FFF8F4]') : ''}`}
          >
            <div className={`w-[1px] h-2.5 ${dark ? 'bg-[#A8A8A2]' : 'bg-[#686864]'}`} />
          </div>
        </div>
      </div>

      {/* Overview Readout & Reset Bar */}
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono-num select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--bw-orange)' }}
          />
          <span className={`truncate ${dark ? 'text-[#B8B8B2]' : 'text-[#686864]'}`}>
            <span className={dark ? 'text-white font-medium' : 'text-[#171717] font-medium'}>
              {points[clampedStart]?.label}
              {typeof points[clampedStart]?.value === 'number' && (
                <span
                  className={`ml-1 text-[9px] ${dark ? 'text-[#FF9A45]' : 'text-[var(--bw-orange)]'}`}
                >
                  ({formatGrowthMetricValue(points[clampedStart].value, unitPrefix, unitSuffix)})
                </span>
              )}
            </span>
            {' → '}
            <span className={dark ? 'text-white font-medium' : 'text-[#171717] font-medium'}>
              {points[clampedEnd]?.label}
              {typeof points[clampedEnd]?.value === 'number' && (
                <span
                  className={`ml-1 text-[9px] ${dark ? 'text-[#FF9A45]' : 'text-[var(--bw-orange)]'}`}
                >
                  ({formatGrowthMetricValue(points[clampedEnd].value, unitPrefix, unitSuffix)})
                </span>
              )}
            </span>
            <span className={`ml-1.5 ${dark ? 'text-[#858585]' : 'text-[#90908C]'}`}>
              ({clampedEnd - clampedStart + 1} of {totalPoints} pts)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isZoomed ? (
            <button
              type="button"
              data-brush-reset-button="true"
              onClick={handleResetZoom}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-num font-medium transition-colors cursor-pointer focus-ring ${
                dark
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-[#FF9A45] hover:text-white border border-white/[0.1]'
                  : 'bg-[#FFF3EB] hover:bg-[#FFE6D6] text-[#C44D00] border border-[#FFD2B3]'
              }`}
              aria-label="Reset zoom to full range"
            >
              <svg
                aria-hidden="true"
                className="w-2.5 h-2.5 shrink-0"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M2 6a4 4 0 1 1 1.17 2.83L2 10m0-4h3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reset Zoom
            </button>
          ) : (
            <span className={`text-[9.5px] ${dark ? 'text-[#70706A]' : 'text-[#94948E]'}`}>
              Drag handles to zoom
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export interface TrendStickyNoteOverlayProps {
  annotation?: GrowthTrendAnnotation;
  point: GrowthTrendPoint;
  cx: number;
  cy: number;
  containerWidth?: number;
  containerHeight?: number;
  dark?: boolean;
  unitPrefix?: string;
  unitSuffix?: string;
  onSave: (text: string, color: 'amber' | 'neutral' | 'accent') => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Editorial floating sticky note card anchored near target chart coordinates.
 * Allows strategists and founders to annotate inflection points, market shocks,
 * or campaign shifts with color-coded pins and persistent storage.
 */
export const TrendStickyNoteOverlay: React.FC<TrendStickyNoteOverlayProps> = ({
  annotation,
  point,
  cx,
  cy,
  containerWidth = 600,
  containerHeight = 220,
  dark = false,
  unitPrefix = '',
  unitSuffix = '',
  onSave,
  onDelete,
  onClose,
}) => {
  const [text, setText] = useState(annotation?.text ?? '');
  const [color, setColor] = useState<'amber' | 'neutral' | 'accent'>(annotation?.color ?? 'amber');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const noteWidth = 270;
  const noteHeight = 210;

  // Clamped anchoring within container bounds
  const left = Math.max(
    8,
    Math.min(
      containerWidth - noteWidth - 8,
      cx + noteWidth + 16 > containerWidth ? cx - noteWidth - 12 : cx + 12
    )
  );

  const top = Math.max(
    8,
    Math.min(
      containerHeight - noteHeight - 8,
      cy + noteHeight + 16 > containerHeight
        ? Math.max(8, cy - noteHeight + 10)
        : Math.max(8, cy - 20)
    )
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (text.trim()) {
        onSave(text.trim(), color);
      }
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSave(text.trim(), color);
    }
  };

  const colorConfig = {
    amber: {
      bg: dark ? 'bg-[#261E14]' : 'bg-[#FFFBEB]',
      border: dark ? 'border-[#6B4716]' : 'border-[#FDE68A]',
      accentText: dark ? 'text-[#F59E0B]' : 'text-[#B45309]',
    },
    accent: {
      bg: dark ? 'bg-[#29170F]' : 'bg-[#FFF7ED]',
      border: dark ? 'border-[#82330F]' : 'border-[#FED7AA]',
      accentText: dark ? 'text-[#FF9A45]' : 'text-[#C44D00]',
    },
    neutral: {
      bg: dark ? 'bg-[#1F1F1D]' : 'bg-[#FAFAF9]',
      border: dark ? 'border-[#3D3D39]' : 'border-[#E5E5E0]',
      accentText: dark ? 'text-[#D4D4D0]' : 'text-[#52525B]',
    },
  }[color];

  return (
    <div
      data-trend-sticky-overlay="true"
      className="absolute inset-0 z-30 pointer-events-auto"
      onKeyDown={handleKeyDown}
    >
      {/* Click-catcher backdrop */}
      <div
        className="absolute inset-0 bg-black/15 backdrop-blur-[0.5px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Note Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Trend note for ${point.label}`}
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-40 w-[270px] rounded-[12px] border p-3 shadow-xl transition-all ${
          colorConfig.bg
        } ${colorConfig.border} ${
          dark
            ? 'text-white shadow-[0_12px_28px_rgba(0,0,0,0.6)]'
            : 'text-[#171717] shadow-[0_12px_28px_rgba(0,0,0,0.12)]'
        }`}
        style={{ left, top }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px]" aria-hidden="true">
              📝
            </span>
            <div className="min-w-0">
              <span className={`text-[10px] font-mono-num font-semibold ${colorConfig.accentText}`}>
                {point.label}
              </span>
              {typeof point.value === 'number' && (
                <span
                  className={`ml-1 text-[9.5px] font-mono-num ${
                    dark ? 'text-[#A8A8A2]' : 'text-[#71716E]'
                  }`}
                >
                  ({formatGrowthMetricValue(point.value, unitPrefix, unitSuffix)})
                </span>
              )}
            </div>
          </div>

          {/* Color Palette Chips & Close */}
          <div className="flex items-center gap-1 shrink-0">
            {(['amber', 'accent', 'neutral'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set note color to ${c}`}
                onClick={() => setColor(c)}
                className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                  color === c
                    ? 'scale-125 ring-1 ring-offset-1 ring-black/40 dark:ring-white/40'
                    : 'opacity-60 hover:opacity-100'
                } ${
                  c === 'amber'
                    ? 'bg-[#F59E0B] border-[#D97706]'
                    : c === 'accent'
                      ? 'bg-[var(--bw-orange)] border-[#EA580C]'
                      : dark
                        ? 'bg-[#52524E] border-[#71716A]'
                        : 'bg-[#A1A1AA] border-[#71717A]'
                }`}
              />
            ))}
            <button
              type="button"
              aria-label="Close note editor"
              onClick={onClose}
              className={`ml-1 p-0.5 rounded text-[11px] leading-none transition-colors cursor-pointer ${
                dark ? 'text-[#8A8A84] hover:text-white' : 'text-[#858585] hover:text-[#171717]'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="mt-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Add context, launch observation, or campaign hypothesis..."
            className={`w-full resize-none rounded-[8px] border p-2 text-xs leading-relaxed outline-none transition-colors font-sans ${
              dark
                ? 'bg-black/20 border-white/[0.1] text-white placeholder-[#787872] focus:border-[#FF9A45]'
                : 'bg-white/80 border-[#E5E5DF] text-[#171717] placeholder-[#A3A39E] focus:border-[var(--bw-orange)]'
            }`}
          />
          <div className="mt-1 flex items-center justify-between text-[9px] font-mono-num text-[#8A8A84]">
            <span>⌘/Ctrl+↵ to save</span>
            <span className={text.length >= 260 ? 'text-[#E11D48] font-semibold' : ''}>
              {text.length}/280
            </span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mt-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
          {annotation ? (
            <button
              type="button"
              data-delete-annotation="true"
              onClick={() => onDelete?.()}
              className="text-[10px] font-mono-num text-[#DC2626] hover:text-[#B91C1C] dark:text-[#EF4444] dark:hover:text-[#F87171] transition-colors cursor-pointer"
            >
              Delete Note
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-2 py-1 rounded-[6px] text-[10.5px] font-mono-num transition-colors cursor-pointer ${
                dark ? 'text-[#A8A8A2] hover:text-white' : 'text-[#686864] hover:text-[#171717]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              data-save-annotation="true"
              disabled={!text.trim()}
              onClick={handleSaveClick}
              className={`px-2.5 py-1 rounded-[6px] text-[10.5px] font-mono-num font-medium transition-all cursor-pointer ${
                text.trim()
                  ? 'bg-[var(--bw-orange)] hover:opacity-90 text-white shadow-sm'
                  : 'bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed'
              }`}
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * GrowthTrendChart
 * Recharts-powered business performance trend visualizer styled with `--bw-orange`,
 * editorial monotone curves, Tactile Pill 7d / 30d / 90d / YTD range toggles,
 * ultra-faint horizontal hairlines, interactive sticky note annotations, and zero grid clutter.
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
  showBrushSlider = true,
  brushRange: controlledBrushRange,
  defaultBrushRange,
  onBrushChange,
  minBrushPoints = 2,
  brushSliderHeight = 32,
  allowAnnotations = true,
  annotations: controlledAnnotations,
  defaultAnnotations,
  onAnnotationsChange,
  storageKey,
  ariaLabel = 'Business growth performance trend chart',
  className = '',
}) => {
  const reduced = useReducedMotion();
  const rawId = useId().replace(/:/g, '');
  const gradientId = `bw-growth-area-${rawId}`;
  const [internalRange, setInternalRange] = useState<GrowthTimeRange>(defaultRange);
  const [internalCurveMode, setInternalCurveMode] = useState<GrowthCurveMode>(defaultCurveMode);
  const [internalBrushRange, setInternalBrushRange] = useState<[number, number] | null>(
    defaultBrushRange ?? null
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredMilestoneX, setHoveredMilestoneX] = useState<string | null>(null);
  const [selectedMilestoneX, setSelectedMilestoneX] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerBounds, setContainerBounds] = useState<{ width: number; height: number }>({
    width: 600,
    height,
  });

  const activeRange = controlledRange ?? internalRange;
  const activeCurveMode = controlledCurveMode ?? internalCurveMode;
  const curveConfig = useMemo(() => resolveCurveModeConfig(activeCurveMode), [activeCurveMode]);

  const resolvedPoints = useMemo(
    () =>
      resolveTimeRangePoints({
        range: activeRange,
        points,
        rangeSeries,
      }),
    [activeRange, points, rangeSeries]
  );

  useEffect(() => {
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerBounds({ width: rect.width, height: rect.height });
      }
    }
  }, [resolvedPoints, activeRange, height]);

  // Storage key for persistent uncontrolled trend notes
  const resolvedStorageKey = useMemo(() => {
    if (storageKey === false) return null;
    if (typeof storageKey === 'string' && storageKey.trim().length > 0) {
      return storageKey.trim();
    }
    const cleanId = (metricLabel || ariaLabel || 'default')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `bw-trend-notes-${cleanId || 'default'}`;
  }, [storageKey, metricLabel, ariaLabel]);

  const [internalAnnotations, setInternalAnnotations] = useState<GrowthTrendAnnotation[]>(() => {
    if (defaultAnnotations && defaultAnnotations.length > 0) {
      return defaultAnnotations;
    }
    if (resolvedStorageKey) {
      return loadPersistedAnnotations(resolvedStorageKey);
    }
    return [];
  });

  const currentAnnotations = controlledAnnotations ?? internalAnnotations;

  const annotationsByX = useMemo(() => {
    const map = new Map<string, GrowthTrendAnnotation>();
    for (const a of currentAnnotations) {
      map.set(a.xLabel, a);
    }
    return map;
  }, [currentAnnotations]);

  const activeBrushRange: [number, number] = useMemo(() => {
    if (controlledBrushRange) {
      return clampBrushRange(
        controlledBrushRange[0],
        controlledBrushRange[1],
        resolvedPoints.length,
        minBrushPoints
      );
    }
    if (internalBrushRange) {
      return clampBrushRange(
        internalBrushRange[0],
        internalBrushRange[1],
        resolvedPoints.length,
        minBrushPoints
      );
    }
    return [0, Math.max(0, resolvedPoints.length - 1)];
  }, [controlledBrushRange, internalBrushRange, resolvedPoints.length, minBrushPoints]);

  const handleBrushChange = (nextRange: [number, number]) => {
    const clamped = clampBrushRange(
      nextRange[0],
      nextRange[1],
      resolvedPoints.length,
      minBrushPoints
    );
    if (controlledBrushRange === undefined) {
      setInternalBrushRange(clamped);
    }
    const isZoomed = isBrushActive(clamped, resolvedPoints.length);
    const sliced = slicePointsByBrush(resolvedPoints, clamped, minBrushPoints);
    onBrushChange?.({
      startIndex: clamped[0],
      endIndex: clamped[1],
      points: sliced,
      isZoomed,
    });
  };

  const handleSelectRange = (nextRange: GrowthTimeRange) => {
    if (nextRange === activeRange) return;
    setHoveredIndex(null);
    setHoveredMilestoneX(null);
    setSelectedMilestoneX(null);
    if (controlledRange === undefined) {
      setInternalRange(nextRange);
    }
    if (controlledBrushRange === undefined) {
      setInternalBrushRange(null);
    }
    const nextPoints = resolveTimeRangePoints({
      range: nextRange,
      points,
      rangeSeries,
    });
    onBrushChange?.({
      startIndex: 0,
      endIndex: Math.max(0, nextPoints.length - 1),
      points: nextPoints,
      isZoomed: false,
    });
    onRangeChange?.(nextRange);
  };

  const handleSelectCurveMode = (nextMode: GrowthCurveMode) => {
    if (nextMode === activeCurveMode) return;
    if (controlledCurveMode === undefined) {
      setInternalCurveMode(nextMode);
    }
    onCurveModeChange?.(nextMode);
  };

  const isCurrentBrushZoomed = useMemo(
    () => isBrushActive(activeBrushRange, resolvedPoints.length),
    [activeBrushRange, resolvedPoints.length]
  );

  const visiblePoints = useMemo(
    () =>
      showBrushSlider
        ? slicePointsByBrush(resolvedPoints, activeBrushRange, minBrushPoints)
        : resolvedPoints,
    [showBrushSlider, resolvedPoints, activeBrushRange, minBrushPoints]
  );

  const activeVisibleAnnotations = useMemo(
    () => filterAnnotationsForPoints(currentAnnotations, visiblePoints),
    [currentAnnotations, visiblePoints]
  );

  const resolvedMilestones = useMemo(
    () =>
      showMilestones
        ? resolveChartMilestones({
            points: visiblePoints,
            range: activeRange,
            milestones,
            rangeMilestones,
          })
        : [],
    [showMilestones, visiblePoints, activeRange, milestones, rangeMilestones]
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

  const [activeNoteTarget, setActiveNoteTarget] = useState<{
    point: GrowthTrendPoint;
    index: number;
    cx: number;
    cy: number;
    existingAnnotation?: GrowthTrendAnnotation;
  } | null>(null);

  const handlePointSelect = (point: GrowthTrendPoint, index: number, cx: number, cy: number) => {
    if (!allowAnnotations) return;
    const existing = annotationsByX.get(point.label);
    setActiveNoteTarget({
      point,
      index,
      cx,
      cy,
      existingAnnotation: existing,
    });
  };

  const handleSaveAnnotation = (text: string, color: 'amber' | 'neutral' | 'accent') => {
    if (!activeNoteTarget) return;
    const { point, existingAnnotation } = activeNoteTarget;
    let nextAnnotations: GrowthTrendAnnotation[];
    if (existingAnnotation) {
      const updated: GrowthTrendAnnotation = {
        ...existingAnnotation,
        text: text.trim(),
        color,
        range: activeRange,
        updatedAt: new Date().toISOString(),
      };
      nextAnnotations = upsertAnnotation(currentAnnotations, updated);
    } else {
      const newAnnot = createAnnotation(point.label, text, {
        color,
        range: activeRange,
      });
      nextAnnotations = upsertAnnotation(currentAnnotations, newAnnot);
    }

    if (controlledAnnotations === undefined) {
      setInternalAnnotations(nextAnnotations);
    }
    if (resolvedStorageKey) {
      savePersistedAnnotations(resolvedStorageKey, nextAnnotations);
    }
    onAnnotationsChange?.(nextAnnotations);
    setActiveNoteTarget(null);
  };

  const handleDeleteAnnotation = () => {
    if (!activeNoteTarget?.existingAnnotation) return;
    const nextAnnotations = removeAnnotation(
      currentAnnotations,
      activeNoteTarget.existingAnnotation.id
    );
    if (controlledAnnotations === undefined) {
      setInternalAnnotations(nextAnnotations);
    }
    if (resolvedStorageKey) {
      savePersistedAnnotations(resolvedStorageKey, nextAnnotations);
    }
    onAnnotationsChange?.(nextAnnotations);
    setActiveNoteTarget(null);
  };

  const summary = useMemo(() => computeGrowthTrendSummary(visiblePoints), [visiblePoints]);
  const yTicks = useMemo(() => buildEditorialTickValues(summary.yDomain), [summary.yDomain]);
  const hasBaseline = useMemo(
    () => visiblePoints.some((p) => typeof p.baseline === 'number'),
    [visiblePoints]
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
    hoveredIndex !== null && visiblePoints[hoveredIndex]
      ? visiblePoints[hoveredIndex]
      : (summary.latest ?? visiblePoints[visiblePoints.length - 1]);
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
      {(showRangeSelector ||
        showCurveToggle ||
        (allowAnnotations && activeVisibleAnnotations.length > 0)) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {showCurveToggle ? (
              <TactileCurveModeToggle
                value={activeCurveMode}
                onChange={handleSelectCurveMode}
                dark={dark}
              />
            ) : rangeLabel ? (
              <span
                className={`${typeClass.overline} ${dark ? 'text-[#8A8A84]' : 'text-[#858585]'}`}
              >
                {rangeLabel}
              </span>
            ) : null}

            {allowAnnotations && activeVisibleAnnotations.length > 0 && (
              <span
                data-trend-note-count-pill="true"
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-num font-medium border ${
                  dark
                    ? 'bg-[#FF9A45]/10 border-[#FF9A45]/30 text-[#FF9A45]'
                    : 'bg-[#FFF8F2] border-[#FED7AA] text-[#C44D00]'
                }`}
                title={`${activeVisibleAnnotations.length} trend note${
                  activeVisibleAnnotations.length === 1 ? '' : 's'
                } in this view`}
              >
                <span className="text-[11px] leading-none" aria-hidden="true">
                  📝
                </span>
                <span>
                  {activeVisibleAnnotations.length}{' '}
                  {activeVisibleAnnotations.length === 1 ? 'Note' : 'Notes'}
                </span>
              </span>
            )}
          </div>

          {showRangeSelector && (
            <TactileRangeSelector value={activeRange} onChange={handleSelectRange} dark={dark} />
          )}
        </div>
      )}

      <div className="relative w-full min-w-0" style={{ height }} ref={chartContainerRef}>
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
                data={visiblePoints}
                margin={{
                  top: hasMilestones ? 28 : 10,
                  right: 12,
                  bottom: 2,
                  left: showYAxis ? 0 : 8,
                }}
                onClick={(state) => {
                  if (!allowAnnotations) return;
                  const s = state as
                    | { activeTooltipIndex?: number; chartX?: number; chartY?: number }
                    | null
                    | undefined;
                  if (typeof s?.activeTooltipIndex === 'number') {
                    const pt = visiblePoints[s.activeTooltipIndex];
                    if (pt) {
                      const cx =
                        typeof s.chartX === 'number' ? s.chartX : containerBounds.width / 2;
                      const cy =
                        typeof s.chartY === 'number' ? s.chartY : containerBounds.height / 2;
                      handlePointSelect(pt, s.activeTooltipIndex, cx, cy);
                    }
                  }
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
                      annotationsByX={annotationsByX}
                      allowAnnotations={allowAnnotations}
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
                      dotProps.index !== undefined ? visiblePoints[dotProps.index] : undefined;
                    const m = pt ? milestonesByX.get(pt.label) : undefined;
                    const userAnnot = pt ? annotationsByX.get(pt.label) : undefined;
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
                        total={visiblePoints.length}
                        dark={dark}
                        showAllPointDots={curveConfig.showAllPointDots}
                        milestone={showAnnotations ? m : undefined}
                        userAnnotation={userAnnot}
                        point={pt}
                        allowAnnotations={allowAnnotations}
                        isHovered={isHovered}
                        isActive={isSelected}
                        onHover={handleAnnotationHover}
                        onClickMilestone={handleAnnotationClick}
                        onPointSelect={handlePointSelect}
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

        {activeNoteTarget && (
          <TrendStickyNoteOverlay
            annotation={activeNoteTarget.existingAnnotation}
            point={activeNoteTarget.point}
            cx={activeNoteTarget.cx}
            cy={activeNoteTarget.cy}
            containerWidth={containerBounds.width}
            containerHeight={containerBounds.height}
            dark={dark}
            unitPrefix={unitPrefix}
            unitSuffix={unitSuffix}
            onSave={handleSaveAnnotation}
            onDelete={activeNoteTarget.existingAnnotation ? handleDeleteAnnotation : undefined}
            onClose={() => setActiveNoteTarget(null)}
          />
        )}
      </div>

      {showBrushSlider && resolvedPoints.length >= minBrushPoints && (
        <div className="mt-3" data-brush-slider-wrapper="true">
          <TactileBrushSlider
            points={resolvedPoints}
            startIndex={activeBrushRange[0]}
            endIndex={activeBrushRange[1]}
            onChange={handleBrushChange}
            dark={dark}
            minPoints={minBrushPoints}
            height={brushSliderHeight}
            unitPrefix={unitPrefix}
            unitSuffix={unitSuffix}
            ariaLabel={`Time-range zoom slider for ${metricLabel}`}
          />
        </div>
      )}

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
            ) : annotationsByX.has(activePoint.label) ? (
              <span
                className={`${typeClass.monoMeta} truncate ${
                  dark ? 'text-[#FF9A45]' : 'text-[#C44D00]'
                }`}
              >
                <span className="font-semibold">Note ({activePoint.label}):</span>{' '}
                <span className={`italic ${dark ? 'text-[#D6D6D0]' : 'text-[#3D3D3A]'}`}>
                  “{annotationsByX.get(activePoint.label)?.text}”
                </span>
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
                {signedDeltaPct} ({isCurrentBrushZoomed ? 'ZOOM' : activeRange.toUpperCase()})
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
