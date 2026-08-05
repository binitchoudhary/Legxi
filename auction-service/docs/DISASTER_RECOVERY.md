# Disaster Recovery Strategy

> **NOTE:** The RTO and RPO values listed below are baseline engineering assumptions. They require formal business approval before Go-Live.

## 1. Objectives
- **Recovery Time Objective (RTO)**: 4 Hours. The maximum tolerable time to restore service after a complete regional failure.
- **Recovery Point Objective (RPO)**: 1 Hour. The maximum tolerable data loss based on PostgreSQL snapshot frequency.

## 2. Procedures
- **Database Restore**: Follow cloud provider instructions to restore PostgreSQL from the latest automated snapshot.
- **Redis Rebuild**: Redis is used for ephemeral queues and cache. No data restore required. Restart BullMQ workers to rebuild queues from PostgreSQL state.
- **Queue Recovery**: BullMQ workers rely on idempotency. Re-running events will not duplicate domain actions.
- **Transfer-Service Outage**: Queue size will grow. Adjust `RetryExecutor` delays via dynamic config if the outage exceeds 24 hours.
- **Secrets Rotation**: Executed via external Secrets Manager (e.g., AWS Secrets Manager, HashiCorp Vault). Application instances must be gracefully restarted to fetch new secrets.
- **Certificate Expiry**: Automated via Cert-Manager. If manual intervention is needed, update ingress TLS configurations and restart pods.
- **Backup Verification**: A cron job must dry-run a database restore in an isolated environment weekly to ensure snapshot integrity.
