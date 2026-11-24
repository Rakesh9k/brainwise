# BRAINWISE BUSINESS BRAIN — PHASE 2
## Deliverable 2.3: Hybrid Knowledge Retrieval Engine

---

### 1. Mission & Retrieval Challenges

Traditional vector-only RAG systems frequently fail in high-stakes enterprise applications:
- **Price Hallucination:** A vector search for "nitro cold brew keg pricing" may surface an unverified document proposing \$120 alongside a verified product priced at \$165, leading to incorrect generation.
- **Lack of Relationship Awareness:** Semantic similarity does not convey whether a campaign targets *Specialty Cafes* or *Casual Dining Chains*.
- **Token Overflow:** Dumping entire catalogs or large PDFs into context windows exhausts prompt budgets and induces "needle in a haystack" attention degradation.

BrainWise solves this via a **Deterministic 6-Channel Hybrid Knowledge Retrieval Engine** implemented in `src/server/services/hybridRetrievalService.ts`.

```mermaid
graph TD
    QUERY[Department Query + Task Type] --> C1[1. Structured DB Facts]
    QUERY --> C2[2. Lexical / Keyword Tokenizer]
    QUERY --> C3[3. Semantic Relevance]
    QUERY --> C4[4. Document Chunk Search]
    QUERY --> C5[5. Graph Traversal Expansion]
    QUERY --> C6[6. Freshness Decay Algorithm]

    C1 --> SCORER[Hybrid Scoring Engine]
    C2 --> SCORER
    C3 --> SCORER
    C4 --> SCORER
    C5 --> SCORER
    C6 --> SCORER

    SCORER --> PROV[Provenance Filter: VERIFIED > INFERRED]
    PROV --> BUDGET[Token Budget Clamper]
    BUDGET --> RESULTS[RetrievedKnowledgeItem[] + Citations]
```

---

### 2. The Six Retrieval Channels

#### Channel 1: Structured Entity Retrieval
Directly inspects typed Firestore collections for verified entity matches:
- Active products and services from `productRepository`.
- Active brand guidelines from `brandIdentityRepository`.
- Business profile facts (financial constraints, capacity limits) from `businessProfileRepository`.

#### Channel 2: Lexical Tokenization & BM25 Overlap
Breaks queries into normalized alphanumeric tokens:
- Strips punctuation and stop words (`a`, `the`, `and`, `is`, `for`, `of`, `with`).
- Calculates lexical term frequency and overlap against entity titles, descriptions, and feature lists.

#### Channel 3: Semantic Affinity & Scoring
Computes semantic alignment between query intent and knowledge candidate types:
- Questions about pricing or discounts prioritize `product` and `document` ratecard types.
- Questions about voice or messaging prioritize `brand_guideline` types.

#### Channel 4: Document Chunk Retrieval
Queries ingested documents in `workspaces/{workspaceId}/documents`:
- Inspects `extractedSummary`, OCR text snippets, and document chunks.
- Extracts targeted excerpts with document file name, page/section references, and confidence scores.

#### Channel 5: Relationship-Based Graph Traversal
Expands top candidates by traversing outgoing and incoming graph edges:
- If a product is retrieved, 1-hop and 2-hop edges append connected campaigns, target personas, and strategic decisions into the context envelope.

#### Channel 6: Time-Aware Freshness Decay
Evaluates the elapsed age of information:
$$\text{ageDays} = \frac{\text{currentTime} - \text{itemTimestamp}}{86,400,000}$$
$$\text{freshnessScore} = \max\left(0.2, 1.0 - \frac{\text{ageDays}}{90} \times 0.8\right)$$
Information updated within the last 30 days retains high freshness ($\ge 0.73$), while records older than 90 days smoothly decay to 0.2, favoring fresh updates while preserving evergreen knowledge.

---

### 3. The Hybrid Scoring Formula

Every knowledge candidate is evaluated using a composite weighted score:

$$\text{CombinedScore} = (0.5 \times \text{LexicalRelevance}) + (0.3 \times \text{TaskAffinity}) + (0.2 \times \text{FreshnessScore})$$

Where:
- $\text{LexicalRelevance} = \frac{|\text{QueryTokens} \cap \text{DocumentTokens}|}{|\text{QueryTokens}|}$
- $\text{TaskAffinity}$ is derived from the Task Affinity Matrix below ($0.2 - 1.0$).
- $\text{FreshnessScore}$ represents time-decayed validity ($0.2 - 1.0$).

---

### 4. Task Affinity Matrix (14 Departments)

The retrieval engine adjusts entity priorities according to the calling department's operational mission:

| Department / Task Type | Highest Affinity Entities ($\text{Score} = 1.0$) | Secondary Affinity ($\text{Score} = 0.7$) | Baseline ($\text{Score} = 0.3$) |
| :--- | :--- | :--- | :--- |
| **MARKETING / BRANDING** | `brand_guideline`, `product`, `customer_persona` | `campaign`, `document` | `performance_result` |
| **FINANCIAL** | `product` (prices/costs), `document` (invoices) | `service`, `goal` | `brand_guideline` |
| **STRATEGY / GROWTH** | `goal`, `decision`, `competitor`, `customer_segment` | `product`, `performance_result`| `document` |
| **CONTENT / SOCIAL** | `brand_guideline`, `product`, `decision` | `customer_persona` | `goal` |
| **OPERATIONS** | `product` (capacity/SKU), `document` | `goal` | `competitor` |

---

### 5. Provenance Precedence & Truth Check Guardrails

#### 5.1 The Three Information States
To guarantee zero hallucinations:
1. `VERIFIED`: Confirmed by user input or verified document extraction (Confidence: $1.0$).
2. `INFERRED`: Derived by AI synthesis from web signals or industry benchmarks (Confidence: $0.70 - 0.85$).
3. `UNKNOWN`: Not documented in the Business Brain. The AI is forbidden from guessing and must flag missing data.

#### 5.2 Conflict Resolution Protocol
When an active search query matches both an unverified candidate and a `USER_CONFIRMED` fact:
- The `filters: { verificationStatus: 'VERIFIED' }` pipeline filters unconfirmed guesses.
- If a product price is updated from \$155 to \$165 in Business Memory, the hybrid retrieval engine immediately surfaces the \$165 record, while historical documents proposing \$155 are labeled with historical timestamps and lower relevance.

---

### 6. Token Budget Clamping & Deduping Algorithm

To prevent context exhaustion in downstream Gemini LLM invocations:
1. Scored candidates are sorted descending by `combinedScore`.
2. Candidates with duplicate titles are suppressed via `seenTitles: Set<string>`.
3. Candidate token count is estimated via standard heuristic:
   $$\text{tokens} = \left\lceil \frac{\text{content.length}}{4} \right\rceil$$
4. An accumulator `currentTokens` tracks cumulative size.
5. If adding the next candidate would exceed `tokenBudget` (default: 4000 tokens, configurable to 150 tokens), candidate inclusion stops immediately, guaranteeing compliance with prompt budgets.

---

### 7. Retrieved Knowledge Item Interface

```typescript
export interface RetrievedKnowledgeItem {
  id: string;                                   // Entity ID
  type: string;                                 // Node type
  title: string;                                // Display title
  content: string;                              // Dense contextual text
  relevanceScore: number;                       // Lexical score (0.0 - 1.0)
  combinedScore: number;                        // Composite score (0.0 - 1.0)
  freshnessScore: number;                       // Freshness factor (0.2 - 1.0)
  sourceCitation: KnowledgeSourceCitation;      // Verifiable source link
  verificationStatus: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
  relationships?: Array<{                       // 1-hop graph expansions
    relation: GraphRelationshipType;
    targetName: string;
    targetType: GraphNodeType;
  }>;
}
```
