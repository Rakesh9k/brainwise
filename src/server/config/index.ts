/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  geminiApiKey: string | null;
  geminiModel: string;
  tavilyApiKey: string | null;
  firebaseProjectId: string;
  gcsBucketName: string;
  corsOrigins: string[];
  devBypassAuth: boolean;
}

export function loadServerConfig(): ServerConfig {
  const isTest =
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.argv.includes('--test');
  const nodeEnv = (process.env.NODE_ENV || (isTest ? 'test' : 'development')) as
    'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  const port = Number(process.env.PORT) || 3000;
  const rawKey = process.env.GEMINI_API_KEY?.trim() || '';
  const geminiApiKey = rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey : null;
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const tavilyApiKey = process.env.TAVILY_API_KEY?.trim() || null;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || 'brainwise-saas';
  const gcsBucketName = process.env.GCS_BUCKET_NAME?.trim() || `${firebaseProjectId}-assets`;

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];

  // In production, DEV_BYPASS_AUTH must NEVER be true
  const devBypassAuth = !isProduction && process.env.DEV_BYPASS_AUTH === 'true';

  return {
    port,
    nodeEnv,
    isProduction,
    isDevelopment,
    isTest,
    geminiApiKey,
    geminiModel,
    tavilyApiKey,
    firebaseProjectId,
    gcsBucketName,
    corsOrigins,
    devBypassAuth,
  };
}

export const serverConfig = loadServerConfig();
