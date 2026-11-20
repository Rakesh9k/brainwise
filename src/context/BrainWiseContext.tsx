import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { INITIAL_BRAINWISE_STATE } from '../data/mockData';
import { apiClient } from '../services/apiClient';
import { signInWithGoogle, signOutClient } from '../services/firebaseClient';
import { recordStrategicAngle, ensureStrategicMemory } from '../utils/strategicMemory';
import type {
  AnyRoute,
  AppRoute,
  BrainWiseState,
  BrandAsset,
  BreadcrumbSegment,
  BusinessBrainData,
  CompetitorProfileData,
  ContextSharingConfig,
  GrowthExperiment,
  GrowthGoal,
  GrowthTask,
  MarketScenarioPreset,
  ResearchReport,
  SettingsTabId,
  StrategyRecommendation,
  SubscriptionState,
  TeamMemberItem,
  WorkspacePreferences,
} from '../types/brainwise';

const STORAGE_KEY = 'brainwise_prototype_state_v1';

export interface ToastPayload {
  id: number;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
}

interface BrainWiseContextValue {
  state: BrainWiseState;
  navigate: (
    route: AnyRoute,
    options?: { settingsTab?: SettingsTabId; competitorId?: string; reportId?: string }
  ) => void;
  loginDemo: (firstName?: string, email?: string) => void;
  loginWithGoogle: () => Promise<{ success: boolean; nextRoute?: string; error?: string }>;
  hydrateWorkspaceState: (workspaceId?: string) => Promise<void>;
  sendChatToStrategist: (
    message: string,
    options?: {
      threadId?: string;
      modelTier?: 'fast' | 'deep_reasoning' | 'search_grounded';
      history?: Array<{ role: 'user' | 'model'; parts: string }>;
    }
  ) => Promise<{
    reply: string;
    citations: Array<{ title?: string; url?: string }>;
    modelUsed: string;
  }>;
  loginUser: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; nextRoute?: string; error?: string }>;
  registerUser: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; verificationCode?: string; error?: string }>;
  verifyUserEmail: (
    codeOrToken: string,
    email?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resendUserVerification: (
    email: string
  ) => Promise<{ sent: boolean; cooldownSeconds?: number; error?: string }>;
  forgotUserPassword: (
    email: string
  ) => Promise<{ sent: boolean; message: string; error?: string }>;
  resetUserPassword: (
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  deleteUserAccount: () => Promise<{ success: boolean; error?: string }>;
  launchWorkspaceWithIdea: (ideaPrompt: string) => void;
  prefilledIdeaPrompt: string;
  setPrefilledIdeaPrompt: (idea: string) => void;
  completeOnboarding: (payload: {
    personaRole: string;
    primaryGoals: string[];
    businessName: string;
    industry: string;
    stage: BusinessBrainData['stage'];
    location: string;
    productSummary: string;
    website: string;
    targetCustomers: string;
    initialCompetitors?: string[];
    useDemoIfBlank?: boolean;
    startFreshEmpty?: boolean;
  }) => void;
  logout: () => void;
  resetDemoData: () => void;
  updateBrain: (patch: Partial<BusinessBrainData>) => void;
  confirmFact: (fieldKey: string) => void;
  addExclusionRule: (rule: string) => void;
  removeExclusionRule: (rule: string) => void;
  recordStrategicAngleUsage: (
    angle: string,
    theme: string,
    usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign'
  ) => void;
  addReport: (report: ResearchReport) => void;
  toggleSaveReportToBrain: (reportId: string) => void;
  updateReportAssumption: (reportId: string, assumptionId: string, newValue: number) => void;
  addCompetitor: (comp: Omit<CompetitorProfileData, 'id'>) => void;
  toggleCompetitorMonitoring: (compId: string) => void;
  updateCompetitorFrequency: (
    compId: string,
    freq: CompetitorProfileData['monitoringFrequency']
  ) => void;
  removeCompetitor: (compId: string) => void;
  updateOwnPosition: (x: number, y: number) => void;
  saveCompetitiveStrategyToBrain: () => void;
  selectBrandConcept: (conceptId: string) => void;
  updateBrandIdentity: (patch: Partial<BrainWiseState['brand']>) => void;
  addBrandAsset: (asset: Omit<BrandAsset, 'id' | 'createdAt'>) => void;
  renameBrandAsset: (assetId: string, title: string) => void;
  archiveBrandAsset: (assetId: string) => void;
  toggleTaskStatus: (taskId: string, status?: GrowthTask['status']) => void;
  addTask: (task: Omit<GrowthTask, 'id'>) => void;
  updateTaskNotes: (taskId: string, notes: string) => void;
  addGoal: (goal: Omit<GrowthGoal, 'id'>) => void;
  updateGoalProgress: (goalId: string, currentValue: number) => void;
  addExperiment: (exp: Omit<GrowthExperiment, 'id'>) => void;
  updateExperimentStatus: (
    expId: string,
    status: GrowthExperiment['status'],
    results?: string
  ) => void;
  convertEventToExperiment: (eventId: string) => void;
  dismissMarketEvent: (eventId: string) => void;
  markMarketEventRead: (eventId: string) => void;
  updateRecommendationStatus: (recId: string, status: 'accepted' | 'rejected') => void;
  addRecommendations: (items: Omit<StrategyRecommendation, 'id' | 'status'>[]) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  updateScheduledReports: (patch: Partial<BrainWiseState['scheduledReports']>) => void;
  updateUserProfile: (patch: Partial<BrainWiseState['user']>) => void;
  setAiTonePreference: (tone: BrainWiseState['aiTonePreference']) => void;
  setCustomScenarioB: (preset: MarketScenarioPreset | null) => void;
  inviteTeamMember: (member: Omit<TeamMemberItem, 'id' | 'status'>) => void;
  removeTeamMember: (memberId: string) => void;
  updateWorkspacePrefs: (patch: Partial<WorkspacePreferences>) => void;
  updateContextSharing: (patch: Partial<ContextSharingConfig>) => void;
  updateSubscription: (patch: Partial<SubscriptionState>) => void;
  toggleIntegration: (integrationId: string) => void;
  pinnedWidgetIds: string[];
  togglePinWidget: (widgetId: string) => void;
  isWidgetPinned: (widgetId: string) => boolean;
  toast: ToastPayload | null;
  toastMessage: string | null;
  showToast: (msg: string, options?: { undoLabel?: string; onUndo?: () => void }) => void;
  dismissToast: () => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  breadcrumbTrail: BreadcrumbSegment[];
  setBreadcrumbTrail: (segments: BreadcrumbSegment[]) => void;
  departmentResetNonce: number;
  triggerDepartmentReset: () => void;
  pendingCompetitorProfile: boolean;
  consumeCompetitorProfile: () => void;
  pendingReportOpen: boolean;
  consumeReportOpen: () => void;
  pendingCreativeRemix: {
    mode: 'logos' | 'collateral' | 'social';
    prompt: string;
    category?: BrandAsset['category'];
  } | null;
  launchCreativeRemix: (remix: {
    mode: 'logos' | 'collateral' | 'social';
    prompt: string;
    category?: BrandAsset['category'];
  }) => void;
  consumeCreativeRemix: () => void;
}

const BrainWiseContext = createContext<BrainWiseContextValue | null>(null);

export const BrainWiseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BrainWiseState>(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<BrainWiseState>;
        const hydrated: BrainWiseState = {
          ...INITIAL_BRAINWISE_STATE,
          ...parsed,
          teamMembers: parsed.teamMembers ?? INITIAL_BRAINWISE_STATE.teamMembers,
          workspacePrefs: {
            ...INITIAL_BRAINWISE_STATE.workspacePrefs!,
            ...(parsed.workspacePrefs ?? {}),
          },
          contextSharing: {
            ...INITIAL_BRAINWISE_STATE.contextSharing!,
            ...(parsed.contextSharing ?? {}),
          },
          subscription: {
            ...INITIAL_BRAINWISE_STATE.subscription!,
            ...(parsed.subscription ?? {}),
          },
          integrations: parsed.integrations ?? INITIAL_BRAINWISE_STATE.integrations,
          customScenarioB: parsed.customScenarioB ?? null,
          pinnedWidgetIds: parsed.pinnedWidgetIds ?? [],
        };
        if (autostart) {
          return {
            ...hydrated,
            isAuthenticated: true,
            currentRoute: hydrated.workspacePrefs?.defaultLandingView ?? 'dashboard',
          };
        }
        return hydrated;
      }
    } catch {
      // fallback to initial state
    }

    if (autostart) {
      return {
        ...INITIAL_BRAINWISE_STATE,
        isAuthenticated: true,
        currentRoute: 'dashboard',
      };
    }

    return INITIAL_BRAINWISE_STATE;
  });

  const [toast, setToast] = useState<ToastPayload | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [prefilledIdeaPrompt, setPrefilledIdeaPrompt] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<BreadcrumbSegment[]>([]);
  const [departmentResetNonce, setDepartmentResetNonce] = useState(0);
  const [pendingCompetitorProfile, setPendingCompetitorProfile] = useState(false);
  const [pendingReportOpen, setPendingReportOpen] = useState(false);
  const [pendingCreativeRemix, setPendingCreativeRemix] = useState<{
    mode: 'logos' | 'collateral' | 'social';
    prompt: string;
    category?: BrandAsset['category'];
  } | null>(null);

  useEffect(() => {
    try {
      const uiPrefs = {
        currentRoute: state.currentRoute,
        settingsTab: state.settingsTab,
        pinnedWidgetIds: state.pinnedWidgetIds,
        prototypeNoticeDismissed: state.prototypeNoticeDismissed,
        activeWorkspaceId: state.activeWorkspaceId,
      };
      localStorage.setItem('brainwise_ui_preferences_v1', JSON.stringify(uiPrefs));
    } catch {
      // ignore storage quota errors
    }
  }, [
    state.currentRoute,
    state.settingsTab,
    state.pinnedWidgetIds,
    state.prototypeNoticeDismissed,
    state.activeWorkspaceId,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (state.isAuthenticated) {
          e.preventDefault();
          setGlobalSearchOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.isAuthenticated]);

  const dismissToast = () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  };

  const showToast = (msg: string, options?: { undoLabel?: string; onUndo?: () => void }) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToast({
      id,
      message: msg,
      undoLabel: options?.undoLabel ?? (options?.onUndo ? 'Undo' : undefined),
      onUndo: options?.onUndo,
    });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 5000);
  };

  const triggerDepartmentReset = () => {
    setDepartmentResetNonce((n) => n + 1);
  };

  const navigate: BrainWiseContextValue['navigate'] = useCallback((route, options) => {
    setBreadcrumbTrail([]);
    setState((prev) => {
      const shouldReset =
        prev.currentRoute === route &&
        !options?.settingsTab &&
        !options?.competitorId &&
        !options?.reportId;
      if (shouldReset) {
        setDepartmentResetNonce((n) => n + 1);
      }
      if (options?.competitorId) {
        setPendingCompetitorProfile(true);
      }
      if (options?.reportId) {
        setPendingReportOpen(true);
      }
      return {
        ...prev,
        currentRoute: route,
        settingsTab: options?.settingsTab ?? prev.settingsTab,
        selectedCompetitorId: options?.competitorId ?? prev.selectedCompetitorId,
        activeReportId: options?.reportId ?? prev.activeReportId,
      };
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onRemoteNav = (e: Event) => {
      const ce = e as CustomEvent<AnyRoute>;
      if (ce.detail) {
        navigate(ce.detail);
      }
    };
    window.addEventListener('brainwise-navigate', onRemoteNav);
    return () => window.removeEventListener('brainwise-navigate', onRemoteNav);
  }, [navigate]);

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem('brainwise_auth_token');
      if (savedToken) {
        apiClient.setAuthToken(savedToken);
        apiClient
          .getCurrentUser()
          .then(({ user, workspaces, activeWorkspace }) => {
            if (user) {
              const wsId = activeWorkspace?.workspaceId || workspaces?.[0]?.workspaceId;
              if (wsId) {
                apiClient.setActiveWorkspaceId(wsId);
              }
              const firstName = user.displayName?.split(' ')[0] || user.email.split('@')[0];
              const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';

              setState((prev) => ({
                ...prev,
                isAuthenticated: true,
                activeWorkspaceId: wsId,
                user: {
                  ...prev.user,
                  firstName,
                  lastName,
                  email: user.email,
                  avatarInitials:
                    (firstName[0] || 'U').toUpperCase() + (lastName[0] || 'B').toUpperCase(),
                },
              }));
            }
          })
          .catch(() => {
            sessionStorage.removeItem('brainwise_auth_token');
          });
      }
    } catch {
      // ignore storage access error
    }
  }, []);

  const loginUser: BrainWiseContextValue['loginUser'] = async (email, password) => {
    try {
      const res = await apiClient.authLogin({ email, password });
      apiClient.setAuthToken(res.token);
      try {
        sessionStorage.setItem('brainwise_auth_token', res.token);
      } catch {
        // ignore storage access error
      }

      if (res.activeWorkspaceId) {
        apiClient.setActiveWorkspaceId(res.activeWorkspaceId);
      }

      const firstName = res.user.displayName?.split(' ')[0] || email.split('@')[0];
      const lastName = res.user.displayName?.split(' ').slice(1).join(' ') || '';

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        activeWorkspaceId: res.activeWorkspaceId,
        currentRoute: (res.nextRoute as AnyRoute) || 'dashboard',
        user: {
          ...prev.user,
          firstName,
          lastName,
          email: res.user.email,
          avatarInitials: (firstName[0] || 'U').toUpperCase() + (lastName[0] || 'B').toUpperCase(),
        },
      }));

      showToast(`Welcome back, ${firstName}.`);
      return { success: true, nextRoute: res.nextRoute };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    }
  };

  const registerUser: BrainWiseContextValue['registerUser'] = async (fullName, email, password) => {
    try {
      const res = await apiClient.authRegister({ fullName, email, password });
      apiClient.setAuthToken(res.token);
      try {
        sessionStorage.setItem('brainwise_auth_token', res.token);
      } catch {
        // ignore storage access error
      }

      const firstName = fullName.split(' ')[0] || email.split('@')[0];
      const lastName = fullName.split(' ').slice(1).join(' ') || '';

      setState((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          firstName,
          lastName,
          email: res.user.email,
          avatarInitials: (firstName[0] || 'U').toUpperCase() + (lastName[0] || 'B').toUpperCase(),
        },
      }));

      return { success: true, verificationCode: res.verificationCode };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const verifyUserEmail: BrainWiseContextValue['verifyUserEmail'] = async (codeOrToken, email) => {
    try {
      const targetEmail = email || state.user.email;
      const res = await apiClient.authVerifyEmail({ email: targetEmail, code: codeOrToken });
      apiClient.setAuthToken(res.token);
      try {
        sessionStorage.setItem('brainwise_auth_token', res.token);
      } catch {
        // ignore storage access error
      }

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        currentRoute: 'onboarding',
      }));

      showToast('Email verified successfully.');
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: msg };
    }
  };

  const resendUserVerification: BrainWiseContextValue['resendUserVerification'] = async (email) => {
    try {
      const res = await apiClient.authResendVerification(email || state.user.email);
      return { sent: res.sent, cooldownSeconds: res.cooldownSeconds };
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : 'Failed to resend' };
    }
  };

  const forgotUserPassword: BrainWiseContextValue['forgotUserPassword'] = async (email) => {
    try {
      const res = await apiClient.authForgotPassword(email);
      return { sent: res.sent, message: res.message };
    } catch (err) {
      return {
        sent: false,
        message: '',
        error: err instanceof Error ? err.message : 'Request failed',
      };
    }
  };

  const resetUserPassword: BrainWiseContextValue['resetUserPassword'] = async (
    token,
    newPassword
  ) => {
    try {
      const res = await apiClient.authResetPassword({ token, newPassword });
      return { success: res.success, message: res.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Reset failed' };
    }
  };

  const deleteUserAccount: BrainWiseContextValue['deleteUserAccount'] = async () => {
    try {
      await apiClient.authDeleteAccount();
      apiClient.setAuthToken(null);
      apiClient.setActiveWorkspaceId(null);
      try {
        sessionStorage.removeItem('brainwise_auth_token');
      } catch {
        // ignore storage access error
      }
      setState({
        ...INITIAL_BRAINWISE_STATE,
        isAuthenticated: false,
        currentRoute: 'landing',
      });
      showToast('Account and associated data deleted successfully.');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Deletion failed' };
    }
  };

  const loginDemo: BrainWiseContextValue['loginDemo'] = (firstName, email) => {
    const userEmail = email?.trim() || 'vishesh.kakar@gmail.com';
    const userName = firstName?.trim() || 'Vishesh';
    const token = `test-token-${userEmail.split('@')[0]}`;
    apiClient.setAuthToken(token);

    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      currentRoute: prev.workspacePrefs?.defaultLandingView ?? 'dashboard',
      user: {
        ...prev.user,
        firstName: userName,
        email: userEmail,
        avatarInitials: (userName[0] || 'V').toUpperCase() + (prev.user.lastName[0] || 'K'),
      },
    }));
    showToast('Welcome back to your BrainWise command centre.');

    // Asynchronously synchronize with authenticated backend
    void (async () => {
      try {
        const { workspaces, activeWorkspace } = await apiClient.getCurrentUser();
        let wsId = activeWorkspace?.workspaceId;

        if (!wsId && (!workspaces || workspaces.length === 0)) {
          const created = await apiClient.createWorkspace({
            workspaceName: 'Solstice Craft Coffee',
            industry: 'Specialty Food & Beverage',
            country: 'IN',
          });
          wsId = created.workspace.workspaceId;
        } else if (!wsId && workspaces && workspaces.length > 0) {
          wsId = workspaces[0].workspaceId;
        }

        if (wsId) {
          apiClient.setActiveWorkspaceId(wsId);
          setState((prev) => ({ ...prev, activeWorkspaceId: wsId }));

          // Check for legacy prototype state to migrate
          const legacy = localStorage.getItem(STORAGE_KEY);
          if (legacy) {
            try {
              const parsed = JSON.parse(legacy);
              await apiClient.migrateLegacyState(wsId, parsed);
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore
            }
          }

          // Fetch authoritative server Business Brain
          const profile = await apiClient.getBusinessProfile(wsId);
          if (profile && profile.businessName) {
            setState((prev) => ({
              ...prev,
              brain: {
                ...prev.brain,
                businessName: profile.businessName || prev.brain.businessName,
                tagline: profile.tagline || prev.brain.tagline,
                stage: profile.stage || prev.brain.stage,
                location: profile.location || prev.brain.location,
                website: profile.website || prev.brain.website,
                overviewSummary: profile.overviewSummary || prev.brain.overviewSummary,
                targetAudience: profile.targetAudience || prev.brain.targetAudience,
                brandPositioning: profile.brandPositioning || prev.brain.brandPositioning,
                valueProposition: profile.valueProposition || prev.brain.valueProposition,
              },
            }));
          }
        }
      } catch {
        // Fallback gracefully in offline mode
      }
    })();
  };

  const launchWorkspaceWithIdea: BrainWiseContextValue['launchWorkspaceWithIdea'] = (idea) => {
    const clean = idea.trim();
    if (!clean) {
      loginDemo('Vishesh', 'vishesh.kakar@gmail.com');
      return;
    }
    setPrefilledIdeaPrompt(clean);
    setBreadcrumbTrail([]);
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      currentRoute: 'idea-intelligence',
    }));
    window.scrollTo({ top: 0, behavior: 'auto' });
    showToast(
      `Draft loaded into Idea Intelligence: "${clean.slice(0, 42)}${clean.length > 42 ? '…' : ''}"`
    );
  };

  const completeOnboarding: BrainWiseContextValue['completeOnboarding'] = (payload) => {
    setState((prev) => {
      const customName = payload.businessName.trim();
      const useCustom = Boolean(customName) || Boolean(payload.startFreshEmpty);
      const baseBrain = payload.startFreshEmpty
        ? {
            businessName: customName || 'New Venture Workspace',
            tagline: 'Define your core positioning in Brand Studio',
            industry: payload.industry.trim() || 'Technology & Consumer Goods',
            stage: payload.stage || 'Idea Stage',
            location: payload.location.trim() || 'Remote / Global',
            website: payload.website.trim() || '',
            foundedYear: '2026',
            overviewSummary: payload.productSummary.trim()
              ? `${customName || 'This venture'} is exploring ${payload.productSummary.trim()} for ${payload.targetCustomers || 'early adopters'}.`
              : '',
            targetAudience: payload.targetCustomers.trim() || '',
            brandPositioning: '',
            businessModel: '',
            revenueModel: '',
            valueProposition: '',
            primaryGoals: payload.primaryGoals.length ? payload.primaryGoals : [],
            products: [],
            personas: [],
            documents: [],
            decisions: [],
            history: [
              {
                id: `hist-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                event: 'Initialized clean Business Brain workspace',
                department: 'Business Brain' as const,
              },
            ],
            lastUpdated: new Date().toISOString().slice(0, 10),
          }
        : useCustom
          ? {
              ...prev.brain,
              businessName: customName,
              industry: payload.industry.trim() || prev.brain.industry,
              stage: payload.stage || prev.brain.stage,
              location: payload.location.trim() || prev.brain.location,
              website: payload.website.trim() || '',
              targetAudience: payload.targetCustomers.trim() || prev.brain.targetAudience,
              overviewSummary: payload.productSummary.trim()
                ? `${customName} operates in ${payload.industry || 'its target market'}, delivering ${payload.productSummary.trim()} for ${payload.targetCustomers || 'modern customers'}.`
                : prev.brain.overviewSummary,
              lastUpdated: new Date().toISOString().slice(0, 10),
            }
          : prev.brain;

      const seededCompetitors: CompetitorProfileData[] = (payload.initialCompetitors ?? [])
        .map((c) => c.trim())
        .filter(Boolean)
        .map((compName, idx) => ({
          id: `comp-ob-${Date.now()}-${idx}`,
          name: compName,
          website: `https://${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          category: baseBrain.industry || 'Direct Competitor',
          geography: baseBrain.location || 'Primary Launch Market',
          discoveryMethod: 'Manual Entry',
          positioning: `Category peer tracked from ${baseBrain.businessName} onboarding setup.`,
          priceRange: 'Pending pricing audit',
          researchStatus: 'Queued',
          lastResearched: new Date().toISOString().slice(0, 10),
          threatLevel: 'medium',
          marketShareBand: 'Benchmarking',
          xValueScore: 45 + ((idx * 17) % 35),
          yDiffScore: 40 + ((idx * 19) % 35),
          overview: `${compName} added during Business Brain onboarding for continuous pricing, messaging, and review benchmarking.`,
          productsAndServices: [],
          pricingModel: {
            summary: 'Awaiting first pricing scan',
            entryPrice: 'TBD',
            flagshipPrice: 'TBD',
            discounts: 'None recorded',
          },
          brandPositioningDetail: {
            archetype: 'Category Incumbent',
            tagline: 'Pending scan',
            targetBuyer: baseBrain.targetAudience || 'Core segment',
            visualTone: 'Pending visual audit',
          },
          websiteAnalysis: {
            clarityScore: 'Pending',
            primaryCTA: 'Pending',
            speedNote: 'Queued',
            conversionGaps: [],
          },
          marketingStrategy: {
            channels: ['Instagram', 'Search'],
            contentCadence: 'Monitoring enabled',
            paidSignals: 'Queued',
          },
          customerReviews: { averageRating: '—', reviewCount: '0', praisedFor: [], complaints: [] },
          strengths: ['Established category awareness'],
          weaknesses: ['Awaiting 3-star review cluster analysis'],
          historicalChanges: [],
          monitoringEnabled: true,
          monitoringFrequency: 'Weekly',
          monitoredCategories: ['Pricing changes', 'Website changes', 'Product launches'],
        }));

      if (payload.startFreshEmpty) {
        return {
          ...prev,
          isAuthenticated: true,
          currentRoute: 'dashboard',
          onboarding: {
            completed: true,
            personaRole: payload.personaRole,
            primaryGoals: payload.primaryGoals,
          },
          brain: baseBrain,
          reports: [],
          activeReportId: '',
          competitors: seededCompetitors,
          selectedCompetitorId: seededCompetitors[0]?.id ?? '',
          gapAnalysis: [],
          assets: [],
          marketEvents: [],
          archivedEventIds: [],
          goals: [],
          tasks: [],
          experiments: [],
          recommendations: [],
          brand: {
            ...prev.brand,
            status: 'Not Started',
            brandName: baseBrain.businessName,
            industry: baseBrain.industry,
          },
        };
      }

      const mergedCompetitors =
        seededCompetitors.length > 0
          ? [...seededCompetitors, ...prev.competitors]
          : prev.competitors;

      return {
        ...prev,
        isAuthenticated: true,
        currentRoute: 'dashboard',
        onboarding: {
          completed: true,
          personaRole: payload.personaRole,
          primaryGoals: payload.primaryGoals,
        },
        brain: baseBrain,
        competitors: mergedCompetitors,
        selectedCompetitorId: mergedCompetitors[0]?.id ?? prev.selectedCompetitorId,
        brand: {
          ...prev.brand,
          brandName: baseBrain.businessName,
          industry: baseBrain.industry,
        },
      };
    });

    // Create persistent backend workspace and initialize Business Brain
    void (async () => {
      try {
        const customName = payload.businessName.trim() || 'New Venture Workspace';
        const created = await apiClient.createWorkspace({
          workspaceName: customName,
          industry: payload.industry.trim() || 'General Business',
          country: payload.location.trim() || 'India',
        });
        const wsId = created.workspace.workspaceId;
        apiClient.setActiveWorkspaceId(wsId);
        setState((prev) => ({ ...prev, activeWorkspaceId: wsId }));

        await apiClient.updateBusinessProfile(wsId, {
          businessName: customName,
          industry: payload.industry.trim(),
          stage: payload.stage,
          location: payload.location.trim(),
          website: payload.website.trim(),
          targetAudience: payload.targetCustomers.trim(),
          overviewSummary: payload.productSummary.trim(),
          primaryGoals: payload.primaryGoals,
        });
      } catch {
        // offline fallback
      }
    })();

    showToast(
      payload.startFreshEmpty
        ? 'Clean guided workspace ready. Follow recommended next steps.'
        : 'Business Brain initialized across all departments.'
    );
  };

  const logout = () => {
    apiClient.setAuthToken(null);
    apiClient.setActiveWorkspaceId(null);
    try {
      sessionStorage.removeItem('brainwise_auth_token');
    } catch {
      // ignore storage access error
    }
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      currentRoute: 'landing',
    }));
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      ...INITIAL_BRAINWISE_STATE,
      isAuthenticated: true,
      currentRoute: 'dashboard',
    });
    showToast('Workspace reset to Solstice Craft Coffee demonstration state.');
  };

  const updateBrain = (patch: Partial<BusinessBrainData>) => {
    setState((prev) => ({
      ...prev,
      brain: {
        ...prev.brain,
        ...patch,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
      brand: {
        ...prev.brand,
        ...(patch.businessName !== undefined ? { brandName: patch.businessName } : {}),
        ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
        ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
      },
    }));
    showToast('Business Brain updated.');

    if (state.activeWorkspaceId) {
      apiClient.updateBusinessProfile(state.activeWorkspaceId, patch).catch(() => {});
    }
  };

  const confirmFact = (fieldKey: string) => {
    setState((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      const existingProv = prev.brain.provenance || {};
      const currentItem = existingProv[fieldKey];

      const updatedItem = {
        fieldKey,
        source: 'USER_CONFIRMED' as const,
        confidence: 1.0,
        verifiedAt: today,
        lastConfirmedBy: `${prev.user.firstName} ${prev.user.lastName}`.trim() || 'Founder',
        notes: currentItem?.notes ? `${currentItem.notes} (Confirmed)` : 'Confirmed by founder',
      };

      return {
        ...prev,
        brain: {
          ...prev.brain,
          provenance: {
            ...existingProv,
            [fieldKey]: updatedItem,
          },
          lastUpdated: today,
        },
      };
    });
    showToast(`Fact "${fieldKey}" confirmed as ground truth.`);
    if (state.activeWorkspaceId) {
      apiClient.confirmFact(state.activeWorkspaceId, fieldKey).catch(() => {});
    }
  };

  const addExclusionRule = (rule: string) => {
    const trimmed = rule.trim();
    if (!trimmed) return;
    setState((prev) => {
      const currentMemory = ensureStrategicMemory(prev.brain);
      if (currentMemory.explicitExclusions.includes(trimmed)) return prev;
      return {
        ...prev,
        brain: {
          ...prev.brain,
          strategicMemory: {
            ...currentMemory,
            explicitExclusions: [...currentMemory.explicitExclusions, trimmed],
            lastUpdated: new Date().toISOString().slice(0, 10),
          },
        },
      };
    });
    showToast('Prohibited claim rule added to Truth Engine.');
    if (state.activeWorkspaceId) {
      apiClient.addExclusionRule(state.activeWorkspaceId, trimmed).catch(() => {});
    }
  };

  const removeExclusionRule = (rule: string) => {
    setState((prev) => {
      const currentMemory = ensureStrategicMemory(prev.brain);
      return {
        ...prev,
        brain: {
          ...prev.brain,
          strategicMemory: {
            ...currentMemory,
            explicitExclusions: currentMemory.explicitExclusions.filter((e) => e !== rule),
            lastUpdated: new Date().toISOString().slice(0, 10),
          },
        },
      };
    });
    showToast('Exclusion rule removed.');
    if (state.activeWorkspaceId) {
      apiClient.removeExclusionRule(state.activeWorkspaceId, rule).catch(() => {});
    }
  };

  const recordStrategicAngleUsage = (
    angle: string,
    theme: string,
    usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign'
  ) => {
    setState((prev) => {
      const currentMemory = ensureStrategicMemory(prev.brain);
      const updatedMemory = recordStrategicAngle(currentMemory, angle, theme, usedIn);
      return {
        ...prev,
        brain: {
          ...prev.brain,
          strategicMemory: updatedMemory,
        },
      };
    });
  };

  const addReport = (report: ResearchReport) => {
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
      activeReportId: report.id,
    }));
    showToast('Idea research dossier generated.');
  };

  const toggleSaveReportToBrain = (reportId: string) => {
    setState((prev) => {
      const target = prev.reports.find((r) => r.id === reportId);
      const nextSaved = target ? !target.savedToBrain : true;
      return {
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === reportId ? { ...r, savedToBrain: nextSaved } : r
        ),
        brain:
          nextSaved && target
            ? {
                ...prev.brain,
                history: [
                  {
                    id: `hist-${Date.now()}`,
                    date: new Date().toISOString().slice(0, 10),
                    event: `Saved research dossier "${target.title}" to Business Brain`,
                    department: 'Idea Intelligence',
                  },
                  ...prev.brain.history,
                ],
                lastUpdated: new Date().toISOString().slice(0, 10),
              }
            : prev.brain,
      };
    });
    showToast('Business Brain repository updated.');
  };

  const updateReportAssumption = (reportId: string, assumptionId: string, newValue: number) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id !== reportId
          ? r
          : {
              ...r,
              tamSamSom: {
                ...r.tamSamSom,
                assumptions: r.tamSamSom.assumptions.map((a) =>
                  a.id === assumptionId ? { ...a, value: newValue } : a
                ),
              },
            }
      ),
    }));
  };

  const addCompetitor = (comp: Omit<CompetitorProfileData, 'id'>) => {
    const newId = `comp-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      competitors: [{ ...comp, id: newId }, ...prev.competitors],
      selectedCompetitorId: newId,
    }));
    showToast(`${comp.name} added to Competitive Intelligence.`);
    if (state.activeWorkspaceId) {
      apiClient.createCompetitor(state.activeWorkspaceId, comp).catch(() => {});
    }
  };

  const toggleCompetitorMonitoring = (compId: string) => {
    setState((prev) => ({
      ...prev,
      competitors: prev.competitors.map((c) =>
        c.id === compId ? { ...c, monitoringEnabled: !c.monitoringEnabled } : c
      ),
    }));
  };

  const updateCompetitorFrequency = (
    compId: string,
    freq: CompetitorProfileData['monitoringFrequency']
  ) => {
    setState((prev) => ({
      ...prev,
      competitors: prev.competitors.map((c) =>
        c.id === compId ? { ...c, monitoringFrequency: freq } : c
      ),
    }));
    showToast('Monitoring cadence updated.');
  };

  const removeCompetitor = (compId: string) => {
    const target = state.competitors.find((c) => c.id === compId);
    if (!target) return;
    const prevSelected = state.selectedCompetitorId;
    if (state.activeWorkspaceId) {
      apiClient.deleteCompetitor(state.activeWorkspaceId, compId).catch(() => {});
    }
    setState((prev) => {
      const remaining = prev.competitors.filter((c) => c.id !== compId);
      return {
        ...prev,
        competitors: remaining,
        selectedCompetitorId:
          prev.selectedCompetitorId === compId
            ? (remaining[0]?.id ?? '')
            : prev.selectedCompetitorId,
      };
    });
    showToast(`Removed ${target.name} from watchlist.`, {
      undoLabel: 'Undo',
      onUndo: () => {
        setState((prev) => ({
          ...prev,
          competitors: [target, ...prev.competitors.filter((c) => c.id !== target.id)],
          selectedCompetitorId: prevSelected || target.id,
        }));
      },
    });
  };

  const updateOwnPosition = (x: number, y: number) => {
    const safeX = Math.max(6, Math.min(94, Math.round(x)));
    const safeY = Math.max(8, Math.min(92, Math.round(y)));
    setState((prev) => ({
      ...prev,
      ownPositionScore: { x: safeX, y: safeY },
    }));
  };

  const saveCompetitiveStrategyToBrain = () => {
    setState((prev) => ({
      ...prev,
      competitiveStrategy: { ...prev.competitiveStrategy, savedToBrain: true },
      brain: {
        ...prev.brain,
        brandPositioning: prev.competitiveStrategy.whereToDifferentiate,
        decisions: [
          {
            id: `dec-${Date.now()}`,
            title: 'Adopted Competitive Differentiation Strategy',
            rationale: prev.competitiveStrategy.whereToDifferentiate,
            department: 'Competitive Intelligence',
            decidedAt: new Date().toISOString().slice(0, 10),
            status: 'active',
          },
          ...prev.brain.decisions,
        ],
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    }));
    showToast('Competitive strategy synced to Business Brain & Brand Studio.');
  };

  const selectBrandConcept = (conceptId: string) => {
    setState((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        status: 'Approved',
        selectedConceptId: conceptId,
      },
    }));
    showToast('Approved brand concept updated across collateral studios.');
  };

  const updateBrandIdentity = (patch: Partial<BrainWiseState['brand']>) => {
    setState((prev) => ({
      ...prev,
      brand: { ...prev.brand, ...patch },
      brain: {
        ...prev.brain,
        ...(patch.brandName !== undefined ? { businessName: patch.brandName } : {}),
        ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
        ...(patch.brandName !== undefined || patch.tagline !== undefined
          ? { lastUpdated: new Date().toISOString().slice(0, 10) }
          : {}),
      },
    }));
  };

  const addBrandAsset = (asset: Omit<BrandAsset, 'id' | 'createdAt'>) => {
    const newAsset: BrandAsset = {
      ...asset,
      id: `asset-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setState((prev) => ({
      ...prev,
      assets: [newAsset, ...prev.assets],
    }));
    showToast(`"${asset.title}" saved to Asset Library.`);
    if (state.activeWorkspaceId) {
      apiClient
        .completeAssetUpload(state.activeWorkspaceId, newAsset.id, {
          name: newAsset.title,
          category: 'Collateral',
          assetType: 'svg',
          storagePath: `workspaces/${state.activeWorkspaceId}/brand/${newAsset.id}`,
          fileSize: 1024,
          mimeType: 'image/svg+xml',
          svgContent: newAsset.svgMarkup,
        })
        .catch(() => {});
    }
  };

  const renameBrandAsset = (assetId: string, title: string) => {
    if (!title.trim()) return;
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === assetId ? { ...a, title: title.trim() } : a)),
    }));
    showToast('Asset renamed.');
  };

  const archiveBrandAsset = (assetId: string) => {
    const target = state.assets.find((a) => a.id === assetId);
    if (!target) return;
    const prevStatus = target.status;
    const nextStatus: BrandAsset['status'] = prevStatus === 'Archived' ? 'Approved' : 'Archived';
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === assetId ? { ...a, status: nextStatus } : a)),
    }));
    showToast(
      nextStatus === 'Archived' ? `Archived "${target.title}".` : `Restored "${target.title}".`,
      {
        undoLabel: 'Undo',
        onUndo: () => {
          setState((prev) => ({
            ...prev,
            assets: prev.assets.map((a) => (a.id === assetId ? { ...a, status: prevStatus } : a)),
          }));
        },
      }
    );
  };

  const toggleTaskStatus = (taskId: string, explicitStatus?: GrowthTask['status']) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const previousStatus = target.status;
    const nextStatus: GrowthTask['status'] =
      explicitStatus ?? (previousStatus === 'completed' ? 'pending' : 'completed');

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    }));

    if (state.activeWorkspaceId) {
      apiClient.updateTask(state.activeWorkspaceId, taskId, { status: nextStatus }).catch(() => {});
    }

    const label =
      nextStatus === 'completed'
        ? `Completed "${target.title}"`
        : nextStatus === 'skipped'
          ? `Skipped "${target.title}"`
          : `Reopened "${target.title}"`;
    showToast(label, {
      undoLabel: 'Undo',
      onUndo: () => {
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)),
        }));
      },
    });
  };

  const addTask = (task: Omit<GrowthTask, 'id'>) => {
    const id = `task-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      tasks: [{ ...task, id }, ...prev.tasks],
    }));
    showToast('Action task added to Growth Planner.');
    if (state.activeWorkspaceId) {
      apiClient.createTask(state.activeWorkspaceId, task).catch(() => {});
    }
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, notes } : t)),
    }));
    if (state.activeWorkspaceId) {
      apiClient.updateTask(state.activeWorkspaceId, taskId, { notes }).catch(() => {});
    }
  };

  const addGoal = (goal: Omit<GrowthGoal, 'id'>) => {
    const id = `goal-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      goals: [{ ...goal, id }, ...prev.goals],
    }));
    showToast('Business goal added.');
    if (state.activeWorkspaceId) {
      apiClient.createGoal(state.activeWorkspaceId, goal).catch(() => {});
    }
  };

  const updateGoalProgress = (goalId: string, currentValue: number) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, currentValue } : g)),
    }));
    if (state.activeWorkspaceId) {
      apiClient.updateGoal(state.activeWorkspaceId, goalId, { currentValue }).catch(() => {});
      apiClient
        .recordGoalObservation(state.activeWorkspaceId, goalId, { value: currentValue })
        .catch(() => {});
    }
  };

  const addExperiment = (exp: Omit<GrowthExperiment, 'id'>) => {
    const id = `exp-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      experiments: [{ ...exp, id }, ...prev.experiments],
    }));
    showToast('Growth experiment created.');
    if (state.activeWorkspaceId) {
      apiClient.createExperiment(state.activeWorkspaceId, exp).catch(() => {});
    }
  };

  const updateExperimentStatus = (
    expId: string,
    status: GrowthExperiment['status'],
    results?: string
  ) => {
    setState((prev) => ({
      ...prev,
      experiments: prev.experiments.map((e) =>
        e.id === expId ? { ...e, status, results: results ?? e.results } : e
      ),
    }));
    showToast('Experiment updated.');
    if (state.activeWorkspaceId) {
      if (status === 'Completed') {
        apiClient.completeExperiment(state.activeWorkspaceId, expId, { results }).catch(() => {});
      } else {
        apiClient
          .updateExperiment(state.activeWorkspaceId, expId, {
            status: status.toLowerCase() as any,
            results,
          })
          .catch(() => {});
      }
    }
  };

  const convertEventToExperiment = (eventId: string) => {
    const ev = state.marketEvents.find((e) => e.id === eventId);
    setState((prev) => {
      if (!ev || ev.convertedToExperimentId) return prev;
      const newExpId = `exp-${Date.now()}`;
      const newExp: GrowthExperiment = {
        id: newExpId,
        title: `Counter-Test: ${ev.competitorOrSource} (${ev.category})`,
        hypothesis: ev.aiInterpretation,
        objective: ev.suggestedAction,
        targetAudience: prev.brain.targetAudience,
        action: ev.suggestedAction,
        successMetric: 'Lift in trial-to-subscriber conversion or qualified leads',
        budget: '$150',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '2026-12-15',
        status: 'Planned',
        results: 'Queued directly from Market Watch signal.',
        learnings: 'Pending launch.',
      };
      return {
        ...prev,
        experiments: [newExp, ...prev.experiments],
        marketEvents: prev.marketEvents.map((e) =>
          e.id === eventId ? { ...e, isRead: true, convertedToExperimentId: newExpId } : e
        ),
      };
    });
    if (ev && state.activeWorkspaceId) {
      apiClient
        .createExperiment(state.activeWorkspaceId, {
          title: `Counter-Test: ${ev.competitorOrSource} (${ev.category})`,
          hypothesis: ev.aiInterpretation,
          objective: ev.suggestedAction,
          targetAudience: state.brain.targetAudience,
          action: ev.suggestedAction,
          successMetric: 'Lift in trial-to-subscriber conversion or qualified leads',
          budget: '$150',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: '2026-12-15',
          status: 'Planned',
          results: 'Queued directly from Market Watch signal.',
          learnings: 'Pending launch.',
        })
        .catch(() => {});
    }
    showToast('Counter-test queued in Growth Planner Experiments.');
  };

  const dismissMarketEvent = (eventId: string) => {
    const ev = state.marketEvents.find((e) => e.id === eventId);
    if (!ev) return;
    setState((prev) => ({
      ...prev,
      archivedEventIds: Array.from(new Set([...(prev.archivedEventIds ?? []), eventId])),
    }));
    showToast(`Archived ${ev.competitorOrSource} alert.`, {
      undoLabel: 'Undo',
      onUndo: () => {
        setState((prev) => ({
          ...prev,
          archivedEventIds: (prev.archivedEventIds ?? []).filter((id) => id !== eventId),
        }));
      },
    });
  };

  const markMarketEventRead = (eventId: string) => {
    setState((prev) => ({
      ...prev,
      marketEvents: prev.marketEvents.map((e) => (e.id === eventId ? { ...e, isRead: true } : e)),
    }));
  };

  const updateRecommendationStatus = (recId: string, status: 'accepted' | 'rejected') => {
    setState((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) => (r.id === recId ? { ...r, status } : r)),
    }));
    showToast(
      status === 'accepted' ? 'Strategy recommendation accepted.' : 'Recommendation dismissed.'
    );
  };

  const addRecommendations = (items: Omit<StrategyRecommendation, 'id' | 'status'>[]) => {
    if (items.length === 0) return;
    const now = Date.now();
    const created: StrategyRecommendation[] = items.map((item, idx) => ({
      ...item,
      id: `rec-ai-${now}-${idx}`,
      status: 'pending',
    }));
    setState((prev) => ({
      ...prev,
      recommendations: [...created, ...prev.recommendations],
    }));
    showToast(`${created.length} AI strategy recommendations synthesized for Growth Planner.`);
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const updateScheduledReports = (patch: Partial<BrainWiseState['scheduledReports']>) => {
    setState((prev) => ({
      ...prev,
      scheduledReports: { ...prev.scheduledReports, ...patch },
    }));
    showToast('Digest schedule preferences saved.');
  };

  const updateUserProfile = (patch: Partial<BrainWiseState['user']>) => {
    setState((prev) => ({
      ...prev,
      user: { ...prev.user, ...patch },
    }));
    showToast('Personal profile updated.');
  };

  const setAiTonePreference = (tone: BrainWiseState['aiTonePreference']) => {
    setState((prev) => ({ ...prev, aiTonePreference: tone }));
    showToast('AI intelligence tone preference saved.');
  };

  const setCustomScenarioB = (preset: MarketScenarioPreset | null) => {
    setState((prev) => ({ ...prev, customScenarioB: preset }));
  };

  const inviteTeamMember = (member: Omit<TeamMemberItem, 'id' | 'status'>) => {
    setState((prev) => ({
      ...prev,
      teamMembers: [
        ...(prev.teamMembers ?? INITIAL_BRAINWISE_STATE.teamMembers ?? []),
        { ...member, id: `tm-${Date.now()}`, status: 'Invited' },
      ],
    }));
    showToast(`Invitation recorded for ${member.name}.`);
  };

  const removeTeamMember = (memberId: string) => {
    const current = state.teamMembers ?? [];
    const target = current.find((m) => m.id === memberId);
    setState((prev) => ({
      ...prev,
      teamMembers: (prev.teamMembers ?? []).filter((m) => m.id !== memberId),
    }));
    if (target) showToast(`Removed ${target.name} from roster.`);
  };

  const updateWorkspacePrefs = (patch: Partial<WorkspacePreferences>) => {
    setState((prev) => ({
      ...prev,
      workspacePrefs: {
        ...(prev.workspacePrefs ?? INITIAL_BRAINWISE_STATE.workspacePrefs!),
        ...patch,
      },
    }));
    showToast('Workspace preferences saved.');
  };

  const updateContextSharing = (patch: Partial<ContextSharingConfig>) => {
    setState((prev) => ({
      ...prev,
      contextSharing: {
        ...(prev.contextSharing ?? INITIAL_BRAINWISE_STATE.contextSharing!),
        ...patch,
      },
    }));
    showToast('Business Brain context sharing updated.');
  };

  const updateSubscription = (patch: Partial<SubscriptionState>) => {
    setState((prev) => ({
      ...prev,
      subscription: {
        ...(prev.subscription ?? INITIAL_BRAINWISE_STATE.subscription!),
        ...patch,
      },
    }));
    if (patch.plan) showToast(`Switched preview plan to ${patch.plan}.`);
  };

  const toggleIntegration = (integrationId: string) => {
    const target = (state.integrations ?? INITIAL_BRAINWISE_STATE.integrations ?? []).find(
      (i) => i.id === integrationId
    );
    setState((prev) => ({
      ...prev,
      integrations: (prev.integrations ?? INITIAL_BRAINWISE_STATE.integrations ?? []).map((item) =>
        item.id === integrationId ? { ...item, connected: !item.connected } : item
      ),
    }));
    if (target) {
      showToast(
        target.connected
          ? `Disconnected ${target.name} prototype connector.`
          : `Connected ${target.name} demonstration feed.`
      );
    }
  };

  const togglePinWidget = (widgetId: string) => {
    setState((prev) => {
      const current = prev.pinnedWidgetIds ?? [];
      const isPinned = current.includes(widgetId);
      const next = isPinned ? current.filter((id) => id !== widgetId) : [...current, widgetId];
      return {
        ...prev,
        pinnedWidgetIds: next,
      };
    });
    const currentlyPinned = (state.pinnedWidgetIds ?? []).includes(widgetId);
    showToast(
      currentlyPinned
        ? 'Widget unpinned from Executive Command Strip.'
        : 'Widget pinned to Executive Command Strip.'
    );
  };

  const isWidgetPinned = (widgetId: string) => {
    return Boolean(state.pinnedWidgetIds?.includes(widgetId));
  };

  const value = useMemo<BrainWiseContextValue>(
    () => ({
      state,
      pinnedWidgetIds: state.pinnedWidgetIds ?? [],
      togglePinWidget,
      isWidgetPinned,
      navigate,
      loginDemo,
      loginUser,
      registerUser,
      verifyUserEmail,
      resendUserVerification,
      forgotUserPassword,
      resetUserPassword,
      deleteUserAccount,
      launchWorkspaceWithIdea,
      prefilledIdeaPrompt,
      setPrefilledIdeaPrompt,
      completeOnboarding,
      logout,
      resetDemoData,
      updateBrain,
      confirmFact,
      addExclusionRule,
      removeExclusionRule,
      recordStrategicAngleUsage,
      addReport,
      toggleSaveReportToBrain,
      updateReportAssumption,
      addCompetitor,
      toggleCompetitorMonitoring,
      updateCompetitorFrequency,
      removeCompetitor,
      updateOwnPosition,
      saveCompetitiveStrategyToBrain,
      selectBrandConcept,
      updateBrandIdentity,
      addBrandAsset,
      renameBrandAsset,
      archiveBrandAsset,
      toggleTaskStatus,
      addTask,
      updateTaskNotes,
      addGoal,
      updateGoalProgress,
      addExperiment,
      updateExperimentStatus,
      convertEventToExperiment,
      dismissMarketEvent,
      markMarketEventRead,
      updateRecommendationStatus,
      addRecommendations,
      markAllNotificationsRead,
      markNotificationRead,
      updateScheduledReports,
      updateUserProfile,
      setAiTonePreference,
      setCustomScenarioB,
      inviteTeamMember,
      removeTeamMember,
      updateWorkspacePrefs,
      updateContextSharing,
      updateSubscription,
      toggleIntegration,
      toast,
      toastMessage: toast?.message ?? null,
      showToast,
      dismissToast,
      globalSearchOpen,
      setGlobalSearchOpen,
      breadcrumbTrail,
      setBreadcrumbTrail,
      departmentResetNonce,
      triggerDepartmentReset,
      pendingCompetitorProfile,
      consumeCompetitorProfile: () => setPendingCompetitorProfile(false),
      pendingReportOpen,
      consumeReportOpen: () => setPendingReportOpen(false),
      pendingCreativeRemix,
      launchCreativeRemix: (remix) => {
        setPendingCreativeRemix(remix);
        navigate('brand-studio');
      },
      consumeCreativeRemix: () => setPendingCreativeRemix(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Action callbacks close over setState within provider; memoization invalidation is governed by state and modal flags.
    [
      state,
      toast,
      prefilledIdeaPrompt,
      globalSearchOpen,
      breadcrumbTrail,
      departmentResetNonce,
      pendingCompetitorProfile,
      pendingReportOpen,
      pendingCreativeRemix,
    ]
  );

  return <BrainWiseContext.Provider value={value}>{children}</BrainWiseContext.Provider>;
};

export function useBrainWise() {
  const ctx = useContext(BrainWiseContext);
  if (!ctx) {
    throw new Error('useBrainWise must be used within BrainWiseProvider');
  }
  return ctx;
}

export function useWorkspaceBreadcrumbs(segments: BreadcrumbSegment[], deps: React.DependencyList) {
  const { setBreadcrumbTrail } = useBrainWise();

  useEffect(() => {
    setBreadcrumbTrail(segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return () => setBreadcrumbTrail([]);
  }, [setBreadcrumbTrail]);
}

export const ROUTE_TITLES: Record<AppRoute, { title: string; group: string }> = {
  dashboard: { title: 'Home Dashboard', group: 'Core' },
  'business-brain': { title: 'Business Brain', group: 'Core' },
  'idea-intelligence': { title: 'Idea Intelligence', group: 'Intelligence' },
  'competitive-intelligence': { title: 'Competitive Intelligence', group: 'Intelligence' },
  'market-watch': { title: 'Market Watch', group: 'Intelligence' },
  'brand-studio': { title: 'Brand Studio', group: 'Brand' },
  'asset-library': { title: 'Asset Library', group: 'Brand' },
  'growth-director': { title: 'Growth Planner', group: 'Execution' },
  'tasks-experiments': { title: 'Experiments & Tasks', group: 'Execution' },
  'business-performance': { title: 'Analytics & Reports', group: 'Measure' },
  reports: { title: 'Executive Reports', group: 'Measure' },
  settings: { title: 'Settings', group: 'Workspace' },
  'help-support': { title: 'Help & Support', group: 'Workspace' },
};
