# BRAINWISE — PHASE 3: DEVELOPMENT STANDARDS & ENGINEERING GUIDELINES

**Document ID:** `BW-PHASE3-05`  
**Date:** November 19, 2026  
**Status:** Approved Standard  
**Author:** Principal Software Engineer & Code Quality Auditor  

---

## 1. Overview & Objectives

This document establishes the official development standards and engineering conventions for the BrainWise repository. All contributors and coding agents must strictly adhere to these guidelines to ensure code quality, maintainability, type safety, and architectural consistency across all 14 departments.

---

## 2. TypeScript Standards

BrainWise enforces strict TypeScript compiler options in `tsconfig.json`.

### 2.1 Compiler Configuration Directives
- **`strict: true`**: Activates the complete suite of strict type checking behaviors.
- **`noImplicitAny: true`**: Disallows variables, parameters, or return values that implicitly fall back to `any`.
- **`strictNullChecks: true`**: Guarantees that `null` and `undefined` are not assignable to domain types unless explicitly declared.
- **`noUnusedLocals: true`**: Compiler blocks builds if a declared local variable is not read.
- **`noUnusedParameters: true`**: Compiler blocks builds if a function parameter is unused (prefix with `_` if intentionally ignored by an interface contract).
- **`noEmit: true`**: TypeScript performs type checking only; bundling and transpilation are owned by Vite / esbuild.

### 2.2 Typing Best Practices
1. **Explicit Return Types:** Required on public service methods and utility calculations (`src/utils/`, `src/services/`).
2. **Elimination of `any`:** Avoid `any`. Use `unknown` for unchecked external payloads and narrow using type guards.
3. **Immutability:** Prefer `readonly` for domain models and state properties that must not be mutated in-place.
4. **No Suppressions:** Blanket `@ts-ignore` is forbidden. If a third-party type definition has a flaw, use a scoped `@ts-expect-error` with an explanatory comment referencing the tracking issue.

---

## 3. ESLint Configuration (Flat Config)

BrainWise uses **ESLint 9 / 10** with the modern flat configuration standard (`eslint.config.js`).

### 3.1 Key Active Rules & Justifications
- **`react-hooks/rules-of-hooks: error`**: Enforces canonical React hook execution rules.
- **`react-hooks/exhaustive-deps: warn`**: Ensures all effect dependencies are tracked.
- **`@typescript-eslint/no-unused-vars: [warn, { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]`**: Warns on unused variables unless prefixed with `_`.
- **`no-console: [warn, { allow: ['warn', 'error', 'info', 'log'] }]`**: Discourages stray debugging logs while permitting structured runtime output.
- **`react/react-in-jsx-scope: off`**: Disabled; React 19 JSX runtime automatically imports JSX factories.

---

## 4. Prettier Formatting Standards

Code formatting is enforced automatically via `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

Formatting check is run during CI via `npm run format:check`. Contributors can format all files via `npm run format`.

---

## 5. Naming & File Conventions

| Artifact | Convention | Example |
| :--- | :--- | :--- |
| **React Components** | PascalCase `.tsx` | `GrowthTrendChart.tsx`, `DashboardPage.tsx` |
| **Custom Hooks** | camelCase prefixed with `use` | `useBrainWise()`, `useWorkspaceBreadcrumbs()` |
| **Pure Utilities** | camelCase `.ts` | `logic.ts`, `truthCheck.ts`, `strategicMemory.ts` |
| **Test Files** | Match target with `.test.ts` / `.test.tsx` | `truthCheck.test.ts`, `apiClient.test.ts` |
| **Type Interfaces & Types** | PascalCase | `BusinessBrainData`, `ResearchReport` |
| **Constants & Enums** | UPPER_SNAKE_CASE | `BW_EASE`, `DIALOG_PLACEMENT_CLASSES` |
| **CSS Custom Properties** | kebab-case prefixed with `--bw-` | `--bw-orange`, `--bw-surface-elevated` |

---

## 6. Import Conventions & Path Aliasing

Path aliasing is configured via Vite and `tsconfig.json`:
- `@/*` maps to project root `./*`
- Prefer relative imports within a module or feature folder (`./dialogUtils`, `../types/brainwise`).
- Import grouping order:
  1. Node.js built-ins (`node:dns`, `node:path`, `node:test`).
  2. Third-party packages (`react`, `motion/react`, `lucide-react`).
  3. Internal types (`../types/brainwise`).
  4. Internal context, components, and design tokens.
  5. Internal utilities and services.

---

## 7. Standardized NPM Development Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launches local Express + Vite development server on port 3000. |
| `npm run build` | Compiles production client assets into `dist/`. |
| `npm run start` | Starts production Node.js Express server. |
| `npm run typecheck`| Executes strict TypeScript type validation (`tsc --noEmit`). |
| `npm run lint` | Lints codebase with ESLint. |
| `npm run lint:fix`| Automatically remediates auto-fixable ESLint rules. |
| `npm run format` | Automatically formats all source code with Prettier. |
| `npm run format:check` | Verifies code formatting conformance without modifying files. |
| `npm test` | Runs all 79 unit and integration tests via `tsx --test`. |
| `npm run test:watch` | Runs test runner in interactive file-watching mode. |
| `npm run test:e2e` | Executes Playwright responsive viewport audit (`tests/e2e-audit.ts`). |
| `npm run validate` | Master quality gate: executes typecheck, lint, format check, tests, and production build in sequence. |
