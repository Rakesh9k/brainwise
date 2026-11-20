/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BRAINWISE — CORE AI INTELLIGENCE ENGINE (PHASE 6)
 * Master Data Contracts and Type Definitions
 */

export type AiDepartment =
  | 'MARKET_INTELLIGENCE'
  | 'COMPETITOR_INTELLIGENCE'
  | 'BUSINESS_STRATEGY'
  | 'CUSTOMER_INTELLIGENCE'
  | 'MARKETING_INTELLIGENCE'
  | 'PERFORMANCE_INTELLIGENCE'
  | 'IDEA_INTELLIGENCE'
  | 'BRAND_STUDIO';

export type ClaimClassification =
  | 'VERIFIED_FACT'
  | 'BUSINESS_FACT'
  | 'AI_ANALYSIS'
  | 'ESTIMATE'
  | 'ASSUMPTION'
  | 'RECOMMENDATION'
  | 'UNKNOWN';

export type SourceType =
  | 'PRIMARY'
  | 'OFFICIAL_COMPANY'
  | 'GOVERNMENT'
  | 'INDUSTRY_REPORT'
  | 'REPUTABLE_PUBLICATION'
  | 'COMMUNITY'
  | 'UNVERIFIED';

export type VerificationStatus = 'SUPPORTED' | 'CONTRADICTED' | 'UNSUPPORTED' | 'STALE';

export type ExecutionRiskCategory = 'LOW' | 'MEDIUM' | 'HIGH';

export type AiRequestStatus =
  | 'QUEUED'
  | 'CLASSIFYING'
  | 'RETRIEVING_CONTEXT'
  | 'RESEARCHING'
  | 'SELECTING_TOOLS'
  | 'EXECUTING_MODEL'
  | 'VALIDATING'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MemoryCategory =
  'APPROVED_BUSINESS_FACT' | 'CONVERSATION' | 'DECISION' | 'EXECUTION' | 'LEARNED_PREFERENCE';

export interface AiSource {
  sourceId: string;
  requestId: string;
  workspaceId: string;
  url: string;
  title: string;
  domain: string;
  sourceType: SourceType;
  retrievedAt: string;
  publishedAt?: string;
  evidenceExcerpt: string;
  relevanceScore: number;
  verificationStatus: VerificationStatus;
}

export interface AiClaim {
  id: string;
  claim: string;
  classification: ClaimClassification;
  sourceIds?: string[];
  verificationStatus: VerificationStatus;
  confidenceScore?: number;
  notes?: string;
}

export interface ConfidenceMetadata {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  score?: number | null;
  explanation: string;
}

export interface ValidationIssue {
  layer: 'STRUCTURAL' | 'BUSINESS_CONTEXT' | 'EVIDENCE' | 'LOGICAL' | 'SAFETY';
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  status: 'PASSED' | 'WARNINGS' | 'FAILED';
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface StrategicRecommendationItem {
  id: string;
  recommendation: string;
  whyItMatters: string;
  supportingEvidence: string;
  expectedOutcome: string;
  estimatedEffort: 'Low' | 'Medium' | 'High';
  estimatedCost: string;
  risks: string[];
  dependencies: string[];
  suggestedNextSteps: string[];
  measurementCriteria: string;
}

export interface StructuredAiOutput {
  requestId: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'FAILED';
  department: AiDepartment;
  workflow: string;
  summary: string;
  result: Record<string, unknown>;
  findings: string[];
  verifiedFacts: string[];
  analysis: string[];
  estimates: string[];
  assumptions: string[];
  recommendations: StrategicRecommendationItem[];
  missingInformation: string[];
  claims: AiClaim[];
  sources: AiSource[];
  confidence: ConfidenceMetadata;
  validation: ValidationResult;
  metadata: {
    model: string;
    modelProvider: string;
    promptVersion: string;
    contextVersion: string;
    executionDurationMs: number;
    tokensIn?: number;
    tokensOut?: number;
    providerCostUsd?: number;
    creditsDeducted: number;
    createdAt: string;
  };
}

export interface AiWorkflowRequest {
  requestId?: string;
  workspaceId: string;
  userId: string;
  department: AiDepartment;
  workflow: string;
  taskType?: string;
  userPrompt: string;
  conversationId?: string;
  parameters?: Record<string, unknown>;
  requestedOutputFormat?: 'json' | 'markdown' | 'summary';
  idempotencyKey?: string;
}

export interface AiRequestEntity {
  requestId: string;
  workspaceId: string;
  userId: string;
  department: AiDepartment;
  workflow: string;
  taskType: string;
  status: AiRequestStatus;
  idempotencyKey?: string;
  userPrompt: string;
  riskCategory: ExecutionRiskCategory;
  requiresApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface AiExecutionEntity {
  executionId: string;
  requestId: string;
  workspaceId: string;
  provider: string;
  model: string;
  promptVersion: string;
  contextVersion: string;
  inputTokens: number;
  outputTokens: number;
  providerCostUsd: number;
  executionDurationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'FALLBACK';
  errorCode?: string;
  createdAt: string;
}

export interface AiResultEntity {
  resultId: string;
  requestId: string;
  workspaceId: string;
  resultType: string;
  structuredResult: StructuredAiOutput;
  validationStatus: ValidationResult['status'];
  createdAt: string;
  version: number;
}

export interface AiMemoryEntity {
  memoryId: string;
  workspaceId: string;
  category: MemoryCategory;
  content: string;
  source: string;
  confidence: number;
  approvalStatus: 'APPROVED' | 'UNCONFIRMED' | 'REJECTED';
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolDefinition {
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requiredPermissions: string[];
  riskCategory: ExecutionRiskCategory;
  requiresApproval: boolean;
  timeoutMs: number;
  maxRetries: number;
  isIdempotent: boolean;
  execute: (input: any, context: ToolExecutionContext) => Promise<any>;
}

export interface ToolExecutionContext {
  workspaceId: string;
  userId: string;
  requestId: string;
  riskCategory: ExecutionRiskCategory;
}

export interface AiToolExecutionEntity {
  toolExecutionId: string;
  requestId: string;
  workspaceId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  approvedBy?: string;
  executedAt: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface AiProviderRequest {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface AiProviderResponse {
  text: string;
  structuredJson?: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface AiProvider {
  name: string;
  generate(req: AiProviderRequest): Promise<AiProviderResponse>;
  generateStructured<T = Record<string, unknown>>(
    req: AiProviderRequest
  ): Promise<{ data: T; usage: AiProviderResponse }>;
  countTokens(text: string): Promise<number>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; details?: string }>;
}

export interface ModelRoutingConfig {
  taskComplexity: 'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'RESEARCH_HEAVY';
  preferredModel: string;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  estimatedCredits: number;
}
