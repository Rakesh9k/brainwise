/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AskBusinessIntent =
  | 'BUSINESS_OVERVIEW'
  | 'PRODUCT_INTELLIGENCE'
  | 'CUSTOMER_INTELLIGENCE'
  | 'BRAND_INTELLIGENCE'
  | 'MARKETING_INTELLIGENCE'
  | 'STRATEGY_PERFORMANCE'
  | 'OPERATIONAL_FINANCIAL'
  | 'GENERAL_QUERY'
  | 'UNSUPPORTED_NON_BUSINESS';

export type FactProvenanceTier =
  'VERIFIED_FACT' | 'CALCULATED_VALUE' | 'HISTORICAL_INFO' | 'AI_INFERRED' | 'UNKNOWN';

export interface AskBusinessEvidenceItem {
  sourceType:
    | 'PROFILE'
    | 'PRODUCT'
    | 'SERVICE'
    | 'GOAL'
    | 'COMPETITOR'
    | 'AUDIENCE_SEGMENT'
    | 'CAMPAIGN'
    | 'DOCUMENT'
    | 'MEMORY'
    | 'ANALYTICS';
  sourceId: string;
  sourceDocument?: string;
  title: string;
  content: string;
  factStatus: FactProvenanceTier;
  recordDate?: string;
  confidence: number;
  calculationMethod?: string;
  isOutdated?: boolean;
}

export interface AskBusinessCitation {
  sourceType: string;
  sourceId: string;
  title: string;
  recordDate?: string;
  factStatus: FactProvenanceTier;
  confidence: number;
  calculationMethod?: string;
  isOutdated?: boolean;
  snippet?: string;
}

export interface AskBusinessToolCall {
  toolId: string;
  toolName:
    | 'compare_products'
    | 'analyze_goals'
    | 'analyze_campaign_performance'
    | 'create_internal_task'
    | 'update_business_profile'
    | 'generate_executive_report';
  parameters: Record<string, any>;
  requiresApproval: boolean;
  status: 'PENDING_APPROVAL' | 'EXECUTED' | 'REJECTED';
  result?: any;
  approvalReason?: string;
}

export interface AskBusinessMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: AskBusinessIntent;
  factStatusBreakdown?: Record<FactProvenanceTier, number>;
  citations: AskBusinessCitation[];
  conflictingInformation?: string[];
  missingInformation?: string[];
  suggestedFollowUps: string[];
  toolCalls?: AskBusinessToolCall[];
  modelUsed?: string;
  feedback?: {
    rating: 'positive' | 'negative';
    note?: string;
    submittedAt: string;
  };
  createdAt: string;
}

export interface AskBusinessConversation {
  conversationId: string;
  workspaceId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageSnippet?: string;
}

export interface AskBusinessQueryRequest {
  query: string;
  conversationId?: string;
  modelTier?: 'fast' | 'search_grounded' | 'deep_reasoning';
}

export interface AskBusinessQueryResponse {
  conversationId: string;
  message: AskBusinessMessage;
  creditsDeducted: number;
  creditBalanceRemaining?: number;
}

export interface ExecuteToolRequest {
  toolId: string;
  toolName: string;
  parameters: Record<string, any>;
  confirmed: boolean;
}

export interface SubmitFeedbackRequest {
  rating: 'positive' | 'negative';
  note?: string;
}
