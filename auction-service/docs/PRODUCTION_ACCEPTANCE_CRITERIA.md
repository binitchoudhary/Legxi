# Production Acceptance Criteria

This document defines the final gates that must be satisfied before full production Go-Live.

## 1. Performance Gates
- [ ] Sustained Auction Creation > 100 req/s.
- [ ] Bid throughput > 5,000 req/s.
- [ ] WebSocket P99 Fan-out Latency < 100ms.

## 2. Reliability Gates
- [ ] Automated failover of PostgreSQL verified.
- [ ] Reconnection logic of Redis/BullMQ validated.
- [ ] Zero event loss during simulated pod crashes.

## 3. Security Gates
- [ ] Penetration test / Vulnerability scan clean (No Critical/High vulnerabilities).
- [ ] TLS strictly enforced.
- [ ] All IAM roles strictly scoped to least privilege.

## 4. Observability Gates
- [ ] Dashboards populated via `/metrics` endpoint.
- [ ] Distributed Tracing functional in DataDog/Jaeger UI.
- [ ] Alert Manager successfully routing CRITICAL alerts to PagerDuty.

## 5. Operational Gates
- [ ] Runbooks updated and approved by SRE.
- [ ] RTO (4h) and RPO (1h) formally signed off by the business.
- [ ] Rollback strategy validated in staging.
