import React from 'react';
import { LiquidSkeletonBlock } from '../motion/LiquidMotion';

/**
 * AnalyticsSkeleton
 * Mirrors AnalyticsReportsPage: 4 KPI Bento cards + 12-col split (MRR chart + Goal bars).
 */
export const AnalyticsSkeleton: React.FC<{ label?: string }> = ({
  label = 'Compiling performance telemetry & attribution…',
}) => (
  <div className="space-y-6" data-testid="analytics-skeleton">
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2.5 text-xs font-medium text-[#5C5C58]">
        <span
          className="relative inline-flex w-2 h-2 items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="absolute inset-0 rounded-full bg-[#FF7417]/35 bw-orb-halo" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-[#FF7417]" />
        </span>
        <span>{label}</span>
      </div>
      <LiquidSkeletonBlock radius="full" className="h-5 w-24" />
    </div>

    {/* 4 KPI MetricCard bones */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[true, false, false, false].map((accent, idx) => (
        <div
          key={idx}
          className={`rounded-[20px] border p-5 sm:p-6 bg-[#FFFFFF] bw-surface-raised space-y-3 ${
            accent ? 'border-[#FFD3B3]' : 'border-[#ECECE8]'
          }`}
        >
          <LiquidSkeletonBlock
            tone={accent ? 'accent' : 'light'}
            radius="full"
            className="h-3 w-28"
          />
          <LiquidSkeletonBlock
            tone={accent ? 'accent' : 'light'}
            radius="md"
            className="h-8 w-20"
          />
          <LiquidSkeletonBlock radius="full" className="h-3 w-32" />
        </div>
      ))}
    </div>

    {/* 12-column Chart + Goals split */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-6 sm:p-7 bw-surface-raised space-y-5">
        <div className="space-y-2">
          <LiquidSkeletonBlock radius="full" className="h-4 w-64" />
          <LiquidSkeletonBlock radius="full" className="h-3 w-48" />
        </div>
        <div className="h-[196px] rounded-[16px] border border-[#F1F1EF] bg-[#FAFAF9] p-5 flex items-end justify-between gap-3">
          {[32, 48, 60, 74, 86, 100].map((heightPct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <LiquidSkeletonBlock
                tone={idx === 5 ? 'accent' : 'light'}
                radius="md"
                className="w-full"
                style={{ height: `${heightPct}%` }}
              />
              <LiquidSkeletonBlock radius="full" className="h-2.5 w-7" />
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5 rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-6 sm:p-7 bw-surface-raised space-y-5">
        <div className="space-y-2">
          <LiquidSkeletonBlock radius="full" className="h-4 w-48" />
          <LiquidSkeletonBlock radius="full" className="h-3 w-44" />
        </div>
        <div className="space-y-4 pt-1">
          {[82, 66, 54, 42].map((w, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <LiquidSkeletonBlock radius="full" className="h-3" style={{ width: `${w}%` }} />
                <LiquidSkeletonBlock tone="accent" radius="full" className="h-3 w-10 shrink-0" />
              </div>
              <LiquidSkeletonBlock radius="full" className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * RecommendationSkeletonList
 * Mirrors GrowthDirectorPage AI Strategy Recommendation cards.
 */
export const RecommendationSkeletonList: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <div className="space-y-3" data-testid="recommendations-skeleton">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-6 space-y-4 bw-surface-raised"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LiquidSkeletonBlock tone="accent" radius="full" className="h-5 w-24" />
            <LiquidSkeletonBlock radius="full" className="h-3.5 w-44" />
          </div>
          <LiquidSkeletonBlock radius="full" className="h-5 w-28" />
        </div>
        <LiquidSkeletonBlock radius="md" className="h-5 w-4/5" />
        <div className="space-y-2">
          <LiquidSkeletonBlock radius="full" className="h-3 w-full" />
          <LiquidSkeletonBlock radius="full" className="h-3 w-5/6" />
        </div>
        <div className="rounded-[12px] bg-[#FAFAF9] border border-[#EFEFEB] p-3.5 space-y-2">
          <LiquidSkeletonBlock radius="full" className="h-3 w-3/4" />
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <LiquidSkeletonBlock tone="accent" radius="full" className="h-8 w-36" />
          <LiquidSkeletonBlock radius="full" className="h-8 w-24" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * LogoConceptSkeletonGrid
 * Mirrors BrandStudioPage's 3-column AI Logo Concept cards.
 */
export const LogoConceptSkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="logo-concepts-skeleton">
    {[0, 1, 2].map((idx) => (
      <div
        key={idx}
        className={`rounded-[20px] border p-5 space-y-4 bg-[#FFFFFF] bw-surface-raised ${
          idx === 0 ? 'border-[#FFD3B3]' : 'border-[#ECECE8]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <LiquidSkeletonBlock radius="full" className="h-4 w-32" />
          {idx === 0 && <LiquidSkeletonBlock tone="accent" radius="full" className="h-4 w-20" />}
        </div>
        <div className="w-full h-28 rounded-[14px] bg-[#FAFAF9] border border-[#EFEFEB] flex items-center justify-center gap-3 px-4">
          <LiquidSkeletonBlock
            tone={idx === 0 ? 'accent' : 'light'}
            radius="lg"
            className="w-12 h-12 shrink-0"
          />
          <LiquidSkeletonBlock radius="full" className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <LiquidSkeletonBlock radius="full" className="h-3 w-full" />
          <LiquidSkeletonBlock radius="full" className="h-3 w-4/5" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#EFEFEB]">
          <LiquidSkeletonBlock radius="full" className="h-3.5 w-24" />
          <LiquidSkeletonBlock
            tone={idx === 0 ? 'accent' : 'light'}
            radius="full"
            className="h-8 w-28"
          />
        </div>
      </div>
    ))}
  </div>
);

/**
 * SocialCreativeSkeleton
 * Mirrors BrandStudioPage's Instagram Post / Multi-Slide Carousel stage + caption card.
 */
export const SocialCreativeSkeleton: React.FC<{
  dark?: boolean;
  aspectClass?: string;
}> = ({ dark = false, aspectClass = 'aspect-[4/5]' }) => (
  <div className="space-y-4" data-testid="social-creative-skeleton">
    <div className="rounded-[20px] border border-[#ECECE8] bg-[#F5F5F4] p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <LiquidSkeletonBlock radius="full" className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <LiquidSkeletonBlock radius="full" className="h-8 w-28" />
          <LiquidSkeletonBlock radius="full" className="h-8 w-24" />
        </div>
      </div>

      <div className="max-w-[400px] mx-auto rounded-[18px] border border-[#ECECE8] bg-[#FFFFFF] overflow-hidden bw-surface-raised">
        <div className="px-4 py-2.5 border-b border-[#EFEFEB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiquidSkeletonBlock radius="full" className="w-6 h-6" />
            <LiquidSkeletonBlock radius="full" className="h-3 w-24" />
          </div>
          <LiquidSkeletonBlock radius="full" className="h-3 w-16" />
        </div>

        <div
          className={`p-6 sm:p-7 flex flex-col justify-between ${aspectClass} ${
            dark ? 'bg-[#171717]' : 'bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between">
            <LiquidSkeletonBlock
              tone={dark ? 'dark' : 'accent'}
              radius="full"
              className="h-3 w-24"
            />
            <LiquidSkeletonBlock
              tone={dark ? 'dark' : 'light'}
              radius="full"
              className="h-3 w-16"
            />
          </div>

          <div className="my-auto py-4 space-y-4">
            <LiquidSkeletonBlock
              tone={dark ? 'dark' : 'accent'}
              radius="md"
              className="h-10 w-28"
            />
            <div className="space-y-2.5">
              <LiquidSkeletonBlock
                tone={dark ? 'dark' : 'light'}
                radius="md"
                className="h-6 w-11/12"
              />
              <LiquidSkeletonBlock
                tone={dark ? 'dark' : 'light'}
                radius="md"
                className="h-6 w-3/4"
              />
            </div>
            <div className="space-y-2">
              <LiquidSkeletonBlock
                tone={dark ? 'dark' : 'light'}
                radius="full"
                className="h-3 w-full"
              />
              <LiquidSkeletonBlock
                tone={dark ? 'dark' : 'light'}
                radius="full"
                className="h-3 w-5/6"
              />
            </div>
            <LiquidSkeletonBlock
              tone={dark ? 'dark' : 'accent'}
              radius="full"
              className="h-4 w-36"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <LiquidSkeletonBlock
              tone={dark ? 'dark' : 'light'}
              radius="full"
              className="h-3 w-28"
            />
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((dot) => (
                <LiquidSkeletonBlock
                  key={dot}
                  tone={dot === 0 ? 'accent' : dark ? 'dark' : 'light'}
                  radius="full"
                  className={dot === 0 ? 'h-1.5 w-5' : 'h-1.5 w-1.5'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised">
      <div className="flex items-center justify-between">
        <LiquidSkeletonBlock radius="full" className="h-4 w-40" />
        <LiquidSkeletonBlock radius="full" className="h-7 w-24" />
      </div>
      <LiquidSkeletonBlock radius="full" className="h-3 w-full" />
      <LiquidSkeletonBlock radius="full" className="h-3 w-4/5" />
    </div>
  </div>
);

/**
 * BrandCollateralSkeleton
 * Mirrors BrandStudioPage's 3 variation selector pills + live collateral artboard.
 */
export const BrandCollateralSkeleton: React.FC = () => (
  <div className="space-y-4" data-testid="brand-collateral-skeleton">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {[0, 1, 2].map((idx) => (
        <div
          key={idx}
          className={`p-3.5 rounded-[14px] border space-y-2 ${
            idx === 0 ? 'border-[#FFD3B3] bg-[#FFFFFF]' : 'border-[#ECECE8] bg-[#FAFAF9]'
          }`}
        >
          <LiquidSkeletonBlock
            tone={idx === 0 ? 'accent' : 'light'}
            radius="full"
            className="h-2.5 w-24"
          />
          <LiquidSkeletonBlock radius="full" className="h-3.5 w-32" />
        </div>
      ))}
    </div>

    <div className="rounded-[20px] border border-[#ECECE8] bg-[#F5F5F4] p-6 sm:p-8 space-y-5">
      <div className="rounded-[18px] p-8 min-h-[300px] flex flex-col justify-between border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LiquidSkeletonBlock tone="accent" radius="md" className="w-8 h-8" />
            <LiquidSkeletonBlock radius="full" className="h-4 w-32" />
          </div>
          <LiquidSkeletonBlock tone="accent" radius="full" className="h-3 w-36" />
        </div>

        <div className="my-6 space-y-3.5">
          <LiquidSkeletonBlock radius="md" className="h-10 w-28" />
          <LiquidSkeletonBlock radius="md" className="h-7 w-4/5" />
          <LiquidSkeletonBlock radius="full" className="h-3.5 w-3/4" />
          <LiquidSkeletonBlock radius="full" className="h-3.5 w-2/3" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#EFEFEB]">
          <LiquidSkeletonBlock radius="full" className="h-3 w-40" />
          <LiquidSkeletonBlock radius="full" className="h-3 w-24" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <LiquidSkeletonBlock radius="full" className="h-3 w-48" />
        <div className="flex items-center gap-2">
          <LiquidSkeletonBlock radius="full" className="h-8 w-28" />
          <LiquidSkeletonBlock tone="accent" radius="full" className="h-8 w-36" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * PlaybookSynthesisSkeleton
 * Mirrors JournalSection's synthesized strategic angle response card.
 */
export const PlaybookSynthesisSkeleton: React.FC = () => (
  <div
    className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#ECECE8] space-y-2.5"
    data-testid="playbook-synthesis-skeleton"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF7417] animate-pulse" aria-hidden="true" />
        <LiquidSkeletonBlock tone="accent" radius="full" className="h-2.5 w-32" />
      </div>
      <LiquidSkeletonBlock radius="full" className="h-3 w-24" />
    </div>
    <LiquidSkeletonBlock radius="full" className="h-3 w-full" />
    <LiquidSkeletonBlock radius="full" className="h-3 w-11/12" />
    <LiquidSkeletonBlock radius="full" className="h-3 w-2/3" />
  </div>
);

/**
 * DossierPreviewSkeleton
 * Shows the 15-section executive dossier skeleton forming on IdeaIntelligencePage
 * before liquid-revealing into the live generated dossier.
 */
export const DossierPreviewSkeleton: React.FC = () => (
  <div className="space-y-4 pt-2" data-testid="dossier-preview-skeleton">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {['TAM Band', 'SAM Band', 'SOM Wedge'].map((label, idx) => (
        <div
          key={label}
          className="rounded-[14px] border border-[#262626] bg-[#1A1A1A] p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-num text-[10px] uppercase tracking-wider text-[#858585]">
              {label}
            </span>
            <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-10" />
          </div>
          <LiquidSkeletonBlock
            tone={idx === 2 ? 'dark' : 'dark'}
            radius="md"
            className="h-6 w-28"
          />
          <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-36" />
        </div>
      ))}
    </div>

    <div className="rounded-[14px] border border-[#262626] bg-[#1A1A1A] p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono-num text-[10px] uppercase tracking-wider text-[#A8A8A2]">
          Executive Dossier Preview Forming
        </span>
        <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-20" />
      </div>
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-3 w-full" />
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-3 w-11/12" />
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-3 w-3/4" />
    </div>
  </div>
);

/**
 * WorkspaceInitSkeleton
 * Shows workspace priority + pulse bones materializing inside OnboardingPage Step 5.
 */
export const WorkspaceInitSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3" data-testid="workspace-init-skeleton">
    <div className="sm:col-span-7 rounded-[14px] border border-[#262626] bg-[#1A1A1A] p-4 space-y-2.5">
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-28" />
      <LiquidSkeletonBlock tone="dark" radius="md" className="h-4 w-5/6" />
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-2/3" />
    </div>
    <div className="sm:col-span-5 rounded-[14px] border border-[#262626] bg-[#1A1A1A] p-4 space-y-2.5">
      <LiquidSkeletonBlock tone="dark" radius="full" className="h-2.5 w-24" />
      <div className="flex items-end gap-1.5 h-10 pt-2">
        {[40, 62, 55, 78, 95].map((h, i) => (
          <LiquidSkeletonBlock
            key={i}
            tone="dark"
            radius="sm"
            className="flex-1"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);
