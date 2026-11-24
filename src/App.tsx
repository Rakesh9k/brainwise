/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { BrainWiseProvider, useBrainWise } from './context/BrainWiseContext';
import { ContextualActionLedgerProvider } from './components/ui/ContextualActionLedger';
import { ApplicationShell } from './components/shell/ApplicationShell';
import { DepartmentTransition } from './components/motion/LiquidMotion';
import { LandingPage } from './pages/public/LandingPage';

// Lazy-loaded routes for code splitting and initial load performance
const AuthPages = React.lazy(() => import('./pages/public/AuthPages').then((m) => ({ default: m.AuthPages })));
const OnboardingPage = React.lazy(() => import('./pages/public/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = React.lazy(() => import('./pages/app/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const BusinessBrainPage = React.lazy(() => import('./pages/app/BusinessBrainPage').then((m) => ({ default: m.BusinessBrainPage })));
const IdeaIntelligencePage = React.lazy(() => import('./pages/app/IdeaIntelligencePage').then((m) => ({ default: m.IdeaIntelligencePage })));
const CompetitiveIntelligencePage = React.lazy(() => import('./pages/app/CompetitiveIntelligencePage').then((m) => ({ default: m.CompetitiveIntelligencePage })));
const MarketWatchPage = React.lazy(() => import('./pages/app/MarketWatchPage').then((m) => ({ default: m.MarketWatchPage })));
const BrandStudioPage = React.lazy(() => import('./pages/app/BrandStudioPage').then((m) => ({ default: m.BrandStudioPage })));
const AssetLibraryPage = React.lazy(() => import('./pages/app/AssetLibraryPage').then((m) => ({ default: m.AssetLibraryPage })));
const GrowthDirectorPage = React.lazy(() => import('./pages/app/GrowthDirectorPage').then((m) => ({ default: m.GrowthDirectorPage })));
const AnalyticsReportsPage = React.lazy(() => import('./pages/app/AnalyticsReportsPage').then((m) => ({ default: m.AnalyticsReportsPage })));
const SettingsPage = React.lazy(() => import('./pages/app/SettingsHelpPages').then((m) => ({ default: m.SettingsPage })));
const HelpSupportPage = React.lazy(() => import('./pages/app/SettingsHelpPages').then((m) => ({ default: m.HelpSupportPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[#E6E6E2] border-t-[#FF7417] rounded-full animate-spin" />
      <span className="text-xs font-medium text-[#737373]">Loading module...</span>
    </div>
  </div>
);

const BrainWiseRouter: React.FC = () => {
  const { state } = useBrainWise();
  const route = state.currentRoute;

  if (!state.isAuthenticated) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        {route === 'signup' && <AuthPages mode="signup" />}
        {route === 'verify-email' && <AuthPages mode="verify-email" />}
        {route === 'login' && <AuthPages mode="login" />}
        {route === 'forgot-password' && <AuthPages mode="forgot-password" />}
        {route === 'reset-password' && <AuthPages mode="reset-password" />}
        {route === 'onboarding' && <OnboardingPage />}
        {!['signup', 'verify-email', 'login', 'forgot-password', 'reset-password', 'onboarding'].includes(route) && <LandingPage />}
      </Suspense>
    );
  }

  if (route === 'onboarding') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  const renderAppRoute = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage />;
      case 'business-brain':
        return <BusinessBrainPage />;
      case 'idea-intelligence':
        return <IdeaIntelligencePage />;
      case 'competitive-intelligence':
        return <CompetitiveIntelligencePage initialTab="overview" />;
      case 'market-watch':
        return <MarketWatchPage />;
      case 'brand-studio':
        return <BrandStudioPage />;
      case 'asset-library':
        return <AssetLibraryPage />;
      case 'growth-director':
        return <GrowthDirectorPage initialMode="director" />;
      case 'tasks-experiments':
        return <GrowthDirectorPage initialMode="tasks" />;
      case 'business-performance':
        return <AnalyticsReportsPage initialTab="overview" />;
      case 'reports':
        return <AnalyticsReportsPage initialTab="reports" />;
      case 'settings':
        return <SettingsPage />;
      case 'help-support':
        return <HelpSupportPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <ApplicationShell>
      <AnimatePresence mode="wait" initial={false}>
        <DepartmentTransition key={route} routeKey={route}>
          <Suspense fallback={<RouteLoadingFallback />}>
            {renderAppRoute()}
          </Suspense>
        </DepartmentTransition>
      </AnimatePresence>
    </ApplicationShell>
  );
};

export default function App() {
  return (
    <BrainWiseProvider>
      <ContextualActionLedgerProvider>
        <BrainWiseRouter />
      </ContextualActionLedgerProvider>
    </BrainWiseProvider>
  );
}
