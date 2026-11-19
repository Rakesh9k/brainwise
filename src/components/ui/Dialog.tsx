import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { BW_EASE } from '../motion/LiquidMotion';
import { typeClass } from '../../theme/typography';
import {
  DIALOG_PLACEMENT_CLASSES,
  type DialogPlacement,
  type DialogSize,
  buildDialogAriaProps,
  createScrollLockCounter,
  resolveDialogWidthClass,
} from './dialogUtils';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const bodyScrollLock = createScrollLockCounter();
let savedBodyOverflow = '';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  mutedPrefix?: string;
  eyebrow?: string;
  subtitle?: string;
  ariaLabel?: string;
  size?: DialogSize;
  maxWidth?: string;
  placement?: DialogPlacement;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const DialogHeader: React.FC<{
  title: React.ReactNode;
  mutedPrefix?: string;
  eyebrow?: string;
  subtitle?: string;
  titleId?: string;
  descriptionId?: string;
  onClose?: () => void;
  closeLabel?: string;
  hideCloseButton?: boolean;
  className?: string;
}> = ({
  title,
  mutedPrefix,
  eyebrow,
  subtitle,
  titleId,
  descriptionId,
  onClose,
  closeLabel = 'Close dialog',
  hideCloseButton = false,
  className = '',
}) => (
  <div
    className={`flex items-start justify-between gap-4 px-6 sm:px-7 py-5 border-b border-[#EFEFEB] bg-[#FFFFFF]/60 ${className}`}
  >
    <div className="min-w-0 space-y-1">
      {eyebrow && <div className={`${typeClass.overline} text-[#858585]`}>{eyebrow}</div>}
      <h3 id={titleId} className={`${typeClass.h4} text-[#171717]`}>
        {mutedPrefix && <span className="font-normal text-[#858585] mr-1.5">{mutedPrefix}</span>}
        <span>{title}</span>
      </h3>
      {subtitle && (
        <p id={descriptionId} className={`${typeClass.bodySm} text-[#5C5C58]`}>
          {subtitle}
        </p>
      )}
    </div>
    {!hideCloseButton && onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#EAEAE5] hover:border-[#D6D6D0] text-[#686864] hover:text-[#171717] bw-ceramic-control inline-flex items-center justify-center shrink-0 transition-all focus-ring cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export const DialogBody: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`px-6 sm:px-7 py-6 overflow-y-auto flex-1 ${className}`}>{children}</div>
);

export const DialogFooter: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div
    className={`px-6 sm:px-7 py-4 bg-[#FAFAF9]/90 border-t border-[#EFEFEB] flex flex-wrap items-center justify-end gap-2.5 ${className}`}
  >
    {children}
  </div>
);

/**
 * Standardized Tactile Ceramic Dialog / Modal Wrapper
 * Uses the `--bw-surface-elevated` layered ceramic elevation shadow,
 * specular top porcelain highlight, blurred studio-glass backdrop,
 * Escape & backdrop dismissal, body scroll lock, and keyboard focus trapping.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  mutedPrefix,
  eyebrow,
  subtitle,
  ariaLabel,
  size = 'md',
  maxWidth,
  placement = 'center',
  hideHeader = false,
  hideCloseButton = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  panelClassName = '',
  bodyClassName = '',
  children,
}) => {
  const reduced = useReducedMotion();
  const reactId = useId().replace(/:/g, '');
  const titleId = `bw-dialog-title-${reactId}`;
  const descriptionId = `bw-dialog-desc-${reactId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Reference-counted body scroll lock
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const isFirst = bodyScrollLock.acquire();
    if (isFirst) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      const isLast = bodyScrollLock.release();
      if (isLast) {
        document.body.style.overflow = savedBodyOverflow;
      }
    };
  }, [open]);

  // Focus restoration + initial focus into dialog
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(document.activeElement)) return;
      const autoFocusTarget = panel.querySelector<HTMLElement>('[autofocus]');
      if (autoFocusTarget) {
        autoFocusTarget.focus();
        return;
      }
      panel.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape dismissal & Tab focus trap
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
        if (!focusables.length) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panelRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, closeOnEscape]);

  const widthClass = resolveDialogWidthClass(size, maxWidth);
  const placementClass = DIALOG_PLACEMENT_CLASSES[placement];
  const ariaProps = buildDialogAriaProps({
    title,
    ariaLabel,
    hideHeader,
    hasSubtitle: Boolean(subtitle),
    titleId,
    descriptionId,
  });

  const dialogTree = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: BW_EASE }}
          onMouseDown={(e) => {
            if (closeOnBackdropClick && e.target === e.currentTarget) {
              onClose();
            }
          }}
          className={`fixed inset-0 z-50 flex ${placementClass} bw-dialog-backdrop`}
          {...ariaProps}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.982 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 8, scale: 0.988 }}
            transition={{ duration: 0.24, ease: BW_EASE }}
            className={`w-full ${widthClass} bw-dialog-ceramic bw-surface-elevated rounded-[24px] overflow-hidden max-h-[90vh] flex flex-col focus:outline-none ${panelClassName}`}
          >
            {!hideHeader && title && (
              <DialogHeader
                title={title}
                mutedPrefix={mutedPrefix}
                eyebrow={eyebrow}
                subtitle={subtitle}
                titleId={titleId}
                descriptionId={descriptionId}
                onClose={onClose}
                closeLabel={`Close ${title}`}
                hideCloseButton={hideCloseButton}
              />
            )}

            {hideHeader ? children : <DialogBody className={bodyClassName}>{children}</DialogBody>}

            {footer && <DialogFooter>{footer}</DialogFooter>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return dialogTree;
  }

  return createPortal(dialogTree, document.body);
};
