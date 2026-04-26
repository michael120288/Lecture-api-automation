# Dockerfile for the chatty-api-tests test runner
# Build:  docker build -t chatty-tests .
# Run:    docker run --env-file .env chatty-tests
# Single: docker run --env-file .env chatty-tests npm test tests/lecture-02/lecture.test.ts

FROM node:20-alpine

WORKDIR /app

# Copy dependency files first — Docker caches this layer.
# If only source files change (not package.json), npm ci is skipped on rebuild.
COPY package*.json ./
RUN npm ci

# Copy source files (invalidates cache above only when code changes)
COPY . .

# Run all tests by default — override at docker run time
CMD ["npm", "test"]
