# BrainWise Phase 4 AI & Background Jobs Implementation Report

## 1. AI Orchestration Architecture
The AI layer was built in `src/server/services/aiOrchestrationService.ts`, powered by **Google Gemini** (`gemini-2.5-flash`). Key architectural elements:
- Server-side prompt compilation incorporating authoritative Business Brain facts.
- Automatic integration of anti-fatigue directives avoiding overused marketing themes.
- Enforced Truth Check execution (`executeTruthCheck`) scanning output copy for unverified pricing or brand exclusion breaches.

---

## 2. Two-Phase Credit Reservation Integration
Every AI generation executes the ADR-006 protocol:
1. `creditService.holdCredits(workspaceId, cost)` locks credits in an atomic transaction before invoking Gemini.
2. If the user lacks sufficient credits, HTTP 402 is returned and no AI API call is made.
3. If Gemini fails or Truth Check detects a price hallucination:
   - `creditService.refundCredits(workspaceId, holdId)` restores the locked balance.
   - User incurs zero net charge.
4. If generation succeeds and passes Truth Check:
   - `creditService.commitCredits(workspaceId, holdId)` permanently settles the charge.

---

## 3. Asynchronous Background Jobs
Long-running research and intelligence tasks are managed by `src/server/services/backgroundJobService.ts`:
- Jobs are assigned a unique ID and queued in Firestore (`workspaces/{workspaceId}/ai_jobs/{jobId}`).
- State machine tracks transitions: `QUEUED` -> `RUNNING` -> `COMPLETED` / `FAILED` / `CANCELLED`.
- Clients poll `/api/v1/workspaces/:workspaceId/jobs/:jobId` for real-time progress.
- Job cancellation immediately triggers credit reservation release.
- Automated test `src/server/aiJobs.test.ts` validates the complete asynchronous job lifecycle.
