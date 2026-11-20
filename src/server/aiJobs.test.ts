/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';
import { backgroundJobService } from './services/backgroundJobService';
import { workspaceService } from './services/workspaceService';

test('AI Background Jobs: Async lifecycle tracking, status polling, and cancellation', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'job_tester_01',
    workspaceName: 'Quantum AI Systems',
  });
  const wsId = workspace.workspaceId;

  // 1. Create a background dossier job
  const job = await backgroundJobService.createJob({
    workspaceId: wsId,
    userId: 'job_tester_01',
    jobType: 'dossier',
    inputPayload: {
      ideaSummary: 'Quantum Computing Cloud Platform',
      industry: 'Enterprise Infrastructure',
      targetMarket: 'DevOps & Research Labs',
      geography: 'North America & Europe',
    },
  });

  assert.ok(job.jobId);
  assert.equal(job.status, 'queued');

  // 2. Poll job from repository
  const fetched = await backgroundJobService.getJob(wsId, job.jobId);
  assert.ok(fetched);
  assert.equal(fetched.jobId, job.jobId);

  // 3. Create second job and test cancellation
  const cancelJob = await backgroundJobService.createJob({
    workspaceId: wsId,
    userId: 'job_tester_01',
    jobType: 'brand-asset',
    inputPayload: {
      name: 'Quantum Mark',
      category: 'Logos',
    },
  });

  const cancelled = await backgroundJobService.cancelJob(wsId, cancelJob.jobId);
  assert.equal(cancelled.status, 'cancelled');
  assert.ok(cancelled.completedAt);
});
