/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BrainWiseState,
  BusinessBrainData,
  ResearchReport,
  StrategyRecommendation,
  CompetitorProfileData,
  GrowthGoal,
  GrowthTask,
  GrowthExperiment,
  BrandAsset,
} from '../types/brainwise';

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
    this.getAuthToken = options.getAuthToken;
    this.activeWorkspaceId = options.activeWorkspaceId;
  }

  public setAuthToken(token?: string | null): void {
    this.currentToken = token ?? null;
  }

  public setActiveWorkspaceId(workspaceId?: string | null): void {
    this.activeWorkspaceId = workspaceId ?? undefined;
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
  // Brand Assets & Storage
  // ---------------------------------------------------------------------------
  public async getBrandAssets(workspaceId: string, category?: string): Promise<BrandAsset[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/v1/workspaces/${workspaceId}/assets${q}`, 'GET');
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
      category?: string;
      assetType?: string;
      storagePath: string;
      fileSize: number;
      mimeType: string;
      svgContent?: string;
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

  public async deleteBrandAsset(workspaceId: string, assetId: string): Promise<void> {
    return this.request(`/api/v1/workspaces/${workspaceId}/assets/${assetId}`, 'DELETE');
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
      documentContent: string;
      documentType?: string;
    }
  ): Promise<any> {
    return this.request(
      `/api/v1/workspaces/${workspaceId}/business-profile/extract-document`,
      'POST',
      payload
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
    payload: { providerId: string; apiKey?: string }
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
    return this.request(
      `/api/v1/workspaces/${wsId}/ai/chat`,
      'POST',
      {
        message: payload.message,
        threadId: payload.threadId,
        modelTier: payload.modelTier || 'fast',
        history: payload.history || [],
      }
    );
  }
}

/**
 * Singleton API Client Instance
 */
export const apiClient = new BrainWiseApiClient();
