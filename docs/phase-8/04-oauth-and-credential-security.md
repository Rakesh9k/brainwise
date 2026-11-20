# BRAINWISE — PHASE 8: OAUTH 2.0 & CREDENTIAL SECURITY SPECIFICATION
**Document ID:** `docs/phase-8/04-oauth-and-credential-security.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Security Level:** Top Secret / Cryptographic Verification Standard  
**Status:** Approved & Implemented in Production  

---

## 1. Threat Model & Security Objectives

BrainWise handles sensitive third-party OAuth access tokens, refresh tokens, and API credentials. Exposure or mismanagement of these credentials would compromise both user trust and regulatory compliance (DPDPA, GDPR).

The security architecture mitigates four primary threat vectors:
1. **Database Snooping / Snapshot Leakage:** Plaintext tokens must never exist in Firestore. Even if an attacker gains database read access, stolen records cannot be decrypted without the master key.
2. **Cross-Tenant Privilege Escalation:** Multi-tenant workspaces must never be able to access, infer, or decrypt other tenants' credentials.
3. **OAuth CSRF & State Tampering:** State parameters passed to OAuth redirect URIs must be tamper-evident and immune to replay or modification.
4. **Authorization Code Interception:** Public clients or compromised networks must not be able to exchange intercepted authorization codes without the PKCE code verifier.

---

## 2. Authenticated Credential Encryption (AES-256-GCM)

### 2.1 Cryptographic Primitives
- **Cipher Algorithm:** `aes-256-gcm` (Galois/Counter Mode).
- **Initialization Vector (IV):** Cryptographically secure pseudo-random 96-bit (12-byte) IV generated per encryption operation via `crypto.randomBytes(12)`. IVs are never reused.
- **Authentication Tag:** 128-bit (16-byte) authentication tag computed by GCM to guarantee ciphertext integrity and authenticity.
- **Key Derivation:** Master key is derived using the `scrypt` key derivation function with fixed work factors and enterprise salt:
  ```ts
  this.masterKey = crypto.scryptSync(rawSecret, 'brainwise_credential_salt_v1', 32);
  ```

### 2.2 Storage Isolation Subcollection
Encrypted credentials are never saved inside standard workspace documents. Instead, they reside in a restricted subcollection:
```
workspaces/{workspaceId}/integrations/{integrationId}/secure/credentials
```
Stored payload schema:
```json
{
  "iv": "6f2e91b8a45210c4d8e79a01",
  "tag": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "ciphertext": "89ab12cd34ef56...",
  "keyId": "v1_master",
  "algorithm": "aes-256-gcm",
  "updatedAt": "2026-11-20T06:23:04.120Z"
}
```

### 2.3 Decryption Verification
During decryption, `decipher.setAuthTag(tag)` is verified prior to returning cleartext:
- If a single bit in the ciphertext, IV, or tag is altered, Node.js throws `Unsupported state or unable to authenticate data`.
- Cleartext credentials reside in transient V8 heap memory only during the active sync operation and are never cached in persistent global state.

---

## 3. OAuth 2.0 Lifecycle & Anti-CSRF Flow

```
+-----------+                    +--------------------+                    +------------------+
|  Browser  |                    |  BrainWise Server  |                    |  OAuth Provider  |
+-----+-----+                    +---------+----------+                    +--------+---------+
      |                                    |                                        |
      | 1. Connect Google Analytics 4      |                                        |
      +----------------------------------->|                                        |
      |                                    | 2. Generate State (HMAC + Nonce)      |
      |                                    | 3. Generate PKCE (Verifier + S256)     |
      |                                    | 4. Store State in Cache (TTL 15m)      |
      | 5. Return Auth URL + State         |                                        |
      |<-----------------------------------+                                        |
      |                                                                             |
      | 6. Redirect to Provider Authorization Screen                                |
      +---------------------------------------------------------------------------->|
      |                                                                             |
      | 7. User Grants Permission                                                   |
      | 8. Provider Redirects to Callback with Code & State                         |
      |<----------------------------------------------------------------------------+
      |
      | 9. POST /api/v1/integrations/oauth/callback (code, state)
      +----------------------------------->|
                                           | 10. Validate State (Check TTL & Nonce)
                                           | 11. Delete State (Prevent Replay)
                                           | 12. Exchange Code + PKCE Verifier
                                           +--------------------------------------->|
                                           |                                        |
                                           | 13. Return Access & Refresh Tokens     |
                                           |<---------------------------------------+
                                           |
                                           | 14. Encrypt Tokens (AES-256-GCM)
                                           | 15. Store in Secure Subcollection
                                           | 16. Log Audit Event (Sanitized)
      | 17. Connection Established (200 OK)|
      |<-----------------------------------+
```

### 3.1 State Token Architecture
- State parameter format: `bw_oauth_${crypto.randomBytes(24).toString('hex')}`
- Binding: State is indexed in-memory and bound to `workspaceId`, `providerId`, and `redirectUri`.
- Expiration: Strict 15-minute TTL (`STATE_TTL_MS = 15 * 60 * 1000`). Expired states are purged automatically.
- Replay Prevention: On first validation, `this.stateCache.delete(state)` immediately executes. Any secondary callback with the same state is rejected with `Invalid or expired OAuth state parameter`.

### 3.2 RFC 7636 PKCE Enforcement
- High-entropy code verifier generated via `crypto.randomBytes(32).toString('base64url')`.
- Code challenge generated using SHA-256 (`S256` method):
  ```ts
  crypto.createHash('sha256').update(verifier).digest('base64url');
  ```
- Challenge is sent to the authorization server; code verifier is provided during the final token exchange.
