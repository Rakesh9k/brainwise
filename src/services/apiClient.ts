/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BrainWiseState,
  BusinessBrainData,
  ResearchReport,
  StrategyRecommendation,
} from '../types/brainwise';

export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  getAuthToken?: () => Promise<string | null>;
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

/**
 * Standardized BrainWise API Client
 * Centralizes request dispatch, timeout handling, authentication header injection,
 * and typed response validation according to docs/phase-2/07-api-contracts.md.
 */
export class BrainWiseApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly getAuthToken?: () => Promise<string | null>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.timeoutMs = options.timeoutMs ?? 20000;
    this.getAuthToken = options.getAuthToken;
  }

  private async request<TResponse>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
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

      if (this.getAuthToken) {
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
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
        // Response is non-JSON or empty
      }

      if (!response.ok) {
        const errorMessage =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `API request failed with status ${response.status}`;

        const errorCode =
          payload &&
          typeof payload === 'object' &&
          'code' in payload &&
          typeof (payload as { code: unknown }).code === 'string'
            ? (payload as { code: string }).code
            : undefined;

        throw new ApiError(errorMessage, response.status, errorCode, payload);
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

  // Health check
  public async getHealth(): Promise<{ ok: boolean; aiConfigured: boolean; model: string }> {
    return this.request('/api/health', 'GET');
  }

  // AI Dossier generation
  public async generateDossier(payload: {
    ideaSummary: string;
    industry: string;
    targetMarket: string;
    geography: string;
    depth: ResearchReport['depth'];
    brain: BusinessBrainData;
  }): Promise<{ report: ResearchReport; model: string }> {
    return this.request('/api/ai/dossier', 'POST', {
      ideaSummary: payload.ideaSummary,
      industry: payload.industry,
      targetMarket: payload.targetMarket,
      geography: payload.geography,
      depth: payload.depth,
      brain: {
        businessName: payload.brain.businessName,
        industry: payload.brain.industry,
        stage: payload.brain.stage,
        location: payload.brain.location,
        brandPositioning: payload.brain.brandPositioning,
        targetAudience: payload.brain.targetAudience,
      },
    });
  }

  // AI Playbook generation
  public async generatePlaybookAngle(payload: {
    category: string;
    title: string;
    defaultPrompt: string;
    question: string;
  }): Promise<{ angle: string; model: string }> {
    return this.request('/api/ai/playbook', 'POST', payload);
  }

  // AI Strategic Recommendations
  public async generateRecommendations(state: BrainWiseState): Promise<{
    recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
    model: string;
  }> {
    return this.request('/api/ai/recommendations', 'POST', {
      brain: {
        businessName: state.brain.businessName,
        industry: state.brain.industry,
        stage: state.brain.stage,
        location: state.brain.location,
        brandPositioning: state.brain.brandPositioning,
        targetAudience: state.brain.targetAudience,
        valueProposition: state.brain.valueProposition,
      },
      competitors: state.competitors.map((c) => ({
        name: c.name,
        positioning: c.positioning,
        weaknesses: c.weaknesses,
      })),
      goals: state.goals.map((g) => ({
        title: g.title,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit,
      })),
      tasks: state.tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
      aiTonePreference: state.aiTonePreference,
    });
  }
}

/**
 * Singleton API Client Instance
 */
export const apiClient = new BrainWiseApiClient();
