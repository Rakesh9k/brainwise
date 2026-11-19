# BRAINWISE — PHASE 3: GIT & VERSION CONTROL SPECIFICATION

**Document ID:** `BW-PHASE3-01`  
**Date:** November 19, 2026  
**Status:** Approved & Implemented Locally  
**Author:** Git & Release Management Engineer  

---

## 1. Repository Overview & Baseline

The BrainWise project repository has been initialized with a clean, standard Git architecture. The original prototype exported from Google AI Studio was preserved in full as an immutable baseline commit on the `main` branch.

### 1.1 Local Repository Status
- **Current Branch:** `develop`
- **Baseline Commit:** `8a4d7d8` (or current baseline SHA)
- **Commit Message:** `chore: preserve original BrainWise AI Studio prototype`
- **Configured Identity:** `Rakesh9k <89246461+Rakesh9k@users.noreply.github.com>`
- **Repository Name Target:** `brainwise`

---

## 2. Branching Strategy

BrainWise follows an enterprise GitFlow variant optimized for web applications with continuous integration and staged releases:

```
                  hotfix/v1.0.1
                ┌───────────────┐
                │               ▼
main      ──────●───────────────●────────────────────●─────── [Production Releases: v1.0.0, v1.0.1]
                ▲               ▲                    ▲
                │ release/v1.0.0│                    │ release/v1.1.0
                └───────●───────┘                    │
                        ▲                            │
develop   ──●───────────●────────────────────────────●─────── [Integration Branch]
            ▲           ▲              ▲
            │           │              │
feature/*  ─●───────────┘              │
fix/*      ────────────────────────────┘
```

### 2.1 Canonical Branch Definitions

| Branch | Lifecycle | Protection Level | Purpose |
| :--- | :--- | :--- | :--- |
| **`main`** | Permanent | **High** (Strict Protection) | Contains production-ready code. Every merge to `main` is tagged with a semantic release version (`vX.Y.Z`). Direct pushes forbidden. |
| **`develop`** | Permanent | **Medium** (Protected) | Primary integration branch for completed features, refactors, and fixes. All pull requests target `develop`. |
| **`feature/*`** | Ephemeral | None (Developer Owned) | New feature or department implementations (e.g., `feature/bw-401-content-studio-api`). Branched from `develop`, merged back to `develop`. |
| **`fix/*`** | Ephemeral | None (Developer Owned) | Non-urgent bug fixes during development (e.g., `fix/typography-calc-precision`). Branched from and merged into `develop`. |
| **`refactor/*`**| Ephemeral | None (Developer Owned) | Code quality, architectural boundary, and performance improvements (e.g., `refactor/api-client-layer`). |
| **`release/*`** | Ephemeral | **High** | Release stabilization and final QA before merging into `main` and back to `develop` (e.g., `release/v1.0.0`). |
| **`hotfix/*`**  | Ephemeral | **High** | Urgent fixes to production. Branched directly from `main` and merged into both `main` and `develop` (e.g., `hotfix/v1.0.1-gemini-quota`). |

---

## 3. Commit Message Conventions (Conventional Commits)

All commits in the BrainWise repository must strictly follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) standard.

### 3.1 Structure
```
<type>(<optional scope>): <description>

[optional body explaining WHY the change was made, not what was changed]

[optional footer(s) referencing issue IDs or BREAKING CHANGES]
```

### 3.2 Standard Commit Types

- **`feat`**: A new user-facing feature or department capability.
- **`fix`**: A bug fix for an existing feature.
- **`refactor`**: Code restructuring without changing external behavior or adding features.
- **`chore`**: Maintenance tasks, dependency bumps, or toolchain updates.
- **`docs`**: Documentation updates (Phase documentation, architectural records, API contracts).
- **`test`**: Adding new tests or refactoring existing test suites.
- **`ci`**: Changes to CI/CD workflows, build scripts, or quality gates.
- **`perf`**: Performance optimizations (bundle size, rendering efficiency, memory).

### 3.3 Examples
```bash
# Feature commit
feat(brain): integrate typed facts verification hook

# Bugfix commit
fix(chart): prevent horizontal overflow in mobile trend pill switcher

# Architectural refactor commit
refactor(api): isolate AI generation routes behind typed service client

# Chore commit
chore(ci): add automated GitHub Actions workflow for pull request validation
```

---

## 4. Pull Request (PR) Workflow & Quality Gates

### 4.1 PR Lifecycle
1. **Branch Creation:** Developer branches from up-to-date `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/business-brain-api
   ```
2. **Local Verification:** Before opening a PR, the developer must execute:
   ```bash
   npm run lint          # TypeScript verification
   npm run format:check  # Prettier formatting verification
   npm test              # All unit and component tests
   npm run build         # Vite production build
   ```
3. **PR Submission:** Open PR targeting `develop` using `.github/pull_request_template.md`.
4. **Automated CI Validation:** The GitHub Actions pipeline executes the complete quality suite:
   - Lint & Typecheck
   - Prettier check
   - Unit tests
   - Production build
5. **Code Review:** Minimum of one senior engineer approval required.
6. **Merge Strategy:** **Squash and Merge** is standard for feature branches to keep `develop` history linear and clean. Merge commits are reserved for merging `release/*` into `main`.

---

## 5. Branch Protection Recommendations for GitHub

When the repository is linked to a remote GitHub organization/account, the following protection rules must be configured:

### 5.1 Rules for `main`
- [x] Require a pull request before merging.
- [x] Require approvals (minimum 1 peer review, 2 recommended for releases).
- [x] Dismiss stale pull request approvals when new commits are pushed.
- [x] Require status checks to pass before merging:
  - `ci/typecheck`
  - `ci/lint`
  - `ci/test`
  - `ci/build`
- [x] Require branches to be up to date before merging.
- [x] Require linear history (Squash or Rebase only).
- [x] Do not allow bypass of the above settings.
- [x] Restrict who can push to matching branches (administrators only).

### 5.2 Rules for `develop`
- [x] Require a pull request before merging.
- [x] Require status checks to pass before merging (`ci/*`).
- [x] Require conversation resolution before merging.
- [x] No direct force pushes (`git push --force` forbidden).

---

## 6. Release Tagging & Versioning

BrainWise adopts **Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`)**:
- **`MAJOR`**: Incompatible architectural changes, major database schema migrations.
- **`MINOR`**: New department additions, backwards-compatible feature enhancements.
- **`PATCH`**: Bug fixes, performance optimizations, minor UX polish.

### 6.1 Tagging Procedure
```bash
# 1. Ensure main is up to date and all checks passed
git checkout main
git pull origin main

# 2. Create annotated and signed release tag
git tag -a v1.0.0 -m "Release v1.0.0: BrainWise Core Platform & 14 Departments"

# 3. Push tag to remote
git push origin v1.0.0
```

---

## 7. Rollback & Emergency Recovery Procedures

### 7.1 Production Rollback (Fast Forward / Revert)
If a critical flaw bypasses QA into `main`:
1. **Automated Deployment Rollback:** Re-deploy the previously verified container/image tag in Cloud Run / Firebase App Hosting immediately.
2. **Git Revert Commit:**
   ```bash
   git checkout main
   git revert -m 1 <MERGE_COMMIT_SHA> -m "revert: rollback release v1.0.1 due to upstream API regression"
   git push origin main
   ```
3. **Hotfix Flow:**
   ```bash
   git checkout main
   git checkout -b hotfix/v1.0.2-api-fix
   # apply fix, run tests
   git commit -m "fix(server): restore resilient timeout handling in Gemini gateway"
   # merge to main and back to develop
   ```

---

## 8. Remote Repository Setup Action Required by Owner

The local Git repository is completely initialized, cleanly branched, and baseline-committed. To connect to GitHub:

```bash
# Step 1: Create a new private repository named 'brainwise' on GitHub:
# https://github.com/new

# Step 2: Add the remote origin:
git remote add origin https://github.com/Rakesh9k/brainwise.git

# Step 3: Push baseline branches and tags:
git push -u origin main
git push -u origin develop
```

*Note: In accordance with project instructions, no remote push is performed without explicit owner confirmation of repository creation and permissions.*
