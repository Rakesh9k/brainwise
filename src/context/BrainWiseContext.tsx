import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INITIAL_BRAINWISE_STATE,
  SOLSTICE_EXAMPLE_STATE,
  createCleanWorkspaceState,
} from '../data/mockData';
import { apiClient, getStoredAuthToken, setStoredAuthToken } from '../services/apiClient';
import { signInWithGoogle, signOutClient } from '../services/firebaseClient';
import { recordStrategicAngle, ensureStrategicMemory } from '../utils/strategicMemory';
import type {
  AnyRoute,
  AppRoute,
  BrainActivationState,
  BrainWiseState,
  BrandAsset,
  BreadcrumbSegment,
  BusinessBrainData,
  CompetitorProfileData,
  ContextSharingConfig,
  CustomerPersona,
  GrowthExperiment,
  GrowthGoal,
  GrowthTask,
  MarketScenarioPreset,
  ProductServiceItem,
  ResearchReport,
  SettingsTabId,
  StrategyRecommendation,
  SubscriptionState,
  TeamMemberItem,
  WorkspacePreferences,
} from '../types/brainwise';

const STORAGE_KEY = 'brainwise_user_workspace_v2';
const USER_STASH_KEY = 'brainwise_user_workspace_stash_v2';
const LEGACY_STORAGE_KEY = 'brainwise_prototype_state_v1';

export interface ToastPayload {
  id: number;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  tone?: 'default' | 'error' | 'success' | 'info';
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
  refreshWorkspace: (workspaceId?: string) => Promise<void>;
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
    sandboxIdeaMode?: boolean;
  }) => void;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  resetDemoData: () => void;
  resetUserWorkspace: () => void;
  openExampleWorkspace: () => void;
  exitExampleWorkspace: () => void;
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
  graduateIdeaToBrain: (reportId: string) => void;
  setBrainActivationState: (activationState: BrainActivationState) => void;
  updateReportAssumption: (reportId: string, assumptionId: string, newValue: number) => void;
  saveReportScenario: (
    reportId: string,
    scenario: Omit<MarketScenarioPreset, 'id' | 'createdAt'> & { id?: string }
  ) => void;
  deleteReportScenario: (reportId: string, scenarioId: string) => void;
  selectReportScenario: (reportId: string, scenarioId: string) => void;
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
  duplicateBrandAsset: (assetId: string) => Promise<BrandAsset | null>;
  bulkArchiveBrandAssets: (assetIds: string[]) => Promise<void>;
  bulkRestoreBrandAssets: (assetIds: string[], targetSection?: string) => Promise<void>;
  bulkTagBrandAssets: (assetIds: string[], tagsToAdd: string[], tagsToRemove?: string[]) => Promise<void>;
  bulkMoveBrandAssets: (assetIds: string[], targetSection: 'Active' | 'Identity' | 'Print & Packaging' | 'Social Media' | 'Archived') => Promise<void>;
  deleteBrandAssetPermanently: (assetId: string) => Promise<void>;
  uploadAssetFiles: (files: File[], options?: { section?: string; category?: string; onProgress?: (pct: number) => void }) => Promise<void>;
  getAuthoritativeBrandIdentity: () => Promise<any>;
  syncBrandWithBusinessBrain: () => Promise<any>;
  evaluateBrandCompliance: (params: Record<string, any>) => Promise<any>;
  getBrandDriftReport: () => Promise<any>;
  listBrandIdentityVersions: () => Promise<any[]>;
  createPackagingAsset: (payload: Record<string, any>) => Promise<any>;
  listPackagingAssets: (filter?: Record<string, any>) => Promise<any[]>;
  evaluatePrintReadiness: (assetId: string) => Promise<any>;
  extractPackagingContentIntelligence: (assetId: string, rawText?: string) => Promise<any>;
  advancePackagingWorkflow: (assetId: string, payload: { targetStatus: string; notes?: string; vendorName?: string }) => Promise<any>;
  analyzeAssetIntelligence: (assetId: string, bypassCredits?: boolean) => Promise<any>;
  semanticAssetSearch: (query: string, filters?: any) => Promise<any[]>;
  recommendAssets: (payload: any) => Promise<any[]>;
  checkAssetDuplicates: (payload: any) => Promise<any>;
  applyHumanClassificationOverride: (payload: any) => Promise<any>;
  chatAssetAssistant: (payload: { query: string; conversationId?: string; confirmationToken?: string; context?: any }) => Promise<any>;
  confirmAssetAssistantAction: (payload: { confirmationToken: string; conversationId?: string }) => Promise<any>;
  bindAssetsToCampaign: (payload: any) => Promise<any>;
  createAssetDerivative: (payload: any) => Promise<any>;
  getCompetitiveCreativeOpportunities: (params?: any) => Promise<any[]>;
  recordAssetPerformance: (payload: any) => Promise<any>;
  getAssetPerformanceSummary: (assetId: string) => Promise<any>;
  listTopPerformingAssets: (params?: any) => Promise<any[]>;
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
  showToast: (msg: string, options?: { undoLabel?: string; onUndo?: () => void; tone?: 'default' | 'error' | 'success' | 'info' }) => void;
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
    const isDemoQuery = params.get('demo') === '1' || params.get('example') === '1';

    if (isDemoQuery) {
      return {
        ...SOLSTICE_EXAMPLE_STATE,
        isAuthenticated: true,
        currentRoute: 'dashboard',
        isExampleWorkspace: true,
      };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<BrainWiseState>;
        const isLegacyUneditedDemo =
          parsed.brain?.businessName === 'Solstice Craft Coffee' &&
          !parsed.isExampleWorkspace &&
          parsed.user?.email === 'vishesh.kakar@gmail.com';

        if (parsed.isExampleWorkspace) {
          return {
            ...SOLSTICE_EXAMPLE_STATE,
            ...parsed,
            isAuthenticated: true,
            isExampleWorkspace: true,
          };
        }

        if (!isLegacyUneditedDemo) {
          const base = createCleanWorkspaceState(parsed.user, parsed.brain?.businessName);
          const hydrated: BrainWiseState = {
            ...base,
            ...parsed,
            teamMembers: parsed.teamMembers ?? base.teamMembers,
            workspacePrefs: {
              ...base.workspacePrefs!,
              ...(parsed.workspacePrefs ?? {}),
            },
            contextSharing: {
              ...base.contextSharing!,
              ...(parsed.contextSharing ?? {}),
            },
            subscription: {
              ...base.subscription!,
              ...(parsed.subscription ?? {}),
            },
            integrations: parsed.integrations ?? base.integrations,
            customScenarioB: parsed.customScenarioB ?? null,
            pinnedWidgetIds: parsed.pinnedWidgetIds ?? [],
            isExampleWorkspace: false,
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
      }
    } catch {
      // fallback to initial state
    }

    if (autostart) {
      return {
        ...createCleanWorkspaceState(),
        isAuthenticated: true,
        currentRoute: 'dashboard',
        isExampleWorkspace: false,
      };
    }

    const cleanUnauth = createCleanWorkspaceState();
    cleanUnauth.isAuthenticated = false;
    cleanUnauth.currentRoute = 'landing';
    cleanUnauth.isExampleWorkspace = false;
    return cleanUnauth;
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
    if (state.activeWorkspaceId) {
      apiClient.setActiveWorkspaceId(state.activeWorkspaceId);
    }
  }, [state.activeWorkspaceId]);

  useEffect(() => {
    if (state.isAuthenticated && !state.isExampleWorkspace) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [state]);

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

  const showToast = (
    msg: string,
    options?: { undoLabel?: string; onUndo?: () => void; tone?: 'default' | 'error' | 'success' | 'info' }
  ) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToast({
      id,
      message: msg,
      undoLabel: options?.undoLabel ?? (options?.onUndo ? 'Undo' : undefined),
      onUndo: options?.onUndo,
      tone: options?.tone || 'default',
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

  const hydrateWorkspaceState = useCallback(
    async (targetWorkspaceId?: string): Promise<void> => {
      const wsId = targetWorkspaceId || state.activeWorkspaceId;
      if (!wsId || wsId === 'ws_vishesh_growth' || wsId === 'default-workspace' || state.isExampleWorkspace) return;

      try {
        const [profile, goalsRes, tasksRes, compsRes, subRes, assetsRes, brandRes, reportsRes, productsRes] = await Promise.all([
          apiClient.getBusinessProfile(wsId).catch(() => null),
          apiClient.getGoals(wsId).catch(() => null),
          apiClient.getTasks(wsId).catch(() => null),
          apiClient.getCompetitors(wsId).catch(() => null),
          apiClient.getSubscription(wsId).catch(() => null),
          apiClient.getBrandAssets(wsId).catch(() => null),
          apiClient.getBrandIdentity(wsId).catch(() => null),
          apiClient.getResearchReports(wsId).catch(() => null),
          apiClient.getProducts(wsId).catch(() => null),
        ]);

        setState((prev) => {
          const next = { ...prev };
          if (profile && profile.businessName) {
            next.brain = {
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
            };
          }

          if (Array.isArray(goalsRes)) {
            next.goals = goalsRes;
          } else if (Array.isArray((goalsRes as any)?.goals)) {
            next.goals = (goalsRes as any).goals;
          }

          if (Array.isArray(tasksRes)) {
            next.tasks = tasksRes;
          } else if (Array.isArray((tasksRes as any)?.tasks)) {
            next.tasks = (tasksRes as any).tasks;
          }

          if (Array.isArray(compsRes)) {
            next.competitors = compsRes;
          } else if (Array.isArray((compsRes as any)?.competitors)) {
            next.competitors = (compsRes as any).competitors;
          }

          if (Array.isArray(reportsRes)) {
            next.reports = reportsRes;
            if (!next.activeReportId && reportsRes[0]?.id) {
              next.activeReportId = reportsRes[0].id;
            }
          }

          if (Array.isArray(productsRes)) {
            next.brain = {
              ...next.brain,
              products: productsRes,
            };
          }

          if (subRes && prev.subscription) {
            const planMap: Record<string, SubscriptionState['plan']> = {
              starter: 'Starter',
              growth: 'Growth Pro',
              scale: 'Venture Team',
            };
            const mappedPlan = subRes.subscription?.planId
              ? planMap[subRes.subscription.planId]
              : undefined;
            next.subscription = {
              ...prev.subscription,
              ...(mappedPlan ? { plan: mappedPlan } : {}),
              ...(subRes.subscription?.billingCycle
                ? { billingCycle: subRes.subscription.billingCycle }
                : {}),
            };
          }

          if (Array.isArray(assetsRes)) {
            next.assets = assetsRes;
          } else if (Array.isArray((assetsRes as any)?.assets)) {
            next.assets = (assetsRes as any).assets;
          }

          if (brandRes && brandRes.brandName) {
            next.brand = {
              ...prev.brand,
              brandName: brandRes.brandName || prev.brand.brandName,
              tagline: brandRes.tagline || prev.brand.tagline,
              positioningStatement: brandRes.mission || prev.brand.positioningStatement,
              status: (brandRes.approvalStatus === 'APPROVED' ? 'Approved' : prev.brand.status) as any,
              palette: brandRes.palette && typeof brandRes.palette === 'object' && !Array.isArray(brandRes.palette)
                ? Object.entries(brandRes.palette).map(([role, hex]) => ({ name: role.charAt(0).toUpperCase() + role.slice(1), hex: String(hex), role }))
                : prev.brand.palette,
            };
          }

          return next;
        });
      } catch (err) {
        console.warn('Workspace state hydration completed with fallbacks:', err);
      }
    },
    [state.activeWorkspaceId]
  );

  const loginWithGoogle: BrainWiseContextValue['loginWithGoogle'] = async () => {
    try {
      const session = await signInWithGoogle();
      apiClient.setAuthToken(session.idToken);
      setStoredAuthToken(session.idToken);

      let wsId: string | undefined = undefined;
      let userDisplayName = session.displayName;

      try {
        const currentUserData = await apiClient.getCurrentUser();
        if (currentUserData?.user) {
          userDisplayName = currentUserData.user.displayName || userDisplayName;
        }
        if (currentUserData?.activeWorkspace?.workspaceId) {
          wsId = currentUserData.activeWorkspace.workspaceId;
        } else if (currentUserData?.workspaces && currentUserData.workspaces.length > 0) {
          wsId = currentUserData.workspaces[0].workspaceId;
        } else {
          // Auto-provision initial workspace for brand-new Google users
          try {
            const created = await apiClient.createWorkspace({
              workspaceName: `${userDisplayName || 'My'}'s Venture`,
              industry: 'Technology & Consumer Goods',
              country: 'Global',
            });
            wsId = created?.workspace?.workspaceId;
          } catch {
            // Offline or decoupled fallback
          }
        }
      } catch (checkErr) {
        console.debug('Backend user profile check note:', checkErr);
      }

      if (wsId) {
        apiClient.setActiveWorkspaceId(wsId);
      }

      const fullName = userDisplayName || session.email?.split('@')[0] || 'Founder';
      const firstName = fullName.split(' ')[0] || 'Founder';
      const lastName = fullName.split(' ').slice(1).join(' ') || '';
      const email = session.email || '';

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        activeWorkspaceId: wsId,
        isExampleWorkspace: false,
        currentRoute: prev.workspacePrefs?.defaultLandingView ?? 'dashboard',
        user: {
          ...prev.user,
          firstName,
          lastName,
          email,
          avatarInitials: (firstName[0] || 'U').toUpperCase() + (lastName[0] || '').toUpperCase(),
        },
      }));

      // Only hydrate state if a valid workspace ID exists on the backend
      if (wsId) {
        void hydrateWorkspaceState(wsId);
      }

      showToast(`Welcome back, ${firstName}.`);
      return { success: true, nextRoute: 'dashboard' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      return { success: false, error: msg };
    }
  };

  const sendChatToStrategist: BrainWiseContextValue['sendChatToStrategist'] = async (
    message,
    options
  ) => {
    const res = await apiClient.sendStrategistChat({
      workspaceId: state.activeWorkspaceId || undefined,
      message,
      threadId: options?.threadId,
      modelTier: options?.modelTier || 'fast',
      history: options?.history,
    });
    return {
      reply: res.reply,
      citations: res.citations || [],
      modelUsed: res.modelUsed,
    };
  };

  useEffect(() => {
    try {
      const savedToken = getStoredAuthToken();
      if (savedToken) {
        apiClient.setAuthToken(savedToken);
        apiClient
          .getCurrentUser()
          .then(({ user, workspaces, activeWorkspace }) => {
            if (user) {
              const wsId = activeWorkspace?.workspaceId || workspaces?.[0]?.workspaceId;
              if (wsId) {
                apiClient.setActiveWorkspaceId(wsId);
                void hydrateWorkspaceState(wsId);
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
            setStoredAuthToken(null);
            apiClient.setAuthToken(null);
          });
      }
    } catch {
      // ignore storage access error
    }
  }, [hydrateWorkspaceState]);

  const loginUser: BrainWiseContextValue['loginUser'] = async (email, password) => {
    try {
      const res = await apiClient.authLogin({ email, password });
      apiClient.setAuthToken(res.token);
      setStoredAuthToken(res.token);

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
      setStoredAuthToken(res.token);

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
      setStoredAuthToken(res.token);

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
      setStoredAuthToken(null);
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
      ...SOLSTICE_EXAMPLE_STATE,
      isAuthenticated: true,
      currentRoute: prev.workspacePrefs?.defaultLandingView ?? 'dashboard',
      isExampleWorkspace: true,
      user: {
        ...SOLSTICE_EXAMPLE_STATE.user,
        firstName: userName,
        email: userEmail,
        avatarInitials: (userName[0] || 'V').toUpperCase() + (userName[1] || 'K').toUpperCase(),
      },
    }));
    showToast('Viewing Solstice Craft Coffee Example Workspace.', {
      undoLabel: 'Exit Example',
      onUndo: () => exitExampleWorkspace(),
      tone: 'info',
    });

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

          // Authoritative workspace team members
          const serverMembers = await apiClient.getWorkspaceMembers(wsId).catch(() => []);
          if (Array.isArray(serverMembers) && serverMembers.length > 0) {
            setState((prev) => ({
              ...prev,
              teamMembers: serverMembers.map((m: any) => ({
                id: m.userId || m.membershipId,
                name: m.name || m.userId,
                email:
                  m.email ||
                  (m.userId && m.userId.includes('@')
                    ? m.userId
                    : `${m.userId || 'collaborator'}@workspace.internal`),
                role:
                  m.role === 'owner'
                    ? 'Owner'
                    : m.role === 'admin'
                      ? 'Strategist'
                      : m.role === 'designer'
                        ? 'Brand Designer'
                        : 'Viewer',
                status: m.membershipStatus === 'invited' ? 'Invited' : 'Active',
              })),
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
      const useCustom =
        Boolean(customName) || Boolean(payload.startFreshEmpty) || Boolean(payload.sandboxIdeaMode);
      const baseBrain: BusinessBrainData = payload.sandboxIdeaMode
        ? {
            businessName: customName || 'Idea Exploration Workspace',
            tagline:
              'Idea Sandbox — Validate a concept in Idea Intelligence to hatch your Business Brain',
            industry: payload.industry.trim() || 'Idea Sandbox & Research',
            stage: 'Idea Stage',
            activationState: 'DORMANT_SANDBOX',
            location: payload.location.trim() || 'Global',
            website: '',
            foundedYear: '2026',
            overviewSummary:
              'Idea Exploration Workspace. Business Brain is currently dormant and will activate upon idea validation.',
            targetAudience: payload.targetCustomers.trim() || 'Target Market to be validated',
            brandPositioning: 'Positioning will be synthesized upon idea validation.',
            businessModel: 'Model to be validated in Idea Intelligence',
            revenueModel: 'Pricing ladder to be validated',
            valueProposition: 'Value proposition under active research.',
            primaryGoals: payload.primaryGoals.length
              ? payload.primaryGoals
              : ['Validate startup idea'],
            products: [],
            personas: [],
            documents: [],
            decisions: [],
            history: [
              {
                id: `hist-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                event:
                  'Entered Idea Sandbox Mode — Business Brain set to dormant until concept validation',
                department: 'Business Brain' as const,
              },
            ],
            lastUpdated: new Date().toISOString().slice(0, 10),
          }
        : payload.startFreshEmpty
          ? {
              businessName: customName || 'New Venture Workspace',
              tagline: 'Define your core positioning in Brand Studio',
              industry: payload.industry.trim() || 'Technology & Consumer Goods',
              stage: payload.stage || 'Idea Stage',
              activationState: 'ACTIVE_ESTABLISHED',
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
                activationState: 'ACTIVE_ESTABLISHED',
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

      const isFromExample = Boolean(prev.isExampleWorkspace || prev.brain?.businessName === 'Solstice Craft Coffee');
      const mergedCompetitors =
        seededCompetitors.length > 0
          ? seededCompetitors
          : (isFromExample ? [] : prev.competitors);

      return {
        ...prev,
        isAuthenticated: true,
        currentRoute: 'dashboard',
        isExampleWorkspace: false,
        onboarding: {
          completed: true,
          personaRole: payload.personaRole,
          primaryGoals: payload.primaryGoals,
        },
        brain: baseBrain,
        reports: isFromExample ? [] : prev.reports,
        assets: isFromExample ? [] : prev.assets,
        goals: isFromExample ? [] : prev.goals,
        tasks: isFromExample ? [] : prev.tasks,
        experiments: isFromExample ? [] : prev.experiments,
        marketEvents: isFromExample ? [] : prev.marketEvents,
        competitors: mergedCompetitors,
        selectedCompetitorId: mergedCompetitors[0]?.id ?? '',
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
    signOutClient().catch(() => {});
    apiClient.setAuthToken(null);
    apiClient.setActiveWorkspaceId(null);
    setStoredAuthToken(null);
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      currentRoute: 'landing',
    }));
  };

  const switchWorkspace: BrainWiseContextValue['switchWorkspace'] = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === state.activeWorkspaceId) return;
    try {
      await apiClient.switchActiveWorkspace(workspaceId);
      apiClient.setActiveWorkspaceId(workspaceId);
      setState((prev) => ({
        ...prev,
        activeWorkspaceId: workspaceId,
        goals: [],
        tasks: [],
        competitors: [],
        assets: [],
        reports: [],
        activeReportId: '',
      }));
      await hydrateWorkspaceState(workspaceId);
      showToast('Workspace switched successfully.');
    } catch (err: any) {
      showToast(`Failed to switch workspace: ${err?.message || 'Error'}`, { tone: 'error' });
    }
  };

  const resetDemoData = () => {
    setState({
      ...SOLSTICE_EXAMPLE_STATE,
      isAuthenticated: true,
      currentRoute: 'dashboard',
      isExampleWorkspace: true,
    });
    showToast('Example workspace reset to Solstice Craft Coffee demonstration state.');
  };

  const openExampleWorkspace = () => {
    if (!state.isExampleWorkspace) {
      try {
        localStorage.setItem(USER_STASH_KEY, JSON.stringify(state));
      } catch {
        // ignore
      }
    }
    setState({
      ...SOLSTICE_EXAMPLE_STATE,
      isAuthenticated: true,
      currentRoute: 'dashboard',
      isExampleWorkspace: true,
    });
    showToast('Switched to Solstice Craft Coffee Example Workspace.', {
      undoLabel: 'Exit Example',
      onUndo: () => exitExampleWorkspace(),
      tone: 'info',
    });
  };

  const exitExampleWorkspace = () => {
    let restored: BrainWiseState | null = null;
    try {
      const saved = localStorage.getItem(USER_STASH_KEY);
      if (saved) {
        restored = JSON.parse(saved);
      }
    } catch {
      // ignore
    }

    if (restored && !restored.isExampleWorkspace) {
      setState({
        ...restored,
        isExampleWorkspace: false,
      });
    } else {
      const clean = createCleanWorkspaceState(
        state.user.email !== 'vishesh.kakar@gmail.com' ? state.user : undefined,
        'My Venture'
      );
      setState({
        ...clean,
        isExampleWorkspace: false,
      });
    }
    showToast('Returned to your personal workspace.', { tone: 'success' });
  };

  const resetUserWorkspace = () => {
    const clean = createCleanWorkspaceState(
      state.user.email !== 'vishesh.kakar@gmail.com' ? state.user : undefined,
      state.user.firstName ? `${state.user.firstName}'s Venture` : 'My Venture'
    );
    setState({
      ...clean,
      isExampleWorkspace: false,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_STASH_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast('Your personal workspace has been reset to a clean state.', { tone: 'info' });
  };

  const updateBrain = (patch: Partial<BusinessBrainData>) => {
    const prevBrain = state.brain;
    const prevBrand = state.brand;
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
      apiClient.updateBusinessProfile(state.activeWorkspaceId, patch).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          brain: prevBrain,
          brand: prevBrand,
        }));
        showToast(`Failed to persist Business Brain changes: ${err?.message || 'Error'}`, {
          tone: 'error',
        });
      });
    }
  };

  const confirmFact = (fieldKey: string) => {
    const prevProv = state.brain.provenance;
    const prevUpdated = state.brain.lastUpdated;
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
      apiClient.confirmFact(state.activeWorkspaceId, fieldKey).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          brain: {
            ...prev.brain,
            provenance: prevProv,
            lastUpdated: prevUpdated,
          },
        }));
        showToast(`Failed to confirm fact: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const addExclusionRule = (rule: string) => {
    const trimmed = rule.trim();
    if (!trimmed) return;
    const prevMemory = state.brain.strategicMemory;
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
      apiClient.addExclusionRule(state.activeWorkspaceId, trimmed).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          brain: {
            ...prev.brain,
            strategicMemory: prevMemory,
          },
        }));
        showToast(`Failed to add exclusion rule: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const removeExclusionRule = (rule: string) => {
    const prevMemory = state.brain.strategicMemory;
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
      apiClient.removeExclusionRule(state.activeWorkspaceId, rule).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          brain: {
            ...prev.brain,
            strategicMemory: prevMemory,
          },
        }));
        showToast(`Failed to remove exclusion rule: ${err?.message || 'Error'}`, { tone: 'error' });
      });
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

  const graduateIdeaToBrain = (reportId: string) => {
    setState((prev) => {
      const target = prev.reports.find((r) => r.id === reportId);
      if (!target) return prev;

      const isDormant =
        prev.brain.activationState === 'DORMANT_SANDBOX' ||
        prev.brain.stage === 'Idea Stage' ||
        prev.brain.businessName === 'Idea Exploration Workspace' ||
        prev.brain.businessName === 'New Venture Workspace';

      const graduatedProducts: ProductServiceItem[] = (target.pricingAnalysis?.tiers ?? []).map(
        (t, idx) => ({
          id: `prod-grad-${Date.now()}-${idx}`,
          name: t.tier,
          category: target.industry || 'Core Offering',
          priceRange: t.range,
          pricingStructure: 'tiered',
          description: `${t.positioning}. Researched in Idea Intelligence dossier "${target.title}".`,
          marginEstimate: '65% - 80%',
          isCoreOffering: idx === 0,
          status: 'active',
        })
      );

      const graduatedPersonas: CustomerPersona[] = (target.customerSegments ?? []).map(
        (seg, idx) => ({
          id: `persona-grad-${Date.now()}-${idx}`,
          name: seg.name,
          segment: seg.name,
          type: 'B2C',
          ageOrFirmographics: `${target.geography} (Target Share: ${seg.share})`,
          painPoints: [
            seg.need,
            ...(target.customerPainPoints ?? []).slice(0, 2).map((p) => p.title),
          ],
          needs: [seg.need],
          buyingTriggers: [`Urgency level: ${seg.urgency}`],
          estimatedShare: seg.share,
          willingnessToPay: (seg as any).willingnessToPay || 'Medium / Market standard',
          urgency: seg.urgency.toLowerCase().includes('high')
            ? 'High'
            : seg.urgency.toLowerCase().includes('low')
              ? 'Low'
              : 'Medium',
        })
      );

      const nextBrain: BusinessBrainData = {
        ...prev.brain,
        businessName: isDormant ? target.title : prev.brain.businessName,
        tagline:
          prev.brain.tagline &&
          prev.brain.tagline !== 'Define your core positioning in Brand Studio' &&
          prev.brain.tagline !==
            'Idea Sandbox — Validate a concept in Idea Intelligence to hatch your Business Brain'
            ? prev.brain.tagline
            : target.validationScorecard?.strategicWedge || target.executiveSummary.slice(0, 90),
        industry: target.industry || prev.brain.industry,
        stage: 'Pre-Launch',
        location: target.geography || prev.brain.location,
        targetAudience: target.targetMarket || prev.brain.targetAudience,
        brandPositioning: target.validationScorecard?.strategicWedge || target.executiveSummary,
        valueProposition:
          target.validationScorecard?.bottomLine ||
          target.marketDemand?.summary ||
          prev.brain.valueProposition,
        overviewSummary: target.executiveSummary,
        products: prev.brain.products.length > 0 ? prev.brain.products : graduatedProducts,
        personas: prev.brain.personas.length > 0 ? prev.brain.personas : graduatedPersonas,
        activationState: 'ACTIVE_ESTABLISHED',
        graduatedFromReportId: target.id,
        graduatedAt: new Date().toISOString(),
        history: [
          {
            id: `hist-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            event: `Graduated from Idea Intelligence dossier "${target.title}" (Viability Score: ${target.validationScorecard?.viabilityScore ?? 75}/100) — Business Brain officially hatched & activated`,
            department: 'Idea Intelligence',
          },
          ...prev.brain.history,
        ],
        lastUpdated: new Date().toISOString().slice(0, 10),
      };

      return {
        ...prev,
        reports: prev.reports.map((r) => (r.id === reportId ? { ...r, savedToBrain: true } : r)),
        brain: nextBrain,
      };
    });
    showToast('🚀 Idea Validated! Your Business Brain has been officially hatched & activated.');
  };

  const setBrainActivationState = (activationState: BrainActivationState) => {
    setState((prev) => ({
      ...prev,
      brain: {
        ...prev.brain,
        activationState,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    }));
  };

  const toggleSaveReportToBrain = (reportId: string) => {
    setState((prev) => {
      const target = prev.reports.find((r) => r.id === reportId);
      const nextSaved = target ? !target.savedToBrain : true;

      const isDormant =
        prev.brain.activationState === 'DORMANT_SANDBOX' ||
        prev.brain.stage === 'Idea Stage' ||
        prev.brain.businessName === 'Idea Exploration Workspace' ||
        prev.brain.businessName === 'New Venture Workspace';

      if (nextSaved && target && isDormant) {
        // Run full graduation when committing an idea to a dormant brain
        const graduatedProducts: ProductServiceItem[] = (target.pricingAnalysis?.tiers ?? []).map(
          (t, idx) => ({
            id: `prod-grad-${Date.now()}-${idx}`,
            name: t.tier,
            category: target.industry || 'Core Offering',
            priceRange: t.range,
            pricingStructure: 'tiered',
            description: `${t.positioning}. Researched in Idea Intelligence dossier "${target.title}".`,
            marginEstimate: '65% - 80%',
            isCoreOffering: idx === 0,
            status: 'active',
          })
        );

        const graduatedPersonas: CustomerPersona[] = (target.customerSegments ?? []).map(
          (seg, idx) => ({
            id: `persona-grad-${Date.now()}-${idx}`,
            name: seg.name,
            segment: seg.name,
            type: 'B2C',
            ageOrFirmographics: `${target.geography} (Target Share: ${seg.share})`,
            painPoints: [
              seg.need,
              ...(target.customerPainPoints ?? []).slice(0, 2).map((p) => p.title),
            ],
            needs: [seg.need],
            buyingTriggers: [`Urgency level: ${seg.urgency}`],
            estimatedShare: seg.share,
            willingnessToPay: (seg as any).willingnessToPay || 'Medium / Market standard',
            urgency: seg.urgency.toLowerCase().includes('high')
              ? 'High'
              : seg.urgency.toLowerCase().includes('low')
                ? 'Low'
                : 'Medium',
          })
        );

        return {
          ...prev,
          reports: prev.reports.map((r) => (r.id === reportId ? { ...r, savedToBrain: true } : r)),
          brain: {
            ...prev.brain,
            businessName: target.title,
            tagline:
              target.validationScorecard?.strategicWedge || target.executiveSummary.slice(0, 90),
            industry: target.industry || prev.brain.industry,
            stage: 'Pre-Launch',
            location: target.geography || prev.brain.location,
            targetAudience: target.targetMarket || prev.brain.targetAudience,
            brandPositioning: target.validationScorecard?.strategicWedge || target.executiveSummary,
            valueProposition:
              target.validationScorecard?.bottomLine ||
              target.marketDemand?.summary ||
              prev.brain.valueProposition,
            overviewSummary: target.executiveSummary,
            products: prev.brain.products.length > 0 ? prev.brain.products : graduatedProducts,
            personas: prev.brain.personas.length > 0 ? prev.brain.personas : graduatedPersonas,
            activationState: 'ACTIVE_ESTABLISHED',
            graduatedFromReportId: target.id,
            graduatedAt: new Date().toISOString(),
            history: [
              {
                id: `hist-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                event: `Graduated from Idea Intelligence dossier "${target.title}" (Viability Score: ${target.validationScorecard?.viabilityScore ?? 75}/100) — Business Brain officially hatched & activated`,
                department: 'Idea Intelligence',
              },
              ...prev.brain.history,
            ],
            lastUpdated: new Date().toISOString().slice(0, 10),
          },
        };
      }

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

  const saveReportScenario = (
    reportId: string,
    scenario: Omit<MarketScenarioPreset, 'id' | 'createdAt'> & { id?: string }
  ) => {
    const scenarioId = scenario.id || `scen-${Date.now()}`;
    const fullScenario: MarketScenarioPreset = {
      ...scenario,
      id: scenarioId,
      createdAt: new Date().toISOString().slice(0, 10),
      isCustom: true,
    };

    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => {
        if (r.id !== reportId) return r;
        const currentScenarios = r.scenarios ?? [];
        const existingIdx = currentScenarios.findIndex((s) => s.id === scenarioId);
        const updatedScenarios =
          existingIdx >= 0
            ? currentScenarios.map((s, idx) => (idx === existingIdx ? fullScenario : s))
            : [...currentScenarios, fullScenario];

        return {
          ...r,
          scenarios: updatedScenarios,
          activeScenarioId: scenarioId,
        };
      }),
    }));

    if (state.activeWorkspaceId) {
      apiClient.saveReportScenario(state.activeWorkspaceId, reportId, fullScenario).catch(() => {
        // Fallback gracefully in offline / mock mode
      });
    }

    showToast(`Saved "${fullScenario.name}" to report scenarios.`);
  };

  const deleteReportScenario = (reportId: string, scenarioId: string) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => {
        if (r.id !== reportId) return r;
        const nextScenarios = (r.scenarios ?? []).filter((s) => s.id !== scenarioId);
        return {
          ...r,
          scenarios: nextScenarios,
          activeScenarioId:
            r.activeScenarioId === scenarioId ? nextScenarios[0]?.id : r.activeScenarioId,
        };
      }),
    }));

    if (state.activeWorkspaceId) {
      apiClient.deleteReportScenario(state.activeWorkspaceId, reportId, scenarioId).catch(() => {
        // Fallback gracefully
      });
    }

    showToast('Scenario removed from report.');
  };

  const selectReportScenario = (reportId: string, scenarioId: string) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === reportId ? { ...r, activeScenarioId: scenarioId } : r
      ),
    }));
  };

  const addCompetitor = (comp: Omit<CompetitorProfileData, 'id'>) => {
    const newId = `comp-${Date.now()}`;
    const prevCompetitors = state.competitors;
    const prevSelected = state.selectedCompetitorId;
    setState((prev) => ({
      ...prev,
      competitors: [{ ...comp, id: newId }, ...prev.competitors],
      selectedCompetitorId: newId,
    }));
    showToast(`${comp.name} added to Competitive Intelligence.`);
    if (state.activeWorkspaceId) {
      apiClient.createCompetitor(state.activeWorkspaceId, comp).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          competitors: prevCompetitors,
          selectedCompetitorId: prevSelected,
        }));
        showToast(`Failed to persist competitor: ${err?.message || 'Error'}`, { tone: 'error' });
      });
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
    const prevCompetitors = state.competitors;
    const prevSelected = state.selectedCompetitorId;
    if (state.activeWorkspaceId) {
      apiClient.deleteCompetitor(state.activeWorkspaceId, compId).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          competitors: prevCompetitors,
          selectedCompetitorId: prevSelected,
        }));
        showToast(`Failed to remove competitor from server: ${err?.message || 'Error'}`, {
          tone: 'error',
        });
      });
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
    const prevBrand = state.brand;
    setState((prev) => {
      const nextBrand = {
        ...prev.brand,
        status: 'Approved' as const,
        selectedConceptId: conceptId,
      };
      if (prev.activeWorkspaceId) {
        apiClient
          .saveBrandIdentity(prev.activeWorkspaceId, {
            brandName: nextBrand.brandName,
            tagline: nextBrand.tagline,
            mission: nextBrand.positioningStatement,
            approvalStatus: 'APPROVED',
          })
          .catch((err: any) => {
            setState((p) => ({ ...p, brand: prevBrand }));
            showToast(`Failed to persist brand concept: ${err?.message || 'Error'}`, {
              tone: 'error',
            });
          });
      }
      return {
        ...prev,
        brand: nextBrand,
      };
    });
    showToast('Approved brand concept updated across collateral studios.');
  };

  const updateBrandIdentity = (patch: Partial<BrainWiseState['brand']>) => {
    const prevBrand = state.brand;
    const prevBrain = state.brain;
    setState((prev) => {
      const nextBrand = { ...prev.brand, ...patch };
      if (prev.activeWorkspaceId) {
        apiClient
          .saveBrandIdentity(prev.activeWorkspaceId, {
            brandName: nextBrand.brandName,
            tagline: nextBrand.tagline,
            mission: nextBrand.positioningStatement,
            approvalStatus: nextBrand.status === 'Approved' ? 'APPROVED' : 'DRAFT',
          })
          .catch((err: any) => {
            setState((p) => ({ ...p, brand: prevBrand, brain: prevBrain }));
            showToast(`Failed to persist brand identity: ${err?.message || 'Error'}`, {
              tone: 'error',
            });
          });
      }
      return {
        ...prev,
        brand: nextBrand,
        brain: {
          ...prev.brain,
          ...(patch.brandName !== undefined ? { businessName: patch.brandName } : {}),
          ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
          ...(patch.brandName !== undefined || patch.tagline !== undefined
            ? { lastUpdated: new Date().toISOString().slice(0, 10) }
            : {}),
        },
      };
    });
  };

  const addBrandAsset = (asset: Omit<BrandAsset, 'id' | 'createdAt'>) => {
    const newAsset: BrandAsset = {
      ...asset,
      id: `asset-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const prevAssets = state.assets;
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
        .catch((err: any) => {
          setState((prev) => ({ ...prev, assets: prevAssets }));
          showToast(`Failed to upload asset: ${err?.message || 'Error'}`, { tone: 'error' });
        });
    }
  };

  const renameBrandAsset = (assetId: string, title: string) => {
    if (!title.trim()) return;
    const cleanTitle = title.trim();
    const prevAssets = state.assets;
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === assetId ? { ...a, title: cleanTitle } : a)),
    }));
    showToast('Asset renamed.');
    if (state.activeWorkspaceId) {
      apiClient
        .updateBrandAsset(state.activeWorkspaceId, assetId, { title: cleanTitle, name: cleanTitle })
        .catch((err: any) => {
          setState((prev) => ({ ...prev, assets: prevAssets }));
          showToast(`Failed to rename asset: ${err?.message || 'Error'}`, { tone: 'error' });
        });
    }
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
          if (state.activeWorkspaceId) {
            if (prevStatus === 'Archived') {
              apiClient.archiveBrandAsset(state.activeWorkspaceId, assetId).catch(() => {});
            } else {
              apiClient.restoreBrandAsset(state.activeWorkspaceId, assetId).catch(() => {});
            }
          }
        },
      }
    );

    if (state.activeWorkspaceId) {
      if (nextStatus === 'Archived') {
        apiClient.archiveBrandAsset(state.activeWorkspaceId, assetId).catch(() => {});
      } else {
        apiClient.restoreBrandAsset(state.activeWorkspaceId, assetId).catch(() => {});
      }
    }
  };

  const duplicateBrandAsset = async (assetId: string): Promise<BrandAsset | null> => {
    const target = state.assets.find((a) => a.id === assetId);
    if (!target) return null;
    const cloneName = `${target.title} (Copy)`;
    const newId = `asset-${Date.now()}`;
    const clonedAsset: BrandAsset = {
      ...target,
      id: newId,
      title: cloneName,
      headlineText: target.headlineText ? `${target.headlineText} (Copy)` : cloneName,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setState((prev) => ({
      ...prev,
      assets: [clonedAsset, ...prev.assets],
    }));
    showToast(`Duplicated "${target.title}".`);

    if (state.activeWorkspaceId) {
      try {
        const res = await apiClient.duplicateBrandAsset(state.activeWorkspaceId, assetId);
        if (res && res.id) {
          const finalClone: BrandAsset = { ...clonedAsset, id: res.id, title: res.title || cloneName };
          setState((prev) => ({
            ...prev,
            assets: prev.assets.map((a) => (a.id === newId ? finalClone : a)),
          }));
          return finalClone;
        }
      } catch {
        // Optimistic clone preserved
      }
    }
    return clonedAsset;
  };

  const bulkArchiveBrandAssets = async (assetIds: string[]) => {
    if (!assetIds.length) return;
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (assetIds.includes(a.id) ? { ...a, status: 'Archived' } : a)),
    }));
    showToast(`Archived ${assetIds.length} assets.`);
    if (state.activeWorkspaceId) {
      apiClient.bulkArchiveBrandAssets(state.activeWorkspaceId, assetIds).catch(() => {});
    }
  };

  const bulkRestoreBrandAssets = async (assetIds: string[], targetSection = 'Active') => {
    if (!assetIds.length) return;
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (assetIds.includes(a.id) ? { ...a, status: 'Approved', folder: targetSection as any } : a)),
    }));
    showToast(`Restored ${assetIds.length} assets.`);
    if (state.activeWorkspaceId) {
      apiClient.bulkRestoreBrandAssets(state.activeWorkspaceId, assetIds, targetSection).catch(() => {});
    }
  };

  const bulkTagBrandAssets = async (assetIds: string[], tagsToAdd: string[], tagsToRemove: string[] = []) => {
    if (!assetIds.length) return;
    showToast(`Updated tags on ${assetIds.length} assets.`);
    if (state.activeWorkspaceId) {
      apiClient.bulkTagBrandAssets(state.activeWorkspaceId, assetIds, tagsToAdd, tagsToRemove).catch(() => {});
    }
  };

  const bulkMoveBrandAssets = async (
    assetIds: string[],
    targetSection: 'Active' | 'Identity' | 'Print & Packaging' | 'Social Media' | 'Archived'
  ) => {
    if (!assetIds.length) return;
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (assetIds.includes(a.id) ? { ...a, folder: targetSection } : a)),
    }));
    showToast(`Moved ${assetIds.length} assets to ${targetSection}.`);
    if (state.activeWorkspaceId) {
      apiClient.bulkMoveBrandAssets(state.activeWorkspaceId, assetIds, targetSection).catch(() => {});
    }
  };

  const deleteBrandAssetPermanently = async (assetId: string) => {
    setState((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
    showToast('Asset permanently deleted.');
    if (state.activeWorkspaceId) {
      apiClient.deleteBrandAssetPermanently(state.activeWorkspaceId, assetId).catch(() => {});
    }
  };

  const uploadAssetFiles = async (
    files: File[],
    options?: { section?: string; category?: string; onProgress?: (pct: number) => void }
  ) => {
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Strict Video Exclusion
      if (file.type.toLowerCase().startsWith('video/')) {
        showToast(`Excluded "${file.name}": Video files are strictly excluded.`, { tone: 'error' });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds 10MB limit.`, { tone: 'error' });
        continue;
      }

      const tempId = `asset-upload-${Date.now()}-${i}`;
      const defaultSection = options?.section || 'Active';
      const defaultCategory = options?.category || 'Collateral';

      let svgContent: string | undefined;

      if (file.type === 'image/svg+xml') {
        try {
          svgContent = await file.text();
        } catch {
          // ignore
        }
      }

      // Optimistically add to state
      const optimisticAsset: BrandAsset = {
        id: tempId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: (defaultCategory as any) || 'Collateral',
        folder: (defaultSection as any) || 'Active',
        format: `${file.type.split('/')[1]?.toUpperCase() || 'FILE'} · ${(file.size / 1024).toFixed(0)} KB`,
        createdAt: new Date().toISOString().slice(0, 10),
        status: 'Approved',
        headlineText: file.name,
        subtext: `Uploaded file · ${(file.size / 1024).toFixed(0)} KB`,
        accentHex: '#FF7417',
        svgMarkup: svgContent,
      };

      setState((prev) => ({
        ...prev,
        assets: [optimisticAsset, ...prev.assets],
      }));

      options?.onProgress?.(Math.round(((i + 1) / files.length) * 100));

      if (state.activeWorkspaceId) {
        try {
          const wsId = state.activeWorkspaceId;
          const uploadMeta = await apiClient.requestSignedUploadUrl(wsId, {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileSizeBytes: file.size,
            folder: defaultSection.toLowerCase().includes('identity') ? 'brand' : 'documents',
          });

          // Upload file buffer
          if (uploadMeta.uploadUrl.startsWith('/api/')) {
            const bufferBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result as string;
                resolve(res.split(',')[1] || res);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            await fetch(uploadMeta.uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: bufferBase64, mimeType: file.type }),
            });
          }

          // Complete upload in database
          await apiClient.completeAssetUpload(wsId, tempId, {
            name: optimisticAsset.title,
            title: optimisticAsset.title,
            category: optimisticAsset.category,
            section: optimisticAsset.folder,
            folder: optimisticAsset.folder,
            assetType: file.type.split('/')[1] || 'png',
            storagePath: uploadMeta.storagePath,
            fileSize: file.size,
            mimeType: file.type,
            svgContent,
            svgMarkup: svgContent,
          });
        } catch {
          // Keep optimistic asset
        }
      }
    }

    showToast(`Successfully uploaded ${files.length} asset${files.length > 1 ? 's' : ''}.`);
  };

  const getAuthoritativeBrandIdentity = async () => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.getAuthoritativeBrandIdentity(state.activeWorkspaceId);
  };

  const syncBrandWithBusinessBrain = async () => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.syncBrandWithBusinessBrain(state.activeWorkspaceId);
    showToast('Synchronized authoritative identity with Business Brain.');
    return res;
  };

  const evaluateBrandCompliance = async (params: Record<string, any>) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.evaluateBrandCompliance(state.activeWorkspaceId, params);
  };

  const getBrandDriftReport = async () => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.getBrandDriftReport(state.activeWorkspaceId);
  };

  const listBrandIdentityVersions = async () => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.listBrandIdentityVersions(state.activeWorkspaceId);
  };

  const createPackagingAsset = async (payload: Record<string, any>) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.createPackagingAsset(state.activeWorkspaceId, payload);
    showToast(`Created packaging asset "${payload.name}".`);
    return res;
  };

  const listPackagingAssets = async (filter?: Record<string, any>) => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.listPackagingAssets(state.activeWorkspaceId, filter);
  };

  const evaluatePrintReadiness = async (assetId: string) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.evaluatePrintReadiness(state.activeWorkspaceId, assetId);
  };

  const extractPackagingContentIntelligence = async (assetId: string, rawText?: string) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.extractPackagingContentIntelligence(state.activeWorkspaceId, assetId, rawText);
  };

  const advancePackagingWorkflow = async (
    assetId: string,
    payload: { targetStatus: string; notes?: string; vendorName?: string }
  ) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.advancePackagingWorkflow(state.activeWorkspaceId, assetId, payload);
    showToast(`Workflow updated to "${payload.targetStatus}".`);
    return res;
  };

  const analyzeAssetIntelligence = async (assetId: string, bypassCredits = false) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.analyzeAssetIntelligence(state.activeWorkspaceId, assetId, bypassCredits);
    showToast('AI Asset Analysis completed.');
    return res;
  };

  const semanticAssetSearch = async (query: string, filters?: any) => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.semanticAssetSearch(state.activeWorkspaceId, query, filters);
  };

  const recommendAssets = async (payload: any) => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.recommendAssets(state.activeWorkspaceId, payload);
  };

  const checkAssetDuplicates = async (payload: any) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.checkAssetDuplicates(state.activeWorkspaceId, payload);
  };

  const applyHumanClassificationOverride = async (payload: any) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.applyHumanClassificationOverride(state.activeWorkspaceId, payload);
    showToast('Classification override applied & confirmed.');
    return res;
  };

  const chatAssetAssistant = async (payload: { query: string; conversationId?: string; confirmationToken?: string; context?: any }) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.chatAssetAssistant(state.activeWorkspaceId, payload);
  };

  const confirmAssetAssistantAction = async (payload: { confirmationToken: string; conversationId?: string }) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.confirmAssetAssistantAction(state.activeWorkspaceId, payload);
    showToast('Action confirmed and executed.');
    return res;
  };

  const bindAssetsToCampaign = async (payload: any) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.bindAssetsToCampaign(state.activeWorkspaceId, payload);
    showToast('Assets successfully bound to campaign.');
    return res;
  };

  const createAssetDerivative = async (payload: any) => {
    if (!state.activeWorkspaceId) return null;
    const res = await apiClient.createAssetDerivative(state.activeWorkspaceId, payload);
    showToast('Asset derivative created.');
    return res;
  };

  const getCompetitiveCreativeOpportunities = async (params?: any) => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.getCompetitiveCreativeOpportunities(state.activeWorkspaceId, params);
  };

  const recordAssetPerformance = async (payload: any) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.recordAssetPerformance(state.activeWorkspaceId, payload);
  };

  const getAssetPerformanceSummary = async (assetId: string) => {
    if (!state.activeWorkspaceId) return null;
    return apiClient.getAssetPerformanceSummary(state.activeWorkspaceId, assetId);
  };

  const listTopPerformingAssets = async (params?: any) => {
    if (!state.activeWorkspaceId) return [];
    return apiClient.listTopPerformingAssets(state.activeWorkspaceId, params);
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
      apiClient.updateTask(state.activeWorkspaceId, taskId, { status: nextStatus }).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)),
        }));
        showToast(`Failed to update task: ${err?.message || 'Error'}`, { tone: 'error' });
      });
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
    const prevTasks = state.tasks;
    setState((prev) => ({
      ...prev,
      tasks: [{ ...task, id }, ...prev.tasks],
    }));
    showToast('Action task added to Growth Planner.');
    if (state.activeWorkspaceId) {
      apiClient.createTask(state.activeWorkspaceId, task).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          tasks: prevTasks,
        }));
        showToast(`Failed to create task: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
    const prevTasks = state.tasks;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, notes } : t)),
    }));
    if (state.activeWorkspaceId) {
      apiClient.updateTask(state.activeWorkspaceId, taskId, { notes }).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          tasks: prevTasks,
        }));
        showToast(`Failed to update task notes: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const addGoal = (goal: Omit<GrowthGoal, 'id'>) => {
    const id = `goal-${Date.now()}`;
    const prevGoals = state.goals;
    setState((prev) => ({
      ...prev,
      goals: [{ ...goal, id }, ...prev.goals],
    }));
    showToast('Business goal added.');
    if (state.activeWorkspaceId) {
      apiClient.createGoal(state.activeWorkspaceId, goal).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          goals: prevGoals,
        }));
        showToast(`Failed to persist goal: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const updateGoalProgress = (goalId: string, currentValue: number) => {
    const targetGoal = state.goals.find((g) => g.id === goalId);
    const prevValue = targetGoal ? targetGoal.currentValue : currentValue;
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, currentValue } : g)),
    }));
    if (state.activeWorkspaceId) {
      apiClient.updateGoal(state.activeWorkspaceId, goalId, { currentValue }).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          goals: prev.goals.map((g) => (g.id === goalId ? { ...g, currentValue: prevValue } : g)),
        }));
        showToast(`Failed to update goal: ${err?.message || 'Error'}`, { tone: 'error' });
      });
      apiClient
        .recordGoalObservation(state.activeWorkspaceId, goalId, { value: currentValue })
        .catch(() => {});
    }
  };

  const addExperiment = (exp: Omit<GrowthExperiment, 'id'>) => {
    const id = `exp-${Date.now()}`;
    const prevExperiments = state.experiments;
    setState((prev) => ({
      ...prev,
      experiments: [{ ...exp, id }, ...prev.experiments],
    }));
    showToast('Growth experiment created.');
    if (state.activeWorkspaceId) {
      apiClient.createExperiment(state.activeWorkspaceId, exp).catch((err: any) => {
        setState((prev) => ({
          ...prev,
          experiments: prevExperiments,
        }));
        showToast(`Failed to persist experiment: ${err?.message || 'Error'}`, { tone: 'error' });
      });
    }
  };

  const updateExperimentStatus = (
    expId: string,
    status: GrowthExperiment['status'],
    results?: string
  ) => {
    const target = state.experiments.find((e) => e.id === expId);
    const prevStatus = target?.status;
    const prevResults = target?.results;
    setState((prev) => ({
      ...prev,
      experiments: prev.experiments.map((e) =>
        e.id === expId ? { ...e, status, results: results ?? e.results ?? '' } : e
      ),
    }));
    showToast('Experiment updated.');
    if (state.activeWorkspaceId) {
      const p =
        status === 'Completed'
          ? apiClient.completeExperiment(state.activeWorkspaceId, expId, { results: results ?? '' })
          : apiClient.updateExperiment(state.activeWorkspaceId, expId, {
              status: status.toLowerCase() as any,
              results: results ?? '',
            });
      p.catch((err: any) => {
        setState((prev) => ({
          ...prev,
          experiments: prev.experiments.map((e) =>
            e.id === expId ? { ...e, status: prevStatus || e.status, results: prevResults ?? '' } : e
          ),
        }));
        showToast(`Failed to update experiment: ${err?.message || 'Error'}`, { tone: 'error' });
      });
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
    apiClient
      .updateCurrentUser({
        displayName: `${patch.firstName || state.user.firstName} ${patch.lastName || state.user.lastName}`.trim(),
        preferences: {
          timezone: patch.timezone || state.user.timezone,
          role: patch.role || state.user.role,
        },
      })
      .catch(() => {});
  };

  const setAiTonePreference = (tone: BrainWiseState['aiTonePreference']) => {
    setState((prev) => ({ ...prev, aiTonePreference: tone }));
    showToast('AI intelligence tone preference saved.');
    if (state.activeWorkspaceId) {
      apiClient
        .updateWorkspace(state.activeWorkspaceId, {
          preferences: { aiTonePreference: tone },
        })
        .catch(() => {});
    }
  };

  const setCustomScenarioB = (preset: MarketScenarioPreset | null) => {
    setState((prev) => ({ ...prev, customScenarioB: preset }));
  };

  const inviteTeamMember = (member: Omit<TeamMemberItem, 'id' | 'status'>) => {
    const tempId = `tm-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      teamMembers: [
        ...(prev.teamMembers ?? INITIAL_BRAINWISE_STATE.teamMembers ?? []),
        { ...member, id: tempId, status: 'Invited' },
      ],
    }));
    showToast(`Invitation recorded for ${member.name}.`);

    if (state.activeWorkspaceId) {
      apiClient
        .addWorkspaceMember(state.activeWorkspaceId, {
          email: member.email,
          name: member.name,
          role: member.role,
        })
        .catch((err) => {
          console.warn('Backend team member synchronization notice:', err);
        });
    }
  };

  const removeTeamMember = (memberId: string) => {
    const current = state.teamMembers ?? [];
    const target = current.find((m) => m.id === memberId);
    setState((prev) => ({
      ...prev,
      teamMembers: (prev.teamMembers ?? []).filter((m) => m.id !== memberId),
    }));
    if (target) showToast(`Removed ${target.name} from roster.`);

    if (state.activeWorkspaceId) {
      apiClient.removeWorkspaceMember(state.activeWorkspaceId, memberId).catch((err) => {
        console.warn('Backend team member removal notice:', err);
      });
    }
  };

  const updateWorkspacePrefs = (patch: Partial<WorkspacePreferences>) => {
    const newPrefs = {
      ...(state.workspacePrefs ?? INITIAL_BRAINWISE_STATE.workspacePrefs!),
      ...patch,
    };
    setState((prev) => ({
      ...prev,
      workspacePrefs: newPrefs,
    }));
    showToast('Workspace preferences saved.');

    if (state.activeWorkspaceId) {
      apiClient
        .updateWorkspace(state.activeWorkspaceId, { preferences: newPrefs })
        .catch((err) => {
          console.warn('Backend workspace preferences synchronization notice:', err);
        });
    }
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
      loginWithGoogle,
      hydrateWorkspaceState,
      refreshWorkspace: hydrateWorkspaceState,
      sendChatToStrategist,
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
      switchWorkspace,
      resetDemoData,
      resetUserWorkspace,
      openExampleWorkspace,
      exitExampleWorkspace,
      updateBrain,
      confirmFact,
      addExclusionRule,
      removeExclusionRule,
      recordStrategicAngleUsage,
      addReport,
      toggleSaveReportToBrain,
      graduateIdeaToBrain,
      setBrainActivationState,
      updateReportAssumption,
      saveReportScenario,
      deleteReportScenario,
      selectReportScenario,
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
      duplicateBrandAsset,
      bulkArchiveBrandAssets,
      bulkRestoreBrandAssets,
      bulkTagBrandAssets,
      bulkMoveBrandAssets,
      deleteBrandAssetPermanently,
      uploadAssetFiles,
      getAuthoritativeBrandIdentity,
      syncBrandWithBusinessBrain,
      evaluateBrandCompliance,
      getBrandDriftReport,
      listBrandIdentityVersions,
      createPackagingAsset,
      listPackagingAssets,
      evaluatePrintReadiness,
      extractPackagingContentIntelligence,
      advancePackagingWorkflow,
      analyzeAssetIntelligence,
      semanticAssetSearch,
      recommendAssets,
      checkAssetDuplicates,
      applyHumanClassificationOverride,
      chatAssetAssistant,
      confirmAssetAssistantAction,
      bindAssetsToCampaign,
      createAssetDerivative,
      getCompetitiveCreativeOpportunities,
      recordAssetPerformance,
      getAssetPerformanceSummary,
      listTopPerformingAssets,
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
