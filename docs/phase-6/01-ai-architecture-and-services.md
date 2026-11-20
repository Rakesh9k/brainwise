# BrainWise Phase 6: Core AI Intelligence Engine Architecture

## 1. Executive Summary

BrainWise Phase 6 establishes the central, reusable, model-independent AI intelligence infrastructure that powers all 14 BrainWise operating departments without creating disconnected chatbots or separate AI implementations.

### Core Architectural Principle
> **ONE SHARED AI ENGINE. MULTIPLE SPECIALIZED DEPARTMENTS.**
> **SHARED BUSINESS CONTEXT. SHARED MEMORY. SHARED RESEARCH. SHARED VALIDATION. SHARED EXECUTION. SHARED CREDIT ACCOUNTING.**

Any new department added to BrainWise only needs to define its workflows, tools, and prompts; it never rebuilds the underlying context, credit, memory, or validation infrastructure.

---

## 2. Logical Architecture Diagram

```
USER INTERFACE / FRONTEND
       │
       ▼
API / REQUEST GATEWAY (/api/v1/workspaces/:workspaceId/ai/requests)
       │
       ▼
AUTHENTICATION & WORKSPACE AUTHORIZATION GATE
       │
       ▼
AI ORCHESTRATOR (15-Step Lifecycle Controller)
       │
       ├────────────────────────────────┐
       ▼                                ▼
CONTEXT ENGINE                    MEMORY ENGINE
(Relevance Filtering,             (Categorized: Approved Facts,
 Fact Provenance Grounding)        Decisions, Preferences)
       │                                │
       └────────────────┬───────────────┘
                        │
                        ▼
               TASK CLASSIFIER & WORKFLOW REGISTRY
                        │
                        ▼
                 MODEL ROUTER (Gemini 2.5/3.8 + Deterministic Engine)
                        │
                        ▼
                 TOOL REGISTRY (Web Research, Calculator, Task Creator)
                        │
                        ▼
                 VALIDATION & TRUTH ENGINE
                 (Structural, Context, Evidence, Logic, Safety)
                        │
                        ▼
                 HUMAN APPROVAL GATE
                 (High-Risk Action Confirmation)
                        │
                        ▼
                 EXECUTION & PERSISTENCE
                 (Firestore Collections: Requests, Executions, Results, Memories)
                        │
                        ▼
                 TWO-PHASE CREDIT SETTLEMENT (ADR-006)
                        │
                        ▼
             STRUCTURED CLIENT RESPONSE
```

---

## 3. Seven Core Reusable AI Services

| Service | File Path | Primary Responsibilities |
|---|---|---|
| **Context Engine** | `src/server/ai/contextEngine.ts` | Retrieves verified Business Brain facts (`USER_CONFIRMED` vs `AI_INFERRED`), filters relevant fields per department/workflow, tracks version and data freshness. |
| **Research Engine** | `src/server/ai/researchEngine.ts` | Gathers external market and competitor evidence with strict provenance timestamps, domain categorization (`GOVERNMENT`, `INDUSTRY_REPORT`, etc.), and URL deduplication. |
| **Strategy Engine** | `src/server/ai/strategyEngine.ts` | Formulates grounded, actionable business recommendations with why-it-matters, expected outcomes, estimated effort/cost, risks, and measurement criteria without false revenue guarantees. |
| **Validation Engine** | `src/server/ai/validationEngine.ts` | 5-layer verification: Structural JSON, Business Context (Truth Check), Evidence alignment, Logic & consistency, Safety & prompt injection defense. |
| **Execution Engine** | `src/server/ai/executionEngine.ts` | Dispatches tools with explicit schemas, permissions, risk categories (`LOW`, `MEDIUM`, `HIGH`), and holds consequential actions at the Human Approval Gate. |
| **Reporting Engine** | `src/server/ai/reportingEngine.ts` | Converts complex AI outputs into structured `ResearchReportEntity` records stored in the database for client rendering. |
| **Memory Engine** | `src/server/ai/memoryEngine.ts` | Manages categorized persistent workspace memory (`APPROVED_BUSINESS_FACT`, `CONVERSATION`, `DECISION`, `EXECUTION`, `LEARNED_PREFERENCE`) with deduplication and semantic search. |

---

## 4. 15-Step Execution Lifecycle

1. **Receive Request:** Authenticated POST to `/api/v1/workspaces/:workspaceId/ai/requests`.
2. **Authorization:** Verify Bearer token, workspace membership, and department permissions.
3. **Request Classification:** Deterministic rule-based workflow classification via `WorkflowRegistry`.
4. **Context Retrieval:** Extract tailored context package via `ContextEngine`.
5. **Memory Retrieval:** Retrieve relevant memories matching task keywords via `MemoryEngine`.
6. **Tool Selection:** Select registered tools; execute external evidence gathering via `ResearchEngine`.
7. **Model Selection:** Route to optimal model via `ModelRouter` based on complexity.
8. **Prompt Construction:** Assemble versioned system instructions, context, and schema via `PromptRegistry`.
9. **Model Execution:** Execute via `GeminiProviderAdapter` with circuit breaker and bounded timeouts.
10. **Output Validation:** Multi-layer validation via `ValidationEngine`.
11. **Truth Verification:** Classify individual claims into `VERIFIED_FACT`, `BUSINESS_FACT`, `AI_ANALYSIS`, `ESTIMATE`, `ASSUMPTION`, `RECOMMENDATION`.
12. **Human Approval Gate:** If action is classified as `HIGH` risk, pause at `PENDING_APPROVAL` status.
13. **Result Persistence:** Save execution metadata, structured result, and source citations in Firestore.
14. **Credit Accounting:** Atomically commit reservation or auto-refund on upstream/validation errors.
15. **User Response:** Return structured `StructuredAiOutput` payload to client.
