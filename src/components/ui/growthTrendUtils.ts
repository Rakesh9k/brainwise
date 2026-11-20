export type GrowthTimeRange = '7d' | '30d' | '90d' | 'ytd';

export type GrowthCurveMode = 'smooth' | 'raw';

export interface GrowthCurveModeOption {
  id: GrowthCurveMode;
  label: string;
  ariaLabel: string;
}

export const GROWTH_CURVE_MODE_OPTIONS: readonly GrowthCurveModeOption[] = [
  { id: 'smooth', label: 'Spline', ariaLabel: 'Smooth spline interpolation' },
  { id: 'raw', label: 'Raw', ariaLabel: 'Raw data points' },
] as const;

export interface GrowthCurveModeConfig {
  mode: GrowthCurveMode;
  areaType: 'monotone' | 'linear';
  showAllPointDots: boolean;
  strokeWidth: number;
  modeLabel: string;
}

export function resolveCurveModeConfig(mode: GrowthCurveMode): GrowthCurveModeConfig {
  if (mode === 'raw') {
    return {
      mode: 'raw',
      areaType: 'linear',
      showAllPointDots: true,
      strokeWidth: 1.85,
      modeLabel: 'Raw',
    };
  }

  return {
    mode: 'smooth',
    areaType: 'monotone',
    showAllPointDots: false,
    strokeWidth: 2.25,
    modeLabel: 'Spline',
  };
}

export interface GrowthTimeRangeOption {
  id: GrowthTimeRange;
  label: string;
  ariaLabel: string;
}

export const GROWTH_TIME_RANGE_OPTIONS: readonly GrowthTimeRangeOption[] = [
  { id: '7d', label: '7d', ariaLabel: 'Last 7 days' },
  { id: '30d', label: '30d', ariaLabel: 'Last 30 days' },
  { id: '90d', label: '90d', ariaLabel: 'Last 90 days' },
  { id: 'ytd', label: 'YTD', ariaLabel: 'Year to date' },
] as const;

export interface GrowthTrendPoint {
  label: string;
  value: number;
  baseline?: number;
  detail?: string;
  /** Optional short editorial milestone event label anchored at this X-axis point. */
  milestone?: string;
  /** Optional milestone emphasis tone (`'neutral'` default or `'accent'` for `--bw-orange`). */
  milestoneTone?: 'neutral' | 'accent';
  /** Optional detailed milestone description revealed on interactive marker hover. */
  milestoneDetail?: string;
  /** Optional milestone category or impact metric badge (e.g. "+34% ARR", "Product Launch"). */
  milestoneImpact?: string;
}

export interface GrowthTrendMilestone {
  /** Matching X-axis point `label` (e.g. `'W2'`, `'Oct'`, `'Nov 1'`). */
  xLabel: string;
  /** Short editorial event label rendered with `.bw-type-mono-meta`. */
  label: string;
  /** Visual emphasis tone (`'neutral'` default or `'accent'` for `--bw-orange`). */
  tone?: 'neutral' | 'accent';
  /** Optional detailed milestone description revealed on interactive marker hover. */
  detail?: string;
  /** Optional milestone category or impact metric badge (e.g. "+34% ARR", "Product Launch"). */
  impact?: string;
}

export interface ResolvedGrowthMilestone extends GrowthTrendMilestone {
  tone: 'neutral' | 'accent';
  pointIndex: number;
  /** Horizontal label anchor preventing edge clipping on first/last points. */
  alignment: 'start' | 'middle' | 'end';
  detail?: string;
  impact?: string;
}

export type GrowthTrendSeriesMap = Partial<Record<GrowthTimeRange, GrowthTrendPoint[]>>;
export type GrowthTrendMilestonesMap = Partial<Record<GrowthTimeRange, GrowthTrendMilestone[]>>;

export interface GrowthTrendSummary {
  count: number;
  first: GrowthTrendPoint | null;
  latest: GrowthTrendPoint | null;
  min: number;
  max: number;
  delta: number;
  deltaPercent: number | null;
  trend: 'up' | 'down' | 'flat';
  yDomain: [number, number];
}

export function formatGrowthMetricValue(value: number, prefix = '', suffix = ''): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs)
    ? abs.toLocaleString('en-US')
    : abs.toLocaleString('en-US', { maximumFractionDigits: 1 });

  if (isNegative) {
    return `-${prefix}${formatted}${suffix}`;
  }
  return `${prefix}${formatted}${suffix}`;
}

export function formatSignedDeltaPercent(deltaPercent: number | null): string | null {
  if (deltaPercent === null || !Number.isFinite(deltaPercent)) return null;
  const rounded = Math.round(deltaPercent * 10) / 10;
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/**
 * Resolves the active point series for a given time range.
 * Uses explicit `rangeSeries[range]` when provided; otherwise derives a deterministic
 * range-scaled curve anchored to `points` so any chart supports 7d / 30d / 90d / YTD cleanly.
 */
export function resolveTimeRangePoints(options: {
  range: GrowthTimeRange;
  points?: GrowthTrendPoint[];
  rangeSeries?: GrowthTrendSeriesMap;
}): GrowthTrendPoint[] {
  const { range, points = [], rangeSeries } = options;

  const explicit = rangeSeries?.[range];
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (points.length === 0) {
    return [];
  }

  if (range === '30d') {
    return points;
  }

  const latest = points[points.length - 1];
  const anchorVal = latest.value;
  const hasBaseline = typeof latest.baseline === 'number';
  const anchorBase = latest.baseline ?? anchorVal * 0.9;

  const buildScaled = (
    labels: string[],
    multipliers: number[],
    baseMultipliers: number[]
  ): GrowthTrendPoint[] =>
    labels.map((label, idx) => ({
      label,
      value: Math.round(anchorVal * multipliers[idx]),
      ...(hasBaseline ? { baseline: Math.round(anchorBase * baseMultipliers[idx]) } : {}),
    }));

  if (range === '7d') {
    return buildScaled(
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      [0.86, 0.89, 0.88, 0.92, 0.95, 0.98, 1],
      [0.85, 0.87, 0.89, 0.91, 0.94, 0.97, 1]
    );
  }

  if (range === '90d') {
    return buildScaled(
      ['Sep 1', 'Sep 20', 'Oct 10', 'Nov 1', 'Now'],
      [0.54, 0.66, 0.78, 0.89, 1],
      [0.52, 0.64, 0.76, 0.88, 1]
    );
  }

  // ytd
  return buildScaled(
    ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Now'],
    [0.24, 0.38, 0.54, 0.71, 0.86, 1],
    [0.25, 0.4, 0.55, 0.7, 0.85, 1]
  );
}

export function computeGrowthTrendSummary(points: GrowthTrendPoint[]): GrowthTrendSummary {
  if (!points.length) {
    return {
      count: 0,
      first: null,
      latest: null,
      min: 0,
      max: 0,
      delta: 0,
      deltaPercent: null,
      trend: 'flat',
      yDomain: [0, 100],
    };
  }

  const allValues: number[] = [];
  for (const pt of points) {
    allValues.push(pt.value);
    if (typeof pt.baseline === 'number' && Number.isFinite(pt.baseline)) {
      allValues.push(pt.baseline);
    }
  }

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const first = points[0];
  const latest = points[points.length - 1];
  const delta = Number((latest.value - first.value).toFixed(2));
  const deltaPercent =
    first.value !== 0
      ? Number((((latest.value - first.value) / Math.abs(first.value)) * 100).toFixed(1))
      : null;

  const trend: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(max) * 0.2, 4) : span * 0.18;
  const domainMin = min >= 0 ? Math.max(0, Math.floor(min - pad)) : Math.floor(min - pad);
  const domainMax = Math.ceil(max + pad);

  return {
    count: points.length,
    first,
    latest,
    min,
    max,
    delta,
    deltaPercent,
    trend,
    yDomain: [domainMin, domainMax === domainMin ? domainMin + 10 : domainMax],
  };
}

/**
 * Generates minimal, uncluttered horizontal reference ticks (max 3 hairlines).
 */
export function buildEditorialTickValues(yDomain: [number, number]): number[] {
  const [low, high] = yDomain;
  const mid = Math.round((low + high) / 2);
  if (low === high || mid === low || mid === high) {
    return [low, high];
  }
  return [low, mid, high];
}

/**
 * Resolves valid milestone annotations for the active point series.
 * Combines explicit `rangeMilestones[range]`, `milestones`, and inline `point.milestone`
 * tags, filters to points present on the current X-axis, deduplicates by `xLabel`,
 * and computes edge-safe horizontal alignment (`start` / `middle` / `end`).
 */
export function resolveChartMilestones(options: {
  points: GrowthTrendPoint[];
  range: GrowthTimeRange;
  milestones?: GrowthTrendMilestone[];
  rangeMilestones?: GrowthTrendMilestonesMap;
}): ResolvedGrowthMilestone[] {
  const { points, range, milestones = [], rangeMilestones } = options;
  if (points.length === 0) return [];

  const indexByLabel = new Map<string, number>();
  points.forEach((pt, idx) => {
    if (!indexByLabel.has(pt.label)) {
      indexByLabel.set(pt.label, idx);
    }
  });

  const candidates: GrowthTrendMilestone[] = [
    ...(rangeMilestones?.[range] ?? []),
    ...milestones,
    ...points
      .filter((pt): pt is GrowthTrendPoint & { milestone: string } => Boolean(pt.milestone?.trim()))
      .map((pt) => ({
        xLabel: pt.label,
        label: pt.milestone.trim(),
        tone: pt.milestoneTone ?? 'neutral',
        detail: pt.milestoneDetail?.trim() || pt.detail?.trim(),
        impact: pt.milestoneImpact?.trim(),
      })),
  ];

  const seenX = new Set<string>();
  const resolved: ResolvedGrowthMilestone[] = [];
  const lastIdx = points.length - 1;

  for (const item of candidates) {
    const cleanLabel = item.label.trim();
    if (!cleanLabel || seenX.has(item.xLabel)) continue;
    const pointIndex = indexByLabel.get(item.xLabel);
    if (pointIndex === undefined) continue;

    seenX.add(item.xLabel);
    const alignment: 'start' | 'middle' | 'end' =
      pointIndex === 0 ? 'start' : pointIndex === lastIdx ? 'end' : 'middle';
    const point = points[pointIndex];
    const resolvedDetail =
      item.detail?.trim() || point?.milestoneDetail?.trim() || point?.detail?.trim();
    const resolvedImpact = item.impact?.trim() || point?.milestoneImpact?.trim();

    resolved.push({
      xLabel: item.xLabel,
      label: cleanLabel,
      tone: item.tone ?? 'neutral',
      pointIndex,
      alignment,
      detail: resolvedDetail || undefined,
      impact: resolvedImpact || undefined,
    });
  }

  return resolved.sort((a, b) => a.pointIndex - b.pointIndex);
}

/**
 * Finds a resolved milestone matching a specific point's X-axis label.
 */
export function findMilestoneForPoint(
  milestones: readonly ResolvedGrowthMilestone[] | undefined,
  pointLabel: string
): ResolvedGrowthMilestone | undefined {
  if (!milestones || milestones.length === 0) return undefined;
  return milestones.find((m) => m.xLabel === pointLabel);
}

/**
 * Clamps brush start and end index bounds safely within `[0, totalPoints - 1]`.
 * Ensures `startIndex <= endIndex` and preserves the minimum selection span `minPoints`.
 */
export function clampBrushRange(
  startIndex: number,
  endIndex: number,
  totalPoints: number,
  minPoints = 2
): [number, number] {
  if (totalPoints <= 0) return [0, 0];
  const maxIdx = totalPoints - 1;
  const effectiveMin = Math.min(Math.max(1, minPoints), totalPoints);

  let start = Math.max(0, Math.min(startIndex, maxIdx));
  let end = Math.max(0, Math.min(endIndex, maxIdx));

  if (start > end) {
    [start, end] = [end, start];
  }

  if (end - start + 1 < effectiveMin) {
    if (start + effectiveMin - 1 <= maxIdx) {
      end = start + effectiveMin - 1;
    } else {
      end = maxIdx;
      start = Math.max(0, end - effectiveMin + 1);
    }
  }

  return [start, end];
}

/**
 * Slices the active point series according to the brush selection window.
 * Returns the full dataset when brushRange is omitted or null.
 */
export function slicePointsByBrush(
  points: GrowthTrendPoint[],
  brushRange: [number, number] | null | undefined,
  minPoints = 2
): GrowthTrendPoint[] {
  if (!points || points.length === 0) return [];
  if (!brushRange) return points;
  const [start, end] = clampBrushRange(brushRange[0], brushRange[1], points.length, minPoints);
  return points.slice(start, end + 1);
}

/**
 * Determines whether the brush range represents an active zoomed subset
 * rather than the full span of data points.
 */
export function isBrushActive(
  brushRange: [number, number] | null | undefined,
  totalPoints: number
): boolean {
  if (!brushRange || totalPoints <= 0) return false;
  return brushRange[0] > 0 || brushRange[1] < totalPoints - 1;
}

/**
 * Maps an interactive pointer clientX position on a slider track to the nearest point index.
 */
export function indexFromClientX(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  totalPoints: number
): number {
  if (totalPoints <= 1 || rectWidth <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, (clientX - rectLeft) / rectWidth));
  return Math.min(totalPoints - 1, Math.round(ratio * (totalPoints - 1)));
}

/**
 * Generates lightweight SVG path strings (area and stroke line) for the mini-overview
 * sparkline inside the brush slider track.
 */
export function buildBrushSparklinePath(
  points: GrowthTrendPoint[],
  width = 100,
  height = 32,
  padding = { top: 3, bottom: 3 }
): { areaPath: string; linePath: string } {
  if (!points || points.length === 0 || width <= 0 || height <= 0) {
    return { areaPath: '', linePath: '' };
  }

  if (points.length === 1) {
    const y = Number((height / 2).toFixed(2));
    return {
      linePath: `M 0 ${y} L ${width} ${y}`,
      areaPath: `M 0 ${y} L ${width} ${y} L ${width} ${height} L 0 ${height} Z`,
    };
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal || 1;
  const effectiveHeight = Math.max(1, height - padding.top - padding.bottom);

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - padding.bottom - ((p.value - minVal) / span) * effectiveHeight;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const linePath = coords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return { areaPath, linePath };
}

export interface GrowthTrendAnnotation {
  id: string;
  xLabel: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  color?: 'amber' | 'neutral' | 'accent';
  range?: GrowthTimeRange;
}

/**
 * Creates a new trend annotation with a generated unique ID and ISO timestamp.
 */
export function createAnnotation(
  xLabel: string,
  text: string,
  options?: Partial<Omit<GrowthTrendAnnotation, 'id' | 'xLabel' | 'text'>>
): GrowthTrendAnnotation {
  const timestamp = new Date().toISOString();
  return {
    id: `annot-${xLabel}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    xLabel: xLabel.trim(),
    text: text.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    color: options?.color ?? 'amber',
    range: options?.range,
    author: options?.author ?? 'Strategist',
  };
}

/**
 * Inserts or updates an annotation for a given xLabel.
 * If an annotation for this xLabel already exists, it updates its text and updatedAt.
 * Otherwise, it appends the new annotation.
 */
export function upsertAnnotation(
  annotations: readonly GrowthTrendAnnotation[] | undefined,
  annotation: GrowthTrendAnnotation
): GrowthTrendAnnotation[] {
  const current = annotations ? [...annotations] : [];
  const existingIdx = current.findIndex(
    (a) => a.id === annotation.id || a.xLabel === annotation.xLabel
  );

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      ...annotation,
      updatedAt: new Date().toISOString(),
    };
    return current;
  }

  return [...current, annotation];
}

/**
 * Removes an annotation by ID or xLabel.
 */
export function removeAnnotation(
  annotations: readonly GrowthTrendAnnotation[] | undefined,
  idOrXLabel: string
): GrowthTrendAnnotation[] {
  if (!annotations || annotations.length === 0) return [];
  return annotations.filter((a) => a.id !== idOrXLabel && a.xLabel !== idOrXLabel);
}

/**
 * Finds an annotation matching a point's xLabel.
 */
export function findAnnotationForPoint(
  annotations: readonly GrowthTrendAnnotation[] | undefined,
  pointLabel: string
): GrowthTrendAnnotation | undefined {
  if (!annotations || annotations.length === 0) return undefined;
  return annotations.find((a) => a.xLabel === pointLabel);
}

/**
 * Filters annotations that match any point in the provided points series.
 */
export function filterAnnotationsForPoints(
  annotations: readonly GrowthTrendAnnotation[] | undefined,
  points: readonly GrowthTrendPoint[] | undefined
): GrowthTrendAnnotation[] {
  if (!annotations || !points || annotations.length === 0 || points.length === 0) return [];
  const labelSet = new Set(points.map((p) => p.label));
  return annotations.filter((a) => labelSet.has(a.xLabel));
}

/**
 * Safely loads persisted annotations from localStorage.
 */
export function loadPersistedAnnotations(storageKey: string): GrowthTrendAnnotation[] {
  if (typeof window === 'undefined' || !storageKey) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is GrowthTrendAnnotation =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.xLabel === 'string' &&
          typeof item.text === 'string'
      );
    }
  } catch {
    // Non-blocking fallback on storage read errors or corrupted JSON
  }
  return [];
}

/**
 * Safely saves annotations to localStorage.
 */
export function savePersistedAnnotations(
  storageKey: string,
  annotations: GrowthTrendAnnotation[]
): void {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(annotations));
  } catch {
    // Non-blocking fallback on quota exceeded or restricted storage
  }
}
