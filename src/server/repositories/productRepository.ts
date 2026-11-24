/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ProductEntity, ServiceEntity } from '../types/api';

export class ProductRepository {
  // PRODUCTS
  public async createProduct(product: ProductEntity): Promise<ProductEntity> {
    await db
      .collection<ProductEntity>(`workspaces/${product.workspaceId}/products`)
      .doc(product.productId)
      .set(product);
    return product;
  }

  public async getProduct(workspaceId: string, productId: string): Promise<ProductEntity | null> {
    const snap = await db
      .collection<ProductEntity>(`workspaces/${workspaceId}/products`)
      .doc(productId)
      .get();
    return snap.exists ? (snap.data() as ProductEntity) : null;
  }

  public async listProducts(
    workspaceId: string,
    filter?: { status?: ProductEntity['status']; category?: string }
  ): Promise<ProductEntity[]> {
    let query = db
      .collection<ProductEntity>(`workspaces/${workspaceId}/products`)
      .orderBy('createdAt', 'desc');

    if (filter?.status) {
      query = query.where('status', '==', filter.status);
    }
    if (filter?.category) {
      query = query.where('category', '==', filter.category);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as ProductEntity[];
  }

  public async updateProduct(
    workspaceId: string,
    productId: string,
    patch: Partial<ProductEntity>
  ): Promise<ProductEntity> {
    const ref = db.collection<ProductEntity>(`workspaces/${workspaceId}/products`).doc(productId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Product '${productId}' not found in workspace '${workspaceId}'`);
    }

    const updated: ProductEntity = {
      ...(existing.data() as ProductEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async deleteProduct(workspaceId: string, productId: string): Promise<void> {
    await db
      .collection<ProductEntity>(`workspaces/${workspaceId}/products`)
      .doc(productId)
      .delete();
  }

  public async findByNameOrSku(
    workspaceId: string,
    name: string,
    sku?: string
  ): Promise<ProductEntity | null> {
    const products = await this.listProducts(workspaceId);
    const cleanName = name.trim().toLowerCase();
    const cleanSku = sku?.trim().toLowerCase();

    return (
      products.find((p) => {
        if (cleanSku && p.sku && p.sku.trim().toLowerCase() === cleanSku) return true;
        return p.name.trim().toLowerCase() === cleanName;
      }) || null
    );
  }

  public async importCatalogue(
    workspaceId: string,
    items: Array<Partial<ProductEntity> & { name: string }>,
    options: { updateExisting?: boolean } = {}
  ): Promise<{
    created: ProductEntity[];
    updated: ProductEntity[];
    duplicates: Array<{ name: string; existingId: string; reason: string }>;
  }> {
    const created: ProductEntity[] = [];
    const updated: ProductEntity[] = [];
    const duplicates: Array<{ name: string; existingId: string; reason: string }> = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;

      const existing = await this.findByNameOrSku(workspaceId, item.name, item.sku);

      if (existing) {
        if (options.updateExisting) {
          const patched = await this.updateProduct(workspaceId, existing.productId, {
            ...item,
            updatedAt: now,
          });
          updated.push(patched);
        } else {
          duplicates.push({
            name: item.name,
            existingId: existing.productId,
            reason:
              item.sku && existing.sku === item.sku ? 'Matching SKU' : 'Matching product name',
          });
        }
      } else {
        const productId =
          item.productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newProduct: ProductEntity = {
          productId,
          workspaceId,
          name: item.name.trim(),
          sku: item.sku,
          category: item.category || 'General',
          subcategory: item.subcategory,
          description: item.description || '',
          price: Number(item.price) || 0,
          currency: item.currency || 'USD',
          pricingStructure: item.pricingStructure || 'one-time',
          cost: item.cost,
          margin: item.margin,
          variants: item.variants || [],
          features: item.features || [],
          benefits: item.benefits || [],
          targetCustomer: item.targetCustomer || '',
          availability: item.availability || 'in_stock',
          differentiation: item.differentiation || '',
          status: item.status || 'active',
          source: item.source || 'USER_CONFIRMED',
          createdAt: now,
          updatedAt: now,
        };
        await this.createProduct(newProduct);
        created.push(newProduct);
      }
    }

    return { created, updated, duplicates };
  }

  public async bulkCreateProducts(
    workspaceId: string,
    products: Omit<ProductEntity, 'workspaceId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<ProductEntity[]> {
    const now = new Date().toISOString();
    const created: ProductEntity[] = [];

    for (const p of products) {
      const entity: ProductEntity = {
        ...p,
        workspaceId,
        createdAt: now,
        updatedAt: now,
      };
      await this.createProduct(entity);
      created.push(entity);
    }

    return created;
  }

  // SERVICES
  public async createService(service: ServiceEntity): Promise<ServiceEntity> {
    await db
      .collection<ServiceEntity>(`workspaces/${service.workspaceId}/services`)
      .doc(service.serviceId)
      .set(service);
    return service;
  }

  public async getService(workspaceId: string, serviceId: string): Promise<ServiceEntity | null> {
    const snap = await db
      .collection<ServiceEntity>(`workspaces/${workspaceId}/services`)
      .doc(serviceId)
      .get();
    return snap.exists ? (snap.data() as ServiceEntity) : null;
  }

  public async listServices(
    workspaceId: string,
    filter?: { status?: ServiceEntity['status'] }
  ): Promise<ServiceEntity[]> {
    let query = db
      .collection<ServiceEntity>(`workspaces/${workspaceId}/services`)
      .orderBy('createdAt', 'desc');

    if (filter?.status) {
      query = query.where('status', '==', filter.status);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as ServiceEntity[];
  }

  public async updateService(
    workspaceId: string,
    serviceId: string,
    patch: Partial<ServiceEntity>
  ): Promise<ServiceEntity> {
    const ref = db.collection<ServiceEntity>(`workspaces/${workspaceId}/services`).doc(serviceId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Service '${serviceId}' not found in workspace '${workspaceId}'`);
    }

    const updated: ServiceEntity = {
      ...(existing.data() as ServiceEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async deleteService(workspaceId: string, serviceId: string): Promise<void> {
    await db
      .collection<ServiceEntity>(`workspaces/${workspaceId}/services`)
      .doc(serviceId)
      .delete();
  }
}

export const productRepository = new ProductRepository();
