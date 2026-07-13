# Phase 1 Production Readiness Report

Date: 2026-07-07

## Architecture

```
Authentication                        Ownership Transfer          Admin
      ↓                                      ↓                      ↓
certificate-authentication.liquid   ownership-transfer.liquid   certificate-admin.liquid
      ↓                                      ↓                      ↓
     api                                transferApi              transferApi
(unchanged, production-locked)      (new, independent)        (new, independent)
```

Both `api` and `transferApi` are separate Firebase Functions Gen 2 (separate Cloud Run services, separate codebases, separate deploy commands) within the same Firebase project (`legxi-auth`). `shared/` is a source-of-truth folder copied in-tree (`transfer-service/_shared/`) at deploy time via a `predeploy` hook — not a live cross-service dependency.

## Deployment

- `functions:api` — Authentication, deployed 2026-07-07 ~12:15 PM (edition-fix cleanup), untouched since.
- `functions:transfer` (exports `transferApi`) — deployed twice: initial scaffold, then this session's additive `/version` + extended `/health`. Both deploys targeted only the `transfer` codebase.
- Frontend cutover done: `ownership-transfer.liquid` and `certificate-admin.liquid` now point at `transferApi`. `certificate-authentication.liquid` unchanged (still `api`), by design (see Debt #1).

## Remaining Risks

1. **`orders/paid` Shopify webhook still targets old `api`** (Debt #3) — functionally fine today, but a silent dependency that should be resolved before Phase 6 route removal. This is the single highest-priority open item.
2. **Old `api` still carries dormant transfer/admin routes** (Debt #2) — intentional rollback safety net, not a bug, but needs eventual cleanup (Phase 6).
3. **Shared config value on the Auth dashboard** (Debt #1) — low functional risk today, architectural cleanliness item for later.
4. Full customer-facing OTP → certificate-selection → transfer-initiation flow has not been exercised by me end-to-end with a real token — everything reachable without OTP is proven byte-identical to pre-migration behavior; the OTP-gated path is verified at the logic and route-auth level, not via an actual live click-through.

## Rollback Plan

Two theme settings (`ownership-transfer.liquid`'s and `certificate-admin.liquid`'s `api_base_url`) can be reverted to `https://api-7zal2ngszq-uc.a.run.app` in seconds via Shopify Admin — zero code deploy required. This works today because old `api`'s transfer/admin routes are still live and functional (Debt #2, kept deliberately for this exact reason).

## Technical Debt

See `PHASE_1_TECHNICAL_DEBT.md` — 3 items, none require immediate action, one (`orders/paid` webhook) recommended before Phase 6.

## Known Limitations

- No end-to-end browser/OTP test performed by me (no browser or phone access in this environment) — recommend one manual pass through OTP login → dashboard → transfer initiation → admin approval before considering burn-in complete.
- `transfer-service/.env` duplicates the same real Shopify admin token as `functions/.env`, in plaintext, in two places (accepted risk, per your earlier explicit approval — no git repo currently exists, so no VCS leak vector today).
- The stale, pre-fix `transfer-api/` scaffold at the project root has not been deleted — dead code, zero functional risk, but a source of future confusion if not archived (Phase 6, step 8).

## Recommended Next Phase

Phase 2, once you're ready — but recommend resolving Debt #3 (webhook repoint) first, and doing one manual OTP click-through, before treating burn-in as complete and proceeding to Phase 6 cleanup.

## Final Verdict

**🟡 Production Ready With Known Technical Debt**

Every automatable check passes, zero regressions found, Authentication is provably untouched, and the rollback path is fully intact. The "yellow" is not about anything broken — it's the honest state of: 3 documented debt items (none blocking), one real manual OTP verification still outstanding on your end, and a webhook subscription that should be repointed before Phase 6 removes its target route.
