# Phase 1 Production Smoke Test Checklist

Run 2026-07-07, immediately after the `/version` + extended `/health` deploy. Every result below reflects an actual command run this pass, not an assumption.

## Verified Automatically

| Check | Result | Evidence |
|---|---|---|
| Old API unaffected | ✅ PASS | `api/health` → `{ok:true, ts:...}`, exact original shape (no new fields — proves `functions/index.js` untouched) |
| Dashboard data source (`/customer-products`) unaffected | ✅ PASS | Live call for phone `9870337308` → 1 customer returned, unchanged behavior |
| Pre-OTP ownership gate (`/check-ownership`) unaffected | ✅ PASS | Live call → `{hasOwnership: false}` (correct — this phone has no registry records, consistent with all prior investigation) |
| `transferApi` healthy | ✅ PASS | `/health` → `200`, `ok:true`, includes `service`, `runtime`, `uptime`, `version` |
| `transferApi` `/version` | ✅ PASS | Returns `{service, version, environment, status, buildTime, runtime, nodeVersion, firebaseFunctionsVersion}` |
| Admin panel receives request (via `transferApi`) | ✅ PASS | `/admin/transfers` → count 2, live data, matches pre-cutover byte-for-byte comparison against old `api` |
| History visible (via `transferApi`) | ✅ PASS | `/admin/history/:certificateId` → count 1, byte-identical to old `api`'s response (tested pre-cutover) |
| Ownership Transfer / Transfer-initiate auth gate | ✅ PASS | Both reject unauthenticated requests with `401 {"error":"Missing auth token"}`, identical to original |
| Old `api`'s transfer/admin routes still respond (rollback safety net intact) | ✅ PASS | `api/admin/transfers` still returns count 2 — dormant but functional, as designed |

## Requires Manual Verification

These need a real browser + real phone/OTP — I don't have access to either, so these remain your call to confirm:

- [ ] OTP Login
- [ ] Dashboard loads (visual/UI — data path already proven above)
- [ ] Certificates visible (rendering — data path already proven above)
- [ ] Ownership Transfer page loads (UI)
- [ ] Certificate selection (pure frontend interaction)
- [ ] Continue button (pure frontend interaction)
- [ ] Transfer form (pure frontend interaction)
- [ ] Submit request (needs a real Firebase ID token from OTP login — route-level 401 behavior already proven correct, but the full authenticated path with a real token hasn't been exercised by me)
- [ ] Registry updated (a real write — I deliberately did not trigger a live registry mutation just to test this; the write logic itself is an unmodified, verbatim port already proven correct against live data before deploy)
- [ ] Authentication unaffected (end-to-end user experience — backend-level proof above is strong, but a real login is the final word)
- [ ] Dashboard unaffected (end-to-end user experience)

## Summary

9 of 9 automatable checks: **PASS**. Zero regressions found in anything reachable without a live OTP session. The remaining manual items are UI/OTP-dependent by nature, not because anything is suspected broken.
