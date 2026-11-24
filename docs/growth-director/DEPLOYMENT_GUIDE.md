# BRAINWISE — GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM
# DEPLOYMENT & OPERATIONS GUIDE

> **Document ID:** `BW-GD-DEP-2026-11`  
> **Status:** PRODUCTION DEPLOYMENT GUIDE  
> **Author:** Senior Full-Stack Engineer & DevOps/Release Architect  

---

## 1. Prerequisites & Environment Variables

Ensure the following environment variables are configured in Secret Manager / `.env`:
```ini
NODE_ENV=production
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
FIREBASE_PROJECT_ID=your_firebase_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## 2. Build & Verification Commands

Before deploying to Cloud Run, container registry, or staging environment, execute the full validation pipeline:

### 2.1 Run Automated Test Suites
```bash
# Run comprehensive growth director tests
npx tsx --test src/server/growthDirectorComprehensive.test.ts src/server/phase7GrowthDirector.test.ts src/utils/strategicMemory.test.ts src/utils/logic.test.ts
```

### 2.2 Client Bundle Build
```bash
npm run build:client
```
*Expected Output:* `✓ built in ~600ms` generating `dist/index.html` and static asset chunks.

### 2.3 Server Bundle Build
```bash
npm run build:server
```
*Expected Output:* `Done in ~25ms` creating `dist/server.js`.

---

## 3. Database Indexes (Firestore)

Ensure the following composite indexes exist in Firestore:
```json
{
  "indexes": [
    {
      "collectionGroup": "growthTasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "timeHorizon", "order": "ASCENDING" },
        { "fieldPath": "iceScore.compositeScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "strategicMemories",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "theme", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4. Health & Liveness Checks

The production server provides direct readiness and health endpoints:
- `GET /health/live` -> `{ "status": "UP", "check": "liveness" }`
- `GET /health/ready` -> `{ "status": "UP", "check": "readiness" }`
- `GET /api/health` -> `{ "ok": true, "service": "brainwise-backend", "version": "1.0.0" }`

---

## 5. Security & Verification Checklist

- [x] Multi-tenant isolation enforced under `workspaces/{workspaceId}/...`.
- [x] Strict Zero Video Exclusion certified: No FFmpeg, Remotion, or video generation endpoints.
- [x] Two-Phase Credit Reservation protocol used for billing actions.
- [x] No API keys or Gemini credentials exposed to client bundles.
- [x] Anti-Vague validation enabled on task ingestion.
- [x] Idempotency enforced on learning event ingestion.
