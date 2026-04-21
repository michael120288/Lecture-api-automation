# Lecture 13 — Test Reporting: HTML, JUnit, Newman & Coverage

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 12 — Docker containerised test runner.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm run test:report    # HTML report
> npm run test:coverage  # coverage report
> newman run collection.json -e environment.json --reporters htmlextra
> ```

---

## What You Will Learn

- Vitest built-in reporters: `verbose`, `html`, `junit`, `json`
- How to generate an HTML report and open it in a browser
- How to generate JUnit XML for CI/CD integration
- Code coverage — what it means and how to read the report
- `@vitest/coverage-v8` — the coverage provider
- **Newman** — running your Postman collection from the terminal (no UI)
- Newman HTML report — `newman-reporter-htmlextra`
- Exporting Postman collections and environments
- Integrating reports into the GitHub Actions workflow

> **Reference Topics**
> - Code coverage deep-dive → [`docs/topics/coverage.md`](../../docs/topics/coverage.md)
> - Newman CLI reference → [`docs/topics/newman.md`](../../docs/topics/newman.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Reports Matter |
| 2 | Vitest Reporters |
| 3 | HTML Report Setup |
| 4 | JUnit Report Setup |
| 5 | Coverage Report |
| 6 | Newman — Postman CLI |
| 7 | Updated `vitest.config.ts` |
| 8 | Updated `package.json` Scripts |
| 9 | CI/CD Integration |
| 10 | Running Everything |

---

## 1. Why Reports Matter

Running tests in a terminal gives you a pass/fail summary. Reports give you:
- **HTML**: visual overview, click on each test to see details
- **JUnit XML**: machine-readable, consumed by Jenkins/GitHub Actions/Azure DevOps
- **Coverage**: which lines of code are exercised by tests
- **Newman HTML**: Postman test results in a shareable HTML file

These are what you send to a team lead or include in a PR comment.

---

## 2. Vitest Reporters

| Reporter | Output | Command |
|----------|--------|---------|
| `verbose` | terminal (default) | `npm test` |
| `html` | `html/index.html` | `npm run test:report` |
| `junit` | `test-results/junit.xml` | `npm run test:ci` |
| `json` | `test-results/results.json` | add to config |

---

## 3. HTML Report Setup

```bash
npm install --save-dev @vitest/ui
```

In `vitest.config.ts`:
```ts
reporters: process.env.CI ? ['junit', 'verbose'] : ['html', 'verbose'],
outputFile: {
  html: 'html/index.html',
  junit: 'test-results/junit.xml',
},
```

Run:
```bash
npx vitest --reporter=html
# Opens in browser automatically OR open html/index.html manually
```

---

## 4. JUnit Report Setup

No extra package needed — JUnit is built into Vitest.

```ts
// vitest.config.ts
reporters: process.env.CI ? ['junit', 'verbose'] : ['verbose'],
outputFile: {
  junit: 'test-results/junit.xml',
},
```

The `junit.xml` file is uploaded as an artifact in GitHub Actions and displayed in the
Actions run summary as a test report.

---

## 5. Coverage Report

**`v8` vs `istanbul` — which provider to choose:**

| Provider | Package | How it works | Best for |
|----------|---------|-------------|---------|
| `v8` | `@vitest/coverage-v8` | Uses Node.js built-in V8 engine instrumentation — no code transformation | Speed, ESM projects |
| `istanbul` | `@vitest/coverage-istanbul` | Injects counters into code during transpilation — well-established | Accurate branch coverage |

We use `v8` because it requires no extra transformation and works natively with our TypeScript/Vitest setup.

```bash
npm install --save-dev @vitest/coverage-v8
```

In `vitest.config.ts`:
```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.ts'],
},
```

Run:
```bash
npm run test:coverage
# Opens coverage/index.html — shows which lines are tested
```

**Reading the report:**
- Green lines = covered by tests
- Red lines = not covered
- Goal is NOT 100% — focus on critical paths (auth, CRUD operations)

---

## 6. Newman — Postman CLI

Newman lets you run your entire Postman collection from the terminal — no Postman UI needed.

```bash
# Install globally
npm install -g newman newman-reporter-htmlextra
```

**Why is `newman-reporter-htmlextra` separate from `newman`?**
Newman uses a plugin architecture for reporters. The built-in `cli` reporter outputs
to the terminal. `htmlextra` is a community plugin that generates a rich HTML report.
Installing it globally makes it available to Newman automatically.

**Exporting from Postman (current UI — no "File" menu):**
1. Open your collection in Postman
2. Click the `...` (three dots) next to the collection name
3. Select **Export** → choose **Collection v2.1** → Save as `chatty-api.postman_collection.json`
4. For the environment: click **Environments** in the left sidebar
   → `...` next to your environment → **Export** → Save as `chatty-prod.postman_environment.json`

```bash

# Run with CLI report (terminal output)
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json

# Run with HTML report
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export newman-report.html
```

---

## 7. Updated `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    reporters: process.env.CI
      ? [['junit', {}], 'verbose']
      : ['verbose'],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    },
    env: {
      BASE_URL:      process.env.BASE_URL      ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
      DATABASE_URL:  process.env.DATABASE_URL  ?? '',
    },
  },
});
```

---

## 8. Updated `package.json` Scripts

```json
{
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:ci":       "CI=true vitest run",

> **Windows users:** `CI=true` inline syntax does not work on Windows CMD.
> Use `set CI=true && npx vitest run` (CMD) or `$env:CI="true"; npx vitest run` (PowerShell).


> **Windows users:** `CI=true` inline syntax does not work on Windows CMD.
> Use `cross-env CI=true vitest run` (install `cross-env` first: `npm install --save-dev cross-env`),
> or use `set CI=true && npm test` (CMD) / `$env:CI="true"; npm test` (PowerShell).

    "test:report":   "npx vitest --reporter=html && open html/index.html",
> **Windows users:** Replace `open html/index.html` with `start html/index.html`.

    "test:coverage": "vitest run --coverage && open coverage/index.html"
> **Windows users:** Replace `open coverage/index.html` with `start coverage/index.html`.

  }
}
```

---

## 9. CI/CD Integration (updates to tests.yml)

Add after the Run Vitest step:

```yaml
      - name: Upload JUnit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit-report-node-${{ matrix.node-version }}
          path: test-results/junit.xml
          retention-days: 14

      - name: Upload coverage
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node-${{ matrix.node-version }}
          path: coverage/
          retention-days: 7
```

---

## Key Takeaways

- ✅ `reporters: process.env.CI ? ['junit'] : ['html']` — different output per environment
- ✅ Coverage shows WHICH lines are tested — aim for critical paths, not 100%
- ✅ Newman runs your full Postman collection from CI — no browser needed
- ✅ `newman-reporter-htmlextra` generates beautiful standalone HTML reports

**Congratulations — you have completed all 13 lectures!**

---

## 10. Running Everything

```bash
# Vitest with HTML report
npm run test:report

# Vitest with coverage
npm run test:coverage

# Newman (after exporting collection and environment from Postman)
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export reports/newman-report.html
```

---

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-13/ vitest.config.ts
git status                          # verify what will be committed

# Commit
git commit -m "lecture-13: test reporting — Vitest reporters, Newman, coverage"

# Push the branch to GitHub
git push -u origin lecture-13-reporting
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request**
3. Title: `lecture-13: test reporting — Vitest reporters, Newman, coverage`
4. Merge when ready

### After merging — start the next lecture

```bash
git checkout main
git pull origin main
git checkout -b lecture-14-password-reset
```

---

## Homework

| Task | What it practices |
|------|------------------|
| 1 | Install `@vitest/coverage-v8`, run `npm run test:coverage`, read the report |
| 2 | Update `vitest.config.ts` with JUnit + HTML reporters |
| 3 | Export your Postman collection and environment |
| 4 | Run Newman with `--reporters htmlextra`, open the HTML report |
| 5 | Update `.github/workflows/tests.yml` to upload JUnit + coverage artifacts |

No automated Vitest tests for this lecture — homework is configuration and reports.
