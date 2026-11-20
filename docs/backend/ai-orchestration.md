# BrainWise AI Orchestration & Guardrail Architecture

## 1. AI Orchestration Pipeline
BrainWise orchestrates generative AI via **Google Gemini** (`@google/genai` with model `gemini-2.5-flash`). All prompt construction, credential management, credit reservations, grounding injection, and post-generation guardrails occur exclusively on the backend in `src/server/services/aiOrchestrationService.ts`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant API as Express API
    participant Wallet as Credit Wallet (Firestore)
    participant Brain as Business Brain
    participant Gemini as Google Gemini API
    participant Guard as Truth Check & Anti-Fatigue

    Client->>API: POST /api/v1/workspaces/{id}/ai/generate
    API->>Wallet: holdCredits(cost) [Atomic Lock]
    alt Insufficient Balance
        Wallet-->>API: Reject INSUFFICIENT_CREDITS
        API-->>Client: 402 Payment Required
    else Hold Succeeded
        API->>Brain: Load Ground Truth & Exclusions
        API->>Gemini: Invoke Prompt with Grounding
        Gemini-->>API: Raw LLM Generation
        API->>Guard: executeTruthCheck(raw, brain)
        alt Truth Check Fails
            Guard-->>API: Hallucination / Exclusion Alert
            API->>Wallet: refundCredits(holdId) [Zero Net Cost]
            API-->>Client: 422 Unprocessable (Auto-Refunded)
        else Truth Check Passes
            Guard-->>API: Verified Valid
            API->>Wallet: commitCredits(holdId) [Settled]
            API->>Guard: recordStrategicAngle(angle)
            API-->>Client: 200 OK with Verified Generation
        end
    end
```

---

## 2. Dynamic Grounding & Context Assembly
Prompt construction incorporates four distinct contextual pillars:
1. **Department Mission & System Directives:** Domain guidelines tailored to the specific department (e.g. Brand Studio, Competitive Intelligence, Growth Director).
2. **Authoritative Ground Truth:** Explicit facts from `business_profiles/default` including verified offerings, actual pricing, target personas, and core value propositions.
3. **Anti-Fatigue Directives:** Directives instructing the model to avoid topics listed in `strategicMemory.fatiguedThemes`.
4. **Explicit Exclusions:** Strict negative constraints from `strategicMemory.explicitExclusions` (e.g. "Do not mention discounts", "Do not claim guaranteed returns").

---

## 3. Strict Scope Enforcement: Video Generation Ban
In strict compliance with Master Project Rules:
- The AI Orchestration Service possesses **NO prompts, parameters, workers, or tools for video generation**.
- Any prompt attempting to invoke video rendering, reel generation, or video scripting triggers an immediate validation rejection.
- All visual outputs are strictly limited to vector SVG graphics (`image/svg+xml`), static carousel cards, and structured typography layouts.
