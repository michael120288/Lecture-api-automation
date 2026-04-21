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
| 7 | Running the Tests |
| 8 | Git |

---

## 1. Why Docker for Tests?

Problem: "Works on my machine" — tests pass locally but fail in CI or on a colleague's laptop.

Solution: Docker packages the test runner (Node.js, npm, all dependencies) into a container.
The same container runs identically on your Mac, Windows, Linux, or GitHub Actions.

---

## 2. Dockerfile

```dockerfile
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first — Docker caches this layer
COPY package*.json ./

# Install dependencies (ci = clean install, same as in CI)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Run the tests when the container starts
CMD ["npm", "test"]
```

**`RUN` vs `CMD` — the most important Docker distinction:**

| Instruction | When it runs | Used for |
|------------|-------------|---------|
| `RUN npm ci` | **At build time** — when you run `docker build` | Installing dependencies, compiling |
| `CMD ["npm", "test"]` | **At container start** — when you run `docker run` | The default command when the container launches |

`RUN` creates a new image layer. You can have many `RUN` instructions.
`CMD` does NOT create a layer — it just records what command to run at startup.
There can only be one `CMD` (the last one wins).

**`alpine`** — minimal Linux image (40 MB vs 900 MB for the full Node image).
For a test runner we don't need GUI tools or compilers — alpine is perfect.

**Why copy `package*.json` before `COPY . .`?**
Docker caches each `RUN` and `COPY` step. If only your test files change (not `package.json`),
Docker reuses the cached `RUN npm ci` layer — much faster rebuilds.

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
version: '3.8'

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

## Key Takeaways

- ✅ `Dockerfile` for the **test runner** — not the API server (that's a different Dockerfile)
- ✅ `node:20-alpine` — small, fast, production-suitable base image
- ✅ Copy `package*.json` first — Docker layer caching speeds up rebuilds
- ✅ `--env-file .env` passes secrets at runtime — never baked into the image
- ✅ `.dockerignore` excludes `node_modules` and `.env`

**What's next:** Lecture 13 — Test Reporting. HTML reports, JUnit XML, Newman CLI, coverage.

---

## 7. Running the Tests

```bash
docker build -t chatty-tests .
docker run --env-file .env chatty-tests
```

## 8. Git

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
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-13-reporting
```


## Homework

| Task | What it practices |
|------|------------------|
| 1 | Create `Dockerfile` using the content from section 2 |
| 2 | Create `.dockerignore` from section 3 |
| 3 | `docker build -t chatty-tests .` — verify it builds with no errors |
| 4 | `docker run --env-file .env chatty-tests` — verify tests run inside the container |
| 5 | Create `docker-compose.yml` from section 5 and run with `docker-compose run tests` |

No Vitest test files for this lecture — homework is infrastructure setup.
