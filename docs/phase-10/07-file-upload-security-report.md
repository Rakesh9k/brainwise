# BRAINWISE — FILE UPLOAD & STORAGE SECURITY REPORT

**Project:** BrainWise  
**Document ID:** BW-PH10-07  
**Audit Date:** 2026-11-20  
**Status:** Certified Secure  

---

## 1. Storage Subsystem Security Controls

File upload security was audited across `src/server/services/storageService.ts` and `storage.rules`:

1. **Whitelisted MIME Types Only:**
   - Allowed: `image/svg+xml`, `image/png`, `image/jpeg`, `application/pdf`, `application/json`, `text/plain`.
   - Executables (`.exe`, `.sh`, `.bat`, `.dll`), HTML files (`.html`, `.htm`), and scripts are rejected with `INVALID_MIME_TYPE`.

2. **File Size Enforcement:**
   - Strict maximum limit of **10MB (10,485,760 bytes)**. Larger payloads rejected with `FILE_TOO_LARGE`.

3. **Storage Path Scoping & Sanitization:**
   - Files are stored under: `workspaces/{workspaceId}/{folder}/{timestamp}_{random4hex}_{sanitizedName}`.
   - File names sanitized to lowercase alphanumeric characters with dots, underscores, and hyphens (`[a-z0-9._-]`), truncating at 80 characters.
   - Path traversal attempts (`../../evil.png`) are neutralized during regex base sanitization.

4. **Signed URL Direct Access:**
   - Upload and download operations utilize temporary time-limited Signed URLs (15-minute TTL).
   - Public world-readable bucket ACLs are strictly disabled in `storage.rules`.

---

## 2. Attack Simulation Results

| Attack Vector | Payload / Target | Expected Result | Actual Result |
|---|---|---|---|
| **Disallowed MIME Upload** | `application/x-sh` (Shell script) | Throws `INVALID_MIME_TYPE` | **PASS (Blocked)** |
| **Oversized Upload** | 20MB PNG image | Throws `FILE_TOO_LARGE` | **PASS (Blocked)** |
| **Path Traversal in Download** | `workspaces/wsA/../../etc/passwd` | Throws `CROSS_TENANT_ACCESS_DENIED` | **PASS (Blocked)** |
| **Cross-Tenant Download Probe** | Workspace A requesting download for Workspace B file | Throws `CROSS_TENANT_ACCESS_DENIED` | **PASS (Blocked)** |
| **Malicious SVG Upload** | SVG with embedded `<script>alert(1)</script>` | Stripped by `sanitizeAiSvgMarkup` | **PASS (Sanitized)** |
