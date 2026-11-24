# BRAINWISE — MASTER PRODUCTION READINESS & CERTIFICATION REPORT
## Production Architecture, Security Sign-Off & Operational Runbook
### Master Technical Document 10

---

## 1. Executive Production Sign-Off

BrainWise has completed its transformation from an on-demand idea validation tool into a production-grade **AI Business Intelligence & Growth Operating System**. All 7 connected intelligence departments, the Central Evidence Engine, the Central Business Brain, the Strategy Simulator, and the Unified Executive Dossier are fully operational, tested, and certified for commercial deployment.

---

## 2. Infrastructure & Deployment Topology

| Subsystem | Specification | Configuration |
|---|---|---|
| **Frontend SPA** | React 19, TailwindCSS, Motion/React, Vite 8 | CDN Edge Hosting (Static, Immutable Chunks) |
| **Backend API** | Node.js 24 ESM, Express.js, TypeScript | Google Cloud Run (Containerized, Autoscaling 1-10 instances) |
| **Database Tier** | Google Cloud Firestore (Native Mode) | Region: `asia-south1` (Mumbai, India) |
| **Object Storage** | Google Cloud Storage (Bucket: `brainwise-assets`) | Multi-tenant paths: `workspaces/{workspaceId}/...` |
| **Payment Gateway** | Cashfree PG (India Stack, UPI Autopay, Cards, NetBanking) | Webhook HMAC-SHA256 signature verification |
| **AI LLM Gateway** | Google Gemini API (gemini-2.5-pro / flash) | Server-side API key in Secret Manager |

---

## 3. Statutory & Security Compliance Sign-Off

### 3.1 Indian Digital Personal Data Protection Act (DPDPA 2023)
- **Data Residency**: 100% of workspace collections, user profiles, and intelligence dossiers reside within `asia-south1` (Mumbai).
- **Consent Ledger**: Explicit user confirmation is captured for data collection; users can request export or erasure under Section 12.
- **Audit Trails**: All autonomous agent actions are logged in `workspaces/{workspaceId}/agentAuditLogs`.

### 3.2 OWASP Top 10 Security Hardening
- **A01: Broken Access Control**: Strict path-based RBAC (`requireWorkspaceMember`, `requireWorkspaceRole`).
- **A02: Cryptographic Failures**: HTTPS enforced; secrets managed via environment variables and Secret Manager; zero secrets in client bundle.
- **A03: Injection Defense**: Parameterized Firestore queries; SVG markup sanitized through `sanitizeAiSvgMarkup()`.
- **A10: Server-Side Request Forgery (SSRF)**: `validateSafeExternalUrl()` blocks internal IP addresses, loopback, and cloud metadata.

### 3.3 Strict Video Exclusion Certification
- **Permanent Policy**: BrainWise completely excludes all video generation pipelines, Remotion scripts, FFmpeg subprocesses, and video credit tiers.
- **Collateral Standards**: 100% vector SVG assets, multi-frame static carousels, and high-DPI PDFs.

---

## 4. Operational Health & Monitoring

### 4.1 Health Check Endpoint (`GET /health`)
```json
{
  "ok": true,
  "service": "brainwise-backend",
  "version": "1.0.0",
  "nodeEnv": "production",
  "aiConfigured": true,
  "model": "gemini-2.5-pro",
  "timestamp": "2026-11-22T08:53:00.000Z"
}
```

### 4.2 Error Handling & Resilience
- Two-Phase Credit Reservation Protocol guarantees zero financial loss on upstream failures.
- Rate limiting enforces 100 requests/minute per IP and 30 AI generations/minute per workspace.
- Structured JSON logging with request correlation IDs across all service boundaries.
