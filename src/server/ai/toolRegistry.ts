/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { researchEngine } from './researchEngine';
import { competitorRepository } from '../repositories/competitorRepository';
import { taskRepository } from '../repositories/taskRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import type { ToolDefinition, ToolExecutionContext } from './types';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerCoreTools();
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.toolName, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getApprovedToolsForDepartment(_department: string): ToolDefinition[] {
    // Return tools relevant for department
    return Array.from(this.tools.values());
  }

  private registerCoreTools(): void {
    // 1. Web Research Tool
    this.register({
      toolName: 'web_research',
      description:
        'Discovers verified external market indicators, competitor shifts, and industry benchmarks.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string', enum: ['market', 'competitor', 'industry', 'pricing'] },
          maxSources: { type: 'number' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          sources: { type: 'array' },
          synthesis: { type: 'string' },
        },
      },
      requiredPermissions: ['workspace.read'],
      riskCategory: 'LOW',
      requiresApproval: false,
      timeoutMs: 15000,
      maxRetries: 2,
      isIdempotent: true,
      execute: async (
        input: { query: string; category?: any; maxSources?: number },
        ctx: ToolExecutionContext
      ) => {
        return await researchEngine.conductResearch({
          workspaceId: ctx.workspaceId,
          requestId: ctx.requestId,
          query: input.query,
          intent: 'External market evidence',
          category: input.category,
          maxSources: input.maxSources || 3,
        });
      },
    });

    // 2. Business Brain Lookup Tool
    this.register({
      toolName: 'business_brain_lookup',
      description: 'Retrieves authoritative confirmed facts from the workspace Business Brain.',
      inputSchema: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['all', 'products', 'goals', 'positioning', 'personas'],
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          profile: { type: 'object' },
        },
      },
      requiredPermissions: ['workspace.read'],
      riskCategory: 'LOW',
      requiresApproval: false,
      timeoutMs: 5000,
      maxRetries: 1,
      isIdempotent: true,
      execute: async (_input: { section?: string }, ctx: ToolExecutionContext) => {
        const profile = await businessProfileRepository.getProfile(ctx.workspaceId);
        return {
          businessName: profile?.businessName || 'Workspace',
          stage: profile?.stage || 'Early Stage',
          location: profile?.location || 'Global',
          industry: (profile as any)?.industry || 'Commercial Services',
          primaryGoals: profile?.primaryGoals || [],
          productsAndServices: profile?.productsAndServices || [],
          customerPersonas: profile?.customerPersonas || [],
        };
      },
    });

    // 3. Competitor Lookup Tool
    this.register({
      toolName: 'competitor_lookup',
      description:
        'Retrieves tracked competitors and monitored movements for the current workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          competitors: { type: 'array' },
        },
      },
      requiredPermissions: ['workspace.read'],
      riskCategory: 'LOW',
      requiresApproval: false,
      timeoutMs: 5000,
      maxRetries: 1,
      isIdempotent: true,
      execute: async (input: { limit?: number }, ctx: ToolExecutionContext) => {
        const list = await competitorRepository.listByWorkspace(ctx.workspaceId);
        return {
          competitors: list.slice(0, input.limit || 5).map((c) => ({
            name: c.name,
            positioning: c.positioning,
            pricingRange: c.pricingRange,
            strengths: c.strengths,
            weaknesses: c.weaknesses,
          })),
        };
      },
    });

    // 4. Financial & Market Sizing Calculator Tool
    this.register({
      toolName: 'financial_calculator',
      description:
        'Computes bounded TAM/SAM/SOM addressable market calculations and unit margin metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          tamBillion: { type: 'number' },
          samSharePct: { type: 'number' },
          somSharePct: { type: 'number' },
        },
        required: ['tamBillion', 'samSharePct', 'somSharePct'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          tamValue: { type: 'string' },
          samValue: { type: 'string' },
          somValue: { type: 'string' },
        },
      },
      requiredPermissions: ['workspace.read'],
      riskCategory: 'LOW',
      requiresApproval: false,
      timeoutMs: 2000,
      maxRetries: 0,
      isIdempotent: true,
      execute: async (input: { tamBillion: number; samSharePct: number; somSharePct: number }) => {
        const tam = Number(input.tamBillion) || 1.0;
        const samPct = Number(input.samSharePct) || 10.0;
        const somPct = Number(input.somSharePct) || 1.0;

        const samMillions = tam * (samPct / 100) * 1000;
        const somMillions = samMillions * (somPct / 100);

        return {
          tamValue: `$${tam.toFixed(1)}B`,
          samValue: `$${samMillions.toFixed(0)}M`,
          somValue: `$${somMillions.toFixed(1)}M`,
          methodology: 'Top-down bounded range formula derived from TAM * SAM% * SOM%',
        };
      },
    });

    // 5. Consequential Task Creation Tool (HIGH RISK - Requires Human Approval Gate)
    this.register({
      toolName: 'task_creator',
      description: 'Creates a real prioritized operational sprint task in Growth Planner.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          department: { type: 'string' },
          priority: { type: 'string', enum: ['Urgent', 'High', 'Medium', 'Low'] },
          estimatedMinutes: { type: 'number' },
        },
        required: ['title'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      requiredPermissions: ['workspace.write'],
      riskCategory: 'HIGH',
      requiresApproval: true,
      timeoutMs: 5000,
      maxRetries: 1,
      isIdempotent: false,
      execute: async (input: any, ctx: ToolExecutionContext) => {
        const now = new Date().toISOString();
        const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const task = {
          taskId,
          workspaceId: ctx.workspaceId,
          title: input.title,
          description: input.description || 'AI Recommended Strategy Action',
          department: input.department || 'Growth Director',
          priority: input.priority || 'Medium',
          status: 'pending' as const,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          estimatedMinutes: input.estimatedMinutes || 30,
          isTodayPriority: true,
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
        };

        await taskRepository.create(task);
        return {
          taskId,
          status: 'created',
          task,
        };
      },
    });
  }
}

export const toolRegistry = new ToolRegistry();
