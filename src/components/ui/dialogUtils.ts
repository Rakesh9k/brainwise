export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type DialogPlacement = 'center' | 'top';

export const DIALOG_SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export const DIALOG_PLACEMENT_CLASSES: Record<DialogPlacement, string> = {
  center: 'items-center justify-center p-4 sm:p-6',
  top: 'items-start justify-center pt-[10vh] px-4 pb-6',
};

/**
 * Resolves the Tailwind max-width class for a Dialog panel, allowing legacy
 * `maxWidth` string overrides while defaulting to the standardized size scale.
 */
export function resolveDialogWidthClass(size: DialogSize = 'md', maxWidth?: string): string {
  const custom = maxWidth?.trim();
  if (custom) return custom;
  return DIALOG_SIZE_CLASSES[size];
}

/**
 * Computes consistent ARIA attributes for accessible modal dialogs.
 */
export function buildDialogAriaProps(params: {
  title?: string;
  ariaLabel?: string;
  hideHeader?: boolean;
  hasSubtitle?: boolean;
  titleId: string;
  descriptionId: string;
}): {
  role: 'dialog';
  'aria-modal': true;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
} {
  const { title, ariaLabel, hideHeader, hasSubtitle, titleId, descriptionId } = params;
  const useVisibleHeading = Boolean(title && !hideHeader);

  return {
    role: 'dialog',
    'aria-modal': true,
    ...(useVisibleHeading
      ? { 'aria-labelledby': titleId }
      : { 'aria-label': ariaLabel || title || 'Dialog' }),
    ...(useVisibleHeading && hasSubtitle ? { 'aria-describedby': descriptionId } : {}),
  };
}

/**
 * Pure reference-counted body scroll lock tracker for stacked dialogs.
 */
export function createScrollLockCounter() {
  let activeCount = 0;

  return {
    acquire(): boolean {
      activeCount += 1;
      return activeCount === 1;
    },
    release(): boolean {
      if (activeCount === 0) return false;
      activeCount -= 1;
      return activeCount === 0;
    },
    count(): number {
      return activeCount;
    },
  };
}
