/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BrainWiseState,
  BusinessBrainData,
  ResearchReport,
  StrategyRecommendation,
  IdeaUnderstandingResult,
  FinalizedBusinessBlueprint,
} from '../types/brainwise';
import type { JournalArticle } from './logic';
import { apiClient, getStoredAuthToken } from '../services/apiClient';

export interface AiHealthStatus {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
}

/**
 * Validates that a workspace ID is non-empty and strictly adheres to multi-tenant isolation.
 * Throws INVALID_WORKSPACE_ID if missing, empty, or set to string 'null'/'undefined'.
 */
export function validateWorkspaceId(workspaceId?: string | null): string {
  const wsId = workspaceId || apiClient.getActiveWorkspaceId();
  if (
    !wsId ||
    typeof wsId !== 'string' ||
    wsId.trim() === '' ||
    wsId.trim().toLowerCase() === 'null' ||
    wsId.trim().toLowerCase() === 'undefined'
  ) {
    throw new Error('INVALID_WORKSPACE_ID: A valid, non-empty workspace ID is required for workspace-scoped API calls.');
  }
  return wsId.trim();
}

async function postJson<TResponse>(
  url: string,
  body: unknown,
  workspaceId?: string
): Promise<TResponse> {
  const effectiveWsId = validateWorkspaceId(workspaceId);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Workspace-Id': effectiveWsId,
  };
  try {
    const token = getStoredAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore token access error
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response
  }

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return payload as TResponse;
}

export async function fetchAiHealth(): Promise<AiHealthStatus> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return (await response.json()) as AiHealthStatus;
}

export async function generateAiDossier(params: {
  workspaceId?: string;
  ideaSummary: string;
  industry: string;
  targetMarket: string;
  geography: string;
  depth: ResearchReport['depth'];
  brain: BusinessBrainData;
}): Promise<{ report: ResearchReport; model: string }> {
  const wsId = validateWorkspaceId(params.workspaceId);
  return postJson<{ report: ResearchReport; model: string }>(
    `/api/v1/workspaces/${wsId}/research/orchestrate`,
    {
      ideaSummary: params.ideaSummary,
      industry: params.industry,
      targetMarket: params.targetMarket,
      geography: params.geography,
      depth: params.depth,
      brain: {
        businessName: params.brain.businessName,
        industry: params.brain.industry,
        stage: params.brain.stage,
        location: params.brain.location,
        brandPositioning: params.brain.brandPositioning,
        targetAudience: params.brain.targetAudience,
      },
    },
    wsId
  ).catch(async () => {
    // Fallback to backward-compatible workspace route alias
    return postJson<{ report: ResearchReport; model: string }>(
      `/api/v1/workspaces/${wsId}/ai/dossier`,
      {
        ideaSummary: params.ideaSummary,
        industry: params.industry,
        targetMarket: params.targetMarket,
        geography: params.geography,
        depth: params.depth,
        brain: params.brain,
      },
      wsId
    );
  });
}

export async function generateAiPlaybookAngle(
  article: JournalArticle,
  question: string,
  workspaceId?: string
): Promise<{ angle: string; model: string }> {
  const wsId = validateWorkspaceId(workspaceId);
  return postJson<{ angle: string; model: string }>(
    `/api/v1/workspaces/${wsId}/ai/playbook`,
    {
      category: article.category,
      title: article.title,
      defaultPrompt: article.defaultPrompt,
      question,
    },
    wsId
  );
}

export async function generateAiRecommendations(
  state: BrainWiseState,
  workspaceId?: string
): Promise<{
  recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
  model: string;
}> {
  const wsId = validateWorkspaceId(workspaceId || state.activeWorkspaceId);
  return postJson<{
    recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
    model: string;
  }>(
    `/api/v1/workspaces/${wsId}/ai/recommendations`,
    {
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
    },
    wsId
  );
}

export async function understandIdeaApi(
  ideaPrompt: string,
  workspaceId?: string
): Promise<IdeaUnderstandingResult> {
  const wsId = validateWorkspaceId(workspaceId);
  const res = await postJson<{ success: boolean; data: IdeaUnderstandingResult }>(
    `/api/v1/workspaces/${wsId}/research/understand-idea`,
    {
      ideaPrompt,
    },
    wsId
  );
  return res.data;
}

export async function sendConversationalResearchApi(params: {
  workspaceId?: string;
  reportId: string;
  query: string;
  context?: any;
}): Promise<{
  reply: string;
  citedSources: string[];
  suggestedActions: string[];
  financialRecalculation?: {
    scenarioName: string;
    startupBudget: string;
    monthlyBurn: string;
    breakEvenUnits: number;
    feasibilityVerdict: 'VIABLE' | 'TIGHT' | 'UNVIABLE';
    notes: string;
  };
}> {
  const wsId = validateWorkspaceId(params.workspaceId);
  const res = await postJson<{ success: boolean; data: any }>(
    `/api/v1/workspaces/${wsId}/research/${params.reportId}/conversation`,
    {
      query: params.query,
      context: params.context,
    },
    wsId
  );
  return res.data;
}

export async function finalizeIdeaApi(params: {
  workspaceId?: string;
  reportId: string;
  selectedOpportunityId?: string;
  customizedDirection?: Partial<FinalizedBusinessBlueprint>;
}): Promise<FinalizedBusinessBlueprint> {
  const wsId = validateWorkspaceId(params.workspaceId);
  const res = await postJson<{ success: boolean; data: FinalizedBusinessBlueprint }>(
    `/api/v1/workspaces/${wsId}/research/${params.reportId}/finalize`,
    {
      selectedOpportunityId: params.selectedOpportunityId,
      customizedDirection: params.customizedDirection,
    },
    wsId
  );
  return res.data;
}
