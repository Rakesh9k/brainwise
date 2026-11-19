/**
 * BrainWise Centralized Typography Scale Module
 * Enforces a strict 1.25 (Major Third) modular scale anchored at 16px (1rem)
 * across Geist (editorial display & UI) and JetBrains Mono (metrics & metadata).
 */

export const MODULAR_SCALE_BASE_PX = 16;
export const MODULAR_SCALE_RATIO = 1.25;

export const FONT_FAMILIES = {
  display: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

export type ModularStepKey =
  'step-2' | 'step-1' | 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6';

export interface ModularScaleStep {
  key: ModularStepKey;
  step: number;
  cssVar: string;
  rem: number;
  px: number;
  remString: string;
  pxString: string;
}

/**
 * Computes an exact step on the 1.25 modular scale: size = base * ratio^step.
 */
export function computeModularStep(
  step: number,
  basePx: number = MODULAR_SCALE_BASE_PX,
  ratio: number = MODULAR_SCALE_RATIO
): Omit<ModularScaleStep, 'key' | 'cssVar'> {
  const factor = Math.pow(ratio, step);
  const rawPx = basePx * factor;
  const px = Number(rawPx.toFixed(4));
  const rem = Number((rawPx / MODULAR_SCALE_BASE_PX).toFixed(6));
  return {
    step,
    rem,
    px,
    remString: `${rem}rem`,
    pxString: `${Number(px.toFixed(2))}px`,
  };
}

function buildStep(key: ModularStepKey, step: number, cssVar: string): ModularScaleStep {
  return {
    key,
    cssVar,
    ...computeModularStep(step),
  };
}

/**
 * Complete strict 1.25 modular scale ladder from step -2 (10.24px) to step 6 (61.04px).
 * Adjacent ratio: next.px / prev.px === 1.25.
 */
export const TYPOGRAPHY_STEPS: Record<ModularStepKey, ModularScaleStep> = {
  'step-2': buildStep('step-2', -2, '--bw-text-step-n2'), // 0.64rem       / 10.24px
  'step-1': buildStep('step-1', -1, '--bw-text-step-n1'), // 0.8rem        / 12.8px
  step0: buildStep('step0', 0, '--bw-text-step-0'), // 1rem          / 16px
  step1: buildStep('step1', 1, '--bw-text-step-1'), // 1.25rem       / 20px
  step2: buildStep('step2', 2, '--bw-text-step-2'), // 1.5625rem     / 25px
  step3: buildStep('step3', 3, '--bw-text-step-3'), // 1.953125rem   / 31.25px
  step4: buildStep('step4', 4, '--bw-text-step-4'), // 2.441406rem   / 39.06px
  step5: buildStep('step5', 5, '--bw-text-step-5'), // 3.051758rem   / 48.83px
  step6: buildStep('step6', 6, '--bw-text-step-6'), // 3.814697rem   / 61.04px
};

export const ORDERED_TYPOGRAPHY_STEPS: readonly ModularScaleStep[] = [
  TYPOGRAPHY_STEPS['step-2'],
  TYPOGRAPHY_STEPS['step-1'],
  TYPOGRAPHY_STEPS.step0,
  TYPOGRAPHY_STEPS.step1,
  TYPOGRAPHY_STEPS.step2,
  TYPOGRAPHY_STEPS.step3,
  TYPOGRAPHY_STEPS.step4,
  TYPOGRAPHY_STEPS.step5,
  TYPOGRAPHY_STEPS.step6,
] as const;

export type TypographyTokenName =
  | 'display'
  | 'displaySm'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'lead'
  | 'body'
  | 'bodySm'
  | 'overline'
  | 'metricLg'
  | 'metric'
  | 'metricSm'
  | 'monoMeta';

export interface TypographyTokenSpec {
  token: TypographyTokenName;
  stepKey: ModularStepKey;
  mobileStepKey?: ModularStepKey;
  weight: '400' | '500' | '600' | '700' | '800';
  lineHeight: string;
  tracking: string;
  family: 'display' | 'body' | 'mono';
  className: string;
  usage: string;
}

/**
 * Semantic editorial typography tokens mapped strictly to the 1.25 modular scale.
 * Each className corresponds to a CSS utility backed by --bw-text-step-* variables in src/index.css.
 */
export const TYPE_TOKENS: Record<TypographyTokenName, TypographyTokenSpec> = {
  display: {
    token: 'display',
    stepKey: 'step6',
    mobileStepKey: 'step4',
    weight: '800',
    lineHeight: '1.04',
    tracking: '-0.04em',
    family: 'display',
    className: 'bw-type-display',
    usage: 'Public editorial hero headline (step 4 → step 6: 39.06px → 61.04px)',
  },
  displaySm: {
    token: 'displaySm',
    stepKey: 'step5',
    mobileStepKey: 'step3',
    weight: '700',
    lineHeight: '1.08',
    tracking: '-0.035em',
    family: 'display',
    className: 'bw-type-display-sm',
    usage: 'Editorial manifesto & Bento architecture numerals (31.25px → 48.83px)',
  },
  h1: {
    token: 'h1',
    stepKey: 'step4',
    mobileStepKey: 'step3',
    weight: '700',
    lineHeight: '1.12',
    tracking: '-0.03em',
    family: 'display',
    className: 'bw-type-h1',
    usage: 'Workspace department page titles & marketing section H1/H2 (31.25px → 39.06px)',
  },
  h2: {
    token: 'h2',
    stepKey: 'step3',
    mobileStepKey: 'step2',
    weight: '700',
    lineHeight: '1.18',
    tracking: '-0.025em',
    family: 'display',
    className: 'bw-type-h2',
    usage: 'Dominant strategic insight titles & marketing section headings (25px → 31.25px)',
  },
  h3: {
    token: 'h3',
    stepKey: 'step2',
    mobileStepKey: 'step1',
    weight: '600',
    lineHeight: '1.25',
    tracking: '-0.02em',
    family: 'display',
    className: 'bw-type-h3',
    usage: 'Editorial sub-sections, journal article titles & report headers (20px → 25px)',
  },
  h4: {
    token: 'h4',
    stepKey: 'step1',
    weight: '600',
    lineHeight: '1.3',
    tracking: '-0.015em',
    family: 'display',
    className: 'bw-type-h4',
    usage: 'SectionHeader titles, card headings, modals & chart containers (20px)',
  },
  lead: {
    token: 'lead',
    stepKey: 'step1',
    mobileStepKey: 'step0',
    weight: '400',
    lineHeight: '1.55',
    tracking: '-0.01em',
    family: 'body',
    className: 'bw-type-lead',
    usage: 'Hero introductions & high-emphasis editorial summaries (16px → 20px)',
  },
  body: {
    token: 'body',
    stepKey: 'step0',
    weight: '400',
    lineHeight: '1.6',
    tracking: '0em',
    family: 'body',
    className: 'bw-type-body',
    usage: 'Primary workspace prose, subtitles, form values & card titles (16px base)',
  },
  bodySm: {
    token: 'bodySm',
    stepKey: 'step-1',
    weight: '400',
    lineHeight: '1.55',
    tracking: '0em',
    family: 'body',
    className: 'bw-type-body-sm',
    usage: 'Compact descriptions, task metadata, table cells & secondary copy (12.8px)',
  },
  overline: {
    token: 'overline',
    stepKey: 'step-2',
    weight: '600',
    lineHeight: '1.4',
    tracking: '0.08em',
    family: 'mono',
    className: 'bw-type-overline',
    usage: 'Uppercase section eyebrows, step indices & architectural labels (10.24px)',
  },
  metricLg: {
    token: 'metricLg',
    stepKey: 'step3',
    mobileStepKey: 'step2',
    weight: '700',
    lineHeight: '1.1',
    tracking: '-0.025em',
    family: 'display',
    className: 'bw-type-metric-lg',
    usage: 'Primary KPI callouts & Bento telemetry figures (25px → 31.25px tabular)',
  },
  metric: {
    token: 'metric',
    stepKey: 'step2',
    weight: '700',
    lineHeight: '1.15',
    tracking: '-0.02em',
    family: 'display',
    className: 'bw-type-metric',
    usage: 'Standard MetricCard values & TAM/SAM/SOM figures (25px tabular)',
  },
  metricSm: {
    token: 'metricSm',
    stepKey: 'step1',
    weight: '700',
    lineHeight: '1.2',
    tracking: '-0.015em',
    family: 'display',
    className: 'bw-type-metric-sm',
    usage: 'Compact Pulse KPI values & long-string metric states (20px tabular)',
  },
  monoMeta: {
    token: 'monoMeta',
    stepKey: 'step-1',
    weight: '500',
    lineHeight: '1.45',
    tracking: '0em',
    family: 'mono',
    className: 'bw-type-mono-meta',
    usage: 'Tabular timestamps, token names, badges & sizing readouts (12.8px mono)',
  },
};

/**
 * Concise utility class lookup for components.
 */
export const typeClass: Record<TypographyTokenName, string> = {
  display: TYPE_TOKENS.display.className,
  displaySm: TYPE_TOKENS.displaySm.className,
  h1: TYPE_TOKENS.h1.className,
  h2: TYPE_TOKENS.h2.className,
  h3: TYPE_TOKENS.h3.className,
  h4: TYPE_TOKENS.h4.className,
  lead: TYPE_TOKENS.lead.className,
  body: TYPE_TOKENS.body.className,
  bodySm: TYPE_TOKENS.bodySm.className,
  overline: TYPE_TOKENS.overline.className,
  metricLg: TYPE_TOKENS.metricLg.className,
  metric: TYPE_TOKENS.metric.className,
  metricSm: TYPE_TOKENS.metricSm.className,
  monoMeta: TYPE_TOKENS.monoMeta.className,
};

/**
 * Generates canonical :root CSS custom property lines for the strict 1.25 scale.
 */
export function exportTypographyCssVars(): string {
  const stepLines = ORDERED_TYPOGRAPHY_STEPS.map(
    (s) => `  ${s.cssVar}: ${s.remString}; /* ${s.pxString} (1.25^${s.step}) */`
  );
  return [
    `  --bw-type-ratio: ${MODULAR_SCALE_RATIO};`,
    `  --bw-type-base: ${MODULAR_SCALE_BASE_PX}px;`,
    ...stepLines,
  ].join('\n');
}
