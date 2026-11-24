# BRAINWISE — API ROUTE INVENTORY
**Server Entry:** `server.ts`  
**Router Factory:** `src/server/routes/index.ts`  
**Base Mounts:** `/api` and `/api/v1`

---

## 1. Authentication & Users (`/api/v1/auth`, `/api/v1/users`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/session` | None | Exchange Firebase/dev ID token for session |
| `GET` | `/api/v1/auth/me` | `authenticateToken` | Get current authenticated user profile |
| `POST` | `/api/v1/auth/logout` | `authenticateToken` | Invalidate current user session |

---

## 2. Workspaces (`/api/v1/workspaces`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `POST` | `/api/v1/workspaces` | `authenticateToken` | Create new tenant workspace |
| `GET` | `/api/v1/workspaces` | `authenticateToken` | List user workspaces |
| `GET` | `/api/v1/workspaces/:workspaceId` | `authenticateToken`, `requireWorkspaceMember` | Get workspace details |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Update workspace settings |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | `authenticateToken`, `requireWorkspaceMember` | List workspace members |
| `POST` | `/api/v1/workspaces/:workspaceId/members` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Invite new member |

---

## 3. Business Brain & Profile (`/api/v1/workspaces/:workspaceId/business-profile`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/` | `authenticateToken`, `requireWorkspaceMember` | Retrieve business profile & brain facts |
| `POST` | `/` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Initialize business profile |
| `PATCH` | `/` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Update business facts |
| `POST` | `/confirm-fact` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Mark fact as `USER_CONFIRMED` |
| `POST` | `/exclusions` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Add brand claim/phrase exclusion |
| `GET` | `/history` | `authenticateToken`, `requireWorkspaceMember` | Get audit change history |
| `GET` | `/versions` | `authenticateToken`, `requireWorkspaceMember` | List snapshot versions |
| `POST` | `/versions/:versionId/restore` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Rollback to specific version |
| `GET` | `/products` | `authenticateToken`, `requireWorkspaceMember` | List products with optional category filter |
| `POST` | `/products` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Add single product |
| `POST` | `/products/bulk` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Bulk create catalogue products |
| `PATCH` | `/products/:productId` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Update existing product |
| `DELETE` | `/products/:productId` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Remove product from catalogue |
| `GET` | `/services` | `authenticateToken`, `requireWorkspaceMember` | List business service offerings |
| `POST` | `/services` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Add service offering |
| `GET` | `/audience` | `authenticateToken`, `requireWorkspaceMember` | List target audience segments |
| `POST` | `/audience` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Add audience segment |
| `POST` | `/extract-document` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Extract facts from document text |

---

## 4. Business Reasoning & Decision Intelligence (`/api/v1/workspaces/:workspaceId/reasoning`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/health` | `authenticateToken`, `requireWorkspaceMember` | Compute 8-dimension business health score |
| `POST` | `/contradictions` | `authenticateToken`, `requireWorkspaceMember` | Detect brand contradictions & unverified claims |
| `POST` | `/swot` | `authenticateToken`, `requireWorkspaceMember` | Generate evidence-grounded SWOT analysis |
| `GET` | `/decisions` | `authenticateToken`, `requireWorkspaceMember` | Retrieve historical decisions & learnings |

---

## 5. Idea Intelligence & Research (`/api/v1/workspaces/:workspaceId/research`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/` | `authenticateToken`, `requireWorkspaceMember` | List commercial research reports |
| `POST` | `/` | `authenticateToken`, `requireWorkspaceMember` | Orchestrate TAM/SAM/SOM validation dossier |
| `GET` | `/:reportId` | `authenticateToken`, `requireWorkspaceMember` | Retrieve specific research report |
| `POST` | `/understand-idea` | `authenticateToken`, `requireWorkspaceMember` | Structured idea parsing & preliminary decomposition |
| `POST` | `/:reportId/conversation` | `authenticateToken`, `requireWorkspaceMember` | Interactive conversational query on research |
| `POST` | `/:reportId/finalize` | `authenticateToken`, `requireWorkspaceMember` | Finalize idea into commercial blueprint |

---

## 6. Competitive Intelligence (`/api/v1/workspaces/:workspaceId/competitors`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/` | `authenticateToken`, `requireWorkspaceMember` | List tracked competitors |
| `POST` | `/` | `authenticateToken`, `requireWorkspaceMember` | Add competitor manually |
| `POST` | `/discover` | `authenticateToken`, `requireWorkspaceMember` | Autonomous competitor discovery scan |
| `GET` | `/:competitorId/battlecard` | `authenticateToken`, `requireWorkspaceMember` | Generate sales battlecard against competitor |

---

## 7. Brand Studio & Asset Management (`/api/v1/workspaces/:workspaceId/assets`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/` | `authenticateToken`, `requireWorkspaceMember` | List workspace collateral assets |
| `POST` | `/` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin', 'member'])` | Create/register new asset |
| `POST` | `/generate` | `authenticateToken`, `requireWorkspaceMember` | Generate collateral (SVG, Carousel, Social) |
| `GET` | `/:assetId` | `authenticateToken`, `requireWorkspaceMember` | Retrieve asset details & metadata |
| `GET` | `/:assetId/download` | `authenticateToken`, `requireWorkspaceMember` | Get signed download URL |
| `DELETE` | `/:assetId` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Move asset to archive or delete |

---

## 8. Growth Radar & Planning (`/api/v1/workspaces/:workspaceId/growth-radar`, `/goals`, `/tasks`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/growth-radar/signals` | `authenticateToken`, `requireWorkspaceMember` | Ingest market signals & opportunities |
| `GET` | `/goals` | `authenticateToken`, `requireWorkspaceMember` | List strategic growth goals |
| `POST` | `/goals` | `authenticateToken`, `requireWorkspaceMember` | Create new growth goal |
| `GET` | `/tasks` | `authenticateToken`, `requireWorkspaceMember` | List department execution tasks |
| `POST` | `/tasks` | `authenticateToken`, `requireWorkspaceMember` | Create execution task |

---

## 9. Analytics & Reporting (`/api/v1/workspaces/:workspaceId/analytics`, `/reports`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/analytics/overview` | `authenticateToken`, `requireWorkspaceMember` | Retrieve unified metrics overview & connector health |
| `POST` | `/analytics/ask-assistant` | `authenticateToken`, `requireWorkspaceMember` | AI Assistant query over workspace metrics |
| `GET` | `/reports/dossier` | `authenticateToken`, `requireWorkspaceMember` | Generate 7-section Unified Executive Dossier |
| `GET` | `/reports/export/csv` | `authenticateToken`, `requireWorkspaceMember` | Export report data to RFC-compliant CSV |

---

## 10. Billing, Credits & Checkout (`/api/v1/workspaces/:workspaceId/billing`, `/api/v1/billing`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `GET` | `/billing/balance` | `authenticateToken`, `requireWorkspaceMember` | Get credit balance & transaction ledger |
| `POST` | `/billing/checkout` | `authenticateToken`, `requireWorkspaceRole(['owner', 'admin'])` | Create Cashfree payment session |
| `POST` | `/billing/verify` | `authenticateToken`, `requireWorkspaceMember` | Verify payment status and credit account |
| `POST` | `/billing/webhook` | Webhook signature verification | Ingest asynchronous payment gateway webhooks |
| `GET` | `/billing/invoices` | `authenticateToken`, `requireWorkspaceMember` | List GST/tax-compliant invoices |

---

## 11. Legacy Root AI Aliases (`/api/ai`)
| Method | Path | Middleware | Description |
|---|---|---|---|
| `POST` | `/api/ai/dossier` | `authenticateToken`, `requireWorkspaceMember` | Top-level alias for dossier generation |
| `POST` | `/api/ai/playbook` | `authenticateToken` | Generate playbook campaign angle |
| `POST` | `/api/ai/recommendations` | `authenticateToken` | Generate multi-department recommendations |
