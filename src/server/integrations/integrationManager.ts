/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import { providerRegistry } from './providerRegistry';
import { credentialManager } from './credentialManager';
import { oauthService } from './oauthService';
import { dataIngestionService } from './dataIngestionService';
import { integrationAuditService } from './integrationAuditService';
import type {
  IntegrationConnectionEntity,
  IntegrationCredentials,
  ExternalResource,
  IntegrationHealthStatus,
  ExternalAccountInfo,
  ProviderMetadata,
} from './types';

/**
 * Enterprise Centralized Integration Manager
 * Handles end-to-end integration registration, OAuth initiation, secure credential storage,
 * synchronization dispatch, health audits, and revocation across all BrainWise departments.
 */
export class IntegrationManager {
  /**
   * Retrieves all available provider definitions with connection status for a workspace.
   */
  public async getAvailableIntegrations(
    workspaceId: string
  ): Promise<Array<ProviderMetadata & { connection?: IntegrationConnectionEntity }>> {
    const providers = providerRegistry.listProviders();
    const connections = await this.listConnections(workspaceId);
    const connectionMap = new Map(connections.map((c) => [c.provider, c]));

    return providers.map((p) => ({
      ...p,
      connection: connectionMap.get(p.id),
    }));
  }

  /**
   * Lists active connections for a workspace.
   */
  public async listConnections(workspaceId: string): Promise<IntegrationConnectionEntity[]> {
    const snap = await db
      .collection<IntegrationConnectionEntity>(`workspaces/${workspaceId}/integrations`)
      .get();
    return snap.docs
      .map((d) => d.data())
      .filter((d): d is IntegrationConnectionEntity => Boolean(d));
  }

  /**
   * Retrieves a single connection entity.
   */
  public async getConnection(
    workspaceId: string,
    integrationId: string
  ): Promise<IntegrationConnectionEntity | null> {
    const snap = await db
      .doc<IntegrationConnectionEntity>(`workspaces/${workspaceId}/integrations/${integrationId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  /**
   * Initiates the connection workflow (generates OAuth URL or initializes API key connection).
   */
  public async startConnection(
    workspaceId: string,
    providerId: string,
    redirectUri: string,
    actorId = 'system'
  ): Promise<{ authUrl?: string; state?: string; connectionId: string; instructions?: string }> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' is not registered in BrainWise`);
    }

    const { state } = oauthService.generateState(workspaceId, providerId, redirectUri);
    const initResult = await provider.initializeConnection(workspaceId, { redirectUri, state });

    await integrationAuditService.logEvent({
      workspaceId,
      actorId,
      integrationId: providerId,
      action: 'INITIATE_CONNECTION',
      category: 'A_READ_ONLY',
      authorizationBasis: 'USER_INITIATED',
      approvalStatus: 'NOT_REQUIRED',
      result: 'SUCCESS',
      metadata: { providerId },
    });

    return {
      authUrl: initResult.authUrl,
      state,
      connectionId: initResult.connectionId,
      instructions: initResult.instructions,
    };
  }

  /**
   * Completes OAuth callback flow, exchanges tokens, encrypts credentials, and establishes connection.
   */
  public async completeOAuthConnection(params: {
    workspaceId: string;
    providerId: string;
    code: string;
    state: string;
    redirectUri: string;
    actorId?: string;
  }): Promise<IntegrationConnectionEntity> {
    const { workspaceId, providerId, code, state, redirectUri, actorId = 'system' } = params;

    // Verify state token
    const stateRecord = oauthService.validateState(state);
    if (
      !stateRecord ||
      stateRecord.workspaceId !== workspaceId ||
      stateRecord.providerId !== providerId
    ) {
      throw new Error(
        'Invalid or expired OAuth state parameter. Please retry the authorization flow.'
      );
    }

    const provider = providerRegistry.getProvider(providerId);
    if (!provider || !provider.handleOAuthCallback) {
      throw new Error(`Provider '${providerId}' does not support OAuth callbacks`);
    }

    // Exchange code for tokens
    const tokenResult = await provider.handleOAuthCallback(workspaceId, code, state, redirectUri);
    const credentials: IntegrationCredentials = {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      tokenType: tokenResult.tokenType || 'Bearer',
      scopes: tokenResult.scopes || provider.metadata.requiredScopes,
      expiresAt: tokenResult.expiresIn
        ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
        : undefined,
      extra: tokenResult.extra,
    };

    // Store encrypted credentials in secure subcollection (never in plain connection entity)
    const integrationId = providerId;
    await credentialManager.storeCredentials(workspaceId, integrationId, credentials);

    // Retrieve account info & available resources
    let accountInfo: ExternalAccountInfo | undefined;
    let selectedResources: ExternalResource[] = [];
    try {
      accountInfo = await provider.getAccountInfo(credentials);
      const resources = await provider.getResources(credentials);
      selectedResources = resources.filter((r) => r.selected);
    } catch (err) {
      console.warn(
        `[INTEGRATION_METADATA_WARNING] Could not fetch remote resources for ${providerId}:`,
        err
      );
    }

    const now = new Date().toISOString();
    const entity: IntegrationConnectionEntity = {
      integrationId,
      workspaceId,
      provider: providerId,
      name: provider.metadata.name,
      status: provider.metadata.isApprovalRequired ? 'awaiting_approval' : 'connected',
      category: provider.metadata.category,
      accountReference: accountInfo?.email || accountInfo?.accountName || 'Connected Account',
      accountInfo,
      selectedResources,
      grantedScopes: credentials.scopes,
      lastSyncAt: now,
      lastSyncStatus: 'success',
      syncFrequency: 'daily',
      createdAt: now,
      updatedAt: now,
    };

    // Save connection metadata (WITHOUT credentials)
    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).set(entity);

    // Trigger initial data ingestion
    await this.syncIntegration(workspaceId, integrationId, actorId).catch((err) => {
      console.warn(`[INITIAL_SYNC_WARNING] Background sync failed for ${integrationId}:`, err);
    });

    await integrationAuditService.logEvent({
      workspaceId,
      actorId,
      integrationId,
      action: 'CONNECT_PROVIDER_SUCCESS',
      category: 'A_READ_ONLY',
      authorizationBasis: 'OAUTH_AUTHORIZATION_CODE',
      approvalStatus: 'NOT_REQUIRED',
      result: 'SUCCESS',
      metadata: { accountReference: entity.accountReference },
    });

    return entity;
  }

  /**
   * Connects API-key or managed credentials provider.
   */
  public async connectApiKeyProvider(params: {
    workspaceId: string;
    providerId: string;
    apiKey?: string;
    actorId?: string;
  }): Promise<IntegrationConnectionEntity> {
    const { workspaceId, providerId, apiKey, actorId = 'system' } = params;
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    const credentials: IntegrationCredentials = {
      apiKey: apiKey || 'system_managed_key',
      scopes: provider.metadata.requiredScopes,
    };

    const integrationId = providerId;
    await credentialManager.storeCredentials(workspaceId, integrationId, credentials);

    const accountInfo = await provider.getAccountInfo(credentials);
    const resources = await provider.getResources(credentials);

    const now = new Date().toISOString();
    const entity: IntegrationConnectionEntity = {
      integrationId,
      workspaceId,
      provider: providerId,
      name: provider.metadata.name,
      status: 'connected',
      category: provider.metadata.category,
      accountReference: accountInfo?.accountName || 'Active Provider',
      accountInfo,
      selectedResources: resources,
      grantedScopes: provider.metadata.requiredScopes,
      lastSyncAt: now,
      lastSyncStatus: 'success',
      syncFrequency: 'daily',
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).set(entity);

    await integrationAuditService.logEvent({
      workspaceId,
      actorId,
      integrationId,
      action: 'CONNECT_API_KEY',
      category: 'B_INTERNAL',
      authorizationBasis: 'USER_CONFIGURATION',
      approvalStatus: 'NOT_REQUIRED',
      result: 'SUCCESS',
      metadata: { providerId },
    });

    // Initial sync
    await this.syncIntegration(workspaceId, integrationId, actorId);

    return entity;
  }

  /**
   * Synchronizes data from the external provider into the normalized data layer.
   */
  public async syncIntegration(
    workspaceId: string,
    integrationId: string,
    actorId = 'system'
  ): Promise<{ success: boolean; ingestedCount: number; error?: string }> {
    const connection = await this.getConnection(workspaceId, integrationId);
    if (!connection) {
      throw new Error(`Integration '${integrationId}' not found in workspace`);
    }

    const provider = providerRegistry.getProvider(connection.provider);
    if (!provider) {
      throw new Error(`Provider '${connection.provider}' is not available`);
    }

    const credentials = (await credentialManager.loadCredentials(workspaceId, integrationId)) || {};

    // Update connection status to syncing
    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).update({
      status: 'syncing',
      updatedAt: new Date().toISOString(),
    });

    try {
      const dataPackage = await provider.fetchData(credentials, {
        params: { workspaceId },
        limit: 10,
      });

      const { ingestedCount } = await dataIngestionService.ingestRecords(
        workspaceId,
        integrationId,
        dataPackage
      );

      const now = new Date().toISOString();
      await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).update({
        status: provider.metadata.isApprovalRequired ? 'awaiting_approval' : 'connected',
        lastSyncAt: now,
        lastSyncStatus: 'success',
        lastSyncError: null,
        updatedAt: now,
      });

      await integrationAuditService.logEvent({
        workspaceId,
        actorId,
        integrationId,
        action: 'SYNCHRONIZE_DATA',
        category: 'A_READ_ONLY',
        authorizationBasis: 'ACTIVE_CONNECTION',
        approvalStatus: 'NOT_REQUIRED',
        result: 'SUCCESS',
        metadata: { ingestedCount },
      });

      return { success: true, ingestedCount };
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).update({
        status: 'connection_error',
        lastSyncStatus: 'failed',
        lastSyncError: errorMsg,
        updatedAt: new Date().toISOString(),
      });

      await integrationAuditService.logEvent({
        workspaceId,
        actorId,
        integrationId,
        action: 'SYNCHRONIZE_DATA_FAILED',
        category: 'A_READ_ONLY',
        authorizationBasis: 'ACTIVE_CONNECTION',
        approvalStatus: 'NOT_REQUIRED',
        result: 'FAILURE',
        errorDetails: errorMsg,
      });

      return { success: false, ingestedCount: 0, error: errorMsg };
    }
  }

  /**
   * Health audit for all or single integration connection.
   */
  public async checkHealth(
    workspaceId: string,
    integrationId: string
  ): Promise<IntegrationHealthStatus> {
    const connection = await this.getConnection(workspaceId, integrationId);
    if (!connection) {
      return {
        healthy: false,
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        status: 'not_connected',
        error: 'Connection record not found',
      };
    }

    const provider = providerRegistry.getProvider(connection.provider);
    if (!provider) {
      return {
        healthy: false,
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        status: 'connection_error',
        error: 'Provider unregistered',
      };
    }

    const credentials = (await credentialManager.loadCredentials(workspaceId, integrationId)) || {};
    const health = await provider.checkHealth(credentials);

    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).update({
      healthStatus: health,
      updatedAt: new Date().toISOString(),
    });

    return health;
  }

  /**
   * Disconnects integration, revokes credentials, and securely purges secrets.
   */
  public async disconnectIntegration(
    workspaceId: string,
    integrationId: string,
    actorId = 'system'
  ): Promise<void> {
    const connection = await this.getConnection(workspaceId, integrationId);
    if (!connection) return;

    const provider = providerRegistry.getProvider(connection.provider);
    const credentials = await credentialManager.loadCredentials(workspaceId, integrationId);

    if (provider && credentials) {
      try {
        await provider.disconnect(workspaceId, credentials);
      } catch (err) {
        console.warn(`[DISCONNECT_WARNING] Remote revocation failed for ${integrationId}:`, err);
      }
    }

    // Securely delete encrypted credentials
    await credentialManager.deleteCredentials(workspaceId, integrationId);

    // Mark connection record as disconnected or remove
    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).delete();

    // Purge cached data
    await dataIngestionService.purgeIntegrationData(workspaceId, integrationId);

    await integrationAuditService.logEvent({
      workspaceId,
      actorId,
      integrationId,
      action: 'DISCONNECT_INTEGRATION',
      category: 'C_EXTERNAL_WRITE',
      authorizationBasis: 'USER_INITIATED',
      approvalStatus: 'APPROVED',
      approvedBy: actorId,
      result: 'SUCCESS',
    });
  }
}

export const integrationManager = new IntegrationManager();
