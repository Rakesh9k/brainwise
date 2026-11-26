import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Layers,
  Lightbulb,
  Palette,
  Radar,
  Settings,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import type { AppRoute, BusinessBrainData } from '../../types/brainwise';
import { BrandLogoMark } from '../ui/DesignSystem';
import { BW_EASE } from '../motion/LiquidMotion';
import { AllToolsDirectoryModal } from './AllToolsDirectoryModal';

interface NavItemDef {
  id: AppRoute;
  aliases?: AppRoute[];
  label: string;
  icon: React.ReactNode;
}

const STAGE_1_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'idea-intelligence', label: 'Idea Validation Hub', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'competitive-intelligence', label: 'Competitor Research', icon: <Swords className="w-4 h-4" /> },
  { id: 'business-brain', label: 'Business Brain', icon: <Brain className="w-4 h-4" /> },
];

const STAGE_2_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'brand-studio', label: 'AI Brand Studio', icon: <Palette className="w-4 h-4" /> },
  { id: 'asset-library', label: 'Packaging & Collateral', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'growth-director', aliases: ['tasks-experiments'], label: '30-Day Launch Roadmap', icon: <Compass className="w-4 h-4" /> },
  { id: 'business-brain', label: 'Business Brain', icon: <Brain className="w-4 h-4" /> },
];

const STAGE_3_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Daily Briefing (Home)', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'market-watch', label: 'Market Watch Radar', icon: <Radar className="w-4 h-4" /> },
  { id: 'brand-studio', label: 'Content & Brand Studio', icon: <Palette className="w-4 h-4" /> },
  { id: 'growth-director', aliases: ['tasks-experiments'], label: 'Growth Planner & Tasks', icon: <Compass className="w-4 h-4" /> },
  { id: 'business-performance', aliases: ['reports'], label: 'Analytics & Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'business-brain', label: 'Business Brain', icon: <Brain className="w-4 h-4" /> },
];

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
  const { state, navigate, updateBrain, openExampleWorkspace, exitExampleWorkspace } = useBrainWise();
  const [isAllToolsModalOpen, setIsAllToolsModalOpen] = useState(false);
  const [navMode, setNavMode] = useState<'stage' | 'all'>('stage');
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const reduced = useReducedMotion();

  const handleNav = (route: AppRoute) => {
    navigate(route);
    onCloseMobile();
  };

  const rawStage = state.brain.stage;
  const currentStageNum: 1 | 2 | 3 =
    rawStage === 'Idea Stage' ? 1 : rawStage === 'Pre-Launch' ? 2 : 3;

  const stageLabel =
    currentStageNum === 1
      ? 'Idea & Validation'
      : currentStageNum === 2
        ? 'Brand & Launch'
        : 'Traction & Scale';

  const stageItems =
    currentStageNum === 1
      ? STAGE_1_ITEMS
      : currentStageNum === 2
        ? STAGE_2_ITEMS
        : STAGE_3_ITEMS;

  const handleChangeStage = (newStage: BusinessBrainData['stage']) => {
    updateBrain({ stage: newStage });
    setIsStageMenuOpen(false);
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
            {isCompact ? (
              <BrandLogoMark size={28} />
            ) : (
              <img src="/brainwise-logo.png" alt="BrainWise" className="h-7 max-w-[150px] object-contain" />
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
          <div className="px-4 py-3 border-b border-[#E6E6E2]/70 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-mono-num uppercase tracking-[0.08em] text-[#858585]">
                  {state.isExampleWorkspace ? 'Sample Showcase' : 'Workspace'}
                </div>
                <div className="text-xs font-semibold text-[#171717] truncate mt-0.5">
                  {state.brain.businessName}
                </div>
              </div>
              {state.isExampleWorkspace ? (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#FF7417]/15 text-[#C44D00] rounded">
                  EXAMPLE
                </span>
              ) : (
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
              )}
            </div>

            {state.isExampleWorkspace ? (
              <button
                type="button"
                onClick={exitExampleWorkspace}
                className="text-[11px] text-[#C44D00] hover:text-[#9E3E00] font-medium text-left underline underline-offset-2 cursor-pointer transition-colors"
              >
                ← Return to My Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={openExampleWorkspace}
                className="text-[11px] text-[#858585] hover:text-[#171717] text-left hover:underline cursor-pointer transition-colors flex items-center justify-between"
              >
                <span>Explore Solstice Example</span>
                <span className="text-[10px] text-[#FF7417]">↗</span>
              </button>
            )}
          </div>
        )}

        {/* Stage-Based Progressive Navigation Anchor */}
        {!isCompact && (
          <div className="px-4 py-2.5 border-b border-[#E6E6E2]/70 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#858585]">
                Active Flow
              </span>
              <button
                type="button"
                onClick={() => setNavMode((m) => (m === 'stage' ? 'all' : 'stage'))}
                className="text-[10px] font-semibold text-[#FF7417] hover:underline cursor-pointer"
              >
                {navMode === 'stage' ? 'Show All Depts' : 'Stage Focus'}
              </button>
            </div>

            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setIsStageMenuOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] bg-[#FAF9F8] hover:bg-[#F2F2EE] border border-[#E6E6E2] text-xs font-bold text-[#171717] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#FF7417] shrink-0" />
                  <span className="truncate">
                    {navMode === 'all'
                      ? 'All 14 Departments'
                      : `Stage ${currentStageNum}: ${stageLabel}`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#858585] shrink-0" />
              </button>

              <AnimatePresence>
                {isStageMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E6E6E2] rounded-[10px] shadow-lg p-1.5 z-30 space-y-1 text-xs"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono text-[#858585] uppercase">
                      Select Business Stage:
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleChangeStage('Idea Stage');
                        setNavMode('stage');
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center justify-between ${
                        currentStageNum === 1 && navMode === 'stage'
                          ? 'bg-[#FFF3EB] text-[#C44D00] font-bold'
                          : 'hover:bg-[#F5F5F4] text-[#40403E]'
                      }`}
                    >
                      <span>Stage 1: Idea &amp; Validation</span>
                      {currentStageNum === 1 && navMode === 'stage' && <span>✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChangeStage('Pre-Launch');
                        setNavMode('stage');
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center justify-between ${
                        currentStageNum === 2 && navMode === 'stage'
                          ? 'bg-[#FFF3EB] text-[#C44D00] font-bold'
                          : 'hover:bg-[#F5F5F4] text-[#40403E]'
                      }`}
                    >
                      <span>Stage 2: Brand &amp; Launch</span>
                      {currentStageNum === 2 && navMode === 'stage' && <span>✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChangeStage('Early Traction');
                        setNavMode('stage');
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center justify-between ${
                        currentStageNum === 3 && navMode === 'stage'
                          ? 'bg-[#FFF3EB] text-[#C44D00] font-bold'
                          : 'hover:bg-[#F5F5F4] text-[#40403E]'
                      }`}
                    >
                      <span>Stage 3: Traction &amp; Scale</span>
                      {currentStageNum === 3 && navMode === 'stage' && <span>✓</span>}
                    </button>
                    <div className="pt-1 border-t border-[#E6E6E2]">
                      <button
                        type="button"
                        onClick={() => {
                          setNavMode('all');
                          setIsStageMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center justify-between ${
                          navMode === 'all'
                            ? 'bg-[#F0F0EE] text-[#171717] font-bold'
                            : 'hover:bg-[#F5F5F4] text-[#40403E]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#FF7417]" />
                          <span>Show All 14 Departments</span>
                        </span>
                        {navMode === 'all' && <span>✓</span>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Calm Minimalist Navigation Rail */}
        <nav
          aria-label="Main workspace navigation"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-4"
        >
          {navMode === 'stage' ? (
            /* STAGE-FOCUSED NAVIGATION (Dead Simple Mode) */
            <div className="space-y-1">
              {!isCompact && (
                <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] font-mono-num uppercase tracking-[0.08em] text-[#9A9A94]">
                  <span>Stage {currentStageNum} Focus</span>
                  <span className="text-[#FF7417] font-semibold">{stageItems.length} Tools</span>
                </div>
              )}

              {stageItems.map((item) => {
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
                      </span>
                    )}
                  </button>
                );
              })}

              {!isCompact && (
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAllToolsModalOpen(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[10px] border border-dashed border-[#DCDCD8] hover:border-[#FF7417] text-xs text-[#686864] hover:text-[#171717] bg-[#FAF9F8] hover:bg-white transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Globe className="w-3.5 h-3.5 text-[#FF7417]" />
                      <span>All 14 Departments</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#8A8A85]">Directory ↗</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ALL-DEPARTMENTS FULL VIEW */
            NAV_GROUPS.map((group) => (
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
            ))
          )}
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

      {/* Full 14-Department Directory Modal */}
      <AllToolsDirectoryModal
        isOpen={isAllToolsModalOpen}
        onClose={() => setIsAllToolsModalOpen(false)}
        onNavigate={handleNav}
        currentRoute={state.currentRoute as AppRoute}
      />
    </>
  );
};
