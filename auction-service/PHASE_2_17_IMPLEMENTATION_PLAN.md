# Phase 2.17 – Notification Engine & Event Dispatch Implementation Plan

This phase introduces an enterprise-grade Notification Engine designed to operate entirely reactively. Driven by Domain Events published by the Application Services, the Notification Engine completely decouples the core business logic (Auction Engine, Payment Flow) from external communication concerns.

## User Review Required

> [!IMPORTANT]
> **Out of Scope Affirmation**
> As requested, this phase will establish the robust queuing, templating, and dispatch abstractions. Real provider integrations (SendGrid, Twilio, etc.), user preferences, and UI are strictly excluded. Mock adapters will be provided for all external touchpoints.

## Proposed Changes

---

### Notification Engine Ports (Abstractions)

To ensure the domain remains unaware of notifications, and the notification engine remains unaware of specific vendors, we will define strict provider abstractions.

#### [NEW] [IEmailProvider.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/ports/IEmailProvider.ts)
Abstraction for sending transactional emails. Designed to support future provider failover (e.g. primary/secondary fallback logic).

#### [NEW] [ISmsProvider.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/ports/ISmsProvider.ts)
Abstraction for sending SMS messages.

#### [NEW] [IPushProvider.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/ports/IPushProvider.ts)
Abstraction for sending push notifications (e.g., WebSockets or FCM).

#### [NEW] [INotificationAuditStore.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/ports/INotificationAuditStore.ts)
Abstraction for idempotency checks and audit logging of all dispatched notifications. 
*Note: Uses a unique `NotificationId` alongside `CorrelationId` (event trace) and `EventId` to identify individual messages.*

---

### Core Notification Engine

#### [NEW] [NotificationDispatcher.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/engine/NotificationDispatcher.ts)
The central coordinator compatible with a future Transactional Outbox Pattern (events can be fed directly without architectural changes). It takes a rendered notification, enforces idempotency, evaluates `NotificationEligibilityPolicy`, logs the attempt to the Audit Store, and delegates to the correct provider.
It tracks the lifecycle states: `PENDING → QUEUED → PROCESSING → SENT → FAILED → DLQ`.

#### [NEW] [TemplateEngine.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/engine/TemplateEngine.ts)
A strongly-typed templating abstraction supporting template versioning (`templateName` + `version`) to map domain event payloads into localized messages.

#### [NEW] [NotificationEligibilityPolicy.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/policies/NotificationEligibilityPolicy.ts)
A policy abstraction that currently evaluates to `TRUE` for all users, establishing the architectural hook for future user preference logic.

---

### Event Subscribers

#### [NEW] [AuctionEventSubscriber.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/subscribers/AuctionEventSubscriber.ts)
Subscribes to events like `AuctionCreated`.

#### [NEW] [BidEventSubscriber.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/subscribers/BidEventSubscriber.ts)
Subscribes to events like `OutbidEvent`.

---

### Queueing & Resilience

#### [NEW] [NotificationRetryQueue.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/queue/NotificationRetryQueue.ts)
Defines the retry strategies for transient provider failures (e.g. rate limits). Provider failures will be classified into `Retryable` and `Non-Retryable` categories. 

#### [NEW] [NotificationDeadLetterQueue.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/notifications/queue/NotificationDeadLetterQueue.ts)
Captures permanently failed (`Non-Retryable`) notifications or exhausted retries.

#### Observability Metrics
Placeholder logic embedded into the queue/dispatcher for metrics tracking: queue depth, retries, failures, and dispatch latency.

---

### Infrastructure Adapters (Mocks)

#### [NEW] [MockProviders.ts](file:///c:/Users/DELL/Desktop/legxi/auction-service/src/infrastructure/adapters/notifications/MockProviders.ts)
Implements mock providers using logger outputs.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify strict TypeScript adherence and zero architectural leakages.
- **Dependency Audit**: Ensure `src/notifications` does not import any Domain models or Application Services directly.

### Manual Verification
- A `PHASE_2_17_REPORT.md` will evaluate compliance against the frozen architecture.
