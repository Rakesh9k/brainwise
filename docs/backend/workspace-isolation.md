# BrainWise Multi-Tenant Workspace Isolation Architecture

## 1. Multi-Tenancy Principles
In BrainWise, a **Workspace** is the absolute tenant boundary. All business data, strategic goals, competitor intelligence, customer personas, brand assets, credit wallets, and AI generations belong exclusively to a single workspace.

**Non-Negotiable Rule:** Cross-workspace data leakage is classified as a Critical Severity Security Vulnerability. No tenant may read, write, query, or infer another tenant's data under any operational circumstance.

---

## 2. Structural Partitioning Model

### 2.1 Firestore Subcollection Scoping
All operational data is strictly nested under `/workspaces/{workspaceId}/...`:
- `workspaces/{workspaceId}/business_profiles/default`
- `workspaces/{workspaceId}/credit_wallets/default`
- `workspaces/{workspaceId}/credit_wallets/default/transactions/{txId}`
- `workspaces/{workspaceId}/goals/{goalId}`
- `workspaces/{workspaceId}/competitors/{competitorId}`
- `workspaces/{workspaceId}/tasks/{taskId}`
- `workspaces/{workspaceId}/assets/{assetId}`
- `workspaces/{workspaceId}/experiments/{experimentId}`
- `workspaces/{workspaceId}/research/{docId}`
- `workspaces/{workspaceId}/recommendations/{recId}`
- `workspaces/{workspaceId}/integrations/{integrationId}`
- `workspaces/{workspaceId}/ai_jobs/{jobId}`
- `workspaces/{workspaceId}/audit_logs/{logId}`

This physical document path guarantee prevents accidental queries across workspaces; Firestore collection group queries across tenants are completely forbidden in application code.

### 2.2 Google Cloud Storage Prefix Partitioning
Storage objects are strictly partitioned by workspace ID:
`gs://brainwise-app-storage/workspaces/{workspaceId}/assets/{assetId}.svg`

The backend `storageService.ts` automatically prepends `workspaces/${workspaceId}/` to every signed upload and download URL generation request. Any attempt by a client to access an object path outside their verified workspace ID is rejected before URL generation.

---

## 3. Verification & Automated Test Coverage
Multi-tenant isolation is continuously validated by automated test suites in `src/server/workspaceIsolation.test.ts`:
1. **Direct Resource Access Test:** User B (Workspace B) attempting to read `/api/v1/workspaces/{workspaceA}/business-profile` receives HTTP 403 `FORBIDDEN`.
2. **Sub-Resource Mutation Test:** User B attempting to create a task in Workspace A receives HTTP 403 `FORBIDDEN`.
3. **Storage Isolation Test:** User B attempting to generate a signed upload URL inside Workspace A's prefix receives HTTP 403 `FORBIDDEN`.
4. **Member Role Impersonation Test:** User B attempting to escalate roles or view members of Workspace A receives HTTP 403 `FORBIDDEN`.
