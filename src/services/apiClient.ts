/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BrainWiseState,
  BusinessBrainData,
  ResearchReport,
  MarketScenarioPreset,
  StrategyRecommendation,
  CompetitorProfileData,
  GrowthGoal,
  GrowthTask,
  GrowthExperiment,
  BrandAsset,
  IdeaUnderstandingResult,
  FinalizedBusinessBlueprint,
} from '../types/brainwise';
import type {
  BusinessIntelligenceScore,
  IntelligenceScoreHistoryEntry,
  IntelligenceScoreWeights,
} from '../types/intelligenceScore';
import type {
  GrowthRadarOpportunity,
  GrowthRadarSummary,
  OpportunityScoreWeights,
} from '../types/growthRadar';
import type {
  StructuredBusinessInsight,
  LearningStrategyRecommendation,
} from '../types/continuousLearning';
import type {
  BusinessWorkflowEntity,
  ApprovalRequestEntity,
  CommandCenterSummaryResponse,
} from '../types/commandCenter';

export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  getAuthToken?: () => Promise<string | null>;
  activeWorkspaceId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface StandardEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const AUTH_TOKEN_KEY = 'brainwise_auth_token';

/**
 * Retrieves the stored authentication token from sessionStorage or localStorage.
 */
export function getStoredAuthToken(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const s = sessionStorage.getItem(AUTH_TOKEN_KEY);
      if (s) return s;
    }
    if (typeof localStorage !== 'undefined') {
      const l = localStorage.getItem(AUTH_TOKEN_KEY);
      if (l) return l;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the authentication token to sessionStorage and localStorage, or removes it on logout.
 * Also cleans up any legacy keys ('brainwise_token').
 */
export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(AUTH_TOKEN_KEY);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('brainwise_token');
      }
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }
}

/**
 * Standardized BrainWise API Client
 * Centralizes request dispatch, timeout handling, authentication header injection,
 * and typed response validation according to docs/phase-2/07-api-contracts.md.
 */
export class BrainWiseApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private getAuthToken?: () => Promise<string | null>;
  private activeWorkspaceId?: string;
  private currentToken: string | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.timeoutMs = options.timeoutMs ?? 25000;
    this.getAuthToken = options.getAuthToken ?? (async () => getStoredAuthToken());
    this.activeWorkspaceId = options.activeWorkspaceId;
  }

  public setAuthToken(token?: string | null): void {
    this.currentToken = token ?? null;
    setStoredAuthToken(token ?? null);
  }

  public getAuthTokenSync(): string | null {
    return this.currentToken ?? getStoredAuthToken();
  }

  public setActiveWorkspaceId(workspaceId?: string | null): void {
    this.activeWorkspaceId = workspaceId ?? undefined;
  }

  public getActiveWorkspaceId(): string | undefined {
    return this.activeWorkspaceId;
  }

  private async request<TResponse>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    customHeaders: Record<string, string> = {}
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
      };

      let token = this.currentToken;
      if (!token && this.getAuthToken) {
        token = await this.getAuthToken();
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (this.activeWorkspaceId && !headers['X-Workspace-Id']) {
        headers['X-Workspace-Id'] = this.activeWorkspaceId;
      }

      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        const errObj = payload as {
          error?: { message?: string; code?: string; details?: unknown };
        } | null;
        const errorMessage =
          errObj?.error?.message ||
          (typeof (payload as any)?.error === 'string'
            ? (payload as any).error
            : `API request failed with status ${response.status}`);

        const errorCode = errObj?.error?.code || (payload as any)?.code || undefined;

        throw new ApiError(
          errorMessage,
          response.status,
          errorCode,
          errObj?.error?.details || payload
        );
      }

      // Check if wrapped in standard { success: true, data: T } envelope
      if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
        const envelope = payload as StandardEnvelope<TResponse>;
        return envelope.data;
      }

      return payload as TResponse;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiError(
          `Request timeout after ${this.timeoutMs / 1000}s`,
          504,
          'REQUEST_TIMEOUT'
        );
      }
      throw new ApiError(
        err instanceof Error ? err.message : 'Network request failed',
        0,
        'NETWORK_ERROR'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------
  public async getHealth(): Promise<{ ok: boolean; aiConfigured: boolean; model: string }> {
    return this.request('/api/health', 'GET');
  }

  // ---------------------------------------------------------------------------
  // Users & Workspaces
  // ---------------------------------------------------------------------------
  public async getCurrentUser(): Promise<{
    user: any;
    workspaces: any[];
    activeWorkspace: any | null;
  }> {
    return this.request('/api/v1/users/me', 'GET');
  }

  public async updateCurrentUser(patch: {
    displayName?: string;
    preferences?: Record<string, unknown>;
  }): Promise<any> {
    return this.request('/api/v1/users/me', 'PATCH', patch);
  }

  public async getUserWorkspaces(): Promise<{ workspaces: any[]; activeWorkspace: any | null }> {
    return this.request('/api/v1/users/me/workspaces', 'GET');
  }

  public async switchActiveWorkspace(workspaceId: string): Promise<any> {
    const res = await this.request<{ activeWorkspaceId: string; workspace: any }>(
      '/api/v1/users/me/switch-workspace',
      'POST',
      { workspaceId }
    );
    this.activeWorkspaceId = workspaceId;
    return res;
  }

  public async createWorkspace(payload: {
    workspaceName: string;
    industry?: string;
    country?: string;
    timezone?: string;
    currency?: string;
    planId?: string;
  }): Promise<{ workspace: any; profile: any }> {
    return this.request('/api/v1/workspaces', 'POST', payload);
  }

  public async getWorkspace(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}`, 'GET');
  }

  public async updateWorkspace(workspaceId: string, patch: Record<string, unknown>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}`, 'PATCH', patch);
  }

  public async getWorkspaceMembers(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/members`, 'GET');
  }

  public async addWorkspaceMember(
    workspaceId: string,
    payload: { userId?: string; email: string; name?: string; role: string }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/members`, 'POST', payload);
  }

  public async updateWorkspaceMemberRole(
    workspaceId: string,
    memberId: string,
    role: string
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, 'PATCH', { role });
  }

  public async removeWorkspaceMember(workspaceId: string, memberId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, 'DELETE');
  }

  public async createWorkspaceInvite(
    workspaceId: string,
    payload: { email?: string; role?: string }
  ): Promise<{
    inviteToken: string;
    inviteLink: string;
    workspaceId: string;
    workspaceName: string;
    role: string;
    expiresAt: string;
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/invitations`, 'POST', payload);
  }

  public async executeDpdpaErasure(workspaceId: string): Promise<{
    workspaceId: string;
    erasedAt: string;
    status: string;
    purgedCategories: string[];
    retainedCategories: string[];
    legalNotice: string;
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/dpdpa-erasure`, 'DELETE');
  }

  // ---------------------------------------------------------------------------
  // Business Brain
  // ---------------------------------------------------------------------------
  public async getBusinessProfile(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile`, 'GET');
  }

  public async updateBusinessProfile(
    workspaceId: string,
    patch: Partial<BusinessBrainData>
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile`, 'PATCH', patch);
  }

  public async confirmFact(workspaceId: string, fieldKey: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/confirm-fact`, 'POST', {
      fieldKey,
    });
  }

  public async addExclusionRule(workspaceId: string, rule: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/exclusions`, 'POST', {
      rule,
    });
  }

  public async removeExclusionRule(workspaceId: string, rule: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/exclusions`, 'DELETE', {
      rule,
    });
  }

  public async getProfileHistory(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/history`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Goals
  // ---------------------------------------------------------------------------
  public async getGoals(workspaceId: string): Promise<GrowthGoal[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/goals`, 'GET');
  }

  public async createGoal(workspaceId: string, goal: Omit<GrowthGoal, 'id'>): Promise<GrowthGoal> {
    return this.request(`/api/v1/workspaces/${workspaceId}/goals`, 'POST', goal);
  }

  public async updateGoal(
    workspaceId: string,
    goalId: string,
    patch: Partial<GrowthGoal>
  ): Promise<GrowthGoal> {
    return this.request(`/api/v1/workspaces/${workspaceId}/goals/${goalId}`, 'PATCH', patch);
  }

  public async deleteGoal(workspaceId: string, goalId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/goals/${goalId}`, 'DELETE');
  }

  // ---------------------------------------------------------------------------
  // Competitors
  // ---------------------------------------------------------------------------
  public async getCompetitors(workspaceId: string): Promise<CompetitorProfileData[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors`, 'GET');
  }

  public async createCompetitor(
    workspaceId: string,
    competitor: Omit<CompetitorProfileData, 'id'>
  ): Promise<CompetitorProfileData> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors`, 'POST', competitor);
  }

  public async updateCompetitor(
    workspaceId: string,
    competitorId: string,
    patch: Partial<CompetitorProfileData>
  ): Promise<CompetitorProfileData> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/competitors/${competitorId}`,
      'PATCH',
      patch
    );
  }

  public async deleteCompetitor(workspaceId: string, competitorId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/${competitorId}`, 'DELETE');
  }

  // ---------------------------------------------------------------------------
  // Tasks & Experiments
  // ---------------------------------------------------------------------------
  public async getTasks(workspaceId: string): Promise<GrowthTask[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/tasks`, 'GET');
  }

  public async createTask(workspaceId: string, task: Omit<GrowthTask, 'id'>): Promise<GrowthTask> {
    return this.request(`/api/v1/workspaces/${workspaceId}/tasks`, 'POST', task);
  }

  public async updateTask(
    workspaceId: string,
    taskId: string,
    patch: Partial<GrowthTask>
  ): Promise<GrowthTask> {
    return this.request(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`, 'PATCH', patch);
  }

  public async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`, 'DELETE');
  }

  public async getExperiments(workspaceId: string): Promise<GrowthExperiment[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/experiments`, 'GET');
  }

  public async createExperiment(
    workspaceId: string,
    exp: Omit<GrowthExperiment, 'id'>
  ): Promise<GrowthExperiment> {
    return this.request(`/api/v1/workspaces/${workspaceId}/experiments`, 'POST', exp);
  }

  public async updateExperiment(
    workspaceId: string,
    expId: string,
    patch: Partial<GrowthExperiment>
  ): Promise<GrowthExperiment> {
    return this.request(`/api/v1/workspaces/${workspaceId}/experiments/${expId}`, 'PATCH', patch);
  }

  public async deleteExperiment(workspaceId: string, expId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/experiments/${expId}`, 'DELETE');
  }

  // ---------------------------------------------------------------------------
  // Support Tickets
  // ---------------------------------------------------------------------------
  public async createSupportTicket(
    workspaceId: string,
    ticket: { message: string; subject?: string; category?: string }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/support/tickets`, 'POST', ticket);
  }

  public async listSupportTickets(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/support/tickets`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Brand Assets & Storage
  // ---------------------------------------------------------------------------
  public async getBrandAssets(
    workspaceId: string,
    filters?: {
      category?: string;
      section?: string;
      folder?: string;
      status?: string;
      collectionId?: string;
      search?: string;
    } | string
  ): Promise<BrandAsset[]> {
    let q = '';
    if (typeof filters === 'string') {
      q = `?category=${encodeURIComponent(filters)}`;
    } else if (filters) {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.section || filters.folder) params.set('section', filters.section || filters.folder!);
      if (filters.status) params.set('status', filters.status);
      if (filters.collectionId) params.set('collectionId', filters.collectionId);
      if (filters.search) params.set('search', filters.search);
      const str = params.toString();
      if (str) q = `?${str}`;
    }

    const raw = await this.request<any>(`/api/v1/workspaces/${workspaceId}/assets${q}`, 'GET');
    const items = Array.isArray(raw) ? raw : raw?.data || raw?.assets || [];

    // Ensure bidirectional mapping for React 19 UI
    return items.map((a: any): BrandAsset => ({
      id: a.id || a.assetId || `asset-${Date.now()}`,
      title: a.title || a.name || 'Untitled Asset',
      category: a.category || 'Collateral',
      folder: a.folder || a.section || 'Identity',
      format: a.format || `${a.category || 'Collateral'} · ${(a.assetType || 'SVG').toUpperCase()}`,
      createdAt: a.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      status: a.status === 'archived' ? 'Archived' : a.status === 'draft' ? 'Draft' : 'Approved',
      headlineText: a.headlineText || a.name || a.title || '',
      subtext: a.subtext || a.description || '',
      accentHex: a.accentHex || '#FF7417',
      darkVariant: Boolean(a.darkVariant),
      aiGenerated: Boolean(a.aiGenerated || a.aiMetadata?.aiGenerated),
      aiPrompt: a.aiPrompt || a.aiMetadata?.aiPrompt,
      aiModel: a.aiModel || a.aiMetadata?.aiModel,
      svgMarkup: a.svgMarkup || a.svgContent,
      slides: a.slides,
      caption: a.caption,
      hashtags: a.hashtags,
      artDirectionNote: a.artDirectionNote || a.aiMetadata?.artDirectionNote,
    }));
  }

  public async requestSignedUploadUrl(
    workspaceId: string,
    payload: {
      fileName: string;
      mimeType: string;
      fileSizeBytes?: number;
      folder?: string;
    }
  ): Promise<{ uploadUrl: string; storagePath: string; expiresAt: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/upload-url`, 'POST', payload);
  }

  public async completeAssetUpload(
    workspaceId: string,
    assetId: string,
    payload: {
      name: string;
      title?: string;
      category?: string;
      section?: string;
      folder?: string;
      assetType?: string;
      storagePath: string;
      fileSize: number;
      mimeType: string;
      svgContent?: string;
      svgMarkup?: string;
      dimensions?: { width: number; height: number };
      tags?: string[];
      collectionIds?: string[];
      headlineText?: string;
      subtext?: string;
      accentHex?: string;
      darkVariant?: boolean;
      slides?: any[];
      caption?: string;
      hashtags?: string[];
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/${assetId}/complete-upload`,
      'POST',
      payload
    );
  }

  public async getSignedDownloadUrl(
    workspaceId: string,
    assetId: string
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/download-url`, 'GET');
  }

  public async updateBrandAsset(
    workspaceId: string,
    assetId: string,
    patch: Record<string, unknown>
  ): Promise<BrandAsset> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}`, 'PATCH', patch);
  }

  public async archiveBrandAsset(
    workspaceId: string,
    assetId: string
  ): Promise<BrandAsset> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/archive`, 'POST');
  }

  public async restoreBrandAsset(
    workspaceId: string,
    assetId: string,
    section = 'Active'
  ): Promise<BrandAsset> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/restore`, 'POST', { section });
  }

  public async deleteBrandAsset(workspaceId: string, assetId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}`, 'DELETE');
  }

  public async deleteBrandAssetPermanently(workspaceId: string, assetId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/permanent`, 'DELETE');
  }

  public async getAssetVersions(workspaceId: string, assetId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/versions`, 'GET');
  }

  public async restoreAssetVersion(workspaceId: string, assetId: string, versionId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/versions/${versionId}/restore`, 'POST');
  }

  public async getAssetCollections(workspaceId: string, type?: string): Promise<any[]> {
    const q = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/collections${q}`, 'GET');
  }

  public async createAssetCollection(workspaceId: string, payload: Record<string, unknown>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/collections`, 'POST', payload);
  }

  public async addAssetToCollection(
    workspaceId: string,
    assetId: string,
    collectionId: string
  ): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/collections/${collectionId}/assets`, 'POST', { assetId });
  }

  public async removeAssetFromCollection(
    workspaceId: string,
    assetId: string,
    collectionId: string
  ): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/collections/${collectionId}/assets/${assetId}`, 'DELETE');
  }

  public async duplicateBrandAsset(workspaceId: string, assetId: string): Promise<BrandAsset> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}/duplicate`, 'POST');
  }

  public async bulkArchiveBrandAssets(workspaceId: string, assetIds: string[]): Promise<{ archivedCount: number; assetIds: string[] }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/bulk-archive`, 'POST', { assetIds });
  }

  public async bulkRestoreBrandAssets(workspaceId: string, assetIds: string[], targetSection = 'Active'): Promise<{ restoredCount: number; assetIds: string[] }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/bulk-restore`, 'POST', { assetIds, targetSection });
  }

  public async bulkTagBrandAssets(workspaceId: string, assetIds: string[], tagsToAdd: string[], tagsToRemove: string[] = []): Promise<{ updatedCount: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/bulk-tag`, 'POST', { assetIds, tagsToAdd, tagsToRemove });
  }

  public async bulkMoveBrandAssets(workspaceId: string, assetIds: string[], targetSection: string): Promise<{ movedCount: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/bulk-move`, 'POST', { assetIds, targetSection });
  }

  public async bulkDeleteBrandAssets(workspaceId: string, assetIds: string[]): Promise<{ deletedCount: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/bulk-delete`, 'POST', { assetIds });
  }

  public async aiClassifyAsset(
    workspaceId: string,
    payload: { fileName: string; mimeType: string; content?: string }
  ): Promise<{ category: string; section: string; tags: string[]; confidence: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai-classify`, 'POST', payload);
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Products, Services, Audience & Document Extraction
  // ---------------------------------------------------------------------------
  public async getProducts(workspaceId: string, category?: string): Promise<any[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/products${q}`, 'GET');
  }

  public async createProduct(workspaceId: string, product: Record<string, any>): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/products`,
      'POST',
      product
    );
  }

  public async updateProduct(
    workspaceId: string,
    productId: string,
    patch: Record<string, any>
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/products/${productId}`,
      'PATCH',
      patch
    );
  }

  public async deleteProduct(workspaceId: string, productId: string): Promise<void> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/products/${productId}`,
      'DELETE'
    );
  }

  public async bulkCreateProducts(workspaceId: string, products: any[]): Promise<any[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/products/bulk`,
      'POST',
      { products }
    );
  }

  public async getServices(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/services`, 'GET');
  }

  public async createService(workspaceId: string, service: Record<string, any>): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/services`,
      'POST',
      service
    );
  }

  public async getAudienceSegments(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/audience`, 'GET');
  }

  public async createAudienceSegment(
    workspaceId: string,
    segment: Record<string, any>
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/audience`,
      'POST',
      segment
    );
  }

  public async extractDocument(
    workspaceId: string,
    payload: {
      documentName: string;
      documentContent?: string;
      documentType?: string;
      fileBufferBase64?: string;
      mimeType?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/extract-document`,
      'POST',
      payload
    );
  }

  public async extractUrl(workspaceId: string, url: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/extract-url`, 'POST', {
      url,
    });
  }

  public async getBusinessDocuments(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/documents`, 'GET');
  }

  public async getDocument(workspaceId: string, documentId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/documents/${documentId}`,
      'GET'
    );
  }

  public async reprocessDocument(workspaceId: string, documentId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/documents/${documentId}/reprocess`,
      'POST'
    );
  }

  public async deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/documents/${documentId}`,
      'DELETE'
    );
  }

  public async importCatalogue(
    workspaceId: string,
    products: any[],
    updateExisting: boolean = false
  ): Promise<{ created: any[]; updated: any[]; duplicates: any[] }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/products/import`,
      'POST',
      { products, updateExisting }
    );
  }

  public async getVerificationQueue(workspaceId: string, status?: string): Promise<any[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/verification-queue${q}`,
      'GET'
    );
  }

  public async verifyQueueItem(
    workspaceId: string,
    itemId: string,
    payload: { action: 'approve' | 'reject' | 'edit'; editedValue?: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/verification-queue/${itemId}/verify`,
      'POST',
      payload
    );
  }

  public async getResourcesAndConstraints(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/resources-constraints`,
      'GET'
    );
  }

  public async updateResourcesAndConstraints(workspaceId: string, patch: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/resources-constraints`,
      'PATCH',
      patch
    );
  }

  public async getBrandIntelligence(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/brand-intelligence`,
      'GET'
    );
  }

  public async updateBrandIntelligence(workspaceId: string, brandData: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/brand-intelligence`,
      'POST',
      brandData
    );
  }

  public async getMissingInformation(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/missing-info`, 'GET');
  }

  public async getIntelligenceScore(
    workspaceId: string,
    weights?: Partial<IntelligenceScoreWeights>
  ): Promise<BusinessIntelligenceScore> {
    const qs = weights ? `?weights=${encodeURIComponent(JSON.stringify(weights))}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/intelligence-score${qs}`,
      'GET'
    );
  }

  public async recalculateIntelligenceScore(
    workspaceId: string,
    weights?: Partial<IntelligenceScoreWeights>,
    triggerEvent?: string
  ): Promise<BusinessIntelligenceScore> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/intelligence-score/recalculate`,
      'POST',
      { weights, triggerEvent }
    );
  }

  public async getIntelligenceScoreHistory(
    workspaceId: string
  ): Promise<IntelligenceScoreHistoryEntry[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/intelligence-score/history`,
      'GET'
    );
  }

  // ---------------------------------------------------------------------------
  // Business Growth Radar
  // ---------------------------------------------------------------------------
  public async getGrowthRadar(workspaceId: string): Promise<GrowthRadarSummary> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-radar`, 'GET');
  }

  public async triggerGrowthRadarAnalysis(
    workspaceId: string,
    customWeights?: Partial<OpportunityScoreWeights>
  ): Promise<GrowthRadarSummary> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-radar/analyze`, 'POST', {
      customWeights,
    });
  }

  public async getGrowthRadarOpportunity(
    workspaceId: string,
    opportunityId: string
  ): Promise<GrowthRadarOpportunity> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-radar/${opportunityId}`, 'GET');
  }

  public async transitionGrowthRadarOpportunity(
    workspaceId: string,
    opportunityId: string,
    action: string,
    payload: {
      rejectionReason?: string;
      deferredUntil?: string;
      assignedToUserId?: string;
      note?: string;
    } = {}
  ): Promise<GrowthRadarOpportunity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/growth-radar/${opportunityId}/transition`,
      'POST',
      { action, ...payload }
    );
  }

  public async convertOpportunityToTask(
    workspaceId: string,
    opportunityId: string
  ): Promise<{ opportunity: GrowthRadarOpportunity; task: any }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/growth-radar/${opportunityId}/convert-task`,
      'POST'
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Competitor Analysis & Historical Snapshots
  // ---------------------------------------------------------------------------
  public async analyzeCompetitor(workspaceId: string, competitorId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/competitors/${competitorId}/analyze`,
      'POST'
    );
  }

  public async captureCompetitorSnapshot(
    workspaceId: string,
    competitorId: string,
    payload: {
      offerings?: Array<{ name: string; price?: string }>;
      pricingSummary?: string;
      positioning?: string;
      sourceUrl?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/competitors/${competitorId}/snapshot`,
      'POST',
      payload
    );
  }

  public async getCompetitorSnapshots(workspaceId: string, competitorId: string): Promise<any[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/competitors/${competitorId}/snapshots`,
      'GET'
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Market Watch
  // ---------------------------------------------------------------------------
  public async getMarketTopics(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/market-watch/topics`, 'GET');
  }

  public async createMarketTopic(workspaceId: string, topic: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/market-watch/topics`, 'POST', topic);
  }

  public async getMarketFindings(
    workspaceId: string,
    options?: { category?: string; limit?: number }
  ): Promise<any[]> {
    const q = options?.category ? `?category=${encodeURIComponent(options.category)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/market-watch/findings${q}`, 'GET');
  }

  public async createMarketFinding(
    workspaceId: string,
    finding: Record<string, any>
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/market-watch/findings`, 'POST', finding);
  }

  public async runMarketScan(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/market-watch/scan`, 'POST');
  }

  public async convertFindingToExperiment(workspaceId: string, findingId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/findings/${findingId}/convert-to-experiment`,
      'POST'
    );
  }

  public async convertFindingToTask(workspaceId: string, findingId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/findings/${findingId}/convert-to-task`,
      'POST'
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Brand Identity
  // ---------------------------------------------------------------------------
  public async getBrandIdentity(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-identity`, 'GET');
  }

  public async saveBrandIdentity(workspaceId: string, identity: Record<string, any>): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity`,
      'POST',
      identity
    );
  }

  public async getAuthoritativeBrandIdentity(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-identity/authoritative`, 'GET');
  }

  public async saveAuthoritativeBrandIdentity(workspaceId: string, identity: Record<string, any>): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/authoritative`,
      'POST',
      identity
    );
  }

  public async listBrandIdentityVersions(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-identity/versions`, 'GET');
  }

  public async syncBrandWithBusinessBrain(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-identity/sync-brain`, 'POST');
  }

  public async analyzeBrandIdentityImpact(workspaceId: string, proposedChanges: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-identity/impact-analysis`, 'POST', proposedChanges);
  }

  public async evaluateBrandCompliance(workspaceId: string, params: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-guardian/evaluate`, 'POST', params);
  }

  public async getBrandDriftReport(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/brand-guardian/drift-report`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Phase 4: Print & Packaging Intelligence
  // ---------------------------------------------------------------------------
  public async createPackagingAsset(workspaceId: string, payload: Record<string, any>): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging`, 'POST', payload);
  }

  public async listPackagingAssets(workspaceId: string, filter?: Record<string, any>): Promise<any[]> {
    const q = filter ? `?${new URLSearchParams(filter).toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging${q}`, 'GET');
  }

  public async getPackagingAsset(workspaceId: string, assetId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging/${assetId}`, 'GET');
  }

  public async evaluatePrintReadiness(workspaceId: string, assetId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging/${assetId}/readiness`, 'POST');
  }

  public async extractPackagingContentIntelligence(workspaceId: string, assetId: string, rawText?: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging/${assetId}/content-intelligence`, 'POST', { rawText });
  }

  public async advancePackagingWorkflow(
    workspaceId: string,
    assetId: string,
    payload: { targetStatus: string; notes?: string; vendorName?: string }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging/${assetId}/workflow`, 'POST', payload);
  }

  public async checkProductPackagingDrift(
    workspaceId: string,
    productId: string,
    updatedProductData: Record<string, any>
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/packaging/product-sync-check`, 'POST', {
      productId,
      updatedProductData,
    });
  }

  // ---------------------------------------------------------------------------
  // Unified AI Asset Intelligence Engine (Phase 7)
  // ---------------------------------------------------------------------------
  public async analyzeAssetIntelligence(workspaceId: string, assetId: string, bypassCredits = false): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/analyze`, 'POST', { assetId, bypassCredits });
  }

  public async getAssetIntelligence(workspaceId: string, assetId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/intelligence/${assetId}`, 'GET');
  }

  public async applyHumanClassificationOverride(
    workspaceId: string,
    payload: { assetId: string; category?: string; section?: string; productId?: string; tags?: string[] }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/override`, 'POST', payload);
  }

  public async semanticAssetSearch(
    workspaceId: string,
    query: string,
    filters?: { section?: string; category?: string; productId?: string; limit?: number }
  ): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/search`, 'POST', { query, ...filters });
  }

  public async findVisuallySimilarAssets(
    workspaceId: string,
    assetId: string,
    options?: { maxDistance?: number; limit?: number }
  ): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/similarity`, 'POST', { assetId, ...options });
  }

  public async checkAssetDuplicates(
    workspaceId: string,
    payload: { checksumSha256?: string; svgMarkup?: string; originalFileName?: string; excludeAssetId?: string }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/check-duplicate`, 'POST', payload);
  }

  public async recommendAssets(
    workspaceId: string,
    payload: { campaignBrief?: string; productId?: string; targetChannel?: string; businessObjective?: string; limit?: number }
  ): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/recommend`, 'POST', payload);
  }

  public async createAssetAiJob(
    workspaceId: string,
    assetId: string,
    jobType: string,
    idempotencyKey?: string
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/jobs`, 'POST', { assetId, jobType, idempotencyKey });
  }

  public async getAssetAiJob(workspaceId: string, jobId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ai/jobs/${jobId}`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Conversational Asset Intelligence Assistant (Phase 8)
  // ---------------------------------------------------------------------------
  public async chatAssetAssistant(
    workspaceId: string,
    payload: { query: string; conversationId?: string; confirmationToken?: string; context?: any }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/assistant/chat`, 'POST', payload);
  }

  public async confirmAssetAssistantAction(
    workspaceId: string,
    payload: { confirmationToken: string; conversationId?: string }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/assistant/confirm`, 'POST', payload);
  }

  public async listAssetAssistantConversations(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/assistant/conversations`, 'GET');
  }

  public async getAssetAssistantConversation(workspaceId: string, conversationId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/assistant/conversations/${conversationId}`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Phase 9: AssetLibrary Ecosystem Integration Gateway
  // ---------------------------------------------------------------------------
  public async syncAssetProduct(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/sync-product`, 'POST', payload);
  }

  public async ingestBrandStudioAsset(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/brand-studio/ingest`, 'POST', payload);
  }

  public async discoverCampaignAssets(workspaceId: string, params?: Record<string, any>): Promise<any[]> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/campaign/discover${qs}`, 'GET');
  }

  public async bindAssetsToCampaign(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/campaign/bind`, 'POST', payload);
  }

  public async saveCampaignCreative(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/campaign/save-creative`, 'POST', payload);
  }

  public async createAssetDerivative(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/content-studio/derivative`, 'POST', payload);
  }

  public async getCompetitiveCreativeOpportunities(workspaceId: string, params?: Record<string, any>): Promise<any[]> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/competitive/opportunities${qs}`, 'GET');
  }

  public async recordAssetPerformance(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/analytics/performance`, 'POST', payload);
  }

  public async getAssetPerformanceSummary(workspaceId: string, assetId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/analytics/${assetId}/performance`, 'GET');
  }

  public async listTopPerformingAssets(workspaceId: string, params?: { metric?: string; limit?: number }): Promise<any[]> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/ecosystem/analytics/top-performing${qs}`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Growth Experiments Lifecycle & Outcomes
  // ---------------------------------------------------------------------------
  public async completeExperiment(
    workspaceId: string,
    experimentId: string,
    payload: { results?: string; learnings?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/experiments/${experimentId}/complete`,
      'POST',
      payload
    );
  }

  public async analyzeExperiment(
    workspaceId: string,
    experimentId: string,
    payload: {
      actualMetrics?: Record<string, any>;
      analysisSummary?: string;
      learnings?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/experiments/${experimentId}/analyze`,
      'POST',
      payload
    );
  }

  public async generateExperimentTasks(workspaceId: string, experimentId: string): Promise<any[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/experiments/${experimentId}/generate-tasks`,
      'POST'
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 7: Executive Reports & KPI Observations
  // ---------------------------------------------------------------------------
  public async getExecutiveReports(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reports`, 'GET');
  }

  public async generateExecutiveReport(
    workspaceId: string,
    payload?: { reportType?: string; title?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reports/generate`,
      'POST',
      payload || {}
    );
  }

  public async recordGoalObservation(
    workspaceId: string,
    goalId: string,
    payload: {
      value: number;
      period?: string;
      sourceType?: string;
      notes?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/goals/${goalId}/observations`,
      'POST',
      payload
    );
  }

  public async getGoalObservations(workspaceId: string, goalId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/goals/${goalId}/observations`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Subscriptions & Credits
  // ---------------------------------------------------------------------------

  public async getCreditWallet(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/credits`, 'GET');
  }

  public async getCreditTransactions(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/credits/transactions`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Phase 8: External Integrations & Intelligent Automation Engine
  // ---------------------------------------------------------------------------
  public async getIntegrations(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/integrations`, 'GET');
  }

  public async initiateIntegration(
    workspaceId: string,
    providerId: string,
    redirectUri?: string
  ): Promise<{ authUrl?: string; state?: string; connectionId: string; instructions?: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/integrations/initiate`, 'POST', {
      providerId,
      redirectUri,
    });
  }

  public async completeOAuth(
    workspaceId: string,
    payload: { providerId: string; code: string; state: string; redirectUri?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/oauth/callback`,
      'POST',
      payload
    );
  }

  public async connectManagedIntegration(
    workspaceId: string,
    payload: { providerId: string; apiKey?: string; extra?: Record<string, unknown> }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/connect-managed`,
      'POST',
      payload
    );
  }

  public async syncIntegration(workspaceId: string, integrationId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/${integrationId}/sync`,
      'POST'
    );
  }

  public async checkIntegrationHealth(workspaceId: string, integrationId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/${integrationId}/health`,
      'GET'
    );
  }

  public async disconnectIntegration(workspaceId: string, integrationId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/${integrationId}`,
      'DELETE'
    );
  }

  public async toggleIntegration(
    workspaceId: string,
    integrationId: string,
    connect: boolean
  ): Promise<any> {
    if (connect) {
      return this.connectManagedIntegration(workspaceId, { providerId: integrationId });
    } else {
      return this.disconnectIntegration(workspaceId, integrationId);
    }
  }

  public async getIntegrationAuditLogs(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/integrations/audit-logs`, 'GET');
  }

  public async getImportedDataRecords(
    workspaceId: string,
    query?: { category?: string; integrationId?: string }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.category) params.set('category', query.category);
    if (query?.integrationId) params.set('integrationId', query.integrationId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/integrations/data-records${qs}`, 'GET');
  }

  public async getAutomationTemplates(workspaceId: string): Promise<any[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/templates`,
      'GET'
    );
  }

  public async getAutomations(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/integrations/automations/list`, 'GET');
  }

  public async createAutomation(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/create`,
      'POST',
      payload
    );
  }

  public async createAutomationFromTemplate(workspaceId: string, templateId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/from-template`,
      'POST',
      {
        templateId,
      }
    );
  }

  public async updateAutomation(
    workspaceId: string,
    automationId: string,
    updates: any
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/${automationId}`,
      'PATCH',
      updates
    );
  }

  public async triggerAutomation(workspaceId: string, automationId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/${automationId}/trigger`,
      'POST'
    );
  }

  public async getAutomationExecutions(workspaceId: string, automationId: string): Promise<any[]> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/${automationId}/executions`,
      'GET'
    );
  }

  public async approveAutomationExecution(
    workspaceId: string,
    automationId: string,
    executionId: string
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/integrations/automations/${automationId}/executions/${executionId}/approve`,
      'POST'
    );
  }

  // ---------------------------------------------------------------------------
  // Legacy Prototype Migration
  // ---------------------------------------------------------------------------
  public async migrateLegacyState(
    workspaceId: string,
    legacyState: unknown
  ): Promise<{
    workspaceId: string;
    migrated: boolean;
    recordsMigrated: number;
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/migrate`, 'POST', { legacyState });
  }

  // ---------------------------------------------------------------------------
  // AI Operations
  // ---------------------------------------------------------------------------
  public async generateDossier(payload: {
    ideaSummary: string;
    industry: string;
    targetMarket: string;
    geography: string;
    depth: ResearchReport['depth'];
    brain: BusinessBrainData;
  }): Promise<{ report: ResearchReport; model: string }> {
    return this.request('/api/ai/dossier', 'POST', payload);
  }

  public async saveReportScenario(
    workspaceId: string,
    reportId: string,
    scenario: MarketScenarioPreset
  ): Promise<{ success: boolean; scenario: MarketScenarioPreset }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/research/reports/${reportId}/scenarios`,
      'POST',
      scenario
    );
  }

  public async deleteReportScenario(
    workspaceId: string,
    reportId: string,
    scenarioId: string
  ): Promise<{ success: boolean; scenarioId: string }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/research/reports/${reportId}/scenarios/${scenarioId}`,
      'DELETE'
    );
  }

  public async generatePlaybookAngle(payload: {
    category: string;
    title: string;
    defaultPrompt: string;
    question: string;
  }): Promise<{ angle: string; model: string }> {
    return this.request('/api/ai/playbook', 'POST', payload);
  }

  public async generateRecommendations(state: BrainWiseState): Promise<{
    recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
    model: string;
  }> {
    return this.request('/api/ai/recommendations', 'POST', {
      brain: state.brain,
      competitors: state.competitors,
      goals: state.goals,
      tasks: state.tasks,
      aiTonePreference: state.aiTonePreference,
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 6: Central AI Intelligence Engine
  // ---------------------------------------------------------------------------
  public async executeAiWorkflow(
    workspaceId: string,
    payload: {
      department: string;
      workflow: string;
      userPrompt: string;
      parameters?: Record<string, unknown>;
      taskType?: string;
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/requests`, 'POST', payload);
  }

  public async getAiRequest(workspaceId: string, requestId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/requests/${requestId}`, 'GET');
  }

  public async getAiRequestResult(workspaceId: string, requestId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/requests/${requestId}/result`, 'GET');
  }

  public async approveAiRequest(workspaceId: string, requestId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ai/requests/${requestId}/approve`,
      'POST'
    );
  }

  public async retryAiRequest(workspaceId: string, requestId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/requests/${requestId}/retry`, 'POST');
  }

  public async listAiMemories(workspaceId: string, category?: string): Promise<any[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/memories${query}`, 'GET');
  }

  public async createAiMemory(
    workspaceId: string,
    memory: {
      category: string;
      content: string;
      source?: string;
      confidence?: number;
      tags?: string[];
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/memories`, 'POST', memory);
  }

  public async updateAiMemory(
    workspaceId: string,
    memoryId: string,
    patch: { content?: string; approvalStatus?: string; tags?: string[] }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ai/memories/${memoryId}`,
      'PATCH',
      patch
    );
  }

  public async deleteAiMemory(workspaceId: string, memoryId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/memories/${memoryId}`, 'DELETE');
  }

  public async getAiSources(workspaceId: string, requestId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/sources/${requestId}`, 'GET');
  }

  public async getAiUsage(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ai/usage`, 'GET');
  }

  // ---------------------------------------------------------------------------
  // Phase 5: Authentication & Account Management
  // ---------------------------------------------------------------------------
  public async authRegister(payload: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<{ user: any; token: string; verificationCode: string }> {
    return this.request('/api/v1/auth/register', 'POST', payload);
  }

  public async authLogin(payload: { email: string; password: string }): Promise<{
    user: any;
    token: string;
    nextRoute: string;
    activeWorkspaceId?: string;
  }> {
    return this.request('/api/v1/auth/login', 'POST', payload);
  }

  public async authVerifyEmail(payload: {
    email: string;
    code?: string;
    token?: string;
  }): Promise<{ user: any; token: string }> {
    return this.request('/api/v1/auth/verify-email', 'POST', payload);
  }

  public async authResendVerification(
    email: string
  ): Promise<{ sent: boolean; cooldownSeconds: number }> {
    return this.request('/api/v1/auth/resend-verification', 'POST', { email });
  }

  public async authForgotPassword(
    email: string
  ): Promise<{ sent: boolean; message: string; resetToken?: string }> {
    return this.request('/api/v1/auth/forgot-password', 'POST', { email });
  }

  public async authResetPassword(payload: {
    token: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/api/v1/auth/reset-password', 'POST', payload);
  }

  public async authDeleteAccount(): Promise<{ message: string }> {
    return this.request('/api/v1/auth/me/account', 'DELETE');
  }

  // ---------------------------------------------------------------------------
  // Phase 5: Conversational Onboarding State Machine
  // ---------------------------------------------------------------------------
  public async getOnboardingSession(): Promise<any> {
    return this.request('/api/v1/onboarding/session', 'GET');
  }

  public async saveOnboardingAnswer(payload: {
    stage: 1 | 2 | 3;
    step: number;
    answer: Record<string, any>;
    status?: string;
  }): Promise<any> {
    return this.request('/api/v1/onboarding/save-answer', 'POST', payload);
  }

  public async provisionWorkspaceFromOnboarding(): Promise<{
    workspaceId: string;
    isNew: boolean;
  }> {
    return this.request('/api/v1/onboarding/provision-workspace', 'POST');
  }

  public async completeOnboardingSession(): Promise<any> {
    return this.request('/api/v1/onboarding/complete', 'POST');
  }

  // ---------------------------------------------------------------------------
  // Phase 5: AI Business Brain Lifecycle (Generate, Review, Approve, Versioning)
  // ---------------------------------------------------------------------------
  public async generateBusinessBrain(
    workspaceId: string,
    onboardingData: Record<string, any>
  ): Promise<{ profile: any; versionId: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/generate`, 'POST', {
      onboardingData,
    });
  }

  public async approveBusinessBrain(
    workspaceId: string
  ): Promise<{ profile: any; versionId: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/approve`, 'POST');
  }

  public async regenerateBusinessBrain(
    workspaceId: string,
    instructions?: string
  ): Promise<{ profile: any; versionId: string }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/regenerate`, 'POST', {
      instructions,
    });
  }

  public async getBusinessBrainVersions(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/versions`, 'GET');
  }

  public async restoreBusinessBrainVersion(workspaceId: string, versionId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/versions/${versionId}/restore`,
      'POST'
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 9: Commercial Infrastructure (Billing, Subscriptions, Credits, Invoices)
  // ---------------------------------------------------------------------------
  public async getBillingPlans(): Promise<{ plans: any[] }> {
    return this.request('/api/v1/billing/plans', 'GET');
  }

  public async getCreditPacks(): Promise<{ packs: any[] }> {
    return this.request('/api/v1/billing/credit-packs', 'GET');
  }

  public async createCheckoutSession(
    workspaceId: string,
    payload: {
      type: 'subscription' | 'credit_pack';
      planId?: string;
      billingCycle?: 'monthly' | 'annual';
      packId?: string;
      currency?: string;
      customerEmail?: string;
      customerName?: string;
      customerPhone?: string;
      customerGstin?: string;
      returnUrl?: string;
    }
  ): Promise<{
    paymentSessionId: string;
    checkoutUrl: string;
    orderId: string;
    paymentId: string;
    totalAmount: number;
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/checkout`, 'POST', payload);
  }

  public async verifyPayment(
    workspaceId: string,
    orderId: string,
    customerBillingAddress?: string
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/verify`, 'POST', {
      orderId,
      customerBillingAddress,
    });
  }

  public async getBillingOrders(workspaceId: string): Promise<{ orders: any[] }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/orders`, 'GET');
  }

  public async getSubscription(workspaceId: string): Promise<{ subscription: any; plan: any }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/subscription`, 'GET');
  }

  public async upgradeSubscription(
    workspaceId: string,
    newPlanId: string,
    billingCycle?: 'monthly' | 'annual'
  ): Promise<{ subscription: any; proratedCreditsGranted: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/subscription/upgrade`, 'POST', {
      newPlanId,
      billingCycle,
    });
  }

  public async downgradeSubscription(
    workspaceId: string,
    targetPlanId: string
  ): Promise<{ subscription: any }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/billing/subscription/downgrade`,
      'POST',
      {
        targetPlanId,
      }
    );
  }

  public async cancelSubscription(
    workspaceId: string,
    immediately?: boolean,
    reason?: string
  ): Promise<{ subscription: any }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/subscription/cancel`, 'POST', {
      immediately,
      reason,
    });
  }

  public async reactivateSubscription(workspaceId: string): Promise<{ subscription: any }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/billing/subscription/reactivate`,
      'POST'
    );
  }

  public async getCreditAccount(workspaceId: string): Promise<{
    account: any;
    balance: number;
    reserved: number;
    pools: { welcome: number; subscription: number; purchased: number; promotional: number };
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/credits`, 'GET');
  }

  public async getCreditLedger(
    workspaceId: string,
    limit = 50
  ): Promise<{ ledger: any[]; count: number }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/ledger?limit=${limit}`, 'GET');
  }

  public async getInvoices(workspaceId: string): Promise<{ invoices: any[] }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/invoices`, 'GET');
  }

  public async getInvoice(workspaceId: string, invoiceId: string): Promise<{ invoice: any }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/billing/invoices/${invoiceId}`, 'GET');
  }

  public async checkEntitlement(
    workspaceId: string,
    featureKey: string,
    currentUsage = 0
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number | 'unlimited';
    upgradeRequired?: boolean;
    recommendedPlan?: string;
  }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/billing/entitlements/${featureKey}?currentUsage=${currentUsage}`,
      'GET'
    );
  }

  public async sendStrategistChat(payload: {
    workspaceId?: string;
    message: string;
    threadId?: string;
    modelTier?: 'fast' | 'deep_reasoning' | 'search_grounded';
    history?: Array<{ role: 'user' | 'model'; parts: string }>;
  }): Promise<{
    reply: string;
    threadId: string;
    citations: Array<{ title?: string; url?: string; sourceText?: string }>;
    modelUsed: string;
    groundingQueries?: string[];
    meta?: {
      creditsDeducted: number;
      creditBalanceRemaining: number;
    };
  }> {
    const wsId = payload.workspaceId || this.activeWorkspaceId;
    if (!wsId) {
      throw new Error('Workspace ID is required to execute strategist chat.');
    }
    return this.request(`/api/v1/workspaces/${wsId}/ai/chat`, 'POST', {
      message: payload.message,
      threadId: payload.threadId,
      modelTier: payload.modelTier || 'fast',
      history: payload.history || [],
    });
  }

  // ---------------------------------------------------------------------------
  // Feature 3: Ask Your Business — Contextual Conversational Assistant
  // ---------------------------------------------------------------------------
  public async askBusinessQuery(
    workspaceId: string,
    payload: {
      query: string;
      conversationId?: string;
      modelTier?: 'fast' | 'search_grounded' | 'deep_reasoning';
    }
  ): Promise<{
    conversationId: string;
    message: any;
    creditsDeducted: number;
    creditBalanceRemaining?: number;
  }> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ask-business/query`, 'POST', payload);
  }

  public async getAskBusinessConversations(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/ask-business/conversations`, 'GET');
  }

  public async getAskBusinessConversation(
    workspaceId: string,
    conversationId: string
  ): Promise<{ conversation: any; messages: any[] }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ask-business/conversations/${conversationId}`,
      'GET'
    );
  }

  public async executeAskBusinessTool(
    workspaceId: string,
    conversationId: string,
    payload: {
      toolId?: string;
      toolName: string;
      parameters?: Record<string, any>;
      confirmed: boolean;
    }
  ): Promise<{ success: boolean; result: any }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ask-business/conversations/${conversationId}/execute-tool`,
      'POST',
      payload
    );
  }

  public async submitAskBusinessFeedback(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    payload: {
      rating: 'positive' | 'negative';
      note?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ask-business/conversations/${conversationId}/messages/${messageId}/feedback`,
      'POST',
      payload
    );
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Shared Business Context & Knowledge Graph
  // ---------------------------------------------------------------------------
  public async getBusinessContext(
    workspaceId: string,
    params?: {
      taskType?: string;
      sessionId?: string;
      tokenBudget?: number;
      bypassCache?: boolean;
    }
  ): Promise<any> {
    const q = new URLSearchParams();
    if (params?.taskType) q.set('taskType', params.taskType);
    if (params?.sessionId) q.set('sessionId', params.sessionId);
    if (params?.tokenBudget) q.set('tokenBudget', String(params.tokenBudget));
    if (params?.bypassCache) q.set('bypassCache', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/context${qs}`, 'GET');
  }

  public async searchKnowledge(
    workspaceId: string,
    payload: {
      query: string;
      taskType?: string;
      department?: string;
      maxResults?: number;
      tokenBudget?: number;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/knowledge/search`,
      'POST',
      payload
    );
  }

  public async getGraphEdges(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/business-profile/graph/edges`, 'GET');
  }

  public async createGraphEdge(workspaceId: string, edge: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/graph/edges`,
      'POST',
      edge
    );
  }

  public async traverseGraph(
    workspaceId: string,
    startNodeId: string,
    maxDepth: 1 | 2 = 1
  ): Promise<{ nodes: any[]; edges: any[] }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/graph/traverse?startNodeId=${encodeURIComponent(startNodeId)}&maxDepth=${maxDepth}`,
      'GET'
    );
  }

  public async deleteGraphEdge(workspaceId: string, edgeId: string): Promise<{ deleted: boolean }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/graph/edges/${edgeId}`,
      'DELETE'
    );
  }

  public async getBusinessMemory(
    workspaceId: string,
    memoryType: 'working' | 'business' | 'episodic' | 'strategic',
    sessionId?: string
  ): Promise<any> {
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/memory/${memoryType}${qs}`,
      'GET'
    );
  }

  public async recordBusinessMemory(
    workspaceId: string,
    memoryType: 'working' | 'episodic' | 'strategic',
    payload: any
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/memory/${memoryType}`,
      'POST',
      payload
    );
  }

  public async supersedeStrategicMemory(
    workspaceId: string,
    itemId: string,
    payload: any
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/memory/strategic/${itemId}/supersede`,
      'POST',
      payload
    );
  }

  // =============================================================================
  // PHASE 3: BUSINESS REASONING & DECISION INTELLIGENCE
  // =============================================================================

  public async getBusinessHealth(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/health`, 'GET');
  }

  public async getSwotAnalysis(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/swot`, 'GET');
  }

  public async getBusinessGaps(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/gaps`, 'GET');
  }

  public async investigateRootCause(
    workspaceId: string,
    issueDescription: string,
    observedMetric?: string
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/root-cause`, 'POST', {
      issueDescription,
      observedMetric,
    });
  }

  public async getStrategicRecommendations(
    workspaceId: string,
    params?: { department?: string; goalId?: string }
  ): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.department) q.set('department', params.department);
    if (params?.goalId) q.set('goalId', params.goalId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/strategies${qs}`, 'GET');
  }

  public async submitRecommendationDecision(
    workspaceId: string,
    strategyId: string,
    decision: 'accepted' | 'rejected' | 'deferred',
    userFeedback?: string,
    alternativesConsidered?: any[]
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reasoning/strategies/${strategyId}/decision`,
      'POST',
      { decision, userFeedback, alternativesConsidered }
    );
  }

  public async rankOpportunities(
    workspaceId: string,
    opportunities: any[],
    weights?: any
  ): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/opportunities/rank`, 'POST', {
      opportunities,
      weights,
    });
  }

  public async simulateScenario(
    workspaceId: string,
    scenarioType: string,
    parameters?: any
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/scenarios/simulate`, 'POST', {
      scenarioType,
      parameters,
    });
  }

  public async getReasoningGoals(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    if (filters?.department) q.set('department', filters.department);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/goals${qs}`, 'GET');
  }

  public async createReasoningGoal(workspaceId: string, goal: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/goals`, 'POST', goal);
  }

  public async updateReasoningGoal(workspaceId: string, goalId: string, patch: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reasoning/goals/${goalId}`,
      'PATCH',
      patch
    );
  }

  public async deleteReasoningGoal(workspaceId: string, goalId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/goals/${goalId}`, 'DELETE');
  }

  public async getDecisionHistory(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.department) q.set('department', filters.department);
    if (filters?.approvalStatus) q.set('approvalStatus', filters.approvalStatus);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/decisions${qs}`, 'GET');
  }

  public async recordReasoningDecision(workspaceId: string, decision: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/reasoning/decisions`, 'POST', decision);
  }

  // ==========================================
  // Phase 4: Shared Department Intelligence Methods
  // ==========================================

  public async getDepartmentContext(
    workspaceId: string,
    department: string,
    options?: { bypassCache?: boolean; tokenBudget?: number }
  ): Promise<any> {
    const q = new URLSearchParams();
    if (options?.bypassCache) q.set('bypassCache', 'true');
    if (options?.tokenBudget) q.set('tokenBudget', options.tokenBudget.toString());
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/context${qs}`,
      'GET'
    );
  }

  public async submitDepartmentTask(
    workspaceId: string,
    department: string,
    payload: any
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/tasks`,
      'POST',
      payload
    );
  }

  public async getDepartmentTasks(
    workspaceId: string,
    department: string,
    status?: string
  ): Promise<any[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/tasks${q}`,
      'GET'
    );
  }

  public async getDepartmentTask(
    workspaceId: string,
    department: string,
    taskId: string
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/tasks/${taskId}`,
      'GET'
    );
  }

  public async approveDepartmentTask(
    workspaceId: string,
    department: string,
    taskId: string,
    comments?: string
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/tasks/${taskId}/approve`,
      'POST',
      { comments }
    );
  }

  public async rejectDepartmentTask(
    workspaceId: string,
    department: string,
    taskId: string,
    reason: string
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/tasks/${taskId}/reject`,
      'POST',
      { reason }
    );
  }

  public async dispatchDepartmentCoordinationEvent(
    workspaceId: string,
    department: string,
    payload: { targetDepartment: string; eventType: string; payload: Record<string, unknown> }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/departments/${department}/coordination/event`,
      'POST',
      payload
    );
  }

  // ==========================================
  // Phase 5: Continuous Learning & Proactive Intelligence Methods
  // ==========================================

  public async ingestMetric(workspaceId: string, metricPayload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/metrics`,
      'POST',
      metricPayload
    );
  }

  public async getMetrics(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.metricType) q.set('metricType', filters.metricType);
    if (filters?.channel) q.set('channel', filters.channel);
    if (filters?.startDate) q.set('startDate', filters.startDate);
    if (filters?.endDate) q.set('endDate', filters.endDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/metrics${qs}`, 'GET');
  }

  public async ingestCampaignExperiment(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/campaigns`, 'POST', payload);
  }

  public async getCampaignExperiments(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.channel) q.set('channel', filters.channel);
    if (filters?.outcome) q.set('outcome', filters.outcome);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/campaigns${qs}`, 'GET');
  }

  public async analyzePatterns(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/analyze-patterns`, 'POST');
  }

  public async getLearnedPatterns(workspaceId: string, category?: string): Promise<any[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/patterns${q}`, 'GET');
  }

  public async getLearnedInsights(
    workspaceId: string,
    filters?: { category?: string; status?: string; isPermanentRule?: boolean }
  ): Promise<StructuredBusinessInsight[]> {
    const q = new URLSearchParams();
    if (filters?.category) q.set('category', filters.category);
    if (filters?.status) q.set('status', filters.status);
    if (filters?.isPermanentRule !== undefined)
      q.set('isPermanentRule', String(filters.isPermanentRule));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/insights${qs}`, 'GET');
  }

  public async getLearnedInsight(
    workspaceId: string,
    insightId: string
  ): Promise<StructuredBusinessInsight> {
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/insights/${insightId}`, 'GET');
  }

  public async correctLearnedInsight(
    workspaceId: string,
    insightId: string,
    payload: { note: string; newInsightText?: string; newActionableRecommendation?: string }
  ): Promise<StructuredBusinessInsight> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/insights/${insightId}/correct`,
      'PATCH',
      payload
    );
  }

  public async dismissLearnedInsight(
    workspaceId: string,
    insightId: string,
    payload: { reason?: string } = {}
  ): Promise<StructuredBusinessInsight> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/insights/${insightId}/dismiss`,
      'POST',
      payload
    );
  }

  public async promoteLearnedRule(
    workspaceId: string,
    insightId: string
  ): Promise<StructuredBusinessInsight> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/insights/${insightId}/promote-rule`,
      'POST'
    );
  }

  public async generateLearningStrategy(
    workspaceId: string,
    payload: { objective: string; targetAudience?: string; product?: string; budget?: number }
  ): Promise<LearningStrategyRecommendation> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/strategy/recommend`,
      'POST',
      payload
    );
  }

  public async evaluateProactiveTriggers(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/proactive/evaluate`, 'POST');
  }

  public async getProactiveInsights(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    if (filters?.triggerType) q.set('triggerType', filters.triggerType);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/proactive/insights${qs}`,
      'GET'
    );
  }

  public async actOnProactiveInsight(
    workspaceId: string,
    insightId: string,
    actionPayload: any
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/proactive/insights/${insightId}/action`,
      'POST',
      actionPayload
    );
  }

  public async generateScheduledReport(workspaceId: string, payload?: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/learning/scheduled/generate`,
      'POST',
      payload || {}
    );
  }

  public async getScheduledReports(workspaceId: string, filters?: any): Promise<any[]> {
    const q = new URLSearchParams();
    if (filters?.frequency) q.set('frequency', filters.frequency);
    if (filters?.reportType) q.set('reportType', filters.reportType);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/learning/scheduled/reports${qs}`, 'GET');
  }

  // ===========================================================================
  // PHASE 6: AUTONOMOUS BUSINESS OPERATIONS & MULTI-AGENT ORCHESTRATION
  // ===========================================================================

  public async initiateWorkflow(
    workspaceId: string,
    payload: {
      objective: string;
      budgetLimit?: number;
      currency?: string;
      deadlineDays?: number;
      idempotencyKey?: string;
      tasksOverride?: any[];
    }
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows`,
      'POST',
      payload
    );
  }

  public async listWorkflows(
    workspaceId: string,
    status?: string
  ): Promise<BusinessWorkflowEntity[]> {
    const qs = status ? `?status=${status}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/orchestration/workflows${qs}`, 'GET');
  }

  public async getWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}`,
      'GET'
    );
  }

  public async pauseWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}/pause`,
      'POST'
    );
  }

  public async resumeWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}/resume`,
      'POST'
    );
  }

  public async cancelWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}/cancel`,
      'POST'
    );
  }

  public async provideWorkflowMissingInfo(
    workspaceId: string,
    workflowId: string,
    responses: Record<string, string>
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}/provide-info`,
      'POST',
      { responses }
    );
  }

  public async retryWorkflowTask(
    workspaceId: string,
    workflowId: string,
    taskId: string
  ): Promise<BusinessWorkflowEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/workflows/${workflowId}/tasks/${taskId}/retry`,
      'POST'
    );
  }

  public async listApprovals(
    workspaceId: string,
    status?: string
  ): Promise<ApprovalRequestEntity[]> {
    const qs = status ? `?status=${status}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/orchestration/approvals${qs}`, 'GET');
  }

  public async decideApproval(
    workspaceId: string,
    requestId: string,
    payload: { decision: 'APPROVE' | 'REJECT'; reason?: string; userRole?: string }
  ): Promise<ApprovalRequestEntity> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/orchestration/approvals/${requestId}/action`,
      'POST',
      payload
    );
  }

  public async getCommandCenterSummary(workspaceId: string): Promise<CommandCenterSummaryResponse> {
    return this.request(`/api/v1/workspaces/${workspaceId}/orchestration/command-center`, 'GET');
  }

  public async recoverWorkflows(workspaceId: string): Promise<BusinessWorkflowEntity[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/orchestration/recover`, 'POST');
  }

  // ==========================================
  // Evidence Engine Endpoints (Phase 1)
  // ==========================================

  public async getEvidenceFindings(
    workspaceId: string,
    filters?: { department?: string; classification?: string; topic?: string; limit?: number }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.classification) params.append('classification', filters.classification);
    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/evidence${qs}`, 'GET');
  }

  public async ingestEvidenceFinding(
    workspaceId: string,
    finding: {
      topic: string;
      sourceTitle: string;
      sourceUrl: string;
      sourceType: string;
      publicationDate?: string;
      extractedEvidence: string;
      quoteOrSummary?: string;
      geographicRelevance?: string;
      evidenceConfidence?: number;
      relatedDepartment: string;
      extractedMetrics?: Record<string, string | number>;
      relatedEntityIds?: string[];
      corroboratingSourcesCount?: number;
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/evidence`, 'POST', finding);
  }

  public async reconcileEvidenceContradictions(
    workspaceId: string,
    payload: { topic: string; metricOrClaim: string; findings: any[] }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/evidence/reconcile`, 'POST', payload);
  }

  public async linkEvidenceGraphEdge(
    workspaceId: string,
    payload: {
      sourceNodeId: string;
      sourceNodeType: string;
      targetNodeId: string;
      targetNodeType: string;
      relationshipType: string;
      confidence?: number;
      description: string;
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/evidence/graph/edges`, 'POST', payload);
  }

  public async getEvidenceGraphEdges(
    workspaceId: string,
    nodeId?: string
  ): Promise<any[]> {
    const qs = nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/evidence/graph/edges${qs}`, 'GET');
  }

  // ==========================================
  // Business Brain Memory System (Phase 2)
  // ==========================================

  public async updateBusinessBrainMemory(
    workspaceId: string,
    payload: {
      fieldOrCategory: string;
      key: string;
      newValue: any;
      sourceTitle: string;
      sourceUrl?: string;
      sourceType?: string;
      provenance: 'USER_CONFIRMED' | 'AI_INFERRED' | 'DERIVED_FROM_DOC';
      rationale?: string;
      confidence?: number;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/memory-update`,
      'POST',
      payload
    );
  }

  // ==========================================
  // Idea & Market Intelligence (Phase 3)
  // ==========================================

  public async validateBusinessIdea(
    workspaceId: string,
    payload: {
      ideaSummary: string;
      targetIndustry?: string;
      targetGeography?: string;
      targetAudience?: string;
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/research/validate-idea`, 'POST', payload);
  }

  public async calculateMarketSizing(
    workspaceId: string,
    payload: {
      industry: string;
      geography: string;
      targetSegment: string;
      averageAnnualContractValue?: number;
      currency?: string;
    }
  ): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/research/market-sizing`, 'POST', payload);
  }

  public async getMarketIntelligence(
    workspaceId: string,
    params?: { industry?: string; geography?: string; targetSegment?: string }
  ): Promise<any> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(
      `/api/v1/workspaces/${workspaceId}/research/market-intelligence${qs ? `?${qs}` : ''}`,
      'GET'
    );
  }

  // ==========================================
  // Competitive Intelligence & Competitor Watch (Phase 4)
  // ==========================================

  public async getDetailedCompetitors(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/detailed`, 'GET');
  }

  public async getCompetitorPositioningMatrix(
    workspaceId: string,
    userCoordinates?: { price: number; depth: number; label: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/competitors/positioning-matrix`,
      'POST',
      { userCoordinates }
    );
  }

  public async runCompetitorWatch(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/watch/run`, 'POST');
  }

  public async getCompetitorWatchAlerts(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/watch/alerts`, 'GET');
  }

  public async discoverCompetitors(workspaceId: string, prompt: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/discover`, 'POST', { prompt });
  }

  public async getLatestCompetitiveReport(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/report/latest`, 'GET');
  }

  public async getCompetitiveReport(workspaceId: string, reportId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/report/${reportId}`, 'GET');
  }

  public async askCompetitiveAdvisor(workspaceId: string, query: string, projectId?: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/advisor/chat`, 'POST', { query, projectId });
  }

  public async getCompetitiveEvidence(workspaceId: string): Promise<any[]> {
    return this.request(`/api/v1/workspaces/${workspaceId}/competitors/evidence`, 'GET');
  }

  // ==========================================
  // Financial Intelligence & Strategy Simulator (Phase 5)
  // ==========================================

  public async simulateFinancialDecisions(
    workspaceId: string,
    payload: {
      decisionA: any;
      decisionB: any;
      currency?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reasoning/financial/simulate-decisions`,
      'POST',
      payload
    );
  }

  public async getStartupCostEstimate(
    workspaceId: string,
    currency?: string
  ): Promise<any> {
    const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reasoning/financial/startup-costs${qs}`,
      'GET'
    );
  }

  public async exportFinancialModelCsv(
    workspaceId: string,
    simulation: any
  ): Promise<string> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reasoning/financial/export-csv`,
      'POST',
      { simulation }
    );
  }

  // ==========================================
  // Brand Studio & Vector Collateral (Phase 6)
  // ==========================================

  public async generateBrandStrategyProposal(
    workspaceId: string,
    payload?: { brandName?: string; userAnglePreference?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-strategy/generate`,
      'POST',
      payload || {}
    );
  }

  public async generateCollateralVectorSvg(
    workspaceId: string,
    payload: {
      assetType: 'VECTOR_LOGO' | 'BUSINESS_CARD_SVG' | 'STATIONERY_LETTERHEAD_SVG' | 'POSTER_FLYER_SVG' | 'STATIC_CAROUSEL_SVG';
      brandName?: string;
      tagline?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/collateral/generate-svg`,
      'POST',
      payload
    );
  }

  public async generateAiLogoConcepts(
    workspaceId: string,
    payload: {
      prompt: string;
      styleArchetype?: string;
      mood?: string;
      lockBrandColors?: boolean;
      brand?: Record<string, unknown>;
    }
  ): Promise<{
    concepts?: Array<{
      id: string;
      name: string;
      rationale: string;
      styleTag: string;
      markStyle: 'geometric' | 'monogram' | 'emblem';
      accentColor: string;
      customSvg: string;
    }>;
    model?: string;
    error?: string;
  }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ai/brand-logo`,
      'POST',
      payload
    );
  }

  public async generateAiSocialCreative(
    workspaceId: string,
    payload: {
      platform?: string;
      angle?: string;
      prompt: string;
      slideCount?: number;
      mood?: string;
      regenerateSlideNumber?: number;
      brand?: Record<string, unknown>;
      brain?: Record<string, unknown>;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ai/social-creative`,
      'POST',
      payload
    );
  }

  public async generateAiCollateralVariations(
    workspaceId: string,
    payload: {
      category: string;
      prompt: string;
      surfaceMode?: string;
      brand?: Record<string, unknown>;
      brain?: Record<string, unknown>;
    }
  ): Promise<{
    variations?: Array<{
      id: string;
      title: string;
      layoutLabel: string;
      headlineText: string;
      subtext: string;
      footerNote: string;
      artDirectionNote: string;
      darkVariant: boolean;
      svgMotif: string;
    }>;
    model?: string;
    error?: string;
  }> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/ai/brand-asset`,
      'POST',
      payload
    );
  }

  public async createBrandExportPackage(
    workspaceId: string,
    payload?: { format?: 'ZIP' | 'JSON' | 'SVG_BUNDLE' }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/export-package`,
      'POST',
      payload || {}
    );
  }

  public async evaluateBrandQuality(
    workspaceId: string,
    payload?: { resourceType?: string; resourceId?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/quality-report`,
      'POST',
      payload || {}
    );
  }

  public async approveBrandResource(
    workspaceId: string,
    payload: { resourceType?: string; resourceId?: string; resourceVersion?: number; notes?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/approve`,
      'POST',
      payload
    );
  }

  // ---------------------------------------------------------------------------
  // Brand Identity Studio Enhanced Methods
  // ---------------------------------------------------------------------------
  public async discoverBrandProfile(
    workspaceId: string,
    payload: { rawIdea?: string; existingBrandAssets?: any[]; targetCategory?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/discover`,
      'POST',
      payload
    );
  }

  public async generateBrandStrategy(
    workspaceId: string,
    payload?: { targetAudience?: string; categoryOverride?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/strategy`,
      'POST',
      payload || {}
    );
  }

  public async analyzeCompetitorVisualTeardown(
    workspaceId: string,
    payload?: { competitorsOverride?: any[] }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/competitors/visual-teardown`,
      'POST',
      payload || {}
    );
  }

  public async identifyVisualWhitespace(
    workspaceId: string,
    payload?: { category?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/whitespace`,
      'POST',
      payload || {}
    );
  }

  public async generateCreativeDirections(
    workspaceId: string,
    payload?: { category?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/creative-directions`,
      'POST',
      payload || {}
    );
  }

  public async generateVisualMoodboard(
    workspaceId: string,
    payload?: { direction?: any; directionId?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/moodboards`,
      'POST',
      payload || {}
    );
  }

  public async getVisualMoodboards(workspaceId: string, directionId?: string): Promise<any> {
    const q = directionId ? `?directionId=${encodeURIComponent(directionId)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/moodboards${q}`,
      'GET'
    );
  }

  public async generateBrandPositioningMap(
    workspaceId: string,
    payload?: { category?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/positioning-map`,
      'POST',
      payload || {}
    );
  }

  public async validateBrandStrategy(
    workspaceId: string,
    payload?: { strategy?: any; direction?: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/validate`,
      'POST',
      payload || {}
    );
  }

  public async refineCreativeDirection(
    workspaceId: string,
    payload: { directive: string; customPrompt?: string; targetDirectionId?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-identity/refine-direction`,
      'POST',
      payload
    );
  }

  // ---------------------------------------------------------------------------
  // AI Logo Studio Enhanced Methods
  // ---------------------------------------------------------------------------
  public async assembleLogoBrief(
    workspaceId: string,
    payload?: { userNotes?: string; logoArchetype?: string; logoMood?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/brief`,
      'POST',
      payload || {}
    );
  }

  public async generateLogoConcepts(
    workspaceId: string,
    payload: {
      userPrompt?: string;
      styleArchetype?: string;
      mood?: string;
      lockBrandColors?: boolean;
      brief?: any;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/concepts`,
      'POST',
      payload
    );
  }

  public async refineLogoConcept(
    workspaceId: string,
    payload: {
      conceptId: string;
      directive: string;
      customInstruction?: string;
      branchAsNew?: boolean;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/refine`,
      'POST',
      payload
    );
  }

  public async generateLogoVariants(
    workspaceId: string,
    payload: { conceptId: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/variants`,
      'POST',
      payload
    );
  }

  public async getLogoVariants(workspaceId: string, conceptId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/variants/${conceptId}`,
      'GET'
    );
  }

  public async validateLogoQuality(
    workspaceId: string,
    payload: { conceptId: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/validate`,
      'POST',
      payload
    );
  }

  public async generateLogoPresentation(
    workspaceId: string,
    payload: { conceptId: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-logo/presentation`,
      'POST',
      payload
    );
  }

  public async generateBrandBook(
    workspaceId: string,
    payload?: { overrides?: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/generate-book`,
      'POST',
      payload || {}
    );
  }

  public async getLatestBrandBook(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/latest-book`,
      'GET'
    );
  }

  public async getLivingDesignTokens(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/tokens`,
      'GET'
    );
  }

  public async getDesignRules(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/rules`,
      'GET'
    );
  }

  public async evaluateBrandConsistency(
    workspaceId: string,
    payload: { assetType: string; assetContent: string; context?: any; autoRemediate?: boolean }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/evaluate-consistency`,
      'POST',
      payload
    );
  }

  public async analyzeGuidelineImpact(
    workspaceId: string,
    payload?: { proposedChanges?: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/impact-analysis`,
      'POST',
      payload || {}
    );
  }

  public async updateBrandBook(
    workspaceId: string,
    payload: { updates: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/update`,
      'POST',
      payload
    );
  }

  public async exportDesignTokensJson(
    workspaceId: string,
    download = false
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/export-tokens-json${download ? '?download=true' : ''}`,
      'GET'
    );
  }

  public async exportBrandBookPdfMarkup(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-guidelines/export-pdf-markup`,
      'GET'
    );
  }

  /* ==========================================================================
   * AI ASSETS & SOCIAL STUDIO CLIENT METHODS
   * ========================================================================== */

  public async getCreativeAssetRecommendations(
    workspaceId: string,
    payload?: { industryOverride?: string; businessModel?: string; productCategory?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/recommendations`,
      'POST',
      payload || {}
    );
  }

  public async generateProductMockup(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/mockups/generate`,
      'POST',
      payload
    );
  }

  public async listProductMockups(workspaceId: string, category?: string): Promise<any> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/mockups${query}`,
      'GET'
    );
  }

  public async generatePackagingArtwork(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/packaging/generate`,
      'POST',
      payload
    );
  }

  public async listPackagingArtworks(workspaceId: string, tier?: string): Promise<any> {
    const query = tier ? `?tier=${encodeURIComponent(tier)}` : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/packaging${query}`,
      'GET'
    );
  }

  public async generateCampaignVisual(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/campaign-visual/generate`,
      'POST',
      payload
    );
  }

  public async generateSocialPostCreative(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/social-post/generate`,
      'POST',
      payload
    );
  }

  public async generateMultiSlideCarousel(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/generate`,
      'POST',
      payload
    );
  }

  public async listSocialProjects(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/social-projects`,
      'GET'
    );
  }

  public async editCarouselSlide(
    workspaceId: string,
    projectId: string,
    payload: { slideIndex: number; newHeadline?: string; newBody?: string; newCtaText?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/${projectId}/edit-slide`,
      'POST',
      payload
    );
  }

  public async reorderCarouselSlides(
    workspaceId: string,
    projectId: string,
    newOrder: number[]
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/${projectId}/reorder`,
      'POST',
      { newOrder }
    );
  }

  public async duplicateCarouselSlide(
    workspaceId: string,
    projectId: string,
    slideIndex: number
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/${projectId}/duplicate`,
      'POST',
      { slideIndex }
    );
  }

  public async deleteCarouselSlide(
    workspaceId: string,
    projectId: string,
    slideIndex: number
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/${projectId}/delete`,
      'POST',
      { slideIndex }
    );
  }

  public async remixCarouselSlide(
    workspaceId: string,
    projectId: string,
    payload: { slideIndex: number; promptModifier?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/carousels/${projectId}/remix-slide`,
      'POST',
      payload
    );
  }

  public async createEditableDocument(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/editable-document/create`,
      'POST',
      payload
    );
  }

  public async listEditableDocuments(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/editable-documents`,
      'GET'
    );
  }

  public async updateEditableDocumentLayer(
    workspaceId: string,
    docId: string,
    payload: { layerId: string; updates: any }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/editable-document/${docId}/update-layer`,
      'POST',
      payload
    );
  }

  public async generateCoordinatedCampaign(workspaceId: string, payload: any): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/campaigns/generate`,
      'POST',
      payload
    );
  }

  public async listCampaignPackages(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/campaigns`,
      'GET'
    );
  }

  public async detectCreativeOpportunities(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/opportunities`,
      'GET'
    );
  }

  public async exportCreativePackage(
    workspaceId: string,
    payload: { assetIds: string[]; formats: string[]; targetDpi?: number }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/export`,
      'POST',
      payload
    );
  }

  // Brand Launch Command Capstone Methods
  public async prepareBrandLaunch(
    workspaceId: string,
    payload?: {
      companyName?: string;
      industry?: string;
      brandIdentityId?: string;
      conceptId?: string;
      productName?: string;
      productCategory?: string;
      packagingTier?: 'STANDARD_D2C' | 'PREMIUM_RETAIL' | 'ECO_MINIMAL';
      campaignObjective?: string;
      idempotencyKey?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-launch/prepare`,
      'POST',
      payload || {}
    );
  }

  public async getLatestBrandLaunch(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-launch/latest`,
      'GET'
    );
  }

  public async getBrandLaunch(workspaceId: string, launchId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-launch/${launchId}`,
      'GET'
    );
  }

  public async exportBrandLaunchBundle(
    workspaceId: string,
    launchId: string,
    requestedFormats?: string[]
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-launch/${launchId}/export`,
      'POST',
      { requestedFormats }
    );
  }

  // Prepress, Font Outlining & Trademark Clearance Methods
  public async performPreliminaryTrademarkClearance(
    workspaceId: string,
    payload: {
      wordmark: string;
      industryCategory?: string;
      targetJurisdiction?: 'INDIA_IP_INDIA' | 'US_USPTO' | 'INTERNATIONAL_WIPO' | 'ALL';
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/brand-trademark/clearance`,
      'POST',
      payload
    );
  }

  public async wrapPrepressMarks(
    workspaceId: string,
    payload: {
      svgContent: string;
      colorProfile?: 'FOGRA39' | 'GRACOL_2013' | 'SWOP_V2' | 'FOGRA47';
      bleedSpec?: {
        bleedMm?: number;
        safeMarginMm?: number;
        trimWidthMm?: number;
        trimHeightMm?: number;
        substrateType?: string;
      };
      brandName?: string;
      jobTitle?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/prepress/wrap-marks`,
      'POST',
      payload
    );
  }

  public async outlineVectorFonts(
    workspaceId: string,
    payload: {
      svgContent: string;
      fontMode?: 'OUTLINED_PATHS' | 'EMBEDDED_TEXT';
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/prepress/outline-fonts`,
      'POST',
      payload
    );
  }

  public async getCmykProfiles(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/assets/creative-studio/prepress/cmyk-profiles`,
      'GET'
    );
  }

  public async generateGrowthRoadmap(
    workspaceId: string,
    payload?: { focusCategory?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/tasks/roadmap/generate`,
      'POST',
      payload || {}
    );
  }

  public async getGrowthTaskPlans(
    workspaceId: string,
    params?: { timeHorizon?: string; status?: string }
  ): Promise<any> {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/tasks/growth-plans${q}`,
      'GET'
    );
  }

  public async recordGrowthTaskOutcome(
    workspaceId: string,
    taskId: string,
    payload: {
      status?: 'COMPLETED' | 'ABANDONED';
      outcomeMet: boolean;
      actualMetrics?: Record<string, number>;
      notes?: string;
      learningsToPersist?: string[];
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/tasks/${taskId}/outcome`,
      'POST',
      payload
    );
  }

  // =========================================================================
  // AI GROWTH AGENCY CLIENT API
  // =========================================================================

  public async createGrowthMission(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/missions`, 'POST', payload);
  }

  public async getGrowthMissions(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/missions`, 'GET');
  }

  public async transitionGrowthMissionStatus(workspaceId: string, missionId: string, payload: { targetStatus: string; notes?: string }): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/missions/${missionId}/status`, 'PATCH', payload);
  }

  public async recordGrowthMissionOutcome(workspaceId: string, missionId: string, payload: { metricsAchieved?: Record<string, number>; summaryNotes?: string; strategicLearnings?: string[] }): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/missions/${missionId}/outcome`, 'POST', payload);
  }

  public async formulateGrowthStrategy(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/strategy/formulate`, 'POST', payload);
  }

  public async getActiveGrowthStrategy(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/strategy/active`, 'GET');
  }

  public async getGrowthScenariosComparison(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/strategy/scenarios`, 'GET');
  }

  public async getGrowthDepartmentsOverview(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/departments/overview`, 'GET');
  }

  public async enqueueExecutionJob(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/execution/jobs`, 'POST', payload);
  }

  public async approveExecutionJob(workspaceId: string, jobId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/execution/jobs/${jobId}/approve`, 'POST');
  }

  public async processExecutionJob(workspaceId: string, jobId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/execution/jobs/${jobId}/process`, 'POST');
  }

  public async getExecutionJobs(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/execution/jobs`, 'GET');
  }

  public async simulateGrowthScenario(workspaceId: string, payload: any): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/simulator/simulate`, 'POST', payload);
  }

  public async convertGrowthScenarioToMission(workspaceId: string, scenarioId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/simulator/scenarios/${scenarioId}/convert`, 'POST');
  }

  public async getGrowthScenarios(workspaceId: string): Promise<any> {
    return this.request(`/api/v1/workspaces/${workspaceId}/growth-agency/simulator/scenarios`, 'GET');
  }

  public async runBusinessWatchCycle(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/cycle/run`,
      'POST'
    );
  }

  public async getBusinessWatchAlerts(
    workspaceId: string,
    params?: { category?: string; severity?: string }
  ): Promise<any> {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/alerts${q}`,
      'GET'
    );
  }

  public async acknowledgeBusinessWatchAlert(
    workspaceId: string,
    alertId: string,
    payload?: { status?: string; resolutionNotes?: string }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/alerts/${alertId}/acknowledge`,
      'POST',
      payload || {}
    );
  }

  public async generateWeeklyBusinessDigest(workspaceId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/market-watch/digest/weekly`,
      'POST'
    );
  }

  public async generateUnifiedDossier(
    workspaceId: string,
    payload?: { title?: string; monthlyPrice?: number }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reports/dossier/generate`,
      'POST',
      payload || {}
    );
  }

  public async getUnifiedDossier(workspaceId: string, dossierId: string): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/reports/dossier/${dossierId}`,
      'GET'
    );
  }

  public getUnifiedDossierHtmlExportUrl(workspaceId: string, dossierId: string): string {
    return `/api/v1/workspaces/${workspaceId}/reports/dossier/${dossierId}/export-html`;
  }

  public getUnifiedDossierCsvExportUrl(workspaceId: string, dossierId: string): string {
    return `/api/v1/workspaces/${workspaceId}/reports/dossier/${dossierId}/export-csv`;
  }

  // ==========================================
  // RESEARCH & IDEA INTELLIGENCE METHODS
  // ==========================================

  public async getResearchReports(workspaceId: string): Promise<ResearchReport[]> {
    const res = await this.request<{ success: boolean; data: ResearchReport[] }>(
      `/api/v1/workspaces/${workspaceId}/research`,
      'GET'
    );
    return Array.isArray(res) ? res : (res as any)?.data || [];
  }

  public async understandIdea(
    workspaceId: string,
    ideaPrompt: string
  ): Promise<IdeaUnderstandingResult> {
    const res = await this.request<{ success: boolean; data: IdeaUnderstandingResult }>(
      `/api/v1/workspaces/${workspaceId}/research/understand-idea`,
      'POST',
      { ideaPrompt }
    );
    return (res as any)?.data ?? (res as unknown as IdeaUnderstandingResult);
  }

  public async orchestrateResearch(
    workspaceId: string,
    payload: {
      ideaSummary: string;
      industry?: string;
      targetMarket?: string;
      geography?: string;
      depth?: string;
      budgetConstraint?: string;
    }
  ): Promise<{ report: ResearchReport; model: string; meta?: any }> {
    const res = await this.request<any>(
      `/api/v1/workspaces/${workspaceId}/research/orchestrate`,
      'POST',
      payload
    );
    return {
      report: res.data || res.report || res,
      model: res.meta?.modelUsed || res.model || 'gemini-1.5-pro',
      meta: res.meta,
    };
  }

  public async sendConversationalResearch(
    workspaceId: string,
    reportId: string,
    query: string,
    context?: any
  ): Promise<{
    reply: string;
    citedSources: string[];
    suggestedActions: string[];
    financialRecalculation?: any;
  }> {
    const res = await this.request<any>(
      `/api/v1/workspaces/${workspaceId}/research/${reportId}/conversation`,
      'POST',
      { query, context }
    );
    return res.data || res;
  }

  public async finalizeIdea(
    workspaceId: string,
    reportId: string,
    payload: {
      selectedOpportunityId?: string;
      customizedDirection?: Partial<FinalizedBusinessBlueprint>;
    }
  ): Promise<FinalizedBusinessBlueprint> {
    const res = await this.request<any>(
      `/api/v1/workspaces/${workspaceId}/research/${reportId}/finalize`,
      'POST',
      payload
    );
    return res.data || res;
  }

  // ==========================================
  // ANALYTICS & TELEMETRY METHODS
  // ==========================================

  public async getAnalyticsOverview(workspaceId: string): Promise<any> {
    const res = await this.request<any>(
      `/api/v1/workspaces/${workspaceId}/analytics/overview`,
      'GET'
    );
    return res.data || res;
  }

  public async askAnalyticsAssistant(workspaceId: string, question: string): Promise<any> {
    const res = await this.request<any>(
      `/api/v1/workspaces/${workspaceId}/analytics/ask-assistant`,
      'POST',
      { question }
    );
    return res.data || res;
  }
}

/**
 * Singleton API Client Instance
 */
export const apiClient = new BrainWiseApiClient();
