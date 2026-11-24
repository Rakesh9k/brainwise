/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { evidenceLakeRepository } from '../repositories/evidenceLakeRepository';
import { contradictionDetectionEngine } from './contradictionService';
import type {
  EvidenceClassification,
  EvidenceDepartment,
  EvidenceFinding,
  EvidenceGraphEdge,
  ContradictionReport,
} from '../types/evidence';

export class EvidenceEngineService {
  /**
   * Evaluates raw findings and applies the strict 4-Tier classification:
   * 1. VERIFIED: Primary authoritative source (Gov, Reg, Official) with confidence >= 0.85
   * 2. CORROBORATED: 2+ independent credible sources with matching claims
   * 3. ESTIMATED: Explicitly computed model or formula with stated assumptions
   * 4. UNVERIFIED: Insufficient or unconfirmed single-source claim
   */
  public classifyFinding(finding: Omit<EvidenceFinding, 'classification'>, corroboratingSourcesCount = 1): EvidenceClassification {
    const isPrimary =
      finding.sourceType === 'OFFICIAL_WEBSITE' ||
      finding.sourceType === 'GOVERNMENT_PUBLICATION' ||
      finding.sourceType === 'REGULATORY_SOURCE';

    const isCalculated =
      finding.topic.toLowerCase().includes('tam') ||
      finding.topic.toLowerCase().includes('sizing') ||
      finding.topic.toLowerCase().includes('forecast') ||
      finding.topic.toLowerCase().includes('projection');

    if (isPrimary && finding.evidenceConfidence >= 0.85) {
      return 'VERIFIED';
    }

    if (corroboratingSourcesCount >= 2 && finding.evidenceConfidence >= 0.7) {
      return 'CORROBORATED';
    }

    if (isCalculated || finding.extractedEvidence.toLowerCase().includes('estimated') || finding.extractedEvidence.toLowerCase().includes('assumed')) {
      return 'ESTIMATED';
    }

    return 'UNVERIFIED';
  }

  /**
   * Ingests, classifies, and saves a research finding into the Evidence Lake
   */
  public async ingestFinding(params: {
    workspaceId: string;
    topic: string;
    sourceTitle: string;
    sourceUrl: string;
    sourceType: EvidenceFinding['sourceType'];
    publicationDate?: string;
    extractedEvidence: string;
    quoteOrSummary: string;
    geographicRelevance?: string;
    evidenceConfidence?: number;
    relatedDepartment: EvidenceDepartment;
    extractedMetrics?: Record<string, string | number>;
    relatedEntityIds?: string[];
    corroboratingSourcesCount?: number;
  }): Promise<EvidenceFinding> {
    const {
      workspaceId,
      topic,
      sourceTitle,
      sourceUrl,
      sourceType,
      publicationDate,
      extractedEvidence,
      quoteOrSummary,
      geographicRelevance = 'GLOBAL',
      evidenceConfidence = 0.8,
      relatedDepartment,
      extractedMetrics,
      relatedEntityIds = [],
      corroboratingSourcesCount = 1,
    } = params;

    const findingId = `ev_find_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const retrievalDate = new Date().toISOString();

    const partialFinding: Omit<EvidenceFinding, 'classification'> = {
      findingId,
      workspaceId,
      topic,
      sourceTitle,
      sourceUrl,
      sourceType,
      publicationDate,
      retrievalDate,
      extractedEvidence,
      quoteOrSummary,
      geographicRelevance,
      evidenceConfidence,
      relatedDepartment,
      relatedEntityIds,
      extractedMetrics,
    };

    const classification = this.classifyFinding(partialFinding, corroboratingSourcesCount);
    const completeFinding: EvidenceFinding = {
      ...partialFinding,
      classification,
    };

    // Store in Firestore under workspace evidence findings subcollection
    const docRef = db.doc<EvidenceFinding>(
      `workspaces/${workspaceId}/evidence_findings/${findingId}`
    );
    await docRef.set(completeFinding);

    // Also mirror to core Evidence Lake repository for global deduplication
    const fingerprint = evidenceLakeRepository.generateFingerprint(workspaceId, relatedDepartment, sourceUrl || topic);
    await evidenceLakeRepository.saveEvidence({
      evidenceId: findingId,
      workspaceId,
      capability: 'MARKET_DISCOVERY',
      sourceType: 'EXTERNAL_WEB',
      title: sourceTitle,
      domainOrPlatform: new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname,
      sourceUrl,
      rawExcerpt: quoteOrSummary,
      extractedMetrics,
      provenance: classification === 'VERIFIED' ? 'USER_CONFIRMED' : 'AI_INFERRED',
      confidence: evidenceConfidence,
      detectedAt: retrievalDate,
      fingerprint,
      tags: [relatedDepartment.toLowerCase(), classification.toLowerCase()],
    });

    return completeFinding;
  }

  /**
   * Retrieves findings for a workspace, supporting filtering by department, classification, and topic.
   */
  public async getFindings(workspaceId: string, filters?: {
    department?: EvidenceDepartment;
    classification?: EvidenceClassification;
    topic?: string;
    limit?: number;
  }): Promise<EvidenceFinding[]> {
    const coll = db.collection<EvidenceFinding>(`workspaces/${workspaceId}/evidence_findings`);
    let query = coll as any;

    if (filters?.department) {
      query = query.where('relatedDepartment', '==', filters.department);
    }
    if (filters?.classification) {
      query = query.where('classification', '==', filters.classification);
    }

    const snap = await query.get();
    let findings = snap.docs.map((d: any) => d.data() as EvidenceFinding);

    if (filters?.topic) {
      const t = filters.topic.toLowerCase();
      findings = findings.filter((f: EvidenceFinding) => f.topic.toLowerCase().includes(t));
    }

    if (filters?.limit && filters.limit > 0) {
      findings = findings.slice(0, filters.limit);
    }

    return findings;
  }

  /**
   * Detects and explains contradictions among findings for a given topic/claim
   */
  public reconcileTopicContradictions(topic: string, claim: string, findings: EvidenceFinding[]): ContradictionReport {
    return contradictionDetectionEngine.analyzeDiscrepancies({
      topic,
      metricOrClaim: claim,
      findings,
    });
  }

  /**
   * Connects two entities in the Evidence Graph (e.g. FINDING impacts PRICING, or COMPETITOR solves PROBLEM)
   */
  public async linkEvidenceGraphEdge(params: {
    workspaceId: string;
    sourceNodeId: string;
    sourceNodeType: EvidenceGraphEdge['sourceNodeType'];
    targetNodeId: string;
    targetNodeType: EvidenceGraphEdge['targetNodeType'];
    relationshipType: EvidenceGraphEdge['relationshipType'];
    confidence?: number;
    description: string;
  }): Promise<EvidenceGraphEdge> {
    const {
      workspaceId,
      sourceNodeId,
      sourceNodeType,
      targetNodeId,
      targetNodeType,
      relationshipType,
      confidence = 0.9,
      description,
    } = params;

    const edgeId = `edge_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const edge: EvidenceGraphEdge = {
      edgeId,
      workspaceId,
      sourceNodeId,
      sourceNodeType,
      targetNodeId,
      targetNodeType,
      relationshipType,
      confidence,
      description,
      createdAt: new Date().toISOString(),
    };

    const docRef = db.doc<EvidenceGraphEdge>(`workspaces/${workspaceId}/evidence_graph_edges/${edgeId}`);
    await docRef.set(edge);

    return edge;
  }

  /**
   * Retrieves all evidence graph edges for a workspace
   */
  public async getEvidenceGraphEdges(workspaceId: string, nodeId?: string): Promise<EvidenceGraphEdge[]> {
    const coll = db.collection<EvidenceGraphEdge>(`workspaces/${workspaceId}/evidence_graph_edges`);
    const snap = await coll.get();
    const edges = snap.docs.map((d: any) => d.data() as EvidenceGraphEdge);

    if (!nodeId) return edges;
    return edges.filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
  }
}

export const evidenceEngineService = new EvidenceEngineService();
