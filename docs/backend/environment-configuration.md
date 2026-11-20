# BrainWise Environment Configuration Specification

## 1. Configuration Management Strategy
BrainWise implements a typed configuration architecture validated at runtime startup using **Zod** in `src/server/config/index.ts`. If required production credentials or project parameters are missing or invalid, the server fails fast on initialization rather than failing unpredictably during request handling.

---

## 2. Environment Variables Specification

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `8080` | Port for the Express HTTP server |
| `NODE_ENV` | No | `development` | Runtime mode: `development`, `production`, `test` |
| `FIREBASE_PROJECT_ID` | Production | `brainwise-app` | Google Cloud / Firebase project ID |
| `GCP_PROJECT_ID` | Production | `brainwise-app` | Google Cloud Platform project ID |
| `FIREBASE_CLIENT_EMAIL`| Production | (Secret) | Service account email for Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Production | (Secret) | Service account private key (PEM format) |
| `GCS_BUCKET_NAME` | No | `brainwise-app-storage`| GCS bucket for marketing collateral & assets |
| `GEMINI_API_KEY` | Production | (Secret) | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model variant |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated in prod) |
| `RATE_LIMIT_WINDOW_MS`| No | `60000` (1 min) | Sliding window duration for rate limiter |
| `RATE_LIMIT_MAX` | No | `200` | Max requests per IP per window |

---

## 3. Secret Management in Google Cloud
In staging and production on Google Cloud Run:
- Plaintext secrets must **never** be committed to Git or stored in Docker images.
- Credentials (`GEMINI_API_KEY`, `FIREBASE_PRIVATE_KEY`) are stored in **Google Secret Manager**.
- Cloud Run mounts Secret Manager secrets as environment variables at runtime via service account identity permissions.
