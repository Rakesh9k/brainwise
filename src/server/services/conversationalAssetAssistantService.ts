/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { brandAssetRepository } from '../repositories/brandAssetRepository';
import { productRepository } from '../repositories/productRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { brandGuardianService } from './brandGuardianService';
import { unifiedAiAssetIntelligenceService } from './unifiedAiAssetIntelligenceService';
import { departmentTaskRepository } from '../repositories/departmentTaskRepository';
import type {
  ActionConfirmationRequest,
  AssistantActionExecutionRecord,
  AssistantExplainabilityBlock,
  AssistantMessage,
  AssetIntelligenceConversation,
  ConversationalAssetQueryRequest,
  ConversationalAssetQueryResponse,
} from '../types/conversationalAssetAssistant';
import type { UnifiedBrandAssetEntity } from '../types/assetLibrary';
import type { WorkspaceRole, StandardDepartmentTaskEntity } from '../types/api';

export class ConversationalAssetAssistantService {
  private pendingConfirmations = new Map<string, ActionConfirmationRequest>();

  private convCol(workspaceId: string) {
    return db.collection<AssetIntelligenceConversation>(`workspaces/${workspaceId}/assetAssistantConversations`);
  }

  // ===========================================================================
  // 1. MAIN ENTRY POINT: PROCESS CONVERSATIONAL QUERY
  // ===========================================================================

  public async processQuery(request: ConversationalAssetQueryRequest): Promise<ConversationalAssetQueryResponse> {
    const { workspaceId, userId, userRole = 'member', query = '' } = request;
    const cleanQuery = query.trim();
    const now = new Date().toISOString();

    // 1. Resolve Conversation Thread
    let conversationId = request.conversationId;
    let conversation: AssetIntelligenceConversation | null = null;

    if (conversationId) {
      const snap = await this.convCol(workspaceId).doc(conversationId).get();
      if (snap.exists && snap.data()) {
        conversation = (snap.data() as AssetIntelligenceConversation) || null;
      }
    }

    if (!conversation) {
      conversationId = `conv_asset_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      conversation = {
        conversationId,
        workspaceId,
        userId,
        title: cleanQuery.length > 40 ? `${cleanQuery.slice(0, 40)}…` : cleanQuery || 'Asset Intelligence Chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    const effectiveConvId = conversationId || conversation.conversationId;

    // 2. Check for Confirmation Token Execution (Two-Step Action Flow)
    if (request.confirmationToken) {
      return await this.executeConfirmedAction(workspaceId, userId, userRole, effectiveConvId, request.confirmationToken);
    }

    // Check if user is saying "confirm" or "yes" or "proceed" to an active pending confirmation in conversation
    const lastMsg = conversation.messages[conversation.messages.length - 1];
    if (
      lastMsg?.pendingConfirmation &&
      /^(yes|confirm|proceed|ok|approve|do it)\b/i.test(cleanQuery)
    ) {
      return await this.executeConfirmedAction(
        workspaceId,
        userId,
        userRole,
        effectiveConvId,
        lastMsg.pendingConfirmation.confirmationToken
      );
    }

    // 3. Grounding in Business Brain
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const identity = await brandGuardianService.getAuthoritativeIdentity(workspaceId);

    const businessName = profile?.businessName || 'Solstice Botanicals';
    const productsReferenced: string[] = [];

    // Check if query matches any product
    const targetProduct = products.find((p) => cleanQuery.toLowerCase().includes(p.name.toLowerCase()) || (p.sku && cleanQuery.toLowerCase().includes(p.sku.toLowerCase())));
    if (targetProduct) {
      productsReferenced.push(targetProduct.name);
    }

    // 4. Strict Video Exclusion Guardrail
    if (/\b(video|mp4|mov|webm|avi|render reel|video edit|ffmpeg|generate video)\b/i.test(cleanQuery)) {
      const videoRefusalMessage: AssistantMessage = {
        messageId: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        role: 'assistant',
        content:
          `**Architectural Directive Notice:** BrainWise strictly excludes all AI video generation, video editing, reel generation, or video rendering pipelines in accordance with Master Architectural Directives.\n\n` +
          `BrainWise visual marketing outputs are strictly: **high-DPI SVG vector collateral** (stationery, flyers, packaging), **multi-frame static carousels**, and **print-ready artwork**. I can create a multi-slide Instagram carousel or print packaging dieline for you instead.`,
        explainability: {
          facts: ['BrainWise strictly excludes all video processing by Master Architectural Directive.'],
          extractedContent: [],
          assumptions: [],
          suggestions: ['Generate a 5-slide SVG social carousel', 'Create a packaging dieline', 'Browse active print collateral'],
        },
        groundedIn: {
          businessName,
          productsReferenced,
          brandIdentityVersion: identity?.version || 1,
        },
        suggestedQuickReplies: [
          'Generate 5-slide carousel for Instagram',
          'Show packaging dielines',
          'Find approved brand assets',
        ],
        timestamp: now,
      };

      conversation.messages.push({
        messageId: `msg_user_${Date.now()}`,
        role: 'user',
        content: cleanQuery,
        explainability: { facts: [], extractedContent: [], assumptions: [], suggestions: [] },
        groundedIn: {},
        timestamp: now,
      });
      conversation.messages.push(videoRefusalMessage);
      conversation.updatedAt = now;
      await this.convCol(workspaceId).doc(conversationId).set(conversation);

      return {
        conversationId: effectiveConvId,
        message: videoRefusalMessage,
        referencedAssets: [],
      };
    }

    // 5. Intent Classification & Multi-Step Execution
    let responseContent = '';
    let referencedAssets: UnifiedBrandAssetEntity[] = [];
    let pendingConfirmation: ActionConfirmationRequest | undefined;
    let actionExecuted: AssistantActionExecutionRecord | undefined;
    const explainability: AssistantExplainabilityBlock = {
      facts: [],
      extractedContent: [],
      assumptions: [],
      suggestions: [],
    };
    const suggestedQuickReplies: string[] = [];

    // Record Business Brain Facts
    explainability.facts.push(`Workspace: ${businessName}`);
    if (identity?.brandName) explainability.facts.push(`Authoritative Brand Identity: ${identity.brandName} (v${identity.version})`);
    if (products.length > 0) explainability.facts.push(`Active catalog contains ${products.length} registered products.`);

    const qLower = cleanQuery.toLowerCase();

    // -------------------------------------------------------------------------
    // A. SENSITIVE ACTIONS (Requiring Two-Step Confirmation)
    // -------------------------------------------------------------------------
    if (qLower.includes('archive all') || (qLower.includes('archive') && qLower.includes('draft'))) {
      // Permission check
      if (userRole === 'viewer') {
        throw new Error('PERMISSION_DENIED: Viewers are not authorized to perform archive actions.');
      }

      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const candidates = allAssets.filter((a) => a.section !== 'Archived' && (a.status === 'draft' || qLower.includes(a.category.toLowerCase())));
      const targetAssets = candidates.slice(0, 10);

      if (targetAssets.length === 0) {
        responseContent = `No matching active draft assets found to archive.`;
        explainability.suggestions.push('Search for other active assets or check the Archived section.');
      } else {
        const token = `tok_arch_${crypto.randomBytes(8).toString('hex')}`;
        pendingConfirmation = {
          confirmationToken: token,
          actionType: 'BULK_ARCHIVE',
          actionPayload: { assetIds: targetAssets.map((a) => a.assetId) },
          affectedAssets: targetAssets.map((a) => ({
            assetId: a.assetId,
            name: a.name,
            section: a.section,
            category: a.category,
            status: a.status,
            isApproved: a.approvalStatus === 'approved',
          })),
          summary: `You are about to archive ${targetAssets.length} asset(s). This will remove them from active workspace browsing and search.`,
          warningLevel: 'warning',
          requiredRole: ['owner', 'admin', 'member'],
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
        this.pendingConfirmations.set(token, pendingConfirmation);

        responseContent = `I found **${targetAssets.length} asset(s)** matching your request. Archiving is a sensitive operation. Please review the preview below and confirm to proceed.`;
        explainability.assumptions.push('Assumed user wants to declutter active asset views without permanent data loss.');
        explainability.suggestions.push('Confirm bulk archival', 'Cancel operation');
        suggestedQuickReplies.push('Confirm bulk archive', 'Cancel');
        referencedAssets = targetAssets;
      }
    } else if (qLower.includes('delete') && (qLower.includes('permanent') || qLower.includes('forever') || qLower.includes('trash'))) {
      if (userRole !== 'owner' && userRole !== 'admin') {
        throw new Error('PERMISSION_DENIED: Only Workspace Admins and Owners can permanently delete assets.');
      }

      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const target = allAssets.find((a) => qLower.includes(a.name.toLowerCase()) || qLower.includes(a.assetId.toLowerCase())) || allAssets[0];

      if (target) {
        const token = `tok_del_${crypto.randomBytes(8).toString('hex')}`;
        pendingConfirmation = {
          confirmationToken: token,
          actionType: 'PERMANENT_DELETE',
          actionPayload: { assetIds: [target.assetId] },
          affectedAssets: [{
            assetId: target.assetId,
            name: target.name,
            section: target.section,
            category: target.category,
            status: target.status,
            isApproved: target.approvalStatus === 'approved',
          }],
          summary: `Permanent deletion will irreversibly erase asset '${target.name}' and all associated versions from storage and Firestore.`,
          warningLevel: 'critical',
          requiredRole: ['owner', 'admin'],
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
        this.pendingConfirmations.set(token, pendingConfirmation);

        responseContent = `⚠️ **Critical Action Confirmation Required**: Permanent deletion of **"${target.name}"** cannot be undone.`;
        explainability.facts.push(`Asset ID: ${target.assetId}`);
        explainability.suggestions.push('Consider archiving instead of permanent deletion to preserve compliance audit trails.');
        suggestedQuickReplies.push('Confirm permanent deletion', 'Archive instead', 'Cancel');
        referencedAssets = [target];
      }
    }

    // -------------------------------------------------------------------------
    // B. SEARCH INTENTS
    // -------------------------------------------------------------------------
    else if (qLower.includes('approved logo') || (qLower.includes('logo') && qLower.includes('approved'))) {
      const assets = await brandAssetRepository.listByWorkspace(workspaceId, {
        category: 'Logo',
      });
      referencedAssets = assets.filter((a) => a.approvalStatus === 'approved' || a.status === 'approved' || a.status === 'active');
      responseContent = `I found **${referencedAssets.length} approved logo asset(s)** in the Authoritative Identity system for **${businessName}**.`;
      explainability.facts.push(`Active brand identity version: v${identity?.version || 1}`);
      explainability.suggestions.push('You can download logo SVGs or check Brand Guardian guidelines.');
      suggestedQuickReplies.push('Inspect logo clear space rules', 'Download primary logo SVG', 'Check brand color tokens');
    } else if (qLower.includes('old packaging') || qLower.includes('previous packaging') || (qLower.includes('packaging') && qLower.includes('old'))) {
      const assets = await brandAssetRepository.listByWorkspace(workspaceId, {
        section: 'Print & Packaging',
        category: 'Packaging',
      });
      referencedAssets = assets.filter((a) => a.version > 1 || a.status === 'superseded' || a.status === 'archived');
      if (referencedAssets.length === 0) referencedAssets = assets.slice(0, 3);
      responseContent = `Retrieved **${referencedAssets.length} packaging design(s)** from historical and active versions.`;
      explainability.extractedContent.push(`Packaging assets associated with product line.`);
      suggestedQuickReplies.push('Run pre-flight check on packaging', 'Check label OCR text', 'Generate new dieline');
    } else if (targetProduct || qLower.includes('sku') || qLower.includes('product image')) {
      const prod = targetProduct || products[0];
      if (prod) {
        const assets = await brandAssetRepository.listByWorkspace(workspaceId);
        referencedAssets = assets.filter((a) => a.productIds?.includes(prod.productId) || a.name.toLowerCase().includes(prod.name.toLowerCase()));
        responseContent = `Here are the assets associated with **${prod.name}** (SKU: \`${prod.sku || 'N/A'}\`). Found **${referencedAssets.length} matching collateral asset(s)**.`;
        explainability.facts.push(`Product retail price: ₹${prod.price}`);
        explainability.facts.push(`Product category: ${prod.category}`);
        suggestedQuickReplies.push('Verify packaging label MRP', 'Create promotional carousel', 'View packaging dieline');
      }
    } else if (qLower.includes('old brand color') || qLower.includes('deprecated color') || qLower.includes('drift')) {
      const driftReport = await brandGuardianService.detectBrandDrift(workspaceId);
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const driftAssetIds = new Set(driftReport.driftItems.map((d: any) => d.assetId));
      referencedAssets = allAssets.filter((a) => driftAssetIds.has(a.assetId));
      responseContent = `Brand Guardian identified **${driftReport.driftedAssetsCount} asset(s)** exhibiting brand drift or using deprecated color tokens.`;
      explainability.facts.push(`Authoritative palette: ${identity?.tokens?.colors?.primary?.hex || '#FF7417'}`);
      explainability.extractedContent.push(`Drift rate: ${driftReport.driftPercentage}% (${driftReport.driftedAssetsCount}/${driftReport.totalAssetsScanned})`);
      explainability.suggestions.push('Auto-remediate off-brand colors using Brand Guardian.');
      suggestedQuickReplies.push('Auto-remediate off-brand assets', 'View brand guidelines', 'Inspect color tokens');
    } else if (qLower.includes('unused asset') || qLower.includes('unreferenced')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      referencedAssets = allAssets.filter((a) => a.section !== 'Archived' && a.collectionIds.length === 0 && a.campaignIds.length === 0 && (!a.productIds || a.productIds.length === 0)).slice(0, 8);
      responseContent = `Found **${referencedAssets.length} unreferenced asset(s)** with zero campaign or product bindings.`;
      explainability.assumptions.push('Assets without campaign or collection tags may be candidates for archival.');
      explainability.suggestions.push('Tag or organize into a collection, or archive them.');
      suggestedQuickReplies.push('Archive unreferenced assets', 'Tag as backlog', 'Create new collection');
    } else if (qLower.includes('high-performing') || qLower.includes('social creative') || qLower.includes('best creative')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId, { section: 'Social Media' });
      referencedAssets = allAssets.filter((a) => a.approvalStatus === 'approved' || a.category === 'Carousel').slice(0, 5);
      responseContent = `Retrieved **${referencedAssets.length} approved social creative(s)** formatted for Instagram and multi-slide carousels.`;
      explainability.facts.push('Social creatives follow the 1080x1080px and 1080x1350px artboard standards.');
      suggestedQuickReplies.push('Remix top creative in Brand Studio', 'Schedule to Instagram', 'Generate fresh carousel');
    }

    // -------------------------------------------------------------------------
    // C. ANALYSIS INTENTS
    // -------------------------------------------------------------------------
    else if (qLower.includes('compliance') || qLower.includes('guardian check') || qLower.includes('brand check')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const target = allAssets[0];
      if (target) {
        const compliance = await brandGuardianService.evaluateAssetCompliance({
          workspaceId,
          assetId: target.assetId,
          assetTitle: target.name,
          svgMarkup: target.svgContent,
        });
        referencedAssets = [target];
        responseContent = `**Brand Guardian Compliance Analysis for "${target.name}":**\n\n` +
          `- Overall Compliance Score: **${compliance.overallScore}%**\n` +
          `- Status: **${compliance.status.toUpperCase()}**\n` +
          `- Off-Brand Colors: ${compliance.detectedOffBrandColors.length === 0 ? 'None detected' : compliance.detectedOffBrandColors.join(', ')}\n` +
          `- Prohibited Claims: ${compliance.detectedProhibitedClaims.length === 0 ? 'None detected' : compliance.detectedProhibitedClaims.join(', ')}`;
        explainability.facts.push(`Evaluated against Brand Identity v${compliance.appliedIdentityVersion}`);
        explainability.extractedContent.push(`Scanned ${compliance.checks.length} compliance rules.`);
        suggestedQuickReplies.push('Auto-remediate asset', 'Check next asset', 'View guideline rules');
      }
    } else if (qLower.includes('compare') || qLower.includes('difference')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      if (allAssets.length >= 2) {
        const a1 = allAssets[0];
        const a2 = allAssets[1];
        const d1 = unifiedAiAssetIntelligenceService.computeDHash(a1.svgContent || a1.name);
        const d2 = unifiedAiAssetIntelligenceService.computeDHash(a2.svgContent || a2.name);
        const distance = unifiedAiAssetIntelligenceService.computeHammingDistance(d1, d2);
        const similarity = Math.round((1.0 - distance / 64) * 100);

        referencedAssets = [a1, a2];
        responseContent = `**Asset Comparison Analysis:**\n\n` +
          `1. **${a1.name}** (${a1.category} · ${a1.section})\n` +
          `2. **${a2.name}** (${a2.category} · ${a2.section})\n\n` +
          `- **Perceptual Visual Similarity:** ${similarity}% (Hamming distance: ${distance}/64)\n` +
          `- **Dimensions:** ${a1.dimensions?.width || 1200}x${a1.dimensions?.height || 1200} vs ${a2.dimensions?.width || 1200}x${a2.dimensions?.height || 1200}\n` +
          `- **Lifecycle Status:** ${a1.status} vs ${a2.status}`;
        explainability.extractedContent.push(`Fingerprint 1: ${d1}`);
        explainability.extractedContent.push(`Fingerprint 2: ${d2}`);
        suggestedQuickReplies.push('Link as versions', 'Check duplicates', 'View artwork specs');
      }
    } else if (qLower.includes('duplicate') || qLower.includes('duplicate analysis')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const target = allAssets[0];
      const dupeResult = await unifiedAiAssetIntelligenceService.checkDuplicates({
        workspaceId,
        checksumSha256: target?.verifiedMetadata?.checksumSha256,
        svgMarkup: target?.svgContent,
        excludeAssetId: target?.assetId,
      });

      responseContent = `**Workspace Duplicate Analysis:**\n\n` +
        `- Duplicate Status: **${dupeResult.duplicateType}**\n` +
        `- Recommendation: **${dupeResult.recommendation}**\n` +
        `- Details: ${dupeResult.reason}`;
      explainability.facts.push(`Cryptographic check executed over ${allAssets.length} assets.`);
      suggestedQuickReplies.push('Inspect near duplicates', 'Clean up versions', 'Run quality check');
    }

    // -------------------------------------------------------------------------
    // D. SAFE ACTIONS (Executed Immediately with Audit Log)
    // -------------------------------------------------------------------------
    else if (qLower.includes('create collection') || qLower.includes('new collection')) {
      if (userRole === 'viewer') {
        throw new Error('PERMISSION_DENIED: Viewers cannot create collections.');
      }
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const targetIds = allAssets.slice(0, 3).map((a) => a.assetId);
      const collName = cleanQuery.replace(/create collection|new collection/gi, '').trim() || 'Curated Highlights';

      const coll = await brandAssetRepository.createCollection({
        workspaceId,
        name: collName,
        description: `Collection created by Asset Intelligence Assistant for ${businessName}.`,
        assetIds: targetIds,
        collectionType: 'user_created',
      });

      actionExecuted = {
        actionType: 'CREATE_COLLECTION',
        success: true,
        affectedAssetIds: targetIds,
        details: `Created collection '${coll.name}' with ${targetIds.length} asset(s).`,
        executionTimestamp: now,
        undoable: true,
      };

      responseContent = `✅ Successfully created collection **"${coll.name}"** containing **${targetIds.length} asset(s)**.`;
      explainability.facts.push(`Collection ID: ${coll.collectionId}`);
      explainability.suggestions.push('You can share this collection or add more assets anytime.');
      suggestedQuickReplies.push('View collection assets', 'Add tags to collection', 'Generate collection report');
      referencedAssets = allAssets.slice(0, 3);
    } else if (qLower.includes('add tag') || qLower.includes('tag asset')) {
      if (userRole === 'viewer') {
        throw new Error('PERMISSION_DENIED: Viewers cannot modify asset tags.');
      }
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const target = allAssets[0];
      if (target) {
        const newTag = cleanQuery.match(/tags?\s+([a-zA-Z0-9\-_]+)/i)?.[1] || 'reviewed';
        await brandAssetRepository.bulkTag(workspaceId, [target.assetId], [newTag]);

        actionExecuted = {
          actionType: 'ADD_TAGS',
          success: true,
          affectedAssetIds: [target.assetId],
          details: `Added tag '${newTag}' to asset '${target.name}'.`,
          executionTimestamp: now,
          undoable: true,
        };

        responseContent = `✅ Added tag **\`#${newTag}\`** to asset **"${target.name}"**.`;
        explainability.facts.push(`Updated asset tags: ${[...target.tags, newTag].join(', ')}`);
        suggestedQuickReplies.push('Add another tag', 'Run compliance check', 'Search by tag');
        referencedAssets = [target];
      }
    } else if (qLower.includes('create task') || qLower.includes('review task')) {
      const allAssets = await brandAssetRepository.listByWorkspace(workspaceId);
      const target = allAssets[0];
      const taskId = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      const task: StandardDepartmentTaskEntity = {
        taskId,
        title: `Review visual compliance for asset '${target?.name || 'Collateral'}'`,
        description: `Visual compliance review for ${target?.name || 'asset'}`,
        businessId: workspaceId,
        workspaceId,
        department: 'Brand Studio',
        objective: `Review visual compliance for asset '${target?.name || 'Collateral'}'`,
        inputContext: { assetId: target?.assetId },
        requestedAction: 'REVIEW_ASSET_COMPLIANCE',
        priority: 'MEDIUM',
        dependencies: [],
        permissionRequirements: ['member'],
        approvalRequirements: { required: true },
        status: 'QUEUED',
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
      };

      await departmentTaskRepository.create(task);

      actionExecuted = {
        actionType: 'CREATE_REVIEW_TASK',
        success: true,
        affectedAssetIds: target ? [target.assetId] : [],
        details: `Assigned review task '${task.taskId}' to Brand Studio team.`,
        executionTimestamp: now,
        undoable: false,
      };

      responseContent = `📋 Created review task **"${task.objective}"** in the Brand Studio department pipeline.`;
      explainability.facts.push(`Task ID: ${task.taskId} · Priority: ${task.priority}`);
      suggestedQuickReplies.push('View pending tasks', 'Open asset details', 'Check next asset');
      if (target) referencedAssets = [target];
    } else if (qLower.includes('recommend') || qLower.includes('replacement')) {
      const recs = await unifiedAiAssetIntelligenceService.recommendAssets({
        workspaceId,
        campaignBrief: cleanQuery,
        targetChannel: 'Instagram',
      });
      referencedAssets = recs.map((r) => r.asset);
      responseContent = `**Asset Recommendation Analysis:**\n\n` +
        recs.map((r, i) => `${i + 1}. **${r.asset.name}** — Score: **${r.recommendationScore}%**\n   *Rationale: ${r.rationale}*`).join('\n\n');
      explainability.assumptions.push('Prioritized approved assets with optimal aspect ratios for digital channels.');
      suggestedQuickReplies.push('Use top recommendation', 'Switch channel to Print', 'Create carousel');
    }

    // -------------------------------------------------------------------------
    // E. GENERAL NATURAL LANGUAGE RETRIEVAL (FALLBACK)
    // -------------------------------------------------------------------------
    else {
      const searchResults = await unifiedAiAssetIntelligenceService.semanticSearch({
        workspaceId,
        query: cleanQuery,
        limit: 5,
      });

      if (searchResults.length > 0) {
        referencedAssets = searchResults.map((r) => r.asset);
        responseContent = `I searched the Asset Operating System and found **${searchResults.length} relevant asset(s)**:\n\n` +
          searchResults.map((r, i) => `${i + 1}. **${r.asset.name}** (${r.asset.category} · ${r.asset.section}) — Relevance: ${Math.round(r.relevanceScore * 100)}%\n   *Match details: ${r.matchReasons.join(', ')}*`).join('\n\n');
        explainability.extractedContent.push(`Scanned full-text, OCR, tags, and conceptual embeddings.`);
      } else {
        responseContent = `I understand you're asking about **"${cleanQuery}"**. I searched the entire Asset Registry across all five sections (Active, Identity, Print & Packaging, Social Media, Archived), but found no close matches. Would you like me to create a new asset or search by specific category?`;
        explainability.suggestions.push('Try searching by category (e.g. "Show packaging", "Show logos")', 'Search by product name or SKU');
      }

      suggestedQuickReplies.push('Find all approved logos', 'Show packaging designs', 'Detect brand drift');
    }

    // 6. Assemble Assistant Message
    const assistantMessage: AssistantMessage = {
      messageId: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      role: 'assistant',
      content: responseContent,
      explainability,
      groundedIn: {
        businessName,
        productsReferenced,
        brandIdentityVersion: identity?.version || 1,
        referencedAssetIds: referencedAssets.map((a) => a.assetId),
      },
      actionExecuted,
      pendingConfirmation,
      suggestedQuickReplies: suggestedQuickReplies.slice(0, 4),
      referencedAssets,
      timestamp: now,
    };

    // 7. Persist to Thread
    conversation.messages.push({
      messageId: `msg_user_${Date.now()}`,
      role: 'user',
      content: cleanQuery,
      explainability: { facts: [], extractedContent: [], assumptions: [], suggestions: [] },
      groundedIn: {},
      timestamp: now,
    });
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = now;
    await this.convCol(workspaceId).doc(effectiveConvId).set(conversation);

    return {
      conversationId: effectiveConvId,
      message: assistantMessage,
      referencedAssets,
      pendingConfirmation,
      actionExecuted,
    };
  }

  // ===========================================================================
  // 2. CONFIRM AND EXECUTE SENSITIVE ACTIONS
  // ===========================================================================

  public async executeConfirmedAction(
    workspaceId: string,
    userId: string,
    userRole: WorkspaceRole,
    conversationId: string,
    confirmationToken: string
  ): Promise<ConversationalAssetQueryResponse> {
    const confirmation = this.pendingConfirmations.get(confirmationToken);
    if (!confirmation) {
      throw new Error('CONFIRMATION_EXPIRED: Invalid or expired confirmation token.');
    }

    if (new Date(confirmation.expiresAt).getTime() < Date.now()) {
      this.pendingConfirmations.delete(confirmationToken);
      throw new Error('CONFIRMATION_EXPIRED: The confirmation token has expired.');
    }

    if (!confirmation.requiredRole.includes(userRole)) {
      throw new Error(`PERMISSION_DENIED: User role '${userRole}' is not permitted to execute '${confirmation.actionType}'.`);
    }

    const now = new Date().toISOString();
    let actionExecuted: AssistantActionExecutionRecord;

    switch (confirmation.actionType) {
      case 'BULK_ARCHIVE': {
        const assetIds = (confirmation.actionPayload.assetIds as string[]) || [];
        await brandAssetRepository.bulkArchive(workspaceId, assetIds, userId);
        actionExecuted = {
          actionType: 'BULK_ARCHIVE',
          success: true,
          affectedAssetIds: assetIds,
          details: `Archived ${assetIds.length} asset(s) under confirmed authorization.`,
          executionTimestamp: now,
          undoable: true,
        };
        break;
      }
      case 'PERMANENT_DELETE': {
        const assetIds = (confirmation.actionPayload.assetIds as string[]) || [];
        await brandAssetRepository.bulkDeletePermanently(workspaceId, assetIds);
        actionExecuted = {
          actionType: 'PERMANENT_DELETE',
          success: true,
          affectedAssetIds: assetIds,
          details: `Permanently deleted ${assetIds.length} asset(s) from Firestore and storage.`,
          executionTimestamp: now,
          undoable: false,
        };
        break;
      }
      default: {
        actionExecuted = {
          actionType: confirmation.actionType,
          success: true,
          affectedAssetIds: confirmation.affectedAssets.map((a) => a.assetId),
          details: `Executed ${confirmation.actionType} successfully.`,
          executionTimestamp: now,
          undoable: false,
        };
      }
    }

    // Clean up used token
    this.pendingConfirmations.delete(confirmationToken);

    const confirmationMessage: AssistantMessage = {
      messageId: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      role: 'assistant',
      content: `✅ **Action Confirmed and Executed**: ${actionExecuted.details}`,
      explainability: {
        facts: [`Action type: ${confirmation.actionType}`, `Executed by authorized user (${userRole})`],
        extractedContent: [],
        assumptions: [],
        suggestions: ['You can restore archived assets at any time from the Archived section.'],
      },
      groundedIn: {},
      actionExecuted,
      timestamp: now,
    };

    // Update conversation
    const snap = await this.convCol(workspaceId).doc(conversationId).get();
    const conversation = snap.data();
    if (conversation) {
      conversation.messages.push(confirmationMessage);
      conversation.updatedAt = now;
      await this.convCol(workspaceId).doc(conversationId).set(conversation);
    }

    return {
      conversationId,
      message: confirmationMessage,
      referencedAssets: [],
      actionExecuted,
    };
  }

  // ===========================================================================
  // 3. THREAD RETRIEVAL & MANAGEMENT
  // ===========================================================================

  public async getConversation(workspaceId: string, conversationId: string): Promise<AssetIntelligenceConversation | null> {
    const snap = await this.convCol(workspaceId).doc(conversationId).get();
    return snap.exists && snap.data() ? (snap.data() as AssetIntelligenceConversation) : null;
  }

  public async listConversations(workspaceId: string): Promise<AssetIntelligenceConversation[]> {
    const snap = await this.convCol(workspaceId).orderBy('updatedAt', 'desc').get();
    return snap.docs.map((d: any) => d.data() as AssetIntelligenceConversation).filter(Boolean);
  }
}

export const conversationalAssetAssistantService = new ConversationalAssetAssistantService();
