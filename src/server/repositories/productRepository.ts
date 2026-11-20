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
