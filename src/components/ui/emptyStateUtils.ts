import type { TopoGridDensity, TopoGridFade, TopoGridIntensity } from './topoGridUtils';

export type EmptyStateIllustrationVariant =
  | 'actions'
  | 'sprint'
  | 'signals'
  | 'experiments'
  | 'goals'
  | 'activity'
  | 'pulse'
  | 'general';

export type EmptyStateTone = 'light' | 'dark';
export type EmptyStateSize = 'compact' | 'default' | 'spacious';
export type EmptyStateSurface = 'card' | 'embedded';
export type EmptyStateLayout = 'centered' | 'split';

export interface EmptyStatePreset {
  defaultOverline: string;
  ariaLabel: string;
  topoDensity: TopoGridDensity;
  topoFade: TopoGridFade;
  topoIntensity: TopoGridIntensity;
}

export const EMPTY_STATE_PRESETS: Record<EmptyStateIllustrationVariant, EmptyStatePreset> = {
  actions: {
    defaultOverline: 'Strategic Queue · Clear',
    ariaLabel: 'Strategic alignment compass illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
  sprint: {
    defaultOverline: 'Daily Sprint · Standby',
    ariaLabel: 'Minimalist priority ledger illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
  signals: {
    defaultOverline: 'Market Watch · Listening',
    ariaLabel: 'Competitive radar waves illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'crisp',
  },
  experiments: {
    defaultOverline: 'Experiment Lab · Ready',
    ariaLabel: 'Hypothesis trajectory curves illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
  goals: {
    defaultOverline: 'Objective Tracker · Unset',
    ariaLabel: 'Growth milestone trajectory illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
  activity: {
    defaultOverline: 'Brain Log · Standby',
    ariaLabel: 'Chronological telemetry timeline illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
  pulse: {
    defaultOverline: 'Telemetry · Awaiting Baseline',
    ariaLabel: 'Performance waveform baseline illustration',
    topoDensity: 'compact',
    topoFade: 'edges',
    topoIntensity: 'crisp',
  },
  general: {
    defaultOverline: 'Workspace · Standby',
    ariaLabel: 'Architectural coordinate constellation illustration',
    topoDensity: 'default',
    topoFade: 'edges',
    topoIntensity: 'subtle',
  },
};

export function resolveEmptyStatePreset(
  variant: EmptyStateIllustrationVariant = 'general'
): EmptyStatePreset {
  return EMPTY_STATE_PRESETS[variant];
}

export function resolveEmptyStateOverline(
  variant: EmptyStateIllustrationVariant = 'general',
  customOverline?: string
): string {
  const trimmed = customOverline?.trim();
  if (trimmed) return trimmed;
  return EMPTY_STATE_PRESETS[variant].defaultOverline;
}

export function resolveEmptyStateSizeClasses(size: EmptyStateSize = 'default'): {
  containerPadding: string;
  illustrationBox: string;
  descriptionMaxW: string;
  actionsGap: string;
} {
  if (size === 'compact') {
    return {
      containerPadding: 'px-6 py-8 sm:px-7 sm:py-9',
      illustrationBox: 'w-[120px] h-[72px]',
      descriptionMaxW: 'max-w-sm',
      actionsGap: 'mt-5',
    };
  }
  if (size === 'spacious') {
    return {
      containerPadding: 'px-8 py-14 sm:px-10 sm:py-16',
      illustrationBox: 'w-[168px] h-[96px]',
      descriptionMaxW: 'max-w-md',
      actionsGap: 'mt-7',
    };
  }
  return {
    containerPadding: 'px-7 py-10 sm:px-8 sm:py-11',
    illustrationBox: 'w-[144px] h-[84px]',
    descriptionMaxW: 'max-w-md',
    actionsGap: 'mt-6',
  };
}

export function resolveEmptyStateSurfaceClasses(
  tone: EmptyStateTone = 'light',
  surface: EmptyStateSurface = 'card'
): string {
  if (tone === 'dark') {
    if (surface === 'embedded') {
      return 'rounded-[16px] border border-white/[0.08] bg-[#141413]/70 text-white';
    }
    return 'rounded-[20px] border border-[#262626] bg-[#171717] text-white bw-dark-ambient-glow';
  }

  if (surface === 'embedded') {
    return 'rounded-[18px] border border-[#EAEAE5] bg-[#FAFAF9]/85 text-[#171717]';
  }
  return 'rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] text-[#171717] bw-surface-raised';
}
