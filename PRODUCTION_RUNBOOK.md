# BRAINWISE — PRODUCTION OPERATIONAL RUNBOOK (SRE & ON-CALL)

> **Document Type:** Production Release Certification Deliverable  
> **Classification:** Standard Operating Procedures (SOPs) & Incident Response  
> **Status:** AUDITED & VERIFIED  
> **Date:** November 2026  
> **Workspace:** `d:\brainwise pro\brainwise (1)`

---

## 1. System Architecture Quick Reference

- **Frontend:** React 19 SPA, Vite build, Tailwind CSS, code-split dynamic imports (`React.lazy`).
- **Backend API:** Node.js Express server (`server.ts`), modular routes under `src/server/`.
- **Database:** Google Cloud Firestore (multi-tenant collections: `workspaces`, `users`, `business_brains`, `orders`, `subscriptions`).
- **Object Storage:** Google Cloud Storage (`brainwise-assets-prod`).
- **AI Core:** Google Gemini 2.5 Pro & Flash via official SDK; Truth Check & Anti-Fatigue engines.
- **Payment Gateway:** Cashfree Payments API `v2023-08-01` with cryptographic HMAC-SHA256 webhooks.
- **Hosting Environment:** Google Cloud Run (Containerized, auto-scaling 2 to 50 instances).

---

## 2. Standard Operating Procedures (SOPs)

### SOP-01: Database Outage / Degraded Status Response
**Symptom:** API endpoints returning `503 Service Unavailable` or `DATABASE_UNAVAILABLE`.
1. **Verify Cloud Firestore Status:** Check GCP Service Health dashboard (`https://status.cloud.google.com`).
2. **Inspect App Logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR AND textPayload=~'Firestore'" --limit=20
   ```
3. **Verify Service Account IAM:** Ensure Cloud Run Service Account has `roles/datastore.user`.
4. **Circuit Breaker Status:** BrainWise database wrapper automatically falls into read-only mode during temporary partition. If connection does not restore within 5 minutes, restart the Cloud Run revision:
   ```bash
   gcloud run services update brainwise-production --update-env-vars RESTART_TRIGGER=$(date +%s)
   ```

---

### SOP-02: Failed Schema Migration Recovery
**Symptom:** Migration runner fails on startup or leaves schema in `APPLYING` lock.
1. Check migration state in Firestore collection `_migrations`.
2. To release an orphaned lock:
   ```bash
   npx tsx src/server/db/migrations.ts --force-unlock
   ```
3. Inspect failing migration step and re-run with verbose logging:
   ```bash
   npx tsx src/server/db/migrations.ts --verbose
   ```

---

### SOP-03: Cashfree Payment & Order Reconciliation
**Symptom:** Customer completed payment on Cashfree, but BrainWise workspace credits were not added.
1. Check order ID in Cashfree Merchant Dashboard (`https://merchant.cashfree.com/merchants/orders`).
2. Verify order status is `PAID`.
3. Locate order in BrainWise database:
   ```bash
   npx tsx scripts/inspectOrder.ts --orderId="order_sub_xxx"
   ```
4. If webhook was missed, trigger manual sync via admin endpoint:
   ```bash
   curl -X POST https://api.brainwise.ai/api/admin/billing/reconcile-order \
     -H "Authorization: Bearer $ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"orderId": "order_sub_xxx"}'
   ```
   *Expected Result:* Order state shifts to `PAID`, subscription activates, credits are atomically incremented.

---

### SOP-04: Webhook Failure & Dead Letter Replay
**Symptom:** Webhook logs show elevated `401 Unauthorized` or `500 Internal Error`.
1. **Check Webhook Secret:** Verify `CASHFREE_SECRET_KEY` matches current Cashfree API credentials.
2. **Verify Timestamp Drift:** Ensure server NTP time is synchronized (timestamps $> 300\text{s}$ skewed are rejected).
3. **Replay Failed Webhooks:**
   - Navigate to Cashfree Dashboard -> Developers -> Webhooks.
   - Select failed events and click **Resend**.

---

### SOP-05: AI Provider Outage & Fallback Handling
**Symptom:** Gemini API returns `429 Too Many Requests` or `503 Service Unavailable`.
1. **Inspect Quota Usage:** Check Google Cloud Console -> APIs & Services -> Gemini API -> Quotas.
2. **Switch Models Dynamically:** If `gemini-2.5-pro` is experiencing high latency or rate limits, update environment variable to route extraction and non-critical tasks to `gemini-2.5-flash`:
   ```bash
   gcloud run services update brainwise-production --update-env-vars DEFAULT_AI_MODEL=gemini-2.5-flash
   ```
3. **Credit Safety Check:** Ensure failed AI requests automatically release reserved credits. Confirm zero orphan reservations in `workspaces/{workspaceId}/credit_reservations`.

---

### SOP-06: Data Recovery & Emergency Tenant Backup
**Symptom:** Tenant accidentally deletes workspace or requests full data recovery.
1. BrainWise enforces soft deletion with a 30-day recovery window.
2. Check `workspaces/{workspaceId}`: if `status == "DELETED"`, execute:
   ```bash
   npx tsx scripts/restoreWorkspace.ts --workspaceId="ws_xxx"
   ```
3. If permanent DPDPA erasure was executed (`executeDpdpaDataErasure`), data cannot and must not be restored per legal data protection requirements.

---

### SOP-07: Credential & API Key Rotation Protocol
**Frequency:** Every 90 days or immediately upon suspected compromise.
1. **Cashfree Key Rotation:**
   - Generate new API Key Pair in Cashfree Dashboard.
   - Update `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` in Google Secret Manager.
   - Cloud Run will automatically mount new secret versions on next revision.
   - Delete old key pair in Cashfree Dashboard after 1 hour.
2. **JWT Secret Rotation:**
   - Add new secret as primary, retain old secret as secondary verifier for 24 hours to prevent mass user logout.
