# Code Coverage

## Table of Contents

- [What Is Code Coverage?](#what-is-code-coverage)
- [The Four Coverage Types](#the-four-coverage-types)
- [Why 100% Coverage Does Not Mean Bug-Free](#why-100-coverage-does-not-mean-bug-free)
- [Coverage Providers: v8 vs Istanbul](#coverage-providers-v8-vs-istanbul)
- [Installing the Coverage Provider](#installing-the-coverage-provider)
- [Configuring Coverage in vitest.config.ts](#configuring-coverage-in-vitestconfigts)
- [Running Coverage](#running-coverage)
- [Reading the HTML Report](#reading-the-html-report)
- [The lcov.info Format](#the-lcovinfo-format)
- [Setting Thresholds](#setting-thresholds)
- [What an Uncovered Branch Means](#what-an-uncovered-branch-means)
- [Coverage in an API Test Suite](#coverage-in-an-api-test-suite)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## What Is Code Coverage?

Code coverage is a measurement of how much of your source code is executed when your tests run. It is expressed as a percentage.

If your `src/` directory contains 200 lines of code and your tests execute 160 of them, your line coverage is 80%.

Coverage tools instrument your code before running tests. Instrumentation means inserting tracking statements at every relevant point in the code. When each statement executes, the tracker records it. After the tests finish, the tracker reports which statements were and were not reached.

In this course, the `src/` directory contains the helper modules: `config.ts`, `fixtures.ts`, `interfaces.ts`, and `test-utils.ts`. These are the files coverage tracks. The test files themselves (inside `tests/`) are typically excluded because measuring coverage of the test code itself is not meaningful.

---

## The Four Coverage Types

### Line Coverage

Tracks whether each line of source code was executed. This is the most commonly cited metric.

```typescript
// If this line executes during tests → covered
export function expectRejected(status: number): void {
  expect([400, 429]).toContain(status);  // ← line coverage point
}
```

A line with multiple statements on it counts as covered if any part of it executes.

### Branch Coverage

Tracks whether each branch of a conditional statement was executed. A branch is each possible outcome of an `if`, `switch`, ternary, or logical operator.

```typescript
// This function has TWO branches:
//   Branch 1: status === 400 → first branch (the 400 case)
//   Branch 2: status === 429 → second branch (the 429 case)
export function expectSuccess(status: number): void {
  expect([200, 201]).toContain(status);
}

// A more explicit branch example:
function getHeader(raw: string | string[] | undefined): string {
  // Branch 1: Array.isArray(raw) is true
  // Branch 2: Array.isArray(raw) is false — falls through to raw ?? ''
  return Array.isArray(raw) ? raw[0] : (raw ?? '');
}
```

If your tests never call `getHeader` with an array, branch coverage will show one untested branch.

### Function Coverage

Tracks whether each function (or method, arrow function, class method) was called at least once.

```typescript
// If no test ever calls expectRejected → function is uncovered
export function expectRejected(status: number): void { ... }

// If no test ever calls expectSuccess → function is uncovered  
export function expectSuccess(status: number): void { ... }
```

100% function coverage means every function in `src/` was invoked at least once by the test suite.

### Statement Coverage

Tracks each individual statement. Similar to line coverage but more granular. A single line with multiple statements (e.g. `const x = a; const y = b;` written on one line) counts each statement separately.

In practice, line coverage and statement coverage are often identical or very close for well-formatted TypeScript code where each statement has its own line.

### Summary

| Type | Granularity | What it catches |
|---|---|---|
| **Statement** | Individual statements | Dead code |
| **Line** | Lines of code | Unexecuted lines |
| **Branch** | Conditional outcomes | Untested code paths |
| **Function** | Function declarations | Never-called functions |

Branch coverage is the most valuable metric. A function can have 100% line coverage but still have uncovered branches if both sides of every `if` were never tested.

---

## Why 100% Coverage Does Not Mean Bug-Free

This is the most important thing to understand about code coverage.

Coverage measures which code was **executed**, not whether the code **produced the correct result**.

```typescript
// Buggy function
function add(a: number, b: number): number {
  return a - b;  // bug: should be a + b
}

// Test with 100% line AND branch coverage
it('adds two numbers', () => {
  const result = add(5, 5);
  // BUG: no assertion! test passes but never catches the wrong answer
  // If we add expect(result).toBe(10), it would fail and reveal the bug.
});
```

The test above gives `add` 100% coverage because the line `return a - b` was executed. But because there is no assertion, the bug is invisible.

Coverage is a floor, not a ceiling. 40% coverage is certainly a problem — most code was never exercised. 100% coverage does not mean the tests are good; it means no code was skipped.

Other things coverage cannot tell you:
- Whether the assertions are correct.
- Whether edge cases with unusual inputs are handled.
- Whether the code handles race conditions.
- Whether the API contract (what the server actually returns) is as documented.

For API testing specifically, coverage is less central than for unit testing. The "code" being tested lives on the server. What we measure locally is the coverage of our helper code in `src/`.

---

## Coverage Providers: v8 vs Istanbul

Vitest supports two coverage providers.

### @vitest/coverage-v8

Uses Node.js's built-in V8 coverage infrastructure. V8 is the JavaScript engine that powers Node.js. V8 natively tracks which parts of the bytecode were executed, so coverage is collected at the engine level without modifying source code.

**Pros:**
- No source code transformation — measures what actually runs.
- Lower overhead — V8 coverage is built in, not injected.
- Works well with native ESM.

**Cons:**
- Less accurate branch coverage for some TypeScript patterns.
- The `c8` tool that backs v8 coverage interprets V8's internal data, which can occasionally produce unexpected results.

### @vitest/coverage-istanbul

Uses the Istanbul library, which has been the standard JavaScript coverage tool for over a decade (it is also what Jest uses). Istanbul instruments the source code by inserting tracking calls before each relevant token.

**Pros:**
- More accurate and predictable branch coverage.
- Battle-tested — used by the broader JavaScript ecosystem for years.
- Source code instrumentation is well understood.

**Cons:**
- Transforms the source code before running — slightly higher overhead.
- Can occasionally conflict with complex TypeScript transformations.

### When to choose each

| Situation | Recommendation |
|---|---|
| New project, pure TypeScript, no native modules | `v8` — simpler, fast, no extra package |
| Need accurate branch coverage reporting | `istanbul` — more precise |
| Already using Jest/Istanbul elsewhere | `istanbul` — consistent tooling |
| This course | `v8` — it matches the course setup |

Install the provider you choose:

```bash
npm install --save-dev @vitest/coverage-v8
# or
npm install --save-dev @vitest/coverage-istanbul
```

---

## Installing the Coverage Provider

```bash
# For v8 (used in this course)
npm install --save-dev @vitest/coverage-v8
```

After installing, the `npm run test:coverage` command in `package.json` works:

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Configuring Coverage in vitest.config.ts

Add a `coverage` section to the `test` object:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    reporters: ['verbose'],
    fileParallelism: false,
    env: {
      BASE_URL: process.env.BASE_URL ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
    },

    // ─── Coverage configuration ───────────────────────────────────────────────
    coverage: {
      // Which provider to use
      provider: 'v8',

      // Output formats
      // 'text' prints a summary table to the terminal
      // 'html' generates a navigable HTML report in coverage/
      // 'lcov' generates coverage/lcov.info for external tools (SonarQube, Codecov)
      reporter: ['text', 'html', 'lcov'],

      // Which source files to measure
      // Without this, Vitest may include test files themselves
      include: ['src/**/*.ts'],

      // Exclude files that don't need coverage measurement
      exclude: [
        'src/**/*.d.ts',       // type declaration files
        'node_modules/**',
      ],

      // Fail if coverage drops below these thresholds
      // Vitest exits with a non-zero code if any threshold is not met
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

### Configuration keys explained

| Key | Type | Description |
|---|---|---|
| `provider` | `'v8'` or `'istanbul'` | Coverage engine |
| `reporter` | `string[]` | Output formats |
| `include` | `string[]` | Glob patterns for source files to track |
| `exclude` | `string[]` | Glob patterns for files to skip |
| `thresholds` | `object` | Minimum percentages; fail CI if not met |
| `reportsDirectory` | `string` | Where to write reports (default: `coverage/`) |
| `all` | `boolean` | If true, include files not imported by any test |

---

## Running Coverage

```bash
# Run tests with coverage (exits after one run)
npm run test:coverage

# Equivalently
npx vitest run --coverage
```

Terminal output:

```
 RUN  v1.6.0 /Users/student/chatty-api-tests

 ✓ tests/lecture-01/lecture.test.ts (8 tests) 843ms
 ✓ tests/lecture-04/lecture.test.ts (14 tests) 2341ms

 Test Files  2 passed (2)
      Tests  22 passed (22)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   91.66 |    83.33 |   75.00 |   91.66 |
 src/     |         |          |         |         |
  config.ts  | 100.00 |   100.00 |  100.00 |  100.00 |
  fixtures.ts| 100.00 |   100.00 |  100.00 |  100.00 |
  test-utils | 83.33  |    66.67 |   50.00 |   83.33 | 32
----------|---------|----------|---------|---------|-------------------
```

The `Uncovered Line #s` column shows which line numbers were not executed. Line 32 in `test-utils.ts` means `expectSuccess` was never called in these two test files.

---

## Reading the HTML Report

After running coverage, open `coverage/index.html` in your browser:

```bash
open coverage/index.html      # macOS
xdg-open coverage/index.html  # Linux
> **Windows users:** Use `start coverage/index.html` to open the report.

> **Windows users:** Use `start coverage/index.html` to open the report in your default browser.

start coverage/index.html     # Windows
```

The HTML report has three levels:

**1. Summary page:** Lists all source files with their coverage percentages. Files with low coverage are highlighted in red or yellow.

**2. File page:** Click any filename to see the annotated source. Lines are color-coded:
- Green background: line was executed.
- Red background: line was never executed.
- Yellow background (branch indicator): line was executed but not all branches were taken.

**3. Branch markers:** On conditional lines, the report shows `T` (true branch taken) and `F` (false branch taken) inline. A grayed-out `T` or `F` means that branch was never reached.

Example of branch indicators in the HTML report:

```typescript
// Line 15 in test-utils.ts — has two branches
const header = Array.isArray(raw)    // ← T/F markers appear here
  ? raw[0]                           // ← green if Array.isArray was ever true
  : (raw ?? '');                     // ← red if Array.isArray was never false
```

If your tests only pass a single string (never an array), the `T` branch is uncovered and appears red.

---

## The lcov.info Format

When you use `reporter: ['lcov']`, Vitest generates `coverage/lcov.info`. This is a plain-text file in the LCOV format, an open standard for coverage data.

Example snippet:

```
SF:src/test-utils.ts
FN:7,expectRejected
FN:20,expectSuccess
FNDA:3,expectRejected
FNDA:0,expectSuccess
FNF:2
FNH:1
DA:8,3
DA:9,3
DA:22,0
BRH:1
BRF:2
end_of_record
```

Key tokens:
- `SF:` — source file path
- `FN:` — function declaration (line number, function name)
- `FNDA:` — function call count (call count, function name)
- `DA:` — line execution count (line number, count)
- `BRH:` / `BRF:` — branches hit / branches found

Tools that consume `lcov.info`:
- **Codecov** — hosted coverage tracking, adds coverage diff comments to pull requests
- **Coveralls** — similar to Codecov
- **SonarQube** — code quality platform that overlays coverage on code analysis
- **genhtml** — command-line tool to generate HTML from lcov.info (used internally by Vitest's html reporter)
- **GitHub Actions** — can parse lcov.info to post coverage summaries as PR comments

---

## Setting Thresholds

Thresholds fail the coverage step (non-zero exit code) if coverage drops below the specified percentages.

```typescript
coverage: {
  thresholds: {
    lines: 80,
    branches: 70,
    functions: 80,
    statements: 80,
  },
},
```

When a threshold is not met, Vitest prints an error and exits with code 1:

```
 ERROR  Coverage for lines (64.28%) does not meet the threshold (80%)
```

In CI, this causes the workflow step to fail and blocks the pull request from merging.

### Threshold strategy

Start with achievable thresholds and raise them over time. Setting `100` immediately is counterproductive — you will spend time hitting 100% rather than writing meaningful tests.

For this course:

| Metric | Suggested threshold | Rationale |
|---|---|---|
| Lines | 80 | Most src/ helpers should be exercised |
| Branches | 70 | Some defensive branches may be hard to trigger |
| Functions | 80 | All major helpers should be called |
| Statements | 80 | Matches lines for well-formatted TypeScript |

### Per-file thresholds

```typescript
coverage: {
  thresholds: {
    'src/test-utils.ts': {
      lines: 90,    // stricter for the most used helper
    },
    'src/config.ts': {
      lines: 100,   // simple file, easy to fully cover
    },
  },
},
```

---

## What an Uncovered Branch Means

An uncovered branch means one of the possible outcomes of a conditional was never exercised by any test.

In `lecture-01/lecture.test.ts`:

```typescript
// From src/test-utils.ts
export function expectRejected(status: number): void {
  expect([400, 429]).toContain(status);
}
```

There are no branches in this function. But consider:

```typescript
// In lecture-09, beforeAll builds sessionCookie like this:
const raw = loginRes.headers['set-cookie'];
sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
```

This ternary has two branches:
- Branch 1: `raw` is an array — take `raw[0]`.
- Branch 2: `raw` is not an array — take `raw ?? ''`.

If the test suite only ever triggers the array branch (because `set-cookie` is always returned as an array), the non-array branch is never exercised. Coverage reports this as an uncovered branch.

Uncovered branches are more meaningful than uncovered lines because they reveal code paths that are untested. A function that handles both success and error but only the success path is ever exercised gives false confidence.

---

## Coverage in an API Test Suite

In an end-to-end API test suite like this course, there is a conceptual difference from unit testing:

The primary code being tested is the **server** (chatty-backend). Coverage tools running in the test project measure the **test helper code** in `src/`, not the server code.

This means:
- 100% coverage in `chatty-api-tests/src/` tells you that all your helper functions and config logic were exercised.
- It says nothing about the coverage of the actual API routes on the server.

For API test suites, the meaningful coverage question is: "Did we test all the important API endpoints and their error cases?" This is better answered by a test matrix (list of endpoints × scenarios) than by a coverage percentage.

Coverage in an API test context is still useful for:
- Ensuring all helpers in `src/test-utils.ts` are actually used.
- Catching dead code in fixture files.
- Providing a number that can gate CI merges.

---

## Common Mistakes

### Mistake: not installing the coverage provider

```
Error: Failed to initialize coverage. The provider '@vitest/coverage-v8' was not found.
```

Fix:
```bash
npm install --save-dev @vitest/coverage-v8
```

### Mistake: including test files in coverage

If `include` is not set, Vitest may count the `tests/` directory. Test files calling every utility function makes coverage look artificially high.

```typescript
// Correct — only measure source helpers
coverage: {
  include: ['src/**/*.ts'],
}
```

### Mistake: confusing coverage with quality

```typescript
// 100% line coverage — but the test proves nothing
it('calls the function', () => {
  expectRejected(400);  // called, so covered
  // no assertion about behavior
});
```

Coverage is a diagnostic tool. It reveals gaps. It does not validate correctness.

### Mistake: setting thresholds at 100% immediately

A 100% branch threshold fails on the first defensive `if` you add for a scenario your tests do not cover. Set realistic thresholds and tighten them over time.

---

## Related Topics

- [GitHub Actions](github-actions.md) — failing CI when coverage drops below threshold
- [Test Lifecycle](test-lifecycle.md) — how beforeAll/afterAll affects which lines execute
- [Test Data Strategy](test-data-strategy.md) — ensuring all code paths are exercised

## Official Documentation

- [Vitest — Coverage guide](https://vitest.dev/guide/coverage.html)
- [V8 coverage — Node.js docs](https://nodejs.org/api/inspector.html)
- [Istanbul (c8/v8) GitHub](https://github.com/istanbuljs/istanbuljs)
- [LCOV format specification](https://ltp.sourceforge.net/coverage/lcov/geninfo.1.php)
