/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import fs from 'fs';

// Prioritize .env.local for local developer overrides, then .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}
dotenv.config({ override: true });

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
  cashfree: {
    appId: string;
    secretKey: string;
    apiVersion: string;
    environment: 'sandbox' | 'production';
    baseUrl: string;
    hostedUrl: string;
  };
}

export function loadServerConfig(): ServerConfig {
  const isTest =
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.argv.includes('--test') ||
    process.execArgv.includes('--test') ||
    process.execArgv.some((a) => a.includes('test'));
  const nodeEnv = (process.env.NODE_ENV || (isTest ? 'test' : 'development')) as
    'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  const port = Number(process.env.PORT) || 3000;
  const rawKey = process.env.GEMINI_API_KEY?.trim() || '';
  const geminiApiKey = rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey : null;
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const rawTavily = process.env.TAVILY_API_KEY?.trim() || '';
  const tavilyApiKey = rawTavily && rawTavily !== 'NOT_CONFIGURED' ? rawTavily : null;
  const firebaseProjectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.PROJECT_ID?.trim() ||
    'brainwise-ai-marketing-engine';
  const gcsBucketName = process.env.GCS_BUCKET_NAME?.trim() || `${firebaseProjectId}-assets`;

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'https://brain-wise.com',
        'https://www.brain-wise.com',
        'https://brainwise-ai-marketing-engine.web.app',
      ];

  // In production, DEV_BYPASS_AUTH must NEVER be true
  const devBypassAuth = !isProduction && process.env.DEV_BYPASS_AUTH === 'true';

  const cashfreeAppId = process.env.CASHFREE_APP_ID?.trim() || 'sandbox_app_brainwise';
  const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY?.trim() || 'sandbox_secret_brainwise';
  const cashfreeApiVersion = process.env.CASHFREE_API_VERSION?.trim() || '2023-08-01';
  const cashfreeEnv = (process.env.CASHFREE_ENV?.trim() === 'production' ? 'production' : 'sandbox') as
    | 'sandbox'
    | 'production';
  const cashfreeBaseUrl =
    cashfreeEnv === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  const cashfreeHostedUrl =
    cashfreeEnv === 'production'
      ? 'https://payments.cashfree.com/forms'
      : 'https://payments-test.cashfree.com/forms';

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
    cashfree: {
      appId: cashfreeAppId,
      secretKey: cashfreeSecretKey,
      apiVersion: cashfreeApiVersion,
      environment: cashfreeEnv,
      baseUrl: cashfreeBaseUrl,
      hostedUrl: cashfreeHostedUrl,
    },
  };
}

export const serverConfig = loadServerConfig();
