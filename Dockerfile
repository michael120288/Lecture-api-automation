# Chatty API Tests — Test Runner Container
#
# Build:
#   docker build -t chatty-tests .
#
# Run (env vars required — never baked into the image):
#   docker run --env-file .env chatty-tests
#
# Run a single lecture:
#   docker run --env-file .env chatty-tests npm test tests/lecture-05/lecture.test.ts
#
# With docker-compose:
#   docker-compose up

FROM node:20-alpine

# Install CA certificates — required for HTTPS requests to api.codeandtest.com
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./

# Clean install — same as CI
RUN npm ci

# Copy source and test files (.env is excluded via .dockerignore — pass via --env-file)
COPY . .

# Validate required env vars before running tests
# Fails fast with a clear message rather than cryptic 401 errors
CMD ["/bin/sh", "-c", "\
  if [ -z \"$BASE_URL\" ]; then echo 'ERROR: BASE_URL is not set. Run with: docker run --env-file .env chatty-tests' && exit 1; fi && \
  if [ -z \"$TEST_USERNAME\" ]; then echo 'ERROR: TEST_USERNAME is not set.' && exit 1; fi && \
  if [ -z \"$TEST_PASSWORD\" ]; then echo 'ERROR: TEST_PASSWORD is not set.' && exit 1; fi && \
  npm test"]
