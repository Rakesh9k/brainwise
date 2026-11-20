/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { credentialManager } from './integrations/credentialManager';
import { oauthService } from './integrations/oauthService';
import { providerRegistry } from './integrations/providerRegistry';
import { dataIngestionService } from './integrations/dataIngestionService';
import { integrationAuditService } from './integrations/integrationAuditService';
import { integrationManager } from './integrations/integrationManager';
import { automationEngine } from './automation/automationEngine';
import { AUTOMATION_TEMPLATES } from './automation/templates';
import { getDepartmentExternalContext } from './departments/framework';
import { googleResearchProvider } from './integrations/providers/googleResearchProvider';
import { googleAnalytics4Provider } from './integrations/providers/googleAnalytics4Provider';
import { googleSearchConsoleProvider } from './integrations/providers/googleSearchConsoleProvider';
import { googleBusinessProfileProvider } from './integrations/providers/googleBusinessProfileProvider';
import { emailProvider } from './integrations/providers/emailProvider';
import { metaInstagramProvider } from './integrations/providers/metaInstagramProvider';
import { linkedinProvider } from './integrations/providers/linkedinProvider';
import { youtubeProvider } from './integrations/providers/youtubeProvider';
import { googleDriveProvider } from './integrations/providers/googleDriveProvider';

test('PHASE 8 — SUITE 1: Credential Security & AES-256-GCM Encryption', async (t) => {
  const workspaceId = 'ws_sec_test_' + Date.now();
  const providerId = 'google-analytics-4';

  await t.test('Encrypts and decrypts credentials with authenticated AES-256-GCM', () => {
    const rawTokens = {
      accessToken: 'ya29.sample_mock_oauth_access_token_12345',
      refreshToken: '1//sample_mock_refresh_token_67890',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    };

    const encrypted = credentialManager.encrypt(rawTokens);
    assert.ok(encrypted.ciphertext, 'Ciphertext must be present');
    assert.ok(encrypted.iv, '96-bit IV must be present');
    assert.ok(encrypted.tag, '128-bit Auth Tag must be present');
    assert.equal(encrypted.algorithm, 'aes-256-gcm');
    assert.ok(
      !encrypted.ciphertext.includes('sample_mock_oauth_access_token_12345'),
      'Ciphertext must not expose raw token'
    );

    const decrypted = credentialManager.decrypt(encrypted);
    assert.equal(decrypted.accessToken, rawTokens.accessToken);
    assert.equal(decrypted.refreshToken, rawTokens.refreshToken);
    assert.deepEqual(decrypted.scopes, rawTokens.scopes);
  });

  await t.test('Rejects tampered ciphertext with authentication error', () => {
    const rawTokens = { apiKey: 'top_secret_api_key' };
    const encrypted = credentialManager.encrypt(rawTokens);

    // Tamper with ciphertext by altering characters
    const tamperedCiphertext = 'ff' + encrypted.ciphertext.substring(2);
    const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

    assert.throws(
      () => credentialManager.decrypt(tampered),
      /Unsupported state or unable to authenticate data|bad decrypt|authentication failed/i,
      'Must reject tampered ciphertext with cryptographic authentication failure'
    );
  });

  await t.test(
    'Stores and retrieves encrypted credentials in Firestore subcollection',
    async () => {
      const sampleCreds = { apiKey: 'key_live_live_secret_998877' };
      await credentialManager.storeCredentials(workspaceId, providerId, sampleCreds);

      const retrieved = await credentialManager.loadCredentials(workspaceId, providerId);
      assert.ok(retrieved, 'Retrieved credentials must exist');
      assert.equal(retrieved.apiKey, sampleCreds.apiKey);

      // Purge credentials
      await credentialManager.deleteCredentials(workspaceId, providerId);
      const afterDelete = await credentialManager.loadCredentials(workspaceId, providerId);
      assert.equal(afterDelete, null, 'Credentials must be removed upon deletion');
    }
  );
});

test('PHASE 8 — SUITE 2: OAuth 2.0 Security, PKCE & Anti-CSRF Verification', async (t) => {
  const workspaceId = 'ws_oauth_test_' + Date.now();
  const providerId = 'google-search-console';
  const redirectUri = 'http://localhost:5173/auth/callback';

  await t.test('Generates PKCE code_verifier and S256 code_challenge', () => {
    const { codeVerifier } = oauthService.generateState(workspaceId, providerId, redirectUri);
    assert.ok(codeVerifier && codeVerifier.length >= 43, 'Verifier must have high entropy');
    const challenge = oauthService.generateCodeChallenge(codeVerifier);
    assert.ok(challenge.length > 0, 'S256 challenge must be generated');
  });

  await t.test('Generates tamper-evident HMAC state and verifies within 15-minute TTL', () => {
    const { state } = oauthService.generateState(workspaceId, providerId, redirectUri);
    assert.ok(state.length > 20, 'State must be non-empty string');

    const stateRecord = oauthService.validateState(state);
    assert.ok(stateRecord, 'Original state must validate cleanly');
    assert.equal(stateRecord.workspaceId, workspaceId);
    assert.equal(stateRecord.providerId, providerId);
  });

  await t.test('Rejects tampered OAuth state', () => {
    const { state } = oauthService.generateState(workspaceId, providerId, redirectUri);
    // Tamper with state
    const tamperedState = state.slice(0, -4) + 'AAAA';
    const stateRecord = oauthService.validateState(tamperedState);
    assert.equal(stateRecord, null, 'Tampered state must fail verification');
  });

  await t.test('Enforces single-use consumption of OAuth state (replays blocked)', () => {
    const { state } = oauthService.generateState(workspaceId, providerId, redirectUri);
    const firstCheck = oauthService.validateState(state);
    assert.ok(firstCheck);

    // Replay attack attempt
    const secondCheck = oauthService.validateState(state);
    assert.equal(secondCheck, null, 'Replaying consumed state must be blocked');
  });
});

test('PHASE 8 — SUITE 3: Provider Registry & Multi-Provider Ingestion Capabilities', async (t) => {
  await t.test('Registers all 9 production provider adapters across core categories', () => {
    const allProviders = providerRegistry.listProviders();
    assert.equal(allProviders.length, 9, 'All 9 production providers must be registered');

    const ids = allProviders.map((p) => p.id);
    assert.ok(ids.includes('google-research'));
    assert.ok(ids.includes('google-analytics-4'));
    assert.ok(ids.includes('google-search-console'));
    assert.ok(ids.includes('google-business-profile'));
    assert.ok(ids.includes('email-service'));
    assert.ok(ids.includes('meta-instagram'));
    assert.ok(ids.includes('linkedin-marketing'));
    assert.ok(ids.includes('youtube-data'));
    assert.ok(ids.includes('google-drive'));
  });

  await t.test('Categorizes providers accurately', () => {
    const analytics = providerRegistry.listByCategory('website_seo');
    assert.ok(analytics.length >= 2, 'Must include GA4 and GSC');

    const marketing = providerRegistry.listByCategory('social_media');
    assert.ok(marketing.length >= 2, 'Must include Meta and LinkedIn');

    const research = providerRegistry.listByCategory('research');
    assert.ok(research.length >= 1, 'Must include Google Research');
  });
});

test('PHASE 8 — SUITE 4: All 9 Provider Implementations & Data Adapters', async (t) => {
  const credentials = { apiKey: 'mock_key', accessToken: 'mock_token' };

  await t.test('1. Google Research Provider: Synthesizes web research with citations', async () => {
    const pkg = await googleResearchProvider.fetchData(credentials, {
      params: { query: 'B2B SaaS Growth Marketing Benchmarks 2026' },
    });
    assert.ok(pkg.records.length > 0, 'Research records must be returned');
    assert.equal(pkg.records[0].provider, 'google-research');
    assert.ok(['research', 'market'].includes(pkg.records[0].category));
    assert.ok(pkg.records[0].provenance.sourceType, 'Provenance sourceType must be defined');
  });

  await t.test(
    '2. Google Analytics 4 Provider: Ingests traffic & session performance',
    async () => {
      const pkg = await googleAnalytics4Provider.fetchData(credentials, { limit: 10 });
      assert.ok(pkg.records.length > 0, 'GA4 must return records');
      const overview = pkg.records.find((r) => r.category === 'website_seo');
      assert.ok(overview);
      assert.ok(overview.metrics.activeUsers > 0);
      assert.ok(overview.metrics.sessions > 0);
    }
  );

  await t.test(
    '3. Google Search Console Provider: Ingests impressions, clicks & keywords',
    async () => {
      const pkg = await googleSearchConsoleProvider.fetchData(credentials, { limit: 10 });
      assert.ok(pkg.records.length > 0, 'GSC must return search records');
      const queryRecord = pkg.records.find((r) => r.category === 'seo_performance');
      assert.ok(queryRecord);
      assert.ok(queryRecord.metrics.totalImpressions > 0);
    }
  );

  await t.test('4. Google Business Profile Provider: Handles local reach & reviews', async () => {
    const pkg = await googleBusinessProfileProvider.fetchData(credentials, { limit: 10 });
    assert.ok(pkg.records.length > 0, 'GBP must return performance and reviews');
    const perf = pkg.records.find((r) => r.category === 'local_business');
    assert.ok(perf);
    assert.ok(perf.metrics.mapsImpressions > 0);
  });

  await t.test(
    '5. Email Service Provider: Dispatches transactional message with idempotency',
    async () => {
      const result = await emailProvider.executeAction(credentials, {
        actionType: 'SEND_EMAIL_NOTIFICATION',
        category: 'C_EXTERNAL_WRITE',
        targetResource: 'founder@example.com',
        requiresApproval: false,
        payload: {
          to: 'founder@example.com',
          subject: 'Weekly Executive Briefing',
          textContent: 'Your weekly performance report is ready.',
          idempotencyKey: `email_test_${Date.now()}`,
        },
      });
      assert.equal(result.success, true);
      assert.ok(result.actionId);
    }
  );

  await t.test('6. Meta / Instagram Provider: Ingests reach and follower metrics', async () => {
    const pkg = await metaInstagramProvider.fetchData(credentials, { limit: 10 });
    assert.ok(pkg.records.length > 0);
    const record = pkg.records[0];
    assert.equal(record.provider, 'meta-instagram');
    assert.ok(record.metrics.reach30Days > 0);
  });

  await t.test(
    '7. LinkedIn Marketing Provider: Ingests company engagement & demographics',
    async () => {
      const pkg = await linkedinProvider.fetchData(credentials, { limit: 10 });
      assert.ok(pkg.records.length > 0);
      const record = pkg.records[0];
      assert.equal(record.provider, 'linkedin-marketing');
      assert.ok(record.metrics.totalFollowers > 0);
    }
  );

  await t.test(
    '8. YouTube Data Provider: Read-only channel & video analytics (NO VIDEO CREATION)',
    async () => {
      const pkg = await youtubeProvider.fetchData(credentials, { limit: 10 });
      assert.ok(pkg.records.length > 0);
      const record = pkg.records[0];
      assert.equal(record.provider, 'youtube-data');
      assert.ok(record.metrics.subscribers > 0);

      // Strict guardrail check: YouTube provider does NOT implement executeAction (read-only analytical)
      const ytProvider = youtubeProvider as unknown as { executeAction?: unknown };
      assert.equal(
        ytProvider.executeAction,
        undefined,
        'YouTube provider has no write action capabilities (STRICT VIDEO EXCLUSION)'
      );
    }
  );

  await t.test(
    '9. Google Drive Provider: Manages executive report export & file listing',
    async () => {
      const pkg = await googleDriveProvider.fetchData(credentials, { limit: 10 });
      assert.ok(pkg.records.length > 0);
      assert.equal(pkg.records[0].provider, 'google-drive');

      const exportResult = await googleDriveProvider.executeAction(credentials, {
        actionType: 'EXPORT_REPORT_TO_DRIVE',
        category: 'C_EXTERNAL_WRITE',
        targetResource: 'drive_root',
        requiresApproval: false,
        payload: {
          fileName: 'Q4 2026 Board Presentation.pdf',
          mimeType: 'application/pdf',
        },
      });
      assert.equal(exportResult.success, true);
      assert.ok(exportResult.actionId);
    }
  );
});

test('PHASE 8 — SUITE 5: Centralized Data Ingestion, Storage & Deduplication', async (t) => {
  const workspaceId = 'ws_ingest_test_' + Date.now();
  const integrationId = 'google-analytics-4';

  await t.test('Ingests, normalizes, and stores provider records', async () => {
    const records = [
      {
        recordId: 'rec_1_' + Date.now(),
        workspaceId,
        integrationId,
        provider: 'google-analytics-4',
        category: 'website_seo',
        retrievedAt: new Date().toISOString(),
        sourceReference: 'properties/123456789',
        syncJobId: 'sync_test_1',
        dataVersion: 1,
        provenance: {
          sourceType: 'Google Analytics 4 Data API',
          verified: true,
          confidenceScore: 0.98,
        },
        metrics: { sessions: 12000, activeUsers: 8500 },
        dimensions: { country: 'IN', source: 'organic' },
      },
    ];

    const result = await dataIngestionService.ingestRecords(workspaceId, integrationId, {
      records,
      summary: {},
      hasMore: false,
    });
    assert.equal(result.ingestedCount, 1, 'One record ingested');
    assert.equal(result.duplicateCount, 0);

    const queried = await dataIngestionService.getWorkspaceRecords(workspaceId, {
      integrationId,
    });
    assert.equal(queried.length, 1);
    assert.equal(queried[0].metrics.sessions, 12000);
  });

  await t.test('Deduplicates identical records within time window', async () => {
    const sharedRecordId = 'rec_dedup_' + Date.now();
    const records = [
      {
        recordId: sharedRecordId,
        workspaceId,
        integrationId: 'google-search-console',
        provider: 'google-search-console',
        category: 'website_seo',
        retrievedAt: new Date().toISOString(),
        sourceReference: 'https://example.com',
        syncJobId: 'sync_test_dedup',
        dataVersion: 1,
        provenance: {
          sourceType: 'Google Search Console API',
          verified: true,
          confidenceScore: 0.95,
        },
        metrics: { clicks: 450, impressions: 9200 },
        dimensions: {},
      },
    ];

    // First ingestion
    const res1 = await dataIngestionService.ingestRecords(workspaceId, 'google-search-console', {
      records,
      summary: {},
      hasMore: false,
    });
    assert.equal(res1.ingestedCount, 1);

    // Immediate duplicate ingestion with same recordId
    const res2 = await dataIngestionService.ingestRecords(workspaceId, 'google-search-console', {
      records,
      summary: {},
      hasMore: false,
    });
    assert.equal(res2.ingestedCount, 0, 'Duplicate record must be skipped');
    assert.equal(res2.duplicateCount, 1);
  });

  await t.test('Purges provider records upon disconnection', async () => {
    const purged = await dataIngestionService.purgeIntegrationData(workspaceId, integrationId);
    assert.ok(purged >= 1, 'Records must be purged');

    const afterPurge = await dataIngestionService.getWorkspaceRecords(workspaceId, {
      integrationId,
    });
    assert.equal(afterPurge.length, 0, 'No records should remain for purged provider');
  });
});

test('PHASE 8 — SUITE 6: Automation Engine, Triggers, Retries & Category C Approval Gate', async (t) => {
  const workspaceId = 'ws_auto_test_' + Date.now();

  await t.test('Verifies 7 pre-built production automation templates are available', () => {
    assert.equal(AUTOMATION_TEMPLATES.length, 7, 'All 7 production templates must be available');
    const templateIds = AUTOMATION_TEMPLATES.map((tpl) => tpl.templateId);
    assert.ok(templateIds.includes('tmpl_daily_business_intel'));
    assert.ok(templateIds.includes('tmpl_weekly_competitor_monitoring'));
    assert.ok(templateIds.includes('tmpl_weekly_website_performance'));
    assert.ok(templateIds.includes('tmpl_weekly_seo_monitoring'));
    assert.ok(templateIds.includes('tmpl_monthly_business_intelligence'));
    assert.ok(templateIds.includes('tmpl_integration_health_monitoring'));
    assert.ok(templateIds.includes('tmpl_industry_trend_discovery'));
  });

  await t.test('Instantiates automation from template', async () => {
    const auto = await automationEngine.createFromTemplate(
      workspaceId,
      'tmpl_weekly_website_performance'
    );
    assert.ok(auto.automationId);
    assert.equal(auto.status, 'active');
    assert.equal(auto.templateId, 'tmpl_weekly_website_performance');
    assert.ok(auto.sourceProviders.includes('google-analytics-4'));
  });

  await t.test('Executes Category A (Read-Only) automation automatically', async () => {
    const auto = await automationEngine.createAutomation(workspaceId, {
      name: 'Test Read Only Automation',
      description: 'Auto-generates performance report',
      trigger: { type: 'time_based', schedule: 'daily' },
      sourceProviders: ['google-analytics-4'],
      condition: { comparison: 'always' },
      action: {
        type: 'analyze_performance',
        category: 'A_READ_ONLY',
        targetDepartment: 'analytics_reports',
      },
      status: 'active',
    });

    const execution = await automationEngine.triggerExecution(
      workspaceId,
      auto.automationId,
      'test_manual'
    );
    assert.ok(execution.executionId);
    assert.equal(execution.automationId, auto.automationId);

    // Allow async microtask job to execute
    await new Promise((resolve) => setTimeout(resolve, 80));

    const executions = await automationEngine.listExecutions(workspaceId, auto.automationId);
    assert.ok(executions.length > 0);
    assert.equal(executions[0].status, 'completed');
  });

  await t.test('Enforces Category C (External Write) Human Approval Gate', async () => {
    const auto = await automationEngine.createAutomation(workspaceId, {
      name: 'Test Outbound Email Briefing',
      description: 'Sends external email',
      trigger: { type: 'time_based', schedule: 'weekly' },
      sourceProviders: ['email-service'],
      condition: { comparison: 'always' },
      action: {
        type: 'send_email',
        category: 'C_EXTERNAL_WRITE',
        recipientEmail: 'client@example.com',
      },
      status: 'active',
    });

    // Initial trigger should pause and require approval
    const execution = await automationEngine.triggerExecution(
      workspaceId,
      auto.automationId,
      'weekly_trigger'
    );
    await new Promise((resolve) => setTimeout(resolve, 80));

    const executions = await automationEngine.listExecutions(workspaceId, auto.automationId);
    assert.ok(executions.length > 0);
    assert.equal(
      executions[0].status,
      'requires_approval',
      'Category C action must halt at human approval gate'
    );

    // Human approves the execution
    const approved = await automationEngine.approveExecution(
      workspaceId,
      auto.automationId,
      execution.executionId,
      'user_approver_1'
    );
    assert.equal(
      approved.status,
      'completed',
      'Execution must resume and complete upon human approval'
    );
    assert.ok(approved.completedAt);
  });
});

test('PHASE 8 — SUITE 7: End-to-End Integration Manager Lifecycle & Audit Trail', async (t) => {
  const workspaceId = 'ws_lifecycle_' + Date.now();
  const providerId = 'google-analytics-4';

  await t.test(
    'Manages full connection lifecycle: connect, sync, health check, disconnect',
    async () => {
      // 1. Connect API Key / Managed provider
      const conn = await integrationManager.connectApiKeyProvider({
        workspaceId,
        providerId,
        apiKey: 'live_test_token_ga4',
        actorId: 'test_admin',
      });
      assert.equal(conn.status, 'connected');

      // 2. Health check
      const health = await integrationManager.checkHealth(workspaceId, providerId);
      assert.equal(health.healthy, true);
      assert.equal(health.status, 'connected');

      // 3. Manual sync
      const syncResult = await integrationManager.syncIntegration(
        workspaceId,
        providerId,
        'test_admin'
      );
      assert.equal(syncResult.success, true);
      assert.ok(syncResult.ingestedCount > 0);

      // 4. Disconnect
      await integrationManager.disconnectIntegration(workspaceId, providerId, 'test_admin');
      const connAfter = await integrationManager.getConnection(workspaceId, providerId);
      assert.equal(connAfter, null, 'Connection record must be removed after disconnection');
    }
  );

  await t.test(
    'Audit ledger records all security and operational events with sanitized credentials',
    async () => {
      const logs = await integrationAuditService.listEvents(workspaceId);
      assert.ok(logs.length >= 2, 'Audit logs must record connection and lifecycle events');

      const actions = logs.map((l) => l.action);
      assert.ok(actions.includes('CONNECT_API_KEY'));
      assert.ok(actions.includes('SYNCHRONIZE_DATA'));
      assert.ok(actions.includes('DISCONNECT_INTEGRATION'));

      // Verify sensitive data is not leaked in audit logs
      const logStr = JSON.stringify(logs);
      assert.ok(
        !logStr.includes('live_test_token_ga4'),
        'Raw credentials must never be written to audit logs'
      );
    }
  );
});

test('PHASE 8 — SUITE 8: Department Intelligence Context Integration', async (t) => {
  const workspaceId = 'ws_dept_test_' + Date.now();

  await t.test(
    'Feeds external telemetry into Growth Planner and Analytics departments',
    async () => {
      // Connect GA4 in workspace
      await integrationManager.connectApiKeyProvider({
        workspaceId,
        providerId: 'google-analytics-4',
      });

      // Ingest data via sync
      await integrationManager.syncIntegration(workspaceId, 'google-analytics-4');

      // Fetch department context for Growth Planner
      const growthContext = await getDepartmentExternalContext(workspaceId, 'GROWTH_PLANNER');
      assert.ok(growthContext.authorizedProviders.includes('google-analytics-4'));
      assert.ok(growthContext.records.length > 0);
      assert.equal(growthContext.unifiedSummary.dataProvenanceLevel, 'VERIFIED_EXTERNAL');
      assert.ok(growthContext.unifiedSummary.primarySignals.length > 0);
    }
  );
});

test('PHASE 8 — SUITE 9: Multi-Tenant Workspace Security Isolation', async (t) => {
  const workspaceA = 'ws_tenant_alpha_' + Date.now();
  const workspaceB = 'ws_tenant_beta_' + Date.now();

  await t.test('Ensures complete data and credential isolation between tenants', async () => {
    // Connect GA4 in Workspace A
    await integrationManager.connectApiKeyProvider({
      workspaceId: workspaceA,
      providerId: 'google-analytics-4',
      apiKey: 'alpha_secret_token',
    });

    // Connect GSC in Workspace B
    await integrationManager.connectApiKeyProvider({
      workspaceId: workspaceB,
      providerId: 'google-search-console',
      apiKey: 'beta_secret_token',
    });

    // Workspace B cannot retrieve Workspace A credentials
    const bAttemptOnA = await credentialManager.loadCredentials(workspaceB, 'google-analytics-4');
    assert.equal(bAttemptOnA, null, 'Workspace B must not access Workspace A credentials');

    // Ingest into both workspaces
    await integrationManager.syncIntegration(workspaceA, 'google-analytics-4');
    await integrationManager.syncIntegration(workspaceB, 'google-search-console');

    // Workspace B cannot view Workspace A telemetry
    const aRecords = await dataIngestionService.getWorkspaceRecords(workspaceA);
    const bRecords = await dataIngestionService.getWorkspaceRecords(workspaceB);

    assert.ok(aRecords.length > 0);
    assert.ok(bRecords.length > 0);

    const aRecordWorkspaces = aRecords.map((r) => r.workspaceId);
    assert.ok(aRecordWorkspaces.every((id) => id === workspaceA));

    const bRecordWorkspaces = bRecords.map((r) => r.workspaceId);
    assert.ok(bRecordWorkspaces.every((id) => id === workspaceB));
  });
});
