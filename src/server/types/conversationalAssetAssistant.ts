/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssetCategory, AssetSection, UnifiedBrandAssetEntity } from './assetLibrary';
import type { WorkspaceRole } from './api';

// =============================================================================
// 1. EXPLAINABILITY & PROVENANCE CLASSIFICATIONS
// =============================================================================

export interface AssistantExplainabilityBlock {
  facts: string[]; // Authoritative verified facts from Business Brain
  extractedContent: string[]; // OCR or text extracted from visual collateral
  assumptions: string[]; // Probabilistic inferences or heuristic observations
  suggestions: string[]; // Recommended user actions or creative next steps
}

// =============================================================================
// 2. CONFIRMATION & SAFETY PREVIEW SCHEMAS
// =============================================================================

export type SensitiveActionType =
  | 'BULK_ARCHIVE'
  | 'PERMANENT_DELETE'
  | 'REPLACE_APPROVED'
  | 'UPDATE_BRAND_IDENTITY'
  | 'BULK_METADATA_UPDATE';

export interface ActionAssetPreviewItem {
  assetId: string;
  name: string;
  section: AssetSection;
  category: AssetCategory;
  status: string;
  isApproved: boolean;
  activeCampaignCount?: number;
}

export interface ActionConfirmationRequest {
  confirmationToken: string;
  actionType: SensitiveActionType;
  actionPayload: Record<string, unknown>;
  affectedAssets: ActionAssetPreviewItem[];
  summary: string;
  warningLevel: 'warning' | 'critical';
  requiredRole: WorkspaceRole[];
  expiresAt: string;
}

// =============================================================================
// 3. CONVERSATION MESSAGES & THREADS
// =============================================================================

export interface AssistantActionExecutionRecord {
  actionType: string;
  success: boolean;
  affectedAssetIds: string[];
  details: string;
  executionTimestamp: string;
  undoable: boolean;
}

export interface AssistantMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  explainability: AssistantExplainabilityBlock;
  groundedIn: {
    businessName?: string;
    productsReferenced?: string[];
    brandIdentityVersion?: number;
    referencedAssetIds?: string[];
  };
  actionExecuted?: AssistantActionExecutionRecord;
  pendingConfirmation?: ActionConfirmationRequest;
  suggestedQuickReplies?: string[];
  referencedAssets?: UnifiedBrandAssetEntity[];
  timestamp: string;
}

export interface AssetIntelligenceConversation {
  conversationId: string;
  workspaceId: string;
  userId: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 4. REQUEST / RESPONSE CONTRACTS
// =============================================================================

export interface ConversationalAssetQueryRequest {
  workspaceId: string;
  userId: string;
  userRole?: WorkspaceRole;
  conversationId?: string;
  query?: string;
  context?: {
    currentSection?: AssetSection;
    selectedAssetIds?: string[];
  };
  confirmationToken?: string;
}

export interface ConversationalAssetQueryResponse {
  conversationId: string;
  message: AssistantMessage;
  referencedAssets: UnifiedBrandAssetEntity[];
  pendingConfirmation?: ActionConfirmationRequest;
  actionExecuted?: AssistantActionExecutionRecord;
}
