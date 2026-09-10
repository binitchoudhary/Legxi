FROM node:22-alpine

WORKDIR /usr/src/app

# Install build dependencies required for Prisma & Argon2 on Alpine
RUN apk update && apk add --no-cache openssl ca-certificates build-base python3

# Copy package descriptors
COPY package*.json ./
COPY tsconfig.json ./

# Copy Prisma schema specifically for the client generation step
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose the API port
EXPOSE 4000

# Start production server
CMD ["npm", "run", "start"]
