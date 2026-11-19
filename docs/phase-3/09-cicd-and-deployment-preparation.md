# BRAINWISE — PHASE 3: CI/CD & DEPLOYMENT PREPARATION

**Document ID:** `BW-PHASE3-09`  
**Date:** November 19, 2026  
**Status:** Approved Specification  
**Author:** DevOps Engineer & Release Manager  

---

## 1. Overview & CI/CD Objectives

This document outlines the automated continuous integration and continuous deployment (CI/CD) architecture for the BrainWise platform. The pipeline guarantees that no code is merged or deployed unless it passes strict quality gates for security, typing, style, testing, and production compilation.

---

## 2. GitHub Actions CI Architecture (`.github/workflows/ci.yml`)

The CI workflow triggers automatically on:
- All Pull Requests targeting `main` and `develop`.
- Direct pushes to `main` and `develop`.

```
[Developer Push / PR]
         │
         ▼
[GitHub Actions Runner: ubuntu-latest]
         ├─ 1. actions/checkout@v4
         ├─ 2. actions/setup-node@v4 (Node 22 LTS, npm caching)
         ├─ 3. npm ci --legacy-peer-deps
         ├─ 4. npm audit --audit-level=high (Security Gate)
         ├─ 5. npm run typecheck (Strict TypeScript 5.8 Check)
         ├─ 6. npm run lint (ESLint 9 Code Quality Check)
         ├─ 7. npm run format:check (Prettier Standard Check)
         ├─ 8. npm test (79 Unit & Integration Tests)
         └─ 9. npm run build (Vite 8 Production Build Compilation)
         │
         ▼
[Quality Gate Status: PASS / FAIL]
```

### 2.1 Quality Gate Criteria (Zero-Tolerance Policy)
A PR cannot be merged into `develop` or `main` if any of the following occur:
1. `npm audit` finds high or critical vulnerabilities.
2. `tsc --noEmit` fails with any type error.
3. `eslint` encounters any lint error or forbidden pattern.
4. `prettier --check` detects unformatted code.
5. Any unit or integration test fails.
6. `vite build` encounters a bundling or chunking error.

---

## 3. Deployment Preparation & Hosting Architecture

### 3.1 Target Production Runtime: Google Cloud Run (asia-south1)
- **Container Strategy:** Multi-stage Docker container compiling Vite client assets and executing Node.js Express server (`server.ts`).
- **Region:** `asia-south1` (Mumbai, India) in compliance with DPDPA 2023 data localization guidelines (ADR-009).
- **Auto-scaling:** Scaled from 1 to 20 instances based on CPU utilization and concurrent request limits.

### 3.2 Required Cloud Run Environment Configuration
The following variables and secrets must be provisioned in Google Cloud Run / Secret Manager prior to production release:

| Secret / Environment Name | Storage Location | Injected Into | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Secret Manager | Cloud Run Container | Privileged API key for Gemini 2.5 / 4 |
| `CASHFREE_APP_ID` | Google Secret Manager | Cloud Run Container | Cashfree payment gateway client ID |
| `CASHFREE_SECRET_KEY`| Google Secret Manager | Cloud Run Container | Cashfree payment gateway secret key |
| `FIREBASE_PROJECT_ID`| Environment Variable | Cloud Run Container | Firebase GCP project ID (`brainwise-prod`) |
| `PORT` | Cloud Run Managed | Cloud Run Container | HTTP port (default `8080`) |
| `NODE_ENV` | Environment Variable | Cloud Run Container | `production` |

---

## 4. Rollback & Emergency Release Strategy

1. **Immediate Container Traffic Re-routing:** Cloud Run supports instant zero-downtime rollback by splitting or switching 100% of traffic to the previous revision tag via Google Cloud Console or `gcloud run services update-traffic`.
2. **Database Schema Rollbacks:** In accordance with ADR-014, Firestore database migrations must always follow additive schemas (expand-and-contract) so older application revisions can execute safely without schema conflicts.
