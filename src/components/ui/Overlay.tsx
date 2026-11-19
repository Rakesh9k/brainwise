import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Bell, Check, Search, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { filterGlobalSearch } from '../../utils/logic';
import { BW_EASE } from '../motion/LiquidMotion';
import { typeClass } from '../../theme/typography';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  type DialogProps,
} from './Dialog';
import type { DialogSize } from './dialogUtils';

export { Dialog, DialogBody, DialogFooter, DialogHeader };
export type { DialogProps };

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  mutedPrefix?: string;
  eyebrow?: string;
  subtitle?: string;
  size?: DialogSize;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({
  open,
  onClose,
  title,
  mutedPrefix,
  eyebrow,
  subtitle,
  size,
  maxWidth,
  footer,
  children,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    mutedPrefix={mutedPrefix}
    eyebrow={eyebrow}
    subtitle={subtitle}
    size={size}
    maxWidth={maxWidth}
    footer={footer}
  >
    {children}
  </Dialog>
);

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const drawerTree = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: BW_EASE }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex justify-end p-0 sm:p-3 bw-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={reduced ? false : { x: 420, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? undefined : { x: 420, opacity: 0.6 }}
            transition={{ duration: 0.24, ease: BW_EASE }}
            className="w-full max-w-md h-full bw-dialog-ceramic bw-surface-elevated sm:rounded-[24px] overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#EFEFEB] bg-[#FFFFFF]/60">
              <div>
                <h3 className={`${typeClass.h4} text-[#171717]`}>{title}</h3>
                {subtitle && <p className={`${typeClass.bodySm} text-[#5C5C58] mt-1`}>{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#EAEAE5] hover:border-[#D6D6D0] text-[#686864] hover:text-[#171717] bw-ceramic-control inline-flex items-center justify-center shrink-0 transition-all focus-ring cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return drawerTree;
  return createPortal(drawerTree, document.body);
};

export const ConfirmationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs sm:text-sm font-medium text-[#252525] bg-[#FFFFFF] hover:bg-[#FAFAF9] border border-[#E8E8E4] hover:border-[#D6D6D0] bw-ceramic-control rounded-full transition-all focus-ring cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-5 py-2 text-xs sm:text-sm font-medium text-white rounded-full transition-colors focus-ring cursor-pointer ${
            destructive
              ? 'bg-[#BC3E3E] hover:bg-[#A13232]'
              : 'bg-[#171717] hover:bg-[#2A2A28]'
          }`}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p className={`${typeClass.bodySm} text-[#5C5C58]`}>{message}</p>
  </Dialog>
);

export const NotificationPanel: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { state, markAllNotificationsRead, markNotificationRead, navigate } = useBrainWise();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = state.notifications.filter((n) => (filter === 'unread' ? !n.read : true));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notification Centre"
      subtitle="Competitor signals, research updates & daily execution reminders"
    >
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EFEFEB]">
        <div className="inline-flex p-1 bg-[#F1F1EF] rounded-full">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full focus-ring cursor-pointer ${
              filter === 'all' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#5C5C58]'
            }`}
          >
            All ({state.notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-xs font-medium rounded-full focus-ring cursor-pointer ${
              filter === 'unread' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#5C5C58]'
            }`}
          >
            Unread ({state.notifications.filter((n) => !n.read).length})
          </button>
        </div>
        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="text-xs font-medium text-[#C44D00] hover:text-[#FF7417] inline-flex items-center gap-1 rounded-[6px] focus-ring cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          Mark all read
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-7 h-7 text-[#858585] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#252525]">All caught up</p>
            <p className="text-xs text-[#5C5C58] mt-1">No unread intelligence alerts right now.</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markNotificationRead(n.id);
                navigate(n.targetRoute);
                onClose();
              }}
              className={`w-full text-left p-4 rounded-[16px] border transition-colors focus-ring cursor-pointer ${
                n.read
                  ? 'bg-[#FFFFFF] border-[#ECECE8] hover:bg-[#FAFAF9]'
                  : 'bg-[#FFF0E5]/50 border-[#FFD3B3] hover:bg-[#FFF0E5]/75'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#5C5C58]">
                <span className="font-medium text-[#C44D00]">{n.category}</span>
                <span>{n.timestamp}</span>
              </div>
              <div className="text-sm font-semibold text-[#252525] mt-1">{n.title}</div>
              <p className="text-xs text-[#5C5C58] mt-0.5 leading-relaxed">{n.description}</p>
            </button>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-[#E6E6E2]">
        <button
          type="button"
          onClick={() => {
            navigate('settings', { settingsTab: 'notification-settings' });
            onClose();
          }}
          className="text-xs font-medium text-[#252525] hover:text-[#C44D00] rounded-[6px] focus-ring cursor-pointer"
        >
          Manage notification preferences →
        </button>
      </div>
    </Drawer>
  );
};

export const GlobalSearchModal: React.FC = () => {
  const {
    state,
    globalSearchOpen,
    setGlobalSearchOpen,
    navigate,
    toggleTaskStatus,
    setPrefilledIdeaPrompt,
  } = useBrainWise();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const quickActions = [
    {
      id: 'cmd-dossier',
      title: 'Run New Validation Dossier',
      subtitle: 'Launch 7-step Idea Intelligence workflow',
      category: 'Command',
      run: () => {
        setPrefilledIdeaPrompt(query.trim());
        navigate('idea-intelligence');
      },
    },
    {
      id: 'cmd-focus',
      title: 'Open Growth Planner & Today’s Focus',
      subtitle: 'Jump to prioritized daily sprint tasks',
      category: 'Command',
      run: () => navigate('growth-director'),
    },
    {
      id: 'cmd-comp',
      title: 'Inspect Competitive Positioning Map',
      subtitle: 'Reposition target marker & review complaint clusters',
      category: 'Command',
      run: () => navigate('competitive-intelligence'),
    },
    {
      id: 'cmd-brand',
      title: 'Open Brand Studio & Design Tokens',
      subtitle: 'Preview live collateral & export CSS/JSON variables',
      category: 'Command',
      run: () => navigate('brand-studio'),
    },
    {
      id: 'cmd-watch',
      title: 'Review Market Watch Alerts',
      subtitle: 'Check rival price/product shifts & queue counter-tests',
      category: 'Command',
      run: () => navigate('market-watch'),
    },
    {
      id: 'cmd-brain',
      title: 'Open Business Brain Repository',
      subtitle: 'Update offerings, personas & strategic decisions',
      category: 'Command',
      run: () => navigate('business-brain'),
    },
  ].filter(
    (cmd) =>
      !query.trim() ||
      cmd.title.toLowerCase().includes(query.trim().toLowerCase()) ||
      cmd.subtitle.toLowerCase().includes(query.trim().toLowerCase())
  );

  const hits = filterGlobalSearch(query, state);
  const totalCount = quickActions.length + hits.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, globalSearchOpen]);

  useEffect(() => {
    if (!globalSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setGlobalSearchOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (totalCount > 0) setSelectedIndex((prev) => (prev + 1) % totalCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (totalCount > 0) setSelectedIndex((prev) => (prev - 1 + totalCount) % totalCount);
      } else if (e.key === 'Enter' && totalCount > 0) {
        e.preventDefault();
        if (selectedIndex < quickActions.length) {
          quickActions[selectedIndex].run();
          setGlobalSearchOpen(false);
        } else {
          const hit = hits[selectedIndex - quickActions.length];
          if (hit) {
            if (hit.route === 'competitive-intelligence' && hit.itemId) {
              navigate('competitive-intelligence', { competitorId: hit.itemId });
            } else if (hit.route === 'idea-intelligence' && hit.itemId) {
              navigate('idea-intelligence', { reportId: hit.itemId });
            } else {
              navigate(hit.route);
            }
            setGlobalSearchOpen(false);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [globalSearchOpen, selectedIndex, totalCount, quickActions, hits]);

  return (
    <Dialog
      open={globalSearchOpen}
      onClose={() => setGlobalSearchOpen(false)}
      size="lg"
      placement="top"
      hideHeader
      ariaLabel="Global workspace command palette"
      panelClassName="rounded-[22px]"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EFEFEB] bg-[#FFFFFF]/70">
        <Search className="w-4 h-4 text-[#858585] shrink-0" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to department, run dossier, toggle task, or inspect rival..."
          aria-label="Global command search input"
          className="w-full text-sm text-[#171717] bg-transparent placeholder:text-[#858585] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setGlobalSearchOpen(false)}
          aria-label="Close global search"
          className="text-[11px] font-mono-num text-[#686864] hover:text-[#171717] px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#EAEAE5] bw-ceramic-control focus-ring cursor-pointer transition-colors"
        >
          Esc
        </button>
      </div>

            <div className="max-h-[58vh] overflow-y-auto divide-y divide-[#EFEFEB]">
              {quickActions.length > 0 && (
                <div className="py-1.5">
                  <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
                    Quick Commands
                  </div>
                  {quickActions.map((cmd, idx) => {
                    const active = selectedIndex === idx;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          cmd.run();
                          setGlobalSearchOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors focus-ring-inset cursor-pointer ${
                          active ? 'bg-[#FFF0E5]/70' : 'hover:bg-[#FAFAF9]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#252525] truncate">{cmd.title}</div>
                          <div className="text-xs text-[#5C5C58] truncate">{cmd.subtitle}</div>
                        </div>
                        <span className="text-[11px] font-mono-num text-[#C44D00] shrink-0">Jump →</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {hits.length === 0 && quickActions.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#5C5C58]">
                  No matches found for "{query}". Try searching a competitor, task, or asset.
                </div>
              ) : (
                hits.length > 0 && (
                  <div className="py-1.5">
                    <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
                      Workspace Records
                    </div>
                    {hits.map((hit, idx) => {
                      const rowIndex = quickActions.length + idx;
                      const active = selectedIndex === rowIndex;
                      const taskRecord =
                        hit.category === 'Task' && hit.itemId
                          ? state.tasks.find((t) => t.id === hit.itemId)
                          : undefined;
                      const isTaskDone = taskRecord?.status === 'completed';

                      return (
                        <div
                          key={hit.id}
                          onMouseEnter={() => setSelectedIndex(rowIndex)}
                          className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                            active ? 'bg-[#FFF0E5]/70' : 'hover:bg-[#FAFAF9]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (hit.route === 'competitive-intelligence' && hit.itemId) {
                                navigate('competitive-intelligence', { competitorId: hit.itemId });
                              } else if (hit.route === 'idea-intelligence' && hit.itemId) {
                                navigate('idea-intelligence', { reportId: hit.itemId });
                              } else {
                                navigate(hit.route);
                              }
                              setGlobalSearchOpen(false);
                            }}
                            className="flex-1 min-w-0 text-left rounded-[6px] focus-ring-inset cursor-pointer"
                          >
                            <div className="text-[11px] font-medium text-[#C44D00]">{hit.category}</div>
                            <div
                              className={`text-sm font-medium truncate ${
                                isTaskDone ? 'line-through text-[#858585]' : 'text-[#252525]'
                              }`}
                            >
                              {hit.title}
                            </div>
                            <div className="text-xs text-[#5C5C58] truncate">{hit.subtitle}</div>
                          </button>

                          {taskRecord ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskStatus(taskRecord.id);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-[6px] border shrink-0 focus-ring cursor-pointer ${
                                isTaskDone
                                  ? 'bg-[#ECF7F1] text-[#24724E] border-[#CEE8DA]'
                                  : 'bg-white text-[#252525] border-[#E6E6E2] hover:border-[#FF7417]'
                              }`}
                            >
                              {isTaskDone ? 'Done ✓' : 'Mark Done'}
                            </button>
                          ) : (
                            <ArrowRight className="w-4 h-4 text-[#858585] shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

      <div className="px-5 py-2.5 bg-[#FAFAF9]/90 border-t border-[#EFEFEB] flex items-center justify-between text-[11px] text-[#686864]">
        <span>↑↓ Navigate · Enter Select · Esc Close</span>
        <span className="font-mono-num">⌘K Command Palette</span>
      </div>
    </Dialog>
  );
};
