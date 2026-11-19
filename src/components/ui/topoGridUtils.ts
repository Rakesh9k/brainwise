import type { CSSProperties } from 'react';

export type TopoGridTone = 'light' | 'dark';
export type TopoGridFade = 'none' | 'edges' | 'top-radial' | 'bottom';
export type TopoGridDensity = 'compact' | 'default' | 'wide';
export type TopoGridIntensity = 'whisper' | 'subtle' | 'crisp';
export type TopoGridPlacement = 'absolute' | 'fixed';

export const TOPO_GRID_TONE_CLASSES: Record<TopoGridTone, string> = {
  light: 'bw-topo-grid',
  dark: 'bw-topo-grid-dark',
};

export const TOPO_GRID_DENSITY_SIZES: Record<TopoGridDensity, string | undefined> = {
  compact: '24px 24px',
  default: undefined, // Preserves native 32px 32px cadence from .bw-topo-grid
  wide: '40px 40px',
};

export const TOPO_GRID_INTENSITY_OPACITY: Record<TopoGridIntensity, number> = {
  whisper: 0.65,
  subtle: 0.85,
  crisp: 1,
};

export const TOPO_GRID_FADE_MASKS: Record<TopoGridFade, string | undefined> = {
  none: undefined,
  edges: 'radial-gradient(ellipse 88% 82% at 50% 42%, #000000 58%, transparent 100%)',
  'top-radial': 'radial-gradient(ellipse 96% 74% at 50% 0%, #000000 50%, transparent 100%)',
  bottom: 'linear-gradient(180deg, #000000 0%, #000000 72%, transparent 100%)',
};

export function resolveTopoGridToneClass(tone: TopoGridTone = 'light'): string {
  return TOPO_GRID_TONE_CLASSES[tone];
}

export function resolveTopoGridClassName(options: {
  tone?: TopoGridTone;
  placement?: TopoGridPlacement;
  rounded?: boolean;
  className?: string;
}): string {
  const { tone = 'light', placement = 'absolute', rounded = true, className = '' } = options;

  const classes = [
    'pointer-events-none',
    'select-none',
    'z-0',
    placement === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
    resolveTopoGridToneClass(tone),
    rounded ? 'rounded-[inherit]' : '',
    className.trim(),
  ].filter(Boolean);

  return classes.join(' ');
}

export function buildTopoGridStyle(options: {
  fade?: TopoGridFade;
  density?: TopoGridDensity;
  intensity?: TopoGridIntensity;
  style?: CSSProperties;
}): CSSProperties {
  const { fade = 'edges', density = 'default', intensity = 'subtle', style } = options;

  const mask = TOPO_GRID_FADE_MASKS[fade];
  const size = TOPO_GRID_DENSITY_SIZES[density];
  const opacity = TOPO_GRID_INTENSITY_OPACITY[intensity];

  const computed: CSSProperties = {
    opacity,
    ...(size ? { backgroundSize: size } : {}),
    ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : {}),
    ...style,
  };

  return computed;
}
