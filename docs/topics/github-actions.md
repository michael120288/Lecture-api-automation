# GitHub Actions

## Table of Contents

- [What Is CI/CD?](#what-is-cicd)
- [GitHub Actions Concepts](#github-actions-concepts)
- [YAML Syntax](#yaml-syntax)
- [Workflow File Location](#workflow-file-location)
- [Triggers](#triggers)
- [Jobs and Steps](#jobs-and-steps)
- [Actions Used in This Course](#actions-used-in-this-course)
- [Matrix Strategy](#matrix-strategy)
- [GitHub Secrets](#github-secrets)
- [npm ci vs npm install](#npm-ci-vs-npm-install)
- [Concurrency Groups](#concurrency-groups)
- [Path Filters](#path-filters)
- [Status Badge](#status-badge)
- [Full Annotated Workflow File](#full-annotated-workflow-file)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## What Is CI/CD?

**CI** stands for Continuous Integration. Every time a developer pushes code or opens a pull request, a set of automated checks runs — linting, type-checking, and tests. If any check fails, the team knows immediately rather than discovering the problem days later during a manual review.

**CD** stands for Continuous Delivery or Continuous Deployment. After CI passes, the pipeline can automatically deploy the application to a staging environment (delivery) or directly to production (deployment).

For a QA automation course, CD is less relevant. The CI part is everything: your tests run automatically on every push. If a test breaks, the commit is flagged before anyone merges it.

Without CI:
- Tests only run when someone remembers to run them locally.
- "It works on my machine" is the dominant debugging strategy.
- Broken tests accumulate silently.

With CI:
- Every push is verified.
- Failing tests block merges.
- Test results are visible to the whole team in the pull request UI.

---

## GitHub Actions Concepts

GitHub Actions is GitHub's built-in CI/CD platform. It runs your workflows inside virtual machines (called runners) hosted by GitHub.

| Concept | Description |
|---|---|
| **Workflow** | A YAML file that defines when and how automation runs. One repository can have multiple workflows. |
| **Event** | The trigger that starts a workflow. Examples: a push to `main`, a pull request, a manual button click. |
| **Job** | A unit of work inside a workflow. Each job runs on its own runner. Jobs can run in parallel or sequentially. |
| **Step** | A single command or action inside a job. Steps within a job always run sequentially. |
| **Runner** | The virtual machine that executes a job. GitHub provides Ubuntu, Windows, and macOS runners. |
| **Action** | A pre-built, reusable step. Published on the GitHub Marketplace. Versions are pinned with `@v4`. |
| **Artifact** | A file or directory uploaded from a job so other jobs (or humans) can download it later. |
| **Secret** | An encrypted variable stored in GitHub's settings. Referenced in YAML as `${{ secrets.NAME }}`. |

A workflow is a file. A workflow contains jobs. A job contains steps. A step is either a shell command (`run:`) or a reusable action (`uses:`).

---

## YAML Syntax

GitHub Actions workflows are written in YAML. YAML uses indentation to define structure — a wrong indent level changes the meaning of the file.

### Indentation

YAML uses spaces, not tabs. Two spaces per level is the convention.

```yaml
# Correct: two-space indentation
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
```

```yaml
# Wrong: mixed tabs and spaces — YAML parser will error
jobs:
	test:         # tab here — this is invalid
    runs-on: ubuntu-latest
```

### Keys and Values

```yaml
key: value           # simple scalar
runs-on: ubuntu-latest
node-version: 20
```

### Arrays

Two syntaxes for arrays:

```yaml
# Block style (one item per line, indented with dash)
on:
  push:
    branches:
      - main
      - develop

# Inline style (all on one line)
node-version: [18, 20]
```

### Multiline Strings

```yaml
# Literal block scalar (|) — preserves newlines
run: |
  npm ci
  npm test
  echo "done"

# Folded block scalar (>) — folds newlines into spaces
description: >
  This is a long description
  that wraps across lines
  but renders as one paragraph.
```

### Expressions

GitHub Actions expressions are enclosed in `${{ }}`:

```yaml
${{ secrets.BASE_URL }}
${{ github.ref }}
${{ matrix.node-version }}
```

### Boolean Values

```yaml
continue-on-error: true
fail-fast: false
```

---

## Workflow File Location

GitHub Actions looks for workflow files in `.github/workflows/`. The filename is arbitrary but must end in `.yml` or `.yaml`.

```
chatty-api-tests/
  .github/
    workflows/
      tests.yml        <-- GitHub Actions finds this automatically
  tests/
  src/
  package.json
  vitest.config.ts
```

GitHub scans the `.github/workflows/` directory automatically. You do not register the file anywhere. As soon as you push the file, GitHub starts processing it.

You can have multiple workflow files:

```
.github/workflows/
  tests.yml          # runs on push/PR
  nightly.yml        # runs on a cron schedule
  release.yml        # runs on tag push
```

---

## Triggers

The `on:` key defines what events start the workflow.

### push

Runs when commits are pushed to the specified branches:

```yaml
on:
  push:
    branches:
      - main
      - develop
```

### pull_request

Runs when a pull request is opened, updated (new commit pushed to the PR branch), reopened, or synchronized:

```yaml
on:
  pull_request:
    branches:
      - main
```

This is the most common trigger for test suites. It ensures every PR is verified before merging.

### workflow_dispatch

Adds a "Run workflow" button to the GitHub Actions UI. Useful for running tests manually without pushing a commit:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: false
        default: 'production'
        type: choice
        options:
          - production
          - staging
```

Inputs become available as `${{ inputs.environment }}` inside the workflow.

### schedule

Runs on a cron schedule:

```yaml
on:
  schedule:
    - cron: '0 6 * * 1-5'  # 6am UTC, Monday through Friday
```

### Multiple triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

---

## Jobs and Steps

### Job structure

```yaml
jobs:
  test:                         # job ID — must be unique within the workflow
    name: Run API tests         # human-readable name shown in the GitHub UI
    runs-on: ubuntu-latest      # runner OS
    steps:
      - name: Step one
        run: echo "hello"
      - name: Step two
        run: echo "world"
```

### Step types

A step is either a shell command or a reusable action:

```yaml
steps:
  # Reusable action
  - name: Checkout code
    uses: actions/checkout@v4

  # Shell command
  - name: Install dependencies
    run: npm ci

  # Shell command with multiline
  - name: Run tests
    run: |
      echo "Starting tests"
      npm test
    env:
      BASE_URL: ${{ secrets.BASE_URL }}
```

### Job dependencies

By default, jobs run in parallel. Use `needs:` to create a dependency:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint           # test only starts if lint passes
    steps:
      - run: npm test
```

### Conditional steps

```yaml
- name: Upload coverage
  if: success()          # only if all previous steps passed
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/

- name: Notify on failure
  if: failure()          # only if a previous step failed
  run: echo "Tests failed"
```

---

## Actions Used in This Course

### actions/checkout@v4

Clones the repository into the runner's workspace. Without this step, the runner has no code to work with.

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

By default, it checks out the branch or commit that triggered the workflow. For pull requests, it checks out a merge commit (the result of merging the PR branch into the target branch).

```yaml
# Clone only the last commit (faster for large repos)
- uses: actions/checkout@v4
  with:
    fetch-depth: 1
```

### actions/setup-node@v4

Installs a specific version of Node.js on the runner. Runners have Node pre-installed, but the version may not match your project requirements.

```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'          # cache ~/.npm to speed up npm ci
```

The `cache: 'npm'` option caches the npm package cache directory. Combined with `npm ci`, it means dependencies are restored from cache instead of downloaded from the registry on repeat runs.

### actions/upload-artifact@v4

Uploads files from the runner so they can be downloaded after the workflow finishes. Useful for test reports, coverage HTML, and screenshots.

```yaml
- name: Upload test results
  if: always()           # upload even if tests fail
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results/
    retention-days: 7    # delete artifact after 7 days
```

`if: always()` is important here. If the test step fails, subsequent steps are skipped by default. Using `always()` ensures the artifact is uploaded even when tests fail — which is exactly when you need the report.

---

## Matrix Strategy

A matrix lets you run the same job with different parameter combinations. This course uses it to test against Node 18 and Node 20 simultaneously.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
      fail-fast: false     # continue running node 20 even if node 18 fails

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

GitHub creates two parallel jobs: one running Node 18 and one running Node 20. Both run at the same time. The GitHub Actions UI shows them as separate entries under the workflow run.

You can combine multiple dimensions:

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

This creates four jobs (2 Node versions × 2 operating systems). For this course, OS diversity is not needed — `ubuntu-latest` is sufficient.

`fail-fast: false` is important for debugging. By default, if one matrix job fails, GitHub cancels all other running matrix jobs. Setting `fail-fast: false` lets all jobs complete so you see which Node version the failure occurs on.

---

## GitHub Secrets

Environment variables like `BASE_URL`, `TEST_USERNAME`, and `TEST_PASSWORD` must not be hardcoded in the workflow YAML file — the file is committed to the repository and may be public. GitHub Secrets store encrypted values that are injected at runtime.

### Adding a secret

1. Navigate to your GitHub repository.
2. Click **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Enter the name (e.g. `BASE_URL`) and value (e.g. `https://api.codeandtest.com/api/v1`).
5. Click **Add secret**.

Secrets are not shown after creation. You can only update or delete them, not view them.

### Referencing secrets in YAML

```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

The `${{ secrets.NAME }}` syntax is a GitHub Actions expression. At runtime, GitHub replaces the expression with the secret value before passing it to the runner.

Secrets are redacted from logs. If a step prints `$BASE_URL`, GitHub replaces the value with `***` in the log output.

### Organization vs repository secrets

| Scope | When to use |
|---|---|
| Repository secret | Specific to one repository. Used in this course. |
| Organization secret | Shared across multiple repositories in an org. Useful for shared API keys. |
| Environment secret | Scoped to a deployment environment (staging, production). Requires environment protection rules. |

### Never reference secrets in job names or step names

```yaml
# WRONG — secret value appears in the job name in the UI
name: Test against ${{ secrets.BASE_URL }}

# CORRECT — step name does not expose the value
name: Run API tests
```

---

## npm ci vs npm install

`npm install` updates `package-lock.json` if it is out of sync with `package.json`. In CI, this is dangerous: the lockfile exists to pin exact versions, and if `npm install` silently updates it, your tests may run against different dependency versions than your local machine.

`npm ci` (clean install):
- Requires a `package-lock.json` to exist. Fails if it is missing.
- Installs exactly the versions pinned in the lockfile. Ignores `package.json` version ranges.
- Deletes `node_modules` before installing (clean state).
- Never updates the lockfile.
- Is faster than `npm install` for CI because it skips the version resolution step.

```yaml
# Always use npm ci in CI workflows
- name: Install dependencies
  run: npm ci
```

---

## Concurrency Groups

If you push two commits in rapid succession to the same branch, two workflow runs start in parallel. Both are testing the same branch, but only the latest commit matters. Concurrency groups cancel the in-progress run when a new one starts for the same context.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- `github.workflow` is the workflow file name.
- `github.ref` is the branch or tag reference (e.g. `refs/heads/main`).
- The `group` value must be a string that uniquely identifies the context.

For pull requests, use `github.head_ref` (the PR branch name) instead of `github.ref`:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
```

This prevents duplicate runs while still allowing different PRs to run simultaneously (they have different `head_ref` values).

---

## Path Filters

Run the workflow only when relevant files change. If a commit only modifies documentation, there is no need to run the full test suite.

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'tests/**'
      - 'src/**'
      - 'package.json'
      - 'vitest.config.ts'
  pull_request:
    branches: [main]
    paths:
      - 'tests/**'
      - 'src/**'
```

Path filters use glob syntax. `tests/**` matches all files inside `tests/` at any depth.

Note: if a PR modifies only `README.md`, the workflow will not run and the PR will show no checks. This can block merging if branch protection requires checks to pass. Configure path filters carefully.

---

## Status Badge

A status badge displays the current state of a workflow (passing/failing) in your README or docs.

### Markdown syntax

```markdown
![Tests](https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg)
```

Replace `OWNER`, `REPO`, and `tests.yml` with your values.

### With branch filter

```markdown
![Tests](https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg?branch=main)
```

### Example

```markdown
# chatty-api-tests

![Tests](https://github.com/your-org/chatty-api-tests/actions/workflows/tests.yml/badge.svg)
```

The badge renders as a small image that links to the workflow runs page. It is green when the last run passed and red when it failed.

---

## Full Annotated Workflow File

```yaml
# .github/workflows/tests.yml
#
# Runs the Chatty API test suite on every push to main and every pull request.
# Tests run against Node 18 and Node 20 in parallel (matrix strategy).
# Credentials are stored as GitHub Secrets — never hardcoded here.

name: API Tests

# ── Triggers ──────────────────────────────────────────────────────────────────
on:
  push:
    branches: [main]
    paths:
      - 'tests/**'
      - 'src/**'
      - 'package.json'
      - 'vitest.config.ts'
  pull_request:
    branches: [main]
  workflow_dispatch:        # allows manual run from the GitHub UI

# ── Concurrency ───────────────────────────────────────────────────────────────
# Cancel any in-progress run for the same branch when a new commit is pushed.
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

# ── Jobs ──────────────────────────────────────────────────────────────────────
jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    # Run the same job for Node 18 and Node 20 simultaneously.
    strategy:
      matrix:
        node-version: [18, 20]
      # Do not cancel node-20 run just because node-18 failed.
      fail-fast: false

    steps:
      # Step 1: Clone the repository into the runner's workspace.
      # Without this, the runner has an empty filesystem.
      - name: Checkout code
        uses: actions/checkout@v4

      # Step 2: Install the correct Node version.
      # cache: 'npm' saves ~/.npm across runs — speeds up npm ci on repeat runs.
      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      # Step 3: Install dependencies.
      # npm ci uses package-lock.json exactly — never updates it.
      # Faster than npm install and reproducible across machines.
      - name: Install dependencies
        run: npm ci

      # Step 4: Run the full test suite.
      # Secrets are injected as environment variables at runtime.
      # They never appear in the YAML file or the runner logs.
      - name: Run tests
        run: npm test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

      # Step 5: Upload test results.
      # if: always() means this step runs even when the test step fails.
      # That is when the report is most useful.
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-node-${{ matrix.node-version }}
          path: test-results/
          retention-days: 7
```

---

## Common Mistakes

### Mistake: hardcoding secrets

```yaml
# Wrong
env:
  BASE_URL: https://api.codeandtest.com/api/v1
  TEST_PASSWORD: Vitest@123456

# Correct
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

### Mistake: using npm install instead of npm ci

```yaml
# Wrong
- run: npm install

# Correct
- run: npm ci
```

### Mistake: forgetting if: always() on artifact upload

```yaml
# Wrong — artifact is not uploaded when tests fail
- uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results/

# Correct
- if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results/
```

### Mistake: missing checkout step

Every job starts with an empty workspace. If you omit `actions/checkout@v4`, commands like `npm ci` fail because there is no `package.json`.

### Mistake: wrong YAML indentation

```yaml
# Wrong — steps is at the wrong level
jobs:
  test:
    runs-on: ubuntu-latest
steps:               # should be indented under 'test'
  - run: npm test

# Correct
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

---

## Related Topics

- [Docker](docker.md) — running tests inside containers, using Docker in GitHub Actions
- [Coverage](coverage.md) — uploading coverage reports as artifacts
- [Test Data Strategy](test-data-strategy.md) — environment variables in CI

## Official Documentation

- [GitHub Actions — Official docs](https://docs.github.com/en/actions)
- [GitHub Actions — Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub — Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [actions/setup-node](https://github.com/actions/setup-node)
- [actions/upload-artifact](https://github.com/actions/upload-artifact)
