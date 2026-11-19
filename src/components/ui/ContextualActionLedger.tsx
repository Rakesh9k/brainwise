import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Pin,
  PinOff,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { BW_EASE } from '../motion/LiquidMotion';
import { typeClass } from '../../theme/typography';
import { TopoGridOverlay } from './TopoGridOverlay';
import {
  type ContextualCardData,
  buildContextualLedgerAriaProps,
  calculateLedgerPosition,
  formatCardDataAsCsv,
  formatCardDataAsJson,
  triggerFileDownload,
} from './contextualLedgerUtils';

interface ContextualActionLedgerContextValue {
  openLedger: (event: React.MouseEvent | { clientX: number; clientY: number }, card: ContextualCardData) => void;
  closeLedger: () => void;
  isOpen: boolean;
  activeCard: ContextualCardData | null;
}

const ContextualActionLedgerContext = createContext<ContextualActionLedgerContextValue | null>(null);

export function useContextualLedger() {
  const ctx = useContext(ContextualActionLedgerContext);
  if (!ctx) {
    throw new Error('useContextualLedger must be used within a ContextualActionLedgerProvider');
  }
  return ctx;
}

export const ContextualActionLedgerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { navigate, showToast, isWidgetPinned, togglePinWidget } = useBrainWise();
  const [activeCard, setActiveCard] = useState<ContextualCardData | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ledgerRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const closeLedger = useCallback(() => {
    setActiveCard(null);
    setCopied(false);
  }, []);

  const openLedger = useCallback(
    (event: React.MouseEvent | { clientX: number; clientY: number }, card: ContextualCardData) => {
      const clickX = 'clientX' in event ? event.clientX : 0;
      const clickY = 'clientY' in event ? event.clientY : 0;
      const safePos = calculateLedgerPosition(clickX, clickY, 280, 320);
      setPosition(safePos);
      setActiveCard(card);
      setCopied(false);
    },
    []
  );

  // Close on Escape or click outside or scroll
  useEffect(() => {
    if (!activeCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLedger();
      }
    };

    const handleScroll = () => {
      closeLedger();
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (ledgerRef.current && !ledgerRef.current.contains(e.target as Node)) {
        closeLedger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [activeCard, closeLedger]);

  const handleExportJson = () => {
    if (!activeCard) return;
    const jsonStr = formatCardDataAsJson(activeCard.title, activeCard.data ?? activeCard.details);
    const slug = activeCard.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`${slug}-telemetry.json`, jsonStr, 'application/json');
    showToast(`Exported "${activeCard.title}" dataset as JSON.`);
    closeLedger();
  };

  const handleExportCsv = () => {
    if (!activeCard) return;
    const csvStr = formatCardDataAsCsv(activeCard.title, activeCard.data ?? activeCard.details);
    const slug = activeCard.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`${slug}-telemetry.csv`, csvStr, 'text/csv');
    showToast(`Exported "${activeCard.title}" data as CSV.`);
    closeLedger();
  };

  const handlePin = () => {
    if (!activeCard) return;
    togglePinWidget(activeCard.id);
    closeLedger();
  };

  const handleViewDetails = () => {
    if (!activeCard) return;
    if (activeCard.route) {
      navigate(activeCard.route as any);
      showToast(`Navigated to ${activeCard.title} view.`);
    } else {
      showToast(`Inspecting ${activeCard.title} telemetry.`);
    }
    closeLedger();
  };

  const handleCopySummary = async () => {
    if (!activeCard) return;
    try {
      const summaryText = `${activeCard.title} (${activeCard.category || 'Executive Metric'})\n${
        typeof activeCard.data === 'string'
          ? activeCard.data
          : JSON.stringify(activeCard.data ?? {}, null, 2)
      }`;
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      showToast('Card telemetry copied to clipboard.');
      setTimeout(() => closeLedger(), 350);
    } catch {
      showToast('Could not access clipboard.');
      closeLedger();
    }
  };

  const handleRefresh = () => {
    if (!activeCard) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showToast(`Refreshed telemetry for "${activeCard.title}".`);
      closeLedger();
    }, 450);
  };

  const isPinned = activeCard ? isWidgetPinned(activeCard.id) : false;

  return (
    <ContextualActionLedgerContext.Provider
      value={{ openLedger, closeLedger, isOpen: Boolean(activeCard), activeCard }}
    >
      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeCard && (
              <div
                className="fixed inset-0 z-50 pointer-events-none"
                aria-hidden="false"
              >
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 pointer-events-auto"
                  onClick={closeLedger}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    closeLedger();
                  }}
                />

                {/* Floating Ceramic Contextual Action Ledger */}
                <motion.div
                  ref={ledgerRef}
                  {...buildContextualLedgerAriaProps(activeCard.title)}
                  initial={reduced ? false : { opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.97, y: -2 }}
                  transition={{ duration: 0.18, ease: BW_EASE }}
                  style={{ left: `${position.x}px`, top: `${position.y}px` }}
                  className="pointer-events-auto fixed z-50 w-[280px] bw-dialog-ceramic bw-surface-elevated rounded-[18px] overflow-hidden border border-[#E6E6E2] shadow-2xl focus:outline-none no-print"
                >
                  {/* Specular Topo Coordinate background mesh */}
                  <TopoGridOverlay tone="light" fade="edges" density="compact" intensity="subtle" />

                  {/* Header Strip */}
                  <div className="relative z-10 px-4 pt-3.5 pb-3 border-b border-[#EFEFEB] bg-[#FFFFFF]/75">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-mono-num font-semibold uppercase tracking-wider text-[#C44D00]">
                        <Sparkles className="w-3 h-3 text-[#FF7417]" />
                        <span>Action Ledger</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#FFF0E5] text-[#C44D00] font-medium border border-[#FFD9BE]">
                            <Pin className="w-2.5 h-2.5" />
                            Pinned
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={closeLedger}
                          aria-label="Close action ledger"
                          className="w-5 h-5 rounded-full hover:bg-[#F1F1EF] text-[#858585] hover:text-[#171717] inline-flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4 className="mt-1 text-xs font-semibold text-[#171717] truncate">
                      {activeCard.title}
                    </h4>
                    {activeCard.subtitle && (
                      <p className="text-[11px] text-[#858585] truncate mt-0.5">
                        {activeCard.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Ledger Command Items */}
                  <div className="relative z-10 p-1.5 space-y-0.5 bg-[#FFFFFF]/90">
                    {/* 1. Export Data */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportJson}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[8px] bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border border-[#EFEFEB] flex items-center justify-center text-[#5C5C58] group-hover:text-[#FF7417] shrink-0 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">Export Data</div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            Download JSON telemetry
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        JSON
                      </span>
                    </button>

                    {/* Export CSV variant */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportCsv}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[8px] bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border border-[#EFEFEB] flex items-center justify-center text-[#5C5C58] group-hover:text-[#24724E] shrink-0 transition-colors">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">Export Spreadsheet</div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            Tabular CSV format
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        CSV
                      </span>
                    </button>

                    {/* 2. Pin Widget */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handlePin}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-[8px] border flex items-center justify-center shrink-0 transition-colors ${
                            isPinned
                              ? 'bg-[#FFF0E5] border-[#FFD9BE] text-[#C44D00]'
                              : 'bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border-[#EFEFEB] text-[#5C5C58] group-hover:text-[#FF7417]'
                          }`}
                        >
                          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">
                            {isPinned ? 'Unpin Widget' : 'Pin Widget'}
                          </div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            {isPinned ? 'Remove from pinned list' : 'Keep at top of briefing'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        {isPinned ? 'Unpin' : 'Pin'}
                      </span>
                    </button>

                    {/* 3. View Details */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleViewDetails}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[8px] bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border border-[#EFEFEB] flex items-center justify-center text-[#5C5C58] group-hover:text-[#FF7417] shrink-0 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">View Details</div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            {activeCard.route ? `Open ${activeCard.route}` : 'Full breakdown'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        Inspect
                      </span>
                    </button>

                    {/* Hairline Divider */}
                    <div className="h-px bg-[#EFEFEB] my-1 mx-1.5" />

                    {/* 4. Copy Summary */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleCopySummary}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[8px] bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border border-[#EFEFEB] flex items-center justify-center text-[#5C5C58] group-hover:text-[#FF7417] shrink-0 transition-colors">
                          {copied ? <Check className="w-3.5 h-3.5 text-[#24724E]" /> : <Copy className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">Copy Summary</div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            {copied ? 'Copied!' : 'Clipboard snapshot'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        Copy
                      </span>
                    </button>

                    {/* 5. Refresh Telemetry */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-[10px] text-[#252525] hover:text-[#171717] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors cursor-pointer group text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[8px] bg-[#F5F5F4] group-hover:bg-[#FFFFFF] border border-[#EFEFEB] flex items-center justify-center text-[#5C5C58] group-hover:text-[#FF7417] shrink-0 transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FF7417]' : ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#171717] leading-tight">Refresh Telemetry</div>
                          <div className="text-[10px] text-[#858585] truncate leading-tight">
                            Sync live indicators
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#858585] border border-[#E6E6E2] shrink-0">
                        Sync
                      </span>
                    </button>
                  </div>

                  {/* Subtle Ceramic Footer */}
                  <div className="relative z-10 px-3 py-1.5 text-[10px] font-mono-num text-[#858585] bg-[#FAFAF9] border-t border-[#EFEFEB] flex items-center justify-between">
                    <span>Right-click any dashboard card</span>
                    <span>Esc to close</span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </ContextualActionLedgerContext.Provider>
  );
};

/**
 * ContextualCard
 * Wrapper for dashboard cards that wires right-click context menu listener,
 * displays a discreet pinned indicator if pinned, and provides an accessible
 * trigger for touch/keyboard users.
 */
export const ContextualCard: React.FC<{
  cardId: string;
  title: string;
  subtitle?: string;
  category?: string;
  route?: string;
  data?: unknown;
  showPinBadge?: boolean;
  showActionTrigger?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({
  cardId,
  title,
  subtitle,
  category,
  route,
  data,
  showPinBadge = true,
  showActionTrigger = true,
  className = '',
  children,
}) => {
  const { openLedger } = useContextualLedger();
  const { isWidgetPinned } = useBrainWise();
  const pinned = isWidgetPinned(cardId);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openLedger(e, { id: cardId, title, subtitle, category, route, data });
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (triggerButtonRef.current) {
      const rect = triggerButtonRef.current.getBoundingClientRect();
      openLedger({ clientX: rect.right, clientY: rect.bottom + 4 }, {
        id: cardId,
        title,
        subtitle,
        category,
        route,
        data,
      });
    } else {
      openLedger(e, { id: cardId, title, subtitle, category, route, data });
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`group/context-card relative ${className}`}
      data-context-card={cardId}
    >
      {children}

      {/* Discreet top-right pinned badge */}
      {showPinBadge && pinned && (
        <div
          title="Pinned to Executive Command Strip"
          className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0E5]/90 border border-[#FFD9BE] text-[#C44D00] text-[10px] font-mono-num font-semibold shadow-xs"
        >
          <Pin className="w-2.5 h-2.5" />
          <span>Pinned</span>
        </div>
      )}

      {/* Subtle accessible 3-dot action trigger on hover/focus */}
      {showActionTrigger && (
        <button
          ref={triggerButtonRef}
          type="button"
          aria-label={`Open Contextual Action Ledger for ${title}`}
          title="Right-click or press to open Contextual Action Ledger"
          onClick={handleTriggerClick}
          className={`absolute ${
            pinned ? 'top-3 right-20' : 'top-3 right-3'
          } z-20 w-6 h-6 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] border border-[#EAEAE5] hover:border-[#D6D6D0] text-[#858585] hover:text-[#171717] opacity-0 group-hover/context-card:opacity-100 group-focus-within/context-card:opacity-100 transition-all duration-150 shadow-xs inline-flex items-center justify-center cursor-pointer`}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
