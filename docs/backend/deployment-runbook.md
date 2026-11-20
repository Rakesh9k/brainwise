# BrainWise Production Deployment Runbook

## 1. Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated.
- Firebase CLI (`firebase-tools`) installed.
- Target GCP project: `brainwise-production` (or staging equivalent).
- Necessary IAM permissions: Cloud Run Admin, Storage Admin, Service Account User, Secret Manager Admin, Firebase Admin.

---

## 2. Infrastructure Setup & Environment Secrets
1. **Enable Required Google Cloud APIs:**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     firestore.googleapis.com \
     storage.googleapis.com \
     cloudtasks.googleapis.com \
     secretmanager.googleapis.com \
     identitytoolkit.googleapis.com
   ```

2. **Configure Secrets in Secret Manager:**
   ```bash
   gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
   echo -n "your-gemini-api-key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
   ```

3. **Deploy Firestore Rules and Indexes:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

---

## 3. Container Build & Cloud Run Deployment

1. **Build and Validate Application:**
   ```bash
   npm run validate
   ```

2. **Build Container Image via Cloud Build:**
   ```bash
   gcloud builds submit --tag gcr.io/brainwise-production/brainwise-api:v1.0.0
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy brainwise-api \
     --image gcr.io/brainwise-production/brainwise-api:v1.0.0 \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated \
     --min-instances 1 \
     --max-instances 20 \
     --memory 1Gi \
     --cpu 1 \
     --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=brainwise-production,GCS_BUCKET_NAME=brainwise-production-storage \
     --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
   ```

4. **Verify Health Endpoint:**
   ```bash
   curl -s https://api.brainwise.app/api/health | jq .
   ```
