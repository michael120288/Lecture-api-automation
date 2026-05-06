# 📊 Lecture 01 — Slide Content for PowerPoint
# Setup & Your First API Test

> **How to use this file:**
> Each `---` block = one slide. Copy the title and bullets into PowerPoint.
> Speaker notes are marked with `🎤 Note:`.

---

## SLIDE 01 — Title Slide

**Title:** Lecture 01 — Setup & Your First API Test
**Subtitle:** API Automation with Vitest + Axios + TypeScript

**Visual:** Dark background, course logo top-right
**Bottom strip:** ⏱ 75–90 min · codeandtest.com

🎤 Note: Welcome slide. Ask: who has written an automated test before? Bridge from there. Longest lecture — one-time setup. All others are 60–75 min.

---

## SLIDE 02 — Agenda

**Title:** 📋 What We'll Cover Today

| # | Topic | ⏱ Time |
|---|-------|--------|
| 1 | Why API testing + our tools | 10 min |
| 2 | ▶ Project setup | 20 min |
| 3 | Key concepts | 15 min |
| 4 | ▶ Write & run your first test | 15 min |
| 5 | Rate limiting + common mistakes | 10 min |
| 6 | Homework walkthrough | 5 min |

**Bottom callout (highlighted box):**
> 🎯 By the end — **6 tests passing** against the real production API

🎤 Note: Walk through the agenda. Two hands-on blocks — students type during those. They need Node 18+ and a codeandtest.com account (username starts with `vitest`).

---

## SLIDE 03 — Why API Testing?

**Title:** 🤔 Why Automate API Tests?

**Left column — The Problem:**
- 100 endpoints = hours of manual Postman clicking
- Manual checks after every code change = not realistic
- Easy to miss edge cases by hand

**Right column — The Solution:**
- Automated tests run in seconds
- Catch regressions after every commit
- Test both valid AND invalid input consistently

**Bottom callout:**
> ✅ Positive test — correct input → success response
> ❌ Negative test — bad input → correct error response

🎤 Note: Ask who has clicked through Postman manually for an hour. That pain is why we're here. Both test types are required — a server that accepts everything is broken.

---

## SLIDE 04 — The Testing Pyramid

**Title:** 📐 Where API Tests Fit

**Visual: Pyramid diagram (three layers)**

```
        [ E2E Tests ]          ← few, slow, fragile
   [ API Tests ← we are here ] ← many, fast, realistic
  [      Unit Tests           ] ← most, fastest, isolated
```

**Key point (highlighted):**
> API tests hit a real server over real HTTP — no mocks, no browser

**Bullets:**
- More reliable than E2E (no browser flakiness)
- More realistic than unit tests (real HTTP responses)
- Ideal for testing a REST API you don't own the source of

🎤 Note: We sit in the sweet spot. Students sometimes ask "why not just unit test?" — because unit tests mock everything. We want real server responses.

---

## SLIDE 05 — Our Tech Stack

**Title:** 🛠️ Tools We Use & Why

| Tool | Role | Why Not the Alternative |
|------|------|------------------------|
| **Vitest** | Test runner | Zero-config TypeScript, 2–5× faster than Jest |
| **Axios** | HTTP client | Works against any URL — not just localhost |
| **TypeScript** | Language | Catches type errors before tests run |
| **Faker.js** | Test data | Unique username every run — no database clashes |
| **Postman** | Manual exploration | Try the endpoint first before automating |

**Bottom callout:**
> 💡 Supertest requires the Express `app` object — Axios works against production or localhost with the same code

🎤 Note: The Axios vs Supertest distinction is important. Students coming from Supertest expect to pass the app object. Axios just needs a URL.

---

## SLIDE 06 — ▶ DO THIS: Steps 1–3 (Setup)

**Title:** ▶ Project Setup — Steps 1–3

**Action banner (green background):** 🖥️ Open your terminal — follow along

**🍎 macOS & 🪟 Windows (same commands):**

```bash
mkdir chatty-api-tests
cd chatty-api-tests
npm init -y
```

```bash
npm install axios dotenv
npm install --save-dev vitest typescript @types/node @faker-js/faker
```

**Why two install commands?**

| Package | Where | Reason |
|---------|-------|--------|
| axios, dotenv | `dependencies` | Needed at runtime |
| vitest, typescript, faker | `devDependencies` | Dev only — not deployed |

🎤 Note: STOP. Everyone types. Walk the room. Two commands are intentional — makes the deps/devDeps distinction visible and teachable.

---

## SLIDE 07 — ▶ DO THIS: package.json Scripts

**Title:** ▶ Add Scripts to `package.json`

**Action banner (green background):** 📝 Open `package.json` — replace the `"scripts"` section

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

| Script | When to Use |
|--------|-------------|
| `npm test` | Run once — use in CI |
| `npm run test:watch` | Watch mode while coding |
| `npm run test:ui` | Visual browser UI |
| `npm run test:coverage` | Coverage report |

🎤 Note: STOP. Everyone adds scripts. `npm test` will be the most-typed command in this entire course.

---

## SLIDE 08 — ▶ DO THIS: tsconfig.json

**Title:** ▶ Create `tsconfig.json`

**Action banner (green background):** 📝 Create this file in your project root

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

**Key option (highlighted box):**
> `"types": ["vitest/globals"]` — gives your IDE autocomplete for `describe`, `it`, `expect`
> Without it: red squiggles. With it: full autocomplete. Tests run either way.

🎤 Note: STOP. Everyone creates this. The vitest/globals line is purely for IDE support — it doesn't affect test execution.

---

## SLIDE 09 — ▶ DO THIS: vitest.config.ts

**Title:** ▶ Create `vitest.config.ts`

**Action banner (green background):** 📝 Create this file in your project root

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

**Key setting (highlighted):**
> `fileParallelism: false` — runs one test file at a time. Without this, 20+ auth requests fire simultaneously and hit nginx rate limiting.

🎤 Note: STOP. Everyone creates this. Two-part dotenv pattern: `dotenvConfig()` loads .env into the main process. `env:{}` forwards to worker threads. Both required — workers don't inherit process.env.

---

## SLIDE 10 — ▶ DO THIS: .env + config.ts

**Title:** ▶ Create `.env` and `src/config.ts`

**Left panel — .env:**

```
BASE_URL=https://api.codeandtest.com/api/v1
```

> ⚠️ Use `api.codeandtest.com`
> NOT `codeandtest.com` — that's the Vercel frontend (returns 405)

> 🔒 Never commit `.env` — it's in `.gitignore`

**Right panel — src/config.ts:**

```ts
const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  throw new Error(
    'Missing env var: BASE_URL — copy .env.example to .env'
  );
}

export const config = { BASE_URL } as const;
```

> The guard throws immediately with a clear message if `.env` is missing

🎤 Note: STOP. Everyone creates both. The `api.` prefix is the #1 setup mistake — students hit the Vercel frontend and get 405. Call it out now.

---

## SLIDE 11 — ✅ Check Your Work

**Title:** ✅ Check Your Work — Run the Test

**Action banner (blue background):** 🖥️ Run this in your terminal

```bash
npm test tests/lecture-01/lecture.test.ts
```

**Expected output:**
```
✓ tests/lecture-01/lecture.test.ts (6)
  ✓ Style 1: async/await > POST /signin returns 400
  ✓ Style 1: async/await > body has message field
  ✓ Style 1: async/await > status field is "error"
  ✓ Style 2: .then() > POST /signin returns 400
  ✓ Style 2: .then() > body has message field
  ✓ Style 2: .then() > status field is "error"

Tests  6 passed (6)
```

**Troubleshooting (highlighted box):**
> ❌ 405 error → wrong BASE_URL domain — add `api.` prefix
> ❌ `Missing env var` → `.env` file missing or empty

🎤 Note: STOP. Don't move on until most of the room is green. This is the first real checkpoint of the course.

---

## SLIDE 12 — Concept: validateStatus

**Title:** 💡 The Most Important Axios Option

**Left panel — WITHOUT (red background strip):**
```ts
// ❌ Axios THROWS on 4xx/5xx
const res = await axios.post(url, badData);
// AxiosError: Request failed with status 400
// expect() NEVER runs
```

**Right panel — WITH (green background strip):**
```ts
// ✅ You get the response — always
const res = await axios.post(url, badData, {
  validateStatus: () => true,
});
expect(res.status).toBe(400); // runs correctly
```

**Bottom callout (highlighted):**
> Every single Axios call in this course uses `validateStatus: () => true`

🎤 Note: Drill this. The wrong version gives a confusing stack trace. The right version gives a clear failing assertion. This is the #1 conceptual mistake.

---

## SLIDE 13 — Concept: async/await vs .then()

**Title:** 💡 Two Ways to Write the Same Test

```ts
// Style 1 — async/await (recommended)
it('returns 400', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  expect(res.status).toBe(400);
});
```

```ts
// Style 2 — .then() — MUST return the promise
it('returns 400', () => {
  return axios.post(url, data, { validateStatus: () => true })
    .then(res => expect(res.status).toBe(400));
});
```

**Warning (red highlight):**
> ⚠️ Forget `return` in `.then()` → test silently passes with **zero assertions running**
> This is a false positive — the most dangerous kind of test failure

🎤 Note: Both styles appear throughout the course. The missing `return` is the classic silent false-positive trap. Show what happens live if you have time.

---

## SLIDE 14 — Concept: Axios vs Supertest

**Title:** 💡 Axios vs Supertest — Key Differences

| | Axios | Supertest |
|-|-------|-----------|
| Response body | `res.data` | `res.body` |
| Works against | Any URL | Local app only |
| Requires | Just a URL | The Express `app` object |
| JSON parsing | Automatic | Automatic |

**Warning (highlighted box):**
> 🚨 Coming from Supertest? Your fingers will type `res.body`. It's `res.data` in Axios.

**Platform note:**
> 🍎 macOS / 🪟 Windows — Axios works identically on both

🎤 Note: Students coming from Supertest make this mistake constantly. Call it out explicitly and early.

---

## SLIDE 15 — Rate Limiting

**Title:** ⚡ Rate Limiting on `/signin`

**How it works:**
- nginx limits `/signin` to **5 requests per minute**
- After 5 calls → server returns `429`, not `400`

**The fix:**
```ts
// ❌ Breaks after 5 runs in a minute:
expect(res.status).toBe(400);

// ✅ Accepts 400 OR 429:
expectRejected(res.status);
```

**Two patterns (table):**

| Use case | Pattern |
|----------|---------|
| Testing error path (wrong password) | `expectRejected(res.status)` |
| Happy path signin (correct credentials) | Add `x-test-secret` header |

🎤 Note: Students hit this in homework almost immediately. The helper handles both cases. The bypass header is only for beforeAll signins where you're not testing rate limiting.

---

## SLIDE 16 — 3 Common Mistakes

**Title:** 🚨 3 Most Common Mistakes

| # | Mistake | Symptom | Fix |
|---|---------|---------|-----|
| 1 | Missing `validateStatus` | `AxiosError` crash | Add `{ validateStatus: () => true }` |
| 2 | `res.body` instead of `res.data` | `undefined` | Use `res.data` |
| 3 | Wrong `BASE_URL` domain | `405 Method Not Allowed` | Use `api.codeandtest.com` |

**Callout box:**
> 🌐 `codeandtest.com` → Vercel frontend (HTML, returns 405 for POST)
> 🌐 `api.codeandtest.com` → the real API ← always use this

**🍎 macOS / 🪟 Windows:** Same mistakes, same fixes on both platforms

🎤 Note: These three account for 90% of first-lecture failures. Worth 5 minutes of class time to prevent 30 minutes of debugging.

---

## SLIDE 17 — Homework

**Title:** 📝 Homework — 7 TODOs

**Action:** Open `tests/lecture-01/homework/starter.test.ts`

| TODO | What to Practice |
|------|-----------------|
| 1 | `toContain` on `content-type` header |
| 2 | `toMatchObject` with `expect.any()` |
| 3 | `.not.toHaveProperty()` — negative assertion |
| 4 | Boundary value + `expectRejected` |
| 5 *(bonus)* | `.then()` style — don't forget `return` |
| 6 | `toMatch(/regex/)` |
| 7 | `toBeTypeOf('number')` + `toBeTruthy` |

**Run it:**
```bash
npm test tests/lecture-01/homework/starter.test.ts
```

**Goal: 7 tests passing.** Stuck? Open `homework/solution.test.ts`

🎤 Note: Encourage students to attempt all 7 before looking at the solution. The solution file has explanation comments — not just code.

---

## SLIDE 18 — What's Next

**Title:** ⏭️ Next Up — Lecture 02: Signin

**What we'll add:**
- Test the **success path** of `/signin`
- Capture the **session cookie** from the response headers
- Use the cookie to make **authenticated requests**

**Before next lecture:**
```bash
git add .
git commit -m "lecture-01: project setup and first test"
git checkout -b lecture-02-signin
```

**🍎 macOS / 🪟 Windows:** Git commands are identical on both platforms

> Same `/signin` endpoint — completely different assertions

🎤 Note: Lecture 02 is shorter — no setup overhead. The cookie capture pattern is the core skill for everything that follows in the course.

---

## ✅ Slide Summary (for your reference)

| Slide | Type | Purpose |
|-------|------|---------|
| 01 | Title | Welcome + time estimate |
| 02 | Agenda | Set expectations |
| 03 | Theory | Why API testing |
| 04 | Theory | Testing pyramid |
| 05 | Theory | Tech stack |
| 06 | **▶ DO THIS** | npm init + install |
| 07 | **▶ DO THIS** | package.json scripts |
| 08 | **▶ DO THIS** | tsconfig.json |
| 09 | **▶ DO THIS** | vitest.config.ts |
| 10 | **▶ DO THIS** | .env + config.ts |
| 11 | **✅ CHECK** | Run the tests |
| 12 | Concept | validateStatus |
| 13 | Concept | async/await vs .then() |
| 14 | Concept | Axios vs Supertest |
| 15 | Concept | Rate limiting |
| 16 | Mistakes | Top 3 common errors |
| 17 | Homework | 7 TODOs |
| 18 | Next up | Lecture 02 preview |
