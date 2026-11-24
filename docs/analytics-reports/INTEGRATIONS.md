# BRAINWISE CONNECTOR & INTEGRATIONS SPECIFICATION
**Document ID:** `docs/analytics-reports/INTEGRATIONS.md`  
**Status:** Integration Architecture Specification  
**Version:** 1.0.0  

---

## 1. Supported Ingestion Pathways

| Provider | Ingestion Mode | Data Types Ingested | Reconciliation Strategy | Freshness SLA |
|---|---|---|---|---|
| **Stripe** | Webhook + Periodic API Sync | Charges, Refunds, Subscriptions, Disputes | Transaction ID deduplication; gross vs refund audit | 12 hours |
| **Shopify / Storefront** | Webhook + Orders REST API | Orders, Line items, Discounts, Cancellations | Order ID hash check; net sales variance check | 12 hours |
| **Google Analytics 4 (GA4)** | Scheduled Batch API | Daily sessions, unique users, conversion events | Date + Channel key matching | 24 hours |
| **Google / Meta Ads** | Scheduled Sync API | Impressions, Clicks, Spend by Campaign | UTM campaign string parsing | 24 hours |
| **Manual CSV Upload** | On-demand Admin Upload | Historical financial ledgers, bank transactions | Row-by-row SHA-256 hash deduplication | On upload |

---

## 2. Ingestion Resilience & Checkpointing

1. **Idempotency Hashing:** Every ingestion record generates a deterministic hash:
   `met_idem_<SHA256(workspaceId + source + metricType + metricName + timestamp)>`
   Existing records with identical keys are acknowledged without duplicating stored records.
2. **Exponential Backoff:** Transient network timeouts retry with exponential backoff:
   $T_{\text{wait}} = 2^{\text{attempt}} \times 1000\text{ ms} + \text{jitter}$ (max 3 retries).
3. **Dead-Letter Handling:** Malformed payloads that fail schema validation are logged with error codes into `unresolvedErrors` and quarantined.

---

## 3. Data Health Center Integration

The `dataHealthService` exposes real-time connector status:
- `CONNECTED` / `AUTHENTICATED` / `SYNCING` / `SYNCHRONIZED` / `PARTIALLY_SYNCHRONIZED` / `FAILED` / `DISCONNECTED` / `PERMISSION_EXPIRED`.
- Never displays `SYNCHRONIZED` if any record in the batch was rejected or unparseable.
