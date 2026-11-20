# BrainWise Database Data Dictionary

| Collection / Subcollection | Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` | string | Yes | Firebase Auth UID (alphanumeric) | User primary key |
| `users` | `email` | string | Yes | Valid email format | Primary contact email |
| `users` | `displayName` | string | Yes | Min 1, Max 100 chars | Display name |
| `users` | `accountStatus` | string | Yes | `active`, `suspended`, `deleted` | Account lifecycle status |
| `users` | `activeWorkspaceId`| string | No | Existing workspaceId | Active workspace pointer |
| `workspaces` | `workspaceId` | string | Yes | UUID v4 or alphanumeric slug | Tenant primary key |
| `workspaces` | `name` | string | Yes | Min 2, Max 100 chars | Workspace / business name |
| `workspaces` | `slug` | string | Yes | Lowercase hyphenated string | URL identifier |
| `workspaces` | `ownerUserId` | string | Yes | Matches user UID | Workspace creator and primary owner |
| `workspaces` | `currency` | string | Yes | ISO 4217 (3 chars) | Default workspace currency |
| `workspace_members` | `membershipId` | string | Yes | `${workspaceId}_${userId}` | Composite primary key |
| `workspace_members` | `role` | string | Yes | `owner`, `admin`, `member`, `viewer` | Tenant RBAC role |
| `workspace_members` | `status` | string | Yes | `active`, `invited`, `revoked` | Membership status |
| `business_profiles` | `businessName` | string | Yes | Min 1, Max 120 chars | Official registered name |
| `business_profiles` | `description` | string | Yes | Min 10, Max 2000 chars | Core business overview |
| `business_profiles` | `offerings` | array<map> | Yes | Validated array of products/services | Catalog with verified pricing |
| `business_profiles` | `provenance` | map | Yes | Keys map to claim IDs | Ground truth fact provenance |
| `business_profiles` | `strategicMemory`| map | Yes | Contains usedAngles, explicitExclusions | Anti-fatigue and brand guardrails |
| `credit_wallets` | `balance` | number | Yes | Integer >= 0 | Available unreserved credits |
| `credit_wallets` | `reserved` | number | Yes | Integer >= 0 | Locked credits under reservation |
| `credit_wallets` | `lifetimeGranted` | number | Yes | Integer >= 0 | Cumulative credits assigned |
| `goals` | `goalId` | string | Yes | UUID or slug | Strategic target primary key |
| `goals` | `status` | string | Yes | `on_track`, `at_risk`, `behind`, `achieved` | Objective progress status |
| `competitors` | `competitorId` | string | Yes | UUID or slug | Competitor record ID |
| `competitors` | `threatLevel` | string | Yes | `high`, `medium`, `low` | Competitive threat rating |
| `tasks` | `taskId` | string | Yes | UUID or slug | Execution task ID |
| `tasks` | `department` | string | Yes | 1 of 14 valid department slugs | Functional assignment |
| `tasks` | `completed` | boolean | Yes | Boolean | Task completion flag |
| `assets` | `assetId` | string | Yes | UUID or slug | Asset record ID |
| `assets` | `type` | string | Yes | `logo`, `brand_card`, `social_graphic`, `stationery` | Collateral category (NO VIDEO) |
| `assets` | `format` | string | Yes | `svg`, `png`, `pdf` | Format extension (NO MP4/MOV) |
| `ai_jobs` | `jobId` | string | Yes | `job_` prefix + UUID | Async AI generation tracker |
| `ai_jobs` | `status` | string | Yes | `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED` | Job execution state machine |
| `audit_logs` | `logId` | string | Yes | `log_` prefix + timestamp + random | Append-only security log record |
