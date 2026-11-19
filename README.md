# BrainWise — AI Business Intelligence & Growth Platform

BrainWise is an autonomous AI business intelligence and growth platform that empowers founders, agency operators, and growth marketers to conduct empirical market research, track competitors, construct distinctive brand assets, and execute multi-channel growth campaigns.

---

## Technical Stack & Architecture

- **Frontend:** React 19 SPA, TypeScript 5.8, Vite 8, Tailwind CSS v4, Motion v12, Recharts v3, Lucide React
- **Backend / Gateway:** Node.js, Express, `@google/genai` (Server-side Gemini orchestration)
- **Quality Gates:** ESLint 9 (Flat Config), Prettier, strict TypeScript compiler options
- **Testing:** Node.js native test runner (`node:test` via `tsx --test`), Playwright v1.65 (E2E responsive audit)
- **Design Freeze:** React 19 Design Freeze strictly enforced across all 14 departments.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 22 LTS or higher
- npm 10+

### Installation & Execution
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy environment configuration template
cp .env.example .env.local

# 3. Add your Gemini API key in .env.local
# GEMINI_API_KEY="your-gemini-api-key"

# 4. Start local development server (Express Gateway + Vite HMR)
npm run dev
```

The application will be accessible at: `http://localhost:3000`

---

## Standardized Development Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts local Express + Vite dev server on port 3000. |
| `npm run build` | Compiles production assets into `dist/`. |
| `npm run start` | Executes production Node.js server. |
| `npm run typecheck`| Runs TypeScript static type checking (`tsc --noEmit`). |
| `npm run lint` | Verifies code quality with ESLint. |
| `npm run lint:fix`| Automatically fixes auto-remediable ESLint issues. |
| `npm run format` | Automatically formats codebase with Prettier. |
| `npm run format:check` | Verifies code style compliance with Prettier. |
| `npm test` | Executes the 79 automated unit and integration tests. |
| `npm run test:watch` | Runs unit tests in interactive file-watching mode. |
| `npm run test:e2e` | Runs Playwright multi-viewport responsive audit across 7 screen sizes. |
| `npm run validate` | Master quality gate: executes typecheck, lint, format check, tests, and build. |

---

## Project Structure

```
├── .github/
│   ├── workflows/ci.yml       # Automated GitHub Actions continuous integration
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
├── docs/
│   ├── design-freeze/         # Permanent Design Freeze specifications & screenshots
│   ├── phase-2/               # Master PRD (14 departments), architecture, and API contracts
│   └── phase-3/               # Phase 3 Codebase Audit & Engineering Foundation deliverables
├── public/                    # Static brand collateral & assets
├── src/
│   ├── assets/                # Curated editorial photography
│   ├── components/
│   │   ├── landing/           # Landing page interactive mockup components
│   │   ├── motion/            # Liquid physics and department transitions
│   │   ├── shell/             # Navigation shell, header, sidebar, breadcrumbs
│   │   └── ui/                # Shared design-system components (Dialog, DataTable, etc.)
│   ├── config/                # Environment variable validator (env.ts)
│   ├── context/               # Application state context (BrainWiseContext.tsx)
│   ├── data/                  # Mock prototype fixtures (mockData.ts)
│   ├── design/                # Design tokens (tokens.ts)
│   ├── pages/
│   │   ├── app/               # 10 application department view controllers
│   │   └── public/            # Landing, Auth, and Onboarding page views
│   ├── services/              # Central typed API client (apiClient.ts)
│   ├── theme/                 # 1.25 modular typography engine (typography.ts)
│   ├── types/                 # Master TypeScript domain models (brainwise.ts)
│   └── utils/                 # Truth Check guardrail, strategic memory, and pure logic
├── server.ts                  # Express server gateway & Gemini AI orchestration
└── vite.config.ts             # Vite 8 build & bundler configuration
```

---

## Architectural Guardrails

1. **Strict Video Exclusion:** BrainWise explicitly excludes AI video generation, video editing, Remotion scripts, text-to-video pipelines, or video credits. Visual collateral is strictly vector SVG, multi-frame carousels, and high-DPI print PDFs.
2. **Deterministic Truth Engine:** All AI-generated copy must pass through `truthCheck.ts` (`executeTruthCheck()`). Unverified pricing or fabricated claims trigger automated credit refunds.
3. **Anti-Fatigue Guardrail:** Campaign angles must register with `strategicMemory.ts` (`recordStrategicAngle()`) to prevent repetitive marketing angles.
4. **Two-Phase Credit Protocol:** Authoritative credit accounting executes strictly on the backend via atomic transactions (ADR-006). Never decrement credits on the client.

---

## License

Copyright © 2026 BrainWise. All rights reserved.
