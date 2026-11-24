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
  userId?: string;
  email: string;
  displayName?: string;
  isSuperAdmin?: boolean;
}

export type StandardDepartmentType =
  | 'STRATEGY'
  | 'MARKETING'
  | 'RESEARCH'
  | 'CREATIVE'
  | 'SALES'
  | 'FINANCE'
  | 'ANALYTICS'
  | 'CUSTOMER_SUCCESS';

export type AgentType =
  | 'STRATEGY_AGENT'
  | 'RESEARCH_AGENT'
  | 'IDEA_AGENT'
  | 'CREATIVE_AGENT'
  | 'CAMPAIGN_AGENT'
  | 'OPERATIONS_AGENT'
  | 'PUBLISHING_AGENT';

export type ToolRiskLevel =
  | 'LEVEL_1_READ_ONLY'
  | 'LEVEL_2_REVERSIBLE_INTERNAL'
  | 'LEVEL_3_EXTERNAL_OR_FINANCIAL'
  | 'LEVEL_3_EXTERNAL_CONSEQUENTIAL';

export interface AgentToolDefinition {
  toolId: string;
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  permittedAgents: AgentType[];
  requiredRoles: WorkspaceRole[];
  requiresTruthCheck?: boolean;
  creditCost?: number;
  maxTimeoutMs?: number;
}

export interface KnowledgeSourceCitation {
  sourceId: string;
  sourceType: string;
  title: string;
  confidence: number;
  verifiedAt?: string;
}

export interface StrategicRecommendation {
  strategyId: string;
  workspaceId: string;
  title: string;
  objective: string;
  reason: string;
  supportingEvidence: KnowledgeSourceCitation[];
  requiredActions: Array<{
    action: string;
    sequence: number;
    estimatedEffortDays: number;
    responsibleDepartment: string;
  }>;
  responsibleDepartment: string;
  expectedOutcome: string;
  budgetEstimate: number | 'UNKNOWN';
  budgetCurrency: string;
  requiredResources: string[];
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  dependencies?: string[];
  kpis?: Array<{ metric: string; target: string; baseline: string }>;
  measurementPeriod?: string;
  status?: 'pending' | 'proposed' | 'accepted' | 'approved' | 'rejected' | 'in_progress' | 'deferred';
  approvedBy?: string;
  approvedAt?: string;
  rationale?: string;
  userFeedback?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
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
  email?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FactProvenanceItem {
  fieldKey?: string;
  source: 'USER_CONFIRMED' | 'AI_INFERRED' | 'DERIVED_FROM_DOC' | 'SYSTEM_DEFAULT';
  confidence: number;
  verifiedAt?: string;
  verifiedBy?: string;
  lastConfirmedBy?: string;
  documentId?: string;
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
  displayName?: string;
  industry?: string;
  country?: string;
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
  resourcesAndConstraints?: BusinessResourcesAndConstraints;
  lastUpdated: string;
  version: number;
}

export interface VerificationItemEntity {
  itemId: string;
  jobId?: string;
  workspaceId?: string;
  domain?: 'identity' | 'products' | 'services' | 'audience' | 'brand' | 'goals' | 'resources';
  fieldKey?: string;
  fieldName?: string;
  fieldCategory?: string;
  proposedValue?: unknown;
  suggestedValue?: unknown;
  currentValue?: unknown;
  confidence: number;
  sourceDocument?: string;
  source?: string;
  provenance?: 'USER_CONFIRMED' | 'AI_INFERRED' | 'MARKET_DATA' | 'THIRD_PARTY' | string;
  requiresUserApproval?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  userEditedValue?: unknown;
  verifiedBy?: string;
  verifiedAt?: string;
  suggestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessResourcesAndConstraints {
  monthlyMarketingBudget?: number;
  maxMonthlyBudget?: number;
  marketingBudget?: number | { monthly?: number; currency?: string };
  operatingCapacity?: string | number;
  currency?: string;
  headcount?: number;
  teamBandwidthHoursPerWeek?: number;
  keySkillsPresent?: string[];
  missingSkillsGaps?: string[];
  geographicBoundaries?: string[];
  complianceRequirements?: string[];
  brandRestrictedWords?: string[];
  competitorExclusions?: string[];
  unsupportedProductCategories?: string[];
  lastUpdated?: string;
}

export type DepartmentTaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type DepartmentTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'WAITING_APPROVAL';

export interface StandardDepartmentTaskEntity {
  taskId: string;
  workspaceId: string;
  businessId?: string;
  department: string;
  title?: string;
  description?: string;
  objective?: string;
  priority: DepartmentTaskPriority;
  status: DepartmentTaskStatus;
  assignedUserId?: string;
  dueDate?: string;
  dependencies?: string[];
  permissionRequirements?: string[];
  approvalRequirements?: {
    required?: boolean;
    approved?: boolean;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    rejected?: boolean;
  };
  retryCount?: number;
  maxRetries?: number;
  errors?: string[];
  result?: any;
  regroundingRequired?: boolean;
  regroundingReason?: string;
  regroundingFields?: string[];
  regroundedAt?: string;
  idempotencyKey?: string;
  auditHistory?: Array<{
    timestamp: string;
    action: string;
    actor?: string;
    actorId?: string;
    details?: any;
  }>;
  inputContext?: Record<string, unknown>;
  requestedAction?: string;
  requiredOutputSchema?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDocumentEntity {
  documentId: string;
  workspaceId: string;
  name: string;
  fileName?: string;
  type: 'PDF' | 'DOCX' | 'TXT' | 'CSV' | 'URL' | 'IMAGE' | 'OTHER' | string;
  sizeBytes: number;
  mimeType: string;
  sourceUrl?: string;
  storagePath?: string;
  status: 'uploaded' | 'processing' | 'processed' | 'extracted' | 'failed';
  rawText?: string;
  extractedData?: Record<string, unknown>;
  extractedSummary?: string;
  confidenceScore?: number;
  detectedDomainCount?: number;
  usedByAI: boolean;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface MissingInfoQuestion {
  id: string;
  domain: string;
  question: string;
  importance: 'critical' | 'high' | 'recommended';
  options?: string[];
}

export interface ExtractionJobEntity {
  jobId: string;
  workspaceId: string;
  documentId?: string;
  sourceType: string;
  sourceName?: string;
  sourceUrl?: string;
  confidenceScore?: number;
  extractedData?: any;
  missingInfoQuestions?: MissingInfoQuestion[];
  duplicateDetections?: any[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'pending' | 'processing' | 'completed' | 'failed';
  itemsExtractedCount?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type DiscrepancyDomain =
  | 'IDENTITY'
  | 'PRODUCTS'
  | 'SERVICES'
  | 'AUDIENCE'
  | 'BRAND'
  | 'FINANCIAL'
  | 'OPERATIONAL'
  | 'pricing'
  | 'positioning'
  | 'audience'
  | 'value_proposition'
  | 'identity';
export type DiscrepancySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiscrepancySourceEntry {
  documentId?: string;
  documentName?: string;
  sourceDocument?: string;
  value: any;
  extractedAt: string;
  confidence: number;
}

export interface MultiDocDiscrepancyItem {
  discrepancyId?: string;
  fieldKey: string;
  fieldName?: string;
  domain: string;
  severity?: DiscrepancySeverity;
  currentBrainValue?: unknown;
  recommendedValue?: unknown;
  recommendedSource?: string;
  recommendationRationale?: string;
  sources?: DiscrepancySourceEntry[];
  conflictingSources?: Array<{
    documentId: string;
    documentName: string;
    value: string;
    extractedAt: string;
    confidence: number;
  }>;
  status?: 'UNRESOLVED' | 'RESOLVED' | 'RESOLVED_KEPT_BRAIN' | 'RESOLVED_ACCEPTED_DOC' | 'RESOLVED_CUSTOM';
  resolutionStatus?: 'UNRESOLVED' | 'RESOLVED_BY_USER' | 'PREFER_RECENT';
  resolvedValue?: unknown;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface MultiDocDiscrepancyMatrix {
  workspaceId: string;
  totalDiscrepancies: number;
  unresolvedCount: number;
  items: MultiDocDiscrepancyItem[];
  generatedAt: string;
}

export interface BusinessGoalEntity {
  goalId: string;
  workspaceId: string;
  title?: string;
  description?: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  status: 'on_track' | 'needs_attention' | 'critical' | 'achieved';
  createdBy: string;
  ownerUserId?: string;
  parentGoalId?: string;
  targetMetrics?: any;
  baselineMetrics?: any;
  deadline?: string;
  progressPercentage?: number;
  dependencies?: any[];
  departmentAlignment?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorEntity {
  competitorId: string;
  workspaceId: string;
  name: string;
  category?: string;
  threatLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
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
  depth: 'Quick Scan' | 'Full Dossier' | 'Deep Dive' | 'Rapid Pulse' | 'Standard Validation' | 'Deep Market Dossier';
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
  dossierData?: any;
  conversationalHistory?: Array<any>;
  finalizationBlueprint?: any;
  ideaUnderstanding?: Record<string, unknown>;
  structuredOpportunities?: any;
  emergingPlayers?: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationEntity {
  recommendationId: string;
  workspaceId: string;
  title?: string;
  description?: string;
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
  title?: string;
  description?: string;
  assignedUserId?: string;
  relatedGoalId?: string;
  relatedExperimentId?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt?: string;
  notes?: string;
  estimatedMinutes?: number;
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
  creditBalance?: number;
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
  workflowId?: string;
  taskId?: string;
  agent?: string;
  toolId?: string;
  riskLevel?: string;
  authorized?: boolean;
  inputPayloadSummary?: string;
  outputSummary?: string;
  executionTimeMs?: number;
  costIncurred?: number;
  actorUserId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export type AgentAuditLogEntity = AuditLogEntity;

// =============================================================================
// PHASE 7: LOGICAL ENTITIES FOR CONNECTED DEPARTMENTS
// =============================================================================

export interface ProductEntity {
  productId: string;
  workspaceId: string;
  name: string;
  sku?: string;
  cost?: number;
  costPrice?: number;
  margin?: number;
  marginEstimate?: string;
  pricingStructure?: string;
  availability?: string;
  category: string;
  subcategory?: string;
  description: string;
  price: number;
  currency?: string;
  variants?: Array<{ variantId?: string; name: string; sku?: string; size?: string; flavor?: string; color?: string; price?: number }>;
  features?: string[];
  benefits?: string[];
  targetCustomer?: string;
  imageUrl?: string;
  status: 'active' | 'draft' | 'archived';
  source?: string;
  differentiation?: string;
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
  currency?: string;
  pricingModel?: string;
  duration?: string;
  deliveryLocation?: string;
  availability?: string;
  targetCustomer?: string;
  benefits?: string[];
  imageUrl?: string;
  status: 'active' | 'draft' | 'archived';
  source?: string;
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
    scale?: string;
  };
  logoUrls?: Record<string, string>;
  preferredLanguage?: string;
  wordsToUse?: string[];
  wordsToAvoid?: string[];
  approvedClaims?: string[];
  restrictedClaims?: string[];
  uniqueSellingProposition?: string;
  visualDirection?: string;
  logoDirection?: string;
  guidelinesText?: string;
  approvalStatus?: 'DRAFT' | 'APPROVED';
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

// =============================================================================
// PHASE 2/3 UNIFIED INTELLIGENCE, REASONING & KNOWLEDGE GRAPH DOMAIN ENTITIES
// =============================================================================

export * from '../../types/growthRadar';
export * from '../../types/continuousLearning';
import type { InsightCategory, StructuredBusinessInsight } from '../../types/continuousLearning';

export type GraphRelationshipType =
  | 'TARGETS'
  | 'COMPETES_WITH'
  | 'DERIVED_FROM'
  | 'SUPPORTS'
  | 'CONSTRAINS'
  | 'PART_OF'
  | 'ALIGNED_WITH'
  | string;

export type GraphNodeType =
  | 'PRODUCT'
  | 'SERVICE'
  | 'AUDIENCE_SEGMENT'
  | 'COMPETITOR'
  | 'BRAND_IDENTITY'
  | 'GOAL'
  | 'DOCUMENT'
  | string;

export interface GraphNodeRef {
  id: string;
  type: GraphNodeType;
  name?: string;
}

export interface KnowledgeGraphEdgeEntity {
  edgeId: string;
  workspaceId: string;
  source: GraphNodeRef;
  relationshipType: GraphRelationshipType;
  target: GraphNodeRef;
  confidence?: number;
  provenance?: 'USER_CONFIRMED' | 'DERIVED_FROM_DOC' | 'AI_INFERRED';
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED' | 'INFERRED' | 'UNKNOWN';
  verifiedAt?: string;
  verifiedBy?: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedKnowledgeItem {
  id: string;
  type: string;
  title: string;
  content: string;
  relevanceScore: number;
  freshnessScore: number;
  combinedScore: number;
  sourceCitation: KnowledgeSourceCitation & {
    documentId?: string;
    excerpt?: string;
  };
  verificationStatus: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  relationships?: Array<{ relation: string; targetName: string; targetType: string }>;
}

export interface WorkingMemoryEntity {
  sessionId: string;
  workspaceId: string;
  userId: string;
  currentTask?: string;
  activeWorkflow?: string;
  department?: string;
  conversationContext?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  temporaryDecisions?: Array<{
    id: string;
    decision: string;
    rationale?: string;
    comments?: string;
    createdAt?: string;
  }>;
  pendingApprovals?: Array<{
    id: string;
    action: string;
    details: unknown;
    createdAt?: string;
  }>;
  scratchpad?: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodicMemoryEntity {
  episodeId: string;
  workspaceId: string;
  department: string;
  activityType: 'CAMPAIGN' | 'EXPERIMENT' | 'DECISION' | 'ANALYSIS' | string;
  title: string;
  summary: string;
  learnings: string[];
  outcomes?: Record<string, unknown>;
  tags?: string[];
  relatedNodeIds?: string[];
  userAttribution?: string;
  createdAt: string;
}

export interface StrategicMemoryItemEntity {
  itemId: string;
  workspaceId: string;
  type: 'OBJECTIVE' | 'PRIORITY' | 'POSITIONING_PIVOT' | 'EXCLUSION' | 'CONSTRAINT' | string;
  title?: string;
  description?: string;
  rationale?: string;
  status: 'active' | 'archived' | 'superseded';
  supersededBy?: string;
  confidence: number;
  verificationStatus: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  verifiedBy?: string;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionRecordEntity {
  decisionId: string;
  workspaceId: string;
  title: string;
  decision?: string;
  decisionDate: string;
  responsibleDepartment: string;
  relatedStrategyId?: string;
  supportingEvidence?: unknown[];
  alternativesConsidered?: Array<{ alternative: string; reasonRejected: string }>;
  expectedResult?: string;
  userApproval: {
    status: 'approved' | 'rejected' | 'deferred';
    approvedBy?: string;
    approvedAt?: string;
    rationale?: string;
    comments?: string;
  };
  details?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type FactProvenanceTier =
  | 'VERIFIED_FACT'
  | 'CALCULATED_VALUE'
  | 'HISTORICAL_INFO'
  | 'AI_INFERRED'
  | 'UNKNOWN';

export type AskBusinessIntent =
  | 'FACT_RETRIEVAL'
  | 'CALCULATION'
  | 'HISTORICAL_QUERY'
  | 'STRATEGIC_ADVICE'
  | 'GENERAL_QUERY'
  | 'COMPETITOR_ANALYSIS'
  | 'CROSS_DEPARTMENT'
  | string;

export interface AskBusinessEvidenceItem {
  id?: string;
  source?: string;
  sourceId?: string;
  sourceType?: string;
  sourceDocument?: string;
  title?: string;
  category?: string;
  content: string;
  confidence: number;
  provenance?: FactProvenanceTier;
  factStatus?: string;
  recordDate?: string;
  isOutdated?: boolean;
  calculationMethod?: string;
  timestamp?: string;
  verifiedAt?: string;
}

export interface AskBusinessCitation {
  id?: string;
  sourceName?: string;
  sourceType?: string;
  sourceId?: string;
  title?: string;
  recordDate?: string;
  factStatus?: FactProvenanceTier | string;
  confidence: number;
  extractedQuote?: string;
  snippet?: string;
  deepLink?: string;
  isOutdated?: boolean;
  calculationMethod?: string;
  verifiedAt?: string;
}

export interface AskBusinessToolCall {
  toolId: string;
  name?: string;
  toolName?: string;
  parameters: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalReason?: string;
  status?: string;
  result?: unknown;
}

export interface AskBusinessMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: AskBusinessIntent;
  factStatusBreakdown?: Record<FactProvenanceTier, number>;
  citations: AskBusinessCitation[];
  conflictingInformation?: string[];
  missingInformation?: string[];
  suggestedFollowUps: string[];
  toolCalls?: AskBusinessToolCall[];
  modelUsed?: string;
  feedback?: { rating: string; note?: string; submittedAt?: string };
  createdAt: string;
}

export interface AskBusinessConversation {
  conversationId: string;
  workspaceId: string;
  userId?: string;
  title: string;
  messageCount?: number;
  lastMessageSnippet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AskBusinessQueryRequest {
  query: string;
  conversationId?: string;
  modelTier?: 'standard' | 'deep_reasoning' | 'fast' | 'search_grounded';
}

export interface AskBusinessQueryResponse {
  conversationId: string;
  message: AskBusinessMessage;
  creditsDeducted: number;
  creditBalanceRemaining?: number;
}

export interface ExecuteToolRequest {
  toolId: string;
  toolName?: string;
  parameters: Record<string, unknown>;
  confirmed?: boolean;
}

export interface SubmitFeedbackRequest {
  messageId?: string;
  rating: 'positive' | 'negative';
  feedbackText?: string;
  note?: string;
}

export interface AssembledBusinessContext {
  workspaceId: string;
  taskType: string;
  businessSummary: string;
  companyName?: string;
  industry?: string;
  targetAudienceSummary?: string;
  valueProposition?: string;
  profileSummary?: { businessName?: string };
  relevantProducts: Array<{
    id: string;
    name: string;
    category?: string;
    price?: number;
    currency?: string;
    description?: string;
    pricingStructure?: string;
    features?: string[];
    benefits?: string[];
  }>;
  relevantAudiences: Array<{
    name?: string;
    title?: string;
    demographics?: string;
    painPoints?: string[];
    buyingMotivations?: string[];
    objections?: string[];
  }>;
  brandDirectives: {
    voice: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
    approvedClaims: string[];
    restrictedClaims: string[];
  };
  activeGoals: Array<{ title: string; id?: string }>;
  relevantConstraints: string[];
  recentEpisodes: Array<{
    title: string;
    summary: string;
    learnings: string[];
  }>;
  workingMemorySnapshot?: {
    currentTask?: string;
    pendingApprovals?: Array<{ id: string; action: string; details: unknown }>;
  };
  citations: KnowledgeSourceCitation[];
  tokenCount: number;
  tokenBudget: number;
  freshness: 'FRESH' | 'CACHED';
  cachedAt?: string;
}

export interface DepartmentContextResponse {
  workspaceId: string;
  department: string;
  businessIdentity: {
    name: string;
    stage: string;
    tagline?: string;
    positioning?: string;
    category?: string;
    location?: string;
    overviewSummary?: string;
  };
  relevantProducts: Array<{
    id: string;
    name: string;
    category?: string;
    price?: number;
    currency?: string;
    description?: string;
    features?: string[];
    benefits?: string[];
    unitCost?: number | 'UNKNOWN';
    marginPercent?: number | 'UNKNOWN';
  }>;
  targetAudiences: Array<{
    name?: string;
    demographics?: string;
    painPoints?: string[];
    buyingMotivations?: string[];
    objections?: string[];
  }>;
  brandDirectives: {
    voice: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
    approvedClaims: string[];
    restrictedClaims: string[];
    visualStyle?: {
      primaryColor?: string;
      secondaryColor?: string;
      fontFamily?: string;
      svgOnly: boolean;
    };
  };
  businessObjectives: Array<{
    id?: string;
    title: string;
    targetMetric?: string;
    targetValue?: number | string;
    status?: string;
  }>;
  applicableConstraints: string[];
  historicalEpisodes: Array<{
    title: string;
    summary: string;
    learnings: string[];
  }>;
  pastPerformance: {
    benchmarks?: Record<string, unknown>;
    experimentsRun?: number;
    recentOutcomes?: string[];
  };
  supportingEvidence: Array<{
    sourceId: string;
    sourceType: string;
    title: string;
    confidence: number;
    verifiedAt?: string;
  }>;
  tokenBudgetRemaining?: number;
  tokenCount?: number;
  tokenBudget?: number;
  dataRedactions?: string[];
  departmentSlice?: any;
  dataFreshness?: 'REAL_TIME' | 'CACHED_HOURLY' | 'STATIC_BASELINE' | string;
  freshness?: 'FRESH' | 'CACHED' | 'REAL_TIME' | 'CACHED_HOURLY' | 'STATIC_BASELINE' | string;
  confidenceScore?: number;
  contextAssemblyTimestamp?: string;
}

export interface BusinessHealthDimension {
  dimension: string;
  score: number;
  status: 'strong' | 'moderate' | 'needs_improvement' | 'critical';
  findings: string[];
  missingData?: string[];
  evidence: KnowledgeSourceCitation[];
}

export interface BusinessGap {
  gapId: string;
  category: 'operational_constraint' | 'missing_data' | 'misaligned_goal' | 'revenue' | 'capability' | string;
  description: string;
  impactSeverity: 'critical' | 'high' | 'medium' | 'low';
  connectedGoalId?: string;
  recommendedRemediation: string;
  isAssumption: boolean;
}

export interface BusinessHealthReport {
  workspaceId: string;
  overallScore: number;
  maturityStage: 'nascent' | 'developing' | 'scaling' | 'established';
  dimensions: BusinessHealthDimension[];
  identifiedGaps: BusinessGap[];
  criticalRisks: string[];
  evaluatedAt: string;
}

export interface SwotItem {
  id: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  statement: string;
  detail: string;
  evidence?: KnowledgeSourceCitation[];
  isAssumption: boolean;
  confidence: number;
  importance: 'high' | 'medium' | 'low';
}

export interface SwotAnalysisReport {
  workspaceId: string;
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  generatedAt: string;
  contradictionsDetected?: string[];
}

export interface RootCauseInvestigation {
  investigationId?: string;
  issueId?: string;
  symptom: string;
  fiveWhys?: Array<{ level: number; question: string; answer: string; evidenceCitation?: string }>;
  hypotheses?: Array<{
    cause: string;
    likelihood: 'confirmed' | 'probable' | 'possible' | string;
    isCorrelationOnly: boolean;
    evidenceNotes?: string;
    evidence?: any[];
  }>;
  rootCause?: string;
  identifiedRootCause?: string;
  correctiveActions?: string[];
  recommendedInvestigationSteps?: string[];
  requiresMoreData?: boolean;
}

export interface ScoredOpportunity {
  opportunityId: string;
  title?: string;
  description?: string;
  targetDepartment: string;
  rawFactors: {
    businessImpact: number;
    strategicAlignment: number;
    evidenceConfidence: number;
    feasibility: number;
    costEfficiency: number;
  };
  factorContributions: {
    businessImpact: number;
    strategicAlignment: number;
    evidenceConfidence: number;
    feasibility: number;
    costEfficiency: number;
  };
  compositeScore: number;
  priorityTier: 'high_priority' | 'medium_priority' | 'low_priority' | 'rejected' | 'deferred';
  disclaimer: string;
  supportingEvidence: KnowledgeSourceCitation[];
}

export interface ScenarioBand {
  caseType: 'best_case' | 'expected_case' | 'downside';
  projectedRevenueRange: { min: number; max: number; midpoint: number };
  projectedCustomerGrowth: { min: number; max: number };
  estimatedCost: number;
  netMarginEstimatePercent: number;
  keyAssumptions: string[];
  operationalBottlenecks: string[];
}

export interface ScenarioSimulationRequest {
  workspaceId: string;
  scenarioType: string;
  parameters?: Record<string, unknown>;
}

export interface ScenarioSimulationResult {
  scenarioType: string;
  title?: string;
  description?: string;
  baseline: {
    monthlyBudget: number | 'UNKNOWN';
    activeProductCount: number;
    targetMarket: string;
  };
  scenarios: {
    bestCase: ScenarioBand;
    expectedCase: ScenarioBand;
    downside: ScenarioBand;
  };
  disclaimer: string;
  simulatedAt: string;
}

export type WorkflowStatus =
  | 'PENDING'
  | 'INITIALIZING'
  | 'RUNNING'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_APPROVAL'
  | 'WAITING_FOR_INFO'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export interface WorkflowTaskNode {
  taskId: string;
  title?: string;
  description?: string;
  department: StandardDepartmentType | string;
  assignedAgent: AgentType | string;
  riskLevel: ToolRiskLevel | string;
  dependencies: string[];
  status: 'PENDING' | 'RUNNING' | 'IN_PROGRESS' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED' | 'READY';
  requiresApproval: boolean;
  approvalRequestId?: string;
  costEstimate: number;
  costActual?: number;
  retryCount?: number;
  maxRetries?: number;
  error?: string;
  errorMessage?: string;
  result?: unknown;
  outputResult?: any;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

export interface BusinessWorkflowEntity {
  workflowId: string;
  workspaceId: string;
  name?: string;
  status: WorkflowStatus;
  objective?: string;
  tasks: WorkflowTaskNode[];
  progressPercentage: number;
  totalCostEstimate?: number;
  totalCostActual?: number;
  budgetLimit?: number;
  deadlineDays?: number;
  missingInfoNeeded?: string[];
  missingInfoResponses?: Record<string, string>;
  finalOutcomeSummary?: string;
  currency?: string;
  idempotencyKey?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandCenterSummaryResponse {
  activeObjectives: Array<{ id: string; name: string; status: string; progress: number }>;
  activeWorkflows: BusinessWorkflowEntity[];
  pendingApprovals: ApprovalRequestEntity[];
  departmentAssignments: Record<string, number>;
  taskStats: { completed: number; running: number; failed: number; pendingApproval: number };
  costs: { totalEstimated: number; totalActual: number; currency: string };
  recentAuditLogs: any[];
  nextRecommendedAction: string;
}

export interface ApprovalRequestEntity {
  requestId: string;
  workspaceId: string;
  workflowId: string;
  taskId: string;
  actionTitle: string;
  actionDescription: string;
  department: StandardDepartmentType | string;
  agent: AgentType | string;
  riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL' | 'LEVEL_3_EXTERNAL_OR_FINANCIAL' | string;
  consequentialDetails: {
    externalTarget?: string;
    financialCostEstimate?: number;
    budgetImpact?: number;
    currency?: string;
    targetChannel?: string;
    contentPreview?: string;
    irreversibleEffects?: string[];
    detailsPayload?: Record<string, unknown>;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decisionNote?: string;
  decisionReason?: string;
  decidedAt?: string;
  createdAt: string;
}

export type BusinessMetricType =
  | 'REVENUE'
  | 'ACQUISITION'
  | 'ENGAGEMENT'
  | 'RETENTION'
  | 'EFFICIENCY'
  | 'BRAND'
  | string;

export type MetricAttributionModel =
  | 'FIRST_TOUCH'
  | 'LAST_TOUCH'
  | 'LINEAR'
  | 'TIME_DECAY'
  | 'POSITION_BASED'
  | 'DATA_DRIVEN'
  | 'UNATTRIBUTED'
  | string;

export interface BusinessMetricEventEntity {
  metricId: string;
  workspaceId: string;
  source: string;
  metricType: BusinessMetricType;
  metricName: string;
  value: number;
  currency?: string;
  definition: string;
  channel?: string;
  campaignId?: string;
  attributionModel?: MetricAttributionModel;
  isAttributed?: boolean;
  sampleSize?: number;
  measurementPeriod: { startDate: string; endDate: string };
  timestamp: string;
  idempotencyKey?: string;
  confidence?: number;
  createdAt: string;
}

export interface CampaignExperimentResultEntity {
  experimentId: string;
  workspaceId: string;
  campaignName: string;
  name?: string;
  objective?: string;
  businessObjective?: string;
  hypothesis: string;
  targetAudience?: string;
  strategy?: string;
  channel: string;
  contentReference?: string;
  budget: number;
  cost: number;
  spend?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  executionDate?: string;
  successCriteria?: string;
  baselineMetrics?: Record<string, number>;
  dataSources?: string[];
  idempotencyKey?: string;
  results?: Record<string, any>;
  calculatedMetrics?: Record<string, any>;
  conversionMetrics?: Record<string, any>;
  conversions?: number;
  ctr?: number;
  cpa?: number;
  attributionConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string | number;
  confidenceScore?: number;
  sampleSizeAdequate?: boolean;
  connectedGoalId?: string;
  finalAssessment?: 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'MIXED' | string;
  actualOutcomes?: Record<string, any>;
  outcome?: 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'MIXED' | string;
  statisticalConfidence?: number;
  lessonsLearned?: string[];
  storedInEpisodicMemory?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ConfidenceBand = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPECTED' | 'STALE';
export type PatternInsightCategory = InsightCategory;
export type LearnedPatternEntity = StructuredBusinessInsight;

export interface ProactiveInsightEntity {
  insightId: string;
  workspaceId: string;
  triggerType: string;
  title?: string;
  description?: string;
  reason: string;
  evidence: KnowledgeSourceCitation[];
  sources: string[];
  confidence: number;
  confidenceBand: 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  businessImpact: string;
  suggestedAction: string;
  relevantDepartment: string;
  status: 'ACTIVE' | 'DISMISSED' | 'CONVERTED_TO_RECOMMENDATION' | 'EXPIRED';
  expirationDate: string;
  dismissalMetadata?: {
    dismissedAt: string;
    dismissedBy?: string;
    reason?: string;
    suppressUntilMaterialChange?: boolean;
    baselineMetricValueAtDismissal?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationActionPayload {
  action: 'ACCEPT' | 'REJECT' | 'EDIT' | 'DEFER' | 'ASSIGN' | 'EXECUTE' | 'MARK_COMPLETE';
  actorId?: string;
  rejectionReason?: string;
  userFeedback?: string;
  editedFields?: Record<string, unknown>;
  deferredUntil?: string;
  assignedTo?: string;
}

export interface ScheduledIntelligenceReportEntity {
  reportId: string;
  workspaceId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  reportType: 'BUSINESS_SUMMARY' | 'WEEKLY_REVIEW' | 'MONTHLY_GROWTH' | string;
  summary: string;
  keyFindings: string[];
  activeAnomalies: any[];
  topOpportunities: any[];
  goalProgressSummary: Record<string, any>;
  channel: 'IN_APP' | 'EMAIL';
  notificationDispatched: boolean;
  generatedAt: string;
}
