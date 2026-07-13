# Production Baseline

Snapshot date: 2026-07-07. This is the official reference state of production before Phase 2 begins.

## Current Architecture

```
Authentication                        Ownership Transfer          Admin
      ↓                                      ↓                      ↓
certificate-authentication.liquid   ownership-transfer.liquid   certificate-admin.liquid
      ↓                                      ↓                      ↓
     api                                transferApi              transferApi
```

## Cloud Run Services

| Service | Firebase Function | Codebase | Region |
|---|---|---|---|
| `api` | `api` | `default` (`functions/`) | us-central1 |
| `transferapi` | `transferApi` | `transfer` (`transfer-service/`) | us-central1 |

Both public (`run.googleapis.com/invoker-iam-disabled: true` annotation on each — a pre-existing org-policy workaround, not a standard IAM `allUsers` binding).

## URLs

| Service | URL |
|---|---|
| Authentication (`api`) | `https://api-7zal2ngszq-uc.a.run.app` |
| Ownership Transfer / Admin (`transferApi`) | `https://transferapi-7zal2ngszq-uc.a.run.app` |

## Health Endpoints

| URL | Returns |
|---|---|
| `https://api-7zal2ngszq-uc.a.run.app/health` | `{ ok, ts }` |
| `https://transferapi-7zal2ngszq-uc.a.run.app/health` | `{ ok, ts, service, runtime, uptime, version }` |
| `https://transferapi-7zal2ngszq-uc.a.run.app/version` | `{ service, version, environment, status, buildTime, runtime, nodeVersion, firebaseFunctionsVersion }` |

## Webhook Endpoints

| Topic | ID | Address | Owner |
|---|---|---|---|
| `orders/paid` | `1590964191406` | `https://transferapi-7zal2ngszq-uc.a.run.app/transfer/webhook` | Ownership Transfer |

This is the **only** webhook subscription in the store (confirmed via a full, unfiltered fetch of `/webhooks.json`). No Authentication webhooks exist.

**Known bug (pre-existing, not introduced by any migration):** HMAC verification on this route crashes on both a valid and invalid signature (`crypto.createHmac(...).update(req.body)` receives a parsed object instead of raw bytes, likely due to Firebase Functions v2's platform-level JSON body parsing preceding Express's own raw-body middleware). Confirmed present identically on the old `api` service before this migration — not a regression, but a real, currently-unresolved defect. Needs its own explicitly-approved fix.

## Firebase Functions

| Function | Codebase | Source | Exports |
|---|---|---|---|
| `api` | `default` | `functions/index.js` | `export const api = onRequest(app)` |
| `transferApi` | `transfer` | `transfer-service/index.js` | `export const transferApi = onRequest(app)` |

Deploy commands target codebases independently:
```bash
firebase deploy --only functions:api --project legxi-auth        # Authentication only
firebase deploy --only functions:transfer --project legxi-auth   # Ownership Transfer only
```
`transfer-service` has a `predeploy` hook (`node scripts/sync-shared.mjs`) that copies `shared/*.js` into `transfer-service/_shared/` before packaging — required because Firebase packages each codebase's directory in isolation (a `file:../shared` npm dependency does not survive that packaging, confirmed by an earlier failed deploy).

## Environment Variables

| Variable | `functions/.env` (Auth) | `transfer-service/.env` (Transfer) |
|---|---|---|
| `SHOPIFY_STORE` | ✅ | ✅ (duplicated) |
| `SHOPIFY_ADMIN_TOKEN` | ✅ | ✅ (duplicated — real value, plaintext, accepted risk per earlier explicit approval) |
| `SHOPIFY_API_VERSION` | ✅ | ✅ |
| `ALLOWED_ORIGINS` | ✅ | ✅ |
| `ADMIN_SECRET` | present, unused after Phase 6 | ✅ (used by `requireAdmin`) |
| `SHOPIFY_WEBHOOK_SECRET` | present, unused after Phase 6 | ✅ (used by webhook HMAC check — currently broken, see above) |
| `TRANSFER_FEE_AMOUNT` | present, unused after Phase 6 | ✅ (used by `/transfer/initiate`, `/admin/transfers` approve) |

Neither service uses GCP Secret Manager — both read plaintext `.env` files. Documented as accepted risk, not fixed.

## Theme Settings (live, verified this session)

| Section | Setting | Value |
|---|---|---|
| `certificate-authentication.liquid` | `app_proxy_url` | `https://api-7zal2ngszq-uc.a.run.app` |
| `certificate-authentication.liquid` | `transfer_api_url` | `https://api-7zal2ngszq-uc.a.run.app` (unchanged — shared with `/check-ownership`, see Technical Debt #1) |
| `ownership-transfer.liquid` | `api_base_url` | `https://transferapi-7zal2ngszq-uc.a.run.app` |
| `certificate-admin.liquid` | `api_base_url` | `https://transferapi-7zal2ngszq-uc.a.run.app` |

## Rollback Procedure

**Frontend (seconds, no deploy):** Revert `ownership-transfer.liquid`'s and `certificate-admin.liquid`'s `api_base_url` to `https://api-7zal2ngszq-uc.a.run.app` via the theme-settings JSON push mechanism (`fetch-push.mjs`, fetch-fresh-then-edit-then-push pattern — never hand-author the file).

**Webhook (seconds, no deploy):**
```bash
curl -X PUT "https://5ci887-xv.myshopify.com/admin/api/2025-10/webhooks/1590964191406.json" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"webhook":{"id":1590964191406,"address":"https://api-7zal2ngszq-uc.a.run.app/transfer/webhook"}}'
```

**Backend code (only if `transferApi` itself needs to be rolled back):** Old `api`'s transfer/admin routes remain live and functional (Debt #2) specifically so that reverting the two theme settings above is sufficient — no code rollback should ever be needed unless `functions/index.js` itself is changed in the future.

## Recovery Procedure

If `transferApi` is unreachable: (1) revert the two theme settings and the webhook address per above, (2) old `api` resumes serving all Transfer/Admin traffic immediately, zero data loss (same Shopify metaobject registry, same Firebase project). If `api` (Authentication) is ever unreachable: no equivalent fallback exists — Authentication has no redundant path, since OTP is Google-managed and `/customer-products`/`/check-ownership` have no alternate backend. Recovery there means fixing/redeploying `functions/index.js` directly.

## Open Items Before Phase 2 (from Technical Debt Register)

1. HMAC bug on `/transfer/webhook` — newly discovered this session, pre-existing, needs its own approved fix.
2. Shared config value on Auth dashboard (`transfer_api_url` serving both `/check-ownership` and `/transfer/lookup`).
3. Dormant transfer/admin routes in old `api` — intentional, remove per `PHASE_6_CLEANUP.md` once burn-in is over.
4. Stale `transfer-api/` legacy scaffold at project root — not deleted, dead code only.
