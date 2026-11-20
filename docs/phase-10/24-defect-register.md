# BRAINWISE PHASE 10 — CENTRALIZED DEFECT REGISTER & AUDIT FINDINGS

**Document ID:** `BW-P10-REG-024`  
**Classification:** Quality Assurance & Defect Tracking  
**Status:** All Defects Remediated & Closed (0 Open)  
**Date:** November 2026  

---

## 1. Executive Summary

This register catalogs all defects, security vulnerabilities, race conditions, and compliance gaps discovered during the Phase 10 comprehensive audit. Each item includes severity classification, root cause analysis (RCA), engineering remediation implemented, and automated retest verification evidence.

**Final Defect Status Summary:**
- **Total Defects Discovered:** 6
- **Critical (P0):** 2 (Remediated & Verified)
- **High (P1):** 2 (Remediated & Verified)
- **Medium (P2):** 2 (Remediated & Verified)
- **Low (P3):** 0
- **Total Open Defects:** **0 (Zero)**

---

## 2. Master Defect Ledger

### Defect 1: Concurrency Race Condition in Credit Reservation
- **Defect ID:** `DEF-P10-001`
- **Severity:** **CRITICAL (P0)**
- **Category:** Financial Integrity & Concurrency
- **Location:** `src/server/db/firestore.ts` (Database Transaction Execution)
- **Description:** Under rapid concurrent requests in the in-memory database abstraction, two simultaneous 80-credit hold attempts against a 100-credit account balance were both granted. Asynchronous Promise interleaving allowed both requests to read the account balance prior to either commit writing the updated balance, allowing over-reservation of 60 credits.
- **Root Cause:** Absence of a serializable execution lock across asynchronous transactions in `InMemoryDatabase`.
- **Remediation:** Implemented `txQueue` serializable transaction mutex in `InMemoryDatabase` (`src/server/db/firestore.ts`). Each incoming transaction awaits prior active transactions before acquiring the read-write snapshot, guaranteeing strict sequential isolation.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 3 (`Financial Integrity`). Executed 2 simultaneous 80-credit holds; exactly 1 succeeded and 1 failed with `INSUFFICIENT_CREDITS`. Zero over-reservation.
- **Status:** **CLOSED & VERIFIED**

---

### Defect 2: Server-Side Request Forgery (SSRF) Exposure in Competitor Tracking
- **Defect ID:** `DEF-P10-002`
- **Severity:** **CRITICAL (P0)**
- **Category:** Security & Network Boundary
- **Location:** `src/server/routes/v1/competitorRoutes.ts`
- **Description:** Competitor domain registration and snapshot scraping endpoints accepted arbitrary external URLs without validating IP address resolution, allowing potential internal network port scanning or cloud metadata extraction (`http://169.254.169.254`).
- **Root Cause:** Absence of strict URL scheme and IP address range boundary validation on user-submitted competitor URLs.
- **Remediation:** Created `src/server/utils/ssrfValidator.ts` implementing `validateSafeExternalUrl()`. Blocks loopback addresses (`127.0.0.1`, `localhost`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata addresses (`169.254.169.254`), and non-HTTP protocols (`file:`, `ftp:`, `gopher:`). Enforced in `competitorRoutes.ts`.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 2 (`SSRF & Injection Security`). All malicious internal URLs rejected with `HTTP 400 INVALID_URL_TARGET`.
- **Status:** **CLOSED & VERIFIED**

---

### Defect 3: Idempotency Key Duplicate Lookup Failure in Credit Engine
- **Defect ID:** `DEF-P10-003`
- **Severity:** **HIGH (P1)**
- **Category:** Financial Integrity & Idempotency
- **Location:** `src/server/billing/creditEngine.ts`
- **Description:** When an upstream client retried a hold request with an existing `idempotencyKey`, the reservation was located only by `reservationId`, returning a newly generated reservation rather than the exact previously committed hold object.
- **Root Cause:** Reservation documents were saved only under `reservations/${reservationId}` without a secondary index mapping `idempotencyKey` to `reservationId`.
- **Remediation:** Updated `holdCredits()` to index reservations under both `reservations/${reservationId}` and `reservations/${idempotencyKey}`. Immediate return of existing reservation occurs if the key is detected.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 6 (`Failure & Recovery`). Retried hold with identical key returns exact identical `reservationId` without decrementing balance twice.
- **Status:** **CLOSED & VERIFIED**

---

### Defect 4: Missing Initial Credit Account on Workspace Creation
- **Defect ID:** `DEF-P10-004`
- **Severity:** **HIGH (P1)**
- **Category:** Workspace Provisioning & Billing
- **Location:** `src/server/services/authService.ts`
- **Description:** In the 28-step customer onboarding flow, newly created workspaces lacked an initialized credit account, causing subsequent AI generation actions to fail with `Credit account not found for workspace`.
- **Root Cause:** `createWorkspace` in `authService.ts` provisioned workspace metadata and owner membership but omitted the atomic call to `creditEngine.initializeAccount()`.
- **Remediation:** Added `await creditEngine.initializeAccount(workspaceId, 150)` within the workspace creation transaction in `authService.ts`.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 11 (`28-Step Customer Journey`). Newly onboarded workspaces immediately receive 150 starter credits and execute generation tasks seamlessly.
- **Status:** **CLOSED & VERIFIED**

---

### Defect 5: Absence of Programmatic Disaster Recovery Restore Hook
- **Defect ID:** `DEF-P10-005`
- **Severity:** **MEDIUM (P2)**
- **Category:** Business Continuity & DR
- **Location:** `src/server/db/firestore.ts`
- **Description:** The database interface lacked programmatic export and restore contracts, impeding automated verification of disaster recovery procedures in CI/CD environments.
- **Root Cause:** Absence of `exportBackup()` and `restoreBackup()` methods in `IDatabaseService`.
- **Remediation:** Defined and implemented `exportBackup()` and `restoreBackup()` in `IDatabaseService`, `InMemoryDatabase`, and `CloudFirestoreDatabase`.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 7 (`Disaster Recovery`). Total data wipe followed by restore validated with 100% data integrity match.
- **Status:** **CLOSED & VERIFIED**

---

### Defect 6: Lack of DPDPA Section 12 Right to Erasure Route
- **Defect ID:** `DEF-P10-006`
- **Severity:** **MEDIUM (P2)**
- **Category:** Privacy & Statutory Compliance
- **Location:** `src/server/routes/v1/workspaceRoutes.ts`
- **Description:** No automated API existed for a workspace owner to invoke their statutory Right to Erasure under Section 12 of India's DPDPA 2023, risking regulatory non-compliance.
- **Root Cause:** Erasure workflow had not been formalized into a dedicated authenticated endpoint with audit logging.
- **Remediation:** Created `DELETE /api/v1/workspaces/:workspaceId/dpdpa-erasure`. Purges Business Brain facts, profile data, competitor records, disconnects integrations, archives workspace, logs tamper-evident audit event, and preserves statutory financial tax invoices.
- **Verification Evidence:** `src/server/phase10.test.ts` Suite 10 (`DPDPA Compliance`). Verified total profile purge and audit trail recording.
- **Status:** **CLOSED & VERIFIED**

---

## 3. Summary Assessment

All 6 identified defects have been remediated, covered by unit and integration tests, and validated in CI pipeline runs. There are **zero outstanding defects or known regressions** across the platform.
