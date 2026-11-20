/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { URL } from 'node:url';
import net from 'node:net';

export interface SsrfValidationResult {
  isSafe: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
  '169.254.169.254',
  '169.254.169.254.nip.io',
  '0.0.0.0',
]);

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);

/**
 * Checks if an IPv4 address is within private / reserved CIDR ranges:
 * - 10.0.0.0/8
 * - 172.16.0.0/12
 * - 192.168.0.0/16
 * - 127.0.0.0/8 (loopback)
 * - 169.254.0.0/16 (link-local & AWS/GCP metadata)
 * - 0.0.0.0/8
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [b0, b1] = parts;

  // 127.0.0.0/8
  if (b0 === 127) return true;
  // 10.0.0.0/8
  if (b0 === 10) return true;
  // 172.16.0.0/12
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16
  if (b0 === 192 && b1 === 168) return true;
  // 169.254.0.0/16 (Link-local & cloud metadata)
  if (b0 === 169 && b1 === 254) return true;
  // 0.0.0.0/8
  if (b0 === 0) return true;

  return false;
}

/**
 * Validates whether an external URL is safe to retrieve, preventing SSRF attacks.
 */
export function validateSafeExternalUrl(urlStr: string): SsrfValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isSafe: false, reason: 'URL must be a non-empty string.' };
  }

  const trimmed = urlStr.trim();
  const normalized = trimmed.includes('://') ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { isSafe: false, reason: 'Malformed URL format.' };
  }

  // 1. Protocol validation
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      isSafe: false,
      reason: `Disallowed protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`,
    };
  }

  // 2. Port validation
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) {
    return {
      isSafe: false,
      reason: `Disallowed network port ${port}. Only standard web ports (80, 443, 8080, 8443) are allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Exact forbidden hostname matching
  if (FORBIDDEN_HOSTNAMES.has(hostname)) {
    return {
      isSafe: false,
      reason: `Access to internal host '${hostname}' is prohibited.`,
    };
  }

  // 4. Localhost suffix matching (e.g. app.localhost)
  if (
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return {
      isSafe: false,
      reason: `Access to local network domain '${hostname}' is prohibited.`,
    };
  }

  // 5. IP Address validation
  const ipType = net.isIP(hostname);
  if (ipType === 4) {
    if (isPrivateOrReservedIpv4(hostname)) {
      return {
        isSafe: false,
        reason: `Access to private/reserved IPv4 address '${hostname}' is blocked.`,
      };
    }
  } else if (ipType === 6) {
    // IPv6 checks (loopback ::1, unique local fc00::/7, link-local fe80::/10)
    if (
      hostname === '::1' ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd') ||
      hostname.startsWith('fe80')
    ) {
      return {
        isSafe: false,
        reason: `Access to private/reserved IPv6 address '${hostname}' is blocked.`,
      };
    }
  }

  return {
    isSafe: true,
    sanitizedUrl: parsed.toString(),
  };
}
