export type PublicRoute =
  | 'landing'
  | 'signup'
  | 'verify-email'
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'onboarding';

export type AppRoute =
  | 'dashboard'
  | 'business-brain'
  | 'idea-intelligence'
  | 'competitive-intelligence'
  | 'market-watch'
  | 'brand-studio'
  | 'asset-library'
  | 'growth-director'
  | 'tasks-experiments'
  | 'business-performance'
  | 'reports'
  | 'settings'
  | 'help-support';

export type AnyRoute = PublicRoute | AppRoute;

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

export type SettingsTabId =
  | 'personal-profile'
  | 'business-profile'
  | 'team-members'
  | 'workspace-preferences'
  | 'notification-settings'
  | 'ai-preferences'
  | 'data-privacy'
  | 'subscription-billing'
  | 'usage-credits'
  | 'integrations'
  | 'help-support';

export type UIViewState = 'default' | 'empty' | 'loading' | 'error';

export type PriorityLevel = 'high' | 'medium' | 'low';

export type DepartmentName =
  | 'Business Brain'
  | 'Idea Intelligence'
  | 'Competitive Intelligence'
  | 'Brand Studio'
  | 'Market Watch'
  | 'Growth Director'
  | 'Analytics';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarInitials: string;
  timezone: string;
}

export interface ProductServiceItem {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  description: string;
  marginEstimate: string;
}

export interface CustomerPersona {
  id: string;
  name: string;
  segment: string;
  ageOrFirmographics: string;
  painPoints: string[];
  buyingTriggers: string[];
  willingnessToPay: string;
}

export interface BusinessDocument {
  id: string;
  name: string;
  type: 'PDF' | 'Deck' | 'Research' | 'Brand Brief' | 'Spreadsheet';
  size: string;
  uploadedAt: string;
  usedByAI: boolean;
}

export interface StrategicDecision {
  id: string;
  title: string;
  rationale: string;
  department: DepartmentName;
  decidedAt: string;
  status: 'active' | 'superseded';
}

export interface BusinessHistoryEvent {
  id: string;
  date: string;
  event: string;
  department: DepartmentName;
}

export type ProvenanceSource =
  'USER_CONFIRMED' | 'AI_INFERRED' | 'DERIVED_FROM_DOC' | 'SYSTEM_DEFAULT';

export interface FactProvenanceItem {
  fieldKey: string;
  source: ProvenanceSource;
  confidence: number;
  verifiedAt?: string;
  lastConfirmedBy?: string;
  notes?: string;
}

export interface StrategicAngleRecord {
  id: string;
  angle: string;
  theme: string;
  usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign';
  lastUsedAt: string;
  frequency: number;
}

export interface StrategicMemory {
  usedAngles: StrategicAngleRecord[];
  fatiguedThemes: string[];
  explicitExclusions: string[];
  lastUpdated: string;
}

export type TruthViolationType =
  | 'PRICE_HALLUCINATION'
  | 'CONTACT_MISMATCH'
  | 'EXCLUSION_BREACH'
  | 'FABRICATED_CLAIM'
  | 'UNSUPPORTED_OFFER';

export interface TruthViolation {
  type: TruthViolationType;
  severity: 'critical' | 'warning';
  detectedText: string;
  expectedFact: string;
  remediationApplied?: string;
  explanation: string;
}

export interface TruthCheckItem {
  factCategory: 'pricing' | 'identity' | 'contact' | 'value_proposition' | 'claims';
  status: 'pass' | 'fail' | 'remediated';
  checkedClaim: string;
  groundTruth: string;
}

export interface TruthCheckResult {
  isValid: boolean;
  truthScore: number;
  status: 'VERIFIED' | 'WARNING' | 'REJECTED' | 'REMEDIATED';
  checkedItems: TruthCheckItem[];
  violations: TruthViolation[];
  remediatedContent?: string;
  refundTriggered: boolean;
  refundReason?: string;
  timestamp: string;
}

export interface BusinessBrainData {
  businessName: string;
  tagline: string;
  industry: string;
  stage: 'Idea Stage' | 'Pre-Launch' | 'Early Traction' | 'Growing Business' | 'Established';
  location: string;
  website: string;
  foundedYear: string;
  overviewSummary: string;
  targetAudience: string;
  brandPositioning: string;
  businessModel: string;
  revenueModel: string;
  valueProposition: string;
  primaryGoals: string[];
  products: ProductServiceItem[];
  personas: CustomerPersona[];
  documents: BusinessDocument[];
  decisions: StrategicDecision[];
  history: BusinessHistoryEvent[];
  lastUpdated: string;
  provenance?: Record<string, FactProvenanceItem>;
  strategicMemory?: StrategicMemory;
}

export interface ReportAssumption {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export interface ResearchReport {
  id: string;
  title: string;
  ideaSummary: string;
  industry: string;
  targetMarket: string;
  geography: string;
  depth: 'Rapid Pulse' | 'Standard Validation' | 'Deep Market Dossier';
  createdAt: string;
  overallConfidence: 'High' | 'Moderate' | 'Exploratory';
  viabilitySignal: 'Strong Fit' | 'Promising with Niche Focus' | 'Needs Pivot';
  savedToBrain: boolean;
  executiveSummary: string;
  marketOverview: {
    text: string;
    factType: 'verified' | 'estimate';
    sources: string[];
  };
  tamSamSom: {
    tamLabel: string;
    tamBasis: string;
    samLabel: string;
    samBasis: string;
    somLabel: string;
    somBasis: string;
    assumptions: ReportAssumption[];
  };
  marketDemand: {
    summary: string;
    signals: { label: string; trend: string; factType: 'verified' | 'estimate' }[];
  };
  customerSegments: { name: string; share: string; need: string; urgency: string }[];
  customerPainPoints: { title: string; severity: PriorityLevel; evidence: string }[];
  competitorLandscapeSummary: string;
  pricingAnalysis: {
    tiers: { tier: string; range: string; positioning: string }[];
    recommendation: string;
  };
  marketOpportunities: string[];
  businessModelOptions: { model: string; pros: string; cons: string; fit: string }[];
  revenuePotential: {
    year1Conservative: string;
    year1Target: string;
    unitEconomicsNote: string;
    factType: 'estimate';
  };
  startupCostEstimates: { category: string; range: string; note: string }[];
  risksAndChallenges: { risk: string; severity: PriorityLevel; mitigation: string }[];
  validationExperiments: { title: string; metric: string; timeframe: string }[];
  finalRecommendation: {
    verdict: string;
    nextSteps: string[];
  };
  sources: {
    title: string;
    publisher: string;
    date: string;
    reliability: 'Primary' | 'Industry Report' | 'Market Estimate';
  }[];
  truthCheck?: TruthCheckResult;
}

export interface CompetitorProfileData {
  id: string;
  name: string;
  website: string;
  category: string;
  geography: string;
  discoveryMethod: 'AI Market Scan' | 'Manual Entry' | 'Idea Research';
  positioning: string;
  priceRange: string;
  researchStatus: 'Complete' | 'Updating' | 'Queued';
  lastResearched: string;
  threatLevel: PriorityLevel;
  marketShareBand: string;
  xValueScore: number; // 0-100 (e.g. Price accessibility -> Premium)
  yDiffScore: number; // 0-100 (e.g. Traditional -> Specialized/Modern)
  overview: string;
  productsAndServices: { name: string; price: string; notes: string }[];
  pricingModel: {
    summary: string;
    entryPrice: string;
    flagshipPrice: string;
    discounts: string;
  };
  brandPositioningDetail: {
    archetype: string;
    tagline: string;
    targetBuyer: string;
    visualTone: string;
  };
  websiteAnalysis: {
    clarityScore: string;
    primaryCTA: string;
    speedNote: string;
    conversionGaps: string[];
  };
  marketingStrategy: {
    channels: string[];
    contentCadence: string;
    paidSignals: string;
  };
  customerReviews: {
    averageRating: string;
    reviewCount: string;
    praisedFor: string[];
    complaints: string[];
  };
  strengths: string[];
  weaknesses: string[];
  historicalChanges: { date: string; change: string; source: string }[];
  monitoringEnabled: boolean;
  monitoringFrequency: 'Daily' | 'Weekly' | 'Bi-weekly';
  monitoredCategories: string[];
}

export interface GapAnalysisItem {
  id: string;
  dimension:
    | 'Competitor Weaknesses'
    | 'Underserved Customers'
    | 'Pricing Opportunities'
    | 'Positioning Opportunities'
    | 'Product Opportunities'
    | 'Distribution Opportunities';
  title: string;
  observation: string;
  opportunity: string;
  impact: PriorityLevel;
}

export interface CompetitiveStrategyData {
  whereToCompete: string;
  whereToDifferentiate: string;
  whatToAvoid: string;
  targetSegment: string;
  potentialMoat: string;
  nextMoves: string[];
  savedToBrain: boolean;
}

export interface BrandConcept {
  id: string;
  name: string;
  rationale: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  headingFont: string;
  bodyFont: string;
  personality: string[];
  markStyle: 'geometric' | 'monogram' | 'emblem';
  customSvg?: string;
  aiPrompt?: string;
  styleTag?: string;
}

export interface CarouselSlide {
  slideNumber: number;
  role: 'Hook' | 'Problem' | 'Insight' | 'Proof' | 'Framework' | 'CTA' | 'Spotlight';
  kicker: string;
  headline: string;
  body: string;
  layout: 'editorial-grid' | 'split-stat' | 'quote-focus' | 'checklist' | 'product-spotlight';
  statCallout?: string;
  svgMotif?: string;
  artDirectionPrompt: string;
}

export interface BrandAsset {
  id: string;
  title: string;
  category:
    | 'Logo'
    | 'Business Card'
    | 'Letterhead'
    | 'Flyer'
    | 'Brochure'
    | 'Poster'
    | 'Banner'
    | 'Packaging'
    | 'Label'
    | 'Sticker'
    | 'Menu'
    | 'Presentation'
    | 'Instagram Post'
    | 'Carousel'
    | 'Facebook Creative'
    | 'Campaign';
  folder: 'Identity' | 'Print & Packaging' | 'Social Media' | 'Campaigns';
  format: string;
  createdAt: string;
  status: 'Approved' | 'Draft' | 'Archived';
  headlineText: string;
  subtext: string;
  accentHex: string;
  darkVariant?: boolean;
  aiGenerated?: boolean;
  aiPrompt?: string;
  aiModel?: string;
  svgMarkup?: string;
  slides?: CarouselSlide[];
  caption?: string;
  hashtags?: string[];
  artDirectionNote?: string;
}

export interface BrandIdentityState {
  status: 'Approved' | 'In Exploration' | 'Not Started';
  brandName: string;
  tagline: string;
  industry: string;
  positioningStatement: string;
  targetAudience: string;
  personalityTraits: string[];
  attributes: string[];
  visualDirection: string;
  selectedConceptId: string;
  concepts: BrandConcept[];
  palette: { name: string; hex: string; role: string }[];
  typography: { heading: string; body: string; mono: string };
  guidelines: {
    logoUsage: string;
    spacingRule: string;
    visualStyle: string;
    brandVoice: string;
    messagingPillars: string[];
  };
}

export interface MarketEvent {
  id: string;
  competitorOrSource: string;
  category:
    | 'Website changes'
    | 'Pricing changes'
    | 'Product launches'
    | 'Offers and promotions'
    | 'Public social media activity'
    | 'Customer reviews'
    | 'Search visibility'
    | 'Industry news'
    | 'Market trends'
    | 'Business expansion announcements';
  detectedChange: string;
  detectedAt: string;
  sourceReference: string;
  importance: PriorityLevel;
  aiInterpretation: string;
  potentialImpact: string;
  suggestedAction: string;
  isRead: boolean;
  convertedToExperimentId?: string;
}

export interface GrowthGoal {
  id: string;
  category:
    | 'Revenue'
    | 'Customer Acquisition'
    | 'Brand Awareness'
    | 'Product Launch'
    | 'Marketing'
    | 'Customer Retention';
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  supportingTaskIds: string[];
}

export interface GrowthTask {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  expectedOutcome: string;
  priority: PriorityLevel;
  estimatedMinutes: number;
  dueDate: string;
  department: DepartmentName;
  status: 'pending' | 'completed' | 'skipped';
  isTodayPriority?: boolean;
  notes?: string;
}

export interface GrowthExperiment {
  id: string;
  title: string;
  hypothesis: string;
  objective: string;
  targetAudience: string;
  action: string;
  successMetric: string;
  budget: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Planned' | 'Completed';
  results: string;
  learnings: string;
}

export interface StrategyRecommendation {
  id: string;
  whatToDo: string;
  whyToDoIt: string;
  supportingResearch: string;
  expectedBenefit: string;
  difficulty: 'Low' | 'Medium' | 'High';
  estimatedCost: string;
  priority: PriorityLevel;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category:
    | 'Competitor Alert'
    | 'Research Complete'
    | 'Opportunity'
    | 'Daily Task'
    | 'Deadline'
    | 'Weekly Report';
  timestamp: string;
  read: boolean;
  targetRoute: AppRoute;
}

export interface OnboardingState {
  completed: boolean;
  personaRole: string;
  primaryGoals: string[];
}

export interface ScheduledReportConfig {
  dailyDigest: boolean;
  weeklyIntelligence: boolean;
  monthlyReview: boolean;
  deliveryEmail: string;
  includeCompetitorDiffs: boolean;
}

export interface MarketScenarioPreset {
  id: string;
  name: string;
  tamBillion: number;
  samSharePct: number;
  somSharePct: number;
  breakEvenMonths: number;
  targetArpuUsd: number;
}

export interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Strategist' | 'Brand Designer' | 'Viewer';
  status: 'Active' | 'Invited';
}

export interface WorkspacePreferences {
  dateFormat: 'YYYY-MM-DD' | 'MMM D, YYYY';
  defaultLandingView: 'dashboard' | 'growth-director';
  compactDensity: boolean;
}

export interface ContextSharingConfig {
  ideaIntelligence: boolean;
  competitiveIntelligence: boolean;
  brandStudio: boolean;
  growthDirector: boolean;
}

export interface SubscriptionState {
  plan: 'Starter' | 'Growth Pro' | 'Venture Team';
  billingCycle: 'monthly' | 'annual';
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
}

export interface BrainWiseState {
  isAuthenticated: boolean;
  currentRoute: AnyRoute;
  settingsTab: SettingsTabId;
  user: UserProfile;
  onboarding: OnboardingState;
  brain: BusinessBrainData;
  reports: ResearchReport[];
  activeReportId: string;
  customScenarioB?: MarketScenarioPreset | null;
  competitors: CompetitorProfileData[];
  selectedCompetitorId: string;
  ownPositionScore?: { x: number; y: number };
  gapAnalysis: GapAnalysisItem[];
  competitiveStrategy: CompetitiveStrategyData;
  brand: BrandIdentityState;
  assets: BrandAsset[];
  marketEvents: MarketEvent[];
  archivedEventIds?: string[];
  scheduledReports: ScheduledReportConfig;
  goals: GrowthGoal[];
  tasks: GrowthTask[];
  experiments: GrowthExperiment[];
  recommendations: StrategyRecommendation[];
  notifications: NotificationItem[];
  aiTonePreference: 'Executive & Concise' | 'Analytical & Detailed' | 'Creative & Exploratory';
  teamMembers?: TeamMemberItem[];
  workspacePrefs?: WorkspacePreferences;
  contextSharing?: ContextSharingConfig;
  subscription?: SubscriptionState;
  integrations?: IntegrationItem[];
  pinnedWidgetIds?: string[];
  prototypeNoticeDismissed: boolean;
}
