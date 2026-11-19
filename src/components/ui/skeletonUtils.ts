export type SkeletonVariant = 'default' | 'accent' | 'dark';
export type SkeletonShape = 'rect' | 'text' | 'circle' | 'pill' | 'card';
export type SkeletonRadius = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Maps semantic Skeleton variant to BrainWise's CSS shimmer wave class.
 */
export function resolveSkeletonWaveClass(variant: SkeletonVariant = 'default'): string {
  switch (variant) {
    case 'accent':
      return 'bw-skeleton-wave-accent';
    case 'dark':
      return 'bw-skeleton-wave-dark';
    default:
      return 'bw-skeleton-wave';
  }
}

/**
 * Resolves border-radius Tailwind class from shape and optional explicit radius override.
 */
export function resolveSkeletonRadiusClass(
  shape: SkeletonShape = 'rect',
  radius?: SkeletonRadius
): string {
  if (radius) {
    const map: Record<SkeletonRadius, string> = {
      sm: 'rounded-[8px]',
      md: 'rounded-[12px]',
      lg: 'rounded-[16px]',
      xl: 'rounded-[22px]',
      full: 'rounded-full',
    };
    return map[radius];
  }

  switch (shape) {
    case 'circle':
    case 'pill':
    case 'text':
      return 'rounded-full';
    case 'card':
      return 'rounded-[20px]';
    default:
      return 'rounded-[12px]';
  }
}

/**
 * Normalizes numeric pixel values or CSS strings for inline width/height styles.
 */
export function normalizeSkeletonDimension(
  value?: number | string
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Generates natural editorial line widths for multi-line text skeletons.
 */
export function getStaggeredLineWidths(lines: number): string[] {
  const safeCount = Math.max(1, Math.min(12, Math.floor(lines)));
  if (safeCount === 1) return ['100%'];
  const presetTailWidths = ['94%', '88%', '96%', '84%', '92%'];
  return Array.from({ length: safeCount }, (_, idx) => {
    if (idx === 0) return '100%';
    if (idx === safeCount - 1) return '68%';
    return presetTailWidths[idx % presetTailWidths.length];
  });
}
