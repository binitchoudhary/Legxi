# LEGXI Enterprise Live Auction Platform
## Transfer-Service Contract Verification Report

### 1. Verification Target
- Target System: Existing local `transfer-service` (`c:\Users\DELL\Desktop\legxi\transfer-service`)
- Environment: Local Production Mock

### 2. Contract Verification Results

#### 1. HTTP Endpoint
- **Assumed**: `POST /v1/transfers`
- **Actual**: `POST /admin/transfers` (for primary creation) and `PUT /admin/transfers/:handle` (for secondary edits). 
- **Mismatch**: **YES**. The actual endpoints are admin routes.

#### 2. Authentication Mechanism
- **Assumed**: `Authorization: Bearer <token>`
- **Actual**: `x-admin-token: <secret>` (validated by `middleware/requireAdmin.js`).
- **Mismatch**: **YES**. The authentication uses a custom admin header, not Bearer tokens.

#### 3. Required Headers
- **Assumed**: `X-Correlation-ID`
- **Actual**: Needs `x-admin-token`. For PUT requests, it also logs `req.headers['x-admin-name']` for audit trails.
- **Mismatch**: **YES**. We need to send `x-admin-token` and optionally `x-admin-name`.

#### 4. Request Payload
- **Assumed**: `{ settlementId, auctionId, winnerId }`
- **Actual**: The transfer-service expects `{ certificate_id, owner_name, owner_phone, owner_email }` for POST. It expects `{ action: 'edit', fields: { ... } }` for PUT.
- **Mismatch**: **YES**. The adapter must resolve the `auctionId` to a `certificate_id`, and resolve the `winnerId` to `{ owner_name, owner_phone, owner_email }` before transmitting the payload to the transfer-service.

#### 5. Response Payload
- **Assumed**: Empty body (200 OK)
- **Actual**: Returns `{ transfer: record }` object. 
- **Mismatch**: **NO** (Adapter gracefully ignores the body in success cases).

#### 6. Status Codes
- **Assumed**: 2xx = Success, 4xx = Permanent Failure, 5xx = Transient Failure.
- **Actual**: POST returns `201 Created` or `409 Conflict` (if it already exists). PUT returns `200 OK` or `404 Not Found`. 
- **Mismatch**: **YES**. `409 Conflict` on a POST creation actually means the certificate was already created, which might indicate a successful idempotent retry rather than a permanent failure.

#### 7. Timeout Behaviour
- **Assumed**: Transient failure handled by RetryExecutor.
- **Actual**: Express app has no built-in custom timeout logic (relies on Cloud Functions 60s timeout). Adapter timeout logic is correct.
- **Mismatch**: **NO**.

#### 8. Retry Behaviour
- **Assumed**: RetryExecutor handles 5xx and timeouts.
- **Actual**: Correct.
- **Mismatch**: **NO**.

#### 9. Idempotency guarantee using settlementId
- **Assumed**: `transfer-service` accepts `settlementId` as an idempotency key.
- **Actual**: `transfer-service` does **NOT** accept or track `settlementId`. Idempotency on POST is loosely provided by `certificate_id` uniqueness (returning 409). Idempotency on PUT does not exist (it simply blindly applies updates).
- **Mismatch**: **YES**. The existing transfer-service does not guarantee idempotency using `settlementId`.

---

### 3. Required Adapter Changes (Resolution Plan)

To resolve these mismatches without modifying the frozen `transfer-service` or the `Authentication` logic, the `HttpTransferServiceAdapter` must be updated as follows:

1. **Authentication Header**: Change `Authorization: Bearer` to `x-admin-token: <secret>` using the existing configuration logic. Include `x-admin-name: AuctionPlatform`.
2. **Endpoint & Payload Transformation**:
   - The adapter must fetch the Auction details (to get `certificate_id`) and User Profile (to get `owner_phone`, `owner_name`).
   - The adapter must query `GET /admin/transfers/:handle` to check if the certificate already exists.
   - If it does not exist, send `POST /admin/transfers` with the full payload.
   - If it does exist, send `PUT /admin/transfers/:handle` with `{ action: 'edit', fields: { current_owner_phone, current_owner_name, ... } }`.
3. **Idempotency Reconciliation**:
   - Because the transfer-service does not support `settlementId` idempotency, the adapter must implement a local idempotent query (e.g. checking if the certificate's `current_owner_phone` already matches the `winner`'s phone). If they match, the transfer is already completed (idempotent success).
4. **Error Handling (409 Conflict)**: Treat 409 Conflict during POST as a potential success (meaning a retry hit an already-created record) or verify if it matches the current winner before deciding it's a failure.
