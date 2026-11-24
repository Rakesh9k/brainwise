/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { evidenceEngineService } from '../../services/evidenceEngineService';
import type { EvidenceClassification, EvidenceDepartment } from '../../types/evidence';

export const evidenceRoutes = Router({ mergeParams: true });

/**
 * GET /api/v1/workspaces/:workspaceId/evidence
 * Lists research findings for a workspace with optional filters
 */
evidenceRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { department, classification, topic, limit } = req.query;

    const findings = await evidenceEngineService.getFindings(workspaceId, {
      department: department as EvidenceDepartment | undefined,
      classification: classification as EvidenceClassification | undefined,
      topic: topic ? String(topic) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });

    res.json({
      success: true,
      data: findings,
      count: findings.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/evidence
 * Ingests, classifies, and indexes a new research finding
 */
evidenceRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const {
      topic,
      sourceTitle,
      sourceUrl,
      sourceType,
      publicationDate,
      extractedEvidence,
      quoteOrSummary,
      geographicRelevance,
      evidenceConfidence,
      relatedDepartment,
      extractedMetrics,
      relatedEntityIds,
      corroboratingSourcesCount,
    } = req.body;

    if (!topic || !sourceTitle || !sourceUrl || !sourceType || !extractedEvidence || !relatedDepartment) {
      res.status(400).json({
        success: false,
        error: 'Missing required evidence attributes: topic, sourceTitle, sourceUrl, sourceType, extractedEvidence, and relatedDepartment are mandatory.',
      });
      return;
    }

    const finding = await evidenceEngineService.ingestFinding({
      workspaceId,
      topic,
      sourceTitle,
      sourceUrl,
      sourceType,
      publicationDate,
      extractedEvidence,
      quoteOrSummary: quoteOrSummary || extractedEvidence,
      geographicRelevance,
      evidenceConfidence,
      relatedDepartment,
      extractedMetrics,
      relatedEntityIds,
      corroboratingSourcesCount,
    });

    res.status(201).json({
      success: true,
      data: finding,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/evidence/reconcile
 * Detects discrepancies and evaluates contradictions among findings
 */
evidenceRoutes.post('/reconcile', async (req: Request, res: Response) => {
  try {
    const { topic, metricOrClaim, findings } = req.body;

    if (!topic || !metricOrClaim || !Array.isArray(findings)) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: topic, metricOrClaim, and findings array are required.',
      });
      return;
    }

    const report = evidenceEngineService.reconcileTopicContradictions(topic, metricOrClaim, findings);

    res.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/evidence/graph/edges
 * Creates a semantic edge in the Evidence Graph
 */
evidenceRoutes.post('/graph/edges', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const {
      sourceNodeId,
      sourceNodeType,
      targetNodeId,
      targetNodeType,
      relationshipType,
      confidence,
      description,
    } = req.body;

    if (!sourceNodeId || !sourceNodeType || !targetNodeId || !targetNodeType || !relationshipType || !description) {
      res.status(400).json({
        success: false,
        error: 'Missing required graph edge attributes: sourceNodeId, sourceNodeType, targetNodeId, targetNodeType, relationshipType, and description are mandatory.',
      });
      return;
    }

    const edge = await evidenceEngineService.linkEvidenceGraphEdge({
      workspaceId,
      sourceNodeId,
      sourceNodeType,
      targetNodeId,
      targetNodeType,
      relationshipType,
      confidence,
      description,
    });

    res.status(201).json({
      success: true,
      data: edge,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/evidence/graph/edges
 * Retrieves edges in the Evidence Graph for a workspace
 */
evidenceRoutes.get('/graph/edges', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { nodeId } = req.query;

    const edges = await evidenceEngineService.getEvidenceGraphEdges(
      workspaceId,
      nodeId ? String(nodeId) : undefined
    );

    res.json({
      success: true,
      data: edges,
      count: edges.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
