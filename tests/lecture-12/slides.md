---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 1.6rem; }
  code { font-size: 0.9rem; }
  h2 { color: #1a1a2e; }
  blockquote { color: #c0392b; border-left: 4px solid #c0392b; }
---

# Lecture 12
## Docker: Containerising the Test Runner

One image. One behaviour. Everywhere.

---

## The Problem Docker Solves

- Different Node versions per machine
- Different OS, different native binaries
- "Tests pass on my machine" — unacceptable

> Package the runner — eliminate the variable

<!-- note: the real cost of environment drift is not just annoyance. It means you cannot trust your test results. Docker makes the environment itself part of the artefact. -->

---

## The Dockerfile

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]
```

Seven lines. Five key decisions.

<!-- note: walk through each line. FROM picks the runtime. The ca-certificates line is not optional — without it HTTPS to the production API fails. WORKDIR sets context. The COPY order is the performance optimization. RUN installs deps. CMD is the default command. -->

---

## Layer Caching — Why Order Matters

| Instruction | When | Cache? |
|-------------|------|--------|
| `COPY package*.json ./` | build time | ✅ cached if unchanged |
| `RUN npm ci` | build time | ✅ cached if package.json unchanged |
| `COPY . .` | build time | ❌ runs every build |
| `CMD ["npm", "test"]` | runtime | — |

> Changing test code does **not** invalidate the npm ci cache layer

<!-- note: Docker caches each layer. If package*.json hasn't changed, it reuses the cached RUN npm ci result — saving 30-60 seconds. Putting COPY . . before npm ci destroys this. -->

---

## COPY Order Is Not a Style Choice

```dockerfile
# SLOW — every code change reinstalls all deps
COPY . .
RUN npm ci

# FAST — code changes reuse cached install layer
COPY package*.json ./
RUN npm ci
COPY . .
```

<!-- note: this is the single most important Dockerfile pattern. Stress it. The package files change rarely. The test files change constantly. Separating them exploits Docker's layer cache. -->

---

## RUN vs CMD

| Instruction | When | Used for |
|------------|------|---------|
| `RUN npm ci` | Build time | Install dependencies |
| `CMD ["npm", "test"]` | Container start | Default command |

- `RUN` creates a cached image layer
- Only the last `CMD` takes effect

<!-- note: RUN is baked into the image. CMD is recorded as metadata and executed when the container starts. You can override CMD at runtime: docker run image npm test path/to/file.ts -->

---

## Why `node:20-alpine`

- Alpine Linux — 40 MB vs ~900 MB full image
- No GUI tools, compilers, or system libraries needed
- Faster pull, faster CI, lower storage cost

> A test runner needs Node and npm — nothing else

<!-- note: the full node image includes build tools for compiling native addons. A pure TypeScript test suite needs none of that. Alpine is the right base for this use case. -->

---

## Alpine and CA Certificates

`node:20-alpine` strips everything non-essential — including the CA bundle.

```dockerfile
# Without this — HTTPS to api.codeandtest.com fails
RUN apk add --no-cache ca-certificates
```

- CA certificates are needed to verify TLS certificates
- Without them: connection refused or TLS verification error
- `--no-cache` keeps the image smaller (no apk package cache)

> Add this line immediately after `FROM node:20-alpine`

<!-- note: this is a real failure you will hit. The tests work locally because your Mac has CA certs. In Alpine they must be explicitly installed. The error message when this is missing is "UNABLE_TO_VERIFY_LEAF_SIGNATURE" or similar TLS error. -->

---

## .dockerignore

```
node_modules
dist
.env
.env.*
!.env.example
test-results
coverage
html
.git
```

- `node_modules` — Mac binaries break on Linux
- `.env` — secrets must not be baked into the image

<!-- note: if .dockerignore is missing, COPY . . copies your local node_modules into the image. Those may contain platform-specific binaries that crash on Linux. The .env exclusion is a security requirement, not a preference. -->

---

## Passing Secrets at Runtime

```bash
# Build — no secrets needed
docker build -t chatty-tests .

# Run — secrets injected at runtime
docker run --env-file .env chatty-tests
```

> `.env` stays on your machine — never enters the image

<!-- note: --env-file reads your local .env and passes each variable to the container as an environment variable. The file itself is not copied. Anyone with the image cannot extract your secrets. -->

---

## The `--env-file` Whitespace Trap

`.env` with a comment or trailing space:
```
TEST_USERNAME=vitestmike  # my test account
```

| | Value received |
|---|---|
| `dotenv` (local) | `vitestmike` ✅ |
| Docker `--env-file` | `vitestmike  # my test account` ❌ |

Signin sends the wrong username → 401 on every test.

**Fix — `.trim()` in `vitest.config.ts`:**
```ts
TEST_USERNAME: (process.env.TEST_USERNAME ?? '').trim(),
```

> `dotenv` strips comments. Docker does not. Always `.trim()`.

<!-- note: this is the single most confusing Docker failure in this course. Tests pass locally, fail in Docker with 401 everywhere. The error says "Token is not valid" — nothing points to the env var. The fix is one word: .trim(). -->

---

## docker-compose.yml — Persisting Results

```yaml
services:
  tests:
    build: .
    env_file: .env
    volumes:
      - ./test-results:/app/test-results
```

- Files inside a container disappear on exit
- Volume maps `./test-results` → `/app/test-results`

<!-- note: without the volume, test result XML files are written inside the container and lost when it stops. The volume mount makes them appear on your local filesystem. -->

---

## Common Mistakes

- `COPY . .` before `COPY package*.json` — slow rebuilds
- No `.dockerignore` — wrong platform binaries copied
- `.env` in image — secrets exposed
- `CMD npm test` (string form) — shell injection risk
- Missing `--env-file .env` — tests fail silently
- Missing `ca-certificates` — HTTPS fails on Alpine
- `.env` values with comments/spaces — 401 on every test (use `.trim()`)

<!-- note: the last two are the hardest to diagnose because the error messages don't point to the root cause. TLS errors and 401s look like API problems, not Docker configuration problems. -->

---

## Key Takeaways

- `COPY package*.json` before `COPY . .` — performance, not style
- Changing test code does not invalidate the npm ci layer
- `.env` passed at runtime with `--env-file` — never baked in
- `.dockerignore` must exclude `node_modules` and `.env`
- `apk add --no-cache ca-certificates` — Alpine needs this for HTTPS
- `.trim()` all env var values — Docker `--env-file` keeps whitespace/comments

<!-- note: the layer caching pattern is the most transferable lesson from this lecture. The ca-certificates and .trim() lessons are the most practically impactful — they explain failures that otherwise look completely unrelated to Docker. -->

---

## Homework

Infrastructure setup — no Vitest test files:

| Task | What it builds |
|------|----------------|
| 1 | Create `Dockerfile` with `ca-certificates` and env validation |
| 2 | Create `.dockerignore` |
| 3 | `docker build -t chatty-tests .` — clean build |
| 4 | `docker run --env-file .env chatty-tests` — 511/511 tests pass |
| 5 | Create `docker-compose.yml` with volumes |
| 6 | Add `.trim()` to env vars in `vitest.config.ts` |
| 7 | Add `hookTimeout: 30000` to `vitest.config.ts` |

After completing: your tests run identically on any machine with Docker installed.
