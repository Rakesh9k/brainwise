/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { creditService } from '../services/creditService';
import { contextEngine } from './contextEngine';
import { researchEngine } from './researchEngine';
import { strategyEngine } from './strategyEngine';
import { validationEngine } from './validationEngine';
import { executionEngine } from './executionEngine';
import { reportingEngine } from './reportingEngine';
import { memoryEngine } from './memoryEngine';
import { modelRouter } from './modelRouter';
import { promptRegistry } from './promptRegistry';
import { workflowRegistry } from './workflowRegistry';
import { aiRequestRepository } from '../repositories/aiRequestRepository';
import type {
  AiExecutionEntity,
  AiRequestEntity,
  AiResultEntity,
  AiSource,
  AiWorkflowRequest,
  StructuredAiOutput,
} from './types';

export class AiOrchestrator {
  /**
   * Executes the full 15-step AI Orchestration Lifecycle
   */
  public async executeWorkflow(request: AiWorkflowRequest): Promise<StructuredAiOutput> {
    const startTimeMs = Date.now();
    const requestId =
      request.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const { workspaceId, userId, userPrompt } = request;

    // STEP 3: Request Classification & Workflow Lookup
    const workflowDef = workflowRegistry.classifyWorkflow(
      request.department,
      request.workflow,
      userPrompt
    );
    const department = workflowDef.department;
    const workflow = workflowDef.workflow;

    // Persist Initial AI Request Entity
    const requestEntity: AiRequestEntity = {
      requestId,
      workspaceId,
      userId,
      department,
      workflow,
      taskType: request.taskType || workflowDef.outputType,
      status: 'CLASSIFYING',
      idempotencyKey: request.idempotencyKey,
      userPrompt,
      riskCategory: workflowDef.riskCategory,
      requiresApproval: workflowDef.requiresApproval,
      createdAt: now,
    };
    await aiRequestRepository.createRequest(requestEntity);

    // STEP 14A: Credit Pre-Execution Eligibility & Reservation Hold (ADR-006)
    const reservation = await creditService
      .reserveCredits({
        workspaceId,
        userId,
        featureId: workflowDef.creditFeatureId,
        idempotencyKey: request.idempotencyKey,
      })
      .catch(async (err) => {
        await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
          status: 'FAILED',
          errorMessage: `BILLING_ERROR: ${err instanceof Error ? err.message : 'Credit reservation failed'}`,
          completedAt: new Date().toISOString(),
        });
        throw new Error(
          `BILLING_ERROR: ${err instanceof Error ? err.message : 'Credit reservation failed'}`,
          { cause: err }
        );
      });

    try {
      // STEP 4: Context Retrieval via ContextEngine
      await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
        status: 'RETRIEVING_CONTEXT',
      });
      const context = await contextEngine.retrieveContext({
        workspaceId,
        department,
        workflow,
        userPrompt,
      });

      // STEP 5: Historical Memory Retrieval via MemoryEngine
      const relevantMemories = await memoryEngine.retrieveRelevantMemories({
        workspaceId,
        keywords: [workflow, context.industry, context.businessName],
        limit: 4,
      });

      // STEP 6: External Research & Tool Selection
      const sources: AiSource[] = [];

      if (workflowDef.requiredTools.includes('web_research')) {
        await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
          status: 'RESEARCHING',
        });
        const research = await researchEngine.conductResearch({
          workspaceId,
          requestId,
          query: `${context.businessName} ${context.industry} ${userPrompt}`.trim(),
          intent: workflow,
          category: department === 'COMPETITOR_INTELLIGENCE' ? 'competitor' : 'market',
          maxSources: 3,
        });
        sources.push(...research.sources);
        await aiRequestRepository.saveSources(sources);
      }

      // Check for High-Risk Action Execution Tool
      if (workflowDef.requiredTools.includes('task_creator')) {
        const toolResult = await executionEngine.executeTool(
          'task_creator',
          {
            title: userPrompt.length > 5 ? userPrompt : `Execute ${workflowDef.name}`,
            description: `Auto-recommended action derived from ${department} workflow.`,
            department: 'Growth Director',
            priority: 'High',
            estimatedMinutes: 45,
          },
          {
            workspaceId,
            userId,
            requestId,
            riskCategory: workflowDef.riskCategory,
            isUserApproved: false, // Requires human approval gate
          }
        );

        if (toolResult.status === 'PENDING_APPROVAL') {
          await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
            status: 'PENDING_APPROVAL',
            approvalStatus: 'PENDING',
          });

          // Construct pending approval response
          const pendingOutput: StructuredAiOutput = {
            requestId,
            status: 'PENDING_APPROVAL',
            department,
            workflow,
            summary: `Action proposal created for '${userPrompt}'. Requires explicit human confirmation before execution.`,
            result: toolResult.output || {},
            findings: ['Action classified as HIGH risk.', 'Awaiting user sign-off.'],
            verifiedFacts: context.confirmedFacts,
            analysis: ['Human approval gate engaged in accordance with safety directives.'],
            estimates: [],
            assumptions: [],
            recommendations: [],
            missingInformation: [],
            claims: [],
            sources: [],
            confidence: {
              level: 'HIGH',
              explanation: 'Action prepared for approval.',
            },
            validation: {
              status: 'PASSED',
              issues: [],
              warnings: [],
            },
            metadata: {
              model: 'human-approval-gate',
              modelProvider: 'BrainWise Execution Policy',
              promptVersion: 'approval.v1',
              contextVersion: `v${context.brainVersion}`,
              executionDurationMs: Date.now() - startTimeMs,
              creditsDeducted: 0,
              createdAt: now,
            },
          };

          return pendingOutput;
        }
      }

      // STEP 7: Model Selection via ModelRouter
      const routingConfig = modelRouter.routeModel(workflowDef.complexity);
      const provider = modelRouter.getProvider();

      // STEP 8: Prompt Construction via PromptRegistry
      const promptDef = promptRegistry.getActivePrompt(department, workflow);
      const systemInstruction = [
        promptDef.systemInstructions,
        `Business Context: ${context.businessName} (${context.stage} stage in ${context.location})`,
        `Operating Industry: ${context.industry}`,
        relevantMemories.length > 0
          ? `Relevant Business Memories: ${relevantMemories.map((m) => m.content).join('; ')}`
          : '',
        sources.length > 0
          ? `External Research Evidence: ${sources.map((s) => s.evidenceExcerpt).join('; ')}`
          : '',
        'STRICT MANDATE: Return valid JSON matching the required schema. Never promise guaranteed financial returns.',
      ]
        .filter(Boolean)
        .join('\n');

      // STEP 9: Model Execution
      await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
        status: 'EXECUTING_MODEL',
      });

      const { data: rawResult, usage } = await provider.generateStructured<any>({
        model: routingConfig.preferredModel,
        prompt: userPrompt,
        systemInstruction,
        temperature: routingConfig.temperature,
      });

      // STEP 10: Multi-layer Output Validation
      await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
        status: 'VALIDATING',
      });

      const validationRes = validationEngine.validate({
        rawOutput: rawResult,
        context,
        sources,
        userPrompt,
      });

      if (validationRes.validation.status === 'FAILED') {
        // Severe violation / truth discrepancy -> auto-refund credits
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: `Validation failed: ${validationRes.validation.issues.map((i) => i.message).join('; ')}`,
        });

        await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
          status: 'FAILED',
          errorMessage: validationRes.validation.issues[0].message,
          completedAt: new Date().toISOString(),
        });

        throw new Error(`VALIDATION_FAILED: ${validationRes.validation.issues[0].message}`);
      }

      // STEP 11: Grounded Strategic Recommendations via StrategyEngine
      const strategyDiagnosis = strategyEngine.synthesizeStrategy({
        context,
        sources,
        workflow,
        userPrompt,
      });

      // STEP 14B: Credit Settlement (Commit reservation)
      await creditService.settleCredits({
        workspaceId,
        reservation,
        featureId: workflowDef.creditFeatureId,
        notes: `${department}: ${workflowDef.name}`,
      });

      const executionDurationMs = Date.now() - startTimeMs;

      // STEP 13: Result & Execution Persistence
      const executionEntity: AiExecutionEntity = {
        executionId: `exe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        requestId,
        workspaceId,
        provider: usage.provider,
        model: usage.model,
        promptVersion: promptDef.version,
        contextVersion: `v${context.brainVersion}`,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        providerCostUsd: Number(
          (usage.inputTokens * 0.00000015 + usage.outputTokens * 0.0000006).toFixed(6)
        ),
        executionDurationMs,
        status: 'SUCCESS',
        createdAt: now,
      };
      await aiRequestRepository.saveExecution(executionEntity);

      const structuredOutput: StructuredAiOutput = {
        requestId,
        status: 'COMPLETED',
        department,
        workflow,
        summary:
          rawResult.summary ||
          `Strategic synthesis completed for ${context.businessName}. Grounded in verified Business Brain facts.`,
        result: {
          ...(typeof rawResult === 'object' ? rawResult : {}),
          strategyDiagnosis,
        },
        findings: Array.isArray(rawResult.findings)
          ? rawResult.findings
          : strategyDiagnosis.strategicOpportunities,
        verifiedFacts: validationRes.verifiedFacts,
        analysis: [
          `Grounding verified across ${context.confirmedFacts.length} Business Brain facts.`,
          `Evidence supported by ${sources.length} external sources.`,
        ],
        estimates: validationRes.estimates,
        assumptions: validationRes.assumptions,
        recommendations: strategyDiagnosis.recommendations,
        missingInformation: context.inferredAssumptions,
        claims: validationRes.classifiedClaims,
        sources,
        confidence: {
          level: sources.length > 0 ? 'HIGH' : 'MEDIUM',
          score: sources.length > 0 ? 0.92 : 0.85,
          explanation:
            sources.length > 0
              ? 'Multi-source external validation and confirmed Business Brain facts.'
              : 'Directly grounded in confirmed Business Brain knowledge.',
        },
        validation: validationRes.validation,
        metadata: {
          model: usage.model,
          modelProvider: usage.provider,
          promptVersion: promptDef.version,
          contextVersion: `v${context.brainVersion}`,
          executionDurationMs,
          tokensIn: usage.inputTokens,
          tokensOut: usage.outputTokens,
          providerCostUsd: executionEntity.providerCostUsd,
          creditsDeducted: workflowDef.creditCost,
          createdAt: now,
        },
      };

      const resultEntity: AiResultEntity = {
        resultId: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        requestId,
        workspaceId,
        resultType: workflowDef.outputType,
        structuredResult: structuredOutput,
        validationStatus: validationRes.validation.status,
        createdAt: now,
        version: 1,
      };
      await aiRequestRepository.saveResult(resultEntity);

      // Save to reporting engine if dossier/research output
      if (workflowDef.outputType === 'RESEARCH') {
        await reportingEngine.compileAndPersistReport({
          workspaceId,
          userId,
          output: structuredOutput,
        });
      }

      await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      // STEP 15: Return Structured User Response
      return structuredOutput;
    } catch (err) {
      // Automatic rollback refund on upstream failure
      if (reservation && reservation.status === 'HOLD') {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: `Orchestration Failure: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }

      await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Unknown orchestration failure',
        completedAt: new Date().toISOString(),
      });

      throw err;
    }
  }

  /**
   * Approves and executes a request that was held at the Human Approval Gate
   */
  public async approveRequest(params: {
    workspaceId: string;
    userId: string;
    requestId: string;
  }): Promise<{ status: string; result: Record<string, unknown> }> {
    const { workspaceId, userId, requestId } = params;

    const request = await aiRequestRepository.getRequest(workspaceId, requestId);
    if (!request) {
      throw new Error(`Request '${requestId}' not found in workspace '${workspaceId}'`);
    }

    if (request.status !== 'PENDING_APPROVAL') {
      throw new Error(
        `Request '${requestId}' is in status '${request.status}' and does not require approval.`
      );
    }

    // Execute the action with user approval flag
    const toolResult = await executionEngine.executeTool(
      'task_creator',
      {
        title: request.userPrompt,
        description: `Approved operational sprint task from ${request.department}`,
        department: 'Growth Director',
        priority: 'High',
        estimatedMinutes: 30,
      },
      {
        workspaceId,
        userId,
        requestId,
        riskCategory: request.riskCategory,
        isUserApproved: true,
      }
    );

    await aiRequestRepository.updateRequestStatus(workspaceId, requestId, {
      status: 'COMPLETED',
      approvalStatus: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    return {
      status: 'COMPLETED',
      result: toolResult.output || {},
    };
  }
}

export const aiOrchestrator = new AiOrchestrator();
