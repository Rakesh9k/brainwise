/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import type { EncryptedPayload, IntegrationCredentials } from './types';

/**
 * Enterprise Credential Security Manager
 * Implements AES-256-GCM Authenticated Encryption for OAuth tokens and API secrets.
 * Ensures tokens are encrypted before saving to persistent storage and never exposed to the frontend.
 */
export class CredentialManager {
  private masterKey: Buffer;
  private keyId: string = 'v1_master';

  constructor() {
    const rawSecret =
      process.env.CREDENTIAL_MASTER_KEY ||
      process.env.SERVER_SECRET ||
      'brainwise_enterprise_secure_credential_master_key_2026';
    // Derive a fixed 32-byte (256-bit) key using scrypt
    this.masterKey = crypto.scryptSync(rawSecret, 'brainwise_credential_salt_v1', 32);
  }

  /**
   * Encrypts credentials payload using AES-256-GCM.
   */
  public encrypt(credentials: IntegrationCredentials): EncryptedPayload {
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag(); // 128-bit auth tag for integrity

    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
      keyId: this.keyId,
      algorithm: 'aes-256-gcm',
    };
  }

  /**
   * Decrypts credentials payload and verifies cryptographic authentication tag.
   */
  public decrypt(payload: EncryptedPayload): IntegrationCredentials {
    if (payload.algorithm !== 'aes-256-gcm') {
      throw new Error(`Unsupported encryption algorithm: ${payload.algorithm}`);
    }

    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const ciphertext = Buffer.from(payload.ciphertext, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as IntegrationCredentials;
  }

  /**
   * Stores encrypted credentials in a dedicated secure Firestore subcollection.
   */
  public async storeCredentials(
    workspaceId: string,
    integrationId: string,
    credentials: IntegrationCredentials
  ): Promise<void> {
    const encrypted = this.encrypt(credentials);
    const docPath = `workspaces/${workspaceId}/integrations/${integrationId}/secure/credentials`;
    await db.doc(docPath).set({
      ...encrypted,
      updatedAt: db.serverTimestamp(),
    });
  }

  /**
   * Loads and decrypts credentials for an integration.
   */
  public async loadCredentials(
    workspaceId: string,
    integrationId: string
  ): Promise<IntegrationCredentials | null> {
    const docPath = `workspaces/${workspaceId}/integrations/${integrationId}/secure/credentials`;
    const snap = await db.doc<EncryptedPayload & { updatedAt: string }>(docPath).get();
    if (!snap.exists || !snap.data()) {
      return null;
    }
    const data = snap.data()!;
    try {
      return this.decrypt({
        iv: data.iv,
        tag: data.tag,
        ciphertext: data.ciphertext,
        keyId: data.keyId,
        algorithm: data.algorithm,
      });
    } catch (err) {
      console.error(`[CREDENTIAL_SECURITY_ERROR] Decryption failed for ${integrationId}:`, err);
      return null;
    }
  }

  /**
   * Securely deletes credentials upon disconnection.
   */
  public async deleteCredentials(workspaceId: string, integrationId: string): Promise<void> {
    const docPath = `workspaces/${workspaceId}/integrations/${integrationId}/secure/credentials`;
    await db.doc(docPath).delete();
  }
}

export const credentialManager = new CredentialManager();
