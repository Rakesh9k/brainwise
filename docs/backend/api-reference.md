# BrainWise API Reference Specification

All endpoints are served over HTTPS and mounted under `/api/v1`. Protected routes require the header `Authorization: Bearer <firebase_id_token>`. Workspace-scoped routes require either the URL parameter `:workspaceId` or the header `X-Workspace-Id: <workspaceId>`.

Standard JSON Response Envelopes:
- **Success:** `{ "success": true, "data": { ... }, "meta": { "timestamp": "...", "workspaceId": "..." } }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "category": "...", "retryable": false } }`

---

## 1. System & Authentication
- `GET /api/health`
  - Auth: Public
  - Description: Returns API operational health, Node environment, and Gemini configuration status.
- `GET /api/v1/users/me`
  - Auth: Authenticated
  - Description: Returns the authenticated user's profile and active workspace association.
- `POST /api/v1/users/sync`
  - Auth: Authenticated
  - Body: `{ "displayName"?: string, "photoUrl"?: string }`
  - Description: Upserts user record in Firestore following Firebase Authentication sign-up or sign-in.
- `PATCH /api/v1/users/preferences`
  - Auth: Authenticated
  - Body: `{ "preferences": object }`
  - Description: Updates non-sensitive client UI preferences.

---

## 2. Workspaces & Memberships
- `GET /api/v1/workspaces`
  - Auth: Authenticated
  - Description: Lists all workspaces where the user is an active member.
- `POST /api/v1/workspaces`
  - Auth: Authenticated
  - Body: `{ "name": string, "industry": string, "country": string, "currency": string }`
  - Description: Creates a new isolated workspace, initializes the Business Brain, sets up the credit wallet, and assigns the user as `owner`.
- `GET /api/v1/workspaces/:workspaceId`
  - Auth: Authenticated (Member+)
  - Description: Retrieves workspace details.
- `GET /api/v1/workspaces/:workspaceId/members`
  - Auth: Authenticated (Member+)
  - Description: Lists all members and assigned roles in the workspace.
- `POST /api/v1/workspaces/:workspaceId/members`
  - Auth: Authenticated (Admin+)
  - Body: `{ "email": string, "role": "admin" | "member" | "viewer" }`
  - Description: Invites a user to the workspace.

---

## 3. Business Brain & Truth Engine
- `GET /api/v1/workspaces/:workspaceId/business-profile`
  - Auth: Authenticated (Viewer+)
  - Description: Retrieves the persistent Business Brain document.
- `PUT /api/v1/workspaces/:workspaceId/business-profile`
  - Auth: Authenticated (Member+)
  - Body: Business profile schema (offerings, target audience, brand positioning).
  - Description: Updates the authoritative business profile.
- `POST /api/v1/workspaces/:workspaceId/business-profile/facts/confirm`
  - Auth: Authenticated (Member+)
  - Body: `{ "factKey": string, "statement": string, "source"?: string }`
  - Description: Marks a business statement as `USER_CONFIRMED`, locking it into ground truth provenance.
- `POST /api/v1/workspaces/:workspaceId/business-profile/exclusions`
  - Auth: Authenticated (Member+)
  - Body: `{ "rule": string }`
  - Description: Registers an explicit negative constraint forbidden from LLM generation.
- `DELETE /api/v1/workspaces/:workspaceId/business-profile/exclusions`
  - Auth: Authenticated (Member+)
  - Body: `{ "rule": string }`
  - Description: Removes an exclusion rule.

---

## 4. Strategic Entities (Goals, Competitors, Tasks, Experiments)
- `GET /api/v1/workspaces/:workspaceId/goals` | `POST`
- `PATCH /api/v1/workspaces/:workspaceId/goals/:goalId` | `DELETE`
- `GET /api/v1/workspaces/:workspaceId/competitors` | `POST`
- `DELETE /api/v1/workspaces/:workspaceId/competitors/:competitorId`
- `GET /api/v1/workspaces/:workspaceId/tasks` | `POST`
- `PATCH /api/v1/workspaces/:workspaceId/tasks/:taskId` | `DELETE`
- `GET /api/v1/workspaces/:workspaceId/experiments` | `POST`
- `PATCH /api/v1/workspaces/:workspaceId/experiments/:experimentId`

---

## 5. Storage & Brand Assets (STRICT VIDEO EXCLUSION)
- `POST /api/v1/workspaces/:workspaceId/assets/upload-url`
  - Auth: Authenticated (Member+)
  - Body: `{ "fileName": string, "contentType": string, "fileSizeBytes": number, "folder"?: string }`
  - Description: Issues a signed Google Cloud Storage upload URL. Strict validation: rejects all `video/*` MIME types and payloads exceeding 25MB.
- `GET /api/v1/workspaces/:workspaceId/assets` | `POST`
- `DELETE /api/v1/workspaces/:workspaceId/assets/:assetId`

---

## 6. Credit & Billing Management (Two-Phase Protocol)
- `GET /api/v1/workspaces/:workspaceId/billing/wallet`
  - Auth: Authenticated (Viewer+)
  - Description: Returns available balance, reserved hold amount, and lifetime statistics.
- `GET /api/v1/workspaces/:workspaceId/billing/transactions`
  - Auth: Authenticated (Admin+)
  - Description: Returns append-only credit ledger history.

---

## 7. AI Orchestration & Background Jobs
- `POST /api/v1/workspaces/:workspaceId/ai/generate`
  - Auth: Authenticated (Member+)
  - Body: `{ "prompt": string, "department": string, "systemInstruction"?: string, "maxTokens"?: number }`
  - Description: Grounded AI generation executing ADR-006 Two-Phase reservation, Gemini LLM reasoning, server-side Truth Check, and Strategic Anti-Fatigue recording.
- `POST /api/v1/workspaces/:workspaceId/jobs`
  - Auth: Authenticated (Member+)
  - Body: `{ "type": string, "payload": object, "estimatedCredits": number }`
  - Description: Queues asynchronous background job.
- `GET /api/v1/workspaces/:workspaceId/jobs/:jobId`
  - Auth: Authenticated (Viewer+)
  - Description: Polls job status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
- `POST /api/v1/workspaces/:workspaceId/jobs/:jobId/cancel`
  - Auth: Authenticated (Admin+)
  - Description: Cancels active job and triggers automatic credit refund.
