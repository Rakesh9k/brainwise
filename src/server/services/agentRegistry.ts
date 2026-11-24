/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentType,
  AgentToolDefinition,
  ToolRiskLevel,
  StandardDepartmentType,
} from '../types/api';

export interface AgentSpecification {
  agentType: AgentType;
  department: StandardDepartmentType;
  name: string;
  roleDescription: string;
  allowedRiskLevels: ToolRiskLevel[];
  allowedTools: string[];
  maxExecutionTimeoutMs: number;
  maxCostPerTask: number;
  retryPolicy: {
    maxRetries: number;
    initialBackoffMs: number;
  };
}

export const AGENT_REGISTRY: Record<AgentType, AgentSpecification> = {
  STRATEGY_AGENT: {
    agentType: 'STRATEGY_AGENT',
    department: 'STRATEGY',
    name: 'Executive Strategy Coordinator',
    roleDescription:
      'Decomposes high-level business objectives into DAG workflows, monitors progress, and compiles executive performance reports.',
    allowedRiskLevels: ['LEVEL_1_READ_ONLY'],
    allowedTools: [
      'read_business_context',
      'decompose_objective',
      'evaluate_workflow_progress',
      'compile_outcome_report',
    ],
    maxExecutionTimeoutMs: 30000,
    maxCostPerTask: 50,
    retryPolicy: { maxRetries: 3, initialBackoffMs: 500 },
  },
  RESEARCH_AGENT: {
    agentType: 'RESEARCH_AGENT',
    department: 'RESEARCH',
    name: 'Market & Competitive Intelligence Agent',
    roleDescription:
      'Conducts read-only queries against competitor databases, market signals, and customer segmentation records.',
    allowedRiskLevels: ['LEVEL_1_READ_ONLY'],
    allowedTools: ['query_competitors', 'query_market_trends', 'query_customer_personas'],
    maxExecutionTimeoutMs: 25000,
    maxCostPerTask: 30,
    retryPolicy: { maxRetries: 3, initialBackoffMs: 500 },
  },
  IDEA_AGENT: {
    agentType: 'IDEA_AGENT',
    department: 'STRATEGY',
    name: 'Opportunity & Positioning Ideator',
    roleDescription:
      'Synthesizes value propositions, unique positioning angles, and product differentiation opportunities.',
    allowedRiskLevels: ['LEVEL_1_READ_ONLY'],
    allowedTools: ['generate_positioning_angles', 'score_opportunities'],
    maxExecutionTimeoutMs: 20000,
    maxCostPerTask: 25,
    retryPolicy: { maxRetries: 2, initialBackoffMs: 500 },
  },
  CREATIVE_AGENT: {
    agentType: 'CREATIVE_AGENT',
    department: 'CREATIVE',
    name: 'Brand Studio Asset Specialist',
    roleDescription:
      'Generates deterministic copywriting packs and SVG vector marketing collateral. STRICT VIDEO EXCLUSION.',
    allowedRiskLevels: ['LEVEL_2_REVERSIBLE_INTERNAL'],
    allowedTools: ['draft_vector_collateral_svg', 'draft_marketing_copy'],
    maxExecutionTimeoutMs: 30000,
    maxCostPerTask: 40,
    retryPolicy: { maxRetries: 2, initialBackoffMs: 500 },
  },
  CAMPAIGN_AGENT: {
    agentType: 'CAMPAIGN_AGENT',
    department: 'MARKETING',
    name: 'Growth Campaign Architect',
    roleDescription:
      'Structures marketing campaigns, allocates budget across channels, and prepares experiment milestones.',
    allowedRiskLevels: ['LEVEL_2_REVERSIBLE_INTERNAL'],
    allowedTools: ['structure_campaign_experiment', 'allocate_channel_budget'],
    maxExecutionTimeoutMs: 25000,
    maxCostPerTask: 35,
    retryPolicy: { maxRetries: 2, initialBackoffMs: 500 },
  },
  OPERATIONS_AGENT: {
    agentType: 'OPERATIONS_AGENT',
    department: 'CUSTOMER_SUCCESS',
    name: 'Workflow & Task Sequencer',
    roleDescription:
      'Sequences department task execution, manages task prerequisites, and packages Level 3 human approval requests.',
    allowedRiskLevels: ['LEVEL_1_READ_ONLY', 'LEVEL_2_REVERSIBLE_INTERNAL'],
    allowedTools: ['schedule_department_tasks', 'package_approval_request'],
    maxExecutionTimeoutMs: 20000,
    maxCostPerTask: 20,
    retryPolicy: { maxRetries: 3, initialBackoffMs: 500 },
  },
  PUBLISHING_AGENT: {
    agentType: 'PUBLISHING_AGENT',
    department: 'SALES',
    name: 'Consequential Execution Agent',
    roleDescription:
      'Performs external consequential actions including live publishing, budget spend, and pricing modifications after mandatory human approval.',
    allowedRiskLevels: ['LEVEL_3_EXTERNAL_CONSEQUENTIAL'],
    allowedTools: [
      'publish_external_campaign',
      'execute_budget_expenditure',
      'update_public_pricing',
    ],
    maxExecutionTimeoutMs: 40000,
    maxCostPerTask: 100,
    retryPolicy: { maxRetries: 1, initialBackoffMs: 1000 },
  },
};

export const TOOL_REGISTRY: Record<string, AgentToolDefinition> = {
  // Level 1: Read-Only Intelligence Tools
  read_business_context: {
    toolId: 'read_business_context',
    name: 'Read Business Context',
    description: 'Retrieves verified profile facts, brand guidelines, and resource constraints.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['STRATEGY_AGENT', 'OPERATIONS_AGENT'],
    requiredRoles: ['owner', 'admin', 'member', 'viewer'],
    maxTimeoutMs: 10000,
  },
  decompose_objective: {
    toolId: 'decompose_objective',
    name: 'Decompose Objective into Tasks',
    description:
      'Deconstructs high-level business goals into a structured DAG of department tasks.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['STRATEGY_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  evaluate_workflow_progress: {
    toolId: 'evaluate_workflow_progress',
    name: 'Evaluate Workflow Progress',
    description: 'Assesses completed task outputs and calculates progress percentage.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['STRATEGY_AGENT', 'OPERATIONS_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 10000,
  },
  compile_outcome_report: {
    toolId: 'compile_outcome_report',
    name: 'Compile Outcome Report',
    description:
      'Synthesizes final outcome summary, return on investment, and department learnings.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['STRATEGY_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  query_competitors: {
    toolId: 'query_competitors',
    name: 'Query Competitors',
    description: 'Fetches competitor strengths, weaknesses, and market positioning records.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['RESEARCH_AGENT'],
    requiredRoles: ['owner', 'admin', 'member', 'viewer'],
    maxTimeoutMs: 10000,
  },
  query_market_trends: {
    toolId: 'query_market_trends',
    name: 'Query Market Trends',
    description: 'Scans industry topics, seasonal cycles, and market demand indices.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['RESEARCH_AGENT'],
    requiredRoles: ['owner', 'admin', 'member', 'viewer'],
    maxTimeoutMs: 10000,
  },
  query_customer_personas: {
    toolId: 'query_customer_personas',
    name: 'Query Customer Personas',
    description: 'Retrieves verified customer segments, pain points, and objections.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['RESEARCH_AGENT'],
    requiredRoles: ['owner', 'admin', 'member', 'viewer'],
    maxTimeoutMs: 10000,
  },
  generate_positioning_angles: {
    toolId: 'generate_positioning_angles',
    name: 'Generate Positioning Angles',
    description: 'Formulates unique campaign angles and checks for thematic fatigue.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['IDEA_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  score_opportunities: {
    toolId: 'score_opportunities',
    name: 'Score Opportunities',
    description: 'Ranks commercial ideas using multidimensional ICE / RICE scoring criteria.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['IDEA_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 10000,
  },

  // Level 2: Reversible Internal Actions
  draft_vector_collateral_svg: {
    toolId: 'draft_vector_collateral_svg',
    name: 'Draft Vector Collateral (SVG)',
    description:
      'Generates high-DPI vector SVG marketing assets (stationery, flyers, carousels). Video is STRICTLY EXCLUDED.',
    riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
    permittedAgents: ['CREATIVE_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 25000,
  },
  draft_marketing_copy: {
    toolId: 'draft_marketing_copy',
    name: 'Draft Marketing Copy',
    description:
      'Generates headline packs, ad copy, and sales outreach text with Truth Check verification.',
    riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
    permittedAgents: ['CREATIVE_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 20000,
  },
  structure_campaign_experiment: {
    toolId: 'structure_campaign_experiment',
    name: 'Structure Campaign Experiment',
    description: 'Sets up a growth sprint hypothesis, target metrics, and tracking parameters.',
    riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
    permittedAgents: ['CAMPAIGN_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  allocate_channel_budget: {
    toolId: 'allocate_channel_budget',
    name: 'Allocate Channel Budget',
    description: 'Proposes internal marketing budget distribution within operating ceilings.',
    riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
    permittedAgents: ['CAMPAIGN_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  schedule_department_tasks: {
    toolId: 'schedule_department_tasks',
    name: 'Schedule Department Tasks',
    description: 'Registers department execution tasks in internal task ledgers.',
    riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
    permittedAgents: ['OPERATIONS_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 15000,
  },
  package_approval_request: {
    toolId: 'package_approval_request',
    name: 'Package Approval Request',
    description: 'Compiles consequential actions into a pending human approval package.',
    riskLevel: 'LEVEL_1_READ_ONLY',
    permittedAgents: ['OPERATIONS_AGENT'],
    requiredRoles: ['owner', 'admin', 'member'],
    maxTimeoutMs: 10000,
  },

  // Level 3: External Consequential Actions (Mandatory Approval Gating)
  publish_external_campaign: {
    toolId: 'publish_external_campaign',
    name: 'Publish External Campaign',
    description:
      'Launches live public advertisements or marketing collateral to external channels.',
    riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
    permittedAgents: ['PUBLISHING_AGENT'],
    requiredRoles: ['owner', 'admin'],
    maxTimeoutMs: 30000,
  },
  execute_budget_expenditure: {
    toolId: 'execute_budget_expenditure',
    name: 'Execute Budget Expenditure',
    description: 'Commits financial funds or triggers live ad spend with external providers.',
    riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
    permittedAgents: ['PUBLISHING_AGENT'],
    requiredRoles: ['owner', 'admin'],
    maxTimeoutMs: 30000,
  },
  update_public_pricing: {
    toolId: 'update_public_pricing',
    name: 'Update Public Pricing',
    description: 'Modifies customer-facing product pricing structures in live commerce channels.',
    riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
    permittedAgents: ['PUBLISHING_AGENT'],
    requiredRoles: ['owner', 'admin'],
    maxTimeoutMs: 30000,
  },
};
