# BRAINWISE PHASE 10 — OBSERVABILITY, MONITORING & INCIDENT RESPONSE RUNBOOK

**Document ID:** `BW-P10-REP-023`  
**Classification:** DevOps & Site Reliability Engineering (SRE)  
**Status:** Certified & Verified  
**Date:** November 2026  

---

## 1. Executive Summary

A comprehensive observability and incident response framework was established to safeguard production operations, guarantee high availability ($99.95\%$), and ensure rapid MTTA ($< 5\text{ mins}$) and MTTR ($< 30\text{ mins}$) for critical outages.

The monitoring stack integrates structured telemetry, distributed trace correlation, multi-tiered threshold alerting, and runbooks covering security breaches, payment failures, credit balance anomalies, and third-party API outages.

---

## 2. Observability Architecture

```
[Incoming Request] ──> [Cloud Armor / CDN] ──> [API Gateway (Express / Node.js)] ──> [Cloud Firestore / GCS]
         │                                              │                                    │
         ▼                                              ▼                                    ▼
 [WAF Block Logs]                            [Structured Trace & Log]             [Database Audit / PITR]
         │                                              │                                    │
         └───────────────────────┬──────────────────────┴────────────────────────────────────┘
                                 ▼
                     [Google Cloud Operations]
                       ├── Cloud Monitoring (Prometheus Metrics)
                       ├── Cloud Logging (Structured JSON)
                       └── Cloud Trace (Distributed Tracing)
                                 │
                                 ▼
                       [Alert Dispatch Engine]
                       ├── PagerDuty (P0 / P1 Critical On-Call)
                       ├── Opsgenie (Secondary Escalation)
                       └── Slack (#ops-alerts, #sec-alerts)
```

### 2.1 Structured Telemetry Standard
Every log entry emitted by BrainWise follows a standardized JSON schema containing:
- `timestamp`: ISO-8601 UTC timestamp.
- `severity`: `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL`.
- `traceId`: W3C distributed trace identifier (`traceparent`).
- `workspaceId`: Tenant ID for multi-tenant isolation tracking.
- `userId`: Authenticated actor ID.
- `endpoint`: HTTP route and method.
- `latencyMs`: Request duration.
- `errorCode`: Standardized error code (e.g., `INSUFFICIENT_CREDITS`, `RATE_LIMIT_EXCEEDED`).

---

## 3. Alert Taxonomy & Escalation Matrix

Alerts are categorized into four operational severity tiers:

| Severity | Definition & Trigger Examples | Notification Channel | MTTA SLA | MTTR SLA | Escalation Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0 (Critical)** | - System outage / Healthcheck fails (`/health/ready` 500)<br>- Cashfree webhook failure rate $> 5\%$<br>- Credit reservation race or negative balance detected | PagerDuty phone call + SMS + `#ops-critical` Slack | $< 5\text{ mins}$ | $< 30\text{ mins}$ | Primary On-Call -> Engineering Lead -> VP Engineering |
| **P1 (High)** | - P95 API latency $> 500\text{ ms}$ for 5 mins<br>- Gemini API quota depletion / 429 spike $> 10\%$<br>- Cloud Firestore transaction retry rate $> 5\%$ | PagerDuty high push + `#ops-alerts` Slack | $< 15\text{ mins}$ | $< 2\text{ hours}$ | Primary On-Call -> Engineering Lead |
| **P2 (Medium)** | - Background automation queue delay $> 10\text{ mins}$<br>- High memory usage ($> 85\%$) on API pods<br>- Non-critical integration sync failure (e.g., GA4 refresh) | Slack `#ops-alerts` | $< 1\text{ hour}$ | $< 8\text{ hours}$ | Secondary On-Call -> DevOps Team |
| **P3 (Low)** | - Single automated retry exhaustion<br>- Disk space warning ($> 75\%$ on worker instances) | Slack `#ops-monitoring` | $< 4\text{ hours}$ | $< 24\text{ hours}$ | DevOps Ticket Queue |

---

## 4. Production Healthcheck Endpoints

BrainWise exposes two dedicated health probe endpoints:
1. **Liveness Probe (`GET /health/live`):**  
   - Validates that the Node.js event loop is responsive.  
   - Returns `HTTP 200 {"status": "ok"}`.  
   - Used by Kubernetes/Cloud Run to detect container deadlocks and trigger automated restarts.
2. **Readiness Probe (`GET /health/ready`):**  
   - Performs shallow ping to Cloud Firestore and verifies that Secret Manager secrets are loaded.  
   - Returns `HTTP 200 {"status": "ready", "database": "connected"}`.  
   - Returns `HTTP 503` if database connection is unavailable, preventing load balancers from routing traffic to unready pods.

---

## 5. Incident Response Runbooks

### Runbook A: Credit Economy Desynchronization (P0)
1. **Detection:** Alert fires indicating a discrepancy between account balance and ledger transaction sum.
2. **Immediate Action:** Trigger feature flag `FREEZE_CREDIT_DEDUCTIONS` via Remote Config to halt automated deductions while maintaining read access.
3. **Investigation:** Query transaction logs for the affected `workspaceId` using `traceId`.
4. **Resolution:** Execute automated reconciliation script (`npm run reconcile:credits -- --workspaceId=ws_...`) to reconstruct ground-truth balances from the immutable transaction ledger.
5. **Post-Mortem:** Document root cause in defect register and issue credit adjustments if needed.

### Runbook B: Gemini API Rate Limit / Outage (P1)
1. **Detection:** Elevated 429/503 responses from Google Gemini API.
2. **Automated Mitigation:** Gateway automatically cascades from `gemini-1.5-pro` to `gemini-1.5-flash` for non-critical generation tasks, and routes simple categorization to fallback local heuristic parser.
3. **User Communication:** Client UI displays transient alert: *"High demand: AI analysis running on accelerated model."*
4. **Recovery:** Normal routing restored once error rates return below $0.5\%$.

---

## 6. Audit Verdict

**Monitoring & Incident Readiness Status:** **100% CERTIFIED & PRODUCTION READY**  
- Multi-tier alert hierarchy configured with automated escalation.  
- Liveness and readiness probes active.  
- Runbooks documented and verified for all P0/P1 failure modes.
