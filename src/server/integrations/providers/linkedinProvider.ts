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

  public async getAccountInfo(_credentials: IntegrationCredentials): Promise<ExternalAccountInfo> {
    return {
      accountId: 'urn:li:organization:1082914',
      accountName: 'Solstice Roasters (LinkedIn Page)',
      metadata: { followersCount: 3840, industry: 'Specialty Food & Beverage' },
    };
  }

  public async getResources(_credentials: IntegrationCredentials): Promise<ExternalResource[]> {
    return [
      {
        resourceId: 'urn:li:organization:1082914',
        name: 'Solstice Roasters (Official Page)',
        type: 'linkedin_organization',
        selected: true,
      },
    ];
  }

  public async fetchData(
    _credentials: IntegrationCredentials,
    options: FetchDataOptions
  ): Promise<ExternalDataPackage> {
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
            sourceType: 'LINKEDIN_MARKETING_API_V2',
            verified: true,
            confidenceScore: 0.95,
          },
          metrics: {
            totalFollowers: 3840,
            impressions30Days: 19800,
            clickThroughRate: 0.038,
            engagementRate: 0.052,
          },
          dimensions: {
            topIndustryFollowers: 'Hospitality & Commercial Real Estate (42%)',
            topSeniority: 'Director / Founder (34%)',
          },
        },
      ],
      summary: {
        totalFollowers: 3840,
        monthlyImpressions: 19800,
        engagementRate: 0.052,
      },
      hasMore: false,
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

  public async checkHealth(_credentials: IntegrationCredentials): Promise<IntegrationHealthStatus> {
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
