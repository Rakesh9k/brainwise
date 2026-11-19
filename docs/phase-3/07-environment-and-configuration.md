# BRAINWISE — PHASE 3: ENVIRONMENT & CONFIGURATION MANAGEMENT

**Document ID:** `BW-PHASE3-07`  
**Date:** November 19, 2026  
**Status:** Approved Standard  
**Author:** DevOps Engineer & Security Architect  

---

## 1. Overview & Strategy

BrainWise requires a disciplined environment management strategy to prevent accidental leakage of privileged secrets, distinguish between client-visible configuration and server-side credentials, and ensure predictable behavior across development, testing, staging, and production.

---

## 2. Environment Types & Profiles

| Environment | Purpose | Secrets Management | Hosting Target |
| :--- | :--- | :--- | :--- |
| **Local Development** | Developer workstation (`npm run dev`) | Stored in `.env.local` (git-ignored) | Local Node.js / Vite (`localhost:3000`) |
| **Automated Testing / CI** | GitHub Actions quality gate | Simulated via test fixtures / GitHub Secrets | Ubuntu runner in GitHub Actions |
| **Staging** | Pre-production integration & verification | Google Secret Manager / Cloud Run env | Google Cloud Run / Firebase App Hosting |
| **Production** | Live multi-tenant platform | Google Secret Manager / Cloud Run env | Google Cloud Run (asia-south1 / Mumbai) |

---

## 3. Environment Variable Master Inventory

### 3.1 Server-Side Variables (Strictly Privileged)
These variables MUST NEVER be bundled into client-side JavaScript. They are consumed exclusively by Node.js in `server.ts` or Cloud Functions.

| Variable Name | Required? | Default / Fallback | Description |
| :--- | :---: | :--- | :--- |
| **`PORT`** | No | `3000` | Port on which the Express gateway listens. Automatically assigned by Cloud Run in production. |
| **`GEMINI_API_KEY`** | Yes (Live AI) | `null` | Google Gemini API key used for Dossier, Playbook, and Recommendation generation. |
| **`GEMINI_MODEL`** | No | `gemini-2.5-flash` | Identifier of the active Gemini model. |
| **`NODE_ENV`** | No | `development` | Runtime mode: `development`, `production`, or `test`. |

### 3.2 Client-Side Variables (Publicly Accessible)
Variables prefixed with `VITE_` are injected at build time into client assets by Vite. Anything prefixed with `VITE_` is visible in the browser developer tools and must be treated as public.

| Variable Name | Required? | Default / Fallback | Description |
| :--- | :---: | :--- | :--- |
| **`VITE_APP_URL`** | No | `http://localhost:3000` | Canonical origin URL for deep links, metadata, and OAuth callbacks. |
| **`VITE_APP_TITLE`** | No | `BrainWise` | Application title rendered in browser tab and metadata. |

---

## 4. Configuration Validation Architecture (`src/config/env.ts`)

To prevent runtime failures caused by missing or misconfigured variables, BrainWise implements a centralized validation layer:

```typescript
// Client-safe configuration retrieval:
import { getClientConfig } from './config/env';
const clientConfig = getClientConfig();

// Privileged server configuration verification (throws if executed on browser):
import { validateServerConfig } from './config/env';
const serverConfig = validateServerConfig();
```

### Safety Guarantees:
1. **Window Guard:** `validateServerConfig()` immediately throws a fatal exception if invoked within a browser context (`typeof window !== 'undefined'`).
2. **Production Warnings:** If `NODE_ENV === 'production'` and `GEMINI_API_KEY` is omitted, the server emits a high-priority security warning to stdout and marks live AI capabilities as degraded (`status: 503`).

---

## 5. Local Setup Instructions

1. **Clone or pull the repository:**
   ```bash
   git checkout develop
   ```
2. **Generate local environment file:**
   ```bash
   cp .env.example .env.local
   ```
3. **Configure your local Gemini API key:**
   Open `.env.local` and replace `YOUR_GEMINI_API_KEY_HERE` with your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
4. **Launch development server:**
   ```bash
   npm run dev
   ```
