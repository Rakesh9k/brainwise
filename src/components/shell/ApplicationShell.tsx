import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { MorphingPanel, SuccessTransition } from '../motion/LiquidMotion';
import { GlobalSearchModal, NotificationPanel } from '../ui/Overlay';
import { TopoGridOverlay } from '../ui/TopoGridOverlay';
import { StrategistChatDrawer } from '../chat/StrategistChatDrawer';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const ApplicationShell: React.FC<{
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}> = ({ children, rightPanel }) => {
  const { state, toast, dismissToast, exitExampleWorkspace } = useBrainWise();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [strategistOpen, setStrategistOpen] = useState(false);
  const compact = Boolean(state.workspacePrefs?.compactDensity);
  const brandAccent = state.brain?.brandIdentity?.colors?.primary || '#FF7417';

  return (
    <div
      data-density={compact ? 'compact' : 'comfortable'}
      style={{ ['--bw-brand-accent' as any]: brandAccent }}
      className="relative min-h-screen flex bg-[#FAFAF9] text-[#252525] overflow-x-clip"
    >
      <TopoGridOverlay
        tone="light"
        fade="top-radial"
        density="default"
        intensity="crisp"
        rounded={false}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-30 flex flex-col">
          {state.isExampleWorkspace && (
            <div
              role="status"
              aria-label="Example workspace notice"
              className="bg-[#FFF7ED] border-b border-[#FDBA74]/80 px-4 sm:px-8 py-2 flex items-center justify-between gap-3 text-xs text-[#9A3412] shadow-2xs no-print"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0 animate-pulse" />
                <span className="font-semibold uppercase tracking-[0.06em] text-[10px] bg-[#FFEDD5] text-[#C2410C] px-2 py-0.5 rounded-full border border-[#FDBA74]/50 shrink-0">
                  Sample Showcase
                </span>
                <span className="truncate">
                  Viewing preloaded demonstration data for <strong>Solstice Craft Coffee</strong>. Your personal workspace is kept separate.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={exitExampleWorkspace}
                  className="h-7 px-3 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 focus-ring"
                >
                  <span>Return to My Workspace</span>
                </button>
              </div>
            </div>
          )}

          <Header
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenStrategist={() => setStrategistOpen(true)}
          />
        </div>

        <div className="relative flex-1 flex min-w-0">
          <main
            className={`relative z-10 flex-1 min-w-0 px-5 sm:px-8 lg:px-12 max-w-[1260px] mx-auto w-full ${
              compact ? 'py-5 sm:py-6' : 'py-7 sm:py-10'
            }`}
          >
            {children}
          </main>

          {rightPanel && (
            <aside
              data-frosted-nav="right-panel"
              className="relative z-10 hidden xl:block w-[320px] shrink-0 border-l border-[#E6E6E2]/75 bw-frosted-nav p-6"
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      <GlobalSearchModal />

      <StrategistChatDrawer open={strategistOpen} onClose={() => setStrategistOpen(false)} />

      {/* Floating Executive Strategist Button */}
      <button
        type="button"
        onClick={() => setStrategistOpen(true)}
        aria-label="Ask Executive AI Strategist"
        className="fixed bottom-6 right-6 z-40 h-10 px-3.5 rounded-full bg-[#171717] hover:bg-[#262626] text-white shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-[#333333] transition-all hover:scale-105 active:scale-95 no-print"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF7417] animate-pulse" />
        <span>Ask Strategist</span>
        <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
      </button>

      <AnimatePresence>
        {toast && (
          <MorphingPanel
            key={toast.id}
            role="status"
            aria-label={toast.message}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-[#171717] text-white text-xs font-medium shadow-2xl border border-[#2A2A2A] sm:max-w-md no-print"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <SuccessTransition compact />
              <span className="truncate">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    dismissToast();
                  }}
                  className="inline-flex items-center gap-1 pl-2.5 border-l border-[#3A3A3A] text-[#FF9A45] hover:text-[#FFF0E5] font-semibold shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {toast.undoLabel ?? 'Undo'}
                </button>
              )}
              <button
                type="button"
                onClick={dismissToast}
                aria-label="Dismiss notification"
                className="text-[#858585] hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </MorphingPanel>
        )}
      </AnimatePresence>
    </div>
  );
};
