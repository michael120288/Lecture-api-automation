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

# Lecture 11
## CI/CD: GitHub Actions Pipeline

Every push triggers your tests automatically

---

## What CI/CD Means

**CI** — every commit runs your test suite
**CD** — after tests pass, code deploys

> This lecture focuses on CI — automated test execution

<!-- note: the payoff is immediate: no more "tests passed on my machine." The pipeline gives you a green/red signal within minutes of every push. -->

---

## The Pipeline Flow

`git push` → **GitHub Actions** triggers

↓ runs in parallel

| Job A | Job B |
|-------|-------|
| Node 18 | Node 20 |
| npm ci + test | npm ci + test |
| upload artifacts | upload artifacts |

<!-- note: both jobs run in parallel — total runtime is the same as one job. If either fails, the pipeline is red. Artifacts upload even when tests fail so you can debug. -->

---

## Workflow File Location

```
.github/
  workflows/
    tests.yml
```

- GitHub detects any `.yml` in `.github/workflows/`
- File name becomes the workflow name in Actions tab

<!-- note: the exact path matters. A file in the wrong directory is silently ignored — GitHub won't run it and won't warn you. -->

---

## Secrets vs Env Vars

> `${{ secrets.BASE_URL }}` is encrypted and masked in logs

```yaml
- run: npm test
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

**Never put credentials directly in YAML**

<!-- note: secrets are encrypted at rest and masked in every log line. Even if you accidentally echo them, GitHub replaces the value with ***. Plain YAML values are visible to everyone with repo access. -->

---

## Setting Up Secrets

Settings → Secrets and variables → Actions → New repository secret

| Name | Value |
|------|-------|
| `BASE_URL` | `https://api.codeandtest.com/api/v1` |
| `TEST_USERNAME` | your vitest username |
| `TEST_PASSWORD` | your test password |
| `DATABASE_URL` | MongoDB Atlas URL |

<!-- note: all four secrets are required. Missing any one causes the test run to fail with a missing environment variable error — not a test failure, an infrastructure failure. -->

---

## Matrix Strategy

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [18, 20]
```

- Creates **two parallel jobs**
- Same test suite on Node 18 and Node 20
- Total runtime = one job, not two
- `fail-fast: false` — if Node 18 fails, Node 20 still runs

<!-- note: if tests pass on both versions, you know your code is not accidentally relying on a Node version-specific behaviour. GitHub runs them simultaneously at no extra time cost. Without fail-fast: false, a failure on Node 18 cancels the Node 20 job — you lose half your signal. -->

---

## Concurrency — Cancel Stale Runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Cancels any in-progress run for the same branch when a new push arrives
- Prevents two runs hitting the API simultaneously
- Avoids rate limit errors from overlapping requests

<!-- note: without this, rapid pushes queue up parallel runs against the same branch. Two runs hitting the same API account at the same time can trigger rate limits or overwrite each other's test state. -->

---

## Parallel Jobs — Username Collision

Matrix jobs run **simultaneously** and share the same `TEST_USERNAME` account.

Race condition:

1. Both jobs write a value to the shared account
2. Job 2 overwrites Job 1's value
3. Job 1 reads back the wrong value → **fails**

---

## Fix — Unique Values with `Date.now()`

```ts
// ❌ Both jobs write the same string — they overwrite each other
const testWork = 'QA Automation Engineer';

// ✅ Each job writes a unique string — no collision
const run = Date.now();
const testWork = `QA Automation Engineer ${run}`;
```

`Date.now()` returns milliseconds since epoch — two jobs starting at different times get different values.

> **Rule:** any `beforeAll` that writes to a shared account field must use a unique value per run

<!-- note: this does NOT apply to negative tests, read-only GETs, or tests that create their own users with Faker — only to writes against a shared account field. -->

---

## npm ci vs npm install

| Command | Behaviour |
|---------|-----------|
| `npm install` | May update `package-lock.json` |
| `npm ci` | Reads lock file exactly, fails if it differs |

> `npm ci` is the correct command for CI

<!-- note: npm install can silently resolve to different versions if the lock file is out of date. npm ci treats any drift as an error — reproducible builds. -->

---

## Artifacts — Test Results After Failure

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results-node-${{ matrix.node-version }}
    path: test-results/
```

> `if: always()` — runs even when tests fail

<!-- note: without if: always(), artifacts only upload on success — useless for debugging failures. The retention period is configurable; 7 days is a sensible default. -->

---

## Add JUnit Reporter

```ts
// vitest.config.ts
reporters: process.env.CI ? ['junit', 'verbose'] : ['verbose'],
outputFile: { junit: 'test-results/junit.xml' },
```

- Generates downloadable XML in CI
- `verbose` locally — no XML noise

<!-- note: the conditional reporters pattern means local runs stay clean while CI produces the artifact GitHub Actions expects to upload. -->

---

## Common Mistakes

- Tabs instead of spaces in YAML — silently fails to parse
- Missing secrets — tests fail with env var errors
- Committing `.env` — credentials exposed
- Missing `if: always()` — no artifacts after failure

<!-- note: YAML is whitespace-sensitive. Most editors default to tabs. Set your editor to 2-space indentation for YAML files. -->

---

## Scheduled Nightly Runs

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # midnight UTC every day
```

Why push-triggered CI is not enough:
- Server changes at 2am → tests fail
- Nobody pushed → nobody knows

A nightly run catches server-side regressions automatically.

> Cron: `minute hour day month weekday` — `0 0 * * *` = midnight every day

<!-- note: the schedule trigger is the second most useful trigger after push. Students often don't realise the API can change without them changing any code. Nightly runs make those failures visible the next morning. -->

---

## Key Takeaways

- Secrets replace `.env` in CI — never commit `.env`
- `${{ secrets.X }}` is encrypted and masked in logs
- Matrix strategy: Node 18 + 20 in parallel, same time
- `fail-fast: false` — both versions always report results
- `concurrency` block prevents overlapping runs on the same branch
- `Date.now()` suffix prevents matrix job collisions on shared account fields
- `if: always()` on artifact upload is non-negotiable
- `schedule: cron` catches server regressions overnight

<!-- note: the secrets vs env vars distinction is the most exam-worthy concept. Emphasise it. -->

---

## Homework

Infrastructure setup — no Vitest test files:

| Task | What it builds |
|------|----------------|
| 1 | Create `.github/workflows/tests.yml` |
| 2 | Add all 4 GitHub Secrets |
| 3 | Push — verify Actions tab runs |
| 4 | Trigger manually using the `chapter` input |
| 5 | Add status badge to README |
| 6 | Create `.github/workflows/scheduled.yml` — nightly cron run |

After completing: every future push runs your test suite automatically, and every night the full suite runs on its own.
