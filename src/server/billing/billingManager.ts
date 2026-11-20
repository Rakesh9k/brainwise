/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IBillingProvider } from './types';
import { cashfreeProvider } from './providers/cashfreeProvider';

export class BillingManager {
  private providers = new Map<string, IBillingProvider>();
  private defaultProviderId = 'cashfree';

  constructor() {
    this.registerProvider(cashfreeProvider);
  }

  public registerProvider(provider: IBillingProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(providerId?: string): IBillingProvider {
    const id = providerId || this.defaultProviderId;
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Billing provider not registered: ${id}`);
    }
    return provider;
  }

  public setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Cannot set default provider, not found: ${providerId}`);
    }
    this.defaultProviderId = providerId;
  }

  public listProviders(): Array<{ id: string; name: string; isDefault: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isDefault: p.id === this.defaultProviderId,
    }));
  }
}

export const billingManager = new BillingManager();
