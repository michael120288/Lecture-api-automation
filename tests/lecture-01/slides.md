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

## Lecture 01 — Setup & Your First API Test

**API Automation with Vitest + Axios + TypeScript**

<!-- note: Welcome slide. Set the tone: this is a practical course. Every lecture ends with 7 passing tests. -->

---

## Why API Testing?

- Faster than manual Postman clicking
- Runs after every code change
- Catches regressions automatically

> 100 endpoints = hours of clicking. Automation = seconds.

<!-- note: Explain the difference between positive tests (correct input → success) and negative tests (bad input → rejection). Both are required. -->

---

## The Testing Pyramid

| Layer | Count | Speed | Stability |
|-------|-------|-------|-----------|
| E2E Tests | few | slow | fragile |
| **API Tests ← we are here** | **many** | **fast** | **realistic** |
| Unit Tests | most | fastest | isolated |

<!-- note: API tests sit in the sweet spot — they test real HTTP round-trips without the fragility of a browser. Emphasise that this course is the "API" layer. -->

---

## Our Tech Stack

| Tool | Why |
|------|-----|
| **Vitest** | Zero-config TypeScript |
| **Axios** | Works against any URL |
| **TypeScript** | Catches errors before runtime |
| **Faker.js** | Unique data every run |

<!-- note: Supertest only works when you hold the Express app instance. Axios works against localhost or production — same code. -->

---

## Project Structure

```
src/config.ts       # BASE_URL guard
src/test-utils.ts   # expectRejected / expectSuccess
vitest.config.ts    # globals, timeout
.env                # secrets — never commit
```

<!-- note: Walk through each file briefly. The config.ts has a fail-fast guard: if BASE_URL is missing, the entire test run aborts immediately with a clear error rather than silent failures. -->

---

## Project Setup — Steps 1–3

```bash
mkdir chatty-api-tests
cd chatty-api-tests
npm init -y
npm install axios dotenv
npm install --save-dev vitest typescript @types/node @faker-js/faker
```

> `dependencies`: axios, dotenv — needed at runtime
> `devDependencies`: vitest, typescript, @types/node, @faker-js/faker — dev only

<!-- note: Two separate install commands are intentional — runtime vs dev dependencies. Walk students through the distinction. -->

---

## Project Setup — `tsconfig.json` (Step 6)

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

> `"types": ["vitest/globals"]` — gives IDE autocomplete for `describe`, `it`, `expect`

<!-- note: Without vitest/globals the IDE shows "Cannot find name 'describe'". The tests still run — this is purely for type checking. -->

---

## Project Setup — `vitest.config.ts` (Step 7)

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
      BASE_URL: process.env.BASE_URL ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
    },
  },
});
```

> `fileParallelism: false` — prevents 20+ concurrent auth requests hitting the rate limiter

<!-- note: dotenvConfig loads .env into the main process. env:{} forwards vars to worker threads. Both are required — workers do NOT inherit process.env automatically. -->

---

## Project Setup — `.env` and `src/config.ts` (Steps 8–9)

**.env**
```
BASE_URL=https://api.codeandtest.com/api/v1
```

> Never commit `.env`. Use `cp .env.example .env`.
> The API is at `api.codeandtest.com` — NOT `codeandtest.com` (that's the Vercel frontend).

**src/config.ts**
```ts
const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  throw new Error('Missing env var: BASE_URL — copy .env.example to .env');
}

export const config = { BASE_URL } as const;
```

> `as const` makes `BASE_URL` readonly. The guard throws immediately if `.env` is missing.

<!-- note: Single source of truth. If the guard fires you get a clear error — not a silent undefined buried in a test. -->

---

## The Most Important Option

```ts
// Without — test CRASHES on 400:
const res = await axios.post(url, badData);

// With — you get the response always:
const res = await axios.post(url, badData, {
  validateStatus: () => true,
});
expect(res.status).toBe(400); // now this runs
```

> Every single Axios call in this course uses `validateStatus: () => true`.

<!-- note: By default Axios throws on any 4xx/5xx. That means expect() never runs and your test crashes with an unhandled rejection instead of a proper assertion failure. This one option fixes that. Drill this home — it's the #1 setup mistake. -->

---

## Without vs With — Side by Side

```ts
// WRONG — crashes, no assertion:
await axios.post(url, {});
// Error: Request failed with status code 400

// RIGHT — assertion runs:
const res = await axios.post(url, {}, {
  validateStatus: () => true,
});
expect(res.status).toBe(400); // passes cleanly
```

<!-- note: Show both side by side so students viscerally feel the difference. The "wrong" version gives a confusing stack trace. The "right" version gives a clear failing assertion. -->

---

## async/await vs .then()

```ts
// Style 1 — async/await (preferred)
it('returns 400', async () => {
  const res = await axios.post(url, data, opts);
  expect(res.status).toBe(400);
});

// Style 2 — .then() — MUST return
it('returns 400', () => {
  return axios.post(url, data, opts)
    .then(res => expect(res.status).toBe(400));
});
```

> Forget `return` in `.then()` — test silently passes with zero assertions.

<!-- note: Both styles appear in the course. The async/await style is cleaner. The .then() style is shown because students will encounter it in real codebases. The missing return is the classic silent false-positive trap. -->

---

## Axios vs Supertest — Key Differences

| | Axios | Supertest |
|-|-------|-----------|
| Response body | `res.data` | `res.body` |
| JSON parsing | automatic | automatic |
| Works against | any URL | local app only |

<!-- note: Students coming from Supertest always reach for res.body. Drill res.data into their fingers. -->

---

## Rate Limiting on `/signin`

- `/signin` is rate-limited to **5 req/min**
- After 5 calls → nginx returns **429**, not 400

```ts
// Breaks after 5 runs in a minute:
expect(res.status).toBe(400);   // ❌ fails as 429

// Always passes — accepts either:
expectRejected(res.status);     // ✅ 400 OR 429
```

<!-- note: Students hit this in homework almost immediately. expectRejected is the right pattern for testing the ERROR path — you're testing real user behavior where no bypass header should be sent. -->

---

## Bypassing the Rate Limit (happy path)

- Add `x-test-secret` header → nginx skips the limit
- Only works for `vitest` usernames
- Use for **happy path** signin (correct credentials)

```ts
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

await axios.post('/signin', credentials, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
});
```

> Use `expectRejected` for error tests · Use the header for signin setup

<!-- note: The bypass is for beforeAll signins — where you're not testing rate limiting, you just need a valid session. For the actual error-path tests (wrong password), don't use the header — you want real user behavior. -->

---

## 3 Common Mistakes

- Missing `validateStatus: () => true` — test crashes
- Using `res.body` instead of `res.data`
- `BASE_URL` pointed at Vercel frontend

> `codeandtest.com` returns `405` for POST. Always use `api.codeandtest.com`.

<!-- note: The Vercel URL is a trap — it's the frontend, it serves HTML. The API lives at api.codeandtest.com. Students discover this the hard way. -->

---

## Homework — 7 TODOs

Open `tests/lecture-01/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | `toContain` on `content-type` header |
| 2 | `toMatchObject` with `expect.any()` |
| 3 | `.not.toHaveProperty()` negative assertion |
| 4 | Boundary value + `expectRejected` |
| 5 (bonus) | `.then()` style with `return` |
| 6 | `toMatch(/regex/)` |
| 7 | `toBeTypeOf('number')` + `toBeTruthy` |

**Goal: 7 tests passing**
