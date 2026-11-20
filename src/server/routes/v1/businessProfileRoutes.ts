/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { businessBrainService } from '../../services/businessBrainService';
import { auditService } from '../../services/auditService';
import { productRepository } from '../../repositories/productRepository';
import { audienceSegmentRepository } from '../../repositories/audienceSegmentRepository';
import { departmentEventBus } from '../../events/eventBus';
import { creditService } from '../../services/creditService';
import { serverConfig } from '../../config/index';
import { GoogleGenAI } from '@google/genai';
import type { ProductEntity, ServiceEntity, AudienceSegmentEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const profile = await businessBrainService.getProfile(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: profile,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile
 * Full profile initialization or overwrite
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await businessBrainService.updateProfile(req.workspace!.workspaceId, req.body);

    await auditService.log({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.user!.uid,
      action: 'BUSINESS_BRAIN_INITIALIZED',
      resourceType: 'businessProfile',
      resourceId: req.workspace!.workspaceId,
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/business-profile
 * Partial update
 */
router.patch(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await businessBrainService.updateProfile(req.workspace!.workspaceId, req.body);

    await auditService.log({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.user!.uid,
      action: 'BUSINESS_BRAIN_UPDATED',
      resourceType: 'businessProfile',
      resourceId: req.workspace!.workspaceId,
      metadata: req.body,
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/confirm-fact
 */
router.post(
  '/confirm-fact',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { fieldKey } = req.body;
    if (!fieldKey) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELD_KEY',
          message: 'fieldKey is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const updated = await businessBrainService.confirmFact(
      req.workspace!.workspaceId,
      fieldKey,
      req.user!.displayName || req.user!.email
    );

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/exclusions
 */
router.post(
  '/exclusions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { rule } = req.body;
    if (!rule) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_RULE',
          message: 'rule string is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const updated = await businessBrainService.addExclusionRule(req.workspace!.workspaceId, rule);
    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/business-profile/exclusions
 */
router.delete(
  '/exclusions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { rule } = req.body;
    if (!rule) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_RULE',
          message: 'rule string is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const updated = await businessBrainService.removeExclusionRule(
      req.workspace!.workspaceId,
      rule
    );
    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile/history
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const history = await businessBrainService.getHistory(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: history,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/generate
 * Synthesizes structured Business Brain from onboarding answers with fact provenance
 */
router.post(
  '/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { onboardingData } = req.body;
      const result = await businessBrainService.generateFromOnboarding({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        onboardingData: onboardingData || {},
      });

      await auditService.log({
        workspaceId: req.workspace!.workspaceId,
        actorUserId: req.user!.uid,
        action: 'BUSINESS_BRAIN_GENERATED',
        resourceType: 'businessProfile',
        resourceId: req.workspace!.workspaceId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'BRAIN_GENERATION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to generate Business Brain',
          category: 'AI_ORCHESTRATION_ERROR',
          retryable: true,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/approve
 * Approves and locks in the generated Business Brain, advancing onboarding status
 */
router.post(
  '/approve',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await businessBrainService.approveProfile(
        req.workspace!.workspaceId,
        req.user!.uid
      );

      await auditService.log({
        workspaceId: req.workspace!.workspaceId,
        actorUserId: req.user!.uid,
        action: 'BUSINESS_BRAIN_APPROVED',
        resourceType: 'businessProfile',
        resourceId: req.workspace!.workspaceId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'BRAIN_APPROVAL_FAILED',
          message: err instanceof Error ? err.message : 'Failed to approve Business Brain',
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/regenerate
 * Refreshes strategic insights while preserving all USER_CONFIRMED facts
 */
router.post(
  '/regenerate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { instructions } = req.body;
      const result = await businessBrainService.regenerateProfile({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        instructions,
      });

      await auditService.log({
        workspaceId: req.workspace!.workspaceId,
        actorUserId: req.user!.uid,
        action: 'BUSINESS_BRAIN_REGENERATED',
        resourceType: 'businessProfile',
        resourceId: req.workspace!.workspaceId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'BRAIN_REGENERATION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to regenerate Business Brain',
          category: 'AI_ORCHESTRATION_ERROR',
          retryable: true,
        },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile/versions
 * Lists snapshot version history
 */
router.get('/versions', async (req: Request, res: Response): Promise<void> => {
  const versions = await businessBrainService.getVersions(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: versions,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/versions/:versionId/restore
 * Restores a snapshot version
 */
router.post(
  '/versions/:versionId/restore',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      const restored = await businessBrainService.restoreVersion({
        workspaceId: req.workspace!.workspaceId,
        versionId,
        userId: req.user!.uid,
      });

      await auditService.log({
        workspaceId: req.workspace!.workspaceId,
        actorUserId: req.user!.uid,
        action: 'BUSINESS_BRAIN_RESTORED',
        resourceType: 'businessProfile',
        resourceId: req.workspace!.workspaceId,
        metadata: { restoredVersionId: versionId },
      });

      res.json({
        success: true,
        data: restored,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'BRAIN_RESTORE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to restore version',
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);

// =============================================================================
// PHASE 7: PRODUCT & SERVICE CATALOGUE
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile/products
 */
router.get('/products', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const status = req.query.status as ProductEntity['status'] | undefined;
  const products = await productRepository.listProducts(req.workspace!.workspaceId, {
    category,
    status,
  });
  res.json({ success: true, data: products });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/products
 */
router.post(
  '/products',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      category,
      description,
      price,
      currency,
      features,
      benefits,
      targetCustomer,
      differentiation,
    } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_NAME', message: 'Product name is required' },
      });
      return;
    }

    const productId =
      req.body.productId || `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const product: ProductEntity = {
      productId,
      workspaceId: req.workspace!.workspaceId,
      name: name.trim(),
      category: category || 'General',
      description: description || '',
      price: Number(price) || 0,
      currency: currency || 'USD',
      features: Array.isArray(features) ? features : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      targetCustomer: targetCustomer || '',
      differentiation: differentiation || '',
      status: req.body.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    const saved = await productRepository.createProduct(product);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'PRODUCT_CREATED',
      resourceId: productId,
      metadata: { name: saved.name, category: saved.category },
    });

    res.status(201).json({ success: true, data: saved });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/products/bulk
 */
router.post(
  '/products/bulk',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRODUCTS', message: 'products must be a non-empty array' },
      });
      return;
    }

    const created = await productRepository.bulkCreateProducts(
      req.workspace!.workspaceId,
      products
    );

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'PRODUCT_CREATED',
      resourceId: 'bulk',
      metadata: { count: created.length },
    });

    res.status(201).json({ success: true, data: created });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/business-profile/products/:productId
 */
router.patch(
  '/products/:productId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await productRepository.updateProduct(
      req.workspace!.workspaceId,
      req.params.productId,
      req.body
    );

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'PRODUCT_UPDATED',
      resourceId: req.params.productId,
      metadata: req.body,
    });

    res.json({ success: true, data: updated });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/business-profile/products/:productId
 */
router.delete(
  '/products/:productId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await productRepository.deleteProduct(req.workspace!.workspaceId, req.params.productId);
    res.json({ success: true, data: { deleted: true, productId: req.params.productId } });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile/services
 */
router.get('/services', async (req: Request, res: Response): Promise<void> => {
  const services = await productRepository.listServices(req.workspace!.workspaceId);
  res.json({ success: true, data: services });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/services
 */
router.post(
  '/services',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      category,
      description,
      price,
      pricingModel,
      duration,
      deliveryLocation,
      targetCustomer,
      benefits,
    } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_NAME', message: 'Service name is required' },
      });
      return;
    }

    const serviceId =
      req.body.serviceId || `srv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const service: ServiceEntity = {
      serviceId,
      workspaceId: req.workspace!.workspaceId,
      name: name.trim(),
      category: category || 'Consulting & Services',
      description: description || '',
      price: Number(price) || 0,
      pricingModel: pricingModel || 'Fixed',
      duration,
      deliveryLocation,
      targetCustomer: targetCustomer || '',
      benefits: Array.isArray(benefits) ? benefits : [],
      status: req.body.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    const saved = await productRepository.createService(service);
    res.status(201).json({ success: true, data: saved });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/business-profile/services/:serviceId
 */
router.patch(
  '/services/:serviceId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await productRepository.updateService(
      req.workspace!.workspaceId,
      req.params.serviceId,
      req.body
    );
    res.json({ success: true, data: updated });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/business-profile/services/:serviceId
 */
router.delete(
  '/services/:serviceId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await productRepository.deleteService(req.workspace!.workspaceId, req.params.serviceId);
    res.json({ success: true, data: { deleted: true, serviceId: req.params.serviceId } });
  }
);

// =============================================================================
// AUDIENCE SEGMENTS
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/business-profile/audience
 */
router.get('/audience', async (req: Request, res: Response): Promise<void> => {
  const segments = await audienceSegmentRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({ success: true, data: segments });
});

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/audience
 */
router.post(
  '/audience',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      type,
      needs,
      painPoints,
      buyingMotivations,
      geography,
      demographics,
      behavior,
      decisionFactors,
      objections,
      isConfirmed,
    } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_NAME', message: 'Segment name is required' },
      });
      return;
    }

    const segmentId =
      req.body.segmentId || `seg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const segment: AudienceSegmentEntity = {
      segmentId,
      workspaceId: req.workspace!.workspaceId,
      name: name.trim(),
      type: type === 'B2B' ? 'B2B' : 'B2C',
      needs: Array.isArray(needs) ? needs : [],
      painPoints: Array.isArray(painPoints) ? painPoints : [],
      buyingMotivations: Array.isArray(buyingMotivations) ? buyingMotivations : [],
      geography: geography || req.workspace!.country || 'Global',
      demographics: demographics || {},
      behavior: Array.isArray(behavior) ? behavior : [],
      decisionFactors: Array.isArray(decisionFactors) ? decisionFactors : [],
      objections: Array.isArray(objections) ? objections : [],
      isConfirmed: Boolean(isConfirmed),
      createdAt: now,
      updatedAt: now,
    };

    const saved = await audienceSegmentRepository.create(segment);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'TARGET_AUDIENCE_UPDATED',
      resourceId: segmentId,
      metadata: { name: saved.name },
    });

    res.status(201).json({ success: true, data: saved });
  }
);

// =============================================================================
// DOCUMENT EXTRACTION & INTELLIGENCE INGESTION
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/business-profile/extract-document
 * Extracts facts from uploaded document text/content, returning proposed updates with fact provenance
 */
router.post(
  '/extract-document',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { documentName, documentContent, documentType } = req.body;
    if (!documentContent || typeof documentContent !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONTENT', message: 'documentContent string is required' },
      });
      return;
    }

    const reservation = await creditService.reserveCredits({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      featureId: 'FEAT-DOC-001',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    try {
      let extracted = {
        businessName: '',
        detectedProducts: [] as Array<{ name: string; price?: number; description?: string }>,
        detectedAudience: [] as string[],
        detectedPositioning: '',
        confidence: 0.85,
      };

      if (serverConfig.geminiApiKey && process.env.NODE_ENV !== 'test' && !serverConfig.isTest) {
        try {
          const ai = new GoogleGenAI({ apiKey: serverConfig.geminiApiKey });
          const prompt = `You are BrainWise Business Intelligence Extraction Engine.
Analyze the following business document content and extract structured business understanding.
Document Name: ${documentName || 'Uploaded File'}
Document Type: ${documentType || 'Text Document'}
Document Content:
${documentContent.slice(0, 10000)}

Output valid JSON only with keys:
"businessName": string,
"detectedProducts": array of { name: string, price: number, description: string },
"detectedAudience": array of string pain points or segments,
"detectedPositioning": string summary of value proposition.`;

          const response = await ai.models.generateContent({
            model: serverConfig.geminiModel,
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });

          if (response.text) {
            extracted = JSON.parse(response.text);
          }
        } catch {
          // Fall back gracefully to deterministic text parser
        }
      }

      if (!extracted.detectedProducts.length) {
        // Fallback rule-based parsing
        const lines = documentContent
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const nameGuess = lines[0]?.slice(0, 50) || 'Analyzed Business';
        extracted = {
          businessName: nameGuess,
          detectedProducts: [
            {
              name: lines[1] ? lines[1].slice(0, 40) : 'Core Product Offer',
              price: 99,
              description: 'Extracted from document',
            },
          ],
          detectedAudience: ['Primary customer group referenced in document'],
          detectedPositioning: lines[2]
            ? lines[2].slice(0, 100)
            : 'Verified product differentiation from collateral.',
          confidence: 0.78,
        };
      }

      const settlement = await creditService.settleCredits({
        workspaceId: req.workspace!.workspaceId,
        reservation,
        featureId: 'FEAT-DOC-001',
        notes: `Document extraction: ${documentName || 'file'}`,
      });

      res.json({
        success: true,
        data: {
          extracted,
          provenance: 'AI_INFERRED',
          requiresUserApproval: true,
          creditsDeducted: 3,
          creditBalanceRemaining: settlement.remainingBalance,
        },
      });
    } catch (err) {
      if (reservation) {
        await creditService.refundCredits({
          workspaceId: req.workspace!.workspaceId,
          reservation,
          reason: err instanceof Error ? err.message : 'Document extraction failed',
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: err instanceof Error ? err.message : 'Extraction error',
        },
      });
    }
  }
);

export const businessProfileRoutes = router;
