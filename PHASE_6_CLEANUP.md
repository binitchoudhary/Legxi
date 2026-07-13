# Phase 6 Cleanup Plan

Documentation only — nothing in this file has been executed. This is the plan for the eventual removal of dormant Transfer/Admin routes from `functions/index.js`, once burn-in on `transferApi` is complete and you've decided the rollback safety net is no longer needed.

All routes below are currently **dormant but fully functional** in `functions/index.js` — reachable if called directly, but no longer the target of any frontend after the theme-settings cutover (except where noted).

---

## Routes to remove

| Route | Purpose | Can it be removed? | Dependency | Safe removal order | Rollback impact if removed too early |
|---|---|---|---|---|---|
| `POST /transfer/lookup` | Returns a customer's certificates by phone (via Firebase token) | Yes, once burn-in is complete | `requireFirebase`, `getCertsByPhone`, `resolveOrderEditions`, `parseOrderNoteGroups`, `buildCertId` | 5th (after webhook is repointed, see below) | Breaks instant-revert rollback for the Ownership Transfer page (theme setting could no longer be pointed back at `api`) |
| `POST /transfer/initiate` | Creates draft order + registry record to start a transfer | Yes, once burn-in is complete | `requireFirebase`, `getOwnershipByHandle`, `createOwnership`, `updateOwnership`, `rest()` (Shopify REST) | 6th | Same — breaks rollback path for initiating a transfer |
| `POST /transfer/webhook` | Marks a transfer `pending` when its draft-order invoice is paid (Shopify `orders/paid` webhook target) | **Not yet — see Debt #3** | `getOwnershipByHandle`, `updateOwnership`, `crypto` HMAC check | **Must be last**, and only after the live Shopify webhook subscription (topic `orders/paid`) is repointed to `transferApi`'s URL | **High** — if removed while the Shopify webhook subscription still targets `api`, real customer payments would stop updating transfer status (Shopify would receive 404s from a route that no longer exists, silently breaking the payment→pending transition) |
| `GET /admin/transfers` | List/search/filter all transfer registry records | Yes, once burn-in is complete | `requireAdmin`, `getAllOwnership` | 1st | Breaks admin-panel rollback |
| `GET /admin/transfers/:handle` | Fetch a single transfer record | Yes | `requireAdmin`, `getOwnershipByHandle` | 2nd | Same |
| `PUT /admin/transfers/:handle` | Approve / reject / edit a transfer | Yes | `requireAdmin`, `getOwnershipByHandle`, `createHistoryRecord`, `updateOwnership` | 3rd | Same |
| `POST /admin/transfers` | Manually create a registry record (historical/offline sales) | Yes | `requireAdmin`, `getOwnershipByHandle`, `createOwnership` | 4th | Same |
| `GET /admin/history/:certificateId` | Transfer history for one certificate | Yes | `requireAdmin`, `getHistoryByCertId` | 4th (alongside `POST /admin/transfers`) | Same |

## Recommended removal order (full sequence)

1. **First, resolve Debt #3** — repoint the live `orders/paid` Shopify webhook subscription to `transferApi`'s `/transfer/webhook` URL. Verify with a real (or test-mode) paid draft order that the webhook fires correctly against the new URL before proceeding.
2. Remove the four `/admin/*` routes from `functions/index.js` (admin panel has no rollback dependency once you're confident — it's low-traffic and easy to re-verify manually).
3. Remove `/transfer/lookup` and `/transfer/initiate`.
4. Remove `/transfer/webhook` **last**, and only after step 1 is confirmed working — this is the one route where removing too early has a real, silent-failure blast radius (a customer's money moves, but their transfer never advances).
5. After all routes are removed: drop the now-unused helper functions (`requireFirebase`, `requireAdmin`, `getCertsByPhone`, `resolveOrderEditions`, `parseOrderNoteGroups`, `normalizeEditionNum`, `normalizeTitleForGrouping`, `detectEditionType`, `buildCertId`, `buildHandle`, `createMetaobject`, `createOwnership`, `createHistoryRecord`, `getAllHistory`, `getHistoryByCertId`, `updateOwnership`, `getOwnershipByHandle`) and the `firebase-admin` import + `admin.initializeApp()` call + dependency from `functions/package.json`.
6. Drop `ADMIN_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `TRANSFER_FEE_AMOUNT` from `functions/.env` — no longer read by anything in the Auth-only file.
7. Redeploy `functions:api` (Auth only) as the final, single confirmation step.
8. Retire the stale `transfer-api/` directory (the pre-fix legacy scaffold, never used in production) — delete or archive.

## What NOT to do

- Do not remove any route before its rollback value has genuinely expired (i.e., before you're confident `transferApi` is stable).
- Do not remove `/transfer/webhook` before Debt #3 is resolved — this is the one step with real, non-cosmetic risk.
- Do not touch anything in this list until you've explicitly decided Phase 5 (burn-in) is over.
