# Production Deployment Checklist — Phase 5 Milestone 1

## Milestone: Phase 5 – Milestone 1 Complete
**Target Scope:** Layer 4 Client Integration (Frontend Gateway, Auth Store, API Interceptors, Route Guards, Sockets)

---

### Pre-Deployment Verification

- [x] **1. Security Contract Verification**
  - `DEPLOYMENT_SECURITY_CONTRACT.md` remains unchanged and fully enforced.
  - Gateway exclusively signs/verifies JWTs and manages `legxi_session` & `legxi_refresh` cookies.
  - Browser never receives or persists raw tokens or refresh tokens.
  - Browser never transmits `x-user-context`.
  - Fastify authorizes strictly from trusted Gateway-injected `x-user-context`.

- [x] **2. Cookie Policy Compliance**
  - `legxi_session`: `HttpOnly=true`, `Secure=true`, `SameSite=Lax`, `Path=/`, `Max-Age=900` (15m).
  - `legxi_refresh`: `HttpOnly=true`, `Secure=true`, `SameSite=Lax`, `Path=/`, `Max-Age=604800` (7d).
  - Both cookies confirmed inaccessible to browser JavaScript (`document.cookie === ""`).

- [x] **3. Codebase Hygiene & Zero Debug Policy**
  - No temporary debug code or `console.log` statements in production routes.
  - No `TODO` comments or dead/commented code blocks.
  - Unused imports and variables stripped.

- [x] **4. Test Suite Execution**
  - Jest Unit & Integration Test Suites: `83 / 83 PASSED` (100% pass rate).
  - Playwright Browser End-to-End Test Suite: `4 / 4 PASSED` (100% pass rate).
  - All test suites execute against production build.

- [x] **5. Route & Redirect Safety**
  - Internal-only relative URL sanitizer verified.
  - Protocol injection attempts (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`) rejected.
  - External domain redirections (`https://evil.com`, `//evil.com`, `\evil`) rejected.

- [x] **6. Real-Time WebSocket Channel**
  - Connects strictly to `/api/proxy/socket.io` with `withCredentials: true`.
  - Zero token injection in handshake query or extra headers.
  - Session recovery and reconnect loop handling verified.

---

### Post-Deployment Health Check Steps

1. **Verify Session Hydration:**
   - Execute `GET /api/auth/session` on fresh guest browser: verify `401 Unauthorized`.
   - Verify unauthenticated user navigating to `/admin/dashboard` is redirected to `/login?redirect=%2Fadmin%2Fdashboard`.
2. **Verify User Login:**
   - Authenticate with valid credentials: verify `200 OK`, dual `Set-Cookie` response headers, and redirect to role-specific dashboard.
3. **Verify Token Rotation & Refresh:**
   - Wait 15 minutes or invalidate access token: make API request and verify seamless 401 interception, token rotation, and completed request without user disruption.
4. **Verify Clean Logout:**
   - Trigger Sign Out: verify `204 No Content` from `POST /api/auth/logout`, cookie invalidation (`Max-Age=0`), and redirect to `/login`.
