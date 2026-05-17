# Lecture 11 — CI/CD: GitHub Actions Pipeline

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 10 — MongoDB cross-validation.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (run tests locally before pushing):
> ```bash
> npm test
> ```

---

## What You Will Learn

- What CI/CD is and why automated test pipelines matter
- YAML syntax — indentation, keys, values, arrays
- GitHub Actions workflow file structure — `name`, `on`, `jobs`, `steps`
- Running Vitest in a GitHub Actions runner
- Passing `.env` secrets as GitHub repository secrets
- Matrix strategy — testing on multiple Node versions (18 and 20)
- Uploading test results as artifacts (7-day retention)
- Adding a status badge to your README
- `schedule:` trigger — cron syntax for nightly automated runs
- Why nightly runs catch regressions that push-triggered runs miss

> **Reference Topics**
> - GitHub Actions deep-dive reference → [`docs/topics/github-actions.md`](../../docs/topics/github-actions.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | What CI/CD Means |
| 2 | YAML Basics |
| 3 | Workflow File Structure |
| 4 | Setting Up GitHub Secrets |
| 5 | Full Workflow — Step by Step |
| 6 | Matrix Strategy |
| 7 | Artifacts |
| 7b | Parallel Jobs and Shared State |
| 8 | Status Badge |
| 9 | Homework |

---

## 1. What CI/CD Means

**CI** = Continuous Integration — every push to GitHub automatically runs the test suite.
You know within minutes whether your changes broke anything.

**CD** = Continuous Delivery — after tests pass, code can be automatically deployed.

For this course we focus on CI — automatic test execution on every push.

---

## 2. YAML Basics

YAML is the format used for GitHub Actions workflow files.

```yaml
# Key-value pair
name: Run Tests

# Nested object (indentation = 2 spaces)
on:
  push:
    branches:
      - main

# Array item (dash + space)
steps:
  - name: Checkout code
    uses: actions/checkout@v4
```

Rules:
- Indentation with **spaces** (never tabs)
- Keys and values separated by `: ` (colon + space)
- Arrays start with `- ` (dash + space)

---

## 3. Workflow File Structure

Create `.github/workflows/tests.yml` in your project root:

```yaml
name: Chatty API Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]
  workflow_dispatch:
    inputs:
      chapter:
        required: false
        default: ''

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Run Vitest (${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: |
          if [ -n "${{ github.event.inputs.chapter }}" ]; then
            npm test tests/${{ github.event.inputs.chapter }}/
          else
            npm test
          fi
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-node-${{ matrix.node-version }}
          path: test-results/
          retention-days: 7
```

---

## 4. Setting Up GitHub Secrets

In your GitHub repository:
1. Settings → Secrets and variables → Actions
2. Click **New repository secret** for each:

| Secret name | Value |
|-------------|-------|
| `BASE_URL` | `https://api.codeandtest.com/api/v1` |
| `TEST_USERNAME` | your vitest username |
| `TEST_PASSWORD` | your test password |
| `DATABASE_URL` | your MongoDB Atlas URL |

Secrets are encrypted and never visible in logs.

---

## 5. Full Workflow — Step by Step

**`${{ ... }}` — GitHub Actions expression syntax:**
Anything inside `${{ }}` is evaluated at runtime by GitHub Actions.
- `${{ secrets.BASE_URL }}` → reads the `BASE_URL` secret from repository settings
- `${{ matrix.node-version }}` → reads the current matrix value (18 or 20)
- `${{ always() }}` → a function that returns `true` regardless of previous step status

**`@v4` on actions** — version pinning:
`uses: actions/checkout@v4` pins the action to version 4.
Without pinning you would write `uses: actions/checkout` which would use `@main` (unstable).
Always pin to a major version (`@v4`) to avoid breaking changes.

**`cache: 'npm'`** — caches the npm dependency cache between runs.
After the first run, subsequent pushes skip re-downloading all packages if `package-lock.json`
hasn't changed. This can save 30–60 seconds per run on large projects.

**`on:`** — when to trigger:
- `push` → runs on every commit to master/develop
- `pull_request` → runs when a PR is opened against master
- `workflow_dispatch` → adds a "Run workflow" button in the GitHub Actions tab. Our workflow adds a `chapter` input so you can run a single chapter (`lecture-02`) instead of the full suite — useful for debugging without waiting for all 18.

**`concurrency`** → cancels any in-progress run for the same branch when a new push arrives. Prevents two runs from hitting the API simultaneously and triggering rate limits.

**`fail-fast: false`** → if Node 18 fails, Node 20 still runs. You see results on both versions.

**`jobs:`** → one or more jobs, each runs on a separate machine

**`runs-on: ubuntu-latest`** → Linux VM provided by GitHub (free)

**`steps:`** → sequential commands:
1. Checkout — download your repo code
2. Setup Node.js — install the right version
3. `npm ci` — clean install (faster than `npm install` in CI)
4. Run tests — `npm test` for all, or one chapter if `chapter` input was set
5. Upload artifacts — save the results

**`env:`** — pass secrets as environment variables to the test runner.
These are the same vars your `.env` file has locally.

---

## 6. Matrix Strategy

```yaml
strategy:
  matrix:
    node-version: [18, 20]
```

This creates TWO parallel jobs — one running Node 18, one running Node 20.
If your tests pass on both, you know your code works across versions.
GitHub runs them simultaneously — total time is the same as one job.

---

## 7. Artifacts

```yaml
- name: Upload test results
  if: always()           # runs even if tests fail
  uses: actions/upload-artifact@v4
  with:
    name: test-results-node-${{ matrix.node-version }}
    path: test-results/
    retention-days: 7
```

`if: always()` — upload even when tests fail. This lets you inspect the results to debug.

The `path: test-results/` folder is where artifacts are collected. Our `vitest.config.ts` uses `reporters: ['verbose']` — verbose output appears in the Actions log directly, so downloading artifacts is mainly useful when you need to share results outside GitHub.

---

## 7b. Parallel Jobs and Shared State

The matrix strategy runs Node 18 and Node 20 **simultaneously**. Both jobs hit the same API and the same test account (`TEST_USERNAME`). This creates a race condition whenever a test:

1. **Writes a value** to the shared account (e.g. `work`, `quote`, social links)
2. **Reads it back** to verify the write

If Job 2 writes its value between Job 1's write and Job 1's read, Job 1 reads the wrong value and fails.

**Fix — unique per-run values using `Date.now()`:**

```ts
// ❌ Both jobs write the same string — they overwrite each other
const testWork = 'QA Automation Engineer';

// ✅ Each job writes a unique string — each job only matches its own value
const run = Date.now();
const testWork = `QA Automation Engineer ${run}`;
```

`Date.now()` returns milliseconds since epoch. Two parallel jobs starting at different times get different values. Each job writes its own unique string and only reads that string back — no collision.

**When does this NOT apply?**
- Negative tests (checking 400/401) — no shared state written
- Read-only tests (GET only) — no state written
- Tests that create their own users (each job creates a different user with Faker)

**Rule:** any `beforeAll` that writes to a shared account field must use a unique value per run.

---

## 8. Status Badge

Add to your project's README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/tests.yml/badge.svg)
```

Shows green ✅ when tests pass, red ❌ when they fail.

---

## Key Takeaways

- ✅ Workflow file lives in `.github/workflows/tests.yml`
- ✅ Secrets replace `.env` in CI — never commit `.env` to the repo
- ✅ `npm ci` instead of `npm install` in CI — clean, fast, reproducible
- ✅ Matrix strategy runs on Node 18 AND 20 in parallel
- ✅ `if: always()` uploads artifacts even when tests fail — essential for debugging
- ✅ Tests that write to a shared account must use unique per-run values (`Date.now()`) — parallel matrix jobs share the same API account

**What's next:** Lecture 12 — Docker. Containerise the test runner so it runs identically everywhere.

---

## 9. Git

```bash
# Stage the files for this lecture
git add .github/workflows/tests.yml tests/lecture-11/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-11: GitHub Actions CI/CD pipeline"

# Push the branch to GitHub
git push -u origin lecture-11-cicd
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-11: GitHub Actions CI/CD pipeline`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-12-docker
```


## Homework

| Task | What it practices |
|------|------------------|
| 1 | Create `.github/workflows/tests.yml` with the workflow from section 3 |
| 2 | Add all 4 GitHub Secrets to your repository |
| 3 | Push a commit and verify the Actions tab shows the workflow running |
| 4 | Trigger the workflow manually using the `workflow_dispatch` `chapter` input |
| 5 | Add the status badge to your project README |

**Main exercise:** Create `.github/workflows/scheduled.yml` — a nightly test run using the `schedule:` trigger and cron syntax. Open `homework/starter.yml`, fill in the 5 TODOs, and copy it to `.github/workflows/scheduled.yml`.

No automated Vitest tests for this lecture — the homework is YAML and repository configuration.
