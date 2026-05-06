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
  .do-this { background: #e8f5e9; border-left: 6px solid #2e7d32; padding: 1rem; border-radius: 4px; }
  .check { background: #e3f2fd; border-left: 6px solid #1565c0; padding: 1rem; border-radius: 4px; }
---

# Lecture 01
## Setup & Your First API Test

**API Automation with Vitest + Axios + TypeScript**

⏱ 75–90 min

<!-- note: Welcome slide. Remind students to open prereqs.md FIRST if they haven't. This is the longest lecture — all subsequent ones are 60–75 min. -->

---

## Agenda

| # | Topic | Time |
|---|-------|------|
| 1 | Why API testing + our tools | 10 min |
| 2 | **▶ Project setup** | 20 min |
| 3 | Key concepts: validateStatus, async/await | 15 min |
| 4 | **▶ Run your first test** | 15 min |
| 5 | Rate limiting + common mistakes | 10 min |
| 6 | Homework walkthrough | 5 min |

> By the end: **6 tests passing** against the real production API

<!-- note: Walk through the agenda. Emphasise the two hands-on blocks. Students should have Node 18+ and their vitest account ready from prereqs.md -->

---

## Why API Testing?

- Manual Postman clicking does not scale
- Automated tests run 100 endpoints in seconds
- Catch regressions after every code change

> **Positive test** — correct input → success response
> **Negative test** — bad input → correct error response

Both types are required. A server that accepts everything is broken.

<!-- note: Ask the room: who has tested an API manually? Who has written any automated test? Bridge from there. -->

---

## The Testing Pyramid

| Layer | Count | Speed | Stability |
|-------|-------|-------|-----------|
| E2E Tests | few | slow | fragile |
| **API Tests ← we are here** | **many** | **fast** | **realistic** |
| Unit Tests | most | fastest | isolated |

> API tests test real HTTP round-trips — no mocks, no browser

<!-- note: We sit in the sweet spot. Real responses from the real server. Not fragile like E2E. Not fake like unit tests with mocks. -->

---

## Our Tools

| Tool | Role | Why not the alternative |
|------|------|------------------------|
| **Vitest** | Test runner | Zero-config TS, 2–5× faster than Jest |
| **Axios** | HTTP client | Works against any URL — not just localhost |
| **TypeScript** | Language | Catches errors before tests run |
| **Faker.js** | Test data | Unique username every run — no clashes |

> Supertest requires the Express `app` — Axios works against production

<!-- note: The key point on Axios: it works against codeandtest.com or localhost with the same code. Supertest is tied to your local server. -->

---

## ▶ DO THIS — Project Setup (20 min)

Open your terminal. Run these commands one at a time:

```bash
mkdir chatty-api-tests
cd chatty-api-tests
npm init -y
```

```bash
npm install axios dotenv
npm install --save-dev vitest typescript @types/node @faker-js/faker
```

> `dependencies` = needed at runtime (axios, dotenv)
> `devDependencies` = only during development (vitest, typescript, faker)

<!-- note: STOP. Everyone types these. Walk the room. The two-command pattern is intentional — it makes the deps/devDeps split visible. -->

---

## ▶ DO THIS — `package.json` Scripts

Open `package.json` and replace the `"scripts"` section:

```json
{
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:ui":       "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

| Script | When to use |
|--------|-------------|
| `npm test` | Run once — use in CI |
| `npm run test:watch` | Watch mode during coding |
| `npm run test:ui` | Visual browser UI |

<!-- note: STOP. Everyone adds scripts. npm test will be the most-used command in the course. -->

---

## ▶ DO THIS — `tsconfig.json`

Create `tsconfig.json` in the project root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

> `"types": ["vitest/globals"]` — IDE autocomplete for `describe`, `it`, `expect`

<!-- note: STOP. Everyone creates this. Without vitest/globals, the IDE shows red squiggles under describe/it/expect. Tests still run — it's purely for the IDE. -->

---

## ▶ DO THIS — `vitest.config.ts`

Create `vitest.config.ts` in the project root:

```ts
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
      BASE_URL:      process.env.BASE_URL      ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
    },
  },
});
```

> `fileParallelism: false` — prevents 20+ concurrent auth requests hitting the rate limiter

<!-- note: STOP. Everyone creates this. Key point: dotenvConfig loads .env into the MAIN process. env:{} forwards to worker threads. Both are required. -->

---

## ▶ DO THIS — `.env` and `src/config.ts`

**Step 1 — `.env`** (never commit this file):
```
BASE_URL=https://api.codeandtest.com/api/v1
```

> ⚠️ Use `api.codeandtest.com` — NOT `codeandtest.com` (that's the Vercel frontend, returns 405)

**Step 2 — `src/config.ts`**:
```ts
const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  throw new Error('Missing env var: BASE_URL — copy .env.example to .env');
}

export const config = { BASE_URL } as const;
```

<!-- note: STOP. Everyone creates both. The guard in config.ts gives a clear error immediately if .env is missing — not a silent undefined buried in a test. -->

---

## ✅ Check Your Work

Run this in the terminal:

```bash
npm test tests/lecture-01/lecture.test.ts
```

**Expected output:**
```
✓ tests/lecture-01/lecture.test.ts (6)
  ✓ Style 1: async/await > returns 400
  ✓ Style 1: async/await > body has message field
  ✓ Style 1: async/await > status field is "error"
  ✓ Style 2: .then() > returns 400
  ...

Tests  6 passed (6)
```

> **Stuck?** Check: `.env` exists, `BASE_URL` uses `api.` prefix

<!-- note: STOP. Everyone runs this. Don't move on until most of the room is green. Common issue: wrong URL (codeandtest.com vs api.codeandtest.com). -->

---

## Concept — `validateStatus: () => true`

By default Axios **throws** on any 4xx/5xx:

```ts
// ❌ WITHOUT — test crashes, expect() never runs:
const res = await axios.post(url, badData);
// AxiosError: Request failed with status code 400

// ✅ WITH — you get the response, assertion runs:
const res = await axios.post(url, badData, {
  validateStatus: () => true,
});
expect(res.status).toBe(400); // runs correctly
```

> Every Axios call in this course uses `validateStatus: () => true`

<!-- note: This is the #1 setup mistake. Drill it. The "wrong" version gives a confusing stack trace instead of a clear assertion failure. -->

---

## Concept — async/await vs .then()

```ts
// Style 1 — async/await (preferred, reads top-to-bottom)
it('returns 400', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  expect(res.status).toBe(400);
});

// Style 2 — .then() — MUST return the promise
it('returns 400', () => {
  return axios.post(url, data, { validateStatus: () => true })
    .then(res => expect(res.status).toBe(400));
});
```

> ⚠️ Forget `return` in `.then()` — test silently passes with **zero assertions**

<!-- note: Both styles appear in the course. The missing return is the classic silent false-positive. Show what happens: no assertion = instant "pass". -->

---

## Concept — Axios vs Supertest

| | Axios | Supertest |
|-|-------|-----------|
| Response body | `res.data` | `res.body` |
| Works against | any URL | local app only |
| JSON parsing | automatic | automatic |

> Coming from Supertest? Muscle memory will make you type `res.body`. It's `res.data`.

<!-- note: Students coming from Supertest or Cypress always reach for res.body. Call this out explicitly. -->

---

## Rate Limiting on `/signin`

- nginx limits `/signin` to **5 requests per minute**
- After 5 calls → server returns **429**, not 400

```ts
// ❌ Breaks after 5 runs in a minute:
expect(res.status).toBe(400);

// ✅ Accepts 400 OR 429:
expectRejected(res.status);
```

> Always use `expectRejected()` for negative signin tests

<!-- note: Students hit this in homework almost immediately. They run the test 6 times fast and suddenly it's failing. The helper handles both cases. -->

---

## 3 Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Missing `validateStatus` | Test crashes with `AxiosError` | Add `{ validateStatus: () => true }` |
| `res.body` instead of `res.data` | `undefined` | Use `res.data` |
| Wrong `BASE_URL` domain | `405 Method Not Allowed` | Use `api.codeandtest.com` |

> If tests return 405 — check your `.env`. You're hitting the Vercel frontend.

<!-- note: These three mistakes account for 90% of setup failures in the first lecture. Walk through each one. -->

---

## Homework — 7 TODOs

Open `tests/lecture-01/homework/starter.test.ts`

| TODO | What to practice |
|------|-----------------|
| 1 | `toContain` on `content-type` header |
| 2 | `toMatchObject` with `expect.any()` |
| 3 | `.not.toHaveProperty()` — negative assertion |
| 4 | Boundary value + `expectRejected` |
| 5 *(bonus)* | `.then()` style — don't forget `return` |
| 6 | `toMatch(/regex/)` |
| 7 | `toBeTypeOf('number')` + `toBeTruthy` |

```bash
npm test tests/lecture-01/homework/starter.test.ts
```

**Goal: 7 tests passing.** Stuck? Open `solution.test.ts`.

---

## What's Next — Lecture 02

- Test the **success path** of signin
- Capture the **session cookie** from the response
- Use it to make **authenticated requests**

```bash
git checkout -b lecture-02-signin
```

> Same endpoint — completely different assertions

<!-- note: Lecture 02 is shorter — no setup overhead. The cookie capture pattern is the core skill for everything that follows. -->
