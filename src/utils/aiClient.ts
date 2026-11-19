import type {
  BrainWiseState,
  BusinessBrainData,
  ResearchReport,
  StrategyRecommendation,
} from '../types/brainwise';
import type { JournalArticle } from './logic';

export interface AiHealthStatus {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  ideaSummary: string;
  industry: string;
  targetMarket: string;
  geography: string;
  depth: ResearchReport['depth'];
  brain: BusinessBrainData;
}): Promise<{ report: ResearchReport; model: string }> {
  return postJson<{ report: ResearchReport; model: string }>('/api/ai/dossier', {
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
  });
}

export async function generateAiPlaybookAngle(
  article: JournalArticle,
  question: string
): Promise<{ angle: string; model: string }> {
  return postJson<{ angle: string; model: string }>('/api/ai/playbook', {
    category: article.category,
    title: article.title,
    defaultPrompt: article.defaultPrompt,
    question,
  });
}

export async function generateAiRecommendations(state: BrainWiseState): Promise<{
  recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
  model: string;
}> {
  return postJson<{
    recommendations: Omit<StrategyRecommendation, 'id' | 'status'>[];
    model: string;
  }>('/api/ai/recommendations', {
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
