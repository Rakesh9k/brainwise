# BRAINWISE — EXISTING SERVICE INVENTORY & CLASSIFICATION
**Document:** `docs/phase-3/EXISTING_SERVICE_INVENTORY.md`  
**Date:** November 27, 2026  
**Auditor:** Principal AI Architect & Staff Software Engineer  
**Status:** 100% EXHAUSTIVE DISCOVERY (72 Services Cataloged)

---

## 1. Classification Methodology

Every backend service in `src/server/services/` has been analyzed, parsed, and categorized into one of five functional classifications:

1. **Genuine AI Reasoning / Hybrid (8 services):** Directly invokes Google GenAI SDK (`@google/genai`) or `modelRouter.ts` with structured schemas and prompts.
2. **AI-Assisted Deterministic Processing (2 services):** Coordinates with AI orchestration services while enforcing strict deterministic data processing.
3. **Deterministic Business Logic (34 services):** Pure business logic, state machines, financial accounting, cryptographic auth, or data transformers with zero AI involvement.
4. **Static Templates or Simulated AI (28 services):** Procedural string generators, hardcoded regex trees, or static JSON templates posing as intelligence.
5. **External API Integrations (Subsystem):** Third-party data adapters (Cashfree, Meta, Google Search Console, GCS).

---

## 2. Complete Catalog of 72 Backend Services

| Service File Name | Lines | Key Classes & Exports | Dependencies | Classification | AI Details / Functionality |
|---|---|---|---|---|---|
| `agentRegistry.ts` | 345 | `AgentRegistry` | None | 3. Deterministic | Roster of internal agent definitions and metadata. |
| `aiOrchestrationService.ts` | 609 | `AiOrchestrationService` | `creditService`, `truthCheck`, `researchRepository` | 1. Genuine AI / Hybrid | Calls Gemini 2.5 Flash/Pro for TAM/SAM/SOM dossiers, SVG brand badges, and Business Brain synthesis. |
| `approvalWorkflowService.ts` | 158 | `ApprovalWorkflowService` | None | 3. Deterministic | State machine for human approval gates on consequential actions. |
| `askYourBusinessRetrievalService.ts` | 684 | `AskYourBusinessRetrievalService` | None | 3. Deterministic | In-memory tokenization and lexical retrieval for Ask Your Business queries. |
| `askYourBusinessService.ts` | 684 | `AskYourBusinessService` | `modelRouter`, `creditService`, `truthCheck` | 1. Genuine AI / Hybrid | Multi-turn founder chat assistant calling Gemini 2.5 Flash / Pro with TruthCheck grounding. |
| `assetEcosystemGatewayService.ts` | 948 | `AssetEcosystemGatewayService` | `brandAssetRepository`, `eventBus` | 3. Deterministic | Coordinates asset movement between Brain, Studio, and Campaigns. |
| `assetIntelligenceExtensionsService.ts` | 978 | `AssetIntelligenceExtensionsService` | `brandAssetRepository` | 3. Deterministic | Semantic tagging, duplicate detection, and visual compliance checks. |
| `assetProductionHardeningService.ts` | 468 | `AssetProductionHardeningService` | `brandAssetRepository` | 3. Deterministic | Magic byte inspection, SHA-256 deduplication, and corruption quarantine. |
| `auditService.ts` | 42 | `AuditService` | `auditRepository` | 3. Deterministic | Immutable audit logging for tenant actions and security events. |
| `authService.ts` | 450 | `AuthService` | `userRepository`, `workspaceRepository` | 3. Deterministic | Password hashing, session tokens, email verification, DPDPA erasure. |
| `backgroundJobService.ts` | 145 | `BackgroundJobService` | `aiOrchestrationService` | 2. AI-Assisted Deterministic | Cloud Task queue management and asynchronous job dispatch. |
| `brandGuardianService.ts` | 1084 | `BrandGuardianService` | `brandIdentityRepository`, `truthCheck` | 4. Static Templates / Heuristics | Brand compliance rules, WCAG contrast checking, auto-remediation rules. |
| `brandGuidelinesEngine.ts` | 1215 | `BrandGuidelinesEngine` | `brandIdentityRepository` | 4. Static Templates / Heuristics | 1,215 lines of procedural design tokens, typography scales, and color ladders. |
| `brandIntelligenceEngine.ts` | 2234 | `BrandIntelligenceEngine` | `sharedBusinessContextService` | 4. Static Templates / Heuristics | 2,234 lines of procedural strings. Uses 3 regex checks to select hardcoded "Visual Trends". |
| `brandLaunchService.ts` | 985 | `BrandLaunchService` | `brandAssetRepository`, `creditService` | 4. Static Templates / Heuristics | Procedural launch kit bundler (Hero banners, social covers, stationery). |
| `brandStudioService.ts` | 950 | `BrandStudioService` | `brandStudioRepository` | 4. Static Templates / Heuristics | Workflow coordinator for logo design, guidelines, and collateral exports. |
| `businessAnalysisService.ts` | 580 | `BusinessAnalysisService` | `businessProfileRepository` | 4. Static Templates / Heuristics | Funnel bottleneck heuristics and health check metric calculations. |
| `businessBrainService.ts` | 890 | `BusinessBrainService` | `aiOrchestrationService`, `businessProfileRepository` | 2. AI-Assisted Deterministic | Manages verified facts, product catalogues, customer personas, and candidate queue. |
| `businessContextEngine.ts` | 412 | `BusinessContextEngine` | `@google/genai` | 1. Genuine AI / Hybrid | Context window assembly and token truncation for Gemini prompts. |
| `businessIntelligenceScoreService.ts` | 148 | `BusinessIntelligenceScoreService` | `businessProfileRepository` | 3. Deterministic | Mathematical 0-100 score based on Business Brain completeness. |
| `businessWatchService.ts` | 380 | `BusinessWatchService` | `marketWatchRepository` | 4. Static Templates / Heuristics | Periodic anomaly scans and market alert generator. |
| `centralOrchestrationService.ts` | 740 | `CentralOrchestrationService` | `agentRegistry`, `eventBus` | 3. Deterministic | Central dispatcher for department tasks and event cascades. |
| `competitiveAdvisorService.ts` | 240 | `CompetitiveAdvisorService` | `competitiveIntelligenceService` | 4. Static Templates / Heuristics | Procedural competitor counter-strategy recommendations. |
| `competitiveEvidenceService.ts` | 140 | `CompetitiveEvidenceService` | `evidenceLakeRepository` | 3. Deterministic | Competitor pricing and positioning evidence retriever. |
| `competitiveIntelligenceService.ts` | 767 | `CompetitiveIntelligenceService` | `competitorRepository` | 4. Static Templates / Heuristics | Computes competitor matrices, price bands, and gap teardowns deterministically. |
| `competitiveReportEngine.ts` | 410 | `CompetitiveReportEngine` | `competitorRepository` | 4. Static Templates / Heuristics | HTML/PDF export generator for competitor teardowns. |
| `competitiveStrategyEngine.ts` | 512 | `CompetitiveStrategyEngine` | `competitorRepository` | 4. Static Templates / Heuristics | Procedural contrast wedge formulation against named competitors. |
| `competitorDiscoveryEngine.ts` | 853 | `CompetitorDiscoveryEngine` | `@google/genai` | 1. Genuine AI / Hybrid | Calls Gemini 2.5 Flash for competitors; fallback contains naive substring bug (`repair` -> Zoho). |
| `competitorTrackingService.ts` | 260 | `CompetitorTrackingService` | `competitorRepository` | 3. Deterministic | Historical competitor price tracking and snapshot comparisons. |
| `contradictionService.ts` | 195 | `ContradictionService` | `businessProfileRepository` | 3. Deterministic | Detects contradictory pricing or claims between documents and confirmed facts. |
| `conversationalAssetAssistantService.ts` | 840 | `ConversationalAssetAssistantService` | `brandAssetRepository` | 3. Deterministic | Natural language command router for asset searches, tags, and archives. |
| `creativeAssetsEngine.ts` | 2576 | `CreativeAssetsEngine` | `brandAssetRepository` | 4. Procedural Layout | 2,576 lines of pure deterministic SVG layout generators and modular scales. |
| `creditService.ts` | 175 | `CreditService` | `creditWalletRepository`, `transactionRepository` | 3. Deterministic | ADR-006 Two-Phase Credit Reservation Protocol (inviolable financial core). |
| `customerVoiceService.ts` | 330 | `CustomerVoiceService` | `businessProfileRepository` | 4. Static Templates / Heuristics | Procedural customer persona insights and objection clustering. |
| `departmentCoordinationService.ts` | 575 | `DepartmentCoordinationService` | `departmentTaskRepository`, `eventBus` | 3. Deterministic | Cross-department task coordination, idempotency keys, and cascade alerts. |
| `departmentPermissionService.ts` | 120 | `DepartmentPermissionService` | None | 3. Deterministic | RBAC matrix governing department actions by workspace role. |
| `documentExtractionService.ts` | 1251 | `DocumentExtractionService` | `@google/genai`, `documentRepository` | 1. Genuine AI / Hybrid | Multimodal Gemini 2.5 Flash parser extracting structured products, pricing, and identity. |
| `enterpriseArchivalService.ts` | 650 | `EnterpriseArchivalService` | `archivalRepository` | 3. Deterministic | Lifecycle archival, restore, and permanent purge state machine. |
| `evidenceEngineService.ts` | 210 | `EvidenceEngineService` | `evidenceLakeRepository` | 3. Deterministic | Evidence Lake query API, source authority weighting, and freshness tracking. |
| `financialAndTrendsEngine.ts` | 290 | `FinancialAndTrendsEngine` | None | 3. Deterministic | Mathematical CAC, LTV, gross margin, and cash payback calculations. |
| `financialIntelligenceService.ts` | 321 | `FinancialIntelligenceService` | None | 3. Deterministic | Unit economics modeler, runway projections, and financial health scores. |
| `growthDirectorService.ts` | 574 | `GrowthDirectorService` | `growthDepartmentEngines`, `creditService` | 4. Static Templates / Heuristics | Orchestrates growth agency missions; delegates to static template engines. |
| `growthRadarDetectionEngine.ts` | 815 | `GrowthRadarDetectionEngine` | `growthOpportunityEngine` | 4. Static Templates / Heuristics | Scans business context to surface growth opportunities deterministically. |
| `growthRadarService.ts` | 410 | `GrowthRadarService` | `growthRadarRepository` | 3. Deterministic | Stores and transitions radar opportunities from PROPOSED to EXECUTING. |
| `hybridRetrievalService.ts` | 401 | `HybridRetrievalService` | `businessProfileRepository`, `documentRepository` | 4. Lexical Overlap | Labeled "Hybrid Retrieval", but uses lexical token overlap without vector embeddings. |
| `ideaIntelligenceService.ts` | 1628 | `IdeaIntelligenceService` | `@google/genai`, `researchEngine` | 1. Genuine AI / Hybrid | Calls Gemini for idea understanding; fallback uses 16 hardcoded regex sectors. |
| `knowledgeGraphService.ts` | 290 | `KnowledgeGraphService` | `knowledgeGraphRepository` | 3. Deterministic | Relational graph edge manager (`TARGETS`, `PROMOTES`, `DIFFERENTIATES_FROM`). |
| `learningEngineService.ts` | 931 | `LearningEngineService` | `learningRepository` | 4. Static Templates / Heuristics | Logs strategic learnings and hypothesis validations without real model tuning. |
| `logoDesignEngine.ts` | 1155 | `LogoDesignEngine` | `modelRouter`, `brandStudioRepository` | 1. Genuine AI / Hybrid | Calls Gemini for bespoke logo SVGs; falls back to procedural geometric monograms. |
| `marketingAndVoiceEngine.ts` | 370 | `MarketingAndVoiceEngine` | `brandIdentityRepository` | 4. Static Templates / Heuristics | Brand voice directive assembly and tone consistency scoring. |
| `marketIntelligenceService.ts` | 381 | `MarketIntelligenceService` | `marketFindingRepository` | 4. Static Templates / Heuristics | Industry growth rate and market potential heuristics. |
| `memoryService.ts` | 270 | `MemoryService` | `memoryRepository` | 3. Deterministic | Working memory, episodic memory, and conversation turn tracking. |
| `onboardingService.ts` | 310 | `OnboardingService` | `modelRouter`, `businessProfileRepository` | 1. Genuine AI / Hybrid | Generates structured Business Brain JSON from onboarding answers. |
| `opportunityScoringService.ts` | 125 | `OpportunityScoringService` | None | 3. Deterministic | Mathematical weighted opportunity scoring formula. |
| `performanceIngestionService.ts` | 280 | `PerformanceIngestionService` | `telemetryRepository` | 3. Deterministic | Ingests external click and conversion telemetry with SHA-256 deduplication. |
| `printPackagingService.ts` | 680 | `PrintPackagingService` | `packagingRepository` | 3. Deterministic | Packaging prepress state machine (Concept -> Editable -> Production Ready). |
| `printPrepressEngine.ts` | 440 | `PrintPrepressEngine` | None | 3. Deterministic | Validates bleed margins, CMYK safe-zones, and ISO barcode placements. |
| `proactiveIntelligenceService.ts` | 345 | `ProactiveIntelligenceService` | None | 4. Static Templates / Heuristics | Generates automated weekly founder briefings from fixed templates. |
| `productAndPricingEngine.ts` | 420 | `ProductAndPricingEngine` | `productRepository` | 3. Deterministic | Product catalogue validator, currency normalizer, and SKU uniqueness enforcer. |
| `recommendationLifecycleService.ts` | 130 | `RecommendationLifecycleService` | `recommendationRepository` | 3. Deterministic | State machine tracking recommendation lifecycle from PROPOSED to COMPLETED. |
| `scenarioPlanningService.ts` | 311 | `ScenarioPlanningService` | None | 3. Deterministic | What-if simulation calculator modeling price changes and acquisition sensitivity. |
| `scheduledIntelligenceService.ts` | 110 | `ScheduledIntelligenceService` | None | 3. Deterministic | Cron trigger scheduler for background health scans and report compilation. |
| `sharedBusinessContextService.ts` | 660 | `SharedBusinessContextService` | `businessProfileRepository`, `brandIdentityRepository` | 3. Deterministic | Assembles unified business context snapshots with 5-minute caching. |
| `socialMediaIntelligenceService.ts` | 795 | `SocialMediaIntelligenceService` | None | 4. Static Templates / Heuristics | Omnichannel social media format adapter and scheduling simulator. |
| `storageService.ts` | 360 | `StorageService` | None | 3. Deterministic | GCS signed URL generation and local filesystem storage adapter. |
| `strategicReasoningService.ts` | 302 | `StrategicReasoningService` | None | 4. Static Templates / Heuristics | Strategic gap analysis and competitor contrast heuristics. |
| `toolPermissionService.ts` | 320 | `ToolPermissionService` | None | 3. Deterministic | Evaluates tool permissions and enforces Human Approval Gates. |
| `trademarkClearanceService.ts` | 410 | `TrademarkClearanceService` | None | 3. Deterministic | Common-law and phonetic trademark collision checker for logo text. |
| `unifiedAiAssetIntelligenceService.ts` | 1122 | `UnifiedAiAssetIntelligenceService` | `brandAssetRepository` | 4. Static Templates / Heuristics | 1,122 lines coordinating asset classification and creative asset bundles. |
| `unifiedReportService.ts` | 593 | `UnifiedReportService` | None | 3. Deterministic | PDF and executive slide deck renderer using HTML canvas and SVG. |
| `vectorGlyphEngine.ts` | 280 | `VectorGlyphEngine` | None | 3. Deterministic | Mathematical procedural generator for geometric glyphs, badges, and icons. |
| `workspaceService.ts` | 134 | `WorkspaceService` | `workspaceRepository` | 3. Deterministic | Multi-tenant workspace provisioning, member invites, and role updates. |

---

## 3. Subsystem Services & Engines

### 3.1 Growth Agency Engine Subsystem (`src/server/services/growth/`)
- `growthDepartmentEngines.ts` (275 lines): Static template string functions representing 7 Growth Directors.
- `growthOpportunityEngine.ts` (153 lines): Returns 2 hardcoded opportunity templates.
- `growthStrategyArchitect.ts` (160 lines): Outbound wedge and contrast campaign heuristics.
- `growthModelAdapterEngine.ts` (340 lines): Stage-based channel filter (bans ads for pre-launch startups).
- `growthPrioritizationEngine.ts` (130 lines): Mathematical ranking for growth missions.
- `growthRoadmapEngine.ts` (420 lines): 4-week sprint milestones generator.
- `growthSimulatorEngine.ts` (215 lines): Financial sensitivity calculator.

### 3.2 AI Orchestrator Subsystem (`src/server/ai/`)
- `orchestrator.ts` (442 lines): 15-step AI orchestration lifecycle coordinator.
- `modelRouter.ts` (357 lines): GeminiProviderAdapter, circuit breaker, and task complexity routing.
- `researchEngine.ts` (624 lines): Tri-vector query decomposition, Tavily search, and EvidenceLake persistence.
- `validationEngine.ts` (200 lines): Multi-layer output validation (JSON schema + TruthCheck).
- `contextEngine.ts` (195 lines): Business context extraction and token pruning.
- `memoryEngine.ts` (115 lines): Episodic and working memory retriever.
- `promptRegistry.ts` (190 lines): Versioned system instructions for 7 AI departments.
- `toolRegistry.ts` (250 lines): Safe tool registration and input validation.
- `strategyEngine.ts` (180 lines): Grounded strategic recommendation synthesizer.
- `workflowRegistry.ts` (235 lines): Department workflow classifier and credit cost mapper.
