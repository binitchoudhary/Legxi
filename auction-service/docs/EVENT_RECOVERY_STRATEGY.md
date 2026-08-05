# Domain Event Reconciliation & Recovery Strategy

## Context
In Phase 2.14, we employ an in-memory collection of domain events (`BidEvaluationResult.eventsToPublish`) that are published strictly *after* the optimistic database transaction commits successfully. 
While this guarantees we never publish "ghost" events from rolled-back transactions, it introduces a small vulnerability window: if the Node.js process crashes immediately *after* the DB commit but *before* the `EventPublisher` successfully dispatches all events, the events are lost.

## Current Vulnerability Window
1. `COMMIT` (Success)
2. `EventPublisher.publish()` -> **CRASH**
3. Event lost, but DB state is permanently updated.

## Interim Reconciliation Strategy (Pre-Outbox Pattern)
Until an Outbox Pattern is explicitly prioritized, the following manual/semi-automated reconciliation steps are required:

### 1. Audit Logging
Every atomic transaction must structurally log the success of the DB commit alongside a unique `TransactionID` and the array of `EventTypes` that are about to be published.
If a crash occurs, the central log aggregator (e.g. Datadog/ELK) will show a `Transaction_Committed` log *without* a corresponding `Events_Published` log.

### 2. Idempotent Repair Scripts
We maintain a suite of idempotent reconciliation scripts (`scripts/reconcile-events.ts`) that:
- Query the database for state that should have emitted an event (e.g., `Auction` where `status === 'READY_FOR_SETTLEMENT'`).
- Query the downstream consumer (or Event Store, if tracking) to see if the event was received.
- Re-emit the event if missing.

### 3. Downstream Idempotency
All downstream consumers of Domain Events *must* implement idempotent handlers. If a repair script accidentally double-publishes a `AuctionClosed` event, the downstream system (e.g., Settlement Service) must discard the duplicate via a unique idempotency key (typically `AuctionID` + `Version`).

## Future Mitigation
In a future phase, this will be resolved by the **Transactional Outbox Pattern**:
1. Events are written to an `Outbox` table in the *same* SQL transaction as the state update.
2. A background worker (or Debezium CDC) reliably polls the Outbox and publishes to the message broker.
