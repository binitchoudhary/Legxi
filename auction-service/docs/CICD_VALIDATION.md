# CI/CD Pipeline Validation

## 1. Pipeline Stages
The CI/CD pipeline ensures only verified code reaches production.

1. **Build**: TypeScript compilation (`npm run build`).
2. **Lint & Format**: Prettier and ESLint enforce code standards.
3. **Unit Tests**: Executing Jest against `src/domain` and `src/application` (pure logic).
4. **Integration Tests**: Testcontainers spin up PostgreSQL/Redis to validate adapters.
5. **Contract Tests**: Validates `transfer-service` mocks against Pact contracts.
6. **Security Scan**: `npm audit` for dependencies and Trivy for the Docker image.
7. **Database Validation**: Runs `npx prisma migrate status` or dry-runs `prisma migrate deploy` against a temporary schema to validate migration safety before deployment.
8. **Deployment**: Helm charts apply the manifest changes.
9. **Smoke Tests**: Validates `/health/ready` and basic API connectivity.
10. **Rollback**: Automatic Helm rollback if smoke tests fail within 5 minutes.
