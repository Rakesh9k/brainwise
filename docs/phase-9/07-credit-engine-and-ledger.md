# BrainWise Commercial Infrastructure — Multi-Pool Credit Engine & Ledger

**Document ID:** BW-DOC-P9-007  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Multi-Pool Account Structure

Every workspace has an isolated multi-pool credit account stored at `workspaces/{workspaceId}/creditAccount/root`:

```typescript
export interface MultiPoolCreditAccount {
  workspaceId: string;
  availableBalance: number;
  reservedCredits: number;
  pools: {
    welcome: number;       // Initial 150 onboarding credits
    subscription: number;  // Refreshed monthly allowance
    purchased: number;     // Standalone top-up packs (NEVER expires)
    promotional: number;   // Bonuses, goodwill credits (expires first)
  };
  lifetimeGranted: number;
  lifetimeConsumed: number;
  lastUpdated: string;
}
```

---

## 2. Priority Consumption Protocol

When a reservation commits, credits are drained from pools according to strict priority ordering:

1. **Promotional Pool:** Drained first because promotional bonuses have a shorter expiration window.
2. **Subscription Pool:** Drained second because monthly allowances reset with each billing cycle.
3. **Welcome Pool:** Drained third.
4. **Purchased Pool:** Drained LAST. Purchased credits represent paid capital with permanent rollover that never expires.

---

## 3. Two-Phase Credit Reservation Protocol (ADR-006)

```
[AI Request Initiated]
        |
        v
  holdCredits() ---> Firestore Transaction:
                       - Verify availableBalance >= cost
                       - reservedCredits += cost
                       - availableBalance -= cost
                       - Record PENDING reservation
        |
        +------> [AI Model Orchestration & Truth Engine]
        |                     |
        |       +-------------+-------------+
        |       |                           |
        |   [SUCCESS]                   [FAILURE]
        |       v                           v
  commitCredits()                    releaseCredits()
  - Drain pools by priority          - reservedCredits -= cost
  - reservedCredits -= cost          - availableBalance += cost
  - Append CREDIT_SETTLEMENT         - Append CREDIT_RELEASE
  - Net: cost deducted               - Net: 0 credits lost
```

---

## 4. Ledger Reconciliation Engine

`creditEngine.reconcile(workspaceId)` sums all non-release ledger entries (`EnhancedCreditLedgerEntry`) and validates equality with `availableBalance + reservedCredits`. Any discrepancy triggers an audit flag.
