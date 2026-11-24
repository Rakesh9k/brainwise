# BRAINWISE — EMERGENCY ROLLBACK PLAN & RESTORATION PROCEDURE

> **Document Type:** Production Release Certification Deliverable  
> **Classification:** SRE Incident Response & Rollback Procedures  
> **Status:** AUDITED & VERIFIED  
> **Date:** November 2026  
> **Workspace:** `d:\brainwise pro\brainwise (1)`

---

## 1. Rollback Decision Triggers & Matrix

An immediate rollback of a production release must be initiated by the Incident Commander or SRE On-Call under any of the following conditions within 60 minutes post-deployment:

| Trigger Condition | Threshold | Rollback Priority |
| :--- | :--- | :--- |
| **HTTP 5xx Server Error Spike** | Error rate $> 1.0\%$ across total requests over a 5-minute window | **P0 (Immediate)** |
| **Database Connection Failure** | Firestore connectivity drops or persistent write errors occur | **P0 (Immediate)** |
| **Payment Gateway Malfunction** | Cashfree webhook signature rejections $> 5\%$ or checkout failures | **P0 (Immediate)** |
| **Authentication Outage** | Users unable to login or session tokens fail validation | **P0 (Immediate)** |
| **Tenant Data Bleed / Security** | Any reported cross-workspace data leakage | **P0 (Immediate + Stop App)** |
| **Frontend White Screen / Crash** | Uncaught JS error preventing critical route rendering | **P1 (Within 15 mins)** |
| **Latency Degradation** | P95 latency exceeds 3,000ms for core API endpoints | **P1 (Within 30 mins)** |

---

## 2. Cloud Run Service Rollback Procedure (Instant Traffic Cutover)

Google Cloud Run retains immutable revisions of every deployment, enabling instantaneous zero-downtime rollback without rebuilding containers.

### Step 1: Identify Last Known Good Revision
```bash
# List recent revisions of the brainwise production service
gcloud run revisions list \
  --service=brainwise-production \
  --region=asia-south1 \
  --limit=5
```

### Step 2: Route 100% Traffic to Previous Stable Revision
```bash
# Shift 100% traffic immediately back to the previous stable revision
gcloud run services update-traffic brainwise-production \
  --to-revisions=brainwise-production-00042-xyz=100 \
  --region=asia-south1
```

### Step 3: Verify Traffic Shift & Health
```bash
# Verify traffic distribution
gcloud run services describe brainwise-production \
  --region=asia-south1 \
  --format="value(status.traffic)"

# Ping health check endpoint
curl -I https://app.brainwise.ai/api/health
```

---

## 3. Database & Schema Rollback Procedures

### 3.1 Non-Destructive Migrations (Forward Compatible)
BrainWise database schemas follow the **Expand-and-Contract** pattern. New fields added in new versions are always optional. Therefore, rolling back server code to an older revision does NOT break database schema compatibility.

### 3.2 Firestore Point-in-Time Recovery (PITR)
If a release caused data corruption or unrecoverable tenant data modifications:

1. Identify the timestamp immediately prior to deployment (e.g. `2026-11-24T05:00:00Z`).
2. Restore database state using GCP Cloud Firestore PITR:
```bash
gcloud firestore databases restore \
  --source-database=projects/brainwise-prod/databases/(default) \
  --destination-database=projects/brainwise-prod/databases/default-restored \
  --recovery-time="2026-11-24T05:00:00Z"
```
3. Update connection string / application database reference if a full restore is necessary.

---

## 4. Payment & Billing Rollback / Reconciliation

In the event of a billing-related incident during deployment:

1. **Disable New Orders:** Flip feature flag `ENABLE_NEW_CHECKOUT=false` via Cloud Run environment configuration.
2. **Replay Webhooks:** Replay pending or missed webhooks from Cashfree Merchant Dashboard under `Developers -> Webhook Logs -> Failed Webhooks -> Retry All`.
3. **Credit Discrepancy Auditing:**
   - Execute the billing reconciliation script:
     ```bash
     npx tsx scripts/reconcileCashfreeOrders.ts --since="2026-11-24T04:00:00Z"
     ```
   - Any order confirmed by Cashfree that failed to credit the workspace will be automatically credited with audit log logging.

---

## 5. Post-Rollback Communication & Debrief

1. Notify executive stakeholders and customer success via `#incident-room`.
2. Post public status update on `status.brainwise.ai`.
3. Schedule blameless Post-Mortem within 24 hours to analyze root cause and update test suites.
