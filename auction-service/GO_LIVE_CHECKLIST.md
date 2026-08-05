# Go-Live Checklist

## Infrastructure
- [ ] Production VPC configured and isolated.
- [ ] PostgreSQL multi-AZ deployment verified.
- [ ] Redis cluster configured with eviction policies.
- [ ] Kubernetes HPA minimums and maximums set.

## Security
- [ ] Secrets rotated and synced to Vault.
- [ ] Ingress TLS certificates active and verified.
- [ ] Security Groups / Firewalls restricted to minimum necessary ports.

## Performance
- [ ] Load testing targets achieved (5k bids/sec).
- [ ] Database connection pooling limits tested and adjusted.

## Monitoring & Alerting
- [ ] Prometheus scraping `/metrics` correctly.
- [ ] Datadog/Jaeger receiving traces via OTLP.
- [ ] PagerDuty integrations verified.

## Operational
- [ ] Runbooks approved and accessible to the on-call rotation.
- [ ] Database automated backups enabled (RPO 1h).
- [ ] Rollback pipeline tested in staging.
- [ ] DNS TTL lowered to 60s prior to switchover.
