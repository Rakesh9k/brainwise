# Phase 5: Database Documentation
## Firestore Schema Definitions, Subcollections, Access Rules & Indexing

**Document Version:** 1.0.0  
**Phase Status:** COMPLETE & VERIFIED  
**Date:** November 20, 2026  
**Storage Engine:** Google Cloud Firestore (Document Database)

---

## 1. Global & Multi-Tenant Collection Hierarchy

```
firestore-root/
│
├── users/{userId}                                     [Global User Account Directory]
│
├── onboarding_sessions/{userId}                       [Conversational State & Autosave]
│
└── workspaces/{workspaceId}/                          [Isolated Tenant Boundary]
    │
    ├── business_profile/main                          [Authoritative Business Brain Document]
    │
    ├── business_brain_versions/{versionId}            [Historical Snapshot Version Log]
    │
    ├── credit_wallets/main                            [Two-Phase Reservation Ledger]
    │
    ├── members/{userId}                               [RBAC Membership Roster]
    │
    ├── research_reports/{reportId}                    [Market Sizing & Research Dossiers]
    │
    ├── brand_assets/{assetId}                         [Vector SVG & Stationery Collateral]
    │
    └── audit_logs/{logId}                             [Security & Modification Trails]
```

---

## 2. Collection Schemas

### 2.1 `users/{userId}`
Stores user identity, authentication hashes, verification status, and routing state.

| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | `string` | Primary key / Auth UID (e.g. `usr_1a2b3c`) |
| `email` | `string` | Canonical user email address (lowercase, trimmed) |
| `displayName` | `string` | Full name of the user |
| `passwordHash` | `string` | Cryptographic scrypt hash in format `salt:derivedKey` |
| `emailVerified` | `boolean` | Verification flag; `false` on initial registration |
| `verificationToken` | `string?` | 6-digit numeric verification code (e.g. `482910`) |
| `verificationTokenExpiresAt` | `string?` | ISO-8601 expiration timestamp (24 hours window) |
| `passwordResetToken` | `string?` | Cryptographic random token for password recovery |
| `passwordResetExpiresAt` | `string?` | ISO-8601 expiration timestamp (1 hour window) |
| `activeWorkspaceId` | `string?` | Foreign key referencing current active `workspaces/{id}` |
| `onboardingStatus` | `string` | State enum: `NOT_STARTED`, `IN_PROGRESS`, `BUSINESS_DETAILS_CAPTURED`, `BUSINESS_BRAIN_REVIEW`, `COMPLETED` |
| `createdAt` | `string` | ISO-8601 creation timestamp |
| `updatedAt` | `string` | ISO-8601 modification timestamp |
| `lastLoginAt` | `string?` | ISO-8601 last authenticated session timestamp |

### 2.2 `onboarding_sessions/{userId}`
Maintains live onboarding progress, supporting resilient cross-device resumption and incremental autosave.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Document ID equal to founder's `userId` |
| `userId` | `string` | Foreign key referencing `users/{userId}` |
| `workspaceId` | `string?` | Associated workspace ID once provisioned |
| `status` | `string` | Session status: `IN_PROGRESS`, `COMPLETED`, `ABANDONED` |
| `currentStage` | `number` | Stage index (1: Identity, 2: Objectives, 3: Offerings) |
| `currentStep` | `number` | Step index within the active stage (1 to 4) |
| `data` | `Record<string, any>` | Aggregated answers dictionary |
| `data.businessName` | `string?` | Formal company name |
| `data.businessType` | `string?` | Category: `Consumer brand`, `Technology startup`, `Service business`, etc. |
| `data.city` | `string?` | Primary operating city |
| `data.country` | `string?` | Operating jurisdiction |
| `data.targetAudienceType` | `string?` | Audience segment descriptor |
| `data.isB2B` | `boolean?` | Flag indicating B2B focus |
| `data.primaryPriorities` | `string[]?` | Growth objectives array |
| `data.differentiators` | `string[]?` | Core competitive differentiators |
| `data.offeringsSummary` | `string?` | High-level summary of products or services |
| `data.pricingModel` | `string?` | Pricing structure (e.g. `Subscription`, `Retainer`, `Fixed`) |
| `createdAt` | `string` | ISO-8601 creation timestamp |
| `updatedAt` | `string` | ISO-8601 timestamp of last autosaved answer |

### 2.3 `workspaces/{workspaceId}/business_profile/main`
The authoritative Business Brain document grounding all downstream AI generations.

| Field | Type | Description |
| :--- | :--- | :--- |
| `workspaceId` | `string` | Foreign key referencing parent workspace |
| `businessName` | `string` | Authoritative commercial name |
| `tagline` | `string` | Core marketing tagline |
| `stage` | `string` | `Idea Stage` \| `Pre-Launch` \| `Early Traction` \| `Growing Business` \| `Established` |
| `location` | `string` | Normalized headquarters location |
| `website` | `string` | Primary web domain |
| `targetAudience` | `string` | Audience summary narrative |
| `brandPositioning` | `string` | Strategic positioning statement |
| `valueProposition` | `string` | Unique customer value statement |
| `businessModel` | `string` | Monetization archetype |
| `revenueModel` | `string` | Detailed pricing mechanics |
| `productsAndServices` | `Array<ProductItem>` | Normalized products/services with price ranges |
| `customerPersonas` | `Array<PersonaItem>` | Target personas with pain points & buying triggers |
| `provenance` | `Record<string, FactProvenance>` | Fact origin map: `source`, `confidence`, `updatedAt` |
| `intelligence` | `Object` | Synthetic intelligence metrics |
| `intelligence.summary` | `string` | AI synthesis executive summary |
| `intelligence.strengths` | `string[]` | Identified business strengths |
| `intelligence.informationGaps` | `string[]` | Unresolved assumptions needing founder validation |
| `intelligence.assumptions` | `string[]` | Working commercial assumptions |
| `intelligence.confidence` | `Record<string, number>` | Subsystem confidence scores (0.0 to 1.0) |
| `approvalStatus` | `string` | Review state: `DRAFT` \| `PENDING_REVIEW` \| `APPROVED` |
| `approvedAt` | `string?` | ISO-8601 approval timestamp |
| `approvedBy` | `string?` | User ID of approving founder |
| `version` | `number` | Monotonically increasing revision integer |
| `updatedAt` | `string` | ISO-8601 last modified timestamp |

### 2.4 `workspaces/{workspaceId}/business_brain_versions/{versionId}`
Immutable audit snapshot log enabling 1-click rollback.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Version identifier (e.g. `ver_1732049102910_a1b2`) |
| `workspaceId` | `string` | Parent workspace identifier |
| `versionNumber` | `number` | Snapshot revision number (e.g. 1, 2, 3) |
| `snapshot` | `BusinessProfileEntity` | Complete deep copy of `business_profile/main` |
| `changeDescription` | `string` | Reason for snapshot (`Initial Onboarding Approval`, etc.) |
| `createdBy` | `string` | User ID who triggered snapshot |
| `createdAt` | `string` | ISO-8601 snapshot creation timestamp |

---

## 3. Firestore Security Rules

Production Firestore security rules enforce strict user boundary isolation and tenant containment:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Directory: Users may only read and write their own record
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Onboarding Sessions: Isolated to the authenticating user
    match /onboarding_sessions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Workspaces: Access gated by explicit membership in members subcollection
    match /workspaces/{workspaceId} {
      function isMember() {
        return request.auth != null && 
          exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
      }

      allow read: if isMember();
      allow write: if isMember();

      // All subcollections inherit tenant membership verification
      match /{subcollection}/{docId} {
        allow read, write: if isMember();
      }
    }
  }
}
```

---

## 4. Indexing & Query Optimizations

To support real-time dashboards and version lookups, the following composite indexes are configured:

1. **`users` Collection:**
   - Single-field index on `email` (ASC) for rapid login lookups.
   - Single-field index on `verificationToken` (ASC) for code resolution.
   - Single-field index on `passwordResetToken` (ASC) for reset link verification.
2. **`workspaces/{id}/business_brain_versions` Subcollection:**
   - Composite index: `workspaceId` (ASC) + `versionNumber` (DESC) for ordered version timelines.
3. **`onboarding_sessions` Collection:**
   - Single-field index on `userId` (ASC) + `status` (ASC) for session resumption.
