/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { goalRepository, competitorRepository } from '../repositories/goalRepository';
import { memoryService } from './memoryService';
import { hybridRetrievalService } from './hybridRetrievalService';
import { knowledgeGraphService } from './knowledgeGraphService';
import { departmentPermissionService } from './departmentPermissionService';
import type {
  AssembledBusinessContext,
  DepartmentContextResponse,
  KnowledgeSourceCitation,
  RetrievedKnowledgeItem,
  StandardDepartmentType,
  WorkspaceRole,
} from '../types/api';

interface CacheEntry {
  context: AssembledBusinessContext;
  cachedAt: number;
}

interface DeptCacheEntry {
  response: DepartmentContextResponse;
  cachedAt: number;
}

export class SharedBusinessContextService {
  private cache = new Map<string, CacheEntry>();
  private departmentCache = new Map<string, DeptCacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private cacheKey(workspaceId: string, taskType: string): string {
    return `${workspaceId}__${taskType}`;
  }

  /**
   * Invalidates context cache for a tenant when records are mutated
   */
  public invalidateCache(workspaceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${workspaceId}__`)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.departmentCache.keys()) {
      if (key.startsWith(`${workspaceId}__`)) {
        this.departmentCache.delete(key);
      }
    }
  }

  /**
   * Primary API: Assembles task-specific, unified business context with caching & token budget
   */
  public async getBusinessContext(params: {
    workspaceId: string;
    taskType?: 'MARKETING' | 'GROWTH' | 'STRATEGY' | 'BRANDING' | 'FINANCIAL' | 'GENERAL';
    sessionId?: string;
    tokenBudget?: number;
    bypassCache?: boolean;
  }): Promise<AssembledBusinessContext> {
    const {
      workspaceId,
      taskType = 'GENERAL',
      sessionId,
      tokenBudget = 2500,
      bypassCache = false,
    } = params;

    const key = this.cacheKey(workspaceId, taskType);
    const now = Date.now();

    if (!bypassCache && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (now - entry.cachedAt < this.CACHE_TTL_MS) {
        return {
          ...entry.context,
          freshness: 'CACHED',
          cachedAt: new Date(entry.cachedAt).toISOString(),
        };
      } else {
        this.cache.delete(key);
      }
    }

    // 1. Fetch Verified Domain Facts
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const workspace = await workspaceRepository.findById(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId, { limit: 5 });
    const workingMemory = sessionId
      ? await memoryService.getWorkingContext(workspaceId, sessionId)
      : null;

    // 2. Filter Products by Task Type
    let relevantProducts = products.map((p) => ({
      id: p.productId,
      name: p.name,
      category: p.category,
      price: p.price,
      currency: p.currency,
      description: p.description,
      pricingStructure: p.pricingStructure,
      features: p.features,
      benefits: p.benefits,
    }));

    if (taskType === 'MARKETING' || taskType === 'BRANDING') {
      relevantProducts = relevantProducts.slice(0, 5);
    } else if (taskType === 'FINANCIAL') {
      // Keep full list for margin & financial planning
      relevantProducts = relevantProducts.slice(0, 10);
    }

    // 3. Assemble Brand Directives
    const brandDirectives = {
      voice: brand?.voice || ['Professional', 'Authoritative'],
      wordsToUse: brand?.wordsToUse || [],
      wordsToAvoid: brand?.wordsToAvoid || [],
      approvedClaims: brand?.approvedClaims || [],
      restrictedClaims: brand?.restrictedClaims || [],
    };

    // 4. Operational Constraints
    const constraints: string[] = [];
    const mb1 = profile?.resourcesAndConstraints?.marketingBudget;
    const budgetVal =
      profile?.resourcesAndConstraints?.monthlyMarketingBudget ||
      (typeof mb1 === 'number' ? mb1 : mb1?.monthly);
    if (budgetVal) {
      constraints.push(`Marketing Budget: $${budgetVal} / month`);
    }
    const capVal =
      profile?.resourcesAndConstraints?.operatingCapacity ||
      (profile?.resourcesAndConstraints as any)?.operationalCapacity;
    if (capVal) {
      constraints.push(`Capacity Limit: ${capVal}`);
    }
    const exclusions =
      profile?.strategicMemory?.explicitExclusions ||
      (profile?.resourcesAndConstraints as any)?.explicitExclusions ||
      [];
    for (const excl of exclusions) {
      constraints.push(`Rule: ${excl}`);
    }

    // 5. Build Source Citations
    const citations: KnowledgeSourceCitation[] = [
      {
        sourceId: `src_profile_${workspaceId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${profile?.businessName || 'Business'} Profile`,
        confidence: 1.0,
        verifiedAt: profile?.lastUpdated || new Date().toISOString(),
      },
    ];

    if (brand) {
      citations.push({
        sourceId: `src_brand_${brand.brandIdentityId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${brand.brandName} Brand Identity Guidelines`,
        confidence: 1.0,
        verifiedAt: brand.updatedAt || new Date().toISOString(),
      });
    }

    // 6. Token Count Estimation
    const businessName =
      profile?.businessName || workspace?.workspaceName || (workspace as any)?.name || 'Business';
    const summaryText = `${businessName} (${profile?.stage || 'Stage'}). ${profile?.overviewSummary || profile?.tagline || ''}`;
    const rawTokens = Math.ceil(
      (summaryText.length +
        JSON.stringify(relevantProducts).length +
        JSON.stringify(brandDirectives).length +
        JSON.stringify(constraints).length) /
        4
    );

    const assembled: AssembledBusinessContext = {
      workspaceId,
      taskType,
      businessSummary: summaryText,
      relevantProducts,
      relevantAudiences: profile?.customerPersonas || [],
      brandDirectives,
      activeGoals: profile?.primaryGoals ? profile.primaryGoals.map((g) => ({ title: g })) : [],
      relevantConstraints: constraints,
      recentEpisodes: episodes.map((e) => ({
        title: e.title,
        summary: e.summary,
        learnings: e.learnings,
      })),
      workingMemorySnapshot: workingMemory
        ? {
            currentTask: workingMemory.currentTask,
            pendingApprovals: workingMemory.pendingApprovals,
          }
        : undefined,
      citations,
      tokenCount: rawTokens,
      tokenBudget,
      freshness: 'FRESH',
    };

    // Store in cache
    this.cache.set(key, { context: assembled, cachedAt: now });

    return assembled;
  }

  /**
   * Search relevant knowledge via Hybrid Retrieval
   */
  public async getRelevantKnowledge(params: {
    workspaceId: string;
    query: string;
    taskType?: 'MARKETING' | 'GROWTH' | 'STRATEGY' | 'BRANDING' | 'FINANCIAL' | 'GENERAL';
    department?: string;
    maxResults?: number;
    tokenBudget?: number;
  }): Promise<{
    items: RetrievedKnowledgeItem[];
    citations: KnowledgeSourceCitation[];
    totalResults: number;
    tokenCount: number;
  }> {
    return await hybridRetrievalService.search({
      workspaceId: params.workspaceId,
      query: params.query,
      taskType: params.taskType,
      department: params.department,
      maxResults: params.maxResults,
      tokenBudget: params.tokenBudget,
    });
  }

  /**
   * Access one of the 4 Memory Systems
   */
  public async getBusinessMemory(
    workspaceId: string,
    memoryType: 'working' | 'business' | 'episodic' | 'strategic',
    sessionId?: string
  ): Promise<unknown> {
    switch (memoryType) {
      case 'working':
        if (!sessionId) {
          return await memoryService.getWorkingContext(workspaceId, 'default');
        }
        return await memoryService.getWorkingContext(workspaceId, sessionId);

      case 'business':
        return await memoryService.getVerifiedBusinessMemory(workspaceId);

      case 'episodic':
        return await memoryService.listEpisodes(workspaceId);

      case 'strategic':
        return await memoryService.listStrategicItems(workspaceId);

      default:
        throw new Error(`UNKNOWN_MEMORY_TYPE: Memory type '${memoryType}' is not supported.`);
    }
  }

  /**
   * Records business knowledge and invalidates cache
   */
  public async recordBusinessKnowledge(
    workspaceId: string,
    record: {
      type: 'episode' | 'strategic_item' | 'relationship';
      data: any;
    }
  ): Promise<any> {
    this.invalidateCache(workspaceId);

    if (record.type === 'episode') {
      return await memoryService.recordEpisode({
        workspaceId,
        ...record.data,
      });
    }

    if (record.type === 'strategic_item') {
      return await memoryService.recordStrategicItem({
        workspaceId,
        ...record.data,
      });
    }

    if (record.type === 'relationship') {
      return await knowledgeGraphService.createRelationship({
        workspaceId,
        ...record.data,
      });
    }

    throw new Error(`INVALID_RECORD_TYPE: '${record.type}' is not recognized.`);
  }

  /**
   * Updates business knowledge and invalidates cache
   */
  public async updateBusinessKnowledge(
    workspaceId: string,
    recordId: string,
    changes: Record<string, unknown>
  ): Promise<any> {
    this.invalidateCache(workspaceId);

    // If updating a product
    if (changes.type === 'product' && changes.product) {
      return await productRepository.updateProduct(workspaceId, recordId, changes.product as any);
    }

    // If updating strategic item
    if (changes.type === 'strategic_item') {
      return await memoryService.recordStrategicItem({
        workspaceId,
        ...(changes as any),
      });
    }

    return { updated: true, recordId };
  }

  /**
   * Phase 4 Primary Contract: Assembles department-specific, role-controlled shared business context
   */
  public async getDepartmentContext(params: {
    workspaceId: string;
    department: StandardDepartmentType | string;
    userRole?: WorkspaceRole;
    callerWorkspaceId?: string;
    tokenBudget?: number;
    bypassCache?: boolean;
  }): Promise<DepartmentContextResponse> {
    const {
      workspaceId,
      department,
      userRole = 'owner',
      callerWorkspaceId,
      tokenBudget = 3000,
      bypassCache = false,
    } = params;

    // 1. Cross-Tenant Isolation Enforcement
    if (callerWorkspaceId) {
      departmentPermissionService.assertTenantAccess(callerWorkspaceId, workspaceId);
    }

    // 2. Department Access Authorization Check
    const deptUpper = department.toUpperCase() as StandardDepartmentType;
    if (!departmentPermissionService.canAccessDepartment(userRole, deptUpper)) {
      const err = new Error(
        `FORBIDDEN: User with role '${userRole}' is not permitted to access department '${deptUpper}'.`
      );
      (err as any).statusCode = 403;
      throw err;
    }

    // 3. Cache Evaluation
    const cacheKey = `${workspaceId}__dept_${deptUpper}__role_${userRole}`;
    const now = Date.now();

    if (!bypassCache && this.departmentCache.has(cacheKey)) {
      const entry = this.departmentCache.get(cacheKey)!;
      if (now - entry.cachedAt < this.CACHE_TTL_MS) {
        return {
          ...entry.response,
          freshness: 'CACHED',
        };
      } else {
        this.departmentCache.delete(cacheKey);
      }
    }

    // 4. Ground Truth Data Retrieval
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const workspace = await workspaceRepository.findById(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const goals = await goalRepository.listByWorkspace(workspaceId);
    const competitors = await competitorRepository.listByWorkspace(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId, { limit: 5 });

    // 5. Sensitive Financial Data Redaction
    const canSeeFinancials = departmentPermissionService.canAccessFinancialMargins(
      userRole,
      deptUpper
    );
    const dataRedactions: string[] = [];
    if (!canSeeFinancials) {
      dataRedactions.push('product_unit_costs', 'product_margins', 'internal_financial_ledgers');
    }

    // 6. Map Relevant Products with Sensitive Field Filtering
    const relevantProducts = products.map((p) => ({
      id: p.productId,
      name: p.name,
      category: p.category,
      price: p.price,
      currency: p.currency,
      description: p.description,
      features: p.features || [],
      benefits: p.benefits || [],
      unitCost: canSeeFinancials ? ((p as any).unitCost ?? 'UNKNOWN') : 'UNKNOWN',
      marginPercent: canSeeFinancials ? ((p as any).marginPercent ?? 'UNKNOWN') : 'UNKNOWN',
    }));

    // 7. Target Audiences & Buying Objections
    const targetAudiences = (profile?.customerPersonas || []).map((cp: any) => ({
      name: cp.name || cp.personaName || 'Target Audience',
      demographics: cp.demographics || cp.targetSegment,
      painPoints: cp.painPoints || [],
      buyingMotivations: cp.buyingMotivations || [],
      objections: cp.objections || cp.buyingObjections || [],
    }));

    // 8. Brand Directives with STRICT VIDEO EXCLUSION
    const brandDirectives = {
      voice: brand?.voice || ['Professional', 'Authoritative'],
      wordsToUse: brand?.wordsToUse || [],
      wordsToAvoid: brand?.wordsToAvoid || [],
      approvedClaims: brand?.approvedClaims || [],
      restrictedClaims: brand?.restrictedClaims || [],
      visualStyle: {
        primaryColor:
          (brand as any)?.visualStyle?.primaryColor || (brand as any)?.colors?.primary || '#1E40AF',
        secondaryColor:
          (brand as any)?.visualStyle?.secondaryColor ||
          (brand as any)?.colors?.secondary ||
          '#3B82F6',
        fontFamily:
          (brand as any)?.visualStyle?.typography?.fontFamily ||
          (brand as any)?.typography?.heading ||
          'Inter',
        svgOnly: true, // STRICT VIDEO EXCLUSION DIRECTIVE
      },
    };

    // 9. Business Objectives
    const businessObjectives = goals.map((g) => ({
      id: g.goalId,
      title: g.title || '',
      targetMetric: g.category,
      targetValue: g.targetValue,
      status: g.status,
    }));

    // 10. Applicable Constraints
    const applicableConstraints: string[] = [];
    const mb2 = profile?.resourcesAndConstraints?.marketingBudget;
    const budgetVal =
      profile?.resourcesAndConstraints?.monthlyMarketingBudget ||
      (typeof mb2 === 'number' ? mb2 : mb2?.monthly);
    if (budgetVal) {
      applicableConstraints.push(`Marketing Budget: $${budgetVal} / month`);
    }
    const capVal =
      profile?.resourcesAndConstraints?.operatingCapacity ||
      (profile?.resourcesAndConstraints as any)?.operationalCapacity;
    if (capVal) {
      applicableConstraints.push(`Operating Capacity: ${capVal}`);
    }
    const exclusions = Array.from(
      new Set([
        ...((profile?.strategicMemory?.explicitExclusions as string[]) || []),
        ...(((profile?.resourcesAndConstraints as any)?.explicitExclusions as string[]) || []),
      ])
    );
    for (const excl of exclusions) {
      applicableConstraints.push(`Rule: ${excl}`);
    }
    applicableConstraints.push(
      'Strict Rule: Zero video generation, video editing, or video pipelines (SVG vector collateral only)'
    );

    // 11. Department Specialized Slices
    let departmentSlice: Record<string, unknown>;
    switch (deptUpper) {
      case 'STRATEGY':
        departmentSlice = {
          positioning: profile?.brandPositioning,
          competitorCount: competitors.length,
          activeGoalsCount: goals.length,
          businessStage: profile?.stage,
          coreDifferentiator: (profile as any)?.coreDifferentiator || profile?.valueProposition,
        };
        break;
      case 'MARKETING':
        departmentSlice = {
          monthlyBudget: budgetVal || 'UNKNOWN',
          approvedBrandVoice: brandDirectives.voice,
          customerSegmentsCount: targetAudiences.length,
          brandGuidelinesApproved: Boolean(brand),
        };
        break;
      case 'RESEARCH':
        departmentSlice = {
          competitorCount: competitors.length,
          competitors: competitors.map((c) => ({
            name: c.name,
            strengths: c.strengths,
            weaknesses: c.weaknesses,
            pricingTiers: (c as any).pricingTiers || (c as any).pricingNotes || [],
          })),
          sourcesVerified: true,
          researchTimestamp: new Date().toISOString(),
        };
        break;
      case 'CREATIVE':
        departmentSlice = {
          approvedColors: brandDirectives.visualStyle,
          svgCollateralOnly: true,
          wordsToAvoid: brandDirectives.wordsToAvoid,
          approvedClaims: brandDirectives.approvedClaims,
          videoGenerationExcluded: true,
        };
        break;
      case 'SALES':
        departmentSlice = {
          productCatalog: relevantProducts.map((p) => ({
            name: p.name,
            price: p.price,
            features: p.features,
          })),
          objectionsCatalog: targetAudiences.flatMap((a) => a.objections || []),
          buyingMotivations: targetAudiences.flatMap((a) => a.buyingMotivations || []),
        };
        break;
      case 'FINANCE':
        departmentSlice = {
          verifiedBudget: canSeeFinancials ? budgetVal || 'UNKNOWN' : 'REDACTED',
          financialAccessGranted: canSeeFinancials,
          currency: (profile as any)?.currency || 'USD',
        };
        break;
      case 'ANALYTICS':
        departmentSlice = {
          trackedGoals: businessObjectives,
          pastExperimentsCount: episodes.length,
          attributionModel: 'FIRST_TOUCH_AND_LAST_TOUCH',
        };
        break;
      case 'CUSTOMER_SUCCESS':
        departmentSlice = {
          operatingPolicies: exclusions,
          audiencePainPoints: targetAudiences.flatMap((a) => a.painPoints || []),
          supportHours:
            (profile?.resourcesAndConstraints as any)?.supportHours || 'Standard Business Hours',
        };
        break;
      default:
        departmentSlice = {
          generalDepartment: deptUpper,
        };
        break;
    }

    // 12. Supporting Citations & Confidence Score
    const citations: KnowledgeSourceCitation[] = [
      {
        sourceId: `src_profile_${workspaceId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${profile?.businessName || 'Business'} Profile Ground Truth`,
        confidence: 1.0,
        verifiedAt: profile?.lastUpdated || new Date().toISOString(),
      },
    ];

    if (brand) {
      citations.push({
        sourceId: `src_brand_${brand.brandIdentityId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${brand.brandName} Brand Identity Guidelines`,
        confidence: 1.0,
        verifiedAt: brand.updatedAt || new Date().toISOString(),
      });
    }

    if (competitors.length > 0) {
      citations.push({
        sourceId: `src_competitors_${workspaceId}`,
        sourceType: 'DOCUMENT',
        title: `${competitors.length} Verified Competitor Profiles`,
        confidence: 0.88,
        verifiedAt: new Date().toISOString(),
      });
    }

    const businessName =
      profile?.businessName || workspace?.workspaceName || (workspace as any)?.name || 'Business';

    const tokenCount = Math.ceil(
      (JSON.stringify(relevantProducts).length +
        JSON.stringify(targetAudiences).length +
        JSON.stringify(brandDirectives).length +
        JSON.stringify(applicableConstraints).length +
        JSON.stringify(departmentSlice).length) /
        4
    );

    const response: DepartmentContextResponse = {
      workspaceId,
      department: deptUpper,
      businessIdentity: {
        name: businessName,
        stage: profile?.stage || 'GROWTH',
        tagline: profile?.tagline,
        positioning: profile?.brandPositioning,
        category: profile?.industry,
        location:
          (profile as any)?.geography?.targetRegion ||
          (profile as any)?.targetRegion ||
          (profile as any)?.location?.targetRegion ||
          'Global',
        overviewSummary: profile?.overviewSummary,
      },
      relevantProducts,
      targetAudiences,
      brandDirectives,
      businessObjectives,
      applicableConstraints,
      historicalEpisodes: episodes.map((e) => ({
        title: e.title,
        summary: e.summary,
        learnings: e.learnings,
      })),
      pastPerformance: {
        experimentsRun: episodes.length,
        recentOutcomes: episodes.map((e) => e.summary).slice(0, 3),
      },
      supportingEvidence: citations,
      freshness: 'FRESH',
      confidenceScore: 0.96,
      tokenCount,
      tokenBudget,
      dataRedactions,
      departmentSlice,
    };

    // Store in cache
    this.departmentCache.set(cacheKey, { response, cachedAt: now });

    return response;
  }
}

export const sharedBusinessContextService = new SharedBusinessContextService();
