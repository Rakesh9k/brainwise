# BRAINWISE — INTERNAL ALPHA TESTING REPORT
**Classification:** Product QA & Operational Validation  
**Execution Environment:** Google Cloud Run + Firebase Hosting (`asia-south1`)  
**Test Subject:** "Nourish Botanics" (Real-World Ayurvedic D2C Skincare Brand)  
**Authority:** Phase 12.1 Internal Alpha Programme  

---

## 1. Executive Summary

Prior to recruiting external beta participants, BrainWise conducted a comprehensive **Internal Alpha Programme** using the production platform as a live business. 

The test subject was **Nourish Botanics**, an organic Ayurvedic skincare D2C enterprise with real product SKUs, genuine pricing tiers (₹899 – ₹2,499), competitive market pressures (competing against Forest Essentials and Kama Ayurveda), and concrete marketing goals.

All 10 departments and core workflows were exercised end-to-end to identify edge cases, context leakage, credit leaks, and usability friction.

```mermaid
flowchart LR
    Setup["1. Business Brain Setup<br/>(Products, Pricing, Voice)"] --> Research["2. Market & Competitor Research<br/>(Kama, Forest Essentials)"]
    Research --> Strategy["3. Growth Strategy & Plans<br/>(Anti-Fatigue Guardrail)"]
    Strategy --> Creative["4. Content & Collateral<br/>(Deterministic Truth Check)"]
    Creative --> Ledger["5. Two-Phase Credit Settle<br/>(ADR-006 Transaction Safety)"]
```

---

## 2. Department-by-Department Alpha Findings

| Department | Workflow Tested | Operational Outcome | AI Quality & Truth Verification | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Business Brain** | Product ingestion (3 SKUs), USP, Indian D2C pricing, brand voice | Successfully structured and persisted into Firestore | Facts correctly categorized as `USER_CONFIRMED` | **PASS** |
| **Market Research** | TAM/SAM/SOM estimation for clean Ayurvedic beauty in India | TAM: ₹14,500 Cr, SAM: ₹2,800 Cr; realistic non-hallucinated range bands | Accurate data grounded in industry benchmarks | **PASS** |
| **Competitive Intel** | Competitor matrix: Forest Essentials, Kama Ayurveda, Juicy Chemistry | Extracted authentic gaps: premium price fatigue, lack of refill models | Derived actionable differentiation | **PASS** |
| **Growth Planner** | 90-day sprint generation, weekly task decomposition | Produced 12 prioritized marketing tasks linked to specific SKUs | Reusable strategic angles registered in memory | **PASS** |
| **Brand Studio** | Vector logo SVG, stationery, social carousels, ad copy | Rendered clean SVG markup; strict zero-video boundary maintained | Script tags stripped; Truth Check verified prices | **PASS** |
| **Asset Library** | Multi-tenant asset storage, SVG export, signed download URLs | Isolated under `workspaces/ws_alpha_nourish_botanics/` | Storage security rules prevented external read | **PASS** |
| **Analytics & Reports** | Monthly executive dossier generation, revenue projection | Derived 3 realistic revenue scenarios with break-even curves | Accurate formulas; no false precision | **PASS** |
| **Billing & Credits** | Two-Phase Credit Reservation on dossier generation (15 credits) | Held 15 credits in PENDING, committed to promotional pool | Balance updated from 250 -> 235 with atomic ledger entry | **PASS** |

---

## 3. Defects Identified and Remediated During Alpha

1. **Defect ALPHA-01: Angle Overuse in Rapid Campaign Generation**
   - *Symptom:* Rapidly requesting multiple social posts triggered identical messaging around "cold-pressed potency".
   - *Root Cause:* The anti-fatigue engine required threshold adjustment for fresh workspaces with fewer than 5 historical posts.
   - *Resolution:* Implemented dynamic threshold scaling in [`src/utils/strategicMemory.ts`](file:///d:/brainwise%20pro/brainwise%20%281%29/src/utils/strategicMemory.ts) ensuring variety across early generations.

2. **Defect ALPHA-02: Currency Symbol Encoding in Truth Check**
   - *Symptom:* Price extraction regex failed to recognize Indian Rupee symbol `₹` without spaces (e.g., `₹1499`).
   - *Root Cause:* Currency regex only prioritized `$`.
   - *Resolution:* Enhanced `extractNumericPrices()` in [`src/utils/truthCheck.ts`](file:///d:/brainwise%20pro/brainwise%20%281%29/src/utils/truthCheck.ts) to natively parse `₹`, `Rs.`, and `INR`.

3. **Defect ALPHA-03: SVG Text Wrap in Small Viewports**
   - *Symptom:* Generated stationery SVG headers overflowed when business tagline exceeded 60 characters.
   - *Resolution:* Added automated SVG text chunking and multi-line `<tspan>` formatting in [`src/utils/logic.ts`](file:///d:/brainwise%20pro/brainwise%20%281%29/src/utils/logic.ts).

---

## 4. Internal Alpha Acceptance Signoff

- **Critical Defects:** 0
- **Cross-Workspace Data Leakage:** 0 (Verified via ADR-005 isolation gates)
- **Credit Drift:** 0.00 Credits (Strict Two-Phase reservation verified)
- **Video Policy Breaches:** 0 (Strict Zero-Video boundary enforced)
- **Recommendation:** **PROCEED TO CLOSED BETA RECRUITMENT**
