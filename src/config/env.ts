/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BRAINWISE RUNTIME ENVIRONMENT CONFIGURATION & VALIDATION
 *
 * Provides typed, validated access to environment variables.
 * Enforces strict separation between client-accessible public variables
 * and privileged server-side secrets.
 */

export interface ClientConfig {
  appUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export interface ServerConfig extends ClientConfig {
  geminiApiKey: string | null;
  port: number;
}

/**
 * Validates and retrieves client-safe public configuration.
 * Safe to invoke in browser components.
 */
export function getClientConfig(): ClientConfig {
  const isProd = import.meta.env?.PROD ?? process.env.NODE_ENV === 'production';
  const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  const appUrl =
    (typeof import.meta.env?.VITE_APP_URL === 'string' && import.meta.env.VITE_APP_URL) ||
    (typeof process.env.APP_URL === 'string' && process.env.APP_URL) ||
    'http://localhost:3000';

  return {
    appUrl,
    isProduction: isProd,
    isDevelopment: isDev,
    isTest,
  };
}

/**
 * Validates privileged server configuration.
 * MUST ONLY be called in Node.js server runtimes (e.g., server.ts).
 */
export function validateServerConfig(): ServerConfig {
  if (typeof window !== 'undefined') {
    throw new Error(
      'FATAL: validateServerConfig() must never be executed on the client browser bundle.'
    );
  }

  const clientConfig = getClientConfig();
  const rawKey = process.env.GEMINI_API_KEY?.trim();
  const geminiApiKey = rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey : null;
  const port = Number(process.env.PORT) || 3000;

  if (clientConfig.isProduction && !geminiApiKey) {
    console.warn(
      '[BrainWise Security Warning] GEMINI_API_KEY is not configured in production environment. Live AI operations will fail.'
    );
  }

  return {
    ...clientConfig,
    geminiApiKey,
    port,
  };
}
