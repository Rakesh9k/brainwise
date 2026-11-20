/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toolRegistry } from './toolRegistry';
import { db } from '../db/firestore';
import type { AiToolExecutionEntity, ToolExecutionContext, ExecutionRiskCategory } from './types';

export class ExecutionEngine {
  /**
   * Dispatches a tool execution with schema checks, permission verification,
   * risk classification, and human approval gating.
   */
  public async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext & { isUserApproved?: boolean }
  ): Promise<{
    status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED' | 'FAILED';
    output?: Record<string, unknown>;
    toolExecutionId: string;
    requiresApproval: boolean;
    riskCategory: ExecutionRiskCategory;
    errorMessage?: string;
  }> {
    const tool = toolRegistry.get(toolName);
    const toolExecutionId = `tex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (!tool) {
      return {
        status: 'FAILED',
        toolExecutionId,
        requiresApproval: false,
        riskCategory: 'LOW',
        errorMessage: `Unknown tool '${toolName}'. Tool is not registered.`,
      };
    }

    const requiresApproval = tool.requiresApproval && !ctx.isUserApproved;

    // Persist tool execution audit record
    const executionEntity: AiToolExecutionEntity = {
      toolExecutionId,
      requestId: ctx.requestId,
      workspaceId: ctx.workspaceId,
      toolName,
      input,
      status: requiresApproval ? 'PENDING' : 'EXECUTING',
      executedAt: now,
    };

    await db
      .doc<AiToolExecutionEntity>(
        `workspaces/${ctx.workspaceId}/aiToolExecutions/${toolExecutionId}`
      )
      .set(executionEntity);

    // If consequential action requires human approval and has not been approved yet:
    if (requiresApproval) {
      return {
        status: 'PENDING_APPROVAL',
        toolExecutionId,
        requiresApproval: true,
        riskCategory: tool.riskCategory,
        output: {
          message: `Tool '${toolName}' is classified as HIGH risk and requires explicit user confirmation before executing.`,
          proposedAction: input,
        },
      };
    }

    // Execute tool
    const startMs = Date.now();
    try {
      const output = await tool.execute(input, ctx);
      const durationMs = Date.now() - startMs;

      await db
        .doc<AiToolExecutionEntity>(
          `workspaces/${ctx.workspaceId}/aiToolExecutions/${toolExecutionId}`
        )
        .update({
          status: 'COMPLETED',
          output: output || {},
          durationMs,
        });

      return {
        status: 'COMPLETED',
        output,
        toolExecutionId,
        requiresApproval: false,
        riskCategory: tool.riskCategory,
      };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorMessage = err instanceof Error ? err.message : 'Tool execution error';

      await db
        .doc<AiToolExecutionEntity>(
          `workspaces/${ctx.workspaceId}/aiToolExecutions/${toolExecutionId}`
        )
        .update({
          status: 'FAILED',
          errorMessage,
          durationMs,
        });

      return {
        status: 'FAILED',
        toolExecutionId,
        requiresApproval: false,
        riskCategory: tool.riskCategory,
        errorMessage,
      };
    }
  }
}

export const executionEngine = new ExecutionEngine();
