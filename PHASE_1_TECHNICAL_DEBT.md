# Phase 1 Technical Debt Register

Snapshot as of 2026-07-07, immediately after the Ownership Transfer / Authentication backend split and frontend cutover. All items below were verified against live production configuration, not assumed.

---

## Debt #1 — `certificate-authentication.liquid` shares one config value across two domains

**Description:** The Authentication dashboard's frontend JS reads a single settings field, `transfer_api_url`, for two semantically different calls:
- `POST /check-ownership` (line ~1099) — an **Authentication** concern (pre-OTP ownership gate)
- `POST /transfer/lookup` (line ~1305) — a **Transfer** concern (used only to compute the "hide already-transferred certificate" set)

Both currently resolve to the same URL (`transfer_api_url`, currently still `https://api-7zal2ngszq-uc.a.run.app`), so both calls land on the old `api` service today.

**Why it exists:** `/check-ownership` lives in `functions/index.js` permanently (Authentication owns it) and is never moving. `/transfer/lookup` has moved to `transferApi`. But the frontend variable backing both calls wasn't split when the section schema was originally authored — one setting was reused for both, presumably because they used to be the same backend by design. Splitting it requires editing `certificate-authentication.liquid`'s code (both the settings schema and the two call sites), which is Authentication frontend — explicitly locked.

**Risk level:** Low-medium. No current functional risk — both calls work correctly against `api` today (its `/transfer/lookup` route is still live, Phase 6 pending). The risk is architectural drift: if `api`'s dormant transfer routes are ever removed (Phase 6) before this is fixed, the dashboard's "hide transferred cert" check will start failing (404), even though the actual Ownership Transfer page will be unaffected.

**Recommended future solution:** Split the single `transfer_api_url` setting into two independent schema fields:
- `auth_api_base_url` (or keep `app_proxy_url` and reuse it directly for `/check-ownership`, dropping `transfer_api_url` for that call entirely)
- `transfer_api_base_url` (used only for the dashboard's `/transfer/lookup` call, pointed at `transferApi`)

This requires a small, explicit, separately-approved edit to `certificate-authentication.liquid` (schema + 2 call sites) — a genuine Authentication frontend change, so it needs its own sign-off despite being low-risk, per the current production-lock rule.

**Should we fix now?** **NO.** Explicitly out of scope for Phase 1 closure (documentation-only), and touching Authentication frontend requires separate approval regardless of how small the change is.

---

## Debt #2 — Old `api` still contains all Transfer/Admin routes (dormant, unremoved)

**Description:** `functions/index.js` still physically contains `/transfer/lookup`, `/transfer/initiate`, `/transfer/webhook`, and all `/admin/*` routes, byte-for-byte identical to what's now also running in `transfer-service/`. They are reachable if called directly (confirmed live: `api/admin/transfers` still returns data) but are no longer the target of the Ownership Transfer or Admin frontend after cutover.

**Why it exists:** This is deliberate rollback protection, per the approved migration plan (Phase 5 — burn-in). Keeping them live and functional means reverting the two theme settings back to the old `api` URL is a zero-code, seconds-long rollback if `transferApi` shows any problem during burn-in.

**Risk level:** Low, and intentional — this is a safety net, not an oversight. The only real risk is if these dormant routes are forgotten and never cleaned up (permanent duplication, defeating the purpose of the split, and a source of future confusion for anyone reading `functions/index.js` and wondering why "Authentication" contains transfer logic).

**Recommended future solution:** Remove them in Phase 6, after an agreed burn-in period with no incidents. See `PHASE_6_CLEANUP.md` for the exact route-by-route removal plan.

**Should we fix now?** **NO.** Do not remove — this is exactly the rollback protection Phase 5 depends on.

---

## Debt #3 — `orders/paid` Shopify webhook subscription still targets old `api` (newly discovered this pass)

**Description:** The live Shopify webhook subscription for topic `orders/paid` (verified via a direct, read-only Shopify Admin API call) has `address: "https://api-7zal2ngszq-uc.a.run.app/transfer/webhook"`. This was never touched by the theme-settings cutover, because it isn't a theme setting at all — it's a Shopify-side webhook subscription, created once by `scripts/setup-transfer-system.mjs` back on 2026-06-16, targeting the URL that existed at the time.

**Why it exists:** Nobody had reason to check it until this audit — the theme-settings cutover only covered the three `.liquid` sections' own settings, and webhook subscriptions live entirely outside the theme. This is a genuine gap that wasn't part of any previous phase's explicit checklist.

**Risk level:** Medium. Functionally harmless *today* (old `api`'s `/transfer/webhook` route is still live and working, so payment-completion → `transfer_status: 'pending'` updates still happen correctly). But it means the transfer-payment-completion flow has a **silent, undocumented dependency on `api` staying up**, contradicting the goal of full independence — and if Phase 6 removes `api`'s transfer routes before this webhook is repointed, transfer payments would stop updating the registry with no obvious symptom until a customer's payment succeeds but their transfer status never advances.

**Recommended future solution:** Update the webhook subscription's `address` to `https://transferapi-7zal2ngszq-uc.a.run.app/transfer/webhook` via the Shopify Admin API (`PUT /webhooks/{id}.json`) — a config-only change, same risk class as the theme-settings cutover already performed.

**Should we fix now?** **NO** for this task (documentation-only per your instructions), but flagging it as **higher priority than Debt #1** — recommend addressing this before Phase 6, ideally alongside or right after this closure, since it's a real (if currently dormant) correctness gap rather than a pure cosmetic/architectural nicety.

---

## Summary Table

| # | Item | Risk | Fix now? |
|---|---|---|---|
| 1 | Shared config value for `/check-ownership` + `/transfer/lookup` on Auth dashboard | Low-medium | NO |
| 2 | Dormant transfer/admin routes in old `api` | Low (intentional) | NO |
| 3 | `orders/paid` webhook still points at old `api` | Medium | NO (but prioritize before Phase 6) |
