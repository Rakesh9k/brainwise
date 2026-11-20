/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AiDepartment, ExecutionRiskCategory, ModelRoutingConfig } from './types';

export interface WorkflowDefinition {
  department: AiDepartment;
  workflow: string;
  name: string;
  description: string;
  complexity: ModelRoutingConfig['taskComplexity'];
  creditCost: number;
  creditFeatureId: string;
  requiredTools: string[];
  riskCategory: ExecutionRiskCategory;
  requiresApproval: boolean;
  requiredContextKeys: string[];
  outputType: 'STRATEGY' | 'RESEARCH' | 'ANALYSIS' | 'ACTION';
}

export class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor() {
    this.registerCoreWorkflows();
  }

  public register(workflow: WorkflowDefinition): void {
    const key = this.getKey(workflow.department, workflow.workflow);
    this.workflows.set(key, workflow);
  }

  public get(department: AiDepartment, workflow: string): WorkflowDefinition | undefined {
    return this.workflows.get(this.getKey(department, workflow));
  }

  public listByDepartment(department: AiDepartment): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).filter((w) => w.department === department);
  }

  public listAll(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public classifyWorkflow(
    department?: AiDepartment,
    workflowName?: string,
    userPrompt?: string
  ): WorkflowDefinition {
    // 1. Direct match
    if (department && workflowName) {
      const direct = this.get(department, workflowName);
      if (direct) return direct;
    }

    // 2. Rule-based classification on prompt if not specified
    const text = (userPrompt || '').toLowerCase();

    if (text.includes('competitor') || text.includes('rival') || text.includes('benchmark')) {
      return this.get('COMPETITOR_INTELLIGENCE', 'competitor_discovery')!;
    }
    if (
      text.includes('market') ||
      text.includes('tam') ||
      text.includes('sam') ||
      text.includes('sizing')
    ) {
      return this.get('MARKET_INTELLIGENCE', 'market_overview')!;
    }
    if (text.includes('customer') || text.includes('persona') || text.includes('segment')) {
      return this.get('CUSTOMER_INTELLIGENCE', 'customer_segmentation')!;
    }
    if (
      text.includes('channel') ||
      text.includes('campaign') ||
      text.includes('marketing') ||
      text.includes('brand')
    ) {
      return this.get('MARKETING_INTELLIGENCE', 'channel_strategy')!;
    }
    if (
      text.includes('metric') ||
      text.includes('kpi') ||
      text.includes('performance') ||
      text.includes('goal')
    ) {
      return this.get('PERFORMANCE_INTELLIGENCE', 'kpi_analysis')!;
    }

    // Default to Business Strategy Growth Plan
    return this.get('BUSINESS_STRATEGY', 'growth_plan')!;
  }

  private getKey(department: AiDepartment, workflow: string): string {
    return `${department}:${workflow}`.toLowerCase();
  }

  private registerCoreWorkflows(): void {
    // 1. Market Intelligence
    this.register({
      department: 'MARKET_INTELLIGENCE',
      workflow: 'market_overview',
      name: 'Market Overview & Industry Trends',
      description:
        'Comprehensive analysis of market dynamics, TAM/SAM/SOM estimates, and external tailwinds.',
      complexity: 'RESEARCH_HEAVY',
      creditCost: 8,
      creditFeatureId: 'FEAT-RES-001',
      requiredTools: ['web_research', 'financial_calculator'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'location', 'industry', 'stage'],
      outputType: 'RESEARCH',
    });

    this.register({
      department: 'MARKET_INTELLIGENCE',
      workflow: 'market_sizing',
      name: 'Addressable Market Sizing',
      description: 'Detailed TAM, SAM, and SOM addressable market range calculations.',
      complexity: 'STANDARD',
      creditCost: 5,
      creditFeatureId: 'FEAT-RES-001',
      requiredTools: ['financial_calculator', 'business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'location', 'industry'],
      outputType: 'RESEARCH',
    });

    // 2. Competitor Intelligence
    this.register({
      department: 'COMPETITOR_INTELLIGENCE',
      workflow: 'competitor_discovery',
      name: 'Competitor Discovery & Profiling',
      description: 'Identifies direct and indirect rivals, pricing tiers, and positioning gaps.',
      complexity: 'RESEARCH_HEAVY',
      creditCost: 8,
      creditFeatureId: 'FEAT-CMP-001',
      requiredTools: ['web_research', 'competitor_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'location', 'industry', 'brandPositioning'],
      outputType: 'RESEARCH',
    });

    this.register({
      department: 'COMPETITOR_INTELLIGENCE',
      workflow: 'pricing_analysis',
      name: 'Competitor Pricing Benchmark',
      description: 'Evaluates rival pricing structure and identifies defensible price points.',
      complexity: 'STANDARD',
      creditCost: 5,
      creditFeatureId: 'FEAT-CMP-002',
      requiredTools: ['competitor_lookup', 'business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'productsAndServices', 'revenueModel'],
      outputType: 'ANALYSIS',
    });

    // 3. Business Strategy
    this.register({
      department: 'BUSINESS_STRATEGY',
      workflow: 'growth_plan',
      name: 'Strategic Growth & Action Roadmap',
      description: 'Prioritized 30-60-90 day growth action plan aligned with business objectives.',
      complexity: 'COMPLEX',
      creditCost: 10,
      creditFeatureId: 'FEAT-STR-001',
      requiredTools: ['business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'stage', 'primaryGoals', 'productsAndServices'],
      outputType: 'STRATEGY',
    });

    this.register({
      department: 'BUSINESS_STRATEGY',
      workflow: 'business_diagnosis',
      name: 'Business Health & SWOT Diagnosis',
      description:
        'Thorough evaluation of business model resilience, weaknesses, and leverage points.',
      complexity: 'STANDARD',
      creditCost: 5,
      creditFeatureId: 'FEAT-STR-002',
      requiredTools: ['business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'stage', 'businessModel', 'primaryGoals'],
      outputType: 'ANALYSIS',
    });

    // 4. Customer Intelligence
    this.register({
      department: 'CUSTOMER_INTELLIGENCE',
      workflow: 'customer_segmentation',
      name: 'Customer Segmentation & Persona Synthesis',
      description:
        'Generates structured ideal customer profiles with pain points and buying triggers.',
      complexity: 'STANDARD',
      creditCost: 5,
      creditFeatureId: 'FEAT-CST-001',
      requiredTools: ['business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'targetAudience', 'location'],
      outputType: 'ANALYSIS',
    });

    // 5. Marketing Intelligence
    this.register({
      department: 'MARKETING_INTELLIGENCE',
      workflow: 'channel_strategy',
      name: 'Customer Acquisition Channel Strategy',
      description:
        'Prioritized acquisition channel evaluation with test budgets and conversion milestones.',
      complexity: 'STANDARD',
      creditCost: 5,
      creditFeatureId: 'FEAT-MKT-001',
      requiredTools: ['business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'stage', 'targetAudience', 'brandPositioning'],
      outputType: 'STRATEGY',
    });

    // 6. Performance Intelligence
    this.register({
      department: 'PERFORMANCE_INTELLIGENCE',
      workflow: 'kpi_analysis',
      name: 'Growth Telemetry & Goal Tracking',
      description: 'Analysis of workspace milestones, pending tasks, and pace toward 30-day goals.',
      complexity: 'SIMPLE',
      creditCost: 3,
      creditFeatureId: 'FEAT-PRF-001',
      requiredTools: ['business_brain_lookup'],
      riskCategory: 'LOW',
      requiresApproval: false,
      requiredContextKeys: ['businessName', 'primaryGoals'],
      outputType: 'ANALYSIS',
    });

    // 7. Consequential Action Execution Workflow (HIGH RISK - Requires Human Approval)
    this.register({
      department: 'BUSINESS_STRATEGY',
      workflow: 'create_sprint_task',
      name: 'Create Growth Sprint Task',
      description:
        'Consequential action that enqueues a live priority sprint task in Growth Planner.',
      complexity: 'SIMPLE',
      creditCost: 1,
      creditFeatureId: 'FEAT-ACT-001',
      requiredTools: ['task_creator'],
      riskCategory: 'HIGH',
      requiresApproval: true,
      requiredContextKeys: ['businessName'],
      outputType: 'ACTION',
    });
  }
}

export const workflowRegistry = new WorkflowRegistry();
