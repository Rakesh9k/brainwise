/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';

interface OAuthStateRecord {
  state: string;
  workspaceId: string;
  providerId: string;
  redirectUri: string;
  createdAt: number;
  codeVerifier?: string;
}

/**
 * Enterprise OAuth 2.0 State and Lifecycle Service
 * Provides CSRF protection, PKCE challenge generation, state validation, and token exchange.
 */
export class OAuthService {
  private stateCache = new Map<string, OAuthStateRecord>();
  private readonly STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Generates a cryptographically random state parameter and binds it to workspace & provider.
   */
  public generateState(
    workspaceId: string,
    providerId: string,
    redirectUri: string
  ): { state: string; codeVerifier?: string } {
    this.cleanExpiredStates();

    const state = `bw_oauth_${crypto.randomBytes(24).toString('hex')}`;
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    this.stateCache.set(state, {
      state,
      workspaceId,
      providerId,
      redirectUri,
      createdAt: Date.now(),
      codeVerifier,
    });

    return { state, codeVerifier };
  }

  /**
   * Validates state parameter returned from OAuth provider.
   */
  public validateState(state: string): OAuthStateRecord | null {
    this.cleanExpiredStates();
    const record = this.stateCache.get(state);
    if (!record) {
      return null;
    }
    // One-time use state parameter
    this.stateCache.delete(state);
    return record;
  }

  /**
   * Generates code challenge for PKCE (S256).
   */
  public generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Cleans up expired states from memory.
   */
  private cleanExpiredStates(): void {
    const now = Date.now();
    for (const [key, val] of this.stateCache.entries()) {
      if (now - val.createdAt > this.STATE_TTL_MS) {
        this.stateCache.delete(key);
      }
    }
  }
}

export const oauthService = new OAuthService();
