import {
  MODULAR_SCALE_BASE_PX,
  MODULAR_SCALE_RATIO,
  TYPE_TOKENS,
  TYPOGRAPHY_STEPS,
  type ModularStepKey,
  type TypographyTokenName,
} from '../../theme/typography';

export type PremiumSkeletonVariant =
  | 'metric'
  | 'insight'
  | 'pulse'
  | 'ledger'
  | 'feed'
  | 'chart';

export type PremiumSkeletonWaveTone = 'light' | 'accent' | 'dark';

export interface ModularLineMetrics {
  token: TypographyTokenName;
  stepKey: ModularStepKey;
  step: number;
  fontSizePx: number;
  barHeightPx: number;
  lineBoxHeightPx: number;
  radiusPx: number;
}

/** Optical cap-height ratio so skeleton bars match rendered Geist / JetBrains Mono glyphs */
export const OPTICAL_BAR_HEIGHT_RATIO = 0.72;

/**
 * Resolves exact structural geometry for a skeleton line from the 1.25 modular typography scale.
 * Because every barHeightPx = fontSizePx * 0.72, adjacent modular steps preserve the exact 1.25 ratio
 * while lineBoxHeightPx matches rendered line-height to eliminate cumulative layout shift (CLS).
 */
export function resolveModularLineMetrics(token: TypographyTokenName): ModularLineMetrics {
  const spec = TYPE_TOKENS[token];
  const stepMeta = TYPOGRAPHY_STEPS[spec.stepKey];
  const lineHeightMultiplier = Number(spec.lineHeight);
  const fontSizePx = stepMeta.px;
  const barHeightPx = Number((fontSizePx * OPTICAL_BAR_HEIGHT_RATIO).toFixed(2));
  const lineBoxHeightPx = Number((fontSizePx * lineHeightMultiplier).toFixed(2));
  const radiusPx = Math.max(4, Math.min(10, Math.round(fontSizePx * 0.25)));

  return {
    token,
    stepKey: spec.stepKey,
    step: stepMeta.step,
    fontSizePx,
    barHeightPx,
    lineBoxHeightPx,
    radiusPx,
  };
}

/**
 * Computes harmonic vertical rhythm derived from the 1.25 modular scale anchored at 16px.
 */
export function computeModularSpacingPx(step: number): number {
  const raw = MODULAR_SCALE_BASE_PX * Math.pow(MODULAR_SCALE_RATIO, step);
  return Number(raw.toFixed(2));
}

/**
 * Maps surface tone to the canonical BrainWise CSS shimmer classes.
 */
export function resolvePremiumWaveClass(tone: PremiumSkeletonWaveTone = 'light'): string {
  if (tone === 'dark') return 'bw-skeleton-wave-dark';
  if (tone === 'accent') return 'bw-skeleton-wave-accent';
  return 'bw-skeleton-wave';
}

/**
 * Generates deterministic, natural editorial line widths for multi-line modular skeleton blocks.
 */
export function buildStaggeredModularWidths(lines: number): string[] {
  const count = Math.max(1, Math.floor(lines));
  if (count === 1) return ['100%'];
  const preset = ['100%', '92%', '86%', '95%', '78%'];
  const widths: string[] = [];
  for (let i = 0; i < count; i += 1) {
    if (i === count - 1) {
      widths.push('66%');
    } else {
      widths.push(preset[i % preset.length]);
    }
  }
  return widths;
}
