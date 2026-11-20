# BrainWise Business Brain Data Model & Truth Engine

## 1. Overview
The **Business Brain** is the central intelligence core of BrainWise. Rather than treating an AI LLM as an unconstrained text generator, BrainWise grounds all AI reasoning in a persistent, structured, authoritative business model stored at `/workspaces/{workspaceId}/business_profiles/default`.

---

## 2. Data Model Hierarchy
```typescript
interface BusinessBrainModel {
  businessName: string;
  description: string;
  industry: string;
  stage: 'early' | 'growth' | 'scaling' | 'established';
  offerings: Array<{
    id: string;
    name: string;
    type: 'product' | 'service';
    price: number;
    currency: string;
    description: string;
  }>;
  targetAudience: {
    segments: string[];
    painPoints: string[];
    locations: string[];
  };
  brandPositioning: {
    tone: string;
    valueProposition: string;
    usps: string[];
  };
  provenance: Record<string, {
    status: 'USER_CONFIRMED' | 'AI_INFERRED';
    source: string;
    updatedAt: string;
  }>;
  strategicMemory: {
    usedAngles: string[];
    fatiguedThemes: string[];
    explicitExclusions: string[];
    lastUpdated: string;
  };
  version: number;
  lastUpdated: string;
}
```

---

## 3. Fact Provenance & Truth Check Enforcement

### 3.1 Provenance Hierarchy
- `USER_CONFIRMED`: High-priority facts explicitly entered or verified by the business owner (e.g. pricing, product specifications, non-negotiable value propositions). AI inference can **never** overwrite or contradict a `USER_CONFIRMED` fact.
- `AI_INFERRED`: Hypotheses and strategic angles derived by the AI during onboarding or research. Displayed in the UI with an "Unconfirmed / Inferred" badge until reviewed by a user.

### 3.2 Server-Side Truth Check Guardrail (`src/utils/truthCheck.ts`)
Before any AI-generated marketing copy, strategy, or collateral is returned to the user or committed to database storage:
1. The text is passed through `executeTruthCheck(content, brain)`.
2. Extracted price mentions are compared against `brain.offerings`. If an unverified price is detected, the Truth Check fails with a `PRICE_HALLUCINATION` alert.
3. Forbidden claims matching `brain.strategicMemory.explicitExclusions` are scanned. If a prohibited term or claim is detected, the Truth Check triggers `EXCLUSION_BREACH`.
4. If the check fails:
   - The generation payload is rejected.
   - Reserved credits are automatically refunded to the workspace wallet (Net zero charge).
   - An audit alert is recorded in `audit_logs`.

---

## 4. Strategic Memory & Anti-Fatigue Engine
To prevent repetitive, generic marketing angles:
1. `recordStrategicAngle()` tracks campaign angles deployed over time.
2. Angles reaching saturation frequency are flagged in `fatiguedThemes`.
3. Subsequent prompt construction automatically injects negative constraints warning the LLM to avoid fatigued concepts and explore novel creative avenues.
