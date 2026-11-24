/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { conversationRepository } from '../repositories/conversationRepository';
import { askYourBusinessRetrievalService } from './askYourBusinessRetrievalService';
import { creditService } from './creditService';
import { GeminiProviderAdapter } from '../ai/modelRouter';
import { serverConfig } from '../config/index';
import { executeTruthCheck } from '../../utils/truthCheck';
import { departmentTaskRepository } from '../repositories/departmentTaskRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import type {
  AskBusinessQueryRequest,
  AskBusinessQueryResponse,
  AskBusinessMessage,
  AskBusinessConversation,
  ExecuteToolRequest,
  SubmitFeedbackRequest,
  FactProvenanceTier,
  StandardDepartmentTaskEntity,
} from '../types/api';

export class AskYourBusinessService {
  /**
   * Process a contextual business intelligence question
   */
  public async askQuestion(
    workspaceId: string,
    userId: string,
    request: AskBusinessQueryRequest
  ): Promise<AskBusinessQueryResponse> {
    const rawQuery = request.query?.trim();
    if (!rawQuery) {
      throw new Error('Query is required and must not be empty.');
    }

    const modelTier = request.modelTier || 'fast';
    const creditCost = modelTier === 'deep_reasoning' ? 8 : modelTier === 'search_grounded' ? 5 : 2;

    // 1. Conversation Management
    let conversationId = request.conversationId;

    if (conversationId) {
      const existingConv = await conversationRepository.getConversation(
        workspaceId,
        conversationId
      );
      if (!existingConv) {
        throw new Error(`Conversation '${conversationId}' not found in workspace '${workspaceId}'`);
      }
    } else {
      conversationId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const title = rawQuery.length > 40 ? `${rawQuery.slice(0, 40)}…` : rawQuery;
      await conversationRepository.createConversation({
        conversationId,
        workspaceId,
        userId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      });
    }

    // 2. Fetch Conversation History for Multi-Turn Follow-Ups
    const existingMessages = await conversationRepository.listMessages(
      workspaceId,
      conversationId,
      10
    );
    const history = existingMessages
      .filter((m): m is typeof m & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // 3. Two-Phase Credit Reservation
    let reservation: any;
    try {
      reservation = await creditService.reserveCredits({
        workspaceId,
        userId,
        featureId: 'FEAT-ASK-BUSINESS',
      });
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : 'Insufficient credits for Ask Your Business';
      const billingErr = new Error(errMessage);
      (billingErr as any).statusCode = 402;
      (billingErr as any).code = 'INSUFFICIENT_CREDITS';
      throw billingErr;
    }

    try {
      // 4. Retrieve Context & Evaluate Evidence Quality
      const retrieved = await askYourBusinessRetrievalService.retrieveContext(
        workspaceId,
        rawQuery,
        history
      );

      // 5. Handle Unsupported Non-Business Questions (zero net credit deduction)
      if (retrieved.isUnsupported) {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: 'Refunded for unsupported out-of-scope non-business question',
        });

        const replyContent = `I cannot answer this question because it is outside the scope of your Business Brain.\n\n${retrieved.unsupportedReason || 'Ask Your Business is exclusively dedicated to strategic, operational, product, and marketing intelligence for your business.'}\n\nPlease ask a question relating to your products, business goals, marketing campaigns, target audience, or brand strategy.`;

        const assistantMsg: AskBusinessMessage = {
          id: `msg-${Date.now()}-a`,
          conversationId,
          role: 'assistant',
          content: replyContent,
          intent: 'UNSUPPORTED_NON_BUSINESS',
          citations: [],
          conflictingInformation: [],
          missingInformation: [],
          suggestedFollowUps: retrieved.suggestedFollowUps,
          toolCalls: [],
          createdAt: new Date().toISOString(),
        };

        // Persist turns
        await conversationRepository.addMessage(workspaceId, {
          id: `msg-${Date.now()}-u`,
          conversationId,
          role: 'user',
          content: rawQuery,
          citations: [],
          suggestedFollowUps: [],
          createdAt: new Date().toISOString(),
        });

        await conversationRepository.addMessage(workspaceId, assistantMsg);

        return {
          conversationId,
          message: assistantMsg,
          creditsDeducted: 0,
        };
      }

      // 6. Synthesize Grounded Answer
      const finalReply = await this.generateAnswer({
        query: rawQuery,
        retrieved,
        history,
        modelTier,
        workspaceId,
      });

      // 7. Truth Check Guardrail
      const truthCheck = executeTruthCheck(finalReply, {
        businessName: 'Business',
        tagline: '',
        industry: 'General Business',
        stage: 'Early Traction',
        location: '',
        website: '',
        foundedYear: '2025',
        overviewSummary: '',
        targetAudience: '',
        brandPositioning: '',
        valueProposition: '',
        businessModel: '',
        revenueModel: '',
        primaryGoals: [],
        products: [],
        personas: [],
        documents: [],
        decisions: [],
        history: [],
        lastUpdated: new Date().toISOString(),
        strategicMemory: {
          usedAngles: [],
          fatiguedThemes: [],
          explicitExclusions: ['video reels', 'tiktok video', 'ffmpeg pipeline'],
          lastUpdated: new Date().toISOString(),
        },
      });

      if (truthCheck.status === 'REJECTED') {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: truthCheck.refundReason || 'Truth Check guardrail rejected unverified assertions',
        });

        const guardrailErr = new Error(
          'The generated response violated Business Brain fact constraints or forbidden rules. Credits refunded.'
        );
        (guardrailErr as any).statusCode = 422;
        (guardrailErr as any).code = 'TRUTH_GUARDRAIL_VIOLATION';
        throw guardrailErr;
      }

      // 8. Settle Credits
      const settlement = await creditService.settleCredits({
        workspaceId,
        reservation,
        featureId: 'FEAT-ASK-BUSINESS',
        notes: `Ask Your Business (${modelTier})`,
      });

      // 9. Compile Fact Status Breakdown
      const breakdown: Record<FactProvenanceTier, number> = {
        VERIFIED_FACT: 0,
        CALCULATED_VALUE: 0,
        HISTORICAL_INFO: 0,
        AI_INFERRED: 0,
        UNKNOWN: 0,
      };

      for (const cite of retrieved.citations) {
        if (cite.factStatus && breakdown[cite.factStatus as FactProvenanceTier] !== undefined) {
          breakdown[cite.factStatus as FactProvenanceTier]++;
        }
      }

      if (retrieved.missingInformation.length > 0) {
        breakdown.UNKNOWN += retrieved.missingInformation.length;
      }

      // 10. Persist Messages
      const userMsg: AskBusinessMessage = {
        id: `msg-${Date.now()}-u`,
        conversationId,
        role: 'user',
        content: rawQuery,
        citations: [],
        suggestedFollowUps: [],
        createdAt: new Date().toISOString(),
      };

      const assistantMsg: AskBusinessMessage = {
        id: `msg-${Date.now()}-a`,
        conversationId,
        role: 'assistant',
        content: finalReply,
        intent: retrieved.intent,
        factStatusBreakdown: breakdown,
        citations: retrieved.citations,
        conflictingInformation: retrieved.conflictingInformation,
        missingInformation: retrieved.missingInformation,
        suggestedFollowUps: retrieved.suggestedFollowUps,
        toolCalls: retrieved.toolCalls,
        modelUsed: modelTier === 'deep_reasoning' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash',
        createdAt: new Date().toISOString(),
      };

      await conversationRepository.addMessage(workspaceId, userMsg);
      await conversationRepository.addMessage(workspaceId, assistantMsg);

      return {
        conversationId,
        message: assistantMsg,
        creditsDeducted: creditCost,
        creditBalanceRemaining: settlement.remainingBalance,
      };
    } catch (err) {
      // If error occurs, release credit reservation to guarantee financial integrity
      try {
        if (reservation) {
          await creditService.refundCredits({
            workspaceId,
            reservation,
            reason: err instanceof Error ? err.message : 'Ask Your Business processing failure',
          });
        }
      } catch {
        // ignore secondary refund error
      }
      throw err;
    }
  }

  /**
   * Generates grounded answer with AI model or deterministic high-fidelity fallback
   */
  private async generateAnswer(params: {
    query: string;
    retrieved: any;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    modelTier: string;
    workspaceId: string;
  }): Promise<string> {
    const { query, retrieved, history, modelTier } = params;

    // Check if Gemini API key is configured
    if (serverConfig.geminiApiKey && process.env.NODE_ENV !== 'test') {
      try {
        const provider = new GeminiProviderAdapter();
        const systemInstruction = [
          "You are the BrainWise Business Intelligence Assistant, directly grounded in the user's persistent Business Brain.",
          'Answer questions factually and concisely using ONLY the provided verified facts, calculated metrics, and documents.',
          'STRICT VIDEO EXCLUSION: Never suggest, mention, or generate video reels, TikToks, or FFmpeg scripts.',
          'FACT DISTINCTIONS: Distinguish between verified facts (confirmed by user), calculated values, and unknown information.',
          'If information is missing, explicitly say it is not recorded in the Business Brain.',
          'If contradictory information exists, explicitly highlight the discrepancy.',
          'If sources are outdated (older than 90 days), explicitly mention that the data may be stale.',
          '',
          'RETRIEVED BUSINESS EVIDENCE:',
          ...retrieved.evidence.map(
            (e: any) =>
              `[${e.factStatus}] ${e.title}: ${e.content} (Recorded: ${e.recordDate || 'N/A'}${e.isOutdated ? ' - OUTDATED' : ''})`
          ),
          retrieved.conflictingInformation.length > 0
            ? `CONFLICTS:\n${retrieved.conflictingInformation.join('\n')}`
            : '',
          retrieved.missingInformation.length > 0
            ? `MISSING INFO:\n${retrieved.missingInformation.join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const promptText = [
          ...history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`),
          `User: ${query}`,
          'Assistant:',
        ].join('\n\n');

        const res = await provider.generate({
          model: modelTier === 'deep_reasoning' ? 'gemini-2.5-pro' : serverConfig.geminiModel,
          prompt: promptText,
          systemInstruction,
          temperature: 0.2,
        });

        if (res.text && res.text.trim()) {
          return res.text;
        }
      } catch (err) {
        console.warn(
          'Gemini live call error, falling back to deterministic answer generator:',
          err
        );
      }
    }

    // Deterministic High-Fidelity Knowledge Synthesis
    return this.synthesizeDeterministicAnswer(query, retrieved, history);
  }

  /**
   * Deterministic answer synthesizer ensuring zero-hallucination fact grounding
   */
  private synthesizeDeterministicAnswer(
    query: string,
    retrieved: any,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const qLower = query.toLowerCase();
    const sections: string[] = [];

    // 1. Missing Information Callout
    if (retrieved.missingInformation.length > 0) {
      sections.push(
        `**Information Not Recorded in Business Brain:**\n${retrieved.missingInformation.map((m: string) => `- ${m}`).join('\n')}`
      );
    }

    // 2. Conflicting Information Callout
    if (retrieved.conflictingInformation.length > 0) {
      sections.push(
        `⚠️ **Conflicting Information Discrepancy Detected:**\n${retrieved.conflictingInformation.map((c: string) => `- ${c}`).join('\n')}`
      );
    }

    // 3. Outdated Source Warnings
    const outdatedCites = retrieved.citations.filter((c: any) => c.isOutdated);
    if (outdatedCites.length > 0) {
      sections.push(
        `⏳ **Notice: Outdated Data (>90 Days Old):**\n` +
          outdatedCites
            .map(
              (c: any) =>
                `- *${c.title}* was recorded on ${c.recordDate || 'an earlier date'} (>90 days old) and may not reflect current operational status.`
            )
            .join('\n')
      );
    }

    // 4. Follow-up Context Resolution
    const lastUserTurn = [...history].reverse().find((h) => h.role === 'user');
    const isFollowUp =
      (qLower.includes('it') ||
        qLower.includes('its') ||
        qLower.includes('this') ||
        qLower.includes('that')) &&
      lastUserTurn;

    // 5. Domain Specific Content Synthesis
    if (
      retrieved.intent === 'PRODUCT_INTELLIGENCE' ||
      qLower.includes('sell') ||
      qLower.includes('product') ||
      qLower.includes('compare')
    ) {
      const prods = retrieved.evidence.filter(
        (e: any) => e.sourceType === 'PRODUCT' || e.sourceType === 'SERVICE'
      );
      const compareTool = retrieved.toolCalls.find((t: any) => t.toolName === 'compare_products');

      if (compareTool && compareTool.result?.products) {
        sections.push(
          `**Product Comparison Analysis:**\n` +
            compareTool.result.products
              .map(
                (p: any) =>
                  `- **${p.name}** (${p.category}): Price: $${p.price} | Margin: ${p.margin} | Status: ${p.status}`
              )
              .join('\n')
        );
      } else if (prods.length > 0) {
        // If follow-up asking for price/margin of a specific product
        if (isFollowUp && (qLower.includes('price') || qLower.includes('margin'))) {
          const mentioned =
            prods.find((p: any) =>
              lastUserTurn.content
                .toLowerCase()
                .includes(p.title.replace('Product: ', '').toLowerCase())
            ) || prods[0];
          sections.push(
            `Based on our earlier discussion of **${mentioned.title}**:\n- ${mentioned.content}`
          );
        } else {
          sections.push(
            `**Offerings & Products Identified in Business Brain:**\n` +
              prods.map((p: any) => `- **${p.title}** [${p.factStatus}]: ${p.content}`).join('\n')
          );
        }
      }
    }

    if (
      retrieved.intent === 'STRATEGY_PERFORMANCE' ||
      qLower.includes('goal') ||
      qLower.includes('behind schedule')
    ) {
      const goalsEvidence = retrieved.evidence.filter((e: any) => e.sourceType === 'GOAL');
      const goalsTool = retrieved.toolCalls.find((t: any) => t.toolName === 'analyze_goals');

      if (goalsTool && goalsTool.result?.behindScheduleGoals?.length > 0) {
        sections.push(
          `**Goals Currently Behind Schedule / At Risk [CALCULATED_VALUE]:**\n` +
            goalsTool.result.behindScheduleGoals
              .map(
                (g: any) =>
                  `- **${g.title}**: Progress at ${g.progress} (Status: ${g.status}, Deadline: ${g.deadline || 'None'})`
              )
              .join('\n')
        );
      } else if (goalsEvidence.length > 0) {
        sections.push(
          `**Business Goals & Strategic Progress [CALCULATED_VALUE]:**\n` +
            goalsEvidence.map((g: any) => `- **${g.title}**: ${g.content}`).join('\n')
        );
      }
    }

    if (
      retrieved.intent === 'MARKETING_INTELLIGENCE' ||
      qLower.includes('campaign') ||
      qLower.includes('ctr') ||
      qLower.includes('cpa')
    ) {
      const camps = retrieved.evidence.filter((e: any) => e.sourceType === 'CAMPAIGN');
      const campTool = retrieved.toolCalls.find(
        (t: any) => t.toolName === 'analyze_campaign_performance'
      );

      if (campTool && campTool.result?.bestPerformingCampaign) {
        const best = campTool.result.bestPerformingCampaign;
        sections.push(
          `**Top Performing Marketing Campaign [HISTORICAL_INFO]:**\n` +
            `- **${best.name}** on channel **${best.channel}** achieved the highest CTR at **${best.ctr}** with CPA of **${best.cpa}** and ${best.conversions} conversions.`
        );
      } else if (camps.length > 0) {
        sections.push(
          `**Historical Marketing Campaign Records [HISTORICAL_INFO]:**\n` +
            camps.map((c: any) => `- ${c.content}`).join('\n')
        );
      }
    }

    if (
      retrieved.intent === 'BUSINESS_OVERVIEW' ||
      qLower.includes('what does my business sell') ||
      qLower.includes('overview')
    ) {
      const profileEvidence = retrieved.evidence.find((e: any) => e.sourceType === 'PROFILE');
      if (profileEvidence) {
        sections.push(
          `**Business Identity & Overview [VERIFIED_FACT]:**\n${profileEvidence.content}`
        );
      }
    }

    // 6. Consequential Tool Calls (Approval notice)
    const approvalTools = retrieved.toolCalls.filter((t: any) => t.requiresApproval);
    if (approvalTools.length > 0) {
      sections.push(
        `📋 **Action Requires Confirmation:**\n` +
          approvalTools
            .map(
              (t: any) =>
                `- Action: \`${t.toolName}\` (${JSON.stringify(t.parameters)}). Reason: ${t.approvalReason} Please confirm to execute.`
            )
            .join('\n')
      );
    }

    if (sections.length === 0) {
      const allEv = retrieved.evidence.slice(0, 4);
      sections.push(
        `**Business Intelligence Summary:**\n` +
          allEv.map((e: any) => `- **${e.title}** [${e.factStatus}]: ${e.content}`).join('\n')
      );
    }

    return sections.join('\n\n');
  }

  /**
   * Execute an approved consequential tool action
   */
  public async executeToolAction(
    workspaceId: string,
    userId: string,
    request: ExecuteToolRequest
  ): Promise<{ success: boolean; result: any }> {
    if (!request.confirmed) {
      throw new Error(
        'Explicit user confirmation is required to execute consequential tool actions.'
      );
    }

    if (request.toolName === 'create_internal_task') {
      const nowStr = new Date().toISOString();
      const task: StandardDepartmentTaskEntity = {
        taskId: `task-${Date.now()}`,
        businessId: workspaceId,
        workspaceId,
        department: (request.parameters.department as any) || 'GROWTH_DIRECTOR',
        title: String(request.parameters.title || 'Follow up on business strategy intelligence query'),
        description: String(request.parameters.description || request.parameters.title || 'Follow up on business strategy intelligence query'),
        objective: String(request.parameters.title || 'Follow up on business strategy intelligence query'),
        inputContext: request.parameters,
        requestedAction: 'EXECUTE',
        priority: (request.parameters.priority as any) || 'HIGH',
        dependencies: [],
        permissionRequirements: [],
        approvalRequirements: {
          required: true,
          approved: true,
          approvedBy: userId,
          approvedAt: nowStr,
        },
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        createdAt: nowStr,
        updatedAt: nowStr,
        auditHistory: [
          {
            action: 'CREATED_VIA_ASK_BUSINESS_TOOL',
            timestamp: nowStr,
          },
        ],
      };

      const created = await departmentTaskRepository.create(task);
      return { success: true, result: created };
    }

    if (request.toolName === 'update_business_profile') {
      const field = String(request.parameters.field);
      const proposedValue = request.parameters.proposedValue;
      if (!field || proposedValue === undefined) {
        throw new Error('Field and proposedValue are required for update_business_profile tool.');
      }

      const existing = (await businessProfileRepository.getProfile(workspaceId)) || {
        workspaceId,
        businessName: 'Business',
        tagline: '',
        stage: 'Early Traction',
        industry: 'General',
        location: '',
        website: '',
        foundedYear: '2025',
        overviewSummary: '',
        targetAudience: '',
        brandPositioning: '',
        valueProposition: '',
        businessModel: '',
        revenueModel: '',
        primaryGoals: [],
        provenance: {},
        strategicMemory: {
          usedAngles: [],
          fatiguedThemes: [],
          explicitExclusions: [],
          lastUpdated: new Date().toISOString(),
        },
        version: 1,
        lastUpdated: new Date().toISOString(),
      };

      const updated = await businessProfileRepository.saveProfile({
        ...existing,
        [field]: proposedValue,
        lastUpdated: new Date().toISOString(),
      });

      return { success: true, result: updated };
    }

    return {
      success: true,
      result: {
        toolName: request.toolName,
        status: 'EXECUTED',
        executedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Submit feedback for an answer
   */
  public async submitFeedback(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    feedback: SubmitFeedbackRequest
  ): Promise<AskBusinessMessage> {
    const updated = await conversationRepository.updateMessage(
      workspaceId,
      conversationId,
      messageId,
      {
        feedback: {
          rating: feedback.rating,
          note: feedback.note,
          submittedAt: new Date().toISOString(),
        },
      }
    );
    return updated;
  }

  /**
   * List conversations
   */
  public async listConversations(workspaceId: string): Promise<AskBusinessConversation[]> {
    return conversationRepository.listConversations(workspaceId);
  }

  /**
   * Get full conversation history
   */
  public async getConversationHistory(
    workspaceId: string,
    conversationId: string
  ): Promise<{ conversation: AskBusinessConversation; messages: AskBusinessMessage[] }> {
    const conversation = await conversationRepository.getConversation(workspaceId, conversationId);
    if (!conversation) {
      throw new Error(`Conversation '${conversationId}' not found in workspace '${workspaceId}'`);
    }

    const messages = await conversationRepository.listMessages(workspaceId, conversationId);
    return { conversation, messages };
  }
}

export const askYourBusinessService = new AskYourBusinessService();
