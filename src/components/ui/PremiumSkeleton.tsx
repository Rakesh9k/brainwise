import React from 'react';
import type { TypographyTokenName } from '../../theme/typography';
import { TopoGridOverlay } from './TopoGridOverlay';
import {
  type PremiumSkeletonVariant,
  type PremiumSkeletonWaveTone,
  buildStaggeredModularWidths,
  computeModularSpacingPx,
  resolveModularLineMetrics,
  resolvePremiumWaveClass,
} from './premiumSkeletonUtils';

export type { PremiumSkeletonVariant, PremiumSkeletonWaveTone };

export interface PremiumSkeletonLineProps {
  /** Maps skeleton height & line-box rhythm directly to BrainWise's 1.25 modular typography scale. */
  token: TypographyTokenName;
  /** Number of staggered lines to render using the token's modular line-box cadence. */
  lines?: number;
  width?: number | string;
  tone?: PremiumSkeletonWaveTone;
  pill?: boolean;
  className?: string;
}

/**
 * PremiumSkeletonLine
 * Renders a `.bw-skeleton-wave` bar whose optical height and outer line-box match
 * the exact `1.25` modular typography step in `src/theme/typography.ts` (zero CLS).
 */
export const PremiumSkeletonLine: React.FC<PremiumSkeletonLineProps> = ({
  token,
  lines = 1,
  width = '100%',
  tone = 'light',
  pill = false,
  className = '',
}) => {
  const metrics = resolveModularLineMetrics(token);
  const waveClass = resolvePremiumWaveClass(tone);
  const widths =
    lines > 1
      ? buildStaggeredModularWidths(lines)
      : [typeof width === 'number' ? `${width}px` : width];
  const borderRadius = pill ? 9999 : metrics.radiusPx;

  return (
    <div
      aria-hidden="true"
      data-modular-token={metrics.token}
      data-modular-step={metrics.stepKey}
      className={className}
    >
      {widths.map((lineWidth, idx) => (
        <div
          key={idx}
          className="flex items-center"
          style={{ height: `${metrics.lineBoxHeightPx}px` }}
        >
          <div
            className={waveClass}
            style={{
              width: lineWidth,
              height: `${metrics.barHeightPx}px`,
              borderRadius: `${borderRadius}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export interface PremiumSkeletonProps {
  /** Standard dashboard data widget layout preset following the 1.25 modular scale. */
  variant?: PremiumSkeletonVariant;
  /** Light porcelain surface (`.bw-skeleton-wave`) or dark obsidian surface (`.bw-skeleton-wave-dark`). */
  tone?: 'light' | 'dark';
  /** Adds subtle feathered TopoGridOverlay behind analytical skeleton containers. */
  showTopoGrid?: boolean;
  /** Renders inner skeleton without outer card shell (for embedded widget reloads). */
  embedded?: boolean;
  /** Column count for `ledger` variant (default 6). */
  columns?: number;
  /** Row count for `feed` variant (default 3). */
  rows?: number;
  /** Accessible status description announced to assistive technologies. */
  label?: string;
  className?: string;
}

const GAP_XS = `${computeModularSpacingPx(-2)}px`; // 10.24px
const GAP_SM = `${computeModularSpacingPx(-1)}px`; // 12.8px
const GAP_MD = `${computeModularSpacingPx(0)}px`; // 16px
const GAP_LG = `${computeModularSpacingPx(1)}px`; // 20px
const GAP_XL = `${computeModularSpacingPx(2)}px`; // 25px

/**
 * PremiumSkeleton
 * Standardized loading placeholder for BrainWise dashboard data widgets using
 * `.bw-skeleton-wave` and strict `1.25` modular typography geometry.
 */
export const PremiumSkeleton: React.FC<PremiumSkeletonProps> = ({
  variant = 'metric',
  tone,
  showTopoGrid = true,
  embedded = false,
  columns = 6,
  rows = 3,
  label = 'Loading dashboard telemetry widget…',
  className = '',
}) => {
  const effectiveTone: 'light' | 'dark' = tone ?? (variant === 'pulse' ? 'dark' : 'light');
  const isDark = effectiveTone === 'dark';
  const waveTone: PremiumSkeletonWaveTone = isDark ? 'dark' : 'light';
  const baseWave = resolvePremiumWaveClass(waveTone);
  const accentWave = resolvePremiumWaveClass('accent');

  if (variant === 'metric') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        data-premium-skeleton="metric"
        className={`relative overflow-hidden rounded-[20px] border p-5 sm:p-6 flex flex-col justify-between ${
          isDark
            ? 'bg-[#171717] border-[#262626] bw-dark-ambient-glow'
            : 'bg-[#FFFFFF] border-[#ECECE8] bw-surface-raised'
        } ${className}`}
        style={{ gap: GAP_XS }}
      >
        {showTopoGrid && (
          <TopoGridOverlay
            tone={effectiveTone}
            fade="edges"
            density="compact"
            intensity="whisper"
          />
        )}
        <div className="relative z-10 flex flex-col" style={{ gap: GAP_XS }}>
          <div className="flex items-center justify-between gap-2">
            <PremiumSkeletonLine token="bodySm" width="54%" tone={waveTone} pill />
            <PremiumSkeletonLine
              token="overline"
              width="22%"
              tone={isDark ? 'dark' : 'accent'}
              pill
            />
          </div>
          <PremiumSkeletonLine token="metric" width="44%" tone={waveTone} />
          <PremiumSkeletonLine token="bodySm" width="68%" tone={waveTone} pill />
        </div>
      </div>
    );
  }

  if (variant === 'insight') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        data-premium-skeleton="insight"
        data-testid="dashboard-priority-skeleton"
        className={`relative overflow-hidden lg:col-span-7 rounded-[24px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised p-7 sm:p-8 flex flex-col justify-between ${className}`}
      >
        {showTopoGrid && (
          <TopoGridOverlay tone="light" fade="edges" density="default" intensity="whisper" />
        )}
        <div className="relative z-10 flex flex-col" style={{ gap: GAP_XL }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${accentWave}`}
              />
              <PremiumSkeletonLine token="overline" width={148} tone="accent" pill />
              <PremiumSkeletonLine
                token="monoMeta"
                width={132}
                tone="light"
                pill
                className="hidden sm:block"
              />
            </div>
            <PremiumSkeletonLine token="overline" width={104} tone="light" pill />
          </div>

          <PremiumSkeletonLine token="h2" lines={2} tone="light" />

          <div
            className="grid grid-cols-1 sm:grid-cols-2 border-t border-[#EFEFEB]"
            style={{ paddingTop: GAP_LG, gap: GAP_XL }}
          >
            <div className="flex flex-col" style={{ gap: GAP_XS }}>
              <PremiumSkeletonLine token="overline" width={128} tone="light" pill />
              <PremiumSkeletonLine token="bodySm" lines={2} tone="light" />
            </div>
            <div className="flex flex-col" style={{ gap: GAP_XS }}>
              <PremiumSkeletonLine token="overline" width={116} tone="light" pill />
              <PremiumSkeletonLine token="bodySm" width="84%" tone="accent" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div aria-hidden="true" className={`${accentWave} h-10 w-48 rounded-full`} />
            <div aria-hidden="true" className={`${baseWave} h-10 w-44 rounded-full`} />
          </div>
        </div>

        <div
          className="relative z-10 border-t border-[#EFEFEB] grid grid-cols-1 sm:grid-cols-12 items-start"
          style={{ marginTop: GAP_XL, paddingTop: GAP_LG, gap: GAP_LG }}
        >
          <div className="sm:col-span-7 flex flex-col" style={{ gap: GAP_XS }}>
            <div className="flex items-center justify-between gap-2">
              <PremiumSkeletonLine token="overline" width={112} tone="light" pill />
              <PremiumSkeletonLine token="overline" width={56} tone="light" pill />
            </div>
            <PremiumSkeletonLine token="bodySm" width="82%" tone="light" />
          </div>
          <div className="sm:col-span-5 flex flex-col" style={{ gap: GAP_XS }}>
            <div className="flex items-center justify-between gap-2">
              <PremiumSkeletonLine token="overline" width={136} tone="light" pill />
              <PremiumSkeletonLine token="overline" width={36} tone="light" pill />
            </div>
            <div aria-hidden="true" className={`${baseWave} h-1.5 w-full rounded-full`} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    const pulseInner = (
      <div
        data-premium-skeleton="pulse"
        data-testid="dashboard-pulse-skeleton"
        className="flex flex-col"
        style={{ gap: GAP_LG }}
      >
        <div className="grid grid-cols-3" style={{ gap: GAP_SM }}>
          {[false, false, true].map((isAccent, idx) => (
            <div key={idx} className="flex flex-col" style={{ gap: '4px' }}>
              <PremiumSkeletonLine
                token="metricSm"
                width="62%"
                tone={isDark ? 'dark' : isAccent ? 'accent' : 'light'}
                className={isAccent && isDark ? '[&>div>div]:!bg-[#FF7417]/25' : ''}
              />
              <PremiumSkeletonLine token="overline" width="76%" tone={waveTone} pill />
              <PremiumSkeletonLine token="overline" width="54%" tone={waveTone} pill />
            </div>
          ))}
        </div>

        <div className="h-[118px] pt-3 flex items-end justify-between gap-3">
          {[38, 52, 46, 68, 88].map((pct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                aria-hidden="true"
                className={`${baseWave} w-full rounded-[6px] ${
                  idx === 4 && isDark ? '!bg-[#FF7417]/22 ring-1 ring-[#FF7417]/30' : ''
                }`}
                style={{ height: `${pct}%` }}
              />
              <PremiumSkeletonLine token="overline" width={24} tone={waveTone} pill />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <PremiumSkeletonLine token="overline" width={116} tone={waveTone} pill />
          <PremiumSkeletonLine
            token="overline"
            width={40}
            tone={isDark ? 'dark' : 'accent'}
            pill
            className={isDark ? '[&>div>div]:!bg-[#FF7417]/25' : ''}
          />
        </div>
      </div>
    );

    if (embedded) {
      return (
        <div role="status" aria-live="polite" aria-label={label} className={className}>
          {pulseInner}
        </div>
      );
    }

    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={`relative overflow-hidden lg:col-span-5 rounded-[24px] border p-6 sm:p-7 flex flex-col justify-between ${
          isDark
            ? 'border-[#262626] bg-[#171717] bw-dark-ambient-glow'
            : 'border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised'
        } ${className}`}
      >
        {showTopoGrid && (
          <TopoGridOverlay
            tone={effectiveTone}
            fade="edges"
            density="compact"
            intensity={isDark ? 'crisp' : 'subtle'}
          />
        )}
        <div
          className="relative z-10 flex items-start justify-between gap-3"
          style={{ marginBottom: GAP_LG }}
        >
          <div className="flex-1 flex flex-col" style={{ gap: '4px' }}>
            <PremiumSkeletonLine token="h4" width="72%" tone={waveTone} />
            <PremiumSkeletonLine token="bodySm" width="84%" tone={waveTone} pill />
          </div>
          <div aria-hidden="true" className={`${baseWave} h-7 w-28 rounded-full shrink-0`} />
        </div>
        <div className="relative z-10">{pulseInner}</div>
      </div>
    );
  }

  if (variant === 'ledger') {
    const cellIndices = Array.from({ length: columns }, (_, i) => i);
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        data-premium-skeleton="ledger"
        data-testid="dashboard-ledger-skeleton"
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-[#E6E6E2] divide-y sm:divide-y-0 sm:divide-x divide-[#EFEFEB] ${className}`}
      >
        {cellIndices.map((idx) => (
          <div
            key={idx}
            className="px-4 sm:px-5 py-5 flex flex-col justify-between"
            style={{ gap: GAP_XS }}
          >
            <PremiumSkeletonLine token="overline" width="64%" tone="light" pill />
            <div className="flex flex-col" style={{ gap: '4px' }}>
              <PremiumSkeletonLine
                token={idx === 0 ? 'body' : 'metric'}
                width={idx === 0 ? '78%' : '38%'}
                tone={idx === 0 ? 'accent' : 'light'}
              />
              <PremiumSkeletonLine token="bodySm" width="74%" tone="light" pill />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        data-premium-skeleton="chart"
        className={`relative overflow-hidden rounded-[20px] border p-6 sm:p-7 ${
          isDark
            ? 'border-[#262626] bg-[#171717] bw-dark-ambient-glow'
            : 'border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised'
        } ${className}`}
      >
        {showTopoGrid && (
          <TopoGridOverlay tone={effectiveTone} fade="edges" density="compact" intensity="subtle" />
        )}
        <div className="relative z-10 flex flex-col" style={{ gap: GAP_LG }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 flex flex-col" style={{ gap: '4px' }}>
              <PremiumSkeletonLine token="h4" width="48%" tone={waveTone} />
              <PremiumSkeletonLine token="bodySm" width="62%" tone={waveTone} pill />
            </div>
            <div aria-hidden="true" className={`${baseWave} h-7 w-24 rounded-full shrink-0`} />
          </div>

          <div className="h-44 pt-4 flex items-end justify-between gap-3 border-b border-[#EFEFEB]/70 pb-3">
            {[32, 46, 42, 60, 74, 88].map((pct, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  aria-hidden="true"
                  className={`${idx === 5 ? accentWave : baseWave} w-full rounded-t-[8px]`}
                  style={{ height: `${pct}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <PremiumSkeletonLine key={idx} token="monoMeta" width={36} tone={waveTone} pill />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // variant === 'feed'
  const actionRows = Array.from({ length: Math.max(1, Math.min(rows, 3)) }, (_, i) => i);
  const sprintRows = Array.from({ length: Math.max(2, rows) }, (_, i) => i);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-premium-skeleton="feed"
      data-testid="dashboard-feed-skeleton"
      className={`flex flex-col ${className}`}
      style={{ gap: GAP_LG }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[#F1F1EF] border border-[#EAEAE5]">
          <div aria-hidden="true" className={`${accentWave} h-7 w-32 rounded-full`} />
          <div aria-hidden="true" className={`${baseWave} h-7 w-28 rounded-full`} />
          <div aria-hidden="true" className={`${baseWave} h-7 w-28 rounded-full`} />
          <div aria-hidden="true" className={`${baseWave} h-7 w-20 rounded-full`} />
        </div>
        <PremiumSkeletonLine token="monoMeta" width={124} tone="light" pill />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <div className="lg:col-span-7 flex flex-col" style={{ gap: GAP_MD }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex flex-col" style={{ gap: '4px' }}>
              <PremiumSkeletonLine token="h4" width={210} tone="light" />
              <PremiumSkeletonLine token="bodySm" width={248} tone="light" pill />
            </div>
            <PremiumSkeletonLine token="bodySm" width={120} tone="light" pill />
          </div>
          <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
            {actionRows.map((idx) => (
              <div key={idx} className="py-5 flex flex-col" style={{ gap: GAP_XS }}>
                <div className="flex items-center justify-between gap-2">
                  <PremiumSkeletonLine token="monoMeta" width={164} tone="light" pill />
                  <PremiumSkeletonLine
                    token="overline"
                    width={78}
                    tone={idx === 0 ? 'accent' : 'light'}
                    pill
                  />
                </div>
                <PremiumSkeletonLine token="body" width="90%" tone="light" />
                <PremiumSkeletonLine token="bodySm" width="72%" tone="light" pill />
                <div className="flex items-center justify-between pt-1">
                  <PremiumSkeletonLine token="monoMeta" width={186} tone="light" pill />
                  <div className="flex items-center gap-2">
                    <div aria-hidden="true" className={`${baseWave} h-7 w-20 rounded-full`} />
                    <div aria-hidden="true" className={`${accentWave} h-7 w-28 rounded-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col" style={{ gap: GAP_MD }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex flex-col" style={{ gap: '4px' }}>
              <PremiumSkeletonLine token="h4" width={168} tone="light" />
              <PremiumSkeletonLine token="bodySm" width={204} tone="light" pill />
            </div>
            <PremiumSkeletonLine token="bodySm" width={80} tone="light" pill />
          </div>
          <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
            {sprintRows.map((idx) => (
              <div key={idx} className="py-4 flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className={`${baseWave} w-5 h-5 rounded-full shrink-0 mt-0.5`}
                />
                <div className="flex-1 flex flex-col" style={{ gap: '6px' }}>
                  <PremiumSkeletonLine token="bodySm" width="88%" tone="light" />
                  <PremiumSkeletonLine
                    token="overline"
                    width={76}
                    tone={idx === 0 ? 'accent' : 'light'}
                    pill
                  />
                  <PremiumSkeletonLine token="monoMeta" width={164} tone="light" pill />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PremiumDashboardSkeleton
 * Full executive dashboard data widget loading composition built strictly on
 * `.bw-skeleton-wave` and BrainWise's `1.25` modular typography scale.
 */
export const PremiumDashboardSkeleton: React.FC<{
  label?: string;
}> = ({ label = 'Synchronizing live business intelligence briefing…' }) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    data-premium-skeleton="dashboard"
    data-testid="dashboard-widgets-skeleton"
    className="space-y-10"
  >
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <PremiumSkeleton variant="insight" label="Loading primary strategic insight" />
      <PremiumSkeleton variant="pulse" label="Loading performance pulse telemetry" />
    </div>
    <PremiumSkeleton variant="ledger" label="Loading operating departments ledger" />
    <PremiumSkeleton variant="feed" rows={3} label="Loading workspace priority feeds" />
  </div>
);
