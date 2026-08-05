# Phase 2.7 - Auction Application Services Implementation Plan

This phase introduces the core orchestration logic of the system. The Application Services act as the central nervous system, orchestrating inbound requests from the HTTP/WebSocket controllers and delegating persistence to the infrastructure layer via tightly defined repository interfaces (ports). 

Per architectural constraints, no application service will import Prisma, Redis, or BullMQ directly.

## User Review Required

> [!IMPORTANT]
> **Domain Rules and Extension Points**
> The prompt specifically prohibits implementing full auction rules in this phase. I will implement extension points (e.g. `// TODO: Phase 2.x - Auction Engine Logic`) and basic state validation, but complex auction engine calculations like bid increment limits are deferred.

## Proposed Changes

---

### Application Layer Ports (Interfaces)

To guarantee the Dependency Inversion Principle, we will define the required abstractions that the Application Services depend on.

#### [NEW] [IAuctionRepository.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/IAuctionRepository.ts)
Abstraction for fetching, listing, creating, and updating auctions.

#### [NEW] [IBidRepository.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/IBidRepository.ts)
Abstraction for fetching bids by auction and storing new bids.

#### [NEW] [IEventPublisher.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/IEventPublisher.ts)
Abstraction for publishing domain events (e.g. `AuctionCreated`, `BidPlaced`). This shields the application from knowing about BullMQ or Redis Pub/Sub.

#### [NEW] [ITimeProvider.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/ports/ITimeProvider.ts)
Abstraction for resolving time. Application Services must never call `new Date()` directly.

---

### Application Services (Implementations)

#### [NEW] [AuctionService.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/services/AuctionService.ts)
Implements `IAuctionService` from `src/api/services`.
Responsibilities:
- `listAuctions`: Invokes `IAuctionRepository`.
- `getAuction`: Fetches and validates auction existence.

#### [NEW] [BidService.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/services/BidService.ts)
Implements `IBidService` from `src/api/services`.
Responsibilities:
- `placeBid`: Validates request structure, validates auction existence and state, delegates persistence to `IBidRepository`, and publishes domain event via `IEventPublisher`. Defers all bid increment algorithms to future phases.
- `listAuctionBids`: Retrieves paginated bids.

#### [NEW] [AdminService.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/services/AdminService.ts)
Implements `IAdminService` from `src/api/services`.
Responsibilities:
- `createAuction`: Validates times using `ITimeProvider`, enforces business constraints (start < end), delegates creation to repository.

#### [NEW] [ApplicationErrors.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/application/exceptions/ApplicationErrors.ts)
Domain-specific exceptions extending `AppError` to mask infrastructure failures:
- `AuctionNotFoundError`
- `AuctionNotActiveError`
- `InvalidBidAmountError`

---

### Application Service Responsibility Matrix

| Service | Use Case | Repository Interfaces Used | Events Published |
|---|---|---|---|
| AuctionService | listAuctions | IAuctionRepository | None |
| AuctionService | getAuction | IAuctionRepository | None |
| BidService | placeBid | IAuctionRepository, IBidRepository | BidPlaced |
| BidService | listAuctionBids | IBidRepository | None |
| AdminService | createAuction | IAuctionRepository, ITimeProvider | AuctionCreated |

---

### Dependency Injection Wiring

#### [MODIFY] [app.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/app.ts)
Update `diContainer` to instantiate real services. For Phase 2.7, we will pass explicit infrastructure adapters into the Application Services. A `NoOpEventPublisher` implementation will be provided for `IEventPublisher` until the real event infrastructure phase.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify strict TypeScript adherence and zero architectural leakages.
- **Dependency Audit**: Ensure `src/application/services` contains zero Prisma, Redis, BullMQ, Shopify, or Firebase imports.

### Manual Verification
- A `PHASE_2_7_REPORT.md` will evaluate compliance against all Quality Gates (Architecture, Dependency Boundaries, Business Logic Isolation, Security, Observability, Maintainability).
