# Local Development Startup Guide

This document provides step-by-step instructions for running the complete LegXI Auction system locally.

## Prerequisites

- Node.js (v18 or newer recommended)
- Docker Desktop (or Docker Compose)
- npm (Node Package Manager)
- Bash or PowerShell

## Environment Variables

### Backend (`auction-service/.env`)
Create a `.env` file in `auction-service/`:
```env
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/auction
REDIS_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=dummy
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ndummy\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=dummy@dummy.com
SHOPIFY_STORE=5ci887-xv.myshopify.com
SHOPIFY_ADMIN_TOKEN=your_token_here
SHOPIFY_API_VERSION=2025-10
```

### Frontend (`auction-frontend/.env.local`)
Create a `.env.local` file in `auction-frontend/`:
```env
SHOPIFY_STORE=5ci887-xv.myshopify.com
SHOPIFY_ADMIN_TOKEN=your_token_here
SHOPIFY_API_VERSION=2025-10
JWT_SECRET=development-super-secret-key-that-is-very-long
```

## Setup & Install Commands

1. **Start Infrastructure (PostgreSQL & Redis)**
   ```bash
   docker compose up -d
   ```
   *(Ensure you run this from the project root where `docker-compose.yml` is located).*

2. **Install Backend Dependencies**
   ```bash
   cd auction-service
   npm install
   ```

3. **Database Migrations**
   ```bash
   # From auction-service/
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Seed Database**
   ```bash
   # From auction-service/
   npm run seed-demo -- --reset
   ```
   *(This connects to the DB and populates it with active, ended, and upcoming auctions based on products from the Shopify store).*

5. **Install Frontend Dependencies**
   ```bash
   cd ../auction-frontend
   npm install
   ```

## Start Commands

### Development Mode
You will need two separate terminal windows.

**Terminal 1: Backend**
```bash
cd auction-service
npm run dev
```

**Terminal 2: Frontend**
```bash
cd auction-frontend
npm run dev
```

### Production Mode

**Backend Build & Start:**
```bash
cd auction-service
npm run build
npm start
```

**Frontend Build & Start:**
```bash
cd auction-frontend
npm run build
npm start
```

## Useful Commands

- **Check Docker Status:** `docker compose ps`
- **Stop Infrastructure:** `docker compose down`
- **Clear Database Data (Restart Seed):** `npm run seed-demo -- --reset`
- **Lint Code (Backend):** `npm run lint`
- **Lint Code (Frontend):** `npm run lint`
