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
  matrix:
    node-version: [18, 20]
```

- Creates **two parallel jobs**
- Same test suite on Node 18 and Node 20
- Total runtime = one job, not two

<!-- note: if tests pass on both versions, you know your code is not accidentally relying on a Node version-specific behaviour. GitHub runs them simultaneously at no extra time cost. -->

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

## Key Takeaways

- Secrets replace `.env` in CI — never commit `.env`
- `${{ secrets.X }}` is encrypted and masked in logs
- Matrix strategy: Node 18 + 20 in parallel, same time
- `if: always()` on artifact upload is non-negotiable

<!-- note: the secrets vs env vars distinction is the most exam-worthy concept. Emphasise it. -->

---

## Homework

Infrastructure setup — no Vitest test files:

| Task | What it builds |
|------|----------------|
| 1 | Create `.github/workflows/tests.yml` |
| 2 | Add all 4 GitHub Secrets |
| 3 | Push — verify Actions tab runs |
| 4 | Add JUnit reporters to `vitest.config.ts` |
| 5 | Add status badge to README |

After completing: every future PR runs your full test suite automatically.
