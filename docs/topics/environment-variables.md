# Environment Variables in API Testing

## Table of Contents

1. [What Environment Variables Are](#1-what-environment-variables-are)
2. [Why Secrets Must Not Be Hardcoded](#2-why-secrets-must-not-be-hardcoded)
3. [The .env File Format](#3-the-env-file-format)
4. [The dotenv Package](#4-the-dotenv-package)
5. [process.env in Node.js](#5-processenv-in-nodejs)
6. [How vitest.config.ts Forwards Env Vars to Tests](#6-how-vitestconfigts-forwards-env-vars-to-tests)
7. [.env.example as Documentation](#7-envexample-as-documentation)
8. [Variables Used in This Course](#8-variables-used-in-this-course)
9. [What Happens When a Required Env Var Is Missing](#9-what-happens-when-a-required-env-var-is-missing)
10. [GitHub Actions Secrets as Env Vars](#10-github-actions-secrets-as-env-vars)
11. [Docker --env-file](#11-docker---env-file)
12. [Related Topics](#related-topics)

---

## 1. What Environment Variables Are

Environment variables are key-value pairs that exist in the *environment* of a running process. They are set outside your code — in your shell, a configuration file, or a CI/CD system — and your code reads them at runtime via `process.env`.

Think of them as configuration that changes depending on *where* your code runs:

| Environment | Values |
|-------------|--------|
| Local development | Test database, real dev credentials |
| CI pipeline | Separate test credentials, CI API keys |
| Production | Real secrets, production URLs |

Your code stays the same; only the environment changes.

```bash
# Shell: setting an env var for a single command
TEST_USERNAME=myuser npm test

# Shell: exporting for the whole session
export BASE_URL=https://api.codeandtest.com/api/v1
npm test
```

---

## 2. Why Secrets Must Not Be Hardcoded

**Never put passwords, API keys, tokens, or database connection strings directly in source code.**

### The risks

1. **Version control exposure**: Once a secret is committed to Git, it is in the repository history forever — even if you delete it in a later commit. Anyone with access to the repository (including public GitHub) can read it.

2. **Log exposure**: Code that hardcodes credentials is more likely to log them accidentally.

3. **Rotation difficulty**: If a secret is hardcoded, rotating it requires a code change, a review, and a deployment — instead of just updating an environment variable.

4. **Environment leakage**: A production secret in a test file means test environments have production access.

### Example of what NOT to do

```typescript
// NEVER do this
const response = await axios.post(`${BASE_URL}/auth/signin`, {
  username: 'myRealUsername',    // hardcoded — visible to everyone who reads the code
  password: 'myRealPassword123!' // NEVER hardcode passwords
});

// NEVER do this
const response = await axios.delete(
  `${BASE_URL}/test/cleanup/user/${authId}`,
  { headers: { 'x-test-secret': 'abc123secretvalue' } } // hardcoded secret
);
```

### The correct approach

```typescript
// Read from environment at runtime
const response = await axios.post(`${BASE_URL}/auth/signin`, {
  username: process.env.TEST_USERNAME,
  password: process.env.TEST_PASSWORD
});

const response = await axios.delete(
  `${BASE_URL}/test/cleanup/user/${authId}`,
  { headers: { 'x-test-secret': process.env.TEST_SECRET } }
);
```

---

## 3. The .env File Format

A `.env` file is a plain text file that lists key-value pairs, one per line. It lives in your project root.

### Syntax rules

```
# Lines starting with # are comments

# Keys are UPPER_SNAKE_CASE by convention
BASE_URL=https://api.codeandtest.com/api/v1

# Values do not need quotes for simple strings
TEST_USERNAME=vitestUser

# Use quotes if the value contains spaces or special characters
TEST_PASSWORD="my complex password!"

# Empty values are allowed
OPTIONAL_FLAG=

# No spaces around the = sign (some parsers allow it, but avoid it)
DATABASE_URL=mongodb://127.0.0.1:27017/chattyapp-backend
```

### The .env file for this course

```
# chatty-api-tests/.env
# DO NOT commit this file to version control

BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=yourTestUsername
TEST_PASSWORD=yourTestPassword
TEST_SECRET=yourTestSecret
DATABASE_URL=mongodb://127.0.0.1:27017/chattyapp-backend
```

### .gitignore

The `.env` file must always be listed in `.gitignore`:

```
# .gitignore
.env
.env.local
.env.*.local
```

Verify it is ignored before committing:

```bash
git check-ignore -v .env
# Output: .gitignore:1:.env   .env
# If no output, the file is NOT ignored — add it to .gitignore immediately
```

---

## 4. The dotenv Package

`dotenv` is a Node.js package that reads a `.env` file and loads the key-value pairs into `process.env`. Without it, the variables in your `.env` file would not be visible to your code.

### Installation

```bash
npm install --save-dev dotenv
```

### Manual loading (not needed in Vitest — see Section 6)

```typescript
// At the very top of your entry file or config
import 'dotenv/config';  // ES module style — loads .env automatically

// Or:
import dotenv from 'dotenv';
dotenv.config();  // reads .env from the current working directory

// Or specifying a path:
dotenv.config({ path: './config/.env.test' });
```

After `dotenv.config()` runs, all keys from the `.env` file are available on `process.env`.

### How dotenv resolves the file path

By default, `dotenv` looks for `.env` in `process.cwd()` — the directory where you ran the `node` command, typically the project root. If your tests are in a subdirectory, make sure to run them from the project root, or use an explicit path.

---

## 5. process.env in Node.js

`process` is a global object in Node.js. `process.env` is a plain JavaScript object whose properties are the environment variables of the current process.

```typescript
// Accessing an env var
const baseUrl: string | undefined = process.env.BASE_URL;

// The type is always `string | undefined`
// `undefined` if the variable was not set in the environment
```

### TypeScript type

TypeScript types `process.env` as `NodeJS.ProcessEnv`, where every key returns `string | undefined`. This means you must handle the `undefined` case:

```typescript
// This is a TypeScript error in strict mode:
const url: string = process.env.BASE_URL;
//                              ^^^^^^^^ Type 'string | undefined' is not assignable to 'string'

// Options:
// 1. Non-null assertion (only if you are sure it will exist)
const url: string = process.env.BASE_URL!;

// 2. Nullish coalescing with a fallback
const url: string = process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1';

// 3. Validate and throw at startup (recommended — see Section 9)
```

### Reading multiple env vars

```typescript
const {
  BASE_URL,
  TEST_USERNAME,
  TEST_PASSWORD,
  TEST_SECRET
} = process.env;

// All four are `string | undefined` — handle accordingly
```

---

## 6. How vitest.config.ts Forwards Env Vars to Tests

Vitest has built-in support for `.env` files and does not require you to manually call `dotenv.config()` in your test files.

### Automatic .env loading

By default, Vitest loads `.env`, `.env.test`, and `.env.local` automatically before running tests. Variables from these files are merged into `process.env` for all tests.

### vitest.config.ts

```typescript
// vitest.config.ts (project root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,  // prevents race conditions when tests share state
    reporters: ['verbose'],
    // Vitest automatically loads .env files — no extra config needed
    // But you can specify additional env files:
    // envFile: '.env.test'
  }
});
```

### Specifying a custom .env file

```typescript
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    env: loadEnv(mode, process.cwd(), ''),  // loads all variables from .env
  }
}));
```

### What this means for test files

Because Vitest loads `.env` before running tests, you can access `process.env.BASE_URL` directly in any test file without any import:

```typescript
// tests/lecture-01/lecture.test.ts
// No `import 'dotenv/config'` needed — Vitest handles it

describe('Health check', () => {
  it('API is reachable', async () => {
    const response = await axios.get(`${process.env.BASE_URL}/health`);
    expect(response.status).toBe(200);
  });
});
```

### Centralizing config

Rather than repeating `process.env.BASE_URL` everywhere, define a `config.ts` helper:

```typescript
// src/config.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable "${name}" is not set. Check your .env file.`);
  }
  return value;
}

export const config = {
  baseUrl: process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1',
  testUsername: requireEnv('TEST_USERNAME'),
  testPassword: requireEnv('TEST_PASSWORD'),
  testSecret: requireEnv('TEST_SECRET'),
  databaseUrl: process.env.DATABASE_URL,
} as const;
```

Then in tests:

```typescript
import { config } from '../../src/config';

const response = await axios.post(`${config.baseUrl}/auth/signin`, {
  username: config.testUsername,
  password: config.testPassword
});
```

---

## 7. .env.example as Documentation

Because the `.env` file is gitignored and never committed, a new team member cloning the repository has no way to know which variables are needed. The solution is a `.env.example` file:

- It IS committed to version control
- It lists all required variables with placeholder values or descriptions
- It explains what each variable is for

### Course .env.example

```
# chatty-api-tests/.env.example
# Copy this file to .env and fill in real values
# NEVER commit .env to version control

# The base URL of the Chatty API
BASE_URL=https://api.codeandtest.com/api/v1

# Credentials for a persistent test account (must exist in the database)
TEST_USERNAME=your-test-username-here
TEST_PASSWORD=your-test-password-here

# Secret for the cleanup endpoint — provided by the course instructor
# Used in: DELETE /api/v1/test/cleanup/user/:authId
TEST_SECRET=ask-instructor-for-this-value

# MongoDB connection string (only needed for direct DB checks)
DATABASE_URL=mongodb://127.0.0.1:27017/chattyapp-backend
```

### Onboarding workflow

```bash
# New developer setup
git clone https://github.com/yourorg/chatty-api-tests
cd chatty-api-tests
cp .env.example .env
# Edit .env with real values
npm install
npm test
```

---

## 8. Variables Used in This Course

| Variable | Type | Purpose |
|----------|------|---------|
| `BASE_URL` | URL string | Root URL of the Chatty API. Default: `https://api.codeandtest.com/api/v1` |
| `TEST_USERNAME` | string | Username for a pre-existing persistent test account used in sign-in tests |
| `TEST_PASSWORD` | string | Password for the persistent test account |
| `TEST_SECRET` | string | Value for the `x-test-secret` header on the cleanup endpoint |
| `DATABASE_URL` | MongoDB URI | Direct database connection for seeding or inspection (advanced lectures) |

### How each variable is used in test code

```typescript
// BASE_URL — every request
const response = await axios.get(`${process.env.BASE_URL}/health`);

// TEST_USERNAME and TEST_PASSWORD — persistent account sign-in
const signinResponse = await axios.post(
  `${process.env.BASE_URL}/auth/signin`,
  {
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD
  },
  { validateStatus: () => true }
);

// TEST_SECRET — cleanup after ephemeral test users
await axios.delete(
  `${process.env.BASE_URL}/test/cleanup/user/${authId}`,
  {
    headers: { 'x-test-secret': process.env.TEST_SECRET },
    validateStatus: () => true
  }
);

// DATABASE_URL — direct MongoDB operations (advanced)
import mongoose from 'mongoose';
await mongoose.connect(process.env.DATABASE_URL!);
```

---

## 9. What Happens When a Required Env Var Is Missing

If a test relies on `process.env.TEST_USERNAME` and it is not set, the variable is `undefined`. Passing `undefined` to Axios produces confusing behavior:

- The request body contains `{ username: undefined }`, which Axios serializes as `{}` (missing field)
- The API returns a 400 or 422 with a "field required" error
- The test fails with "expected 200, received 400" — with no hint that the env var is missing

The `config.ts` throw pattern catches this at startup instead:

```typescript
// src/config.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `\n\nRequired environment variable "${name}" is not set.\n` +
      `Create a .env file in the project root. See .env.example for the required variables.\n`
    );
  }
  return value;
}

export const config = {
  baseUrl: process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1',
  testUsername: requireEnv('TEST_USERNAME'),
  testPassword: requireEnv('TEST_PASSWORD'),
  testSecret: requireEnv('TEST_SECRET'),
};
```

When `TEST_USERNAME` is missing, you get this error as soon as the config module is imported — before any test runs:

```
Error: Required environment variable "TEST_USERNAME" is not set.
Create a .env file in the project root. See .env.example for the required variables.
```

This is much clearer than a cryptic 400 response from the API.

### Alternative: Vitest setup file

You can run the config validation in a Vitest setup file so it runs once before all tests:

```typescript
// tests/setup.ts
import { config } from '../src/config';  // importing this triggers the validation

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts']
  }
});
```

---

## 10. GitHub Actions Secrets as Env Vars

When your tests run in CI (GitHub Actions), you cannot have a `.env` file — it is gitignored. Instead, you store secrets in the GitHub repository settings and inject them as environment variables into the workflow.

### Setting up secrets in GitHub

1. Go to your repository on GitHub
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add: `TEST_USERNAME`, `TEST_PASSWORD`, `TEST_SECRET`, `BASE_URL`

### GitHub Actions workflow file

```yaml
# .github/workflows/test.yml
name: API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run API tests
        env:
          # Inject GitHub secrets as environment variables
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          TEST_SECRET: ${{ secrets.TEST_SECRET }}
        run: npm test
```

GitHub Actions automatically masks secret values in logs — they appear as `***` if printed.

### Verifying in the workflow

```yaml
- name: Verify env vars are set
  run: |
    if [ -z "$TEST_USERNAME" ]; then
      echo "TEST_USERNAME is not set"
      exit 1
    fi
    echo "Environment variables verified"
  env:
    TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
```

---

## 11. Docker --env-file

If you run your tests inside a Docker container (for example, using the `test-quest-sandbox` image), you can pass the `.env` file directly to Docker.

```bash
# Run tests inside a container, using the local .env file
docker run --env-file .env --rm chatty-api-tests:latest npm test

# Or pass individual variables
docker run \
  -e TEST_USERNAME=vitestUser \
  -e TEST_PASSWORD=Pass1234! \
  -e TEST_SECRET=abc123 \
  -e BASE_URL=https://api.codeandtest.com/api/v1 \
  --rm chatty-api-tests:latest npm test
```

### Docker Compose

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  api-tests:
    build: .
    env_file:
      - .env  # loads all variables from .env into the container
    command: npm test
```

```bash
docker-compose -f docker-compose.test.yml run api-tests
```

### The Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Do NOT copy .env into the image — pass it at runtime
CMD ["npm", "test"]
```

Note: `COPY . .` combined with `.dockerignore` prevents the `.env` file from being baked into the image:

```
# .dockerignore
.env
.env.*
node_modules
```

---

## Related Topics

- [TypeScript Basics](typescript-basics.md) — Why `process.env.X` is `string | undefined`; the `!` assertion and `requireEnv` pattern
- [Axios](axios.md) — How `BASE_URL` is used in every request; building the Axios instance with the base URL
- [Vitest](vitest.md) — `vitest.config.ts` options; how Vitest loads `.env` automatically before tests
- [Faker](faker.md) — Generating test usernames that do not require env vars; the `vitest` prefix requirement

## Official Documentation

- [dotenv npm package](https://www.npmjs.com/package/dotenv)
- [Twelve-Factor App — Config](https://12factor.net/config)
- [Node.js — process.env](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
