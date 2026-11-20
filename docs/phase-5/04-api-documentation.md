# Phase 5: REST API Documentation
## Endpoints, Request Schemas, Responses & Error Contracts

**Document Version:** 1.0.0  
**Phase Status:** COMPLETE & VERIFIED  
**Date:** November 20, 2026  
**Base URL:** `/api/v1`  
**Transport Format:** JSON (`application/json`)  
**Standard Response Wrapper:** `{ success: boolean, data?: T, error?: string, code?: string, timestamp: string }`

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method & Path:** `POST /api/v1/auth/register`
- **Access:** Public
- **Description:** Registers a new founder account, generates scrypt password hash, and creates 6-digit email verification code.
- **Request Body:**
  ```json
  {
    "fullName": "Vikram Seth",
    "email": "vikram@zenithscale.io",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "uid": "usr_91a82f",
        "email": "vikram@zenithscale.io",
        "displayName": "Vikram Seth",
        "emailVerified": false,
        "onboardingStatus": "NOT_STARTED"
      },
      "token": "bw-token-usr_91a82f-1732049182",
      "verificationCode": "482910"
    },
    "timestamp": "2026-11-20T10:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (`VALIDATION_ERROR`): Missing fields or password fails entropy checks.
  - `409 Conflict` (`EMAIL_ALREADY_EXISTS`): Account with this email already exists.

---

### 1.2 Verify Email Code
- **Method & Path:** `POST /api/v1/auth/verify-email`
- **Access:** Public
- **Description:** Confirms user email with the 6-digit numeric code.
- **Request Body:**
  ```json
  {
    "email": "vikram@zenithscale.io",
    "code": "482910"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "uid": "usr_91a82f",
        "email": "vikram@zenithscale.io",
        "emailVerified": true,
        "onboardingStatus": "IN_PROGRESS"
      },
      "token": "bw-token-usr_91a82f-verified"
    },
    "timestamp": "2026-11-20T10:01:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (`INVALID_OR_EXPIRED_TOKEN`): Code mismatch or code expired.

---

### 1.3 Resend Verification Code
- **Method & Path:** `POST /api/v1/auth/resend-verification`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "vikram@zenithscale.io"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "sent": true,
      "message": "Verification code resent."
    },
    "timestamp": "2026-11-20T10:02:00.000Z"
  }
  ```

---

### 1.4 User Login
- **Method & Path:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "vikram@zenithscale.io",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "uid": "usr_91a82f",
        "email": "vikram@zenithscale.io",
        "emailVerified": true,
        "activeWorkspaceId": "ws_1a2b3c"
      },
      "token": "bw-token-usr_91a82f",
      "nextRoute": "onboarding",
      "activeWorkspaceId": "ws_1a2b3c"
    },
    "timestamp": "2026-11-20T10:03:00.000Z"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (`INVALID_CREDENTIALS`): Incorrect password or unknown email.

---

### 1.5 Password Recovery & Reset
- **Forgot Password:** `POST /api/v1/auth/forgot-password`
  - Body: `{ "email": "vikram@zenithscale.io" }`
  - Returns: `{ "sent": true, "message": "Password reset instructions dispatched." }`
- **Reset Password:** `POST /api/v1/auth/reset-password`
  - Body: `{ "token": "rst_randomTokenHex", "newPassword": "NewStrongPassword123!" }`
  - Returns: `{ "success": true, "message": "Password has been successfully updated." }`

---

### 1.6 Cascading Account Deletion
- **Method & Path:** `DELETE /api/v1/users/me/account`
- **Access:** Authenticated (`Authorization: Bearer <token>`)
- **Description:** GDPR/DPDPA right-to-be-forgotten endpoint. Deletes user account, removes active workspaces owned exclusively by the user, and purges onboarding sessions.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "deleted": true,
      "message": "Account and associated data deleted successfully."
    },
    "timestamp": "2026-11-20T10:05:00.000Z"
  }
  ```

---

## 2. Onboarding Endpoints

### 2.1 Fetch or Resume Session
- **Method & Path:** `GET /api/v1/onboarding/session`
- **Access:** Authenticated
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_91a82f",
      "userId": "usr_91a82f",
      "status": "IN_PROGRESS",
      "currentStage": 2,
      "currentStep": 1,
      "data": {
        "businessType": "Consumer brand",
        "businessName": "Aurora Botanical Wellness",
        "city": "Bengaluru",
        "country": "India"
      }
    },
    "timestamp": "2026-11-20T10:06:00.000Z"
  }
  ```

---

### 2.2 Incremental Save Answer (Autosave)
- **Method & Path:** `POST /api/v1/onboarding/save-answer`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "stage": 1,
    "step": 2,
    "answer": {
      "city": "Bengaluru",
      "country": "India",
      "targetMarket": "Metro India & SE Asia"
    }
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currentStage": 1,
      "currentStep": 2,
      "data": {
        "businessType": "Consumer brand",
        "businessName": "Aurora Botanical Wellness",
        "city": "Bengaluru",
        "country": "India",
        "targetMarket": "Metro India & SE Asia"
      }
    },
    "timestamp": "2026-11-20T10:07:00.000Z"
  }
  ```

---

### 2.3 Complete Onboarding
- **Method & Path:** `POST /api/v1/onboarding/complete`
- **Access:** Authenticated
- **Description:** Marks session completed and provisions workspace with initial business profile.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "completed": true,
      "workspaceId": "ws_1a2b3c",
      "nextRoute": "dashboard"
    },
    "timestamp": "2026-11-20T10:08:00.000Z"
  }
  ```

---

## 3. Business Brain Endpoints

### 3.1 Synthesize Business Brain from Onboarding
- **Method & Path:** `POST /api/v1/workspaces/:workspaceId/business-profile/generate`
- **Access:** Authenticated (Workspace Member)
- **Request Body:**
  ```json
  {
    "onboardingData": {
      "businessType": "Technology startup",
      "businessName": "Zenith Scale AI",
      "businessStage": "Early Traction",
      "city": "Hyderabad",
      "country": "India",
      "targetMarket": "Global Enterprise SaaS",
      "primaryPriorities": ["Scaling my business", "Understanding competitors"],
      "targetAudienceType": "B2B DevOps Directors",
      "isB2B": true,
      "differentiators": ["Technical Innovation", "Speed & Convenience"]
    }
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "businessName": "Zenith Scale AI",
        "approvalStatus": "DRAFT",
        "version": 2,
        "provenance": {
          "businessName": { "source": "USER_CONFIRMED", "confidence": 1.0 },
          "brandPositioning": { "source": "AI_INFERRED", "confidence": 0.85 }
        },
        "intelligence": {
          "summary": "Structured business profile established...",
          "informationGaps": ["Detailed unit economics breakdown"],
          "assumptions": ["Enterprise willingness to pay"]
        }
      },
      "modelUsed": "gemini-3.8-flash"
    },
    "timestamp": "2026-11-20T10:09:00.000Z"
  }
  ```

---

### 3.2 Approve Business Brain
- **Method & Path:** `POST /api/v1/workspaces/:workspaceId/business-profile/approve`
- **Access:** Authenticated (Workspace Member)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "businessName": "Zenith Scale AI",
        "approvalStatus": "APPROVED",
        "approvedAt": "2026-11-20T10:10:00.000Z",
        "approvedBy": "usr_91a82f",
        "version": 3
      }
    },
    "timestamp": "2026-11-20T10:10:00.000Z"
  }
  ```

---

### 3.3 Regenerate Business Brain (Preserving Confirmed Facts)
- **Method & Path:** `POST /api/v1/workspaces/:workspaceId/business-profile/regenerate`
- **Access:** Authenticated (Workspace Member)
- **Request Body:**
  ```json
  {
    "instructions": "Refine personas for mid-market procurement directors."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "profile": {
        "businessName": "Zenith Scale AI",
        "version": 4,
        "approvalStatus": "APPROVED"
      },
      "modelUsed": "gemini-3.8-flash"
    },
    "timestamp": "2026-11-20T10:11:00.000Z"
  }
  ```

---

### 3.4 Version History & 1-Click Rollback
- **List Versions:** `GET /api/v1/workspaces/:workspaceId/business-profile/versions`
  - Returns array of historical snapshots ordered by `versionNumber` descending.
- **Restore Historical Version:** `POST /api/v1/workspaces/:workspaceId/business-profile/versions/:versionId/restore`
  - Reverts `business_profile/main` to the historical snapshot and increments the version counter.
