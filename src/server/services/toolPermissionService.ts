/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { TOOL_REGISTRY, AGENT_REGISTRY } from './agentRegistry';
import { agentAuditLogRepository } from '../repositories/agentAuditLogRepository';
import { executeTruthCheck } from '../../utils/truthCheck';
import type { AgentType, WorkspaceRole } from '../types/api';

export class ToolPermissionService {
  /**
   * Validates whether an agent has authorization to execute a tool,
   * enforcing role boundaries and strict multi-tenant isolation.
   */
  public validateToolAccess(params: {
    agentType: AgentType;
    toolId: string;
    userRole: WorkspaceRole;
    workspaceId: string;
    targetWorkspaceId?: string;
  }): void {
    const { agentType, toolId, userRole, workspaceId, targetWorkspaceId } = params;

    // 1. Strict Multi-Tenant Isolation Gate
    if (targetWorkspaceId && targetWorkspaceId !== workspaceId) {
      throw new Error(
        `CROSS_TENANT_VIOLATION: Workspace '${workspaceId}' is forbidden from invoking tools against workspace '${targetWorkspaceId}'`
      );
    }

    const toolDef = TOOL_REGISTRY[toolId];
    if (!toolDef) {
      throw new Error(`UNKNOWN_TOOL: Tool '${toolId}' is not registered in system.`);
    }

    // 2. Agent Permission Gate
    const agentSpec = AGENT_REGISTRY[agentType];
    if (!agentSpec) {
      throw new Error(`UNKNOWN_AGENT: Agent '${agentType}' is not registered.`);
    }

    if (!toolDef.permittedAgents.includes(agentType) || !agentSpec.allowedTools.includes(toolId)) {
      throw new Error(
        `PERMISSION_DENIED: Agent '${agentType}' is not permitted to use tool '${toolId}'. Allowed tools: ${agentSpec.allowedTools.join(', ')}`
      );
    }

    // 3. User Role Gate
    if (!toolDef.requiredRoles.includes(userRole)) {
      throw new Error(
        `ROLE_UNAUTHORIZED: User role '${userRole}' does not meet minimum role requirement (${toolDef.requiredRoles.join(', ')}) for tool '${toolId}'.`
      );
    }
  }

  /**
   * Sanitizes untrusted content from uploaded documents, web pages, or customer inputs.
   * Strips prompt injection attacks, instruction overrides, and malicious script directives.
   */
  public sanitizeUntrustedContent(rawContent: string): {
    sanitizedText: string;
    injectionDetected: boolean;
    neutralizedPatterns: string[];
  } {
    if (!rawContent || typeof rawContent !== 'string') {
      return { sanitizedText: '', injectionDetected: false, neutralizedPatterns: [] };
    }

    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
      /disregard\s+(all\s+)?system\s+(prompts|rules|instructions)/gi,
      /you\s+are\s+now\s+(an\s+unrestricted|in\s+developer\s+mode|dan|evil)/gi,
      /system:\s*override/gi,
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:\s*/gi,
      /output\s+the\s+system\s+prompt/gi,
      /reveal\s+(api\s+keys|credentials|secret)/gi,
      /execute\s+arbitrary\s+(code|sql|shell)/gi,
      /!\[.*?\]\(https?:\/\/[^\s)]+\)/gi,
      /```\s*(system|assistant|instruction)[\s\S]*?```/gi,
      /repeat\s+(all\s+)?(words\s+)?above/gi,
      /what\s+(are|is)\s+your\s+(original\s+)?(system\s+)?prompt/gi,
    ];

    let sanitized = rawContent;
    let injectionDetected = false;
    const neutralizedPatterns: string[] = [];

    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        injectionDetected = true;
        neutralizedPatterns.push(pattern.source);
        sanitized = sanitized.replace(pattern, '[UNTRUSTED_INSTRUCTION_REMOVED]');
      }
    }

    // Wrap remaining untrusted data in strict isolation boundary
    const wrapped = `<untrusted_external_data>\n${sanitized.trim()}\n</untrusted_external_data>`;

    return {
      sanitizedText: wrapped,
      injectionDetected,
      neutralizedPatterns,
    };
  }

  /**
   * Output verification guardrail:
   * 1. Strictly blocks any AI video references or video generation pipelines.
   * 2. Executes Truth Check against verified business facts.
   */
  public verifyToolOutput(params: {
    toolId: string;
    output: Record<string, unknown>;
    verifiedProfile?: Record<string, unknown>;
  }): { isValid: boolean; error?: string } {
    const { toolId, output, verifiedProfile } = params;
    const serialized = JSON.stringify(output);

    // 1. Strict Video Exclusion Guardrail
    const videoForbiddenPatterns = [
      /\bvideo\s+generation\b/i,
      /\btext-to-video\b/i,
      /\breel\s+generation\b/i,
      /\bremotion\b/i,
      /\bffmpeg\b/i,
      /\bvideo\s+pipeline\b/i,
      /\.mp4\b/i,
    ];

    for (const pat of videoForbiddenPatterns) {
      if (pat.test(serialized)) {
        return {
          isValid: false,
          error: `STRICT_VIDEO_EXCLUSION_VIOLATION: Tool '${toolId}' emitted prohibited video pipeline content matching pattern '${pat.source}'. BrainWise is strictly limited to vector SVG and copywriting collateral.`,
        };
      }
    }

    // 2. Truth Check Guardrail on Copywriting / Pricing Outputs
    const textToCheck =
      (output.copy as string) ||
      (output.text as string) ||
      (output.description as string) ||
      (output.content as string) ||
      '';

    if (textToCheck && verifiedProfile) {
      const brainData: any = {
        ...verifiedProfile,
        products:
          (verifiedProfile as any).products || (verifiedProfile as any).productsAndServices || [],
      };
      const truthResult = executeTruthCheck(textToCheck, brainData);
      const crit = truthResult.violations.find((v) => v.severity === 'critical');
      if (crit || !truthResult.isValid) {
        return {
          isValid: false,
          error: `TRUTH_CHECK_REJECTION: Content failed factual verification (${crit?.type || 'UNVERIFIED'}: ${crit?.explanation || 'Factual inconsistency detected'})`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Executes a tool under strict governance, recording full audit telemetry.
   */
  public async executeTool(params: {
    agentType: AgentType;
    toolId: string;
    workspaceId: string;
    userRole: WorkspaceRole;
    inputPayload: Record<string, unknown>;
    workflowId?: string;
    taskId?: string;
    targetWorkspaceId?: string;
    verifiedProfile?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const {
      agentType,
      toolId,
      workspaceId,
      userRole,
      inputPayload,
      workflowId,
      taskId,
      targetWorkspaceId,
      verifiedProfile,
    } = params;

    const startTime = Date.now();
    const logId = `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    try {
      // 1. Validate Access
      this.validateToolAccess({
        agentType,
        toolId,
        userRole,
        workspaceId,
        targetWorkspaceId,
      });

      // 2. Sanitize any string inputs for prompt injection
      const sanitizedPayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(inputPayload)) {
        if (typeof v === 'string') {
          const res = this.sanitizeUntrustedContent(v);
          sanitizedPayload[k] = res.sanitizedText;
        } else {
          sanitizedPayload[k] = v;
        }
      }

      // 3. Execute Core Tool Simulation / Integration Handler
      const outputResult = await this.dispatchToolExecution(toolId, workspaceId, sanitizedPayload);

      // 4. Verify Output Guardrails
      const verifyResult = this.verifyToolOutput({
        toolId,
        output: outputResult,
        verifiedProfile,
      });

      if (!verifyResult.isValid) {
        throw new Error(verifyResult.error);
      }

      const executionTimeMs = Date.now() - startTime;

      // 5. Immutable Audit Log
      await agentAuditLogRepository.recordLog({
        logId,
        workspaceId,
        workflowId,
        taskId,
        agent: agentType,
        action: `EXECUTE_TOOL_${toolId.toUpperCase()}`,
        toolId,
        riskLevel: TOOL_REGISTRY[toolId].riskLevel,
        authorized: true,
        inputPayloadSummary: JSON.stringify(inputPayload).substring(0, 200),
        outputSummary: JSON.stringify(outputResult).substring(0, 200),
        executionTimeMs,
        costIncurred: AGENT_REGISTRY[agentType].maxCostPerTask * 0.1,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: outputResult };
    } catch (err: any) {
      const executionTimeMs = Date.now() - startTime;

      // Record failed or rejected authorization audit log
      await agentAuditLogRepository.recordLog({
        logId,
        workspaceId,
        workflowId,
        taskId,
        agent: agentType,
        action: `TOOL_EXECUTION_BLOCKED_${toolId.toUpperCase()}`,
        toolId,
        riskLevel: TOOL_REGISTRY[toolId]?.riskLevel || 'LEVEL_1_READ_ONLY',
        authorized: false,
        inputPayloadSummary: JSON.stringify(inputPayload).substring(0, 200),
        outputSummary: `ERROR: ${err.message}`,
        executionTimeMs,
        costIncurred: 0,
        timestamp: new Date().toISOString(),
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Internal deterministic dispatcher for registered tools
   */
  private async dispatchToolExecution(
    toolId: string,
    workspaceId: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    switch (toolId) {
      case 'read_business_context':
        return {
          workspaceId,
          verifiedContextLoaded: true,
          readTimestamp: new Date().toISOString(),
        };

      case 'decompose_objective':
        return {
          subtasksIdentified: 6,
          dependenciesResolved: true,
          estimatedCompletionDays: 30,
        };

      case 'query_competitors':
        return {
          competitorCount: 2,
          findings: [
            'Competitor pricing is 15% higher',
            'Competitor lacks ethical sourcing narrative',
          ],
        };

      case 'generate_positioning_angles':
        return {
          angles: [
            { angle: 'Farm-to-Cup Direct Traceability', theme: 'Authenticity', confidence: 0.92 },
            { angle: 'Precision Small-Batch Roasts', theme: 'Quality', confidence: 0.88 },
          ],
        };

      case 'draft_vector_collateral_svg':
        return {
          assetFormat: 'SVG_VECTOR',
          dimensions: '1080x1080',
          svgMarkup:
            '<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1080" fill="#1A1817"/><text x="540" y="540" fill="#E8D5B5" text-anchor="middle" font-size="48">Artisanal Direct Roasts</text></svg>',
          videoExcluded: true,
        };

      case 'draft_marketing_copy':
        return {
          headline: 'Direct-Trade Single Estate Specialty Roasts',
          body: 'Sourced directly from artisanal growers with farm-gate transparency and zero compromise.',
          callToAction: 'Order Tasting Kit Today',
        };

      case 'structure_campaign_experiment':
        return {
          experimentTitle: (payload.title as string) || '30-Day Growth Sprint',
          channel: (payload.channel as string) || 'Instagram',
          targetMetric: 'CONVERSIONS',
          budgetAllocated: payload.budget || 2500,
        };

      case 'allocate_channel_budget':
        return {
          allocated: payload.amount || 5000,
          currency: (payload.currency as string) || 'INR',
          status: 'PROPOSED_INTERNAL',
        };

      case 'schedule_department_tasks':
        return {
          tasksScheduled: (payload.tasks as any[])?.length || 4,
          scheduleStatus: 'QUEUED',
        };

      case 'package_approval_request':
        return {
          packageCreated: true,
          requiresHumanApproval: true,
          riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
        };

      case 'publish_external_campaign':
        return {
          publishedStatus: 'LIVE',
          channel: payload.channel || 'Instagram Ads',
          liveCampaignId: `camp_ext_${Date.now()}`,
        };

      case 'execute_budget_expenditure':
        return {
          expenditureConfirmed: true,
          amountSpent: payload.amount || 2500,
          currency: payload.currency || 'INR',
          referenceTransaction: `tx_${Date.now()}`,
        };

      case 'update_public_pricing':
        return {
          pricingUpdated: true,
          effectiveTimestamp: new Date().toISOString(),
        };

      case 'compile_outcome_report':
        return {
          executiveSummary: '30-Day Growth sprint completed with positive ROI.',
          roiEstimate: '2.8x',
          conversionsGenerated: 42,
        };

      default:
        return { executed: true, toolId, timestamp: new Date().toISOString() };
    }
  }
}

export const toolPermissionService = new ToolPermissionService();
