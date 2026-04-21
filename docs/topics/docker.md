# Docker

## Table of Contents

- [The "Works on My Machine" Problem](#the-works-on-my-machine-problem)
- [Containers vs Virtual Machines](#containers-vs-virtual-machines)
- [Images vs Containers](#images-vs-containers)
- [The Dockerfile](#the-dockerfile)
- [Dockerfile Instructions Reference](#dockerfile-instructions-reference)
- [RUN vs CMD: Build Time vs Runtime](#run-vs-cmd-build-time-vs-runtime)
- [Layer Caching](#layer-caching)
- [The node:20-alpine Choice](#the-node20-alpine-choice)
- [.dockerignore](#dockerignore)
- [docker build](#docker-build)
- [docker run with --env-file](#docker-run-with---env-file)
- [Overriding CMD at Runtime](#overriding-cmd-at-runtime)
- [docker-compose.yml](#docker-composeyml)
- [Multi-Stage Builds](#multi-stage-builds)
- [Tagging with Versions](#tagging-with-versions)
- [Docker in GitHub Actions](#docker-in-github-actions)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## The "Works on My Machine" Problem

Imagine you write a test suite on macOS with Node 20, npm 10, and a specific version of a library. Your colleague clones the repository on Ubuntu with Node 18 and npm 9. The tests pass for you and fail for them.

This happens because the runtime environment — the operating system, installed tools, Node version, environment variables — differs between machines. "Works on my machine" is the classic symptom.

Docker solves this by packaging the application together with its entire runtime environment into a single unit called a **container image**. The image contains the OS layer, Node, npm, and every dependency. When someone runs the image, they get exactly the same environment, regardless of what is installed on their host machine.

For a test suite this means:
- Every developer runs tests in the same environment.
- CI runs tests in the same environment as every developer.
- Debugging a CI failure is easier because you can reproduce the exact CI environment locally.

---

## Containers vs Virtual Machines

Both containers and virtual machines (VMs) provide isolated environments, but they do it differently.

| | Virtual Machine | Container |
|---|---|---|
| **Isolation level** | Full OS kernel | Process-level (shares host kernel) |
| **Size** | Gigabytes | Megabytes |
| **Startup time** | Minutes | Seconds |
| **Overhead** | High (full OS emulation) | Low (kernel shared) |
| **Use case** | Running a different OS entirely | Packaging an application with its dependencies |

A VM includes a full operating system — kernel and all — running on top of a hypervisor. A container shares the host machine's OS kernel and only packages the application-layer differences. This makes containers much lighter and faster.

For running a Node.js test suite, containers are the right tool. You do not need a full VM. You need a consistent Node environment.

---

## Images vs Containers

These two terms are frequently confused:

| | Image | Container |
|---|---|---|
| **What it is** | A read-only template (like a blueprint) | A running instance of an image |
| **State** | Immutable — never changes after build | Has a writable layer, can write files while running |
| **Analogy** | A class definition | An instance of that class |
| **Created with** | `docker build` | `docker run` |

One image can be used to create many containers. Each container is independent — one container crashing does not affect others running from the same image.

When a container writes to the filesystem, those writes go to a thin writable layer on top of the read-only image. When the container stops, that layer is discarded (unless you use volumes).

---

## The Dockerfile

A Dockerfile is a text file that contains instructions for building an image. Docker executes these instructions top to bottom, creating a new layer for each instruction.

The course Dockerfile from `chatty-api-tests/Dockerfile`:

```dockerfile
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
```

---

## Dockerfile Instructions Reference

### FROM

Specifies the base image. Every Dockerfile starts with `FROM`.

```dockerfile
FROM node:20-alpine
```

This means: start with the official Node.js 20 image built on Alpine Linux. All subsequent instructions run on top of this base.

### WORKDIR

Sets the working directory inside the container for subsequent instructions. Creates the directory if it does not exist.

```dockerfile
WORKDIR /app
```

Without `WORKDIR`, Docker defaults to the root `/`. Files would be scattered across the container filesystem. Using `/app` keeps everything organized and is a strong convention.

### COPY

Copies files from the build context (your local machine) into the container image.

```dockerfile
COPY package*.json ./         # copy package.json and package-lock.json to /app/
COPY . .                      # copy everything else from current directory to /app/
```

The first argument is the source (relative to build context), the second is the destination inside the container (relative to `WORKDIR`).

`package*.json` is a glob that matches both `package.json` and `package-lock.json`.

### RUN

Executes a command during the image build phase. The result becomes a new layer in the image.

```dockerfile
RUN npm ci
```

Common uses:
- Installing dependencies
- Compiling source code
- Creating directories

### CMD

Specifies the default command to run when a container starts. This is runtime behavior, not build time.

```dockerfile
CMD ["npm", "test"]
```

The array syntax (exec form) is preferred over shell form. It executes the command directly without a shell wrapper, which ensures proper signal handling.

### EXPOSE

Documents which port the application listens on. Does not actually publish the port — it is documentation for developers and orchestration tools.

```dockerfile
EXPOSE 3000
```

For a test runner container that makes outbound HTTP requests but does not listen on any port, `EXPOSE` is not needed. It is more relevant for web server containers.

---

## RUN vs CMD: Build Time vs Runtime

This distinction is critical and commonly confused:

| | RUN | CMD |
|---|---|---|
| **When it runs** | During `docker build` | When `docker run` starts the container |
| **Result** | Becomes a layer in the image | Not stored in the image — executed at runtime |
| **Count** | Can have many | Convention: one per Dockerfile |
| **Override** | Cannot be overridden at runtime | Can be overridden with `docker run <image> <command>` |

```dockerfile
# This runs ONCE during the build. The result (node_modules/) is baked into the image.
RUN npm ci

# This runs EVERY TIME the container starts. It is not part of the image.
CMD ["npm", "test"]
```

Think of it this way: `RUN` is for setting up the environment. `CMD` is for starting the application.

---

## Layer Caching

Docker builds images layer by layer. Each instruction creates a layer. Docker caches each layer and reuses it if the instruction and its inputs have not changed.

This is why the Dockerfile copies `package*.json` before running `npm ci`:

```dockerfile
# Step 1: copy only the dependency manifests
COPY package*.json ./

# Step 2: install — this layer is cached as long as package*.json does not change
RUN npm ci

# Step 3: copy the rest of the code
# This layer changes on every code edit — but it runs AFTER npm ci
COPY . .
```

If you reverse the order:

```dockerfile
# Wrong order — cache-busting every rebuild
COPY . .                  # changes every time any file is edited
RUN npm ci                # always runs, never cached
```

Every time any source file changes, Docker invalidates the `COPY . .` layer, which invalidates all subsequent layers including `RUN npm ci`. This means npm re-downloads all dependencies on every build, even when `package.json` has not changed.

With the correct order, `npm ci` only runs when `package*.json` changes. For a project with many dependencies, this can save minutes per build.

### How cache invalidation works

Docker compares each instruction to its cached counterpart. For `COPY` instructions, Docker computes checksums of the source files. If any checksum changes, that layer and all subsequent layers are invalidated.

For `RUN` instructions, Docker only invalidates the layer if the instruction text changes or if a preceding layer was invalidated.

---

## The node:20-alpine Choice

The official Docker Hub Node image comes in several variants:

| Tag | Base OS | Size (approx.) | Use case |
|---|---|---|---|
| `node:20` | Debian Bookworm | ~950 MB | General purpose, most tools available |
| `node:20-slim` | Debian Bookworm (minimal) | ~240 MB | Production apps without build tools |
| `node:20-alpine` | Alpine Linux | ~130 MB | CI/test runners, minimal overhead |

Alpine Linux is a minimal Linux distribution designed for security and size. It ships with `musl libc` instead of `glibc`, `busybox` instead of GNU coreutils, and very few pre-installed packages.

For a test runner container that runs `npm ci` and then `npm test`, Alpine is ideal:
- Smaller image means faster pulls in CI.
- Fewer installed packages means a smaller attack surface.
- Node.js and npm work correctly on Alpine.

When Alpine is the wrong choice:
- Native modules that compile C/C++ code (some databases, canvas, sharp). Alpine uses `musl libc` which is not binary-compatible with `glibc`. You may need to install `python3`, `make`, and `g++` or switch to a Debian-based image.
- If your tests require tools like `git`, `curl`, or `bash` that are not present in Alpine (Alpine uses `sh`, not `bash`).

For this course, Alpine works because the dependencies are pure JavaScript (axios, vitest, faker).

---

## .dockerignore

The `.dockerignore` file tells Docker which files to exclude from the build context. The build context is the set of files sent to the Docker daemon when you run `docker build`.

```
# .dockerignore

# Dependencies — installed inside the container by RUN npm ci
# Including this would add hundreds of megabytes to the build context for no reason
node_modules

# Environment file — credentials must not be baked into the image
.env

# Git history — not needed inside the container
.git

# Test results from previous runs — not part of the source code
test-results
coverage
```

Why exclude `node_modules`:
- `node_modules` can be hundreds of megabytes.
- Docker would spend time sending it to the daemon even though `COPY . .` copies it into the image.
- Then `RUN npm ci` would overwrite it anyway with freshly installed dependencies.
- This wastes time and disk space.

Why exclude `.env`:
- The `.env` file contains credentials (`TEST_USERNAME`, `TEST_PASSWORD`, `BASE_URL`).
- Baking credentials into the image is a security problem. The image might be pushed to a public registry.
- The correct pattern is to inject credentials at runtime with `--env-file`.

---

## docker build

```bash
# Build an image and tag it 'chatty-tests'
docker build -t chatty-tests .

# The '.' means: use the current directory as the build context
# Docker reads './Dockerfile' by default

# Specify a different Dockerfile location
docker build -t chatty-tests -f docker/Dockerfile.test .

# Build without cache (forces all layers to rebuild)
docker build --no-cache -t chatty-tests .

# See what is happening during build (default)
docker build -t chatty-tests --progress=plain .
```

After running `docker build`, the image is stored locally. Run `docker images` to see it:

```
REPOSITORY      TAG       IMAGE ID       CREATED          SIZE
chatty-tests    latest    a1b2c3d4e5f6   30 seconds ago   178MB
```

---

## docker run with --env-file

```bash
# Run the container using environment variables from .env
docker run --env-file .env chatty-tests

# The container runs npm test (the CMD) and exits when tests finish
# Exit code 0 = all tests passed
# Exit code non-zero = tests failed or an error occurred
```

The `--env-file` flag reads `KEY=VALUE` pairs from the file and injects them as environment variables inside the container. The file is never copied into the image — it is read at runtime on the host machine.

Your `.env` file:
```
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=vitest_student_01
TEST_PASSWORD=Vitest@123456
```

These values become `process.env.BASE_URL`, `process.env.TEST_USERNAME`, and `process.env.TEST_PASSWORD` inside the container, exactly as Vitest expects.

### Other useful run flags

```bash
# Run interactively (useful for debugging)
docker run -it --env-file .env chatty-tests sh

# Remove the container automatically after it exits
docker run --rm --env-file .env chatty-tests

# Mount a volume to persist test results to the host
docker run --rm --env-file .env \
  -v $(pwd)/test-results:/app/test-results \
  chatty-tests
```

---

## Overriding CMD at Runtime

The `CMD` in the Dockerfile is the default command. You can override it by passing a command after the image name:

```bash
# Instead of 'npm test', run a shell for debugging
docker run -it --env-file .env chatty-tests sh

# Run only a specific lecture's tests
docker run --env-file .env chatty-tests npm test tests/lecture-04/

# Run tests with coverage
docker run --env-file .env chatty-tests npm run test:coverage
```

This is useful when you want to use the same image for different purposes without building a new image.

---

## docker-compose.yml

Docker Compose orchestrates multi-container applications. For this course, the application has a single service (the test runner), but Compose still provides conveniences: named services, env_file shorthand, and volume mounts.

The course `docker-compose.yml`:

```yaml
version: '3.8'

services:
  tests:
    build: .                    # build from Dockerfile in current directory
    env_file: .env              # inject environment variables from .env
    volumes:
      - ./test-results:/app/test-results   # mount test results to host
```

Run with:

```bash
# Build and run
docker-compose up --build

# Run without rebuilding (uses existing image)
docker-compose up

# Run in detached mode (background)
docker-compose up -d

# Stop and remove containers
docker-compose down
```

### Extending for multiple environments

```yaml
version: '3.8'

services:
  tests-prod:
    build: .
    env_file: .env
    volumes:
      - ./test-results:/app/test-results

  tests-staging:
    build: .
    env_file: .env.staging       # different credentials for staging
    volumes:
      - ./test-results-staging:/app/test-results
```

---

## Multi-Stage Builds

Multi-stage builds use multiple `FROM` instructions in one Dockerfile. Each `FROM` starts a new stage. Files can be copied between stages.

For a test runner this is less critical, but here is the pattern for context:

```dockerfile
# Stage 1: install and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build       # compile TypeScript to JavaScript

# Stage 2: lean runtime image
# Only copies the compiled output from stage 1
# node_modules, source .ts files, and test files are NOT included
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
CMD ["node", "dist/index.js"]
```

The final image contains only what stage 2 copies from stage 1. The build tools, source TypeScript files, and intermediate artifacts are discarded.

For the test runner specifically, multi-stage is not necessary because the test image needs the TypeScript source files and devDependencies at runtime. It is more relevant for production Node.js application images.

---

## Tagging with Versions

The `-t` flag sets the image tag. Tags follow the format `name:version`.

```bash
# Tag with the current git commit SHA for traceability
docker build -t chatty-tests:$(git rev-parse --short HEAD) .

# Tag with a semantic version
docker build -t chatty-tests:1.2.0 .

# Tag as 'latest' (the default when no tag is specified)
docker build -t chatty-tests:latest .

# Apply multiple tags in one build
docker build \
  -t chatty-tests:latest \
  -t chatty-tests:1.2.0 \
  -t registry.example.com/chatty-tests:1.2.0 \
  .
```

Using the git commit SHA as a tag is useful in CI: the image produced by a specific commit is permanently identifiable.

---

## Docker in GitHub Actions

GitHub Actions runners do not have your local Docker images. You must either build the image as part of the workflow or use `docker-compose` directly.

### Option 1: Build and run in the workflow

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build test image
        run: docker build -t chatty-tests .

      - name: Run tests
        run: |
          docker run --rm \
            -e BASE_URL=${{ secrets.BASE_URL }} \
            -e TEST_USERNAME=${{ secrets.TEST_USERNAME }} \
            -e TEST_PASSWORD=${{ secrets.TEST_PASSWORD }} \
            chatty-tests
```

Note: use `-e KEY=VALUE` instead of `--env-file` when the credentials come from GitHub Secrets. You cannot write a `.env` file on the runner without exposing the secret values in the filesystem.

### Option 2: Use docker-compose in the workflow

```yaml
- name: Run tests with docker-compose
  run: docker-compose up --build --abort-on-container-exit
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

`--abort-on-container-exit` stops all services when any container exits. The exit code of the Compose command reflects the exit code of the container that stopped.

### Option 3: Run without Docker (simpler for this course)

For a test runner that only makes outbound HTTP requests, building a Docker image in CI and then running it is adding complexity without much benefit. The GitHub Actions runner already provides a consistent Node.js environment via `actions/setup-node@v4`.

Docker in CI is most valuable when:
- Your application depends on local services (databases, message queues) that need to run as containers.
- You want to test the containerized application itself, not just the test suite.

For the chatty-api-tests course, `npm ci && npm test` directly on the runner is simpler and faster.

---

## Common Mistakes

### Mistake: copying node_modules into the image

```dockerfile
# Wrong — copies potentially gigabytes of dependencies
COPY . .
RUN npm ci          # overwrites node_modules anyway

# Correct — copy package files first, install, then copy source
COPY package*.json ./
RUN npm ci
COPY . .
```

### Mistake: not using .dockerignore

Without `.dockerignore`, `COPY . .` copies `node_modules` into the build context. Docker sends all of this to the daemon before even starting to build, wasting minutes.

### Mistake: hardcoding credentials in the Dockerfile

```dockerfile
# Wrong — credentials baked into the image
ENV TEST_PASSWORD=Vitest@123456

# Correct — credentials injected at runtime
# (nothing in the Dockerfile, pass via --env-file or -e at docker run time)
```

### Mistake: using shell form for CMD

```dockerfile
# Shell form — wraps in /bin/sh -c, may cause signal handling issues
CMD npm test

# Exec form — runs npm directly, receives signals properly
CMD ["npm", "test"]
```

### Mistake: forgetting --rm

Without `--rm`, each `docker run` creates a new container that remains on disk after it exits. Run enough times and your disk fills up with stopped containers.

```bash
# Always clean up after the test run
docker run --rm --env-file .env chatty-tests
```

---

## Related Topics

- [GitHub Actions](github-actions.md) — running tests in CI without Docker
- [Test Data Strategy](test-data-strategy.md) — environment variables and credentials

## Official Documentation

- [Docker — Official docs](https://docs.docker.com/)
- [Dockerfile reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Hub — node image](https://hub.docker.com/_/node)
- [Docker Compose file reference](https://docs.docker.com/compose/compose-file/)
- [Docker — Best practices for Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
