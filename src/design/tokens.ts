/**
 * BrainWise Frozen Design System Tokens (v1.0 — Design Freeze)
 * Canonical single source of truth for colors, typography, spacing,
 * radii, elevation, and liquid motion curves across engineering.
 */

import {
  FONT_FAMILIES,
  MODULAR_SCALE_BASE_PX,
  MODULAR_SCALE_RATIO,
  TYPE_TOKENS,
  TYPOGRAPHY_STEPS,
  exportTypographyCssVars,
} from '../theme/typography';

export const BW_DESIGN_FREEZE_VERSION = '1.0.0-frozen';

export const BW_COLORS = {
  canvas: {
    primary: '#FFFFFF',
    secondary: '#FAFAF9',
    subtle: '#F1F1EF',
    border: '#E6E6E2',
    borderStrong: '#D6D6D0',
  },
  charcoal: {
    deep: '#171717',
    graphite: '#252525',
    bodyMuted: '#5C5C58',
    secondary: '#858585',
  },
  accent: {
    orange: '#FF7417',
    orangeWarm: '#FF9A45',
    orangeHover: '#E55F08',
    orangeAccessibleText: '#C44D00',
    orangePale: '#FFF0E5',
  },
  semantic: {
    success: '#24724E',
    successBg: '#ECF7F1',
    warning: '#A85E16',
    warningBg: '#FDF4EA',
    error: '#BC3E3E',
    errorBg: '#FDF0F0',
  },
} as const;

export const BW_TYPOGRAPHY = {
  ratio: MODULAR_SCALE_RATIO,
  basePx: MODULAR_SCALE_BASE_PX,
  families: FONT_FAMILIES,
  scale: Object.values(TYPE_TOKENS).map((spec) => {
    const desktop = TYPOGRAPHY_STEPS[spec.stepKey];
    const mobile = spec.mobileStepKey ? TYPOGRAPHY_STEPS[spec.mobileStepKey] : null;
    return {
      token: spec.token,
      className: spec.className,
      step: desktop.step,
      size: mobile
        ? `${mobile.pxString} → ${desktop.pxString} (${desktop.remString})`
        : `${desktop.pxString} (${desktop.remString})`,
      weight: spec.weight,
      lineHeight: spec.lineHeight,
      tracking: spec.tracking,
      usage: spec.usage,
    };
  }),
} as const;

export const BW_SPACING = {
  unitPx: 4,
  scale: [
    { token: '--bw-space-1', px: '4px', value: 4, usage: 'Micro inline icon gaps' },
    { token: '--bw-space-2', px: '8px', value: 8, usage: 'Compact control gaps & button internal vertical padding' },
    { token: '--bw-space-3', px: '12px', value: 12, usage: 'Form field rhythm & tight list items' },
    { token: '--bw-space-4', px: '16px', value: 16, usage: 'Minimum card outer padding & toolbar spacing' },
    { token: '--bw-space-5', px: '20px', value: 20, usage: 'Card inner spacing & medium component gaps' },
    { token: '--bw-space-6', px: '24px', value: 24, usage: 'Standard panel padding & section grid gutters' },
    { token: '--bw-space-8', px: '32px', value: 32, usage: 'Primary workspace vertical section cadence' },
    { token: '--bw-space-10', px: '40px', value: 40, usage: 'Large component separation & hero margins' },
    { token: '--bw-space-12', px: '48px', value: 48, usage: 'Major department section padding' },
    { token: '--bw-space-16', px: '64px', value: 64, usage: 'Landing page section vertical separation' },
    { token: '--bw-space-20', px: '80px', value: 80, usage: 'Executive display and hero vertical breathing room' },
  ],
  values: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const,
} as const;

export const BW_RADII = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  full: '9999px',
} as const;

export const BW_LAYOUT = {
  sidebarWidthExpanded: '256px',
  sidebarWidthCollapsed: '72px',
  headerHeight: '64px',
  containerMaxWidth: '1440px',
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  zIndex: {
    base: 0,
    elevated: 10,
    dropdown: 20,
    sticky: 30,
    drawer: 40,
    modal: 50,
    popover: 60,
    toast: 70,
  },
} as const;

export const BW_ELEVATION = {
  raised: 'var(--bw-shadow-raised)',
  elevated: 'var(--bw-shadow-elevated)',
  surfaceElevated: 'var(--bw-surface-elevated)',
  inset: 'var(--bw-shadow-inset)',
  orangeGlowSubtle: 'var(--bw-glow-orange-subtle)',
} as const;

export const BW_FOCUS_RING = {
  color: 'var(--bw-orange)',
  offsetColor: 'var(--bw-focus-ring-offset)',
  shadow: 'var(--bw-focus-ring)',
  utilityClasses: {
    default: 'focus-ring',
    dark: 'focus-ring focus-ring-dark',
    inset: 'focus-ring-inset',
  },
} as const;

export const BW_FROSTED_GLASS = {
  background: 'rgba(255, 255, 255, 0.76)',
  elevatedBackground: 'rgba(255, 255, 255, 0.84)',
  border: 'rgba(230, 230, 226, 0.78)',
  blur: '14px',
  utilityClasses: {
    nav: 'bw-frosted-nav',
    elevated: 'bw-frosted-nav-elevated',
  },
} as const;

export const BW_MOTION = {
  easing: {
    liquid: [0.16, 1, 0.3, 1] as const,
    smooth: [0.22, 1, 0.36, 1] as const,
  },
  durationsMs: {
    fast: 140,
    base: 220,
    slow: 360,
  },
  primitives: [
    { name: 'DepartmentTransition', role: 'Cross-fade + 6px vertical settle on workspace navigation' },
    { name: 'AiRequestPulse', role: 'Restrained orange ambient orb & sweep during live AI synthesis' },
    { name: 'LiquidSkeletonReveal', role: 'Shape-matched liquid shimmer skeleton that morphs smoothly into fetched content' },
    { name: 'ProgressiveResultReveal', role: 'Staggered 45ms reveal for generated dossiers, logos, and slides' },
    { name: 'InsightSavedBeacon', role: 'Crisp emerald confirmation pill-free status on Brain sync' },
    { name: 'RecommendationActionSurface', role: 'Tactile focus surface for high-leverage AI actions' },
    { name: 'TaskCompleteRowTransition', role: 'Micro-settle completion state for sprint checklists' },
    { name: 'ActionFeedbackBanner', role: 'Inline alert/success surface for errors and recovery' },
  ],
} as const;

export function exportFrozenTokensCss(): string {
  return `:root {\n  /* BrainWise Design System v${BW_DESIGN_FREEZE_VERSION} */\n  --bw-bg-primary: ${BW_COLORS.canvas.primary};\n  --bw-bg-secondary: ${BW_COLORS.canvas.secondary};\n  --bw-bg-subtle: ${BW_COLORS.canvas.subtle};\n  --bw-border: ${BW_COLORS.canvas.border};\n  --bw-dark: ${BW_COLORS.charcoal.deep};\n  --bw-text-primary: ${BW_COLORS.charcoal.graphite};\n  --bw-text-body-muted: ${BW_COLORS.charcoal.bodyMuted};\n  --bw-orange: ${BW_COLORS.accent.orange};\n  --bw-orange-warm: ${BW_COLORS.accent.orangeWarm};\n  --bw-orange-text: ${BW_COLORS.accent.orangeAccessibleText};\n  --bw-orange-light: ${BW_COLORS.accent.orangePale};\n  --bw-font-sans: ${BW_TYPOGRAPHY.families.display};\n  --bw-font-mono: ${BW_TYPOGRAPHY.families.mono};\n${exportTypographyCssVars()}\n  --bw-radius-md: ${BW_RADII.md};\n  --bw-radius-lg: ${BW_RADII.lg};\n  --bw-surface-elevated: inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 0 0 1px rgba(255, 255, 255, 0.65), 0 4px 12px rgba(23, 23, 23, 0.045), 0 28px 64px -20px rgba(23, 23, 23, 0.16);\n  --bw-glass-bg: ${BW_FROSTED_GLASS.background};\n  --bw-glass-bg-elevated: ${BW_FROSTED_GLASS.elevatedBackground};\n  --bw-glass-border: ${BW_FROSTED_GLASS.border};\n  --bw-glass-blur: ${BW_FROSTED_GLASS.blur};\n  --bw-focus-ring-offset: var(--bw-bg-primary);\n  --bw-focus-ring: 0 0 0 2px var(--bw-focus-ring-offset), 0 0 0 4.5px var(--bw-orange), 0 0 0 6.5px rgba(196, 77, 0, 0.18);\n  --bw-ease-liquid: cubic-bezier(0.16, 1, 0.3, 1);\n}`;
}
