/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IntegrationCategory =
  'research' | 'website_seo' | 'local_business' | 'social_media' | 'communication' | 'storage_docs';

export type IntegrationStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'action_required'
  | 'permission_expired'
  | 'connection_error'
  | 'awaiting_approval'
  | 'disconnected';

export type ProviderAuthType = 'oauth2' | 'api_key' | 'service_account' | 'smtp';

export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  authType: ProviderAuthType;
  requiredScopes: string[];
  capabilities: string[];
  icon: string;
  docsUrl: string;
  isApprovalRequired: boolean;
  approvalStatus?: 'approved' | 'awaiting_approval' | 'developer_preview';
}

export interface ExternalAccountInfo {
  accountId: string;
  accountName: string;
  email?: string;
  avatarUrl?: string;
  organizationName?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalResource {
  resourceId: string;
  name: string;
  type: string;
  url?: string;
  metadata?: Record<string, unknown>;
  selected?: boolean;
}

export interface EncryptedPayload {
  iv: string; // 12-byte hex
  tag: string; // 16-byte hex
  ciphertext: string; // hex
  keyId: string;
  algorithm: 'aes-256-gcm';
}

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string; // ISO string
  tokenType?: string;
  scopes?: string[];
  extra?: Record<string, unknown>;
}

export interface ConnectionInitResult {
  connectionId: string;
  authUrl?: string;
  state?: string;
  instructions?: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scopes?: string[];
  extra?: Record<string, unknown>;
}

export interface PermissionValidationResult {
  valid: boolean;
  grantedScopes: string[];
  missingScopes: string[];
  error?: string;
}

export interface IntegrationHealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastCheckedAt: string;
  status: IntegrationStatus;
  message?: string;
  error?: string;
}

export interface FetchDataOptions {
  startDate?: string;
  endDate?: string;
  resourceId?: string;
  category?: string;
  limit?: number;
  incrementalSince?: string;
  params?: Record<string, unknown>;
}

export interface NormalizedDataRecord {
  recordId: string;
  workspaceId: string;
  integrationId: string;
  provider: string;
  externalResourceId?: string;
  category: string;
  retrievedAt: string;
  sourceTimestamp?: string;
  sourceReference: string;
  syncJobId: string;
  dataVersion: number;
  provenance: {
    sourceType: string;
    verified: boolean;
    confidenceScore: number;
  };
  metrics: Record<string, number>;
  dimensions: Record<string, string>;
  rawPayload?: Record<string, unknown>;
}

export interface ExternalDataPackage {
  records: NormalizedDataRecord[];
  summary: Record<string, unknown>;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ExternalActionRequest {
  actionType: string;
  category: 'A_READ_ONLY' | 'B_INTERNAL' | 'C_EXTERNAL_WRITE';
  targetResource: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ExternalActionResult {
  success: boolean;
  actionId: string;
  resultData?: Record<string, unknown>;
  externalReferenceId?: string;
  error?: string;
}

export interface IIntegrationProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;

  initializeConnection(
    workspaceId: string,
    config?: Record<string, unknown>
  ): Promise<ConnectionInitResult>;
  generateAuthUrl?(workspaceId: string, redirectUri: string, state: string): Promise<string>;
  handleOAuthCallback?(
    workspaceId: string,
    code: string,
    state: string,
    redirectUri: string
  ): Promise<OAuthTokenResult>;
  refreshAccessToken?(workspaceId: string, refreshToken: string): Promise<OAuthTokenResult>;
  getAccountInfo(credentials: IntegrationCredentials): Promise<ExternalAccountInfo>;
  getResources(credentials: IntegrationCredentials): Promise<ExternalResource[]>;
  fetchData(
    credentials: IntegrationCredentials,
    options: FetchDataOptions
  ): Promise<ExternalDataPackage>;
  executeAction?(
    credentials: IntegrationCredentials,
    action: ExternalActionRequest
  ): Promise<ExternalActionResult>;
  validatePermissions(credentials: IntegrationCredentials): Promise<PermissionValidationResult>;
  disconnect(workspaceId: string, credentials?: IntegrationCredentials): Promise<void>;
  revokeCredentials?(credentials: IntegrationCredentials): Promise<void>;
  checkHealth(credentials: IntegrationCredentials): Promise<IntegrationHealthStatus>;
}

export interface IntegrationConnectionEntity {
  [key: string]: unknown;
  integrationId: string;
  workspaceId: string;
  provider: string;
  name: string;
  status: IntegrationStatus;
  category: IntegrationCategory;
  accountReference?: string;
  accountInfo?: ExternalAccountInfo;
  selectedResources?: ExternalResource[];
  grantedScopes?: string[];
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastSyncError?: string;
  syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
  healthStatus?: IntegrationHealthStatus;
  createdAt: string;
  updatedAt: string;
}
