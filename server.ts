import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { executeTruthCheck } from './src/utils/truthCheck';
import { buildAntiFatiguePromptDirectives } from './src/utils/strategicMemory';
import type { BusinessBrainData, ResearchReport } from './src/types/brainwise';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

function resolveApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim() || '';
  if (!raw || raw === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return raw;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 22000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms = 18000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`AI upstream request timed out after ${Math.round(ms / 1000)}s.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function formatSizingBands(tamBillion: number, samSharePct: number, somSharePct: number) {
  const tamLow = (tamBillion * 0.85).toFixed(1);
  const tamHigh = (tamBillion * 1.15).toFixed(1);
  const samBase = tamBillion * (samSharePct / 100);
  const samLowM = Math.round(samBase * 850);
  const samHighM = Math.round(samBase * 1150);
  const somBase = samBase * (somSharePct / 100);
  const somLowM = (somBase * 800).toFixed(1);
  const somHighM = (somBase * 1200).toFixed(1);

  return {
    tamBand: `$${tamLow}B – $${tamHigh}B`,
    samBand: `$${samLowM}M – $${samHighM}M`,
    somBand: `$${somLowM}M – $${somHighM}M`,
  };
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : 'Unexpected server error.';
  if (rawMessage.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message: 'Live AI is unavailable because GEMINI_API_KEY is not configured on the server.',
    };
  }
  if (rawMessage.includes('timed out')) {
    return { status: 504, message: rawMessage };
  }
  if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota limit reached. Please retry shortly or check Settings > Secrets.',
    };
  }
  return { status: 500, message: rawMessage };
}

interface DossierPayloadBody {
  ideaSummary?: string;
  industry?: string;
  targetMarket?: string;
  geography?: string;
  depth?: 'Rapid Pulse' | 'Standard Validation' | 'Deep Market Dossier';
  brain?: BusinessBrainData;
}

interface PlaybookPayloadBody {
  category?: string;
  title?: string;
  defaultPrompt?: string;
  question?: string;
}

interface RecommendationsPayloadBody {
  brain?: {
    businessName?: string;
    industry?: string;
    stage?: string;
    location?: string;
    brandPositioning?: string;
    targetAudience?: string;
    valueProposition?: string;
  };
  competitors?: { name?: string; positioning?: string; weaknesses?: string[] }[];
  goals?: { title?: string; currentValue?: number; targetValue?: number; unit?: string }[];
  tasks?: { title?: string; status?: string; priority?: string }[];
  aiTonePreference?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(resolveApiKey()),
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/ai/dossier', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as DossierPayloadBody;
      const ideaSummary =
        (body.ideaSummary || '').trim() ||
        `${body.brain?.businessName || 'New Venture'} Growth Initiative`;
      const industry =
        (body.industry || '').trim() || body.brain?.industry || 'Modern Consumer & B2B';
      const targetMarket =
        (body.targetMarket || '').trim() ||
        body.brain?.targetAudience ||
        'Early-adopter urban buyers';
      const geography =
        (body.geography || '').trim() || body.brain?.location || 'Primary Launch Market';
      const depth =
        body.depth === 'Rapid Pulse' ||
        body.depth === 'Standard Validation' ||
        body.depth === 'Deep Market Dossier'
          ? body.depth
          : 'Deep Market Dossier';

      const ai = getGeminiClient();

      const prompt = [
        'You are BrainWise Idea Intelligence, a disciplined strategy analyst.',
        'Generate a commercial validation dossier strictly grounded in honest range estimates (never claim fake precision or unverified live citations).',
        `Concept: ${ideaSummary}`,
        `Industry: ${industry}`,
        `Target Market: ${targetMarket}`,
        `Geography: ${geography}`,
        `Requested Depth: ${depth}`,
        body.brain?.businessName
          ? `Business Brain Context: ${body.brain.businessName} (${body.brain.stage || 'Growing'}) — Positioning: ${body.brain.brandPositioning || 'Emerging'}`
          : '',
        body.brain?.strategicMemory
          ? buildAntiFatiguePromptDirectives(body.brain.strategicMemory)
          : '',
        'Return realistic numeric assumptions: tamBillion between 0.5 and 25, samSharePct between 4 and 30, somSharePct between 0.4 and 5.',
        'Keep language executive, concise, practical, and tailored specifically to the concept and geography.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                overallConfidence: { type: Type.STRING, enum: ['High', 'Moderate', 'Exploratory'] },
                viabilitySignal: {
                  type: Type.STRING,
                  enum: ['Strong Fit', 'Promising with Niche Focus', 'Needs Pivot'],
                },
                executiveSummary: { type: Type.STRING },
                marketOverviewText: { type: Type.STRING },
                tamBillion: { type: Type.NUMBER },
                samSharePct: { type: Type.NUMBER },
                somSharePct: { type: Type.NUMBER },
                tamBasis: { type: Type.STRING },
                samBasis: { type: Type.STRING },
                somBasis: { type: Type.STRING },
                marketDemandSummary: { type: Type.STRING },
                demandSignals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      trend: { type: Type.STRING },
                    },
                    required: ['label', 'trend'],
                  },
                },
                customerSegments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      share: { type: Type.STRING },
                      need: { type: Type.STRING },
                      urgency: { type: Type.STRING },
                    },
                    required: ['name', 'share', 'need', 'urgency'],
                  },
                },
                customerPainPoints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                      evidence: { type: Type.STRING },
                    },
                    required: ['title', 'severity', 'evidence'],
                  },
                },
                competitorLandscapeSummary: { type: Type.STRING },
                pricingTiers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tier: { type: Type.STRING },
                      range: { type: Type.STRING },
                      positioning: { type: Type.STRING },
                    },
                    required: ['tier', 'range', 'positioning'],
                  },
                },
                pricingRecommendation: { type: Type.STRING },
                marketOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                businessModelOptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      model: { type: Type.STRING },
                      pros: { type: Type.STRING },
                      cons: { type: Type.STRING },
                      fit: { type: Type.STRING },
                    },
                    required: ['model', 'pros', 'cons', 'fit'],
                  },
                },
                year1Conservative: { type: Type.STRING },
                year1Target: { type: Type.STRING },
                unitEconomicsNote: { type: Type.STRING },
                startupCostEstimates: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      range: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                    required: ['category', 'range', 'note'],
                  },
                },
                risksAndChallenges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      risk: { type: Type.STRING },
                      severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                      mitigation: { type: Type.STRING },
                    },
                    required: ['risk', 'severity', 'mitigation'],
                  },
                },
                validationExperiments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      metric: { type: Type.STRING },
                      timeframe: { type: Type.STRING },
                    },
                    required: ['title', 'metric', 'timeframe'],
                  },
                },
                verdict: { type: Type.STRING },
                nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'title',
                'overallConfidence',
                'viabilitySignal',
                'executiveSummary',
                'marketOverviewText',
                'tamBillion',
                'samSharePct',
                'somSharePct',
                'marketDemandSummary',
                'customerSegments',
                'customerPainPoints',
                'competitorLandscapeSummary',
                'pricingTiers',
                'pricingRecommendation',
                'marketOpportunities',
                'businessModelOptions',
                'year1Conservative',
                'year1Target',
                'startupCostEstimates',
                'risksAndChallenges',
                'validationExperiments',
                'verdict',
                'nextSteps',
              ],
            },
          },
        })
      );

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText) as Record<string, unknown>;

      const tamBillion = clampNum(parsed.tamBillion, 0.5, 30, 4.2);
      const samSharePct = Math.round(clampNum(parsed.samSharePct, 2, 40, 12));
      const somSharePct = Number(clampNum(parsed.somSharePct, 0.2, 10, 1.0).toFixed(1));
      const bands = formatSizingBands(tamBillion, samSharePct, somSharePct);
      const todayIso = new Date().toISOString().slice(0, 10);

      const report: ResearchReport = {
        id: `rep-${Date.now()}`,
        title: String(parsed.title || ideaSummary).slice(0, 84),
        ideaSummary,
        industry,
        targetMarket,
        geography,
        depth,
        createdAt: todayIso,
        overallConfidence:
          parsed.overallConfidence === 'High' ||
          parsed.overallConfidence === 'Moderate' ||
          parsed.overallConfidence === 'Exploratory'
            ? parsed.overallConfidence
            : 'Moderate',
        viabilitySignal:
          parsed.viabilitySignal === 'Strong Fit' ||
          parsed.viabilitySignal === 'Promising with Niche Focus' ||
          parsed.viabilitySignal === 'Needs Pivot'
            ? parsed.viabilitySignal
            : 'Promising with Niche Focus',
        savedToBrain: false,
        executiveSummary: String(parsed.executiveSummary || ''),
        marketOverview: {
          text: String(parsed.marketOverviewText || ''),
          factType: 'estimate' as const,
          sources: [
            `AI Analytical Synthesis (${GEMINI_MODEL})`,
            `Workspace Context (${body.brain?.businessName || industry})`,
          ],
        },
        tamSamSom: {
          tamLabel: bands.tamBand,
          tamBasis: String(
            parsed.tamBasis || `Estimated annual category demand across ${geography}.`
          ),
          samLabel: bands.samBand,
          samBasis: String(
            parsed.samBasis || `${samSharePct}% serviceable digital & priority segment share.`
          ),
          somLabel: bands.somBand,
          somBasis: String(
            parsed.somBasis || `${somSharePct}% realistic 24-month capture inside launch markets.`
          ),
          assumptions: [
            {
              id: 'tam',
              label: 'Category Annual Spend ($B)',
              value: tamBillion,
              unit: '$B',
              min: 0.5,
              max: 30,
              step: 0.5,
            },
            {
              id: 'sam',
              label: 'Serviceable Target Share (%)',
              value: samSharePct,
              unit: '%',
              min: 2,
              max: 40,
              step: 1,
            },
            {
              id: 'som',
              label: '24-Month Target Capture (%)',
              value: somSharePct,
              unit: '%',
              min: 0.2,
              max: 10,
              step: 0.2,
            },
          ],
        },
        marketDemand: {
          summary: String(parsed.marketDemandSummary || ''),
          signals: Array.isArray(parsed.demandSignals)
            ? parsed.demandSignals.slice(0, 4).map((s) => {
                const sig = s as { label?: string; trend?: string };
                return {
                  label: String(sig.label || 'Category signal'),
                  trend: String(sig.trend || 'Modelled demand indicator'),
                  factType: 'estimate' as const,
                };
              })
            : [],
        },
        customerSegments: Array.isArray(parsed.customerSegments)
          ? parsed.customerSegments.slice(0, 4)
          : [],
        customerPainPoints: Array.isArray(parsed.customerPainPoints)
          ? parsed.customerPainPoints.slice(0, 4)
          : [],
        competitorLandscapeSummary: String(parsed.competitorLandscapeSummary || ''),
        pricingAnalysis: {
          tiers: Array.isArray(parsed.pricingTiers) ? parsed.pricingTiers.slice(0, 4) : [],
          recommendation: String(parsed.pricingRecommendation || ''),
        },
        marketOpportunities: Array.isArray(parsed.marketOpportunities)
          ? parsed.marketOpportunities.map(String).slice(0, 5)
          : [],
        businessModelOptions: Array.isArray(parsed.businessModelOptions)
          ? parsed.businessModelOptions.slice(0, 3)
          : [],
        revenuePotential: {
          year1Conservative: String(parsed.year1Conservative || '$45,000 – $72,000 ARR (modelled)'),
          year1Target: String(parsed.year1Target || '$110,000 – $165,000 ARR (modelled)'),
          unitEconomicsNote: String(
            parsed.unitEconomicsNote || 'Modelled estimate subject to channel validation.'
          ),
          factType: 'estimate' as const,
        },
        startupCostEstimates: Array.isArray(parsed.startupCostEstimates)
          ? parsed.startupCostEstimates.slice(0, 4)
          : [],
        risksAndChallenges: Array.isArray(parsed.risksAndChallenges)
          ? parsed.risksAndChallenges.slice(0, 4)
          : [],
        validationExperiments: Array.isArray(parsed.validationExperiments)
          ? parsed.validationExperiments.slice(0, 4)
          : [],
        finalRecommendation: {
          verdict: String(parsed.verdict || ''),
          nextSteps: Array.isArray(parsed.nextSteps)
            ? parsed.nextSteps.map(String).slice(0, 4)
            : [],
        },
        sources: [
          {
            title: `Live AI Strategy Synthesis (${ideaSummary.slice(0, 42)})`,
            publisher: `BrainWise AI Engine (${GEMINI_MODEL})`,
            date: todayIso.slice(0, 7),
            reliability: 'Market Estimate' as const,
          },
          {
            title: `${body.brain?.businessName || 'Founder'} Workspace Context`,
            publisher: 'Business Brain Repository',
            date: todayIso,
            reliability: 'Primary' as const,
          },
        ],
      };

      if (body.brain) {
        const verifyContent = `${report.title} ${report.executiveSummary} ${report.marketOverview.text} ${report.pricingAnalysis.recommendation}`;
        report.truthCheck = executeTruthCheck(verifyContent, body.brain);
      }

      res.json({ report, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/playbook', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as PlaybookPayloadBody;
      const category = (body.category || 'Market Validation').trim();
      const title = (body.title || '').trim();
      const focus =
        (body.question || '').trim() ||
        (body.defaultPrompt || '').trim() ||
        'Specialty coffee subscription';

      const ai = getGeminiClient();
      const prompt = [
        'You are BrainWise Strategy Journal.',
        `Playbook category: ${category}`,
        title ? `Playbook thesis: ${title}` : '',
        `User business concept: "${focus}"`,
        'Write a crisp, concrete 2-sentence tactical recommendation applying this exact playbook to the user business concept. No markdown headers or bullet points—just sharp editorial guidance with a measurable test or wedge.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        }),
        12000
      );

      const angle = (response.text || '').trim();
      if (!angle) {
        throw new Error('Model returned an empty playbook response.');
      }

      res.json({ angle, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/recommendations', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as RecommendationsPayloadBody;
      const ai = getGeminiClient();

      const brainSummary = body.brain
        ? `${body.brain.businessName || 'Business'} (${body.brain.industry || 'General'}, ${body.brain.stage || 'Active'}, ${body.brain.location || 'Regional'}) — Positioning: ${body.brain.brandPositioning || 'N/A'} — Target: ${body.brain.targetAudience || 'N/A'}`
        : 'Emerging founder business';

      const competitorsSummary = (body.competitors || [])
        .slice(0, 4)
        .map(
          (c) =>
            `${c.name}: ${c.positioning} (weaknesses: ${(c.weaknesses || []).slice(0, 2).join('; ')})`
        )
        .join(' | ');

      const goalsSummary = (body.goals || [])
        .slice(0, 4)
        .map((g) => `${g.title}: ${g.currentValue}/${g.targetValue} ${g.unit}`)
        .join(' | ');

      const pendingCount = (body.tasks || []).filter((t) => t.status === 'pending').length;

      const prompt = [
        `You are BrainWise Growth Planner (${body.aiTonePreference || 'Executive & Concise'} tone).`,
        `Business Brain: ${brainSummary}`,
        competitorsSummary ? `Competitors: ${competitorsSummary}` : '',
        goalsSummary ? `Active Goals: ${goalsSummary}` : '',
        `Current pending tasks in queue: ${pendingCount}.`,
        'Generate exactly 3 non-redundant, high-leverage next strategic recommendations tailored specifically to the active goals and competitor weaknesses above.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      whatToDo: { type: Type.STRING },
                      whyToDoIt: { type: Type.STRING },
                      supportingResearch: { type: Type.STRING },
                      expectedBenefit: { type: Type.STRING },
                      difficulty: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                      estimatedCost: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                    },
                    required: [
                      'whatToDo',
                      'whyToDoIt',
                      'supportingResearch',
                      'expectedBenefit',
                      'difficulty',
                      'estimatedCost',
                      'priority',
                    ],
                  },
                },
              },
              required: ['recommendations'],
            },
          },
        })
      );

      const parsed = JSON.parse(response.text || '{}') as { recommendations?: unknown[] };
      const items = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [];
      if (items.length === 0) {
        throw new Error('Model returned no recommendations.');
      }

      res.json({ recommendations: items, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/brand-logo', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        prompt?: string;
        styleArchetype?: string;
        mood?: string;
        lockBrandColors?: boolean;
        brand?: {
          brandName?: string;
          industry?: string;
          tagline?: string;
          positioningStatement?: string;
          visualDirection?: string;
          palette?: { name: string; hex: string }[];
        };
      };

      const ai = getGeminiClient();
      const brandName = (body.brand?.brandName || 'Brand').trim();
      const userBrief =
        (body.prompt || '').trim() || `Architectural minimal emblem for ${brandName}`;
      const styleArchetype = (body.styleArchetype || 'Minimal Geometric').trim();
      const mood = (body.mood || 'Editorial Precision').trim();
      const paletteStr = (body.brand?.palette || []).map((p) => `${p.name} (${p.hex})`).join(', ');

      const prompt = [
        'You are BrainWise AI Logo Director — a world-class Swiss/architectural brand identity designer.',
        `Brand Name: ${brandName}`,
        `Industry: ${body.brand?.industry || 'Modern Consumer Brand'}`,
        `Tagline: ${body.brand?.tagline || ''}`,
        `Visual Direction: ${body.brand?.visualDirection || 'Minimalist architectural clarity'}`,
        paletteStr && body.lockBrandColors !== false ? `Locked Brand Palette: ${paletteStr}` : '',
        `Creative Brief: ${userBrief}`,
        `Preferred Style Archetype: ${styleArchetype}`,
        `Mood: ${mood}`,
        'Generate exactly 3 distinct, memorable logo mark concepts.',
        'For EACH concept, output a clean, crisp, self-contained geometric vector SVG icon inside `customSvg` using ONLY `viewBox="0 0 64 64"` with simple geometric primitives (`<path>`, `<circle>`, `<rect>`, `<line>`, `<polygon>`).',
        'CRITICAL SVG RULES: Use `currentColor` for primary structural strokes/fills so it works seamlessly on both light and dark surfaces, and use the concept `accentColor` hex (e.g. #FF7417) for a restrained signature accent element. Never include <script>, <text>, images, or external URLs inside customSvg. Keep viewBox strictly "0 0 64 64" with generous 8px padding.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                concepts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                      styleTag: { type: Type.STRING },
                      markStyle: { type: Type.STRING, enum: ['geometric', 'monogram', 'emblem'] },
                      accentColor: { type: Type.STRING },
                      customSvg: { type: Type.STRING },
                    },
                    required: [
                      'name',
                      'rationale',
                      'styleTag',
                      'markStyle',
                      'accentColor',
                      'customSvg',
                    ],
                  },
                },
              },
              required: ['concepts'],
            },
          },
        }),
        20000
      );

      const parsed = JSON.parse(response.text || '{}') as { concepts?: Record<string, unknown>[] };
      const items = Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 3) : [];
      if (items.length === 0) {
        throw new Error('Model returned no logo concepts.');
      }

      res.json({ concepts: items, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/brand-asset', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        category?: string;
        prompt?: string;
        surfaceMode?: 'light' | 'dark' | 'mixed';
        brand?: {
          brandName?: string;
          tagline?: string;
          positioningStatement?: string;
          visualDirection?: string;
          accentHex?: string;
        };
        brain?: {
          industry?: string;
          location?: string;
          products?: { name: string; priceRange: string; description: string }[];
        };
      };

      const ai = getGeminiClient();
      const category = (body.category || 'Packaging').trim();
      const brandName = (body.brand?.brandName || 'Brand').trim();
      const userBrief =
        (body.prompt || '').trim() ||
        `High-contrast architectural ${category} concept for ${brandName}`;
      const productInfo = (body.brain?.products || [])
        .slice(0, 2)
        .map((p) => `${p.name} (${p.priceRange}): ${p.description}`)
        .join(' | ');

      const prompt = [
        'You are BrainWise AI Brand Designer generating ready-to-approve brand collateral & physical/digital assets.',
        `Brand: ${brandName} (${body.brain?.industry || 'Modern Brand'})`,
        `Tagline: ${body.brand?.tagline || ''}`,
        `Positioning: ${body.brand?.positioningStatement || ''}`,
        `Visual Direction: ${body.brand?.visualDirection || ''}`,
        productInfo ? `Products: ${productInfo}` : '',
        `Asset Category: ${category}`,
        `Surface Preference: ${body.surfaceMode || 'mixed'}`,
        `Founder Creative Brief: ${userBrief}`,
        'Generate exactly 3 distinct art-directed asset variations tailored specifically to this category and brief.',
        'Include an abstract minimal geometric vector motif (`svgMotif`) using viewBox="0 0 120 48" with `currentColor` and accent hex strokes (no <script>, no <text>), crisp headline copy, concise supporting copy, print/production art direction note, and whether darkVariant is true or false.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                variations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      layoutLabel: { type: Type.STRING },
                      headlineText: { type: Type.STRING },
                      subtext: { type: Type.STRING },
                      footerNote: { type: Type.STRING },
                      artDirectionNote: { type: Type.STRING },
                      darkVariant: { type: Type.BOOLEAN },
                      svgMotif: { type: Type.STRING },
                    },
                    required: [
                      'title',
                      'layoutLabel',
                      'headlineText',
                      'subtext',
                      'footerNote',
                      'artDirectionNote',
                      'darkVariant',
                      'svgMotif',
                    ],
                  },
                },
              },
              required: ['variations'],
            },
          },
        }),
        20000
      );

      const parsed = JSON.parse(response.text || '{}') as {
        variations?: Record<string, unknown>[];
      };
      const variations = Array.isArray(parsed.variations) ? parsed.variations.slice(0, 3) : [];
      if (variations.length === 0) {
        throw new Error('Model returned no brand asset variations.');
      }

      res.json({ variations, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/social-creative', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        platform?: 'Instagram Post' | 'Carousel' | 'Facebook Creative' | 'Campaign';
        angle?: string;
        prompt?: string;
        slideCount?: number;
        mood?: string;
        regenerateSlideNumber?: number;
        brand?: {
          brandName?: string;
          tagline?: string;
          positioningStatement?: string;
          visualDirection?: string;
          voice?: string;
        };
        brain?: BusinessBrainData;
      };

      const ai = getGeminiClient();
      const platform = body.platform || 'Carousel';
      const isCarousel = platform === 'Carousel';
      const slideCount = isCarousel ? clampNum(body.slideCount, 3, 7, 5) : 1;
      const brandName = (body.brand?.brandName || 'Brand').trim();
      const userBrief =
        (body.prompt || '').trim() || `High-converting ${platform} for ${brandName}`;

      const prompt = [
        'You are BrainWise AI Social Creative Director crafting scroll-stopping Instagram posts, swipeable carousels, stories, and social ads.',
        `Brand: ${brandName} (${body.brain?.industry || 'Consumer Brand'})`,
        `Target Audience: ${body.brain?.targetAudience || 'Modern buyers'}`,
        `Brand Voice: ${body.brand?.voice || 'Warm, confident, minimalist'}`,
        `Positioning: ${body.brand?.positioningStatement || ''}`,
        `Platform Format: ${platform}`,
        `Campaign Angle: ${body.angle || 'Educational Carousel'}`,
        `Visual Mood: ${body.mood || 'Dark Charcoal Editorial'}`,
        `Creative Prompt: ${userBrief}`,
        body.brain?.strategicMemory
          ? buildAntiFatiguePromptDirectives(body.brain.strategicMemory)
          : '',
        body.regenerateSlideNumber
          ? `Regenerate ONLY slide ${body.regenerateSlideNumber} with a sharper angle, stronger hook, and fresh visual motif, returning a 1-element slides array with slideNumber=${body.regenerateSlideNumber}.`
          : `Generate exactly ${slideCount} cohesive ${isCarousel ? 'swipeable carousel slides flowing from Hook -> Value/Proof -> Clear CTA' : 'high-impact creative slide'} plus a ready-to-post caption, 6 relevant hashtags, and posting rationale.`,
        'For each slide, provide a minimal geometric graphic `svgMotif` using viewBox="0 0 120 48" with `currentColor` and #FF7417 accent strokes (no <script>, no <text>), plus a concise `artDirectionPrompt` describing the photographic/visual backdrop.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                caption: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                postingRationale: { type: Type.STRING },
                slides: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      slideNumber: { type: Type.INTEGER },
                      role: {
                        type: Type.STRING,
                        enum: [
                          'Hook',
                          'Problem',
                          'Insight',
                          'Proof',
                          'Framework',
                          'CTA',
                          'Spotlight',
                        ],
                      },
                      kicker: { type: Type.STRING },
                      headline: { type: Type.STRING },
                      body: { type: Type.STRING },
                      layout: {
                        type: Type.STRING,
                        enum: [
                          'editorial-grid',
                          'split-stat',
                          'quote-focus',
                          'checklist',
                          'product-spotlight',
                        ],
                      },
                      statCallout: { type: Type.STRING },
                      svgMotif: { type: Type.STRING },
                      artDirectionPrompt: { type: Type.STRING },
                    },
                    required: [
                      'slideNumber',
                      'role',
                      'kicker',
                      'headline',
                      'body',
                      'layout',
                      'artDirectionPrompt',
                    ],
                  },
                },
              },
              required: ['title', 'caption', 'hashtags', 'postingRationale', 'slides'],
            },
          },
        }),
        22000
      );

      const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        throw new Error('Model returned no social slides.');
      }

      if (body.brain) {
        const contentToVerify = `${parsed.title || ''} ${parsed.caption || ''}`;
        parsed.truthCheck = executeTruthCheck(contentToVerify, body.brain);
      }

      res.json({ creative: parsed, model: GEMINI_MODEL });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrainWise full-stack server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BrainWise server:', err);
  process.exit(1);
});
