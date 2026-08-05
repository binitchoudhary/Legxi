# Working Platform Report & Architecture Discovery
**Date**: 2026-08-01

## Architecture & API Discovery
Before implementing any changes, a comprehensive audit of the backend (`auction-service`) and frontend (`auction-frontend`) was conducted to identify existing APIs and avoid duplication.

### 1. Auth & Users
- **Backend API**: No `/auth` or `/users` API routes exist in `auction-service`.
- **Implementation**: The backend expects an API Gateway to handle authentication. It reads a synthesized `x-user-context` header (via `IdentityContextProvider` in `src/modules/auth/adapters/identityContext.provider.ts`). 
- **User Data**: `MockUserService.ts` is currently used as a placeholder, explicitly stating: *"In a real implementation, this would fetch from Firebase Auth or a user database"*.
- **Auth Trace (The Root Cause)**: 
  - **Login**: The frontend form posts to the BFF route `/api/auth/session`.
  - **JWT/Cookie**: The current mock POST handler in the BFF returns a success JSON but **never sets the `legxi_session` HTTP-only cookie**.
  - **Middleware**: Next.js `middleware.ts` expects `legxi_session` to be present. Because it isn't set, it fails.
  - **Dashboard/RoleGuard**: Upon navigation to `/admin/dashboard`, the frontend `GET /api/auth/session` fails with 401 Unauthorized because the cookie is missing, causing `RoleGuard` to block access.

### 2. Shopify & Products
- **Backend API**: No dedicated Shopify API route or resolver exists. The `auction-service` treats `shopifyProductId` as an opaque string across `AuctionRepositoryAdapter`, `TransferRequestFactory`, and `AdminOperationalQueries`.
- **Frontend API**: No existing Shopify resolvers. The UI currently displays the raw GID (e.g., `gid://shopify/Product/...`).
- **Inventory Integration**: Shopify credentials exist in `.env`, but no active service is fetching product data in real-time for the frontend display.

### 3. Auctions & Bids
- **Backend APIs**:
  - `GET /auctions`, `GET /auctions/:id`
  - `POST /auctions/:id/bids`, `GET /auctions/:id/bids`
  - `POST /admin/auctions`, `POST /admin/auctions/:id/cancel`
- **Status**: Fully implemented in `auction-service` using Prisma.

### 4. Certificates & Transfers
- **Backend API**: Managed via `ITransferService`.
- **Implementation**: `CertificateTransferProcessManager.ts` handles idempotency and transfer orchestration by communicating with an external `transfer-service` (`MockTransferServiceAdapter` and `HttpTransferServiceAdapter` exist).

### 5. Payments
- **Backend API**: Handled internally via `RazorpayPaymentGateway.ts`. Webhooks are registered at `/webhooks/razorpay`.

### 6. Notifications & Images
- **Backend API**: No image hosting or notification APIs exist. Images are expected to be resolved via Shopify metadata. Notifications use a `MockProviders.ts` placeholder.

## Conclusion & Next Steps (Implementation Plan)
1. **Auth Fix**: Remove the mock BFF auth handler. Since the backend expects an upstream API gateway to manage tokens and inject `x-user-context`, we must implement a lightweight, functional auth proxy in the Next.js BFF that correctly signs a JWT, sets the `legxi_session` cookie, and forwards the `x-user-context` to the backend.
2. **Auction Seeding**: Automatically script the creation of auctions via `POST /admin/auctions` using the real active products identified in `SHOPIFY_INVENTORY_REPORT.md`.
3. **Shopify Resolver**: Build a read-only Shopify Storefront/Admin GraphQL proxy in the BFF to resolve `shopifyProductId` into Title and Images for the UI, since no such API exists.
4. **Browser Verification**: Execute the Playwright end-to-end flow to verify persistence.
