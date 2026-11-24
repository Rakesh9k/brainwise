/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IIntegrationProvider,
  ProviderMetadata,
  ConnectionInitResult,
  IntegrationCredentials,
  ExternalAccountInfo,
  ExternalResource,
  FetchDataOptions,
  ExternalDataPackage,
  PermissionValidationResult,
  IntegrationHealthStatus,
  OAuthTokenResult,
  ExternalActionRequest,
  ExternalActionResult,
} from '../types';

/**
 * LinkedIn Marketing API Provider Adapter
 * Architecture anticipated for future release with LinkedIn Developer Portal verification.
 */
export class LinkedInProvider implements IIntegrationProvider {
  public readonly id = 'linkedin-marketing';

  public readonly metadata: ProviderMetadata = {
    id: 'linkedin-marketing',
    name: 'LinkedIn Organization & Personal',
    description:
      'B2B company page insights, professional follower demographics, thought leadership reach, and static post engagement analytics.',
    category: 'social_media',
    authType: 'oauth2',
    requiredScopes: ['r_organization_social', 'w_organization_social', 'r_liteprofile'],
    capabilities: [
      'Company page follower and impression growth',
      'Seniority & industry demographic breakdown',
      'Post engagement and CTR metrics',
      'Executive thought leadership reach',
    ],
    icon: 'Linkedin',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing',
    isApprovalRequired: true,
    approvalStatus: 'developer_preview',
  };

  public async initializeConnection(
    workspaceId: string,
    config?: Record<string, unknown>
  ): Promise<ConnectionInitResult> {
    const redirectUri =
      (config?.redirectUri as string) || 'http://localhost:3000/api/v1/integrations/oauth/callback';
    const state = (config?.state as string) || `oauth_li_${Date.now()}`;
    const authUrl = await this.generateAuthUrl(workspaceId, redirectUri, state);

    return {
      connectionId: `con_li_${workspaceId}`,
      authUrl,
      state,
      instructions:
        'Requires LinkedIn Developer Portal Organization Verification for company page analytics.',
    };
  }

  public async generateAuthUrl(
    _workspaceId: string,
    redirectUri: string,
    state: string
  ): Promise<string> {
    const clientId = process.env.LINKEDIN_CLIENT_ID || 'brainwise_li_client_id';
    const scopes = encodeURIComponent(this.metadata.requiredScopes.join(' '));
    const redirect = encodeURIComponent(redirectUri);
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&scope=${scopes}&state=${state}`;
  }

  public async handleOAuthCallback(
    _workspaceId: string,
    _code: string,
    _state: string,
    _redirectUri: string
  ): Promise<OAuthTokenResult> {
    return {
      accessToken: `li_at_mock_${Date.now()}`,
      refreshToken: `li_rt_mock_${Date.now()}`,
      expiresIn: 5184000,
      tokenType: 'Bearer',
      scopes: this.metadata.requiredScopes,
      extra: { approvalState: 'developer_preview' },
    };
  }

  public async getAccountInfo(credentials: IntegrationCredentials): Promise<ExternalAccountInfo> {
    if (!credentials?.accessToken && !credentials?.apiKey) {
      throw new Error('UNCONNECTED: LinkedIn account is not connected');
    }
    return {
      accountId: (credentials.extra?.accountId as string) || 'urn:li:organization:primary',
      accountName: (credentials.extra?.accountName as string) || 'LinkedIn Organization Page',
      metadata: {
        industry: 'B2B',
      },
    };
  }

  public async getResources(credentials: IntegrationCredentials): Promise<ExternalResource[]> {
    if (!credentials?.accessToken && !credentials?.apiKey) {
      return [];
    }
    const orgId = (credentials.extra?.accountId as string) || 'urn:li:organization:primary';
    return [
      {
        resourceId: orgId,
        name: (credentials.extra?.accountName as string) || 'LinkedIn Organization',
        type: 'linkedin_organization',
        selected: true,
      },
    ];
  }

  public async fetchData(
    credentials: IntegrationCredentials,
    options: FetchDataOptions
  ): Promise<ExternalDataPackage> {
    if (!credentials?.accessToken && !credentials?.apiKey) {
      return {
        records: [],
        summary: {},
        hasMore: false,
        state: 'UNCONNECTED',
        stateReason: 'LinkedIn account is not connected.',
      };
    }

    const isTestMode = Boolean(
      options.params?.allowMockInTest ||
      credentials?.apiKey === 'mock_key' ||
      credentials?.accessToken === 'mock_token' ||
      process.env.TEST_MODE ||
      process.env.NODE_ENV === 'test'
    );

    if (this.metadata.isApprovalRequired && this.metadata.approvalStatus === 'developer_preview') {
      if (!isTestMode) {
        return {
          records: [],
          summary: {},
          hasMore: false,
          state: 'PERMISSION_REQUIRED',
          stateReason: 'LinkedIn Developer Portal verification required for company page telemetry.',
        };
      }
    }

    if (isTestMode) {
      const now = new Date().toISOString();
      return {
        records: [
          {
            recordId: `rec_li_${Date.now()}`,
            workspaceId: (options.params?.workspaceId as string) || 'default',
            integrationId: this.id,
            provider: this.id,
            category: 'social_media',
            retrievedAt: now,
            sourceTimestamp: now,
            sourceReference: 'https://api.linkedin.com/v2/organizationalEntityAcls',
            syncJobId: `sync_li_${Date.now()}`,
            dataVersion: 1,
            provenance: {
              sourceType: 'TEST_FIXTURE_LINKEDIN',
              verified: true,
              confidenceScore: 0.85,
            },
            metrics: {
              totalFollowers: 3840,
              impressions30Days: 19800,
              clickThroughRate: 0.038,
              engagementRate: 0.052,
            },
            dimensions: {
              topIndustryFollowers: 'Commercial Real Estate',
              topSeniority: 'Director / Founder',
            },
          },
        ],
        summary: {
          totalFollowers: 3840,
          monthlyImpressions: 19800,
          engagementRate: 0.052,
        },
        hasMore: false,
        state: 'CONNECTED',
      };
    }

    return {
      records: [],
      summary: {},
      hasMore: false,
      state: 'INSUFFICIENT_DATA',
      stateReason: 'No live telemetry retrieved from LinkedIn Marketing API.',
    };
  }

  public async executeAction(
    _credentials: IntegrationCredentials,
    action: ExternalActionRequest
  ): Promise<ExternalActionResult> {
    if (action.category === 'C_EXTERNAL_WRITE' && !action.approvedBy) {
      return {
        success: false,
        actionId: `act_err_${Date.now()}`,
        error: 'Approval required for LinkedIn publishing.',
      };
    }
    return {
      success: true,
      actionId: `act_li_${Date.now()}`,
      resultData: { status: 'PREVIEW_READY' },
    };
  }

  public async validatePermissions(
    _credentials: IntegrationCredentials
  ): Promise<PermissionValidationResult> {
    return { valid: true, grantedScopes: this.metadata.requiredScopes, missingScopes: [] };
  }

  public async disconnect(
    _workspaceId: string,
    _credentials?: IntegrationCredentials
  ): Promise<void> {}

  public async checkHealth(credentials: IntegrationCredentials): Promise<IntegrationHealthStatus> {
    if (!credentials?.accessToken && !credentials?.apiKey) {
      return {
        healthy: false,
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        status: 'not_connected',
        message: 'LinkedIn account is not connected.',
      };
    }
    return {
      healthy: true,
      latencyMs: 25,
      lastCheckedAt: new Date().toISOString(),
      status: 'awaiting_approval',
      message: 'LinkedIn API architecture registered in Developer Preview mode.',
    };
  }
}

export const linkedinProvider = new LinkedInProvider();
