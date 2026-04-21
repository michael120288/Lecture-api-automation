# Chatty API Tests — Test Runner Container
# Usage:
#   docker build -t chatty-tests .
#   docker run --env-file .env chatty-tests

FROM node:20-alpine

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./

# Clean install — same as CI
RUN npm ci

# Copy source and test files
COPY . .

# Run tests when container starts
CMD ["npm", "test"]
