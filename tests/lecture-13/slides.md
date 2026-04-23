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

# Lecture 13
## Test Reporting

Reports are for humans and CI tools — not just for running tests

---

## Why Reports Exist

> Terminal pass/fail is not enough for a team

- HTML: developer reviews locally
- JUnit XML: CI system consumes it
- Coverage: tech lead sees gaps

<!-- note: explain that reports are artifacts — things you attach to a PR or send to a lead. The terminal output disappears. Reports persist. -->

---

## Reporter Selection Flow

| Command | Reporter | Output |
|---------|----------|--------|
| `npm test` | verbose | terminal |
| `CI=true npm test` | junit | `test-results/junit.xml` |
| `npm run test:coverage` | v8 | `coverage/index.html` |
| `newman run ...` | htmlextra | `newman-report.html` |

<!-- note: walk through each branch. The same command produces different output depending on where it runs. CI is a flag, not a different codebase. -->

---

## One Config, Three Outputs

```ts
reporters: process.env.CI
  ? ['junit', 'verbose']
  : ['html', 'verbose'],
outputFile: {
  junit: 'test-results/junit.xml',
  html:  'html/index.html',
},
```

<!-- note: show that process.env.CI is set automatically by GitHub Actions. Locally it's undefined, so the else branch runs. -->

---

## JUnit XML — CI's Language

> You do NOT read JUnit XML yourself

- GitHub Actions reads it natively
- Shows per-test pass/fail in the run view
- Built into Vitest — no extra package

<!-- note: emphasize this point hard. Students often think they need to open the file. They don't. The CI platform parses it and renders a summary. -->

---

## JUnit in GitHub Actions

```yaml
- name: Upload JUnit report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: junit-report
    path: test-results/junit.xml
```

> `if: always()` — get the report even on failure

<!-- note: if you omit always(), a failing test suite means you lose the report entirely. That's the worst time to lose it. -->

---

## Coverage — v8 Setup

```bash
npm install --save-dev @vitest/coverage-v8
npm run test:coverage
```

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.ts'],
},
```

<!-- note: coverage tells you WHICH lines are tested, not whether your tests are good. A test that always passes isn't valuable just because it covers a line. -->

---

## Reading Coverage

- Green lines: tested
- Red lines: not covered

> Goal is NOT 100%

- Cover: auth, CRUD, error paths
- Skip: logging utilities, constants

<!-- note: chasing 100% wastes time. A red line in the signin flow should worry you. A red line in a logger utility does not. -->

---

## Newman — Postman in CI

```bash
npm install -g newman newman-reporter-htmlextra
newman run chatty-api.postman_collection.json \
  -e chatty-prod.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export reports/newman.html
```

<!-- note: newman runs the entire Postman collection without opening a browser. The htmlextra plugin generates a standalone HTML file you can share with anyone. -->

---

## Exporting from Postman

1. Click `...` next to collection name
2. Export → Collection v2.1
3. Environments sidebar → `...` → Export

> Save as `.json` files, not URLs

<!-- note: the Postman UI moved Export behind the three-dots menu. There is no File menu. Students waste time looking for it. -->

---

## What Belongs in `.gitignore`

- `html/`
- `coverage/`
- `reports/`

> Never commit generated report folders

<!-- note: these are build artifacts. They change every run. Committing them creates noise in git history and can expose test output to the public. -->

---

## Key Rule

> JUnit XML is consumed by GitHub Actions — you don't read it yourself

- `process.env.CI` switches reporters automatically
- Coverage shows gaps — not quality
- Newman brings Postman into any pipeline

---

## Homework

| Task | Goal |
|------|------|
| 1 | Install `@vitest/coverage-v8`, run coverage, read the report |
| 2 | Update `vitest.config.ts` with JUnit + HTML reporters |
| 3 | Export Postman collection and environment |
| 4 | Run Newman with `htmlextra`, open the HTML |
| 5 | Update `tests.yml` to upload JUnit + coverage artifacts |
