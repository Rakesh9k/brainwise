/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { KnowledgeGraphEdgeEntity, GraphRelationshipType, GraphNodeRef } from '../types/api';

export class KnowledgeGraphRepository {
  private collectionName(workspaceId: string): string {
    return `workspaces/${workspaceId}/knowledgeGraphEdges`;
  }

  public async upsertEdge(
    edge: Omit<KnowledgeGraphEdgeEntity, 'edgeId' | 'createdAt' | 'updatedAt'> & { edgeId?: string }
  ): Promise<KnowledgeGraphEdgeEntity> {
    const edgeId =
      edge.edgeId ||
      `edge_${edge.source.id}_${edge.relationshipType}_${edge.target.id}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
    const now = new Date().toISOString();

    const existingRef = db.doc(`${this.collectionName(edge.workspaceId)}/${edgeId}`);
    const snap = await existingRef.get();
    const existing = snap.exists ? (snap.data() as unknown as KnowledgeGraphEdgeEntity) : null;

    const fullEdge: KnowledgeGraphEdgeEntity = {
      ...edge,
      edgeId,
      confidence: edge.confidence ?? 1.0,
      provenance: edge.provenance || 'USER_CONFIRMED',
      verificationStatus: edge.verificationStatus || 'VERIFIED',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      verifiedAt: edge.verifiedAt || existing?.verifiedAt || now,
      verifiedBy: edge.verifiedBy || existing?.verifiedBy || 'Founder',
    };

    await existingRef.set(fullEdge as any);
    return fullEdge;
  }

  public async getEdge(
    workspaceId: string,
    edgeId: string
  ): Promise<KnowledgeGraphEdgeEntity | null> {
    const snap = await db.doc(`${this.collectionName(workspaceId)}/${edgeId}`).get();
    if (!snap.exists) return null;
    return snap.data() as unknown as KnowledgeGraphEdgeEntity;
  }

  public async deleteEdge(workspaceId: string, edgeId: string): Promise<boolean> {
    const ref = db.doc(`${this.collectionName(workspaceId)}/${edgeId}`);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }

  public async listEdges(workspaceId: string): Promise<KnowledgeGraphEdgeEntity[]> {
    const snap = await db.collection(this.collectionName(workspaceId)).get();
    return snap.docs.map((d) => d.data() as unknown as KnowledgeGraphEdgeEntity);
  }

  public async findOutgoingEdges(
    workspaceId: string,
    sourceId: string,
    relationshipType?: GraphRelationshipType
  ): Promise<KnowledgeGraphEdgeEntity[]> {
    const edges = await this.listEdges(workspaceId);
    return edges.filter((e) => {
      const matchSource = e.source.id === sourceId;
      const matchRel = relationshipType ? e.relationshipType === relationshipType : true;
      return matchSource && matchRel;
    });
  }

  public async findIncomingEdges(
    workspaceId: string,
    targetId: string,
    relationshipType?: GraphRelationshipType
  ): Promise<KnowledgeGraphEdgeEntity[]> {
    const edges = await this.listEdges(workspaceId);
    return edges.filter((e) => {
      const matchTarget = e.target.id === targetId;
      const matchRel = relationshipType ? e.relationshipType === relationshipType : true;
      return matchTarget && matchRel;
    });
  }

  public async findConnectedEdges(
    workspaceId: string,
    nodeId: string
  ): Promise<KnowledgeGraphEdgeEntity[]> {
    const edges = await this.listEdges(workspaceId);
    return edges.filter((e) => e.source.id === nodeId || e.target.id === nodeId);
  }

  /**
   * Traverses graph from startNodeId up to maxDepth (1 or 2 hops)
   */
  public async traverse(
    workspaceId: string,
    startNodeId: string,
    maxDepth: 1 | 2 = 1
  ): Promise<{
    nodes: Map<string, GraphNodeRef>;
    edges: KnowledgeGraphEdgeEntity[];
  }> {
    const allEdges = await this.listEdges(workspaceId);
    const visitedEdges = new Set<string>();
    const nodeMap = new Map<string, GraphNodeRef>();
    const resultEdges: KnowledgeGraphEdgeEntity[] = [];

    const queue: Array<{ nodeId: string; currentDepth: number }> = [
      { nodeId: startNodeId, currentDepth: 0 },
    ];
    const visitedNodes = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.currentDepth >= maxDepth) continue;

      for (const edge of allEdges) {
        if (visitedEdges.has(edge.edgeId)) continue;

        let neighborId: string | null = null;
        let neighborRef: GraphNodeRef | null = null;

        if (edge.source.id === current.nodeId) {
          neighborId = edge.target.id;
          neighborRef = edge.target;
          nodeMap.set(edge.source.id, edge.source);
        } else if (edge.target.id === current.nodeId) {
          neighborId = edge.source.id;
          neighborRef = edge.source;
          nodeMap.set(edge.target.id, edge.target);
        }

        if (neighborId && neighborRef) {
          visitedEdges.add(edge.edgeId);
          resultEdges.push(edge);
          nodeMap.set(neighborId, neighborRef);

          if (!visitedNodes.has(neighborId) && current.currentDepth + 1 < maxDepth) {
            visitedNodes.add(neighborId);
            queue.push({ nodeId: neighborId, currentDepth: current.currentDepth + 1 });
          }
        }
      }
    }

    return { nodes: nodeMap, edges: resultEdges };
  }
}

export const knowledgeGraphRepository = new KnowledgeGraphRepository();
