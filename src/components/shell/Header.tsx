import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bell, HelpCircle, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { BW_EASE } from '../motion/LiquidMotion';
import { Breadcrumbs } from './Breadcrumbs';

export const Header: React.FC<{
  onOpenMobileNav: () => void;
  onOpenNotifications: () => void;
}> = ({ onOpenMobileNav, onOpenNotifications }) => {
  const { state, navigate, logout, setGlobalSearchOpen } = useBrainWise();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [profileMenuOpen]);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <header
      data-frosted-nav="header"
      className="sticky top-0 z-30 h-16 bw-frosted-nav border-b border-[#E6E6E2]/75 px-5 sm:px-8 lg:px-12 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-full text-[#171717] hover:bg-[#EFEFEB] shrink-0 cursor-pointer transition-colors focus-ring"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Compact Tactile Ceramic ⌘K Command Trigger */}
        <button
          type="button"
          onClick={() => setGlobalSearchOpen(true)}
          aria-label="Search workspace"
          className="h-8 px-3 rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] border border-[#EAEAE5] hover:border-[#D6D6D0] bw-ceramic-control text-xs text-[#686864] hover:text-[#171717] flex items-center gap-2 transition-all cursor-pointer focus-ring"
        >
          <Search className="w-3.5 h-3.5 text-[#858585]" />
          <kbd className="text-[10px] font-mono-num text-[#686864]">⌘K</kbd>
        </button>

        {/* Quiet Circular Notification Trigger */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={`Open notifications (${unreadCount} unread)`}
          className="relative w-8 h-8 rounded-full hover:bg-[#EFEFEB]/80 flex items-center justify-center text-[#5C5C58] hover:text-[#171717] transition-colors cursor-pointer focus-ring"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF7417]" />
          )}
        </button>

        {/* Quiet Pill User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((p) => !p)}
            aria-expanded={profileMenuOpen}
            aria-label="Open user profile menu"
            className="h-8 pl-1 pr-2.5 rounded-full hover:bg-[#EFEFEB]/80 flex items-center gap-2 transition-colors cursor-pointer focus-ring"
          >
            <div className="w-6 h-6 rounded-full bg-[#171717] text-white text-[10px] font-semibold flex items-center justify-center">
              {state.user.avatarInitials}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-[#171717] whitespace-nowrap">
              {state.user.firstName}
            </span>
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                  aria-hidden="true"
                />
                <motion.div
                  data-frosted-nav="profile-menu"
                  initial={reduced ? false : { opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: BW_EASE }}
                  className="absolute right-0 mt-2 w-60 rounded-[18px] border border-[#E6E6E2]/85 bw-frosted-nav-elevated py-2 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-[#EFEFEB]">
                    <div className="text-xs font-semibold text-[#171717]">
                      {state.user.firstName} {state.user.lastName}
                    </div>
                    <div className="text-[11px] text-[#858585] truncate mt-0.5">
                      {state.user.email}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('settings', { settingsTab: 'personal-profile' });
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#252525] hover:bg-[#FAFAF9] flex items-center gap-2.5 cursor-pointer focus-ring-inset"
                    >
                      <User className="w-3.5 h-3.5 text-[#858585]" />
                      Personal Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('settings', { settingsTab: 'business-profile' });
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#252525] hover:bg-[#FAFAF9] flex items-center gap-2.5 cursor-pointer focus-ring-inset"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#858585]" />
                      Workspace Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('help-support');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#252525] hover:bg-[#FAFAF9] flex items-center gap-2.5 cursor-pointer focus-ring-inset"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#858585]" />
                      Help &amp; Strategy Support
                    </button>
                  </div>
                  <div className="my-1 border-t border-[#EFEFEB]" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-[#BC3E3E] hover:bg-[#FDF0F0] flex items-center gap-2.5 cursor-pointer focus-ring-inset"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out to Public Site
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
