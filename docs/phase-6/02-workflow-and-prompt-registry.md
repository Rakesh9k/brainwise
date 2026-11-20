# BrainWise Phase 6: Department Workflow & Prompt Registry

## 1. Registered Department Workflows

All workflows use the central orchestration system. Each workflow specifies its complexity tier, credit deduction, required tools, and risk category.

| Department | Workflow ID | Complexity | Credits | Required Tools | Risk Level | Human Approval |
|---|---|---|---|---|---|---|
| `MARKET_INTELLIGENCE` | `market_overview` | `RESEARCH_HEAVY` | 8 | `web_research`, `financial_calculator` | `LOW` | No |
| `MARKET_INTELLIGENCE` | `market_sizing` | `STANDARD` | 5 | `financial_calculator`, `business_brain_lookup` | `LOW` | No |
| `COMPETITOR_INTELLIGENCE` | `competitor_discovery` | `RESEARCH_HEAVY` | 8 | `web_research`, `competitor_lookup` | `LOW` | No |
| `COMPETITOR_INTELLIGENCE` | `pricing_analysis` | `STANDARD` | 5 | `competitor_lookup`, `business_brain_lookup` | `LOW` | No |
| `BUSINESS_STRATEGY` | `growth_plan` | `COMPLEX` | 10 | `business_brain_lookup` | `LOW` | No |
| `BUSINESS_STRATEGY` | `business_diagnosis` | `STANDARD` | 5 | `business_brain_lookup` | `LOW` | No |
| `BUSINESS_STRATEGY` | `create_sprint_task` | `SIMPLE` | 1 | `task_creator` | `HIGH` | **Yes (Gate)** |
| `CUSTOMER_INTELLIGENCE` | `customer_segmentation` | `STANDARD` | 5 | `business_brain_lookup` | `LOW` | No |
| `MARKETING_INTELLIGENCE` | `channel_strategy` | `STANDARD` | 5 | `business_brain_lookup` | `LOW` | No |
| `PERFORMANCE_INTELLIGENCE` | `kpi_analysis` | `SIMPLE` | 3 | `business_brain_lookup` | `LOW` | No |

---

## 2. Centralized Prompt Registry

Prompts are versioned and stored in `src/server/ai/promptRegistry.ts`. Large prompt strings are never scattered across frontend views or backend controllers.

### Standard Prompt Keys
- `market_intelligence.market_overview.v1`
- `competitor_intelligence.competitor_discovery.v1`
- `business_strategy.growth_plan.v1`
- `customer_intelligence.customer_segmentation.v1`
- `marketing_intelligence.channel_strategy.v1`
- `performance_intelligence.kpi_analysis.v1`

### Prompt Injection and System Directive Safeguards
Every prompt is constructed with clear separation:
1. System Directive (developer instructions, safety rules, commercial restrictions).
2. Ground Truth Context (verified Business Brain facts).
3. External Evidence (sanitized, untrusted web research snippets).
4. Task Request (sanitized user prompt).
5. Structured JSON Output Schema.

---

## 3. Tool Registry & Risk Classification

| Tool Name | Risk Category | Requires Human Approval | Description |
|---|---|---|---|
| `web_research` | `LOW` | No | Queries external market data with source attribution. |
| `business_brain_lookup` | `LOW` | No | Retrieves authoritative confirmed Business Brain fields. |
| `competitor_lookup` | `LOW` | No | Retrieves monitored competitors and positioning benchmarks. |
| `financial_calculator` | `LOW` | No | Calculates bounded TAM/SAM/SOM and margin formulas. |
| `task_creator` | `HIGH` | **Yes** | Enqueues a permanent task in Growth Director; requires user confirmation. |
