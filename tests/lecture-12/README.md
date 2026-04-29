# Lecture 12 — Docker: Containerising the Test Runner

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 11 — GitHub Actions CI/CD pipeline.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (run tests in Docker):
> ```bash
> docker build -t chatty-tests .
> docker run --env-file .env chatty-tests
> ```

---

## What You Will Learn

- What Docker is and why containerised tests run identically everywhere
- `Dockerfile` for the test runner — not the API server
- `docker-compose.yml` for running tests with env vars
- `.dockerignore` — what to exclude from the container
- Difference between `CMD` and `ENTRYPOINT`
- Passing `.env` to the container — `--env-file`
- Multi-stage builds — separate install from run
- **`ca-certificates` on Alpine** — why HTTPS to production APIs requires it
- **The `--env-file` whitespace trap** — Docker vs dotenv parse `.env` differently
- **`hookTimeout`** — why Docker needs more time for the first request than local

> **Reference Topics**
> - Docker deep-dive reference → [`docs/topics/docker.md`](../../docs/topics/docker.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Docker for Tests? |
| 2 | Dockerfile |
| 3 | `.dockerignore` |
| 4 | Build and Run |
| 5 | `docker-compose.yml` |
| 6 | Multi-stage Build |
| 7 | The `--env-file` Whitespace Trap |
| 8 | vitest.config.ts for Docker |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Why Docker for Tests?

Problem: "Works on my machine" — tests pass locally but fail in CI or on a colleague's laptop.

Solution: Docker packages the test runner (Node.js, npm, all dependencies) into a container.
The same container runs identically on your Mac, Windows, Linux, or GitHub Actions.

---

## 2. Dockerfile

**Start with the minimal version — this is enough to understand Docker:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
```

**`RUN` vs `CMD` — the most important Docker distinction:**

| Instruction | When it runs | Used for |
|------------|-------------|---------|
| `RUN npm ci` | **At build time** — when you run `docker build` | Installing dependencies |
| `CMD ["npm", "test"]` | **At container start** — when you run `docker run` | Default command at launch |

`RUN` creates a new image layer. `CMD` does not — it just records what to run at startup. There can only be one `CMD`.

**`alpine`** — minimal Linux image (~40 MB vs ~900 MB for the full Node image). Perfect for a test runner.

**Why copy `package*.json` before `COPY . .`?**
If only test files change (not `package.json`), Docker reuses the cached `RUN npm ci` layer — much faster rebuilds.

---

**Production-ready version — what the actual `Dockerfile` contains:**

The version above works locally. For Docker and CI reliability, three additions are needed:

```dockerfile
FROM node:20-alpine

# 1. CA certificates — node:20-alpine ships without them.
#    Without this, HTTPS to api.codeandtest.com fails with TLS errors.
RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

# 2. Env var validation — fails fast with a clear message instead of
#    cryptic 401 errors when BASE_URL or TEST_USERNAME is not set.
CMD ["/bin/sh", "-c", "\
  if [ -z \"$BASE_URL\" ]; then echo 'ERROR: BASE_URL is not set. Run with: docker run --env-file .env chatty-tests' && exit 1; fi && \
  if [ -z \"$TEST_USERNAME\" ]; then echo 'ERROR: TEST_USERNAME is not set.' && exit 1; fi && \
  if [ -z \"$TEST_PASSWORD\" ]; then echo 'ERROR: TEST_PASSWORD is not set.' && exit 1; fi && \
  npm test"]
```

The extra lines look intimidating but each solves a specific real-world failure:

| Addition | Problem it solves |
|----------|------------------|
| `ca-certificates` | TLS verification fails on Alpine without system CA bundle |
| env validation in CMD | Missing env vars cause 401 on every test — unclear why |

---

## 3. `.dockerignore`

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

**Why exclude `node_modules`?**
The container installs its own `node_modules` via `RUN npm ci`.
Copying your local `node_modules` would be slower and might contain wrong platform binaries
(e.g. Mac binaries that don't run on Linux).

**Why exclude `.env`?**
Secrets are passed as environment variables at runtime, not baked into the image.
An image with secrets baked in is a security risk (anyone with the image can extract them).

---

## 4. Build and Run

```bash
# Build the image
docker build -t chatty-tests .

# Run with .env file (env vars passed at runtime, not baked in)
docker run --env-file .env chatty-tests

# Run a specific lecture
docker run --env-file .env chatty-tests npm test tests/lecture-01/lecture.test.ts
```

---

## 5. `docker-compose.yml`

```yaml
services:
  tests:
    build: .
    env_file: .env
    volumes:
      # Mount test-results so you can read them after the container exits
      - ./test-results:/app/test-results
```

Run with:
```bash
docker-compose run tests
```

> **Note on `version:`** — older tutorials show `version: '3.8'` at the top of `docker-compose.yml`. Docker Compose v2 ignores this field and shows a deprecation warning. Omit it.

**`volumes` — bind mount explained:**
`./test-results:/app/test-results` means: link the local `./test-results` folder
to `/app/test-results` inside the container. Any file the container writes to
`/app/test-results` appears immediately in your local `./test-results` folder.

Without this, files written inside the container disappear when the container exits.
The volume makes them persist on your machine.

Format: `local-path:container-path` (local left, container right).

---

## 6. Multi-stage Build (Advanced)

```dockerfile
# Stage 1: Install
FROM node:20-alpine AS installer
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Run tests (smaller final image — no install tools)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY . .
CMD ["npm", "test"]
```

Multi-stage builds produce a smaller final image by separating installation from execution.
For test runners this is optional but good practice to know.

---

## 7. The `--env-file` Whitespace Trap

This is the most common Docker test failure and the hardest to diagnose.

**The problem:**

```bash
# .env file (has inline comment or trailing space):
TEST_USERNAME=vitestmike  # my permanent test account
TEST_PASSWORD=Vitest@123456
```

| | What TEST_USERNAME becomes |
|---|---|
| `dotenv` (local) | `vitestmike` — strips comments and trailing whitespace |
| Docker `--env-file` | `vitestmike  # my permanent test account` — keeps everything |

Result in Docker: signin sends `username: "vitestmike  # my permanent test account"` → server returns 401 → every authenticated test fails. The error message is just `"Token is not valid"` — nothing points to the env var.

**The fix — add `.trim()` in `vitest.config.ts`:**

```ts
env: {
  TEST_USERNAME: (process.env.TEST_USERNAME ?? '').trim(),
  TEST_PASSWORD: (process.env.TEST_PASSWORD ?? '').trim(),
  BASE_URL: (process.env.BASE_URL ?? '').trim(),
}
```

`.trim()` strips leading/trailing whitespace from ANY source — `--env-file`, environment injection, shell exports. It makes the config Docker-safe without touching the `.env` file.

**Rule:** always `.trim()` env var values that will be used in HTTP requests.

---

## 8. vitest.config.ts for Docker

Two settings matter specifically in Docker:

**`hookTimeout: 30000`**

```ts
hookTimeout: 30000,  // default is 10000
```

In Docker, the first HTTPS request to `api.codeandtest.com` includes:
1. DNS resolution (cold start — no cache)
2. TCP connection
3. TLS handshake (certificate verification using the CA bundle you just installed)

This takes longer than locally where all three are cached. The default `hookTimeout` of 10 seconds can cause `beforeAll` to time out silently, leaving `sessionCookie` as `''` and all tests returning 401.

**`fileParallelism: false`**

```ts
fileParallelism: false,
```

This is already set but worth understanding in a Docker context: all 45 test files share the same Docker container IP. Running files in parallel would multiply the request rate and risk triggering IP-based rate limits on the API. Sequential execution keeps the request rate predictable.

---

## Key Takeaways

- ✅ `Dockerfile` for the **test runner** — not the API server (that's a different Dockerfile)
- ✅ `node:20-alpine` — small, fast, production-suitable base image
- ✅ `apk add --no-cache ca-certificates` — required for HTTPS on Alpine
- ✅ Copy `package*.json` first — Docker layer caching speeds up rebuilds
- ✅ `--env-file .env` passes secrets at runtime — never baked into the image
- ✅ `.dockerignore` excludes `node_modules` and `.env`
- ✅ `.trim()` all env var values — Docker `--env-file` does NOT strip whitespace
- ✅ `hookTimeout: 30000` — Docker's cold-start DNS + TLS needs more time than local

**What's next:** Lecture 13 — Test Reporting. HTML reports, JUnit XML, Newman CLI, coverage.

---

## 9. Running the Tests

```bash
docker build -t chatty-tests .
docker run --env-file .env chatty-tests

# Run a single lecture
docker run --env-file .env chatty-tests npm test tests/lecture-05/lecture.test.ts
```

**Expected:** `Tests  511 passed (511)` — same result as `npm test` locally.
If you see 401 errors for authenticated tests, check the `--env-file` whitespace trap (section 7).

## 10. Git

```bash
# Stage the files for this lecture
git add Dockerfile .dockerignore docker-compose.yml tests/lecture-12/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-12: Dockerfile for test runner, docker-compose"

# Push the branch to GitHub
git push -u origin lecture-12-docker
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-12: Dockerfile for test runner, docker-compose`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-13-reporting
```


## Homework

| Task | What it practices |
|------|------------------|
| 1 | Create `Dockerfile` using the content from section 2 (with `ca-certificates` and env validation) |
| 2 | Create `.dockerignore` from section 3 |
| 3 | `docker build -t chatty-tests .` — verify it builds with no errors |
| 4 | `docker run --env-file .env chatty-tests` — verify all 511 tests pass inside the container |
| 5 | Create `docker-compose.yml` from section 5 and run with `docker-compose run tests` |
| 6 | Add `.trim()` to all env var values in `vitest.config.ts` |
| 7 | Add `hookTimeout: 30000` to `vitest.config.ts` and explain why it matters in Docker |

No Vitest test files for this lecture — homework is infrastructure setup.
