import React from 'react';
import { typeClass } from '../../theme/typography';
import { LiquidButton } from '../motion/LiquidMotion';
import { TopoGridOverlay } from './TopoGridOverlay';
import {
  type EmptyStateIllustrationVariant,
  type EmptyStateLayout,
  type EmptyStateSize,
  type EmptyStateSurface,
  type EmptyStateTone,
  resolveEmptyStateOverline,
  resolveEmptyStatePreset,
  resolveEmptyStateSizeClasses,
  resolveEmptyStateSurfaceClasses,
} from './emptyStateUtils';

export type {
  EmptyStateIllustrationVariant,
  EmptyStateLayout,
  EmptyStateSize,
  EmptyStateSurface,
  EmptyStateTone,
};

interface PaletteTokens {
  surface: string;
  surfaceMuted: string;
  stroke: string;
  strokeSoft: string;
  ink: string;
  accent: string;
  accentWash: string;
}

function getIllustrationPalette(tone: EmptyStateTone): PaletteTokens {
  if (tone === 'dark') {
    return {
      surface: '#1F1F1D',
      surfaceMuted: '#272724',
      stroke: '#52524D',
      strokeSoft: '#333330',
      ink: '#F4F4F1',
      accent: '#FF7417',
      accentWash: 'rgba(255, 116, 23, 0.18)',
    };
  }
  return {
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F2',
    stroke: '#C8C8C1',
    strokeSoft: '#E6E6E0',
    ink: '#171717',
    accent: '#FF7417',
    accentWash: '#FFF0E5',
  };
}

/**
 * EmptyStateIllustration
 * Architectural, hairline-precision SVG illustrations engineered for BrainWise's
 * porcelain / obsidian / signal-orange analytical aesthetic.
 */
export const EmptyStateIllustration: React.FC<{
  variant?: EmptyStateIllustrationVariant;
  tone?: EmptyStateTone;
  className?: string;
}> = ({ variant = 'general', tone = 'light', className = 'w-[144px] h-[84px]' }) => {
  const p = getIllustrationPalette(tone);
  const preset = resolveEmptyStatePreset(variant);

  return (
    <svg
      viewBox="0 0 160 92"
      fill="none"
      role="img"
      aria-label={preset.ariaLabel}
      className={`shrink-0 ${className}`}
    >
      {variant === 'actions' && (
        <>
          {/* Precision Strategic Compass / Vector Alignment */}
          <line x1="22" y1="46" x2="138" y2="46" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2 3" />
          <line x1="80" y1="10" x2="80" y2="82" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="80" cy="46" r="30" fill={p.surface} stroke={p.strokeSoft} strokeWidth="1" />
          <circle cx="80" cy="46" r="20" stroke={p.stroke} strokeWidth="1.15" strokeDasharray="3 3" />
          <path d="M80 28L86 46L80 64L74 46Z" fill={p.surfaceMuted} stroke={p.ink} strokeWidth="1.25" strokeLinejoin="round" />
          <path d="M80 28L86 46L80 46Z" fill={p.ink} />
          <circle cx="110" cy="24" r="6" fill={p.accentWash} />
          <circle cx="110" cy="24" r="2.75" fill={p.accent} />
          <path d="M85 41L105 27" stroke={p.stroke} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="80" cy="46" r="2.2" fill={p.surface} stroke={p.ink} strokeWidth="1.2" />
        </>
      )}

      {variant === 'sprint' && (
        <>
          {/* Minimalist Rhythm Ledger & Check-Ring */}
          <rect x="26" y="14" width="108" height="64" rx="12" fill={p.surface} stroke={p.stroke} strokeWidth="1.15" />
          <line x1="40" y1="31" x2="120" y2="31" stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="40" y1="48" x2="120" y2="48" stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="40" y1="65" x2="120" y2="65" stroke={p.strokeSoft} strokeWidth="1" />
          <circle cx="46" cy="23" r="4" fill={p.ink} />
          <path d="M44.3 23L45.6 24.3L48 21.8" stroke={p.surface} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="56" y="21" width="44" height="3.5" rx="1.75" fill={p.ink} />
          <circle cx="46" cy="40" r="4" fill={p.surfaceMuted} stroke={p.stroke} strokeWidth="1.15" />
          <rect x="56" y="38.2" width="54" height="3.5" rx="1.75" fill={p.stroke} />
          <circle cx="46" cy="57" r="4" fill={p.accentWash} stroke={p.accent} strokeWidth="1.15" />
          <rect x="56" y="55.2" width="36" height="3.5" rx="1.75" fill={p.strokeSoft} />
          <circle cx="116" cy="23" r="2.2" fill={p.accent} />
        </>
      )}

      {variant === 'signals' && (
        <>
          {/* Concentric Market Watch Radar */}
          <circle cx="80" cy="46" r="34" stroke={p.strokeSoft} strokeWidth="1" />
          <circle cx="80" cy="46" r="23" stroke={p.stroke} strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="80" cy="46" r="12" fill={p.surface} stroke={p.stroke} strokeWidth="1.15" />
          <line x1="36" y1="46" x2="124" y2="46" stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="80" y1="10" x2="80" y2="82" stroke={p.strokeSoft} strokeWidth="1" />
          <path d="M80 46L104 23" stroke={p.ink} strokeWidth="1.35" strokeLinecap="round" />
          <circle cx="104" cy="23" r="6.5" fill={p.accentWash} />
          <circle cx="104" cy="23" r="2.8" fill={p.accent} />
          <circle cx="57" cy="58" r="2.5" fill={p.surface} stroke={p.ink} strokeWidth="1.2" />
          <circle cx="80" cy="46" r="3" fill={p.ink} />
        </>
      )}

      {variant === 'experiments' && (
        <>
          {/* Dual Hypothesis Curve & Coordinate Plane */}
          <line x1="24" y1="72" x2="136" y2="72" stroke={p.stroke} strokeWidth="1.1" />
          <line x1="30" y1="16" x2="30" y2="76" stroke={p.stroke} strokeWidth="1.1" />
          <path
            d="M36 62C56 60 72 55 92 53C108 51.5 120 49 130 46"
            stroke={p.stroke}
            strokeWidth="1.25"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <path
            d="M36 62C58 58 72 44 92 34C106 27 118 24 130 22"
            stroke={p.ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line x1="92" y1="34" x2="92" y2="72" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="92" cy="34" r="3.5" fill={p.surface} stroke={p.ink} strokeWidth="1.4" />
          <circle cx="130" cy="22" r="6.5" fill={p.accentWash} />
          <circle cx="130" cy="22" r="2.8" fill={p.accent} />
          <rect x="44" y="20" width="22" height="10" rx="5" fill={p.surface} stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="49" y1="25" x2="61" y2="25" stroke={p.ink} strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}

      {variant === 'goals' && (
        <>
          {/* Ascending Trajectory & Milestone Nodes */}
          <line x1="22" y1="70" x2="138" y2="70" stroke={p.strokeSoft} strokeWidth="1" />
          <rect x="34" y="54" width="16" height="16" rx="4" fill={p.surfaceMuted} stroke={p.stroke} strokeWidth="1.1" />
          <rect x="60" y="42" width="16" height="28" rx="4" fill={p.surface} stroke={p.stroke} strokeWidth="1.15" />
          <rect x="86" y="30" width="16" height="40" rx="4" fill={p.surface} stroke={p.ink} strokeWidth="1.2" />
          <rect x="112" y="18" width="16" height="52" rx="4" fill={p.accentWash} stroke={p.accent} strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          <path d="M42 46L68 34L94 22L120 14" stroke={p.ink} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
          <circle cx="120" cy="14" r="3" fill={p.accent} />
          <circle cx="94" cy="22" r="2.4" fill={p.ink} />
        </>
      )}

      {variant === 'activity' && (
        <>
          {/* Chronological Telemetry Timeline Thread */}
          <line x1="48" y1="14" x2="48" y2="78" stroke={p.stroke} strokeWidth="1.2" />
          <circle cx="48" cy="24" r="5.5" fill={p.accentWash} />
          <circle cx="48" cy="24" r="2.6" fill={p.accent} />
          <rect x="62" y="18" width="70" height="12" rx="6" fill={p.surface} stroke={p.stroke} strokeWidth="1.1" />
          <line x1="70" y1="24" x2="108" y2="24" stroke={p.ink} strokeWidth="1.4" strokeLinecap="round" />

          <circle cx="48" cy="46" r="3.2" fill={p.surface} stroke={p.ink} strokeWidth="1.25" />
          <rect x="62" y="40" width="58" height="12" rx="6" fill={p.surface} stroke={p.strokeSoft} strokeWidth="1.1" />
          <line x1="70" y1="46" x2="100" y2="46" stroke={p.stroke} strokeWidth="1.35" strokeLinecap="round" />

          <circle cx="48" cy="68" r="3" fill={p.surfaceMuted} stroke={p.stroke} strokeWidth="1.15" />
          <rect x="62" y="62" width="46" height="12" rx="6" fill={p.surfaceMuted} stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="70" y1="68" x2="92" y2="68" stroke={p.stroke} strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}

      {variant === 'pulse' && (
        <>
          {/* Performance Execution Baseline Waveform */}
          <line x1="20" y1="54" x2="140" y2="54" stroke={p.strokeSoft} strokeWidth="1" />
          <line x1="20" y1="34" x2="140" y2="34" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2 3" />
          <path
            d="M22 54H48L58 40L68 62L80 28L92 54H118"
            stroke={p.ink}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M118 54H138" stroke={p.stroke} strokeWidth="1.2" strokeDasharray="2.5 3" strokeLinecap="round" />
          <circle cx="80" cy="28" r="6.5" fill={p.accentWash} />
          <circle cx="80" cy="28" r="2.8" fill={p.accent} />
          <circle cx="118" cy="54" r="2.5" fill={p.surface} stroke={p.ink} strokeWidth="1.2" />
        </>
      )}

      {variant === 'general' && (
        <>
          {/* Architectural Node Constellation */}
          <line x1="44" y1="56" x2="80" y2="36" stroke={p.stroke} strokeWidth="1.15" />
          <line x1="80" y1="36" x2="116" y2="54" stroke={p.stroke} strokeWidth="1.15" />
          <line x1="44" y1="56" x2="80" y2="68" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2.5 2.5" />
          <line x1="116" y1="54" x2="80" y2="68" stroke={p.strokeSoft} strokeWidth="1" strokeDasharray="2.5 2.5" />
          <circle cx="80" cy="36" r="14" fill={p.surface} stroke={p.stroke} strokeWidth="1.15" />
          <circle cx="80" cy="36" r="6" fill={p.accentWash} />
          <circle cx="80" cy="36" r="2.8" fill={p.accent} />
          <circle cx="44" cy="56" r="4.5" fill={p.surface} stroke={p.ink} strokeWidth="1.3" />
          <circle cx="116" cy="54" r="4.5" fill={p.surface} stroke={p.ink} strokeWidth="1.3" />
          <circle cx="80" cy="68" r="3" fill={p.surfaceMuted} stroke={p.stroke} strokeWidth="1.15" />
        </>
      )}
    </svg>
  );
};

export interface EmptyStateTextProps {
  overline?: string;
  title: string;
  mutedPrefix?: string;
  description: string;
  meta?: string;
  tone?: EmptyStateTone;
  align?: 'center' | 'left';
  size?: EmptyStateSize;
  className?: string;
}

/**
 * EmptyStateText
 * Intentional editorial text hierarchy for empty workspace sections:
 * `bw-type-overline` eyebrow + modular heading (optional two-tone mutedPrefix) + calm body copy.
 */
export const EmptyStateText: React.FC<EmptyStateTextProps> = ({
  overline,
  title,
  mutedPrefix,
  description,
  meta,
  tone = 'light',
  align = 'center',
  size = 'default',
  className = '',
}) => {
  const sizeTokens = resolveEmptyStateSizeClasses(size);
  const isDark = tone === 'dark';
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      {overline && (
        <div
          className={`inline-flex items-center gap-2 ${typeClass.overline} ${
            isDark ? 'text-[#A8A8A2]' : 'text-[#73736D]'
          }`}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#FF7417] shrink-0"
          />
          <span>{overline}</span>
        </div>
      )}

      <h3
        className={`mt-2 ${
          size === 'spacious' ? typeClass.h3 : typeClass.h4
        } ${isDark ? 'text-white' : 'text-[#171717]'}`}
      >
        {mutedPrefix && (
          <span className={`font-normal mr-1.5 ${isDark ? 'text-[#858585]' : 'text-[#858585]'}`}>
            {mutedPrefix}
          </span>
        )}
        <span>{title}</span>
      </h3>

      <p
        className={`mt-2 ${typeClass.bodySm} ${
          isDark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'
        } ${sizeTokens.descriptionMaxW}`}
      >
        {description}
      </p>

      {meta && (
        <div
          className={`mt-2.5 ${typeClass.monoMeta} ${
            isDark ? 'text-[#787872]' : 'text-[#858585]'
          }`}
        >
          {meta}
        </div>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  /** Selects a tailored architectural SVG illustration. */
  illustration?: EmptyStateIllustrationVariant;
  /** Optional custom icon (rendered inside an architectural reticle when `illustration` is omitted). */
  icon?: React.ReactNode;
  /** Editorial `bw-type-overline` eyebrow (defaults to the illustration preset's canonical overline). */
  overline?: string;
  /** Optional muted lead-in phrase for two-tone editorial ink cadence. */
  mutedPrefix?: string;
  title: string;
  description: string;
  /** Optional quiet mono metadata line below the description. */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'dark' | 'primary' | 'secondary';
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tone?: EmptyStateTone;
  size?: EmptyStateSize;
  surface?: EmptyStateSurface;
  layout?: EmptyStateLayout;
  showTopoGrid?: boolean;
  className?: string;
}

/**
 * EmptyState
 * Intentional empty-section panel featuring a feathered `TopoGridOverlay` backdrop,
 * bespoke architectural SVG illustration, strict `bw-type-overline` typography, and crisp actions.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  icon,
  overline,
  mutedPrefix,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  actionVariant = 'dark',
  secondaryActionLabel,
  onSecondaryAction,
  tone = 'light',
  size = 'default',
  surface = 'card',
  layout = 'centered',
  showTopoGrid = true,
  className = '',
}) => {
  const effectiveVariant: EmptyStateIllustrationVariant = illustration ?? 'general';
  const preset = resolveEmptyStatePreset(effectiveVariant);
  const resolvedOverline = resolveEmptyStateOverline(effectiveVariant, overline);
  const sizeTokens = resolveEmptyStateSizeClasses(size);
  const surfaceClasses = resolveEmptyStateSurfaceClasses(tone, surface);
  const isDark = tone === 'dark';
  const isSplit = layout === 'split';

  const visualNode =
    illustration || !icon ? (
      <EmptyStateIllustration
        variant={effectiveVariant}
        tone={tone}
        className={sizeTokens.illustrationBox}
      />
    ) : (
      <div
        className={`relative w-14 h-14 rounded-full border flex items-center justify-center shrink-0 ${
          isDark
            ? 'bg-[#20201E] border-[#343430] text-[#FF9A45]'
            : 'bg-[#FFFFFF] border-[#E6E6E0] text-[#171717] bw-ceramic-control'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute -inset-2 rounded-full border border-dashed ${
            isDark ? 'border-white/10' : 'border-[#DCDCD6]'
          }`}
        />
        <span className="relative z-10">{icon}</span>
      </div>
    );

  const actionsNode = (actionLabel || secondaryActionLabel) && (
    <div
      className={`${isSplit ? '' : sizeTokens.actionsGap} flex flex-wrap items-center ${
        isSplit ? 'justify-start sm:justify-end' : 'justify-center'
      } gap-2.5 shrink-0`}
    >
      {actionLabel && onAction && (
        <LiquidButton
          variant={isDark && actionVariant === 'dark' ? 'primary' : actionVariant}
          size={size === 'compact' ? 'sm' : 'md'}
          onClick={onAction}
        >
          {actionLabel}
        </LiquidButton>
      )}
      {secondaryActionLabel && onSecondaryAction && (
        <LiquidButton
          variant={isDark ? 'ghost' : 'secondary'}
          size={size === 'compact' ? 'sm' : 'md'}
          className={
            isDark
              ? 'text-white border border-white/15 hover:bg-white/10 hover:text-white'
              : ''
          }
          onClick={onSecondaryAction}
        >
          {secondaryActionLabel}
        </LiquidButton>
      )}
    </div>
  );

  return (
    <div
      data-empty-state={effectiveVariant}
      className={`relative overflow-hidden ${surfaceClasses} ${sizeTokens.containerPadding} ${className}`}
    >
      {showTopoGrid && (
        <TopoGridOverlay
          tone={tone}
          fade={preset.topoFade}
          density={preset.topoDensity}
          intensity={preset.topoIntensity}
        />
      )}

      <div
        className={`relative z-10 ${
          isSplit
            ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-6'
            : 'flex flex-col items-center text-center'
        }`}
      >
        {isSplit ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
              {visualNode}
              <EmptyStateText
                overline={resolvedOverline}
                mutedPrefix={mutedPrefix}
                title={title}
                description={description}
                meta={meta}
                tone={tone}
                align="left"
                size={size}
              />
            </div>
            {actionsNode}
          </>
        ) : (
          <>
            <div className="mb-4">{visualNode}</div>
            <EmptyStateText
              overline={resolvedOverline}
              mutedPrefix={mutedPrefix}
              title={title}
              description={description}
              meta={meta}
              tone={tone}
              align="center"
              size={size}
            />
            {actionsNode}
          </>
        )}
      </div>
    </div>
  );
};
