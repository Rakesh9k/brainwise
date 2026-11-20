# BRAINWISE — PHASE 8: DEPARTMENT EXTERNAL CONNECTIVITY SPECIFICATION
**Document ID:** `docs/phase-8/07-department-connectivity.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Status:** Approved & Implemented in Production  

---

## 1. Overview & Objective

Phase 8 breaks down data silos between third-party marketing/analytics platforms and BrainWise's 7 core business departments.

Through the shared department framework (`src/server/departments/framework.ts`) and the `getDepartmentExternalContext()` API, each department dynamically queries verified external data streams from authorized connected providers. This ensures that AI strategic recommendations, validation dossiers, and executive scorecards are grounded in real enterprise telemetry rather than isolated client mocks.

---

## 2. Department-to-Provider Mapping Matrix

| Department ID | Department Name | Authorized Connected Providers | Ingested Signals & Strategic Impact |
|---------------|-----------------|--------------------------------|-------------------------------------|
| `BUSINESS_BRAIN` | Business Brain | `google-drive`, `google-research` | Syncs company strategy documents, verifies official pitch decks, grounds persistent business profile in external filings. |
| `IDEA_INTELLIGENCE` | Idea Intelligence | `google-research`, `google-search-console` | Validates TAM/SAM/SOM sizing with verified search query volume; tests problem hypotheses against real organic impressions. |
| `COMPETITIVE_INTELLIGENCE` | Competitive Intelligence | `google-research`, `google-business-profile` | Detects competitor digital footprint changes, scans public pricing tables, compares local review sentiment ratings. |
| `MARKET_WATCH` | Market Watch | `google-research`, `google-analytics-4`, `google-search-console` | Monitors macro industry trends, detects unexpected traffic drops/spikes, alerts on emerging organic keyword shifts. |
| `BRAND_STUDIO` | Brand Studio | `meta-instagram`, `linkedin-marketing`, `google-drive` | Audits social media audience demographics, measures static carousel reach, auto-exports approved vector SVG assets to Drive. |
| `GROWTH_PLANNER` | Growth Planner | `google-analytics-4`, `google-search-console`, `email-service` | Converts low-CTR high-impression keywords into actionable SEO experiments; measures conversion impact from growth sprints. |
| `ANALYTICS_REPORTS` | Analytics & Reports | `google-analytics-4`, `google-search-console`, `google-business-profile`, `youtube-data`, `email-service` | Consolidates multi-channel telemetry into weekly/monthly executive scorecards; dispatches approved briefings to board members. |

---

## 3. Department External Context Connector (`getDepartmentExternalContext`)

### 3.1 Connector Signature
```typescript
public async getDepartmentExternalContext(
  workspaceId: string,
  departmentId: DepartmentId
): Promise<{
  departmentId: DepartmentId;
  authorizedProviders: string[];
  records: NormalizedDataRecord[];
  unifiedSummary: {
    verifiedSourcesCount: number;
    primarySignals: string[];
    hasAnomalies: boolean;
    dataProvenanceLevel: 'VERIFIED_EXTERNAL' | 'INTERNAL_ONLY';
  };
}>
```

### 3.2 Context Synthesis Lifecycle
1. **Authorization Check:** Filters the workspace's active connections against the department's authorized provider list.
2. **Telemetry Ingestion:** Retrieves the most recent normalized records from `workspaces/{workspaceId}/imported_data`.
3. **Signal Compilation:** Synthesizes actionable signals (e.g., "GA4 Real-Time User Sessions & PoP Delta Available", "GSC Organic Impressions Ingested").
4. **Provenance Stamping:** Sets `dataProvenanceLevel` to `'VERIFIED_EXTERNAL'` when authenticated data is present, guaranteeing fact grounding under the Deterministic Truth Engine (`truthCheck.ts`).
5. **AI Prompt Injection:** The synthesized signals and metric summaries are injected directly into Gemini 2.5 Flash / Pro system prompts during workflow execution.
