# BRAINWISE AI GROWTH AGENCY — TEST STRATEGY & ACCEPTANCE PROTOCOL

**Authority:** Master Engineering Directive — Phase 0 Testing Plan  
**Target:** 100% Verification of Growth Agency Capabilities & 5 Founder Journeys  
**Workspace:** `d:\brainwise pro\brainwise (1)`  

---

## 1. Testing Pyramid

```
                ▲
               / \
              /   \
             / E2E \    5 Realistic Founder Journeys (Scenarios A - E)
            /───────\
           / Integr. \  Context Ingestion, Missions, Execution Queue, Memory
          /───────────\
         /  Unit Tests \ ICE Math, Diagnosis Dimensions, Kill Switches, Adapters
        /───────────────\
```

---

## 2. Test Suites

### 2.1 Unit Tests (`src/server/growthAgencyUnit.test.ts`)
- **ICE Prioritization Math:** Validates range clamping (1–10), urgency/feasibility modifiers, composite multiplier.
- **16-Dimension Diagnosis Logic:** Verifies symptom vs root cause separation, threshold triggers, and confidence bounds.
- **Kill-Switch Criteria:** Asserts that experiments cannot be prematurely aborted before minimum sample size is reached.
- **Capacity & Bottleneck Engine:** Tests founder bandwidth limits (20h/wk ceiling) and sprint task capping.
- **Business Model Adaptation:** Verifies specific metrics (e.g. food covers vs SaaS churn).

### 2.2 Integration Tests (`src/server/growthAgencyIntegration.test.ts`)
- **Mission Lifecycle:** `DRAFT` → `APPROVED` → `IN_PROGRESS` → `COMPLETED` → `VERIFIED` transitions.
- **Approval Gate Enforcement:** Ensures Level 3 execution jobs block until explicit founder approval token is supplied.
- **Idempotency & Retry:** Verifies identical idempotency keys do not produce duplicate jobs.
- **Closed-Loop Learning:** Confirms that validated outcomes increase channel weights while repeated failures increase fatigue scores.
- **Two-Phase Credit Reservation:** 20 credits held in `HOLD`, settled upon successful synthesis, and auto-refunded on simulated failure.

### 2.3 End-to-End Founder Journeys (`src/server/growthAgencyJourneys.test.ts`)
1. **Scenario A — Pre-Launch Startup (Artisan Chocolate):** Demands validation first; strictly rejects premature ad spending before willingness-to-pay is verified.
2. **Scenario B — Early-Stage SaaS (Acquiring First 100 Customers in 90 Days):** Focuses on outbound contrast wedges against competitor pricing and calculates affordable CAC.
3. **Scenario C — Local Restaurant / Cloud Kitchen:** Identifies weekday demand constraints, local discovery, and corporate lunch catering wedges.
4. **Scenario D — D2C Consumer Brand:** Plans packaged launch experiments, thermal transit tests, and festive corporate gifting partnerships.
5. **Scenario E — Failing Acquisition Channel:** Detects CTR drop-off, distinguishes channel fatigue from macro shifts, and recommends alternative angles.
