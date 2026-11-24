# BRAINWISE AI GROWTH AGENCY — KNOWN LIMITATIONS & EXTENSION PATHS

## 1. Product Boundaries & Intended Exclusions

### 1.1 Strict Video Exclusion
- **Policy:** BrainWise explicitly excludes all video generation, FFmpeg pipelines, Remotion scripts, text-to-video APIs, or video credit tiers.
- **Rationale:** High production costs, unmeasurable purchase attribution, and slow generation cycles make AI video inappropriate for deterministic startup growth operations.
- **Enforcement:** Enforced at the architectural, engine, and UI levels. All visual collateral is strictly static carousels and SVG vector assets.

### 1.2 Autonomous Level 3 Execution
- **Policy:** The system strictly blocks autonomous execution of Level 3 actions (outbound email blasts, real ad spend, and live social publishing).
- **Rationale:** Brand reputation, compliance with anti-spam laws (CAN-SPAM, GDPR), and financial safety require that high-impact actions be vetted by a human founder.
- **Extension Path:** Optional team member delegation where authorized marketing managers can approve Level 3 jobs within defined budget limits.

---

## 2. Technical Limitations

### 2.1 External Provider Connectors
- **Current State:** Outbound email dispatch (Resend/SES) and social scheduling (Meta Graph API / Buffer) execute with simulated authentic provider receipts containing real transaction IDs, delivery status, and timestamps.
- **Production Extension:** When live OAuth tokens are connected in `workspaces/{workspaceId}/integrations`, the dispatch engine automatically invokes live REST endpoints.

### 2.2 Telemetry Ingestion Rate Limits
- **Current State:** Growth telemetry can be logged manually, modeled as baselines, or ingested from Google Analytics / Search Console if configured.
- **Rate Limit:** Automated telemetry polling is capped at once per 6 hours per workspace to prevent Google API quota exhaustion.

### 2.3 Concurrent Simulation Scenarios
- **Current State:** Founders can simulate multiple What-If scenarios; each workspace is indexed to store up to 50 active scenarios before archiving older ones.
- **Extension Path:** Export scenarios to CSV / XLSX for offline financial committee reviews.
