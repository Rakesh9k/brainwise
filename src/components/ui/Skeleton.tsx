import React from 'react';
import {
  type SkeletonRadius,
  type SkeletonShape,
  type SkeletonVariant,
  getStaggeredLineWidths,
  normalizeSkeletonDimension,
  resolveSkeletonRadiusClass,
  resolveSkeletonWaveClass,
} from './skeletonUtils';

export interface SkeletonProps {
  /** Surface shimmer tone: default warm alabaster wave, warm orange accent wave, or dark obsidian wave */
  variant?: SkeletonVariant;
  /** Semantic geometry preset */
  shape?: SkeletonShape;
  /** Explicit border-radius override */
  radius?: SkeletonRadius;
  /** Render multiple naturally staggered text lines when > 1 */
  lines?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Standardized BrainWise Skeleton Primitive
 * Uses `.bw-skeleton-wave`, `.bw-skeleton-wave-accent`, and `.bw-skeleton-wave-dark`
 * for refined, tactile shimmer placeholders that respect `prefers-reduced-motion`.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'default',
  shape = 'rect',
  radius,
  lines = 1,
  width,
  height,
  className = '',
  style,
}) => {
  const waveClass = resolveSkeletonWaveClass(variant);
  const radiusClass = resolveSkeletonRadiusClass(shape, radius);

  if (lines > 1) {
    const widths = getStaggeredLineWidths(lines);
    return (
      <div aria-hidden="true" className={`space-y-2 ${className}`}>
        {widths.map((lineWidth, idx) => (
          <div
            key={idx}
            className={`${waveClass} ${radiusClass} h-3`}
            style={{
              width: lineWidth,
              height: normalizeSkeletonDimension(height),
              ...style,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${waveClass} ${radiusClass} ${className}`}
      style={{
        width: normalizeSkeletonDimension(width),
        height: normalizeSkeletonDimension(height),
        ...style,
      }}
    />
  );
};

/**
 * Mirrors the 7-column Primary Strategic Priority intelligence card on DashboardPage.
 */
export const DashboardPrioritySkeleton: React.FC = () => (
  <div
    data-testid="dashboard-priority-skeleton"
    className="lg:col-span-7 rounded-[24px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised p-7 sm:p-8 flex flex-col justify-between"
  >
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton variant="accent" shape="circle" className="w-2.5 h-2.5 shrink-0" />
          <Skeleton variant="accent" shape="pill" className="h-3.5 w-36" />
          <Skeleton shape="pill" className="h-3 w-32 hidden sm:block" />
        </div>
        <Skeleton shape="pill" className="h-3.5 w-28" />
      </div>

      <div className="space-y-2.5">
        <Skeleton shape="rect" radius="md" className="h-7 w-11/12" />
        <Skeleton shape="rect" radius="md" className="h-7 w-3/4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-[#EFEFEB]">
        <div className="space-y-2.5">
          <Skeleton shape="pill" className="h-2.5 w-32" />
          <Skeleton shape="text" lines={2} />
        </div>
        <div className="space-y-2.5">
          <Skeleton shape="pill" className="h-2.5 w-28" />
          <Skeleton variant="accent" shape="text" className="h-3.5 w-5/6" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Skeleton variant="accent" shape="pill" className="h-10 w-48" />
        <Skeleton shape="pill" className="h-10 w-44" />
      </div>
    </div>

    <div className="mt-7 pt-6 border-t border-[#EFEFEB] grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
      <div className="sm:col-span-7 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton shape="pill" className="h-2.5 w-28" />
          <Skeleton shape="pill" className="h-2.5 w-14" />
        </div>
        <Skeleton shape="text" className="h-3.5 w-5/6" />
      </div>
      <div className="sm:col-span-5 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton shape="pill" className="h-2.5 w-32" />
          <Skeleton shape="pill" className="h-2.5 w-8" />
        </div>
        <Skeleton shape="pill" className="h-1.5 w-full" />
      </div>
    </div>
  </div>
);

/**
 * Mirrors the 5-column dark obsidian Performance & Execution Pulse widget on DashboardPage.
 */
export const DashboardPulseSkeleton: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const inner = (
    <div data-testid="dashboard-pulse-skeleton" className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[false, false, true].map((isAccent, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton
              variant="dark"
              shape="rect"
              radius="sm"
              className={`h-6 w-14 ${isAccent ? '!bg-[#FF7417]/20 ring-1 ring-[#FF7417]/25' : ''}`}
            />
            <Skeleton variant="dark" shape="pill" className="h-2.5 w-16" />
            <Skeleton variant="dark" shape="pill" className="h-2 w-12" />
          </div>
        ))}
      </div>

      <div className="h-[118px] pt-3 flex items-end justify-between gap-3">
        {[38, 52, 46, 68, 88].map((pct, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <Skeleton
              variant="dark"
              shape="rect"
              radius="sm"
              className={`w-full ${idx === 4 ? '!bg-[#FF7417]/20 ring-1 ring-[#FF7417]/25' : ''}`}
              style={{ height: `${pct}%` }}
            />
            <Skeleton variant="dark" shape="pill" className="h-2 w-6" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Skeleton variant="dark" shape="pill" className="h-2.5 w-28" />
        <Skeleton variant="dark" shape="pill" className="h-2.5 w-10 !bg-[#FF7417]/22" />
      </div>
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="lg:col-span-5 rounded-[24px] border border-[#262626] bg-[#171717] bw-dark-ambient-glow p-6 sm:p-7 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="space-y-2">
          <Skeleton variant="dark" shape="rect" radius="sm" className="h-5 w-44" />
          <Skeleton variant="dark" shape="pill" className="h-3 w-52" />
        </div>
        <Skeleton variant="dark" shape="pill" className="h-7 w-28 shrink-0" />
      </div>
      {inner}
    </div>
  );
};

/**
 * Mirrors the 6-cell open editorial hairline Operating Departments telemetry strip.
 */
export const DashboardLedgerSkeleton: React.FC = () => (
  <div
    data-testid="dashboard-ledger-skeleton"
    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-[#E6E6E2] divide-y sm:divide-y-0 sm:divide-x divide-[#EFEFEB]"
  >
    {[0, 1, 2, 3, 4, 5].map((idx) => (
      <div key={idx} className="py-5 px-4 first:pl-1 last:pr-1 space-y-3">
        <Skeleton shape="pill" className="h-2.5 w-20" />
        <Skeleton
          variant={idx === 0 ? 'accent' : 'default'}
          shape="rect"
          radius="sm"
          className={idx === 0 ? 'h-5 w-28' : 'h-6 w-10'}
        />
        <Skeleton shape="pill" className="h-2.5 w-24" />
      </div>
    ))}
  </div>
);

/**
 * Mirrors the 2-column open editorial hairline Workspace Feeds section.
 */
export const DashboardFeedSkeleton: React.FC = () => (
  <div data-testid="dashboard-feed-skeleton" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[#F1F1EF] border border-[#EAEAE5]">
        <Skeleton variant="accent" shape="pill" className="h-7 w-32" />
        <Skeleton shape="pill" className="h-7 w-28" />
        <Skeleton shape="pill" className="h-7 w-28" />
        <Skeleton shape="pill" className="h-7 w-20" />
      </div>
      <Skeleton shape="pill" className="h-4 w-32" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton shape="rect" radius="sm" className="h-5 w-52" />
            <Skeleton shape="pill" className="h-3 w-64" />
          </div>
          <Skeleton shape="pill" className="h-3.5 w-32" />
        </div>
        <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
          {[0, 1].map((idx) => (
            <div key={idx} className="py-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton shape="pill" className="h-3 w-44" />
                <Skeleton
                  variant={idx === 0 ? 'accent' : 'default'}
                  shape="pill"
                  className="h-3 w-20"
                />
              </div>
              <Skeleton shape="rect" radius="sm" className="h-4 w-11/12" />
              <Skeleton shape="pill" className="h-3 w-3/4" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton shape="pill" className="h-2.5 w-52" />
                <div className="flex items-center gap-2">
                  <Skeleton shape="pill" className="h-7 w-20" />
                  <Skeleton variant="accent" shape="pill" className="h-7 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton shape="rect" radius="sm" className="h-5 w-40" />
            <Skeleton shape="pill" className="h-3 w-52" />
          </div>
          <Skeleton shape="pill" className="h-3.5 w-20" />
        </div>
        <div className="border-t border-[#E6E6E2] divide-y divide-[#EFEFEB]">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="py-4 flex items-start gap-3">
              <Skeleton shape="circle" className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton shape="rect" radius="sm" className="h-4 w-5/6" />
                <Skeleton
                  variant={idx === 0 ? 'accent' : 'default'}
                  shape="pill"
                  className="h-2.5 w-20"
                />
                <Skeleton shape="pill" className="h-2.5 w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Complete Dashboard Data Widgets Skeleton Composition
 */
export const DashboardWidgetsSkeleton: React.FC<{
  label?: string;
}> = ({ label = 'Synchronizing live business intelligence briefing…' }) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    data-testid="dashboard-widgets-skeleton"
    className="space-y-10"
  >
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <DashboardPrioritySkeleton />
      <DashboardPulseSkeleton />
    </div>
    <DashboardLedgerSkeleton />
    <DashboardFeedSkeleton />
  </div>
);
