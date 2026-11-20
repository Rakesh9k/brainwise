/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';

/**
 * Derives a cryptographically secure password hash using scrypt.
 * Output format: <salt_hex>:<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy hex token for email verification and password resets.
 */
export function generateAuthToken(prefix = 'tok'): string {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generates a 6-digit numeric verification code for onboarding email verification.
 */
export function generateNumericCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
