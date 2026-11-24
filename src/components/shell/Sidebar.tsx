import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  Palette,
  Radar,
  Settings,
  Swords,
  X,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import type { AppRoute } from '../../types/brainwise';
import { BrandLogoMark } from '../ui/DesignSystem';
import { BW_EASE } from '../motion/LiquidMotion';

const NAV_GROUPS: {
  id: string;
  label: string;
  items: { id: AppRoute; aliases?: AppRoute[]; label: string; icon: React.ReactNode }[];
}[] = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { id: 'dashboard', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'business-brain', label: 'Business Brain', icon: <Brain className="w-4 h-4" /> },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        id: 'idea-intelligence',
        label: 'Idea Intelligence',
        icon: <Lightbulb className="w-4 h-4" />,
      },
      {
        id: 'competitive-intelligence',
        label: 'Competitive Intelligence',
        icon: <Swords className="w-4 h-4" />,
      },
      {
        id: 'market-watch',
        label: 'Market Watch',
        icon: <Radar className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'brand',
    label: 'Brand & Assets',
    items: [
      { id: 'brand-studio', label: 'Brand Studio', icon: <Palette className="w-4 h-4" /> },
      { id: 'asset-library', label: 'Asset Library', icon: <FolderKanban className="w-4 h-4" /> },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    items: [
      {
        id: 'growth-director',
        aliases: ['tasks-experiments'],
        label: 'Growth Planner',
        icon: <Compass className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'measure',
    label: 'Measure',
    items: [
      {
        id: 'business-performance',
        aliases: ['reports'],
        label: 'Analytics & Reports',
        icon: <BarChart3 className="w-4 h-4" />,
      },
    ],
  },
];

export const Sidebar: React.FC<{
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}> = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { state, navigate } = useBrainWise();
  const reduced = useReducedMotion();

  const handleNav = (route: AppRoute) => {
    navigate(route);
    onCloseMobile();
  };

  const sidebarContent = (isMobileDrawer: boolean) => {
    const isCompact = collapsed && !isMobileDrawer;
    const navLayoutId = isMobileDrawer ? 'bw-nav-active-mobile' : 'bw-nav-active-desktop';

    const settingsActive =
      state.currentRoute === 'settings' || state.currentRoute === 'help-support';

    return (
      <div className="flex flex-col h-full bg-transparent text-[#5C5C58] select-none">
        {/* Top brand bar */}
        <div
          className={`flex items-center justify-between px-4 h-16 border-b border-[#E6E6E2]/70 shrink-0 ${
            isCompact ? 'justify-center px-2' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer min-w-0 rounded-[10px] focus-ring"
          >
            <BrandLogoMark size={26} />
            {!isCompact && (
              <span className="font-heading text-[15px] font-bold tracking-tight text-[#171717] whitespace-nowrap">
                BrainWise
              </span>
            )}
          </button>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-full text-[#858585] hover:text-[#171717] hover:bg-[#EFEFEB] cursor-pointer transition-colors focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex p-1.5 rounded-full text-[#858585] hover:text-[#171717] hover:bg-[#EFEFEB] cursor-pointer transition-colors focus-ring"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Quiet Active Workspace Anchor */}
        {!isCompact && (
          <div className="px-4 py-3.5 border-b border-[#E6E6E2]/70 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono-num uppercase tracking-[0.08em] text-[#858585]">
                Workspace
              </div>
              <div className="text-xs font-semibold text-[#171717] truncate mt-0.5">
                {state.brain.businessName}
              </div>
            </div>
            <span
              aria-hidden="true"
              title={
                state.brain.activationState === 'DORMANT_SANDBOX'
                  ? 'Idea Sandbox Mode (Dormant Brain)'
                  : 'Business Brain synced'
              }
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                state.brain.activationState === 'DORMANT_SANDBOX' ? 'bg-[#FF9A45]' : 'bg-[#24724E]'
              }`}
            />
          </div>
        )}

        {/* Calm Minimalist Navigation Rail */}
        <nav
          aria-label="Main workspace navigation"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-0.5">
              {!isCompact && (
                <div className="px-3 pb-1 text-[10px] font-mono-num uppercase tracking-[0.08em] text-[#9A9A94]">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active =
                  state.currentRoute === item.id ||
                  Boolean(item.aliases?.includes(state.currentRoute as AppRoute));
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    title={isCompact ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-full text-[13px] transition-colors cursor-pointer focus-ring ${
                      isCompact ? 'justify-center px-2' : ''
                    } ${
                      active
                        ? 'text-[#171717] font-semibold'
                        : 'text-[#686864] font-medium hover:text-[#171717] hover:bg-[#FFFFFF]/65'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={reduced ? undefined : navLayoutId}
                        transition={{ duration: 0.22, ease: BW_EASE }}
                        className="absolute inset-0 rounded-full bg-[#FFFFFF]/95 border border-[#E6E6E2] bw-ceramic-control"
                      />
                    )}
                    <span
                      className={`relative z-10 ${active ? 'text-[#171717]' : 'text-[#858585]'}`}
                    >
                      {item.icon}
                    </span>
                    {!isCompact && (
                      <span className="relative z-10 truncate whitespace-nowrap flex-1 text-left flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.id === 'business-brain' &&
                          state.brain.activationState === 'DORMANT_SANDBOX' && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#C44D00] bg-[#FFF0E5] px-1.5 py-0.5 rounded-full border border-[#FED7AA] ml-1.5">
                              Idea Mode
                            </span>
                          )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="p-3 border-t border-[#E6E6E2]/70 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('settings')}
            title={isCompact ? 'Settings & Workspace' : undefined}
            aria-current={settingsActive ? 'page' : undefined}
            className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-full text-[13px] transition-colors cursor-pointer focus-ring ${
              isCompact ? 'justify-center px-2' : ''
            } ${
              settingsActive
                ? 'text-[#171717] font-semibold'
                : 'text-[#686864] font-medium hover:text-[#171717] hover:bg-[#FFFFFF]/65'
            }`}
          >
            {settingsActive && (
              <motion.span
                layoutId={reduced ? undefined : navLayoutId}
                transition={{ duration: 0.22, ease: BW_EASE }}
                className="absolute inset-0 rounded-full bg-[#FFFFFF]/95 border border-[#E6E6E2] bw-ceramic-control"
              />
            )}
            <Settings
              className={`relative z-10 w-4 h-4 ${
                settingsActive ? 'text-[#171717]' : 'text-[#858585]'
              }`}
            />
            {!isCompact && (
              <span className="relative z-10 whitespace-nowrap">Settings &amp; Workspace</span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop fixed/collapsible frosted-glass sidebar */}
      <aside
        data-frosted-nav="sidebar"
        className={`relative z-20 hidden lg:block shrink-0 transition-[width] duration-200 border-r border-[#E6E6E2]/75 bw-frosted-nav ${
          collapsed ? 'w-[72px]' : 'w-[244px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile slide-over frosted-glass sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-[#171717]/35 backdrop-blur-xs"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.aside
              data-frosted-nav="sidebar-mobile"
              initial={reduced ? false : { x: -280 }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: -280 }}
              transition={{ duration: 0.24, ease: BW_EASE }}
              className="relative w-[272px] max-w-[85vw] h-full z-10 border-r border-[#E6E6E2]/80 bw-frosted-nav-elevated"
            >
              {sidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
