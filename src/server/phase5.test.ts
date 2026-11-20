/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { authService } from './services/authService';
import { onboardingService } from './services/onboardingService';
import { businessBrainService } from './services/businessBrainService';
import type { StandardApiResponse, StandardApiError } from './types/api';

test('Phase 5A: Full Registration, Email Verification, Login, and Password Recovery', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Weak password rejected
    const weakRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Rohan Sharma', email: 'rohan@test.com', password: '123' }),
    });
    assert.equal(weakRes.status, 400);
    const weakBody = (await weakRes.json()) as StandardApiError;
    assert.equal(weakBody.error.code, 'WEAK_PASSWORD');

    // 2. Successful Registration
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Rohan Sharma',
        email: 'rohan@test.com',
        password: 'SecurePassword123!',
      }),
    });
    assert.equal(regRes.status, 201);
    const regBody = (await regRes.json()) as StandardApiResponse<any>;
    assert.equal(regBody.success, true);
    assert.equal(regBody.data.user.email, 'rohan@test.com');
    assert.equal(regBody.data.user.emailVerified, false);
    const verificationCode = regBody.data.verificationCode;
    assert.ok(verificationCode, 'Must generate a verification code');

    // 3. Duplicate email rejected
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Rohan Sharma',
        email: 'rohan@test.com',
        password: 'AnotherPassword!',
      }),
    });
    assert.equal(dupRes.status, 400);
    const dupBody = (await dupRes.json()) as StandardApiError;
    assert.equal(dupBody.error.code, 'DUPLICATE_EMAIL');

    // 4. Verify Email with 6-digit code
    const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rohan@test.com',
        code: verificationCode,
      }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyBody = (await verifyRes.json()) as StandardApiResponse<any>;
    assert.equal(verifyBody.success, true);
    assert.equal(verifyBody.data.user.emailVerified, true);

    // 5. Login with invalid password fails
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohan@test.com', password: 'WrongPassword!' }),
    });
    assert.equal(badLoginRes.status, 401);

    // 6. Login with correct credentials succeeds
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohan@test.com', password: 'SecurePassword123!' }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = (await loginRes.json()) as StandardApiResponse<any>;
    assert.equal(loginBody.success, true);
    assert.ok(loginBody.data.token.startsWith('bw-token-'));
    assert.equal(loginBody.data.nextRoute, 'onboarding');

    // 7. Forgot Password & Reset
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohan@test.com' }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotBody = (await forgotRes.json()) as StandardApiResponse<any>;
    assert.equal(forgotBody.data.sent, true);
    const resetToken = forgotBody.data.resetToken;

    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'BrandNewPassword123!' }),
    });
    assert.equal(resetRes.status, 200);

    // Verify login with new password
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohan@test.com', password: 'BrandNewPassword123!' }),
    });
    assert.equal(newLoginRes.status, 200);
  } finally {
    server.close();
  }
});

test('Phase 5B: Conversational Onboarding State Machine & Incremental Persistence', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Register test founder
    const { user, token } = await authService.register({
      fullName: 'Priya Patel',
      email: 'priya@auroracraft.com',
      password: 'StrongPassword123!',
    });
    await authService.verifyEmail({ email: user.email, codeOrToken: '482910' });

    // 2. Fetch Initial Session
    const sessRes = await fetch(`${baseUrl}/onboarding/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(sessRes.status, 200);
    const sessBody = (await sessRes.json()) as StandardApiResponse<any>;
    assert.equal(sessBody.data.status, 'IN_PROGRESS');
    assert.equal(sessBody.data.currentStage, 1);

    // 3. Save Stage 1 Answer (Identity & Location)
    const save1Res = await fetch(`${baseUrl}/onboarding/save-answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stage: 1,
        step: 2,
        answer: {
          businessType: 'Consumer brand',
          businessName: 'Aurora Botanical Wellness',
          city: 'Bengaluru',
          country: 'India',
          targetMarket: 'Metro India & SE Asia',
        },
      }),
    });
    assert.equal(save1Res.status, 200);
    const save1Body = (await save1Res.json()) as StandardApiResponse<any>;
    assert.equal(save1Body.data.data.businessName, 'Aurora Botanical Wellness');
    assert.equal(save1Body.data.currentStage, 1);
    assert.equal(save1Body.data.currentStep, 2);

    // 4. Save Stage 2 Answer (Objectives & Audience)
    const save2Res = await fetch(`${baseUrl}/onboarding/save-answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stage: 2,
        step: 1,
        answer: {
          primaryPriorities: ['Building my brand', 'Finding more customers'],
          targetAudienceType: 'Urban wellness professionals seeking clean formulations',
          customerPainPoints: [
            'Synthetic fillers in mass products',
            'Lack of transparent sourcing',
          ],
          adaptiveResponses: {
            'Consumer brand': 'D2C online store and premium wellness boutiques',
          },
        },
      }),
    });
    assert.equal(save2Res.status, 200);
    const save2Body = (await save2Res.json()) as StandardApiResponse<any>;
    assert.equal(save2Body.data.currentStage, 2);
    assert.equal(
      save2Body.data.data.targetAudienceType,
      'Urban wellness professionals seeking clean formulations'
    );

    // 5. Provision Workspace from Onboarding
    const provRes = await fetch(`${baseUrl}/onboarding/provision-workspace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(provRes.status, 200);
    const provBody = (await provRes.json()) as StandardApiResponse<any>;
    assert.ok(provBody.data.workspaceId.startsWith('ws_'));
    assert.equal(provBody.data.isNew, true);

    // 6. Resume session after simulated browser refresh
    const resumeRes = await fetch(`${baseUrl}/onboarding/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resumeRes.status, 200);
    const resumeBody = (await resumeRes.json()) as StandardApiResponse<any>;
    assert.equal(resumeBody.data.data.businessName, 'Aurora Botanical Wellness');
    assert.equal(resumeBody.data.data.city, 'Bengaluru');
  } finally {
    server.close();
  }
});

test('Phase 5C: AI Business Brain Synthesis, Fact Provenance, and Review Approval', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    const { user, token } = await authService.register({
      fullName: 'Vikram Seth',
      email: 'vikram@zenithscale.io',
      password: 'EnterprisePassword123!',
    });
    await authService.verifyEmail({ email: user.email, codeOrToken: '482910' });

    // Provision workspace
    const { workspaceId } = await onboardingService.ensureWorkspaceFromOnboarding(user.uid);

    // 1. Generate Business Brain from Onboarding Answers
    const genRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/business-profile/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        onboardingData: {
          businessType: 'Technology startup',
          businessName: 'Zenith Scale AI',
          businessStage: 'Early Traction',
          city: 'Hyderabad',
          country: 'India',
          targetMarket: 'Global Enterprise SaaS',
          primaryPriorities: ['Scaling my business', 'Understanding competitors'],
          targetAudienceType: 'B2B DevOps and Platform Engineering Directors',
          isB2B: true,
          differentiators: ['Technical Innovation', 'Speed & Convenience'],
          offeringsSummary:
            'Autonomous cloud optimization platform cutting cluster infrastructure waste.',
          pricingModel: 'Consumption / Usage-Based',
        },
      }),
    });

    assert.equal(genRes.status, 200);
    const genBody = (await genRes.json()) as StandardApiResponse<any>;
    assert.equal(genBody.data.profile.businessName, 'Zenith Scale AI');
    assert.equal(genBody.data.profile.approvalStatus, 'DRAFT');
    assert.equal(genBody.data.profile.version, 2);

    // Verify Fact Provenance
    const prov = genBody.data.profile.provenance;
    assert.equal(prov.businessName.source, 'USER_CONFIRMED');
    assert.equal(prov.businessName.confidence, 1.0);
    assert.equal(prov.brandPositioning.source, 'AI_INFERRED');
    assert.ok(prov.brandPositioning.confidence > 0.8);

    // Verify Intelligence Gaps
    assert.ok(Array.isArray(genBody.data.profile.intelligence.informationGaps));

    // 2. Approve Business Brain
    const approveRes = await fetch(
      `${baseUrl}/workspaces/${workspaceId}/business-profile/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    assert.equal(approveRes.status, 200);
    const approveBody = (await approveRes.json()) as StandardApiResponse<any>;
    assert.equal(approveBody.data.profile.approvalStatus, 'APPROVED');
    assert.ok(approveBody.data.profile.approvedAt);
    assert.equal(approveBody.data.profile.version, 3);

    // 3. Verify Version History contains v1 and v3
    const verRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/business-profile/versions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(verRes.status, 200);
    const verBody = (await verRes.json()) as StandardApiResponse<any>;
    assert.equal(verBody.data.length, 2);
    assert.equal(verBody.data[0].versionNumber, 3);
    assert.equal(verBody.data[1].versionNumber, 1);

    // 4. Regenerate AI Insights (Living Profile) preserves confirmed facts
    const regenRes = await fetch(
      `${baseUrl}/workspaces/${workspaceId}/business-profile/regenerate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: 'Refine customer personas for enterprise procurement cycles.',
        }),
      }
    );
    assert.equal(regenRes.status, 200);
    const regenBody = (await regenRes.json()) as StandardApiResponse<any>;
    assert.equal(regenBody.data.profile.version, 4);
    assert.equal(regenBody.data.profile.businessName, 'Zenith Scale AI'); // Preserved confirmed fact!

    // 5. Restore v1 Snapshot
    const restoreRes = await fetch(
      `${baseUrl}/workspaces/${workspaceId}/business-profile/versions/${genBody.data.versionId}/restore`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    assert.equal(restoreRes.status, 200);
    const restoreBody = (await restoreRes.json()) as StandardApiResponse<any>;
    assert.equal(restoreBody.data.version, 5); // Restored with incremented version counter
  } finally {
    server.close();
  }
});

test('Phase 5D: Multi-User Security Isolation and Cascading Account Deletion', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Create User A (Alice)
    const userA = await authService.register({
      fullName: 'Alice Smith',
      email: 'alice@alpha.com',
      password: 'AlicePassword123!',
    });
    await authService.verifyEmail({ email: userA.user.email, codeOrToken: '482910' });
    const wsA = await onboardingService.ensureWorkspaceFromOnboarding(userA.user.uid);
    await businessBrainService.generateFromOnboarding({
      workspaceId: wsA.workspaceId,
      userId: userA.user.uid,
      onboardingData: { businessName: 'Alpha Corp' },
    });

    // 2. Create User B (Bob)
    const userB = await authService.register({
      fullName: 'Bob Jones',
      email: 'bob@beta.com',
      password: 'BobPassword123!',
    });
    await authService.verifyEmail({ email: userB.user.email, codeOrToken: '482910' });

    // 3. User B attempts unauthorized access to User A's Business Brain
    const crossRes = await fetch(`${baseUrl}/workspaces/${wsA.workspaceId}/business-profile`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(crossRes.status, 403, 'Cross-user access must be forbidden with 403');
    const crossBody = (await crossRes.json()) as StandardApiError;
    assert.equal(crossBody.error.code, 'FORBIDDEN_WORKSPACE_ACCESS');

    // 4. User B attempts unauthorized approval of User A's Business Brain
    const crossApproveRes = await fetch(
      `${baseUrl}/workspaces/${wsA.workspaceId}/business-profile/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );
    assert.equal(crossApproveRes.status, 403);

    // 5. User A deletes their account
    const delRes = await fetch(`${baseUrl}/auth/me/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(delRes.status, 200);

    // 6. User A's session is revoked and profile deleted
    const loginRevokedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@alpha.com', password: 'AlicePassword123!' }),
    });
    assert.equal(loginRevokedRes.status, 401);

    // 7. User B is completely unaffected and healthy
    const bProfileRes = await fetch(`${baseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(bProfileRes.status, 200);
    const bBody = (await bProfileRes.json()) as StandardApiResponse<any>;
    assert.equal(bBody.data.user.email, 'bob@beta.com');
  } finally {
    server.close();
  }
});
