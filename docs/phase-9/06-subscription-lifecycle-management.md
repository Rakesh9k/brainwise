# BrainWise Commercial Infrastructure — Subscription Lifecycle Management

**Document ID:** BW-DOC-P9-006  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Subscription States & Lifecycle Transitions

```
 [New Workspace] ---> (Free Starter) 
                            |
                     [Upgrade / Checkout]
                            |
                            v
                         (Active) <----------------+
                         /      \                  |
           [Downgrade /           [Auto-Renewal /  | [Reactivate]
            Period-End]            Cycle Refresh]  |
                       /          \                |
                      v            v               |
             (Cancellation    (Active / Next       |
               Scheduled)       Period)            |
                   |                               |
              [Period End]                         |
                   |                               |
                   +-------------------------------+
                   |
                   v
              (Cancelled) ---> (Reverts to Free Starter)
```

---

## 2. Core Subscription Operations (`SubscriptionEngine`)

1. **Activation:**
   - Establishes billing cycle period (30 days for monthly, 365 days for annual).
   - Grants base monthly plan allowance into the `subscription` credit pool.
2. **Renewal:**
   - Advances `currentPeriodStart` and `currentPeriodEnd`.
   - Refreshes monthly credit allowance via `creditEngine.grantCredits()`.
3. **Upgrades:**
   - Calculates the credit allowance delta between the old and new tier.
   - Immediately grants prorated credit delta so the user immediately receives full tier capabilities.
4. **Downgrades & Cancellations:**
   - Avoids abrupt cutoffs: marks `status: 'cancellation_scheduled'` with `cancelAtPeriodEnd: true`.
   - Users retain paid features until `currentPeriodEnd` concludes, at which point the workspace cleanly rolls back to Free Starter limits.
5. **Reactivations:**
   - If a user cancels and changes their mind before `currentPeriodEnd`, `reactivateSubscription()` restores `status: 'active'` with zero penalty.
