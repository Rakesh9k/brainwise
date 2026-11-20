/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IIntegrationProvider, IntegrationCategory, ProviderMetadata } from './types';
import { googleResearchProvider } from './providers/googleResearchProvider';
import { googleAnalytics4Provider } from './providers/googleAnalytics4Provider';
import { googleSearchConsoleProvider } from './providers/googleSearchConsoleProvider';
import { googleBusinessProfileProvider } from './providers/googleBusinessProfileProvider';
import { emailProvider } from './providers/emailProvider';
import { metaInstagramProvider } from './providers/metaInstagramProvider';
import { linkedinProvider } from './providers/linkedinProvider';
import { youtubeProvider } from './providers/youtubeProvider';
import { googleDriveProvider } from './providers/googleDriveProvider';

/**
 * Enterprise Provider Registry
 * Central catalog of all authorized integration providers across BrainWise.
 */
export class ProviderRegistry {
  private providers = new Map<string, IIntegrationProvider>();

  constructor() {
    this.registerProvider(googleResearchProvider);
    this.registerProvider(googleAnalytics4Provider);
    this.registerProvider(googleSearchConsoleProvider);
    this.registerProvider(googleBusinessProfileProvider);
    this.registerProvider(emailProvider);
    this.registerProvider(metaInstagramProvider);
    this.registerProvider(linkedinProvider);
    this.registerProvider(youtubeProvider);
    this.registerProvider(googleDriveProvider);
  }

  public registerProvider(provider: IIntegrationProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(providerId: string): IIntegrationProvider | null {
    return this.providers.get(providerId) ?? null;
  }

  public hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  public listProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values()).map((p) => p.metadata);
  }

  public listByCategory(category: IntegrationCategory): ProviderMetadata[] {
    return this.listProviders().filter((m) => m.category === category);
  }
}

export const providerRegistry = new ProviderRegistry();
