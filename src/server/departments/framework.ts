/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AiDepartment, ExecutionRiskCategory } from '../ai/types';

export type DepartmentId =
  | 'BUSINESS_BRAIN'
  | 'IDEA_INTELLIGENCE'
  | 'COMPETITIVE_INTELLIGENCE'
  | 'MARKET_WATCH'
  | 'BRAND_STUDIO'
  | 'GROWTH_PLANNER'
  | 'ANALYTICS_REPORTS';

export interface DepartmentWorkflowConfig {
  workflowId: string;
  name: string;
  description: string;
  creditCost: number;
  creditFeatureId: string;
  riskCategory: ExecutionRiskCategory;
  requiresApproval: boolean;
  requiredContextKeys: string[];
  toolsAllowed: string[];
  outputFormat: 'STRATEGY' | 'RESEARCH' | 'ANALYSIS' | 'ACTION' | 'SVG' | 'REPORT';
}

export interface DepartmentConfig {
  departmentId: DepartmentId;
  name: string;
  description: string;
  priorityOrder: number;
  aiDepartment: AiDepartment;
  workflows: DepartmentWorkflowConfig[];
  routesPrefix: string;
}

export interface CrossDepartmentTraceability {
  businessBrainVersion: number;
  referencedCompetitorIds?: string[];
  referencedMarketFindingIds?: string[];
  referencedResearchReportIds?: string[];
  referencedRecommendationIds?: string[];
  referencedExperimentIds?: string[];
  sourceUrls?: string[];
  createdAt: string;
}

export class DepartmentRegistry {
  private departments: Map<DepartmentId, DepartmentConfig> = new Map();

  constructor() {
    this.registerAll();
  }

  public get(id: DepartmentId): DepartmentConfig | undefined {
    return this.departments.get(id);
  }

  public listAll(): DepartmentConfig[] {
    return Array.from(this.departments.values()).sort((a, b) => a.priorityOrder - b.priorityOrder);
  }

  private register(config: DepartmentConfig): void {
    this.departments.set(config.departmentId, config);
  }

  private registerAll(): void {
    // 1. Business Brain
    this.register({
      departmentId: 'BUSINESS_BRAIN',
      name: 'Business Brain',
      description:
        'Central, persistent ground truth of business identity, catalogue, positioning, and goals.',
      priorityOrder: 1,
      aiDepartment: 'BUSINESS_STRATEGY',
      routesPrefix: '/business-profile',
      workflows: [
        {
          workflowId: 'synthesize_brain',
          name: 'Business Brain Synthesis',
          description: 'Synthesizes complete business understanding from inputs & fact provenance.',
          creditCost: 0,
          creditFeatureId: 'FEAT-OB-001',
          riskCategory: 'LOW',
          requiresApproval: true,
          requiredContextKeys: ['businessName', 'stage', 'location'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'ANALYSIS',
        },
        {
          workflowId: 'regenerate_insights',
          name: 'Strategic Insights Refresh',
          description: 'Refreshes AI strategic hypotheses while preserving user confirmed facts.',
          creditCost: 5,
          creditFeatureId: 'FEAT-STR-002',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'stage', 'primaryGoals'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'ANALYSIS',
        },
        {
          workflowId: 'extract_document',
          name: 'Document Knowledge Extraction',
          description:
            'Extracts products, positioning, and audience from uploaded business documents.',
          creditCost: 3,
          creditFeatureId: 'FEAT-DOC-001',
          riskCategory: 'LOW',
          requiresApproval: true,
          requiredContextKeys: ['businessName'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'ANALYSIS',
        },
      ],
    });

    // 2. Idea Intelligence
    this.register({
      departmentId: 'IDEA_INTELLIGENCE',
      name: 'Idea Intelligence',
      description:
        'Market validation, TAM/SAM/SOM sizing, problem analysis, and SWOT for business concepts.',
      priorityOrder: 2,
      aiDepartment: 'MARKET_INTELLIGENCE',
      routesPrefix: '/research',
      workflows: [
        {
          workflowId: 'market_dossier',
          name: 'Commercial Validation Dossier',
          description: 'Grounded market sizing, problem analysis, competitor landscape, and SWOT.',
          creditCost: 8,
          creditFeatureId: 'FEAT-RES-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'industry', 'location', 'targetAudience'],
          toolsAllowed: ['web_research', 'financial_calculator', 'business_brain_lookup'],
          outputFormat: 'RESEARCH',
        },
        {
          workflowId: 'market_sizing',
          name: 'Bottom-up TAM/SAM/SOM Sizing',
          description: 'Transparent formula-driven addressable market calculation.',
          creditCost: 5,
          creditFeatureId: 'FEAT-RES-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'industry', 'location'],
          toolsAllowed: ['financial_calculator', 'business_brain_lookup'],
          outputFormat: 'RESEARCH',
        },
      ],
    });

    // 3. Competitive Intelligence
    this.register({
      departmentId: 'COMPETITIVE_INTELLIGENCE',
      name: 'Competitive Intelligence',
      description:
        'Competitor discovery, website analysis, pricing monitoring, white space mapping, and diff alerts.',
      priorityOrder: 3,
      aiDepartment: 'COMPETITOR_INTELLIGENCE',
      routesPrefix: '/competitors',
      workflows: [
        {
          workflowId: 'competitor_discovery',
          name: 'Competitor Discovery & Gap Analysis',
          description: 'Identifies rivals, pricing tiers, and positioning whitespace.',
          creditCost: 8,
          creditFeatureId: 'FEAT-CMP-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'industry', 'brandPositioning'],
          toolsAllowed: ['web_research', 'competitor_lookup'],
          outputFormat: 'RESEARCH',
        },
        {
          workflowId: 'pricing_analysis',
          name: 'Rival Pricing Scan & Snapshot',
          description: 'Tracks public prices and calculates defensible price points.',
          creditCost: 5,
          creditFeatureId: 'FEAT-CMP-002',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'productsAndServices'],
          toolsAllowed: ['competitor_lookup'],
          outputFormat: 'ANALYSIS',
        },
      ],
    });

    // 4. Market Watch
    this.register({
      departmentId: 'MARKET_WATCH',
      name: 'Market Watch',
      description:
        'Continuous external environment monitoring, news, search demand signals, and trend discovery.',
      priorityOrder: 4,
      aiDepartment: 'MARKET_INTELLIGENCE',
      routesPrefix: '/market-watch',
      workflows: [
        {
          workflowId: 'trend_monitoring',
          name: 'Industry Trend & News Discovery',
          description:
            'Monitors industry shifts, consumer developments, and regulatory announcements.',
          creditCost: 5,
          creditFeatureId: 'FEAT-MKT-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'industry', 'location'],
          toolsAllowed: ['web_research'],
          outputFormat: 'RESEARCH',
        },
      ],
    });

    // 5. Brand Studio
    this.register({
      departmentId: 'BRAND_STUDIO',
      name: 'Brand Studio',
      description:
        'Brand identity guidelines, logo concepts, and vector SVG collateral (STRICT VIDEO EXCLUSION).',
      priorityOrder: 5,
      aiDepartment: 'MARKETING_INTELLIGENCE',
      routesPrefix: '/assets',
      workflows: [
        {
          workflowId: 'vector_collateral',
          name: 'Brand Vector SVG Generation',
          description:
            'Produces high-DPI vector SVG collateral grounded in approved brand identity.',
          creditCost: 5,
          creditFeatureId: 'FEAT-AST-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'brandPositioning', 'valueProposition'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'SVG',
        },
      ],
    });

    // 6. Growth Planner
    this.register({
      departmentId: 'GROWTH_PLANNER',
      name: 'Growth Planner',
      description:
        'Converts intelligence into actionable roadmaps, sprint tasks, growth experiments, and outcome reviews.',
      priorityOrder: 6,
      aiDepartment: 'BUSINESS_STRATEGY',
      routesPrefix: '/tasks',
      workflows: [
        {
          workflowId: 'strategic_growth_plan',
          name: 'Growth Action Roadmap',
          description: 'Synthesizes prioritized acquisition and retention initiatives.',
          creditCost: 10,
          creditFeatureId: 'FEAT-STR-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'stage', 'primaryGoals'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'STRATEGY',
        },
        {
          workflowId: 'create_sprint_task',
          name: 'Enqueue Growth Task (Consequential)',
          description: 'Creates live prioritized action tasks in Growth Planner.',
          creditCost: 1,
          creditFeatureId: 'FEAT-ACT-001',
          riskCategory: 'HIGH',
          requiresApproval: true,
          requiredContextKeys: ['businessName'],
          toolsAllowed: ['task_creator'],
          outputFormat: 'ACTION',
        },
      ],
    });

    // 7. Analytics and Reports
    this.register({
      departmentId: 'ANALYTICS_REPORTS',
      name: 'Analytics and Reports',
      description:
        'Tracks real business KPIs vs AI estimates, experiment outcomes, and generates weekly executive briefs.',
      priorityOrder: 7,
      aiDepartment: 'PERFORMANCE_INTELLIGENCE',
      routesPrefix: '/reports',
      workflows: [
        {
          workflowId: 'executive_report',
          name: 'Executive Intelligence Brief',
          description: 'Synthesizes verified metrics, market shifts, and experiment ROI.',
          creditCost: 5,
          creditFeatureId: 'FEAT-REP-001',
          riskCategory: 'LOW',
          requiresApproval: false,
          requiredContextKeys: ['businessName', 'primaryGoals'],
          toolsAllowed: ['business_brain_lookup'],
          outputFormat: 'REPORT',
        },
      ],
    });
  }

  /**
   * Retrieves authorized external integration records for a given department.
   * Maps department authorizations to permitted integration providers and categories.
   */
  public async getDepartmentExternalContext(
    workspaceId: string,
    departmentId: DepartmentId
  ): Promise<{
    departmentId: DepartmentId;
    authorizedProviders: string[];
    records: import('../integrations/types').NormalizedDataRecord[];
    unifiedSummary: {
      verifiedSourcesCount: number;
      primarySignals: string[];
      hasAnomalies: boolean;
      dataProvenanceLevel: 'VERIFIED_EXTERNAL' | 'INTERNAL_ONLY';
    };
  }> {
    const { dataIngestionService } = await import('../integrations/dataIngestionService');
    const { integrationManager } = await import('../integrations/integrationManager');

    const providerMap: Record<DepartmentId, string[]> = {
      BUSINESS_BRAIN: ['google-drive', 'google-research'],
      IDEA_INTELLIGENCE: ['google-research', 'google-search-console'],
      COMPETITIVE_INTELLIGENCE: ['google-research', 'google-business-profile'],
      MARKET_WATCH: ['google-research', 'google-analytics-4', 'google-search-console'],
      BRAND_STUDIO: ['meta-instagram', 'linkedin-marketing', 'google-drive'],
      GROWTH_PLANNER: ['google-analytics-4', 'google-search-console', 'email-service'],
      ANALYTICS_REPORTS: [
        'google-analytics-4',
        'google-search-console',
        'google-business-profile',
        'youtube-data',
        'email-service',
      ],
    };

    const authorizedProviders = providerMap[departmentId] || [];
    const activeConnections = await integrationManager.listConnections(workspaceId);
    const activeProviderIds = new Set(activeConnections.map((c) => c.provider));

    const connectedAndAuthorized = authorizedProviders.filter((p) => activeProviderIds.has(p));
    const allRecords = await dataIngestionService.getWorkspaceRecords(workspaceId, { limit: 10 });
    const records = allRecords.filter((r) => connectedAndAuthorized.includes(r.provider));

    const signals: string[] = [];
    if (records.some((r) => r.provider === 'google-analytics-4')) {
      signals.push('GA4 Real-Time User Sessions & Period-over-Period Delta Available');
    }
    if (records.some((r) => r.provider === 'google-search-console')) {
      signals.push('Google Search Console Organic Impressions & Ranking CTR Ingested');
    }
    if (records.some((r) => r.provider === 'google-research')) {
      signals.push('Google Search Market Intelligence & Industry Benchmark Signals Verified');
    }
    if (records.some((r) => r.provider === 'google-business-profile')) {
      signals.push('Google Business Profile Local Maps & Direction Inquiries Linked');
    }

    return {
      departmentId,
      authorizedProviders: connectedAndAuthorized,
      records,
      unifiedSummary: {
        verifiedSourcesCount: records.length,
        primarySignals:
          signals.length > 0
            ? signals
            : ['No external integrations connected for this department yet.'],
        hasAnomalies: false,
        dataProvenanceLevel: records.length > 0 ? 'VERIFIED_EXTERNAL' : 'INTERNAL_ONLY',
      },
    };
  }
}

export const departmentRegistry = new DepartmentRegistry();

export const getDepartmentExternalContext = (workspaceId: string, departmentId: DepartmentId) =>
  departmentRegistry.getDepartmentExternalContext(workspaceId, departmentId);
