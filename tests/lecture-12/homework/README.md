# Homework — Lecture 12: Docker — Containerising the Test Runner

> **Goal:** Build a Docker image, run tests inside it, and explore how Docker works beyond the basics.

---

## Core Tasks

Complete these first — they prove the container works.

| Task | What it practices |
|------|------------------|
| 1 | Create `Dockerfile` from lecture section 2 |
| 2 | Create `.dockerignore` from lecture section 3 |
| 3 | `docker build -t chatty-tests .` — build succeeds with no errors |
| 4 | `docker run --env-file .env chatty-tests` — all tests pass inside the container |
| 5 | Create `docker-compose.yml` from section 5, run with `docker-compose run tests` |

---

## Stretch Tasks

These go beyond the lecture. Each requires reading, experimenting, and thinking independently.

### Stretch 1 — Override CMD at runtime

The `CMD` in the Dockerfile sets the default command. You can override it at runtime:

```bash
# Run only lecture-02 instead of the full suite
docker run --env-file .env chatty-tests npm test tests/lecture-02/auth-flow.spec.ts

# Open a shell inside the container (no tests — just explore)
docker run --env-file .env -it chatty-tests sh
```

From inside the shell, run `ls`, `node --version`, `cat package.json`. Understand what the container's filesystem looks like.

**Why this matters:** Overriding CMD lets you use the same image for different purposes — run all tests, run one lecture, debug, or open a REPL.

---

### Stretch 2 — Compare image sizes

```bash
# Build with the current alpine image
docker build -t chatty-tests:alpine .

# Change FROM to the full node image temporarily
# FROM node:20          ← remove -alpine
docker build -t chatty-tests:full .

# Compare sizes
docker images | grep chatty-tests
```

You should see something like:
```
chatty-tests   alpine   ...   ~250 MB
chatty-tests   full     ...   ~1.1 GB
```

Restore `FROM node:20-alpine` after you've noted the sizes.

**Why this matters:** CI pulls your image on every run. A 1 GB image takes 30-60 seconds to pull. Alpine images keep pipelines fast.

---

### Stretch 3 — Implement the multi-stage build

The lecture introduced multi-stage builds in section 6 but didn't assign it as a core task. Implement it now:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS installer
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Run tests (copies installed modules — no npm in final stage)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY . .
CMD ["npm", "test"]
```

Build and run — tests should still pass.

```bash
docker build -t chatty-tests:multi-stage .
docker run --env-file .env chatty-tests:multi-stage
```

**Why this matters:** In a multi-stage build, build tools and intermediate files never reach the final image. The final image contains only what it needs to run.

---

### Stretch 4 — Tag with a version

```bash
docker build -t chatty-tests:1.0.0 .
docker build -t chatty-tests:latest .

docker images | grep chatty-tests
```

Tagging with a version means you can always roll back: `docker run chatty-tests:1.0.0`.

In production, `latest` is considered an anti-pattern because it's ambiguous — you don't know which exact build it refers to. Version tags are explicit and reproducible.

---

### Stretch 5 — Add Docker build to GitHub Actions

Update `.github/workflows/tests.yml` to build the Docker image in CI and run tests inside the container:

```yaml
- name: Build Docker image
  run: docker build -t chatty-tests .

- name: Run tests in Docker
  run: |
    docker run \
      -e BASE_URL=${{ secrets.BASE_URL }} \
      -e TEST_USERNAME=${{ secrets.TEST_USERNAME }} \
      -e TEST_PASSWORD=${{ secrets.TEST_PASSWORD }} \
      chatty-tests
```

Push and verify the Actions tab shows the Docker build step passing.

**Why `-e` instead of `--env-file`?** In CI you don't have a `.env` file — secrets are passed individually via `-e KEY=VALUE`.

---

## Reflection Questions

Answer these in a comment on your PR or in a `homework-notes.md` file.

1. **What is the difference between `RUN` and `CMD` in a Dockerfile?** Give a concrete example of when you'd use each.
2. **Why does `COPY package*.json ./` come before `COPY . .`?** What would break if you reversed the order?
3. **What happens if you delete `.env` from `.dockerignore`?** What specific risk does that create?
4. **The multi-stage build has two `FROM` lines. Does the final image contain both stages?** Why or why not?
5. **`docker run --env-file .env` vs `-e KEY=VALUE` — when would you use each?**

---

## How to Verify

Your homework is complete when:

- [ ] `docker build -t chatty-tests .` completes with no errors
- [ ] `docker run --env-file .env chatty-tests` shows all tests passing
- [ ] `docker-compose run tests` works
- [ ] `docker images` shows both `alpine` and `full` entries (Stretch 2)
- [ ] Multi-stage build still passes all tests (Stretch 3)
- [ ] GitHub Actions builds and runs the image (Stretch 5)

---

## Git — Commit Your Homework

```bash
# Create a homework branch from the lecture branch
git checkout lecture-12-docker
git checkout -b lecture-12-docker-homework

# Add the files you created/modified
git add Dockerfile .dockerignore docker-compose.yml
git status

# Commit
git commit -m "lecture-12: homework complete — Docker containerised test runner"
git push -u origin lecture-12-docker-homework
```

### Open a Pull Request

- Base branch: `lecture-12-docker`
- Compare: `lecture-12-docker-homework`
- Title: `lecture-12: homework complete — Docker`
- Include answers to the reflection questions in the PR description
