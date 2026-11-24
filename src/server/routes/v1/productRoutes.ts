/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { productRepository } from '../../repositories/productRepository';
import { agentAuditLogRepository } from '../../repositories/agentAuditLogRepository';
import type { ProductEntity, ServiceEntity } from '../../types/api';

export function parseProductCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const c = rawLine[charIdx];
      if (c === '"' || c === "'") {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    values.push(current.trim());

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim();
    });
    rows.push(rowObj);
  }

  return rows;
}

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/products
 */
router.get(['/', '/products'], async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const products = await productRepository.listProducts(req.workspace!.workspaceId, category ? { category } : undefined);
  res.json({
    success: true,
    data: products,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/products
 */
router.post(
  ['/', '/products'],
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const {
      name,
      price,
      currency = 'USD',
      category = 'General',
      subcategory,
      sku,
      description,
      pricingStructure = 'one-time',
      cost,
      margin,
      variants,
      features,
      benefits,
      targetCustomer,
      availability = 'in_stock',
      differentiation,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Product name is required.' },
      });
      return;
    }

    const now = new Date().toISOString();
    const product: ProductEntity = {
      productId: `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      workspaceId,
      name: name.trim(),
      sku: sku ? String(sku).trim() : undefined,
      category: String(category).trim(),
      subcategory: subcategory ? String(subcategory).trim() : undefined,
      description: description ? String(description).trim() : '',
      price: Number(price) || 0,
      currency: String(currency).trim().toUpperCase(),
      pricingStructure,
      cost: cost !== undefined ? Number(cost) : undefined,
      margin: margin !== undefined ? Number(margin) : undefined,
      variants: Array.isArray(variants) ? variants : [],
      features: Array.isArray(features) ? features : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      targetCustomer: targetCustomer ? String(targetCustomer).trim() : '',
      availability,
      differentiation: differentiation ? String(differentiation).trim() : '',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    const created = await productRepository.createProduct(product);

    res.status(201).json({
      success: true,
      data: created,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/products/import
 * Canonical & bulk aliases: /import, /bulk, /bulk-import
 */
router.post(
  ['/import', '/bulk', '/bulk-import', '/products/import', '/products/bulk', '/products/bulk-import'],
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { csv, rawCsv, productsCsv, products, items, atomic = false, updateExisting = false } = req.body;

    let rawItems: any[];
    if (typeof csv === 'string' && csv.trim()) {
      rawItems = parseProductCsv(csv);
    } else if (typeof rawCsv === 'string' && rawCsv.trim()) {
      rawItems = parseProductCsv(rawCsv);
    } else if (typeof productsCsv === 'string' && productsCsv.trim()) {
      rawItems = parseProductCsv(productsCsv);
    } else if (Array.isArray(products) && products.length > 0) {
      rawItems = products;
    } else if (Array.isArray(items) && items.length > 0) {
      rawItems = items;
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCTS_PAYLOAD',
          message: 'Bulk import requires either a "csv" string or a non-empty "products" array.',
        },
      });
      return;
    }

    const created: ProductEntity[] = [];
    const updated: ProductEntity[] = [];
    const duplicates: Array<{ name: string; sku?: string; reason: string }> = [];
    const rejected: Array<{ row: number; name?: string; reason: string }> = [];
    const seenNames = new Set<string>();
    const seenSkus = new Set<string>();
    const now = new Date().toISOString();

    for (let i = 0; i < rawItems.length; i++) {
      const rowNum = i + 1;
      const item = rawItems[i];

      if (!item || typeof item !== 'object') {
        rejected.push({ row: rowNum, reason: 'Row item must be an object' });
        continue;
      }

      const name = String(item.name || item.title || '').trim();
      if (!name) {
        rejected.push({ row: rowNum, reason: 'Missing required field: name' });
        continue;
      }

      // Validate price
      const rawPrice = item.price !== undefined ? item.price : item.priceAmount;
      const parsedPrice =
        typeof rawPrice === 'number'
          ? rawPrice
          : Number(String(rawPrice || '').replace(/[^0-9.]/g, ''));
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        rejected.push({
          row: rowNum,
          name,
          reason: `Invalid price '${rawPrice}': Price must be a non-negative number`,
        });
        continue;
      }

      // Validate currency
      const rawCurrency = String(item.currency || 'USD').trim().toUpperCase();
      const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'USD';

      const sku = item.sku ? String(item.sku).trim() : undefined;
      const normName = name.toLowerCase();

      // Intra-batch deduplication
      if (seenNames.has(normName)) {
        const dup = { name, sku, reason: `Duplicate product name '${name}' within current import batch` };
        duplicates.push(dup);
        rejected.push({ row: rowNum, name, reason: dup.reason });
        continue;
      }
      seenNames.add(normName);

      if (sku) {
        const normSku = sku.toLowerCase();
        if (seenSkus.has(normSku)) {
        const dup = { name, sku, reason: `Duplicate SKU '${sku}' within current import batch` };
        duplicates.push(dup);
        rejected.push({ row: rowNum, name, reason: dup.reason });
        continue;
      }
        seenSkus.add(normSku);
      }

      // Database deduplication
      const existing = await productRepository.findByNameOrSku(workspaceId, name, sku);
      if (existing) {
        if (!updateExisting) {
          const reason = sku && existing.sku === sku
            ? `Product with matching SKU '${sku}' already exists`
            : `Product with matching name '${name}' already exists`;
          duplicates.push({ name, sku, reason });
          rejected.push({ row: rowNum, name, reason });
          continue;
        } else {
          // Update existing product in place
          const patched = await productRepository.updateProduct(workspaceId, existing.productId, {
            name,
            price: parsedPrice,
            currency,
            category: item.category ? String(item.category).trim() : existing.category,
            sku: sku || existing.sku,
            description:
              item.description !== undefined ? String(item.description).trim() : existing.description,
            cost: item.cost !== undefined ? Number(item.cost) : existing.cost,
            updatedAt: now,
          });
          updated.push(patched);
          continue;
        }
      }

      // Create new product
      const prod = await productRepository.createProduct({
        productId: `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        workspaceId,
        name,
        price: parsedPrice,
        currency,
        category: item.category ? String(item.category).trim() : 'General',
        sku,
        description: item.description ? String(item.description).trim() : '',
        cost: item.cost !== undefined ? Number(item.cost) : undefined,
        status: 'active',
        source: 'USER_CONFIRMED',
        createdAt: now,
        updatedAt: now,
      });
      created.push(prod);
    }

    // Atomic transaction check: if atomic=true and any errors occurred, abort entire import
    if (atomic && (rejected.length > 0 || duplicates.length > 0)) {
      for (const prod of created) {
        await productRepository.deleteProduct(workspaceId, prod.productId);
      }
      res.status(400).json({
        success: false,
        error: {
          code: 'ATOMIC_IMPORT_FAILED',
          message: `Atomic bulk import failed: ${rejected.length} row(s) had validation errors or duplicates. No products were imported.`,
          details: [...rejected],
        },
      });
      return;
    }

    // Audit log
    await agentAuditLogRepository.recordLog({
      logId: `audit_prod_bulk_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      workspaceId,
      actorUserId: req.user!.uid,
      action: 'BULK_IMPORT_PRODUCTS',
      resourceType: 'PRODUCT',
      resourceId: 'BULK',
      timestamp: now,
      metadata: {
        total: rawItems.length,
        createdCount: created.length,
        updatedCount: updated.length,
        duplicateCount: duplicates.length,
        rejectedCount: rejected.length,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        created,
        updated,
        duplicates,
        rejected,
        summary: {
          total: rawItems.length,
          createdCount: created.length,
          updatedCount: updated.length,
          duplicateCount: duplicates.length,
          rejectedCount: rejected.length,
        },
      },
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/products/:productId
 */
router.delete(
  ['/:productId', '/products/:productId'],
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { productId } = req.params;

    await productRepository.deleteProduct(workspaceId, productId);
    res.json({ success: true, message: 'Product deleted' });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/products/services
 */
router.get('/services', async (req: Request, res: Response): Promise<void> => {
  const services = await productRepository.listServices(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: services,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/products/services
 */
router.post(
  '/services',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { name, price, duration, category = 'General', description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Service name is required.' },
      });
      return;
    }

    const now = new Date().toISOString();
    const service: ServiceEntity = {
      serviceId: `srv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      workspaceId,
      name: name.trim(),
      category: String(category).trim(),
      description: description ? String(description).trim() : '',
      duration: duration ? String(duration).trim() : undefined,
      price: Number(price) || 0,
      currency: 'USD',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    const created = await productRepository.createService(service);
    res.status(201).json({
      success: true,
      data: created,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/products/services/:serviceId
 */
router.delete(
  '/services/:serviceId',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { serviceId } = req.params;

    await productRepository.deleteService(workspaceId, serviceId);
    res.json({ success: true, message: 'Service deleted' });
  }
);

export const productRoutes = router;
