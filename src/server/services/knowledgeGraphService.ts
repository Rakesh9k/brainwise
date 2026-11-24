/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { knowledgeGraphRepository } from '../repositories/knowledgeGraphRepository';
import type { KnowledgeGraphEdgeEntity, GraphRelationshipType, GraphNodeRef } from '../types/api';

export class KnowledgeGraphService {
  /**
   * Generic relationship creation with validation
   */
  public async createRelationship(params: {
    workspaceId: string;
    source: GraphNodeRef;
    target: GraphNodeRef;
    relationshipType: GraphRelationshipType;
    properties?: Record<string, unknown>;
    confidence?: number;
    provenance?: 'USER_CONFIRMED' | 'DERIVED_FROM_DOC' | 'AI_INFERRED';
    verificationStatus?: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
    verifiedBy?: string;
  }): Promise<KnowledgeGraphEdgeEntity> {
    const {
      workspaceId,
      source,
      target,
      relationshipType,
      properties,
      confidence = 1.0,
      provenance = 'USER_CONFIRMED',
      verificationStatus = 'VERIFIED',
      verifiedBy,
    } = params;

    if (!workspaceId || !source?.id || !target?.id || !relationshipType) {
      throw new Error(
        'INVALID_GRAPH_EDGE: workspaceId, source, target, and relationshipType are required.'
      );
    }

    return await knowledgeGraphRepository.upsertEdge({
      workspaceId,
      source,
      target,
      relationshipType,
      properties,
      confidence,
      provenance,
      verificationStatus,
      verifiedBy,
    });
  }

  /**
   * Connects a product to a target customer segment
   */
  public async connectProductToCustomerSegment(params: {
    workspaceId: string;
    productId: string;
    productName: string;
    segmentId: string;
    segmentName: string;
    properties?: Record<string, unknown>;
    verifiedBy?: string;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.productId, type: 'product', name: params.productName },
      target: { id: params.segmentId, type: 'customer_segment', name: params.segmentName },
      relationshipType: 'TARGETS',
      properties: params.properties,
      verifiedBy: params.verifiedBy,
    });
  }

  /**
   * Connects a campaign to a promoted product
   */
  public async connectCampaignToProduct(params: {
    workspaceId: string;
    campaignId: string;
    campaignName: string;
    productId: string;
    productName: string;
    properties?: Record<string, unknown>;
    verifiedBy?: string;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.campaignId, type: 'campaign', name: params.campaignName },
      target: { id: params.productId, type: 'product', name: params.productName },
      relationshipType: 'PROMOTES',
      properties: params.properties,
      verifiedBy: params.verifiedBy,
    });
  }

  /**
   * Connects a campaign to a target customer segment
   */
  public async connectCampaignToCustomerSegment(params: {
    workspaceId: string;
    campaignId: string;
    campaignName: string;
    segmentId: string;
    segmentName: string;
    properties?: Record<string, unknown>;
    verifiedBy?: string;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.campaignId, type: 'campaign', name: params.campaignName },
      target: { id: params.segmentId, type: 'customer_segment', name: params.segmentName },
      relationshipType: 'TARGETS',
      properties: params.properties,
      verifiedBy: params.verifiedBy,
    });
  }

  /**
   * Connects brand guidelines to govern a department or campaign
   */
  public async connectBrandGuidelineToTarget(params: {
    workspaceId: string;
    guidelineId: string;
    guidelineName: string;
    targetId: string;
    targetType: 'department' | 'campaign';
    targetName: string;
    properties?: Record<string, unknown>;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.targetId, type: params.targetType, name: params.targetName },
      target: { id: params.guidelineId, type: 'brand_guideline', name: params.guidelineName },
      relationshipType: 'GOVERNED_BY',
      properties: params.properties,
    });
  }

  /**
   * Connects a business goal to influence a department strategy
   */
  public async connectGoalToDepartment(params: {
    workspaceId: string;
    goalId: string;
    goalTitle: string;
    departmentId: string;
    departmentName: string;
    properties?: Record<string, unknown>;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.goalId, type: 'business_goal', name: params.goalTitle },
      target: { id: params.departmentId, type: 'department', name: params.departmentName },
      relationshipType: 'INFLUENCES',
      properties: params.properties,
    });
  }

  /**
   * Connects a campaign to its generated performance result
   */
  public async connectCampaignToPerformance(params: {
    workspaceId: string;
    campaignId: string;
    campaignName: string;
    resultId: string;
    resultTitle: string;
    properties?: Record<string, unknown>;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.campaignId, type: 'campaign', name: params.campaignName },
      target: { id: params.resultId, type: 'performance_result', name: params.resultTitle },
      relationshipType: 'PRODUCES',
      properties: params.properties,
    });
  }

  /**
   * Connects a performance result to inform future strategy/decisions
   */
  public async connectPerformanceToStrategy(params: {
    workspaceId: string;
    resultId: string;
    resultTitle: string;
    decisionId: string;
    decisionTitle: string;
    properties?: Record<string, unknown>;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.resultId, type: 'performance_result', name: params.resultTitle },
      target: { id: params.decisionId, type: 'decision', name: params.decisionTitle },
      relationshipType: 'INFORMS',
      properties: params.properties,
    });
  }

  /**
   * Connects a competitor to a market
   */
  public async connectCompetitorToMarket(params: {
    workspaceId: string;
    competitorId: string;
    competitorName: string;
    marketId: string;
    marketName: string;
    properties?: Record<string, unknown>;
  }): Promise<KnowledgeGraphEdgeEntity> {
    return await this.createRelationship({
      workspaceId: params.workspaceId,
      source: { id: params.competitorId, type: 'competitor', name: params.competitorName },
      target: { id: params.marketId, type: 'market', name: params.marketName },
      relationshipType: 'COMPETES_IN',
      properties: params.properties,
    });
  }

  /**
   * Retrieves all relationships connected to a node (1-hop)
   */
  public async getRelationships(
    workspaceId: string,
    nodeId: string,
    options?: {
      direction?: 'outgoing' | 'incoming' | 'both';
      relationshipType?: GraphRelationshipType;
    }
  ): Promise<KnowledgeGraphEdgeEntity[]> {
    const dir = options?.direction || 'both';

    if (dir === 'outgoing') {
      return await knowledgeGraphRepository.findOutgoingEdges(
        workspaceId,
        nodeId,
        options?.relationshipType
      );
    }
    if (dir === 'incoming') {
      return await knowledgeGraphRepository.findIncomingEdges(
        workspaceId,
        nodeId,
        options?.relationshipType
      );
    }

    const all = await knowledgeGraphRepository.findConnectedEdges(workspaceId, nodeId);
    if (options?.relationshipType) {
      return all.filter((e) => e.relationshipType === options.relationshipType);
    }
    return all;
  }

  /**
   * Traverses graph from startNodeId up to maxDepth (1 or 2 hops)
   */
  public async traverse(
    workspaceId: string,
    startNodeId: string,
    maxDepth: 1 | 2 = 1
  ): Promise<{
    nodes: Array<GraphNodeRef>;
    edges: KnowledgeGraphEdgeEntity[];
  }> {
    const result = await knowledgeGraphRepository.traverse(workspaceId, startNodeId, maxDepth);
    return {
      nodes: Array.from(result.nodes.values()),
      edges: result.edges,
    };
  }

  /**
   * Deletes an edge
   */
  public async deleteRelationship(workspaceId: string, edgeId: string): Promise<boolean> {
    return await knowledgeGraphRepository.deleteEdge(workspaceId, edgeId);
  }

  /**
   * Lists all edges for a workspace
   */
  public async listAllEdges(workspaceId: string): Promise<KnowledgeGraphEdgeEntity[]> {
    return await knowledgeGraphRepository.listEdges(workspaceId);
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
