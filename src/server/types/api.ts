/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface StandardApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
    creditsDeducted?: number;
    creditBalanceRemaining?: number;
    truthScore?: number;
    modelUsed?: string;
    latencyMs?: number;
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface StandardApiError {
  success: false;
  error: {
    code: string;
    message: string;
    category:
      | 'AUTHENTICATION_ERROR'
      | 'AUTHORIZATION_ERROR'
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'BILLING_ERROR'
      | 'AI_ORCHESTRATION_ERROR'
      | 'INTERNAL_ERROR'
      | 'RATE_LIMIT_ERROR';
    details?: unknown;
    retryable: boolean;
  };
}

export type ApiResponse<T = unknown> = StandardApiResponse<T> | StandardApiError;

export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BUSINESS_DETAILS_CAPTURED'
  | 'AI_PROCESSING'
  | 'BUSINESS_BRAIN_REVIEW'
  | 'APPROVED'
  | 'COMPLETED';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  isSuperAdmin?: boolean;
}

export interface UserEntity {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  accountStatus: 'active' | 'suspended' | 'pending';
  emailVerified: boolean;
  activeWorkspaceId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  preferences?: Record<string, unknown>;
  onboardingStatus?: OnboardingStatus;
  passwordHash?: string;
  emailVerificationToken?: string;
  emailVerificationTokenExpiresAt?: string;
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: string;
}

export interface OnboardingSessionEntity {
  sessionId: string;
  userId: string;
  workspaceId?: string;
  currentStage: 1 | 2 | 3;
  currentStep: number;
  status: OnboardingStatus;
  data: {
    businessType?: string;
    customBusinessType?: string;
    businessName?: string;
    website?: string;
    country?: string;
    region?: string;
    city?: string;
    targetMarket?: string;
    primaryPriorities?: string[];
    objectiveDetails?: string;
    targetAudienceType?: string;
    isB2B?: boolean;
    customerPainPoints?: string[];
    demographics?: string;
    offeringsSummary?: string;
    products?: Array<{ name: string; price?: number; description?: string }>;
    services?: Array<{ name: string; price?: number; description?: string }>;
    pricingModel?: string;
    differentiators?: string[];
    customDifferentiator?: string;
    businessStage?: string;
    onlineChannels?: {
      website?: string;
      instagram?: string;
      facebook?: string;
      linkedin?: string;
      youtube?: string;
      other?: string;
    };
    adaptiveResponses?: Record<string, string | string[]>;
    uploadedDocumentIds?: string[];
  };
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BusinessBrainVersionEntity {
  versionId: string;
  workspaceId: string;
  versionNumber: number;
  profileSnapshot: BusinessProfileEntity;
  changeSummary: string;
  changedBy: string;
  createdAt: string;
}

export interface WorkspaceEntity {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceType: 'individual' | 'startup' | 'enterprise';
  ownerUserId: string;
  industry: string;
  country: string;
  timezone: string;
  currency: string;
  planId: 'starter' | 'growth' | 'scale';
  workspaceStatus: 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberEntity {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  membershipStatus: 'active' | 'invited' | 'revoked';
  invitedBy?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FactProvenanceItem {
  fieldKey: string;
  source: 'USER_CONFIRMED' | 'AI_INFERRED' | 'DERIVED_FROM_DOC' | 'SYSTEM_DEFAULT';
  confidence: number;
  verifiedAt?: string;
  lastConfirmedBy?: string;
  notes?: string;
}

export interface StrategicAngleUsage {
  id: string;
  angle: string;
  theme: string;
  usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign';
  lastUsedAt: string;
  frequency: number;
}

export interface BusinessProfileEntity {
  workspaceId: string;
  businessName: string;
  tagline: string;
  stage: 'Idea Stage' | 'Pre-Launch' | 'Early Traction' | 'Growing Business' | 'Established';
  location: string;
  website: string;
  foundedYear: string;
  overviewSummary: string;
  targetAudience: string;
  brandPositioning: string;
  valueProposition: string;
  businessModel: string;
  revenueModel: string;
  productsAndServices?: Array<{
    id: string;
    name: string;
    category: string;
    priceRange: string;
    description: string;
    marginEstimate: string;
  }>;
  customerPersonas?: Array<{
    id: string;
    name: string;
    segment: string;
    ageOrFirmographics: string;
    painPoints: string[];
    buyingTriggers: string[];
    willingnessToPay: string;
  }>;
  primaryGoals: string[];
  brandPersonality?: string[];
  brandVoice?: string[];
  marketingRestrictions?: string[];
  provenance: Record<string, FactProvenanceItem>;
  strategicMemory: {
    usedAngles: StrategicAngleUsage[];
    fatiguedThemes: string[];
    explicitExclusions: string[];
    lastUpdated: string;
  };
  approvalStatus?: 'DRAFT' | 'APPROVED';
  approvedAt?: string;
  intelligence?: {
    summary: string;
    strengths: string[];
    informationGaps: string[];
    assumptions: string[];
    confidence: Record<string, number>;
  };
  digitalPresence?: {
    website?: string;
    socialProfiles?: Array<{ platform: string; url: string }>;
    otherChannels?: string[];
  };
  lastUpdated: string;
  version: number;
}

export interface BusinessGoalEntity {
  goalId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  status: 'on_track' | 'needs_attention' | 'critical' | 'achieved';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorEntity {
  competitorId: string;
  workspaceId: string;
  name: string;
  website: string;
  industry: string;
  location: string;
  positioning: string;
  marketShare: string;
  strengths: string[];
  weaknesses: string[];
  pricingRange: string;
  monitoringFrequency: 'Weekly' | 'Monthly' | 'Quarterly';
  isMonitored: boolean;
  lastResearched: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchReportEntity {
  reportId: string;
  workspaceId: string;
  title: string;
  subtitle: string;
  reportType: 'TAM_SAM_SOM' | 'COMPETITIVE_TEARDOWN' | 'MARKET_SCAN' | 'PLAYBOOK';
  depth: 'Quick Scan' | 'Full Dossier' | 'Deep Dive';
  executiveSummary: string;
  tamValue?: string;
  samValue?: string;
  somValue?: string;
  tamBillion?: number;
  samSharePct?: number;
  somSharePct?: number;
  cagr?: string;
  growthDrivers?: string[];
  assumptions?: Array<{
    id: string;
    name: string;
    value: number;
    unit: string;
    description: string;
  }>;
  isSavedToBrain: boolean;
  status: 'completed' | 'generating' | 'failed';
  sourceReferences?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationEntity {
  recommendationId: string;
  workspaceId: string;
  title: string;
  description: string;
  department: string;
  impact: 'High' | 'Medium' | 'Low';
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  reasoning: string;
  relatedGoalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthExperimentEntity {
  experimentId: string;
  workspaceId: string;
  title: string;
  hypothesis: string;
  department: string;
  status: 'idea' | 'running' | 'completed' | 'abandoned';
  budget?: string;
  startDate: string;
  endDate: string;
  results?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthTaskEntity {
  taskId: string;
  workspaceId: string;
  title: string;
  description: string;
  assignedUserId?: string;
  relatedGoalId?: string;
  relatedExperimentId?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAssetEntity {
  assetId: string;
  workspaceId: string;
  name: string;
  category: 'Logos' | 'Colors' | 'Typography' | 'Social' | 'Collateral';
  assetType: 'svg' | 'png' | 'pdf' | 'json';
  storagePath: string;
  fileSize: number;
  mimeType: string;
  svgContent?: string;
  generationMetadata?: Record<string, unknown>;
  version: number;
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationEntity {
  integrationId: string;
  workspaceId: string;
  provider: 'google_search_console' | 'meta_ads' | 'tavily' | 'analytics';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt?: string;
  accountReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEntity {
  subscriptionId: string;
  workspaceId: string;
  planId: 'starter' | 'growth' | 'scale';
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  monthlyQuota: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditWalletEntity {
  workspaceId: string;
  balance: number;
  reserved: number;
  monthlyQuota: number;
  quotaRenewalDate: string;
  lifetimeGranted: number;
  lifetimeConsumed: number;
  updatedAt: string;
}

export interface CreditReservationEntity {
  reservationId: string;
  workspaceId: string;
  userId: string;
  featureId: string;
  amount: number;
  idempotencyKey: string;
  status: 'HOLD' | 'COMMITTED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
}

export interface CreditTransactionEntity {
  txId: string;
  workspaceId: string;
  userId?: string;
  type: 'GRANT' | 'RESERVATION_HOLD' | 'SETTLEMENT' | 'REFUND' | 'ADMIN_ADJUST';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  featureId: string;
  idempotencyKey?: string;
  notes: string;
  createdAt: string;
}

export interface AiJobEntity {
  jobId: string;
  workspaceId: string;
  userId: string;
  jobType: 'dossier' | 'playbook' | 'recommendations' | 'brand-asset' | 'social-creative';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  modelUsed?: string;
  reservationId?: string;
  creditsConsumed: number;
  inputPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuditLogEntity {
  logId: string;
  workspaceId?: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

// =============================================================================
// PHASE 7: LOGICAL ENTITIES FOR CONNECTED DEPARTMENTS
// =============================================================================

export interface ProductEntity {
  productId: string;
  workspaceId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  benefits: string[];
  targetCustomer: string;
  imageUrl?: string;
  status: 'active' | 'draft' | 'archived';
  differentiation: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEntity {
  serviceId: string;
  workspaceId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  pricingModel: string;
  duration?: string;
  deliveryLocation?: string;
  targetCustomer: string;
  benefits: string[];
  imageUrl?: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AudienceSegmentEntity {
  segmentId: string;
  workspaceId: string;
  name: string;
  type: 'B2B' | 'B2C';
  needs: string[];
  painPoints: string[];
  buyingMotivations: string[];
  geography: string;
  demographics?: Record<string, unknown>;
  behavior?: string[];
  decisionFactors?: string[];
  objections?: string[];
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandIdentityEntity {
  brandIdentityId: string;
  workspaceId: string;
  version: number;
  brandName: string;
  tagline: string;
  mission: string;
  vision: string;
  personality: string[];
  voice: string[];
  tone: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    background: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  visualDirection: string;
  logoDirection: string;
  guidelinesText?: string;
  approvalStatus: 'DRAFT' | 'APPROVED';
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketTopicEntity {
  topicId: string;
  workspaceId: string;
  industry: string;
  category: string;
  geography: string;
  keywords: string[];
  competitorNames: string[];
  topicsOfInterest: string[];
  monitoringFrequency: 'Daily' | 'Weekly' | 'Monthly';
  monitoringStatus: 'active' | 'paused';
  lastMonitoredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketFindingEntity {
  findingId: string;
  workspaceId: string;
  topicId?: string;
  headline: string;
  publisher: string;
  sourceUrl: string;
  publicationDate: string;
  retrievedAt: string;
  topic: string;
  geography: string;
  summary: string;
  evidence: string;
  relevanceScore: number;
  dedupHash: string;
  category: 'News' | 'Trend' | 'Regulatory' | 'Competitor' | 'Opportunity';
  suggestedAction?: string;
  isRead: boolean;
  isArchived: boolean;
  convertedToTaskId?: string;
  convertedToExperimentId?: string;
  createdAt: string;
}

export interface CompetitorSnapshotEntity {
  snapshotId: string;
  competitorId: string;
  workspaceId: string;
  sourceUrl: string;
  capturedAt: string;
  offerings: Array<{ name: string; price?: string }>;
  pricingSummary: string;
  positioning: string;
  changesDetected?: Array<{
    type: 'PRICE_CHANGE' | 'NEW_PRODUCT' | 'PROMOTION' | 'POSITIONING_SHIFT';
    description: string;
    previousValue?: string;
    currentValue: string;
    confidence: number;
  }>;
  createdAt: string;
}

export interface KpiDefinitionEntity {
  kpiId: string;
  workspaceId: string;
  name: string;
  category: 'acquisition' | 'revenue' | 'retention' | 'efficiency' | 'brand';
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  measurementFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  sourceType:
    'USER_ENTERED' | 'CONNECTED_PLATFORM' | 'WORKSPACE_ACTIVITY' | 'EXTERNAL_API' | 'AI_ESTIMATE';
  status: 'on_track' | 'needs_attention' | 'critical' | 'achieved';
  createdAt: string;
  updatedAt: string;
}

export interface KpiObservationEntity {
  observationId: string;
  kpiId: string;
  workspaceId: string;
  value: number;
  period: string;
  sourceType:
    'USER_ENTERED' | 'CONNECTED_PLATFORM' | 'WORKSPACE_ACTIVITY' | 'EXTERNAL_API' | 'AI_ESTIMATE';
  recordedAt: string;
  notes?: string;
}

export interface ExecutiveReportEntity {
  reportId: string;
  workspaceId: string;
  reportType:
    'WEEKLY_INTELLIGENCE' | 'MONTHLY_GROWTH' | 'MARKETING_PERFORMANCE' | 'COMPETITIVE_AUDIT';
  title: string;
  period: string;
  executiveSummary: string;
  businessUpdates: string[];
  marketDevelopments: string[];
  competitorChanges: string[];
  activeExperiments: Array<{ title: string; status: string; outcome?: string }>;
  taskProgress: { completed: number; pending: number; overdue: number };
  goalProgress: Array<{ title: string; current: number; target: number; unit: string }>;
  recommendedActions: string[];
  businessBrainVersion: number;
  sourceReferences: string[];
  createdAt: string;
}
