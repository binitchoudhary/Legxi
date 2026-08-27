FROM node:20-slim

# Install build tools for native dependencies (like better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json
COPY backend/package.json ./

# Install dependencies
RUN npm install --production

# Copy backend source
COPY backend/src ./src

# Copy built frontend assets
COPY backend/public ./public

# Create volumes directories
RUN mkdir -p /usr/src/app/data /usr/src/app/logs && chown -R node:node /usr/src/app

# Run as non-root user
USER node

# Expose API port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
