# BRAINWISE — END-TO-END TESTING REPORT

**Project:** BrainWise  
**Document ID:** BW-PH10-12  
**Audit Date:** 2026-11-20  
**Test Suite:** Production Acceptance (Suite 11 of `phase10.test.ts`)  
**Pass Rate:** 100% (28 of 28 Steps Verified)  

---

## 1. Complete 28-Step Customer Journey Audit

The platform was subjected to a complete, uninterrupted customer lifecycle test from public onboarding to subscription management:

| Step | User Action | System Execution | Database Verification | Status |
|---|---|---|---|---|
| **1-4** | Registration & Login | Hashed scrypt password, issued JWT bearer token | `users/{id}` created with active status | **PASS** |
| **5-7** | Onboarding & Brain Setup | Provisioned workspace, initialized 150 welcome credits | `workspaces/{id}`, `businessBrain/rootDoc` | **PASS** |
| **8-10** | Department AI Request | Strategy request triggered, held 25 credits | `creditAccount/root/reservations/{resId}` PENDING | **PASS** |
| **11-13** | AI Output & Settlement | Validated findings, committed 25 credits | `creditLedger/{txId}` recorded, balance 125 | **PASS** |
| **14-15** | External Integration | Connected Google Analytics 4 | Encrypted AES-256-GCM tokens stored | **PASS** |
| **16-18** | Automation Creation | Scheduled weekly competitor monitor | `automations/{autoId}` ACTIVE status | **PASS** |
| **19-22** | Upgrade to Hero Plan | Cashfree checkout @ ₹6,999/mo + GST, verified payment | `subscriptions/{id}` active, 3,000 credits added | **PASS** |
| **23** | Credit Pack Purchase | Purchased 1,500 credits @ ₹3,999 | `purchased` pool incremented with 0 expiration | **PASS** |
| **24-25** | GST Invoice Generation | Emitted invoice with CGST 9% + SGST 9% | `invoices/{id}` sequential numbering `INV-2026-XXXX` | **PASS** |
| **26** | Subscription Management | Calculated Business tier upgrade path | Plan upgrade delta computed accurately | **PASS** |
| **27-28** | Logout & Re-authentication | Logged out, logged back in with same credentials | All state, brain, and credits 100% intact | **PASS** |

---

## 2. Journey Exception & Fault Paths

- **Failed Payment:** Simulated declined payment; system marked payment `failed` and granted 0 subscription credits.
- **Depleted Wallet:** Simulated 0 credits; non-credit navigation remained operational while AI actions threw `INSUFFICIENT_CREDITS`.
- **Restricted Role:** Viewer account permitted reading dashboards but blocked from initiating billable workflows.
