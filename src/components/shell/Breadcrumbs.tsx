import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ROUTE_TITLES, useBrainWise } from '../../context/BrainWiseContext';
import type { AppRoute } from '../../types/brainwise';
import { buildShellBreadcrumbs } from '../../utils/logic';
import { BW_EASE } from '../motion/LiquidMotion';

export const Breadcrumbs: React.FC = () => {
  const { state, breadcrumbTrail, navigate, triggerDepartmentReset } = useBrainWise();
  const reduced = useReducedMotion();
  const route = (state.currentRoute in ROUTE_TITLES
    ? state.currentRoute
    : 'dashboard') as AppRoute;
  const meta = ROUTE_TITLES[route];

  const items = buildShellBreadcrumbs({
    route,
    group: meta.group,
    routeTitle: meta.title,
    subTrail: breadcrumbTrail,
    onNavigateRoot: () => navigate('dashboard'),
    onResetDepartment: triggerDepartmentReset,
  });

  const isDeepTrail = items.length > 3;
  const visibleDesktopItems = !isDeepTrail && items.length === 3 ? items.slice(1) : items;
  const currentItem = items[items.length - 1];
  const mobileParent =
    [...items]
      .slice(0, -1)
      .reverse()
      .find((item) => Boolean(item.onClick)) ?? items[items.length - 2];

  const trailKey = visibleDesktopItems.map((i) => i.id + i.label).join('>');

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex items-center">
      {/* Desktop & tablet quiet editorial hierarchy */}
      <motion.ol
        key={trailKey}
        initial={reduced ? false : { opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: BW_EASE }}
        className="hidden sm:flex items-center min-w-0 overflow-hidden text-xs"
      >
        {visibleDesktopItems.map((item, idx) => {
          const hideGroupOnCompact = item.level === 'group' && isDeepTrail;
          const liClasses = hideGroupOnCompact
            ? 'hidden xl:inline-flex items-center min-w-0'
            : 'inline-flex items-center min-w-0';

          return (
            <li key={item.id} className={liClasses}>
              {idx > 0 && (
                <span
                  className="text-[#D2D2CC] mx-2 select-none font-light shrink-0"
                  aria-hidden="true"
                >
                  /
                </span>
              )}

              {item.isCurrent ? (
                <span
                  aria-current="page"
                  title={item.label}
                  className="inline-flex items-center gap-1.5 font-medium text-[#171717] truncate max-w-[180px] lg:max-w-[260px]"
                >
                  <span className="truncate">{item.label}</span>
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  title={item.label}
                  className="inline-flex items-center px-1 py-0.5 rounded-[6px] text-[#858585] hover:text-[#171717] transition-colors truncate max-w-[140px] lg:max-w-[175px] cursor-pointer focus-ring"
                >
                  <span className="truncate">{item.label}</span>
                </button>
              ) : (
                <span
                  title={item.label}
                  className="text-[#858585] truncate max-w-[120px]"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </motion.ol>

      {/* Mobile compact hierarchy */}
      <div className="sm:hidden flex items-center gap-1.5 min-w-0 overflow-hidden text-xs">
        {isDeepTrail && mobileParent?.onClick ? (
          <>
            <button
              type="button"
              onClick={mobileParent.onClick}
              aria-label={`Back to ${mobileParent.label}`}
              className="text-xs text-[#858585] hover:text-[#171717] rounded-[6px] px-0.5 truncate max-w-[96px] shrink-0 cursor-pointer focus-ring"
            >
              {mobileParent.label}
            </button>
            <span className="text-[#D2D2CC] font-light select-none shrink-0" aria-hidden="true">/</span>
          </>
        ) : (
          <>
            <span className="text-xs text-[#858585] shrink-0 hidden min-[375px]:inline">
              {meta.group}
            </span>
            <span
              className="text-[#D2D2CC] font-light select-none shrink-0 hidden min-[375px]:inline"
              aria-hidden="true"
            >
              /
            </span>
          </>
        )}
        <span
          aria-current="page"
          title={currentItem.label}
          className="text-xs font-medium text-[#171717] truncate"
        >
          {currentItem.label}
        </span>
      </div>
    </nav>
  );
};
