# BRAINWISE — TEST BASELINE EXECUTION REPORT
**Test Runner:** `tsx --test --test-concurrency=1 src/**/*.test.ts`  
**Execution Timestamp:** 2026-11-23T09:04:12+05:30  
**Node Version:** v22.14.0  
**Overall Result:** **FAILED (Exit Code 1)**

---

## 1. High-Level Summary Statistics

- **Total Test Files Discovered:** 89 test files
- **Total Individual Scenarios Executed:** **854**
- **Passed Scenarios:** **834 (97.66%)**
- **Failed Scenarios:** **20 (2.34%)**
- **Skipped / Cancelled:** 0

---

## 2. Detailed Breakdown of Failing Test Suites

Only 3 test files experienced failures out of the 89 test files in the codebase. All other 86 test suites passed 100%.

### Suite 1: `src/server/phase1BusinessBrain.test.ts` (9 Failures)
All 9 failures in this suite are caused by **missing route endpoints** or **route name discrepancies**:

1. **Scenario 3: Restaurant menu upload & automated extraction**
   - *Failure:* `AssertionError [ERR_ASSERTION]: Expected 200, received 404`
   - *Target URL:* `POST /api/v1/workspaces/:id/business-profile/extract-document`
2. **Scenario 4: Salon service catalogue upload & extraction**
   - *Failure:* `Expected 200, received 404` on extraction
3. **Scenario 5: Product catalogue bulk import with duplicate detection**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `POST /api/v1/workspaces/:id/business-profile/products/import` (backend implemented `/products/bulk` instead of `/products/import`)
4. **Scenario 6: SSRF protection gate blocks private network addresses**
   - *Failure:* `Expected 400/403, received 404`
   - *Target URL:* `POST /api/v1/workspaces/:id/business-profile/extract-url` (missing endpoint)
5. **Scenario 7: Duplicate product detection flags matching SKU/Name without duplicate records**
   - *Failure:* `Expected 200, received 404` on `/products/import`
6. **Scenario 8: Verification queue approval, editing, and rejection**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `GET /api/v1/workspaces/:id/business-profile/verification-queue` (missing endpoint)
7. **Scenario 9: Gap analysis identifies missing domain data and produces questions**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `GET /api/v1/workspaces/:id/business-profile/missing-info` (missing endpoint)
8. **Scenario 12: Handles document reprocessing gracefully**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `POST /api/v1/workspaces/:id/business-profile/documents/:docId/reprocess` (missing endpoint)
9. **Scenario 13: Re-authenticating retrieves verified facts, brand intelligence and constraints**
   - *Failure:* Cascading failure due to earlier un-persisted test data

---

### Suite 2: `src/server/phase2UnifiedIntelligence.test.ts` (8 Failures)
All 8 failures in this suite are caused by missing **Knowledge Graph Edge** and **Working Memory** sub-routes:

1. **Scenario 1: Product-to-customer relationships are created, validated and retrieved**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `POST /api/v1/workspaces/:id/business-profile/graph/edges` (missing endpoint)
2. **Scenario 2: Campaign-to-product relationships link marketing initiatives to catalog items**
   - *Failure:* Cascading failure from missing graph edges endpoint
3. **Scenario 3: Assembled context accurately retrieves brand voice, vocabulary, and restrictions**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `GET /api/v1/workspaces/:id/business-profile/context?taskType=MARKETING` (missing endpoint)
4. **Scenario 4: Retrieval of historical decisions, campaign outcomes and learnings**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `GET /api/v1/workspaces/:id/business-profile/memory/episodic` (missing endpoint)
5. **Scenario 5: Fact correction updates active memory and eliminates stale records**
   - *Failure:* Memory store assertion mismatch
6. **Scenario 6: Working and episodic memory persist across discrete HTTP sessions**
   - *Failure:* `Expected 200, received 404`
   - *Target URL:* `GET /api/v1/workspaces/:id/business-profile/memory/working?sessionId=...` (missing endpoint)
7. **Scenario 7: Working memory expires according to TTL while business memory stays permanent**
   - *Failure:* `Expected 200, received 404` on working memory route
8. **Scenario 12: USER_CONFIRMED facts take absolute precedence over unconfirmed guesses**
   - *Failure:* Test setup dependency on missing `/products/import` route

---

### Suite 3: `src/server/phase3ReasoningIntelligence.test.ts` (3 Failures)
1. **Scenario 1: Business health assessment evaluates all 8 dimensions with complete data**
   - *Failure:* `assert.ok(body.data.overallScore >= 70)` evaluated to false (computed score was lower than threshold due to missing prerequisite product graph data)
2. **Scenario 3: Contradiction detection flags prohibited brand words or conflicting claims**
   - *Failure:* `assert.ok(body.data.contradictionsDetected.length > 0)` evaluated to false due to empty comparison set
3. **Scenario 4: SWOT findings cite verified business evidence or are explicitly tagged as assumptions**
   - *Failure:* Evidence citation linkage assertion failure

---

## 3. Passing Highlights (834 Scenarios Passed)

The following core modules and subsystems passed all regression and integration checks:
- **Billing & Two-Phase Credit Protocol:** Atomic reservation, feature debit, auto-refund on failure (`credits.test.ts`, `phase10.test.ts`).
- **Database Engine & Transaction Isolation:** Full CRUD, compound querying, rollback on transaction throw (`database.test.ts`).
- **Asset Library Hardening & Strict Video Exclusion:** Magic byte detection, SVG XXE sanitization, zero video file acceptance (`assetLibraryProductionHardening.test.ts`).
- **Analytics & Statistics Engines:** Metric calculator, regression forecasting, cohort retention, and executive reporting (`statisticalAndCrossDept.test.ts`, `predictiveAndRootCause.test.ts`, `metricRegistry.test.ts`).
- **Competitive Intelligence & Battlecards:** Competitor discovery, positioning mapping, and sales battlecards (`competitiveIntelligence.e2e.test.ts`).
- **Continuous Business Learning:** Feedback loop, evidence weighting, and anti-fatigue angle tracking (`continuousBusinessLearning.test.ts`).
