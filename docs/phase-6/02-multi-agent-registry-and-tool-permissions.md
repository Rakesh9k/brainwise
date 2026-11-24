# BrainWise Phase 6: Multi-Agent Registry & Tool Permission Matrix

## 1. Multi-Agent Ecosystem Overview

BrainWise eliminates monolithic, all-powerful AI agents. Monolithic agents with unrestricted tool access pose unacceptable risks: they can execute unwanted financial transactions, hallucinate external publications, or leak multi-tenant workspace data.

BrainWise implements a **Strict Least-Privilege Multi-Agent Architecture** managed by `agentRegistry.ts` and enforced by `toolPermissionService.ts`.

---

## 2. Specialized Agent Personas

| Agent Type | Standard Department | Mission & Responsibilities | Allowed Risk Levels | Execution Timeout | Max Retries |
|---|---|---|---|---|---|
| **`STRATEGY_AGENT`** | `STRATEGY` | Formulates high-level positioning, goal deconstruction, KPI targets, and strategic alignment against the Business Brain. | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL` | 30,000 ms | 3 |
| **`RESEARCH_AGENT`** | `RESEARCH` | Performs market analysis, competitor reconnaissance, search grounding, customer persona discovery, and trend evaluation. | `LEVEL_1_READ_ONLY` | 45,000 ms | 3 |
| **`IDEA_AGENT`** | `STRATEGY` | Generates campaign angles, content hooks, value propositions, and anti-fatigued marketing concepts. | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL` | 30,000 ms | 3 |
| **`CREATIVE_AGENT`** | `MARKETING` | Authors static visual layouts, SVG collateral (stationery, flyers, business cards, posters), multi-frame carousels, and design tokens. **Strict Video Exclusion permanently active.** | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL` | 45,000 ms | 3 |
| **`CAMPAIGN_AGENT`** | `MARKETING` | Assembles multi-channel copywriting packs, schedules publishing queues, calculates budgets, and sets up audience targeting. | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL` | 30,000 ms | 3 |
| **`OPERATIONS_AGENT`** | `CUSTOMER_SUCCESS` | Handles operational workflows, task assignment, inventory alerts, internal notifications, and CRM status synchronization. | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL` | 30,000 ms | 3 |
| **`PUBLISHING_AGENT`** | `MARKETING` | Coordinates live ad publishing, social distribution, external messaging, and budget commitments. **Restricted to Level 3 Gated execution.** | `LEVEL_1_READ_ONLY`, `LEVEL_2_REVERSIBLE_INTERNAL`, `LEVEL_3_EXTERNAL_CONSEQUENTIAL` | 60,000 ms | 2 |

---

## 3. Tool Classification & Risk Levels

All tools registered in `agentRegistry.ts` are categorized into three unambiguous risk tiers:

### Level 1: Read-Only (`LEVEL_1_READ_ONLY`)
- **Impact:** Gathers data from the Business Brain, public web, or internal workspace records. No persistent state is mutated. Zero external consequence.
- **Autonomy:** Fully autonomous. No human approval required.
- **Examples:**
  - `brain_fetch_facts`: Query verified Business Brain records.
  - `web_search_grounding`: Execute search queries for industry benchmarks.
  - `competitor_analysis_tool`: Retrieve competitor pricing and positioning.
  - `audit_log_query`: Read workspace operational records.

### Level 2: Reversible Internal (`LEVEL_2_REVERSIBLE_INTERNAL`)
- **Impact:** Modifies internal workspace state within Firestore (creates draft campaigns, generates SVG artwork, saves proposed marketing angles). Does not alter external accounts or spend monetary funds.
- **Autonomy:** Autonomous execution with rollback capability. Drafts are held in internal workspace storage.
- **Examples:**
  - `svg_collateral_generator`: Render static SVG vector collateral and carousels.
  - `copywriting_pack_builder`: Generate multi-channel text packs grounded in the Business Brain.
  - `strategic_angle_recorder`: Record campaign angle in memory to prevent fatigue.
  - `internal_task_scheduler`: Create and organize internal project tasks.

### Level 3: External Consequential (`LEVEL_3_EXTERNAL_CONSEQUENTIAL`)
- **Impact:** Produces irreversible real-world effects: activates live ad campaigns, commits ad budgets, publishes social posts to external platforms, modifies public product prices, or sends mass emails.
- **Autonomy:** **STRICTLY BLOCKED FROM DIRECT AUTONOMOUS EXECUTION.** Requires mandatory human approval gate.
- **Examples:**
  - `meta_ad_campaign_publisher`: Publish paid campaigns to Meta Ads API.
  - `social_broadcast_tool`: Publish public posts to connected brand social channels.
  - `budget_spend_commit`: Authorize monetary spend from commercial accounts.
  - `public_pricing_update`: Modify published product catalog prices.

---

## 4. Least-Privilege Agent-to-Tool Matrix

The following matrix documents the exact permissions enforced by `toolPermissionService.isToolPermittedForAgent()`:

| Tool Name | Risk Level | Permitted Agents | Unauthorized Agents |
|---|---|---|---|
| `brain_fetch_facts` | Level 1 | All 7 Agents | None |
| `web_search_grounding` | Level 1 | `STRATEGY_AGENT`, `RESEARCH_AGENT`, `IDEA_AGENT` | `CREATIVE_AGENT`, `CAMPAIGN_AGENT`, `OPERATIONS_AGENT`, `PUBLISHING_AGENT` |
| `competitor_analysis_tool`| Level 1 | `STRATEGY_AGENT`, `RESEARCH_AGENT` | `CREATIVE_AGENT`, `OPERATIONS_AGENT`, `PUBLISHING_AGENT` |
| `svg_collateral_generator`| Level 2 | `CREATIVE_AGENT` | All others |
| `copywriting_pack_builder`| Level 2 | `CREATIVE_AGENT`, `CAMPAIGN_AGENT` | `RESEARCH_AGENT`, `OPERATIONS_AGENT` |
| `strategic_angle_recorder`| Level 2 | `STRATEGY_AGENT`, `IDEA_AGENT` | `RESEARCH_AGENT`, `CREATIVE_AGENT`, `OPERATIONS_AGENT` |
| `internal_task_scheduler` | Level 2 | `OPERATIONS_AGENT`, `STRATEGY_AGENT` | `CREATIVE_AGENT`, `RESEARCH_AGENT` |
| `meta_ad_campaign_publisher`| Level 3 | `PUBLISHING_AGENT` *(Requires Approval)* | All others |
| `budget_spend_commit` | Level 3 | `PUBLISHING_AGENT` *(Requires Approval)* | All others |
| `social_broadcast_tool` | Level 3 | `PUBLISHING_AGENT` *(Requires Approval)* | All others |
| `public_pricing_update` | Level 3 | `PUBLISHING_AGENT` *(Requires Approval)* | All others |

---

## 5. Enforcement Architecture

Any execution attempt where an agent invokes a tool outside its allowed whitelist triggers an immediate refusal:
```typescript
if (!permittedTools.includes(toolName)) {
  return {
    authorized: false,
    reason: `Agent '${agentType}' is not authorized to execute tool '${toolName}'. Least-privilege policy violation.`
  };
}
```
An immutable record is immediately written to `agentAuditLogRepository` logging the unauthorized attempt, the calling agent, the workspace ID, and the timestamp.
