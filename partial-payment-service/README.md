# LEGXI Partial Payment Service

An independent microservice that provides partial payment functionality for LEGXI's Shopify Admin.

## Infrastructure
- **Node.js**: v20+
- **Database**: SQLite (via `better-sqlite3`)
- **Containerization**: Docker & Docker Compose

## Quick Start (Local Development)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## Production Deployment (Docker)
This service is designed to be deployed as a standalone container.

1. Build and run the container using Docker Compose:
   ```bash
   docker compose up -d --build
   ```
2. The SQLite database and structured logs will be persisted automatically via Docker volumes (`sqlite_data` and `app_logs`).

## API Endpoints
- `GET /api/v1/health` - Basic health check and uptime.
