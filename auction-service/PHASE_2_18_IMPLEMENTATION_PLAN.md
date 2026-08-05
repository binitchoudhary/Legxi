# Phase 2.18 – Settlement Aggregate Extraction & Technical Debt Elimination

This phase exists solely to eliminate technical debt introduced in Phase 2.15 by extracting payment-related responsibilities from the `Auction` aggregate into a dedicated `Settlement` aggregate. This restores strict bounded contexts before any new business features are introduced.

## User Review Required

> [!IMPORTANT]
> **No Feature Changes**
> As per instructions, this phase introduces NO new business logic. Existing payment flow, Webhooks, Notifications, and Idempotency/OCC boundaries will remain fully compatible with the rest of the frozen architecture.

## Proposed Changes

---

### Domain Layer (New Aggregate)

#### [NEW] [Settlement.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/domain/models/Settlement.ts)
The new Root Aggregate that completely encapsulates the payment flow for a won auction.
**Responsibilities:**
- `settlementId` (ULID)
- `auctionId` (Relation to the Auction)
- `winnerId` (User who won)
- `paymentState` (e.g., `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`)
- `paymentWindowOpenedAt` (Tracking checkout SLA)
- `paymentAttempts` (Retry count)
- `providerReference` (Stripe/Payment Gateway intent ID)
- `settlementStatus` (e.g., `INITIATED`, `COMPLETED`, `DEFAULTED`)
- `version` (For OCC)

---

### Ports & Repositories

#### [NEW] [ISettlementRepository.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/ISettlementRepository.ts)
Port for Settlement aggregate persistence.

#### [NEW] [ISettlementTransactionRepository.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/ISettlementTransactionRepository.ts)
Port for handling unit-of-work transactions involving Settlements (if cross-aggregate consistency is ever needed in outbox, though strict DDD prefers eventual consistency).

#### [MODIFY] [schema.prisma](file:///c:/Users/DELL/Desktop/legxi/auction-service/prisma/schema.prisma)
Add a `Settlement` model mapping to `settlements` table.
- Removes implicit payment state tracking from the `Auction` table (e.g. `SETTLED` status transitions will be driven by the Settlement aggregate).

#### [NEW] [SettlementRepositoryAdapter.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/infrastructure/adapters/SettlementRepositoryAdapter.ts)
Prisma adapter implementing `ISettlementRepository`.

---

### Application Services

#### [NEW] [SettlementService.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/services/SettlementService.ts)
The new orchestrator for the Settlement aggregate.
- Handles `initiateSettlement` (triggered by Auction close).
- Handles `processPayment` (delegated from Webhook/Payment engine).
- Handles timeouts.

#### [MODIFY] [AuctionService.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/services/AuctionService.ts)
- **Removal**: Strip out all logic related to tracking payment states, opening payment windows, or checking payment attempts.
- **Refactoring**: `AuctionService` now only manages bidding and closing the auction. When an auction closes with a winner, it emits an `AuctionClosedWithWinner` domain event, which the `SettlementService` (or a saga/process manager) listens to in order to initialize the Settlement.

---

### Migration Strategy

No data loss is permitted. A Prisma migration script will be generated to:
1. Iterate over all existing `Auction` records that have a `winningBidId` and a payment-related status (e.g. `SETTLED` or in-progress payment tracking).
2. Create corresponding `Settlement` records mapping the `auctionId`, the winner, and translating the embedded payment state into the new `SettlementStatus` and `PaymentState`.
3. Drop the redundant payment-tracking columns/statuses from the `Auction` table.

## Verification Plan

### Aggregate Boundaries
- Verify `AuctionService` and `Auction` model have zero knowledge of payments or settlements.
- Verify `SettlementService` exclusively modifies `Settlement`.

### Dependency Rules
- Verify architecture constraints hold (no Prisma imports in services, no Domain logic in infrastructure).

### Concurrency & OCC
- Ensure `Settlement` has a `version` field and `updateOptimistically` logic in its repository adapter, mirroring the safety of the `Auction` aggregate.

### Integration Compatibility
- Confirm that existing HTTP controllers and Webhook handlers map seamlessly to `SettlementService` rather than `AuctionService` for payment intents.
