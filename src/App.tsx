/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence } from 'motion/react';
import { BrainWiseProvider, useBrainWise } from './context/BrainWiseContext';
import { ContextualActionLedgerProvider } from './components/ui/ContextualActionLedger';
import { ApplicationShell } from './components/shell/ApplicationShell';
import { DepartmentTransition } from './components/motion/LiquidMotion';
import { LandingPage } from './pages/public/LandingPage';
import { AuthPages } from './pages/public/AuthPages';
import { OnboardingPage } from './pages/public/OnboardingPage';
import { DashboardPage } from './pages/app/DashboardPage';
import { BusinessBrainPage } from './pages/app/BusinessBrainPage';
import { IdeaIntelligencePage } from './pages/app/IdeaIntelligencePage';
import { CompetitiveIntelligencePage } from './pages/app/CompetitiveIntelligencePage';
import { MarketWatchPage } from './pages/app/MarketWatchPage';
import { BrandStudioPage } from './pages/app/BrandStudioPage';
import { AssetLibraryPage } from './pages/app/AssetLibraryPage';
import { GrowthDirectorPage } from './pages/app/GrowthDirectorPage';
import { AnalyticsReportsPage } from './pages/app/AnalyticsReportsPage';
import { HelpSupportPage, SettingsPage } from './pages/app/SettingsHelpPages';

const BrainWiseRouter: React.FC = () => {
  const { state } = useBrainWise();
  const route = state.currentRoute;

  if (!state.isAuthenticated) {
    if (route === 'signup') return <AuthPages mode="signup" />;
    if (route === 'verify-email') return <AuthPages mode="verify-email" />;
    if (route === 'login') return <AuthPages mode="login" />;
    if (route === 'forgot-password') return <AuthPages mode="forgot-password" />;
    if (route === 'reset-password') return <AuthPages mode="reset-password" />;
    if (route === 'onboarding') return <OnboardingPage />;
    return <LandingPage />;
  }

  if (route === 'onboarding') {
    return <OnboardingPage />;
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
          {renderAppRoute()}
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
