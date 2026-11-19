/**
 * Utility for resolving BrainWise tactile trace card styling.
 * Applies the .bw-trace-card class and variants to gently lift the surface
 * and increase border opacity on hover.
 */

export interface TraceCardOptions {
  dark?: boolean;
  interactive?: boolean;
  noLift?: boolean;
  className?: string;
}

export function resolveTraceCardClass(options: TraceCardOptions = {}): string {
  const { dark = false, interactive = true, noLift = false, className = '' } = options;

  const classes = ['bw-trace-card'];

  if (dark) {
    classes.push('bw-trace-dark');
  }

  if (interactive) {
    classes.push('cursor-pointer');
  }

  if (noLift) {
    classes.push('bw-no-lift');
  }

  if (className) {
    classes.push(className);
  }

  return classes.filter(Boolean).join(' ');
}
