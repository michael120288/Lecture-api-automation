# Homework — Lecture 13: Test Reporting — Vitest, Newman & Coverage

> **Goal:** Generate HTML, JUnit, and coverage reports. Run Newman. Push reports to CI. Go beyond the basics.

---

## Core Tasks

Complete these first — they prove the reporting pipeline works.

| Task | What it practices |
|------|------------------|
| 1 | Install `@vitest/coverage-v8`, run `npm run test:coverage`, open HTML report |
| 2 | Update `vitest.config.ts` with JUnit + HTML reporters, run `CI=true npm test` |
| 3 | Export Postman collection (JSON) and environment (JSON) from Postman |
| 4 | Install Newman, run with `--reporters htmlextra`, open the HTML report |
| 5 | Update `.github/workflows/tests.yml` to upload JUnit + coverage as artifacts |

---

## Stretch Tasks

These go beyond the lecture. Each requires reading, experimenting, and thinking independently.

### Stretch 1 — Coverage thresholds (make CI fail on low coverage)

Add thresholds to your `vitest.config.ts`:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/**/*.ts'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
  },
},
```

Run `npm run test:coverage`. If coverage is above the thresholds — all good.
Now temporarily lower a threshold below the actual coverage (e.g. `lines: 99`) and run again — watch it fail.

**Why this matters:** Without thresholds, coverage reports are informational only. With thresholds, CI fails when coverage drops — you get an automatic safety net against untested code.

---

### Stretch 2 — Inspect the `lcov` report format

After adding `'lcov'` to the reporters list and running coverage, open `coverage/lcov.info` in a text editor.

```
SF:src/test-utils.ts
FN:3,expectRejected
FNDA:12,expectRejected
DA:4,12
DA:5,12
end_of_record
```

Each line means:
- `SF` — source file
- `FN` — function name and line number
- `FNDA` — how many times the function was called
- `DA` — line number and hit count

**Why this matters:** `lcov.info` is the format consumed by GitHub, Codecov, Coveralls, and SonarQube. Understanding it helps you debug coverage issues when the HTML report doesn't match CI.

---

### Stretch 3 — Newman with delay and iteration count

Rate limits can cause Newman runs to fail in CI. Add delay between requests:

```bash
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --delay-request 500 \
  --reporters htmlextra \
  --reporter-htmlextra-export reports/newman-report.html
```

`--delay-request 500` adds a 500ms pause between each request.

Also try running the collection twice:
```bash
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --iteration-count 2
```

**Why this matters:** Newman with `--iteration-count` is the equivalent of load testing — running the same requests N times. It's also how you simulate multiple users in Postman.

---

### Stretch 4 — Override a Newman environment variable from the CLI

You don't always want to edit the exported environment file. Override one variable at runtime:

```bash
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --env-var "BASE_URL=https://api.codeandtest.com/api/v1" \
  --reporters htmlextra \
  --reporter-htmlextra-export reports/newman-report-override.html
```

This is how you run the same collection against different environments (staging vs prod) without changing the exported file.

---

### Stretch 5 — Open the coverage report and identify uncovered code

Run `npm run test:coverage` and open `coverage/index.html`.

Find a file with less than 100% branch coverage. Click on it — red-highlighted lines are untested branches.

In `src/test-utils.ts`, there is a branch in `expectRejected` that handles the case where the status is NOT 400 or 429. Is that branch covered by any test? If not — which test would you write to cover it?

Write the answer (not the test) in your PR description.

**Why this matters:** Coverage highlights code paths that have never been exercised. Even 100% line coverage can miss branches — a line with `if (x || y)` has 3 paths but only 1 line.

---

## Reflection Questions

Answer these in a comment on your PR or in a `homework-notes.md` file.

1. **What is the difference between `if: always()` and `if: failure()` in GitHub Actions?** Give a concrete example of when you'd use `if: failure()`.
2. **Coverage is 95% — is the code well-tested?** What does the 5% represent and why might it matter?
3. **Newman vs Postman UI — name two scenarios where Newman is strictly better.**
4. **The JUnit XML reporter outputs `test-results/junit.xml`. Who actually reads this file?** (Think: what tools consume it.)
5. **Why does the coverage `include: ['src/**/*.ts']` matter?** What would happen if you removed it?

---

## How to Verify

Your homework is complete when:

- [ ] `npm run test:coverage` opens an HTML coverage report in the browser
- [ ] `CI=true npm test` generates `test-results/junit.xml`
> **Windows users:** Use `set CI=true && npm test` (CMD) or `$env:CI="true"; npm test` (PowerShell) instead of `CI=true npm test`.

- [ ] Newman HTML report opens in the browser with all requests shown
- [ ] GitHub Actions uploads both JUnit and coverage artifacts
- [ ] Coverage thresholds are set and fail as expected when lowered (Stretch 1)
- [ ] `lcov.info` opened and at least one line explained (Stretch 2)

---

## Git — Commit Your Homework

```bash
# Create a homework branch from the lecture branch
git checkout lecture-13-reporting
git checkout -b lecture-13-reporting-homework

# Add config files you modified
git add vitest.config.ts .github/workflows/tests.yml
git status

# Commit
git commit -m "lecture-13: homework complete — reporting, coverage, Newman"
git push -u origin lecture-13-reporting-homework
```

### Open a Pull Request

- Base branch: `lecture-13-reporting`
- Compare: `lecture-13-reporting-homework`
- Title: `lecture-13: homework complete — reporting`
- Include answers to the reflection questions in the PR description
