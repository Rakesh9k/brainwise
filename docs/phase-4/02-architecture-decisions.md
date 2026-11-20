# BrainWise Phase 4 Architecture Decision Records (ADRs) Summary

## 1. ADR-001: Cloud Run Serverless Monolith Backend
- **Decision:** Deploy the BrainWise backend as a modular Node.js/Express serverless application on Google Cloud Run rather than distributed microservices or standalone Cloud Functions.
- **Rationale:** Minimizes operational complexity, simplifies transactional coordination across credit wallets and the Business Brain, eliminates cold-start cascades across multiple functions, and leverages Cloud Run's automatic multi-zone scaling and traffic migration.

---

## 2. ADR-002: Cloud Firestore as Single Authoritative Database
- **Decision:** Select Cloud Firestore as the single authoritative database for multi-tenant SaaS state rather than introducing a hybrid Firestore + PostgreSQL architecture.
- **Rationale:** Document modeling aligns naturally with the nested, hierarchical Business Brain, multi-tenant subcollection boundaries (`workspaces/{workspaceId}/...`) provide physical data isolation, and Firestore transactions provide atomic ACID guarantees for credit ledgers without the maintenance overhead of managing a relational database cluster.

---

## 3. ADR-006: Two-Phase Credit Reservation Protocol
- **Decision:** Implement a two-phase reservation protocol (Hold -> Settle or Refund) for all AI and credit-consuming operations.
- **Rationale:** Prevents concurrent double-spending across multiple browser tabs, guarantees that upstream AI failures or Truth Check rejections result in zero net deduction to the user, and maintains an immutable append-only transaction ledger.

---

## 4. ADR-009: Strict Video Exclusion Policy
- **Decision:** Explicitly reject and exclude all video generation, rendering pipelines, video credit tiers, and video storage.
- **Rationale:** BrainWise specializes in strategic growth intelligence, high-DPI vector collateral (stationery, posters, business cards), and static copywriting packs. Eliminating video generation avoids massive GPU compute costs, unstable video APIs, and complex media streaming infrastructure.
