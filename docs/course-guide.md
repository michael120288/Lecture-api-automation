# Chatty API Automation — Complete Course Guide

> This file is auto-generated from all lecture READMEs.
> For individual lecture files see `tests/lecture-XX/README.md`.


---

# Lecture 01 — Setup & Your First API Test

> ⏱ **Estimated time: 75–90 min**
> This is the longest lecture — it covers the one-time project setup in addition to writing tests.
> Subsequent lectures only cover new concepts and take 60–75 min.

> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students who already read the theory):
> ```bash
> npm test tests/lecture-01/lecture.test.ts
> npm test tests/lecture-01/homework/starter.test.ts
> ```

---

## What You Will Learn

- What API automation testing is and why we do it
- The tools we use and why we chose them — Vitest, Axios, TypeScript, Faker.js
- How to set up the project from scratch — `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env`
- How to read an endpoint's Joi schema and derive boundary values from it
- Why JavaScript is asynchronous — callbacks → Promises → async/await
- The difference between `async/await` and `.then()` — and when to use each
- TypeScript syntax in test files — `: type`, `!`, `type` imports, `as const`
- 8 types of assertions — basic, exact values, shape (`toMatchObject`), negative (`.not.`), boundary values, headers, response time, one request many checks
- Advanced assertion variants — `toMatch(/regex/)`, `toBeTypeOf`, `toBeTruthy`/`toBeFalsy` as alternatives to `typeof` and strict equality
- How rate limiting works on production endpoints — `expectRejected([400, 429])`
- Shared test utilities — `expectRejected` and `expectSuccess` from `src/test-utils.ts`
- How to run requests manually in Postman — collection, environment, Tests tab, Collection Runner
- How to read a test failure output — file, line number, expected vs received

> **Reference Topics**
> - New to async/await? → [`docs/topics/async-await.md`](../../docs/topics/async-await.md)
> - New to Vitest? → [`docs/topics/vitest.md`](../../docs/topics/vitest.md)
> - New to Axios? → [`docs/topics/axios.md`](../../docs/topics/axios.md)
> - HTTP status codes reference → [`docs/topics/http-status-codes.md`](../../docs/topics/http-status-codes.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Theory — What Is API Testing? |
| 2 | Our Tech Stack |
| 3 | Project Setup (10 steps) |
| 4 | HTTP Anatomy — Quick Reference |
| 5 | Endpoint Schema & Validation Rules |
| 6 | Why Is JavaScript Asynchronous? |
| 7 | Two Ways to Write the Same Test |
| 8 | `validateStatus: () => true` |
| 9 | `response.data` — Not `response.body` |
| 10 | TypeScript in Tests |
| 11 | Hooks — `beforeAll`, `afterAll` |
| 12 | Postman — Manual Testing First |
| 13 | Understanding the Test File |
| 14 | Running the Tests |
| 15 | Git Setup |

---

## 1. Theory — What Is API Testing?

An API (Application Programming Interface) is a set of endpoints a server exposes so
clients can communicate with it over HTTP.

**API testing** means sending real HTTP requests to those endpoints and asserting that:
- The status code is correct (`200`, `201`, `400`, `401` etc.)
- The response body contains the expected fields and values
- The server behaves correctly for both valid AND invalid input

**Positive testing** — test that the happy path works.
Send correct input → expect success response (`200` / `201`).

**Negative testing** — test that the server rejects bad input correctly.
Send wrong credentials, missing fields, invalid data → expect error response (`400` / `401`).

Both types are essential. A server that accepts everything is broken. A server that
rejects everything is also broken.

**Why automate it?**
Manual Postman clicking does not scale. With 100 endpoints you would spend hours
repeating the same checks after every code change. Automated tests run all 100 in
seconds and tell you exactly which one failed.

---

## 2. Our Tech Stack

| Tool | Role | Why this, not the alternative |
|------|------|-------------------------------|
| **Vitest** | Test runner | Zero-config TypeScript. Same `describe/it/expect` API as Jest. 2–5× faster cold start. No `ts-jest` transformer needed. |
| **Axios** | HTTP client | Works with any URL — local or production. Supertest requires the Express `app` instance, so it only works locally. |
| **TypeScript** | Language | Catches type errors before tests run. Better IDE autocomplete. |
| **Faker.js** | Test data | Generates realistic random data on every run so tests never clash in the database. |
| **Postman** | Manual exploration | Try the endpoint by hand first — understand the real response before writing automation. |

---

## 3. Project Setup

### Step 1 — Create the project folder

```bash
mkdir chatty-api-tests
cd chatty-api-tests
```

### Step 2 — Initialise npm

```bash
npm init -y
```

This creates `package.json`. The `-y` flag accepts all defaults so you are not
prompted for each field. You can edit `package.json` manually afterwards.

### Step 3 — Install dependencies

```bash
npm install axios dotenv
npm install --save-dev vitest typescript @types/node @faker-js/faker
```

**`dependencies` vs `devDependencies` — why two commands?**

`npm install <pkg>` → adds to `dependencies` — packages needed at **runtime**
(when the code actually runs in production or in tests against a live server).

`npm install --save-dev <pkg>` → adds to `devDependencies` — packages only needed
during **development** (compiling, running tests, generating data). They are not
installed when you deploy to a server with `NODE_ENV=production`.

| Package | Where | Why |
|---------|-------|-----|
| `axios` | `dependencies` | Makes HTTP requests — needed at runtime |
| `dotenv` | `dependencies` | Loads `.env` — needed at runtime |
| `vitest` | `devDependencies` | Test runner — only needed during development |
| `typescript` | `devDependencies` | Compiler — only needed during development |
| `@types/node` | `devDependencies` | TypeScript types for Node.js built-ins |
| `@faker-js/faker` | `devDependencies` | Test data generation — only in tests |

### Step 4 — Add scripts to `package.json`

Open `package.json` and update the `"scripts"` section:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

What each script does:

| Script | Command | When to use |
|--------|---------|-------------|
| `npm test` | `vitest run` | Run all tests once and exit. Use in CI/CD. |
| `npm run test:watch` | `vitest` | Watch mode — re-runs on file save. Use during development. |
| `npm run test:ui` | `vitest --ui` | Opens a browser UI with visual test results. |
| `npm run test:coverage` | `vitest run --coverage` | Runs tests and generates a coverage report. |

You can pass a file path to any script:
```bash
npm test tests/lecture-01/lecture.test.ts
```

### Step 5 — Create `.gitignore`

```bash
touch .gitignore
```

Add these lines:

```
# Dependencies
node_modules/

# Build output
dist/

# Environment variables — NEVER commit these
.env
.env.*
!.env.example

# Test reports
test-results/
coverage/
html/
```

**Why is `.env` excluded but `.env.example` is not?**

`.env` contains real secrets (API URLs, passwords, tokens). If committed, anyone
with access to the repo can read them.

`.env.example` is a template with placeholder values — safe to commit so other
developers know which variables are needed.

### Step 6 — Create `tsconfig.json`

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

**Every option explained:**

| Option | Why |
|--------|-----|
| `"target": "ES2022"` | Compiles to modern JavaScript. `async/await` works natively — no extra transformation needed. |
| `"module": "ESNext"` | Uses ES module syntax (`import/export`). Required for Vitest. |
| `"moduleResolution": "bundler"` | Tells TypeScript how to resolve imports. The `"bundler"` setting matches how Vite/Vitest resolves modules internally. |
| `"strict": true` | Enables all strict type checks. More errors upfront, fewer bugs at runtime. |
| `"esModuleInterop": true` | Allows `import axios from 'axios'` instead of the longer `import * as axios from 'axios'`. |
| `"skipLibCheck": true` | Skips type-checking inside `node_modules`. Faster builds, avoids third-party type errors we can't fix. |
| `"types": ["vitest/globals"]` | When `globals: true` is set in `vitest.config.ts`, Vitest injects `describe`, `it`, `expect` etc. into every test file at runtime. But TypeScript's compiler runs before Vitest — it does not know these globals exist. Without this line the IDE shows `Cannot find name 'describe'`. Adding `"vitest/globals"` loads Vitest's type declarations so the compiler is aware of them. The tests still run fine without it — this is purely for TypeScript type checking and IDE support. |

### Step 7 — Create `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env into process.env in the MAIN process
// This must happen before defineConfig() reads process.env below
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

**`resolve(__dirname, '.env')` — why not just `'.env'`?**

`__dirname` is a Node.js built-in that holds the **absolute path of the current file**.
`resolve(__dirname, '.env')` builds the absolute path to `.env` relative to `vitest.config.ts`.

Without this, Node.js resolves `.env` relative to wherever you ran `npm test` from —
which might not be the project root. Using `__dirname` guarantees it always finds the
right file regardless of where you run the command from.

**Why `dotenvConfig()` AND `env: {...}` — two things for the same purpose?**

Vitest runs each test file in a separate **worker thread**. Worker threads are isolated
processes — they do NOT automatically inherit `process.env` from the main process.

`dotenvConfig()` at the top of the config file loads `.env` into the **main process**.
This is necessary so that the `env: { BASE_URL: process.env.BASE_URL }` line can READ
the value and then explicitly forward it to worker threads.

Without `dotenvConfig()`, `process.env.BASE_URL` would be `undefined` when `env` is built.
Without `env: {...}`, the workers would start with an empty environment.
Both are required.

**`??` — the nullish coalescing operator**

`process.env.BASE_URL ?? ''` means:
- If `process.env.BASE_URL` is `null` or `undefined` → use `''` (empty string) as fallback
- Otherwise → use the actual value

This is different from `||` which also falls back for falsy values like `0` or `false`.
`??` only falls back for `null` and `undefined`.

**Every option explained:**

| Option | Value | Why |
|--------|-------|-----|
| `globals: true` | — | `describe`, `it`, `expect` available without importing. Cleaner test files. |
| `testTimeout: 15000` | 15 s | HTTP requests to a remote server can be slow. Default 5 s is too short. |
| `reporters: ['verbose']` | — | Shows every individual test name in the terminal, not just a summary. |
| `fileParallelism: false` | — | Runs one test file at a time. Without this, all lectures would fire 20+ auth requests simultaneously and hit the nginx rate limiter (5 req/min on auth endpoints). |
| `env: {...}` | — | Explicitly forwards env vars to worker threads. Workers do NOT inherit `process.env` automatically. |

### Step 8 — Create `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
BASE_URL=https://api.codeandtest.com/api/v1
```

> **Important — two domains:**
> `codeandtest.com` is the React frontend hosted on Vercel. POST requests there return 405.
> The real API is at `api.codeandtest.com`. Always use that as BASE_URL.

> **Never commit `.env` to git.** It is in `.gitignore` for this reason.

### Step 9 — Create `src/config.ts`

```ts
const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  throw new Error('Missing env var: BASE_URL — copy .env.example to .env');
}

export const config = { BASE_URL } as const;
```

**`as const` — what does it mean?**

`as const` is a TypeScript assertion that tells the compiler to treat the object as
deeply immutable (a "const assertion"). Without it, TypeScript infers the type of
`BASE_URL` as `string` (mutable). With `as const`, it infers the exact literal type
`readonly string` — the value cannot be accidentally reassigned anywhere in your code.

**Why a `config.ts` file instead of using `process.env.BASE_URL` directly in tests?**

Single source of truth. If the variable name changes, you update one file.
The error check at the top (`if (!BASE_URL) throw`) gives you a clear message
immediately when you forget to set up `.env` — instead of a confusing `undefined`
error buried inside a test.

### Step 10 — Understand `src/test-utils.ts`

The project includes a shared helper file at `src/test-utils.ts`.
You do not need to create it — it already exists. But you need to know what it does
because every test file in this course imports from it.

```ts
import { expectRejected } from '../../src/test-utils';
```

It exports two functions:

**`expectRejected(status)`**
Asserts that a status code is either `400` (validation/logic error) or `429` (rate limited).
Use this instead of `expect(status).toBe(400)` when testing against the production server,
because production auth endpoints are rate-limited to 5 requests/minute.
After a few test runs the server returns 429 instead of 400 — `expectRejected` handles both.

```ts
expectRejected(response.status);  // passes for 400 OR 429
```

**`expectSuccess(status)`**
Asserts that a status code is either `200` (OK) or `201` (Created).
Use this for positive tests where the exact success code is not critical.

```ts
expectSuccess(response.status);   // passes for 200 OR 201
```

**Why not just write `expect([400, 429]).toContain(status)` directly?**
You could — but `expectRejected(status)` is shorter, self-documenting,
and defined once in one file. If the rate limit ever changes, you update one function.
This is the same reason we have `config.ts` — single source of truth.

---

## 4. HTTP Anatomy — Quick Reference

```
Request:
  POST https://api.codeandtest.com/api/v1/signin
  Headers:  Content-Type: application/json
            Cookie: session=eyJ...
  Body:     { "username": "alice", "password": "Secret@123" }

Response:
  Status:   200 OK
  Headers:  set-cookie: session=eyJ...
            content-type: application/json; charset=utf-8
  Body:     { "message": "User login successfully", "user": {...}, "token": "..." }
```

**Status codes you will see in this course:**

| Code | Meaning | When Chatty returns it |
|------|---------|----------------------|
| `200` | OK | Successful GET or POST (signin, signout) |
| `201` | Created | New user or post was created |
| `400` | Bad Request | Validation failed or invalid credentials |
| `401` | Unauthorized | No session cookie or expired token |
| `403` | Forbidden | Logged in but not allowed (e.g. wrong secret) |
| `404` | Not Found | Resource doesn't exist |

---

## 5. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**Endpoint:** `POST /api/v1/signin`
**Schema file:** `chatty-backend/src/features/auth/schemas/signin.ts`

| Field | Type | Required | Constraints | Error message (400) |
|-------|------|----------|-------------|---------------------|
| `username` | string | ✅ | min 4 chars, max 32 chars | `'Invalid username'` |
| `password` | string | ✅ | min 8 chars, max 128 chars | `'Invalid password'` |

**What triggers a validation error (400 BEFORE hitting the database):**

| Scenario | Field absent entirely | Field present but empty |
|----------|----------------------|------------------------|
| `username` missing | `'"username" is required'` (Joi default) | `'Username is a required field'` (custom) |
| `password` missing | `'"password" is required'` (Joi default) | `'Password is a required field'` (custom) |

> Why two different messages for the same missing field?
> Joi uses different error keys:
> - Field absent (`undefined`) → `'any.required'` → no custom message → Joi default: `"field" is required`
> - Field present but empty string (`""`) → `'string.empty'` → custom message applies

**What triggers a business logic error (400 AFTER schema passes):**

| Scenario | Error message |
|----------|---------------|
| Username doesn't exist in DB | `'Invalid credentials'` |
| Password doesn't match | `'Invalid credentials'` |

> Both cases return the same message intentionally — prevents username enumeration attacks.

**Boundary values (used in section 6 of the test file):**

| Input | Expected status |
|-------|----------------|
| `username` = 3 chars (`"abc"`) | 400 — `'Invalid username'` |
| `username` = 33 chars | 400 — `'Invalid username'` |
| `password` = 7 chars | 400 — `'Invalid password'` |
| `password` = 129 chars | 400 — `'Invalid password'` |
| `username` absent | 400 — `'"username" is required'` |
| `password` absent | 400 — `'"password" is required'` |
| Both absent `{}` | 400 |

> **Important when testing against production:**
> The `/signin` endpoint is rate-limited to **5 requests per minute** (nginx) and
> **20 requests per 15 minutes** (Express). After running several tests quickly,
> the server returns `429 Too Many Requests` instead of `400`.
>
> This is why the boundary value tests in section 6 of `lecture.test.ts` use
> `expectRejected(status)` — it accepts both `400` and `429` as valid rejections.
> Run tests against localhost to always get clean `400` responses with no rate limiting.

---

## 6. Why Is JavaScript Asynchronous?


This is the most important concept to understand before writing your first test.

### The problem: JavaScript is single-threaded

JavaScript runs on one thread. It can only do one thing at a time. If you make an HTTP
request and wait for it the normal way (blocking), the entire program freezes until the
response comes back. In a browser this would lock up the UI. In Node.js this would block
everything else.

### The solution: the event loop

JavaScript solves this with an **event loop**. Instead of blocking, it says:
*"Start the request, then come back and keep running other code. When the response
arrives, I'll call the function you gave me."*

That "function you gave me" is a **callback**.

### The evolution: callbacks → promises → async/await

**Step 1 — Callbacks (old way)**

```ts
// "When the request finishes, call this function with the result"
someHttpRequest(url, function(error, response) {
  if (error) {
    console.error(error);
    return;
  }
  console.log(response.data);
  // Now imagine nesting MORE async calls inside here...
});
// This code runs IMMEDIATELY after starting the request, not after the response
```

Problem: nesting callbacks inside callbacks creates deeply indented, hard-to-read code
("callback hell"). Error handling is manual and easy to forget.

**Step 2 — Promises (better)**

A Promise is an object that represents a value that isn't ready yet.
It has two outcomes: **resolved** (success) or **rejected** (failure).
You chain `.then()` for success and `.catch()` for failure.

```ts
axios.post(url, data, { validateStatus: () => true })
  .then(response => {
    console.log(response.status); // runs when response arrives
    return response;              // can return a value to the next .then()
  })
  .catch(error => {
    console.error(error); // runs only if network completely fails
  });
```

**Step 3 — async/await (modern — what we use)**

`async/await` is syntactic sugar on top of Promises. It makes asynchronous code
look and read like synchronous code. Under the hood it is still a Promise.

```ts
async function test() {
  // await PAUSES execution here and waits for the Promise to resolve.
  // The function suspends itself — the Node.js thread is NOT blocked.
  // Other code can run while waiting. When the response arrives, execution resumes.
  const response = await axios.post(url, data, { validateStatus: () => true });

  // This line only runs AFTER the response has arrived
  console.log(response.status);
}
```

The `await` keyword can only be used inside a function marked `async`.
An `async` function always returns a Promise — even if you don't explicitly return one.

---

## 7. Two Ways to Write the Same Test

Vitest supports both styles. You will see both in this course.
The original Jest/Supertest course showed three styles (including `.end()/done()`).
We use two because `done()` was Supertest-specific — Axios does not have it.

### Style 1 — `async/await` (recommended)

```ts
it('POST /signin with wrong credentials returns 400', async () => {
  const response = await axios.post(url, wrongCredentials, {
    validateStatus: () => true,
  });

  expect(response.status).toBe(400);
});
```

**Why preferred:**
- Reads top to bottom like normal synchronous code
- Easy to add more `await` calls and assertions
- `try/catch` works naturally for unexpected errors
- Easier to debug because the stack trace is linear

### Style 2 — `.then()` (promise chain)

```ts
it('POST /signin with wrong credentials returns 400', () => {
  // No `async` keyword — the function itself is synchronous
  // The Promise handles the async part
  // MUST return the promise — without return, Vitest won't wait for .then()
  return axios.post(url, wrongCredentials, { validateStatus: () => true })
    .then(response => {
      expect(response.status).toBe(400);
    });
});
```

**Critical rules for `.then()` in Vitest:**

1. **Do NOT use `async`** on the test function — the function is synchronous, the Promise handles the async part
2. **MUST `return` the Promise** — if you forget `return`, Vitest marks the test as passed before `.then()` even runs. Your assertions never executed — a silent false positive.
3. Use `.catch()` for error handling if needed

**When you might prefer `.then()`:**
- Chaining multiple dependent requests (sign in, then create post, then delete)
- Reading existing code that already uses promise chains throughout

### Comparison

| | `async/await` | `.then()` |
|---|---|---|
| `async` keyword on function? | **Yes** | No |
| `return` required? | No | **Yes — easy to forget** |
| Reads like | Synchronous code | A chain of callbacks |
| Error handling | `try/catch` | `.catch()` |
| Best for | Most cases | Chained sequences |
| Under the hood | Promise | Promise |

Both produce identical test results. The choice is stylistic.

---

## 8. `validateStatus: () => true` — Why We Need It

By default, Axios **throws an error** for any response with status 4xx or 5xx.

```ts
// Without validateStatus:
const response = await axios.post(url, badData);
// Server returns 400 → Axios throws AxiosError
// The test CRASHES here — you never reach expect()
expect(response.status).toBe(400); // never runs
```

In tests we WANT to assert on error responses — that is the whole point of negative
testing. So we override the default behaviour:

```ts
const response = await axios.post(url, badData, {
  validateStatus: () => true,
});
// Now any status code is returned normally
expect(response.status).toBe(400); // runs correctly
```

`() => true` is an arrow function that always returns `true`.
Axios calls it with the status code and throws only if it returns `false`.
By always returning `true`, we say: "every status code is acceptable — give me the response."

---

## 9. `response.data` — Not `response.body`

If you have used Supertest before, you know `response.body`.
**Axios uses `response.data` instead.**

```ts
// Supertest:
expect(response.body.message).toBe('Invalid credentials');

// Axios:
expect(response.data.message).toBe('Invalid credentials');
```

Axios also parses JSON automatically. You do not need to call `.json()` or set
`Content-Type: application/json` manually on GET/POST requests — Axios handles it.

Full list of what `response` contains with Axios:

| Property | Type | What it is |
|----------|------|-----------|
| `response.status` | `number` | HTTP status code (`200`, `400`, etc.) |
| `response.data` | `any` | Parsed response body (JSON auto-parsed) |
| `response.headers` | `object` | Response headers |
| `response.config` | `object` | The config used for the request |

---

## 10. TypeScript in Tests — The Syntax You Will See

This is not a TypeScript course — but the test files use several TypeScript
features that are worth understanding so you can read and write them confidently.

### `const` vs `let`

```ts
const url = `${config.BASE_URL}/signin`;   // cannot be reassigned
let response!: AxiosResponse;              // can be reassigned (used in beforeAll)
```

Use `const` for values that never change (URLs, test data objects).
Use `let` for values that are assigned later (e.g. the response from `beforeAll`).

### Type annotations — `: type`

TypeScript lets you declare the type of a variable after a colon.

```ts
let response: AxiosResponse;   // response must be an AxiosResponse
let status: number;            // status must be a number
let message: string;           // message must be a string
```

If you assign the wrong type, TypeScript shows an error BEFORE the code runs:

```ts
let status: number = 'hello';  // ✗ Error: Type 'string' is not assignable to type 'number'
```

### `!` — definite assignment assertion

```ts
let response!: AxiosResponse;
```

The `!` after the variable name tells TypeScript: *"I know this looks unassigned,
but I guarantee it will be set before it is used."*

Without `!`, TypeScript would complain that `response` is used before being assigned
(because it is declared on one line and assigned inside `beforeAll` on another).
The tests still run correctly — this is purely a TypeScript type-checking hint.

### `type` imports

```ts
import axios, { type AxiosResponse } from 'axios';
```

The `type` keyword means: import this for type-checking only, not at runtime.
`AxiosResponse` is a TypeScript interface (a description of a shape) — it does
not exist as JavaScript code after compilation, so it should not be in the
runtime import.

Without `type`:

```ts
import axios, { AxiosResponse } from 'axios';   // also works but imports needlessly
```

Using `type` is the correct practice and is required by some linters.

### Function parameter and return types

```ts
function expectRejected(status: number): void {
  expect([400, 429]).toContain(status);
}
```

- `status: number` — the function only accepts a number as its argument
- `: void` — the function returns nothing (no `return` statement with a value)

If you call `expectRejected('hello')`, TypeScript will show an error immediately
before the code even runs.

### Template literals — `` `${variable}` ``

```ts
const url = `${config.BASE_URL}/signin`;
```

A template literal is a string that can embed variables using `${}`.
The backtick character (`` ` ``) wraps it — not a regular quote.

```ts
const base = 'https://api.codeandtest.com/api/v1';
const url = `${base}/signin`;
// result: "https://api.codeandtest.com/api/v1/signin"
```

This is standard JavaScript (ES6) but used everywhere in TypeScript too.

### `AxiosResponse` — what is it?

`AxiosResponse` is a TypeScript interface provided by Axios that describes
the shape of any HTTP response object:

```ts
interface AxiosResponse {
  status: number;         // HTTP status code (200, 400, etc.)
  data: any;              // parsed response body
  headers: object;        // response headers
  config: object;         // the config used for the request
  // ...and more
}
```

When you type `let response!: AxiosResponse`, your IDE knows that
`response.status` is a number and `response.data` is the body.
This gives you autocomplete and catches typos like `response.stattus`.

### `async () =>` vs `() =>`

```ts
it('returns 400', async () => {     // async — can use `await` inside
  const res = await axios.post(...);
  expect(res.status).toBe(400);
});

it('reads shared response', () => { // NOT async — no await needed
  expect(response.status).toBe(400);
});
```

Only mark a function `async` when it contains at least one `await`.
A function that only reads from a variable set by `beforeAll` does not need `async`.

---

## 11. Hooks — `beforeAll`, `afterAll`, `beforeEach`, `afterEach`


You will use these extensively from Lecture 2 onwards. Here is the concept:

```ts
describe('My test suite', () => {

  beforeAll(async () => {
    // Runs ONCE before any test in this describe block
    // Typical use: sign in, create a resource to test against
  });

  afterAll(async () => {
    // Runs ONCE after all tests in this describe block finish
    // Typical use: delete test data, sign out
  });

  beforeEach(async () => {
    // Runs before EACH individual test
    // Typical use: reset state, create fresh test data
  });

  afterEach(async () => {
    // Runs after EACH individual test
    // Typical use: clean up what this test created
  });

  it('test one', async () => { ... });
  it('test two', async () => { ... });
});
```

**Execution order for two tests:**

```
beforeAll
  beforeEach → test one → afterEach
  beforeEach → test two → afterEach
afterAll
```

In Lecture 1 we do not need them — every test is independent. From Lecture 2 onwards
we use `beforeAll` to sign in once, run all tests, then clean up in `afterAll`.

---

## 12. Postman — Manual Testing First

Before writing a test, always try the endpoint in Postman to see the real response.
You cannot write correct assertions without knowing what the server actually returns.

### Setup
1. Open Postman
2. Create a new **Collection** → name it **Chatty API**
3. Create a new **Environment** → name it **Chatty Prod**
4. Add variable: `base_url` = `https://api.codeandtest.com/api/v1`
5. Select the environment in the top-right dropdown

### First request — wrong credentials
1. New request → name it **SignIn — wrong credentials**
2. Method: `POST`
3. URL: `{{base_url}}/signin`
4. Body tab → **raw** → **JSON**:
```json
{
  "username": "notarealuser99999",
  "password": "WrongPass@9999"
}
```
5. Click **Send**

**Expected response:**
```json
Status: 400 Bad Request

{
  "message": "Invalid credentials",
  "statusCode": 400,
  "status": "error"
}
```

### Add Postman assertions (Tests tab)

```js
// Assert status code
pm.test('Status is 400', function () {
  pm.response.to.have.status(400);
});

// Assert response body fields
pm.test('Response has correct shape', function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property('message');
  pm.expect(body.status).to.eql('error');
  pm.expect(body.statusCode).to.eql(400);
});

// Assert message value exactly
pm.test('Message is "Invalid credentials"', function () {
  const body = pm.response.json();
  pm.expect(body.message).to.eql('Invalid credentials');
});
```

Click **Send** — all 3 tests should pass in the Test Results panel.

### Second request — empty body

1. Duplicate the request → rename to **SignIn — empty body**
2. Body: `{}`
3. Send — still expect 400

Understanding this difference is key:
- Empty body → 400 from **Joi validation** (schema requires `username` + `password`)
- Wrong credentials → 400 from **business logic** (user not found / password wrong)

Both return 400, but for different reasons. Both are negative tests.

---

## 13. Understanding the Test File

Open `tests/lecture-01/lecture.test.ts` and read the comments from top to bottom
before running anything. The comments explain every line.

### Import paths — why `../../src/config`?

```ts
import { config } from '../../src/config';
```

This is a **relative import**. The `../../` means "go up two directories".

From `tests/lecture-01/lecture.test.ts`:
- `../` → up to `tests/`
- `../../` → up to project root
- `../../src/config` → into `src/config.ts`

If the import starts with `./` or `../` it is relative. If it starts with a package
name like `axios` it resolves from `node_modules`.

### What `describe()` does

```ts
describe('Lecture 01 — First API Test', () => {
  // tests go here
});
```

Groups related tests. The string is a label shown in terminal output.
It does not run anything by itself — only `it()` blocks run tests.

### What `it()` does

```ts
it('POST /signin with wrong credentials returns 400', async () => {
  // test code here
});
```

One individual test case. The string is the test name.
If the test fails, this is exactly what appears in the error output.

### What `expect()` does

```ts
expect(response.status).toBe(400);
```

An assertion — a statement that must be true.
If `response.status` is `200`, this throws immediately:
```
AssertionError: expected 200 to be 400
```
Assertions after a failing one are not reached.

### Common matchers

| Matcher | What it checks | Example |
|---------|---------------|---------|
| `.toBe(x)` | Exact equality (`===`) | `.toBe(400)` |
| `.toEqual(x)` | Deep equality (objects/arrays) | `.toEqual({ id: 1 })` |
| `.toContain(x)` | String contains / array includes | `.toContain('json')` |
| `.toHaveProperty(key)` | Object has the key | `.toHaveProperty('message')` |
| `.toBeGreaterThan(n)` | Number > n | `.toBeGreaterThan(0)` |
| `.toBeDefined()` | Not `undefined` | `.toBeDefined()` |
| `.toBeNull()` | Value is `null` | `.toBeNull()` |
| `.not.toBe(x)` | Negates any matcher | `.not.toBe(200)` |

---

## 14. Running the Tests

```bash
# Run just Lecture 1
npm test tests/lecture-01/lecture.test.ts

# Run in watch mode (re-runs on every file save)
npm run test:watch tests/lecture-01/lecture.test.ts
```

**Expected output — 6 tests (2 describe blocks × 3 tests each):**

```
✓ tests/lecture-01/lecture.test.ts (6)
  ✓ Lecture 01 — Style 1: async/await > POST /signin with wrong credentials returns 400
  ✓ Lecture 01 — Style 1: async/await > response body contains a message field
  ✓ Lecture 01 — Style 1: async/await > response body status field is "error"
  ✓ Lecture 01 — Style 2: .then() > POST /signin with wrong credentials returns 400
  ✓ Lecture 01 — Style 2: .then() > response body contains a message field
  ✓ Lecture 01 — Style 2: .then() > response body status field is "error"

Test Files  1 passed (1)
Tests       6 passed (6)
Duration    ~1.5s
```

**When a test fails:**

```
✗ Lecture 01 — Style 1: async/await > POST /signin with wrong credentials returns 400
  AssertionError: expected 200 to be 400
   ❯ lecture.test.ts:59:29
```

Read the error: file name, line number, what was expected (`400`), what was received (`200`).

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing env var: BASE_URL` | No `.env` file | Copy `.env.example` to `.env` and fill in |
| `ECONNREFUSED 127.0.0.1:5000` | Local backend not running | `npm run start:dev` in `chatty-backend/` |
| `ENOTFOUND api.codeandtest.com` | No internet / wrong URL | Check network, verify BASE_URL |
| `expected 405 to be 400` | Wrong domain (`codeandtest.com` not `api.`) | Fix BASE_URL in `.env` |
| Test passes but assertion never ran | Forgot `return` in `.then()` test | Add `return` before `axios.post(...)` |

---

## 15. Git Setup & First Push

### Step 1 — Initialise the repository

```bash
git init
git add .gitignore package.json tsconfig.json vitest.config.ts .env.example src/ tests/lecture-01/
git status                          # verify what will be committed
git commit -m "lecture-01: project setup and first test"
```

### Step 2 — Create a GitHub repository

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `chatty-api-tests`
3. Leave it empty (no README, no .gitignore — you already have these)
4. Copy the HTTPS URL

### Step 3 — Connect and push

```bash
git remote add origin https://github.com/YOUR_USERNAME/chatty-api-tests.git
git push -u origin main
```

Visit your repository on GitHub — you should see all your files.

### Step 4 — Create a branch for Lecture 02

Each lecture gets its own branch — keeps the history clean and each PR easy to review.

```bash
git checkout -b lecture-02-signin
```

> **Why branch per lecture?**
> When Lecture 11 (CI/CD) runs tests on every push, you will see each lecture's
> work appear as a separate PR. This mirrors the real-world workflow of a QA engineer
> opening a PR for a new test suite.

## Key Takeaways

By the end of this lecture you have:

- ✅ A working project: `vitest.config.ts`, `tsconfig.json`, `src/config.ts`, `src/test-utils.ts`
- ✅ Your first tests passing against the production API
- ✅ 8 assertion patterns: basic, exact values, shape (`toMatchObject`), negative (`.not.`), boundary, headers, response time, one-request-many-checks
- ✅ Rate limiting awareness — `expectRejected([400, 429])` handles production constraints
- ✅ Both `async/await` and `.then()` styles — you know when to use each

**What's next:** Lecture 2 tests the **success path** of signin — same endpoint, completely different assertions. You will learn how to capture a session cookie and use it to make authenticated requests.

---

## Homework

Open `tests/lecture-01/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-01/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Header assertions — `toContain` on `content-type` |
| 2 | Response shape — `toMatchObject` with `expect.any()` |
| 3 | Negative assertions — `.not.toHaveProperty()` |
| 4 | Boundary value — 3-char username, `expectRejected` |
| 5 *(bonus)* | `.then()` style — `return` the promise |
| 6 | `toMatch(/regex/)` — assert message matches non-empty pattern |
| 7 | `toBeTypeOf('number')` + `toBeTruthy` — type check and truthiness |

Run Vitest homework:
```bash
npm test tests/lecture-01/homework/starter.test.ts
```

Goal: **7 tests passing**

> Once done — or genuinely stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.

---

# Lecture 02 — SignIn — Authentication & Cookies

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 1 — project setup, first tests, 8 assertion patterns, rate limiting.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-02/lecture.test.ts
> npm test tests/lecture-02/homework/starter.test.ts
> ```

---

## What You Will Learn

- How to test a successful (positive) API flow — 200 response, token, user object
- What a session cookie is and how Chatty uses it — `HttpOnly`, `Secure`, cookie-session
- What a JWT token is — format validation without decoding
- How to capture the `set-cookie` header with Axios — why it is an array
- How to send a cookie in subsequent authenticated requests — `{ headers: { Cookie } }`
- How `afterAll` works — cleanup always runs, even when tests fail
- How to chain two requests: signin → use cookie → GET /currentuser
- Negative tests alongside positive — wrong credentials, missing fields, `expectRejected`
- `validateStatus: () => true` — reminder from Lecture 1, used in every test in this course
- Shared utilities from `src/test-utils.ts` — `expectRejected`, `expectSuccess`
- Postman cookie jar — automatic cookie management, ordered Collection Runner
- Advanced assertion variants — `toMatch(/regex/)` for JWT format, `expect.stringMatching`, `toBeGreaterThanOrEqual`

> **Reference Topics**
> - New to JWT tokens? → [`docs/topics/jwt.md`](../../docs/topics/jwt.md)
> - New to cookies and sessions? → [`docs/topics/cookies-sessions.md`](../../docs/topics/cookies-sessions.md)
> - How Axios handles cookies → [`docs/topics/axios.md`](../../docs/topics/axios.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Prerequisites |
| 2 | What Changes from Lecture 1 |
| 3 | JWT Token — What Is It? |
| 4 | Session Cookie — What Is It? |
| 5 | Quick Reminder — `validateStatus` |
| 6 | Capturing the Cookie with Axios |
| 7 | `afterAll` — Cleanup After Tests |
| 8 | Shared Utilities — `src/test-utils.ts` |
| 9 | Postman — Cookie Jar |
| 10 | Endpoint Schema & Validation Rules |
| 11 | What the Signin Response Contains |
| 12 | Understanding the Test File |
| 13 | Running the Tests |
| 14 | Git |

---

## 1. Prerequisites

Before running Lecture 2 tests you need a **pre-existing test account** on the server.

Create one manually:
1. Open the app at `https://codeandtest.com`
2. Register a new account with a username that starts with `vitest` (e.g. `vitestmike`)
3. Save the username and password in your `.env` file:

```
TEST_USERNAME=vitestmike
TEST_PASSWORD=YourPassword@123
```

> **Every student must create their own unique account.**
> Do NOT share a test account with other students.
>
> If two students use the same `TEST_USERNAME`, Lecture 4 tests will conflict:
> both students modify the same profile simultaneously and overwrite each other's data.
> Different usernames = isolated test state = no conflicts.
>
> Use a username that is personal and unique, like `vitest` + your name:
> `vitestmike`, `vitestanna`, `vitestjohn`, etc.

> Why start with `vitest`? The test cleanup endpoint (used from Lecture 3 onwards)
> only deletes users whose username starts with `vitest` — a safety guard to prevent
> accidental deletion of real accounts.

---

## 2. What Changes from Lecture 1

In Lecture 1 we only tested the **error path** — wrong credentials, missing fields.
The server never actually authenticated us.

In Lecture 2 we test the **happy path** — correct credentials, successful login.
This introduces two new things in the response:

1. **A JWT token** in the response body (`response.data.token`)
2. **A session cookie** in the response headers (`response.headers['set-cookie']`)

Both are needed to make authenticated requests to protected endpoints.

---

## 3. JWT Token — What Is It?

**JWT** = JSON Web Token. A compact, self-contained string that proves who you are.

Structure: `header.payload.signature` — three parts separated by dots.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIuLi4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│─────────────────────────────────────│ │────────────────────│ │────────────────────────────────────────────│
         header (base64)                   payload (base64)              signature (HMAC-SHA256)
```

The **payload** contains the user's data (userId, username, email, etc.).
It can be decoded by anyone — it is NOT encrypted, only signed.
The **signature** proves the token was issued by the server — it cannot be forged
without the server's secret key (`JWT_TOKEN` in `.env`).

The token expires after 24 hours (set in the Chatty signin controller).

**How Chatty uses it:**
The JWT is stored INSIDE the session cookie (not sent as a standalone `Authorization` header).
The server signs the cookie with `SECRET_KEY_ONE` and `SECRET_KEY_TWO` using `cookie-session`.
When a request arrives, the server reads the cookie, extracts the JWT, verifies it, and
sets `req.currentUser` for use in controllers.

---

## 4. Session Cookie — What Is It?

An HTTP cookie is a small piece of data the server sends in a response header.
The browser (or Axios) stores it and automatically sends it back on every
subsequent request to the same domain.

```
Response header:
  set-cookie: session=eyJ...; Path=/; HttpOnly; Secure

Next request header (automatic):
  Cookie: session=eyJ...
```

**`HttpOnly`** — the cookie cannot be read by JavaScript in the browser.
This prevents XSS attacks from stealing the session.

**`Secure`** — the cookie is only sent over HTTPS, never plain HTTP.

**In tests with Axios:**
Axios does NOT automatically send cookies between requests like a browser does.
You must manually capture the `set-cookie` header and pass it in the next request.
This is intentional — it makes the auth flow explicit and easy to understand.

---

## 5. Quick Reminder — `validateStatus: () => true`

Every Axios request in this course uses `validateStatus: () => true`.
If you skipped Lecture 1, here is why it is required:

By default Axios **throws an error** for any 4xx or 5xx response.
In test code this means your `expect()` assertions never run — the test crashes first.

```ts
// Without — crashes on 400/401/404:
const res = await axios.post(url, data);

// With — always returns the response, no throwing:
const res = await axios.post(url, data, { validateStatus: () => true });
expect(res.status).toBe(200); // now this runs
```

`() => true` is an arrow function that always returns `true`.
Axios calls it with the status code and throws only when it returns `false`.
By always returning `true`, you say: "give me the response for any status code."

---

## 6. Capturing the Cookie with Axios

The `set-cookie` header is an array of strings (one per cookie):

```ts
const rawCookies = response.headers['set-cookie'];
// Example value: ['session=eyJ...; Path=/; HttpOnly; Secure']

// Extract just the first cookie string
const sessionCookie = Array.isArray(rawCookies) ? rawCookies[0] : rawCookies ?? '';
```

**Why an array?** Servers can set multiple cookies at once. `set-cookie` can appear
multiple times in the response headers — HTTP parsers collect all of them into an array.
Chatty only sets one (`session`), so we always take index `[0]`.

**Using the cookie in subsequent requests:**

```ts
const response = await axios.get(`${config.BASE_URL}/currentuser`, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
```

You pass the full raw cookie string as the `Cookie` header — the same string you
got from `set-cookie`, including everything before the first semicolon.

Actually — Axios sends the FULL string `session=eyJ...; Path=/; HttpOnly; Secure`.
The server only reads the `session=...` part and ignores `Path`, `HttpOnly`, `Secure`
(those are directives for the browser, not the server). This is correct and expected.

---

## 7. `afterAll` — Cleanup After Tests

In Lecture 1, tests were stateless — no side effects to clean up.
In Lecture 2, we sign in at the start. Good practice is to **sign out at the end**:

```ts
afterAll(async () => {
  if (!sessionCookie) return;

  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

**Why sign out in tests?**
- Closes the session on the server (invalidates the cookie)
- Keeps the server state clean
- Mirrors what a real user does

**Execution order reminder:**

```
beforeAll → [test 1, test 2, test 3, ...] → afterAll
```

`afterAll` runs even if tests fail — so cleanup always happens.

---

## 8. Shared Utilities — `src/test-utils.ts`

Every test file in this course imports from `src/test-utils.ts`.
If you skipped Lecture 1, here is what you need to know:

```ts
import { expectRejected, expectSuccess } from '../../src/test-utils';
```

| Function | Accepts | Why |
|----------|---------|-----|
| `expectRejected(status)` | `400` or `429` | Production auth endpoints are rate-limited (5 req/min). After a few runs the server returns `429` instead of `400`. This helper accepts both. |
| `expectSuccess(status)` | `200` or `201` | Accepts either success code when the exact one is not important. |

**Why not just `expect(status).toBe(400)` directly?**
When testing against production, rate limiting can change a valid `400` into a `429`.
`expectRejected` makes your tests resilient to this without hiding real failures.

---

## 9. Postman — Cookie Jar

Postman manages cookies automatically. After a successful signin, the `set-cookie`
response header is stored in Postman's **Cookie Jar** and sent automatically on
subsequent requests to the same domain.

### Setup

1. In your **Chatty API** collection, create a folder named **Auth**
2. Inside Auth, create request **SignIn — success**
3. Method: `POST`
4. URL: `{{base_url}}/signin`
5. Body → raw → JSON:

```json
{
  "username": "{{test_username}}",
  "password": "{{test_password}}"
}
```

6. In **Chatty Prod** environment, add:
   - `test_username` = your TEST_USERNAME value
   - `test_password` = your TEST_PASSWORD value

### Tests tab

```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Response has correct shape', () => {
  const body = pm.response.json();
  pm.expect(body.message).to.eql('User login successfully');
  pm.expect(body.token).to.be.a('string');
  pm.expect(body.user).to.be.an('object');
  pm.expect(body.user).to.not.have.property('password');
});

// Save token to environment for use in other requests
pm.environment.set('token', pm.response.json().token);
```

7. Send the request — check the **Cookies** tab to see the session cookie was set
8. Check the **Headers** tab in the response — you will see `set-cookie: session=eyJ...`

### Follow-up request — verify the cookie works

1. Create a new request **Current User** inside the Auth folder
2. Method: `GET`
3. URL: `{{base_url}}/currentuser`
4. No body needed — Postman sends the cookie automatically
5. Send — should return 200 with the current user object

**Tests tab for Current User:**

```js
pm.test('Status is 200 — cookie authenticated us', () => {
  pm.response.to.have.status(200);
});

pm.test('Returned user matches signed-in user', () => {
  const body = pm.response.json();
  pm.expect(body.user.username.toLowerCase())
    .to.eql(pm.environment.get('test_username').toLowerCase());
});
```

### Negative request — wrong password

1. Duplicate **SignIn — success** → rename to **SignIn — wrong password**
2. Change body to:

```json
{
  "username": "{{test_username}}",
  "password": "DefinitelyWrong@999"
}
```

3. Send — expect `400 Bad Request`

**Tests tab:**

```js
pm.test('Status is 400', () => pm.response.to.have.status(400));

pm.test('Error message is "Invalid credentials"', () => {
  pm.expect(pm.response.json().message).to.eql('Invalid credentials');
});

pm.test('No token on failed login', () => {
  pm.expect(pm.response.json()).to.not.have.property('token');
});
```

### Signout request

1. Create request **SignOut** inside Auth folder
2. Method: `POST`
3. URL: `{{base_url}}/signout`
4. No body needed — cookie is sent automatically
5. Send — should return 200

After signout, try the **Current User** request again — it should now return 401
because the session is invalidated.

---

## 10. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**Endpoint:** `POST /api/v1/signin`
**Schema file:** `chatty-backend/src/features/auth/schemas/signin.ts`

| Field | Type | Required | Constraints | Error message (400) |
|-------|------|----------|-------------|---------------------|
| `username` | string | ✅ | min 4 chars, max 32 chars | `'Invalid username'` |
| `password` | string | ✅ | min 8 chars, max 128 chars | `'Invalid password'` |

> This is the same schema as Lecture 1 — but now we understand it in context.
> In Lecture 1 we only saw it from the failure side (wrong input → 400).
> In Lecture 2 we see what happens when it passes (correct input → 200 + token + cookie).

**Successful response shape:**

| Field | Type | Notes |
|-------|------|-------|
| `message` | string | Always `"User login successfully"` |
| `token` | string | JWT — three dot-separated parts (`header.payload.signature`) |
| `user._id` | string | MongoDB ObjectId as string |
| `user.username` | string | Title-cased (`"vitestmike"` → `"Vitestmike"`) |
| `user.email` | string | Lowercase |
| `user.avatarColor` | string | Hex colour string |
| `user.profilePicture` | string | Cloudinary URL or empty string |
| `user.postsCount` | number | Starts at 0 |
| `user.followersCount` | number | Starts at 0 |
| `user.followingCount` | number | Starts at 0 |
| `user.password` | — | **ABSENT** — stripped by server before responding |

**Response headers:**

| Header | Value | Notes |
|--------|-------|-------|
| `set-cookie` | `session=eyJ...; Path=/; HttpOnly; Secure` | Session cookie containing the JWT |
| `content-type` | `application/json; charset=utf-8` | Always JSON |

---

## 11. What the Signin Response Contains

```json
{
  "message": "User login successfully",
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "authId": "...",
    "uId": "...",
    "username": "Vitestmike",
    "email": "test@example.com",
    "avatarColor": "#ff6b6b",
    "profilePicture": "https://...",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0,
    "blocked": [],
    "blockedBy": [],
    "work": "",
    "school": "",
    "location": "",
    "quote": "",
    "bgImageVersion": "",
    "bgImageId": "",
    "social": { "facebook": "", "instagram": "", "twitter": "", "youtube": "" },
    "notifications": { "messages": true, "reactions": true, "comments": true, "follows": true },
    "createdAt": "2026-04-17T..."
  }
}
```

**Important:** The `password` field is **absent** — the controller strips it before
sending (`const { password: _pw, ...safeUser } = userDocument`).

**Headers also contain:**
```
set-cookie: session=eyJ...; Path=/; HttpOnly; Secure
```

---

## 12. Understanding the Test File

Open `tests/lecture-02/lecture.test.ts`. New patterns introduced here:

### File-level `beforeAll` + `afterAll`

```ts
let signInResponse!: AxiosResponse;
let sessionCookie!: string;

beforeAll(async () => {
  signInResponse = await axios.post(url, credentials, { validateStatus: () => true });
  const raw = signInResponse.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : raw ?? '';
});

afterAll(async () => {
  if (sessionCookie) {
    await axios.post(`${config.BASE_URL}/signout`, {}, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  }
});
```

### JWT format check

```ts
const parts = token.split('.');
expect(parts).toHaveLength(3);       // header.payload.signature
parts.forEach(part => {
  expect(part.length).toBeGreaterThan(0); // each part is non-empty
});
```

### Cookie extraction

```ts
const raw = response.headers['set-cookie'];
const cookie = Array.isArray(raw) ? raw[0] : raw ?? '';
expect(cookie).toContain('session=');
```

### Using the cookie for an authenticated request

```ts
const authResponse = await axios.get(`${config.BASE_URL}/currentuser`, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
expect(authResponse.status).toBe(200);
```

---

## 13. Running the Tests

Make sure your `.env` has `TEST_USERNAME` and `TEST_PASSWORD` set.

```bash
npm test tests/lecture-02/lecture.test.ts
```

**Expected output:**
```
✓ 1. Successful signin > status is 200
✓ 1. Successful signin > message is "User login successfully"
✓ 2. Token > token exists in response body
✓ 2. Token > token is a string
✓ 2. Token > token has JWT format (3 dot-separated parts)
✓ 3. Session cookie > set-cookie header is present
✓ 3. Session cookie > cookie contains "session="
✓ 4. User object > has expected fields
✓ 4. User object > username matches TEST_USERNAME
✓ 4. User object > password is not exposed
✓ 5. Authenticated request > cookie works on /currentuser
✓ 6. Negative tests > wrong password returns 400
✓ 6. Negative tests > missing password returns 400

Test Files  1 passed (1)
Tests  13 passed (13)
```

---

## 14. Git

```bash
# Stage the files for this lecture
git add tests/lecture-02/ src/config.ts vitest.config.ts
git status                          # verify what will be committed

# Commit
git commit -m "lecture-02: signin tests — cookie capture and JWT validation"

# Push the branch to GitHub
git push -u origin lecture-02-signin
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-02: signin tests — cookie capture and JWT validation`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-03-signup
```


## Key Takeaways

By the end of this lecture you have:

- ✅ Tested the **success path** — 200, token, user object, session cookie
- ✅ Captured `set-cookie` and passed it in subsequent requests
- ✅ Validated JWT format (3 dot-separated parts, starts with `eyJ`)
- ✅ Proved authentication works: cookie → 200, no cookie → 401
- ✅ `afterAll` signs out — session cleanup pattern established

**What's next:** Lecture 3 creates brand-new users with Faker.js. You will learn the full test lifecycle — `beforeAll` creates a user, tests run, `afterAll` deletes it via the cleanup endpoint.

---

## Homework

Open `tests/lecture-02/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-02/homework/postman-tasks.md` — **6 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Multiple assertions on one request — status, message, token, user |
| 2 | JWT format — `split('.')`, `startsWith('eyJ')` |
| 3 | Security assertion — `.not.toHaveProperty('password')` + cookie |
| 4 | Authenticated request — cookie unlocks `GET /currentuser` |
| 5 | `.then()` style — shape validation with `toMatchObject` |
| 6 | `toMatch` — validate JWT format with regex `/^[\w-]+\.[\w-]+\.[\w-]+$/` |
| 7 | `expect.stringMatching` — assert cookie contains `session=` via asymmetric matcher |

```bash
npm test tests/lecture-02/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.

---

# Lecture 03 — SignUp: Creating & Cleaning Up Test Users

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 2 — signin success path, JWT, session cookie capture, `afterAll` signout.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-03/lecture.test.ts
> npm test tests/lecture-03/homework/starter.test.ts
> ```

---

## What You Will Learn

- How to test a resource creation endpoint (POST → 201)
- How Faker.js generates dynamic test data so tests never clash in the database
- Why test usernames must start with `vitest` — the safety guard
- What `avatarImage` is — base64, Cloudinary, and why we use a fixed test image
- How the test cleanup endpoint works — `DELETE /test/cleanup/user/:authId`
- The full test lifecycle: `beforeAll` creates → tests run → `afterAll` deletes
- How to test duplicate signup (same username or email → 400)
- Password pattern requirements — not all strings are valid passwords
- `src/fixtures.ts` — shared test constants: `TEST_AVATAR_IMAGE`, `TEST_AVATAR_COLOR`, `TEST_PASSWORD`, `TEST_CLEANUP_SECRET`
- Why the cleanup secret is hardcoded (not an env var) — simpler deployment, same safety
- Postman — testing signup, duplicate check, and cleanup in a Collection Runner flow
- Advanced assertion variants — `toMatch(/regex/)` for email format, `toBeGreaterThanOrEqual` for numeric bounds, `toSatisfy(fn)` with custom predicates

> **Reference Topics**
> - New to Faker.js? → [`docs/topics/faker.md`](../../docs/topics/faker.md)
> - Test cleanup patterns → [`docs/topics/test-cleanup.md`](../../docs/topics/test-cleanup.md)
> - What is a base64 data URL? → [`docs/topics/base64.md`](../../docs/topics/base64.md)
> - How Cloudinary handles uploaded images → [`docs/topics/cloudinary.md`](../../docs/topics/cloudinary.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | POST vs GET — 201 vs 200 |
| 2 | Faker.js — Dynamic Test Data |
| 3 | Why Usernames Must Start With `vitest` |
| 4 | The `avatarImage` Challenge |
| 5 | The Test Cleanup Endpoint |
| 6 | Full Test Lifecycle |
| 7 | Password Requirements |
| 8 | Shared Utilities Reminder |
| 9 | Postman — Testing Signup |
| 10 | Endpoint Schema & Validation Rules |
| 11 | Understanding the Test File |
| 12 | Running the Tests |
| 13 | Git |

---

## 1. POST vs GET — 201 vs 200

In Lecture 2, signin returned `200 OK` — the request succeeded and data was returned.

Signup returns `201 Created` — a new resource was written to the database.

HTTP convention:
| Action | Method | Success status |
|--------|--------|---------------|
| Read existing data | GET | 200 OK |
| Successful operation (login, logout) | POST | 200 OK |
| Create a new resource | POST | **201 Created** |
| Update existing resource | PUT / PATCH | 200 OK |
| Delete a resource | DELETE | 200 OK |

Always assert the **exact** status code — `expectSuccess()` accepts both 200 and 201,
but for signup use `.toBe(201)` because the exact code is meaningful.

---

## 2. Faker.js — Dynamic Test Data

If every test run uses the same username/email (`testuser@example.com`), the second
run fails with `"User already exists"` because the first run created that user.

**Faker.js** generates realistic random data on every run:

```ts
import { faker } from '@faker-js/faker';

const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
// Example: "vitestk7m2xq9w"

const email = faker.internet.email().toLowerCase();
// Example: "john.doe4821@gmail.com"
```

**`@faker-js/faker`** is already installed in the project (`package.json` devDependencies).
It never repeats the same values across runs, so two test executions running simultaneously
(e.g. in CI) will not collide.

---

## 3. Why Usernames Must Start With `vitest`

The test cleanup endpoint has a safety guard:

```ts
// chatty-backend/src/features/auth/controllers/test-cleanup.ts
if (!username.startsWith('vitest')) {
  throw new BadRequestError('Safety check failed: not a test user');
}
```

If the username does NOT start with `vitest`, the cleanup endpoint refuses to delete it —
even with the correct secret. This prevents accidental deletion of real user accounts.

**Rule (also in STANDARDS.md §15):** All test usernames must start with `vitest`.

```ts
// ✅
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;

// ✗ — cleanup endpoint will reject this
const username = faker.internet.username();
```

---

## 4. The `avatarImage` Challenge

The signup endpoint requires an `avatarImage` field — a base64-encoded image string.
The server uploads it to Cloudinary before creating the user.

```ts
const result = await uploads(avatarImage, `${userObjectId}`, true, true);
if (!result?.public_id) {
  throw new BadRequestError('File upload failed.');
}
```

**Why you cannot use fake data here:**
Cloudinary rejects strings that are not valid images.
`"not-a-real-image"` → Cloudinary returns an error → server returns 400.

**Solution — `src/fixtures.ts`:**
The project provides a constant `TEST_AVATAR_IMAGE` — a 1×1 pixel black PNG
encoded in base64. It is the smallest possible valid PNG (~68 bytes decoded).
Cloudinary accepts it every time.

```ts
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

// Use in the signup body:
avatarImage: TEST_AVATAR_IMAGE
```

**Format:** `data:image/png;base64,<base64data>`

The `data:image/png;base64,` prefix is a **data URL** — a standard way to embed
binary data directly in a string. The server's upload helper recognises this format.

---

## 5. The Test Cleanup Endpoint

Every user created by a test must be deleted after the test finishes.
Without cleanup, the database fills up with test data and future runs fail on duplicates.

**Endpoint:** `DELETE /api/v1/test/cleanup/user/:authId`
**Status:** Live on `api.codeandtest.com` ✅

**Required header:** `x-test-secret: chatty-test-cleanup-2026`

**Why hardcoded and not an env var?**
A traditional secret-in-env approach requires deploying a secret to the server and
setting it in `.env` on both the server and the test project — operational overhead.
Since this endpoint only deletes users whose username starts with `vitest`, the real
safety comes from that prefix check, not the header secret. Hardcoding simplifies setup
with no meaningful security loss for a course environment.

**Two protection layers:**
1. Header must be exactly `chatty-test-cleanup-2026` → `403` if wrong or missing
2. Username must start with `vitest` → `400` if not a test user

**Verify it's working** (quick manual test from terminal):
```bash
curl -X DELETE https://api.codeandtest.com/api/v1/test/cleanup/user/507f1f77bcf86cd799439011 \
  -H "x-test-secret: chatty-test-cleanup-2026"
# Expected: 404 {"message":"Auth user with id 507f1f77bcf86cd799439011 not found",...}
# This means: secret accepted ✅, user not found (correct — it's a fake ID)
# If you get 403: secret doesn't match (check the backend has the latest code deployed)
```

```ts
await axios.delete(`${config.BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, // from src/fixtures.ts
  validateStatus: () => true,
});
```

**Where does `authId` come from?**
The signup response includes `user.authId` — the ID of the `Auth` collection document.
The cleanup endpoint deletes from both `Auth` and `User` collections using this ID.

```ts
// Capture during beforeAll:
authId = signUpResponse.data.user.authId;
```

---

## 6. Full Test Lifecycle

```
beforeAll:
  1. Generate dynamic user data (Faker.js)
  2. POST /signup → get authId, cookie, token

tests run:
  3. Assert on the signup response

afterAll:
  4. DELETE /test/cleanup/user/:authId → clean up
```

```ts
let signUpResponse!: AxiosResponse;
let authId: string = '';
let sessionCookie: string = '';

beforeAll(async () => {
  const userData = {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  };

  signUpResponse = await axios.post(
    `${config.BASE_URL}/signup`,
    userData,
    { validateStatus: () => true },
  );

  authId = signUpResponse.data.user?.authId ?? '';
  const raw = signUpResponse.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

afterAll(async () => {
  if (!authId) return;

  await axios.delete(
    `${config.BASE_URL}/test/cleanup/user/${authId}`,
    {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, // from src/fixtures.ts
      validateStatus: () => true,
    },
  );
});
```

`afterAll` runs even when tests fail — so the database is always cleaned up.

---

## 7. Password Requirements

The signup Joi schema enforces a **pattern** on the password — not just length.
Faker's `faker.internet.password()` does NOT know about this pattern and often fails it.

Always use the `TEST_PASSWORD` constant from `src/fixtures.ts`:

```ts
import { TEST_PASSWORD } from '../../src/fixtures';
// 'Vitest@123456' — meets all requirements
```

| Requirement | Example character |
|-------------|------------------|
| At least 12 chars | `Vitest@123456` = 14 chars |
| At least 1 uppercase | `V` |
| At least 1 lowercase | `itest` |
| At least 1 digit | `123456` |
| At least 1 special (`@$!%*?&`) | `@` |

---

## 8. Shared Utilities Reminder

```ts
import { expectRejected } from '../../src/test-utils';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';
```

`TEST_CLEANUP_SECRET` is the hardcoded value `'chatty-test-cleanup-2026'` — no env var needed.
It is defined in `src/fixtures.ts` and must match `CLEANUP_HEADER_VALUE` in the backend controller.

`expectRejected(status)` — accepts `400` or `429` (rate limited).
Use for all negative tests against the production server.

---

## 9. Postman — Testing Signup

### Setup
In **Chatty API** collection, create folder **Lecture 03**.

### Request 1 — Successful signup

1. New request → **L03 — SignUp success**
2. Method: `POST`, URL: `{{base_url}}/signup`
3. Body → raw → JSON:

```json
{
  "username": "vitestpostman01",
  "email": "vitestpostman01@test.com",
  "password": "Vitest@123456",
  "avatarColor": "#4a90e2",
  "avatarImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}
```

**Tests tab:**
```js
pm.test('Status is 201', () => pm.response.to.have.status(201));

pm.test('Response shape is correct', () => {
  const body = pm.response.json();
  pm.expect(body.message).to.eql('User created successfully');
  pm.expect(body.token).to.be.a('string');
  pm.expect(body.user).to.be.an('object');
  pm.expect(body.user).to.not.have.property('password');
});

pm.test('authId is present', () => {
  pm.expect(pm.response.json().user.authId).to.be.a('string');
});

// Save authId for cleanup request
pm.environment.set('authId', pm.response.json().user.authId);
```

### Request 2 — Duplicate username

Duplicate **L03 — SignUp success** → rename to **L03 — SignUp duplicate**.
Send the same body again (same username).

**Tests tab:**
```js
pm.test('Status is 400 for duplicate', () => pm.response.to.have.status(400));

pm.test('Error message mentions already exists', () => {
  pm.expect(pm.response.json().message)
    .to.include('already');
});
```

### Request 3 — Cleanup (delete test user)

1. New request → **L03 — Cleanup user**
2. Method: `DELETE`
3. URL: `{{base_url}}/test/cleanup/user/{{authId}}`
4. Headers: `x-test-secret` = `chatty-test-cleanup-2026`

**Tests tab:**
```js
pm.test('Status is 200 — user deleted', () => pm.response.to.have.status(200));
pm.test('Deleted username is in response', () => {
  pm.expect(pm.response.json().deletedUsername.toLowerCase()).to.include('vitest');
});
```

### Stretch — Run in order with Collection Runner
Run: L03 — SignUp success → L03 — Duplicate → L03 — Cleanup user

---

## 10. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**Endpoint:** `POST /api/v1/signup`
**Schema file:** `chatty-backend/src/features/auth/schemas/signup.ts`

| Field | Type | Required | Constraints | Error message (400) |
|-------|------|----------|-------------|---------------------|
| `username` | string | ✅ | min 4 chars, max 20 chars | `'Username must be at least 4 characters'` / `'Username cannot exceed 20 characters'` |
| `password` | string | ✅ | min 12 chars, max 128 chars, pattern: 1 upper + 1 lower + 1 digit + 1 special (`@$!%*?&`) | `'Password must be at least 12 characters long'` / `'Password must contain...'` |
| `email` | string | ✅ | valid email format | `'Email must be valid'` |
| `avatarColor` | string | ✅ | any non-empty string | `'Avatar color is required'` |
| `avatarImage` | string | ✅ | any non-empty string (must be valid image for Cloudinary) | `'Avatar image is required'` |

**Business logic errors (after schema passes):**

| Scenario | Error message |
|----------|---------------|
| Username already taken | `'User already exists. Username or email is already taken.'` |
| Email already taken | `'User already exists. Username or email is already taken.'` |
| Cloudinary upload fails | `'File upload failed. Please check your image and try again.'` |

**Boundary values:**

| Input | Expected |
|-------|----------|
| `username` = 3 chars | 400 — `'Username must be at least 4 characters'` |
| `username` = 21 chars | 400 — `'Username cannot exceed 20 characters'` |
| `password` = 11 chars | 400 — `'Password must be at least 12 characters long'` |
| `password` = no uppercase | 400 — `'Password must contain...'` |
| `password` = no special char | 400 — `'Password must contain...'` |
| `email` = `"notanemail"` | 400 — `'Email must be valid'` |
| duplicate username | 400 — `'User already exists...'` |

---

## 11. Understanding the Test File

Open `tests/lecture-03/lecture.test.ts`.

New patterns used here that were not in Lectures 1 and 2:

**Importing from `src/fixtures.ts`:**
```ts
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD } from '../../src/fixtures';
```

**Dynamic username with Faker.js:**
```ts
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
```

**Capturing `authId` from the response:**
```ts
authId = signUpResponse.data.user?.authId ?? '';
```

The `?.` is optional chaining — if `signUpResponse.data.user` is undefined
(e.g. the signup failed), this returns `undefined` instead of throwing.
The `?? ''` sets `authId` to empty string if the result is `undefined`.

**Using the cleanup endpoint in `afterAll`:**
```ts
await axios.delete(`${config.BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, // from src/fixtures.ts
  validateStatus: () => true,
});
```

---

## 12. Running the Tests

**Your `.env` needs only:**
```
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=your-test-username
TEST_PASSWORD=your-test-password
```

`TEST_CLEANUP_SECRET` is NOT needed — it is hardcoded in `src/fixtures.ts`.

```bash
npm test tests/lecture-03/lecture.test.ts
```

**Expected output:**
```
✓ 1. Successful signup — basic > status is 201 Created
✓ 1. Successful signup — basic > message is "User created successfully"
✓ 1. Successful signup — basic > response has the correct top-level shape
✓ 2. User object > user has _id and authId
✓ 2. User object > username is title-cased version of what was sent
✓ 2. User object > email is lowercase
✓ 2. User object > password is NOT in the user object
✓ 2. User object > postsCount starts at 0
✓ 2. User object > profilePicture is a Cloudinary URL
✓ 3. Token and cookie > token is a valid JWT (three dot-separated parts)
✓ 3. Token and cookie > set-cookie header is present
✓ 3. Token and cookie > session cookie contains "session="
✓ 4. Test cleanup endpoint — protection checks > returns 403 with wrong secret
✓ 4. Test cleanup endpoint — protection checks > returns 403 with missing secret header
✓ 5. Duplicate signup > same username returns 400
✓ 5. Duplicate signup > same email returns 400
✓ 6. Boundary value tests > username shorter than 4 chars is rejected
✓ 6. Boundary value tests > username longer than 20 chars is rejected
✓ 6. Boundary value tests > password shorter than 12 chars is rejected
✓ 6. Boundary value tests > password without special character is rejected
✓ 6. Boundary value tests > invalid email format is rejected
✓ 7. Header assertions > Content-Type is application/json
✓ 8. Response time > signup responds within 10000ms

Test Files  1 passed (1)
Tests  23 passed (23)
```

**Note — Cloudinary:** Signup uploads a real image to Cloudinary on every run.
This means:
- Each run takes slightly longer (~2-5 seconds for the signup call)
- Each run creates a tiny image in your Cloudinary account (auto-cleaned up by `afterAll`)
- If the production Cloudinary account is down or misconfigured → signup tests fail with 400

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `signup responds within 10000ms` fails | Cloudinary upload slow | Increase timeout or retry |
| `status is 201` fails → got `400 File upload failed` | Invalid base64 image | Check `TEST_AVATAR_IMAGE` in fixtures.ts |
| `status is 201` fails → got `400 User already exists` | Same username generated twice (extremely rare with Faker) | Re-run |
| Cleanup test fails with `404` | authId not captured (signup failed) | Check signup failure first |

---

## 13. Git

```bash
# Stage the files for this lecture
git add tests/lecture-03/ src/fixtures.ts
git status                          # verify what will be committed

# Commit
git commit -m "lecture-03: signup tests — Faker.js, Cloudinary image, cleanup endpoint"

# Push the branch to GitHub
git push -u origin lecture-03-signup
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-03: signup tests — Faker.js, Cloudinary image, cleanup endpoint`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-04-current-user
```


## Key Takeaways

By the end of this lecture you have:

- ✅ Used Faker.js to generate unique, non-colliding test data every run
- ✅ Handled the `avatarImage` challenge — Cloudinary needs a real image
- ✅ Mastered the full lifecycle: `beforeAll` create → tests → `afterAll` delete
- ✅ `src/fixtures.ts` is the source of truth for shared test constants
- ✅ The `vitest` username prefix is the safety guard — cleanup endpoint enforces it
- ✅ Duplicate signup → 400 (business logic), password pattern → 400 (Joi validation)

**What's next:** Lecture 4 signs in with your permanent test account and modifies its profile. You will learn state verification (PUT then GET) and how to restore state in `afterAll`.

---

## Homework

Open `tests/lecture-03/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-03/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Multiple assertions — status 201, message, `_id`, `authId`, no password |
| 2 | `toMatchObject` + JWT format check |
| 3 | Duplicate email → 400 with `expectRejected` |
| 4 | Password pattern boundary — no special char |
| 5 | `.then()` style — cleanup endpoint returns 403 with wrong secret |
| 6 | `toMatch` — assert email matches format regex `/.+@.+\..+/` |
| 7 | `toSatisfy` — assert token is valid JWT using a custom predicate |

```bash
npm test tests/lecture-03/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.

---

# Lecture 04 — Current User, Profile Update & Signout

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 3 — dynamic user creation with Faker.js, `src/fixtures.ts`, full `beforeAll`/`afterAll` lifecycle.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-04/lecture.test.ts
> npm test tests/lecture-04/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /currentuser` — the authenticated user response shape (`token`, `isUser`, `user`)
- `GET /session-token` — what it returns and when it is useful
- **State verification** — update something with PUT, then GET to confirm the change persisted
- How Chatty's **Redis + Queue** pattern works — why updates are immediately visible in GET
- `PUT /user/profile/basic-info` — updating work, school, quote, location
- `PUT /user/profile/settings` — updating notification preferences
- **Restoring state in `afterAll`** — saving original values before tests and putting them back
- Signout flow — `POST /signout` invalidates the session, subsequent requests return 401
- Testing that a 401 is returned for unauthenticated requests
- Advanced assertion variants — `toBeGreaterThanOrEqual` for count fields, `toBeTruthy` for non-empty strings, `expect.objectContaining` inside `toEqual`

> **Reference Topics**
> - Why Redis — and why 200 doesn't mean saved → [`docs/topics/redis.md`](../../docs/topics/redis.md)
> - The PUT → GET verification pattern → [`docs/topics/state-verification.md`](../../docs/topics/state-verification.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | The Current User Response |
| 3 | Session Token |
| 4 | State Verification — Update Then GET |
| 5 | Chatty's Redis + Queue Architecture |
| 6 | Restoring State in `afterAll` |
| 7 | Signout |
| 8 | Postman — Testing the Update Flow |
| 9 | Endpoint Schema & Validation Rules |
| 10 | Understanding the Test File |
| 11 | Running the Tests |
| 12 | Git |

---

## 1. Endpoints in This Lecture

| Method | Path | Auth required | Returns |
|--------|------|---------------|---------|
| GET | `/currentuser` | ✅ | `{ token, isUser, user }` |
| GET | `/session-token` | ✅ | `{ token }` |
| PUT | `/user/profile/basic-info` | ✅ | `{ message: "Updated successfully" }` |
| PUT | `/user/profile/settings` | ✅ | `{ message: "Notification settings updated successfully", settings }` |
| POST | `/signout` | ✅ | `{ message: "User logout successfully", user: {}, token: "" }` |

---

## 2. The Current User Response

`GET /currentuser` returns a different shape than `POST /signin`:

```json
{
  "token": "eyJhbGci...",
  "isUser": true,
  "user": {
    "_id": "...",
    "username": "Vitestuser",
    "email": "...",
    "work": "",
    "school": "",
    "quote": "",
    "location": "",
    "notifications": {
      "messages": true,
      "reactions": true,
      "comments": true,
      "follows": true
    },
    "social": { ... },
    ...
  }
}
```

**Key differences from the signin response:**
- `isUser: true` — a boolean flag confirming the session is valid (always `true` here because we are authenticated)
- `token` is at the **top level** (not inside `user`) — same JWT from the session cookie
- The user object includes `work`, `school`, `quote`, `location` — profile fields not in the signup response

---

## 3. Session Token — `GET /session-token`

```json
{ "token": "eyJhbGci..." }
```

The simplest endpoint in the API — it just returns the JWT from the current session cookie.

**When is this useful?**
- When a frontend app needs to refresh its local copy of the JWT after a page reload
- Verifying that a session is still active (if there's no token → session expired)
- Extracting the JWT for use in tools that need it as a Bearer token

In tests: useful for confirming a session is alive without loading the full user object.

---

## 4. State Verification — Update Then GET

The core pattern of this lecture:

```
1. GET /currentuser → capture current value of work: ""
2. PUT /user/profile/basic-info → set work: "Senior QA Engineer"
3. GET /currentuser → assert work === "Senior QA Engineer"
```

Without step 3, you only know the PUT returned 200. You do NOT know whether the data was
actually saved. The server could return 200 and silently discard the update (a real bug).

**Always verify the state change, not just the response code.**

---

## 5. Chatty's Redis + Queue Architecture

When you call `PUT /user/profile/basic-info`, the server:

```
1. Updates Redis cache immediately (in-memory — fast)
2. Adds a job to the Bull queue (async — DB write happens later)
3. Returns 200 immediately
```

When you call `GET /currentuser` right after:
```
4. Server reads from Redis cache (not the database)
5. Returns the updated value immediately
```

**Why this matters for tests:**
The update is visible immediately in `GET /currentuser` — no need to wait.
If the cache were bypassed, you might get stale data.

This is why state verification tests in Lecture 4 always work — the cache is consistent.

---

## 6. Restoring State in `afterAll`

Profile updates are **persistent** — changing `work` for `vitestuser` leaves it changed
on the server for future test runs.

The solution: **capture the original values before changing them, restore them after.**

```ts
let originalWork: string = '';
let originalQuote: string = '';

beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';

  // Capture current profile values before we change them
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  originalWork = currentRes.data.user.work ?? '';
  originalQuote = currentRes.data.user.quote ?? '';
});

afterAll(async () => {
  // Restore original values
  await axios.put(basicInfoUrl, {
    work: originalWork,
    quote: originalQuote,
  }, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  // Sign out
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

This pattern keeps the test account in a consistent state across runs.

---

## 7. Signout

```ts
const res = await axios.post(signoutUrl, {}, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
// Returns: { message: "User logout successfully", user: {}, token: "" }
```

After signout, the session cookie is invalidated on the server.
Any subsequent request using that cookie returns `401`.

**Testing signout properly:**
```ts
// 1. Sign out
const signoutRes = await axios.post(signoutUrl, {}, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(signoutRes.status).toBe(200);

// 2. Prove the session is dead — same cookie no longer works
const afterRes = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(afterRes.status).toBe(401);
```

---

## 8. Postman — Testing the Update Flow

### Setup
Create folder **Lecture 04** in your **Chatty API** collection.

### Request 1 — Current User
1. New request → **L04 — Current User**
2. Method: `GET`, URL: `{{base_url}}/currentuser`
3. Postman sends the cookie automatically

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Response shape is correct', () => {
  const body = pm.response.json();
  pm.expect(body.isUser).to.be.true;
  pm.expect(body.token).to.be.a('string');
  pm.expect(body.user).to.be.an('object');
});

// Save current work for restore later
pm.environment.set('originalWork', pm.response.json().user.work);
```

### Request 2 — Update Basic Info
1. New request → **L04 — Update Basic Info**
2. Method: `PUT`, URL: `{{base_url}}/user/profile/basic-info`
3. Body → raw → JSON:

```json
{
  "work": "Senior QA Engineer",
  "quote": "Test everything",
  "school": "QA Academy",
  "location": "Kyiv"
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Updated successfully');
});
```

### Request 3 — Verify Update
1. Duplicate **L04 — Current User** → rename to **L04 — Verify Update**
2. No changes to method or URL

**Tests tab:**
```js
pm.test('work field was updated', () => {
  pm.expect(pm.response.json().user.work).to.eql('Senior QA Engineer');
});
```

### Request 4 — Update Notification Settings
1. New request → **L04 — Update Settings**
2. Method: `PUT`, URL: `{{base_url}}/user/profile/settings`
3. Body:

```json
{
  "messages": true,
  "reactions": false,
  "comments": true,
  "follows": false
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Settings returned in response', () => {
  const settings = pm.response.json().settings;
  pm.expect(settings.reactions).to.be.false;
  pm.expect(settings.follows).to.be.false;
});
```

### Request 5 — Restore original work value
1. Duplicate **L04 — Update Basic Info** → rename to **L04 — Restore**
2. Body:

```json
{
  "work": "{{originalWork}}"
}
```

### Request 6 — Signout
1. New request → **L04 — Signout**
2. Method: `POST`, URL: `{{base_url}}/signout`
3. No body

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('User logout successfully');
});
```

### Stretch — Full state lifecycle in Collection Runner
Run in order: Current User → Update Basic Info → Verify Update → Update Settings → Restore → Signout

---

## 9. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


### `GET /currentuser`
**Schema file:** No Joi validation — reads from session, no body required.

**Response shape:**

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | JWT from current session |
| `isUser` | boolean | Always `true` when authenticated |
| `user._id` | string | User document ID |
| `user.work` | string | Empty string `""` by default |
| `user.school` | string | Empty string `""` by default |
| `user.quote` | string | Empty string `""` by default |
| `user.location` | string | Empty string `""` by default |
| `user.notifications` | object | `{ messages, reactions, comments, follows }` — all `true` by default |

---

### `PUT /user/profile/basic-info`
**Schema file:** `chatty-backend/src/features/user/schemes/info.ts`

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `work` | string | ❌ | any string or empty | — |
| `school` | string | ❌ | any string or empty | — |
| `quote` | string | ❌ | any string or empty | — |
| `location` | string | ❌ | any string or empty | — |

> All fields are optional. You can send just one, all four, or any combination.
> Sending `{}` returns 200 and changes nothing.

**Response:** `{ message: "Updated successfully" }`

---

### `PUT /user/profile/settings`
**Schema file:** `chatty-backend/src/features/user/schemes/info.ts`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `messages` | boolean | ❌ | true / false |
| `reactions` | boolean | ❌ | true / false |
| `comments` | boolean | ❌ | true / false |
| `follows` | boolean | ❌ | true / false |

**Response:** `{ message: "Notification settings updated successfully", settings: { messages, reactions, comments, follows } }`

---

### `POST /signout`
**Schema:** No body required.
**Response:** `{ message: "User logout successfully", user: {}, token: "" }`

---

## 10. Understanding the Test File

New patterns in this lecture:

**Capturing state in `beforeAll`:**
```ts
originalWork = currentRes.data.user.work ?? '';
```
The `?? ''` handles the case where `work` is `null` in the database (possible for older accounts).

**Restoring state in `afterAll`:**
```ts
await axios.put(basicInfoUrl, { work: originalWork, quote: originalQuote }, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
```

**Testing signout invalidates the session:**
```ts
// Sign out
await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, ... });

// Prove it — same cookie now gets 401
const postSignoutRes = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(postSignoutRes.status).toBe(401);
```

---

## 11. Running the Tests

**Your `.env` needs:**
```
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=vitestuser      ← must be YOUR unique account
TEST_PASSWORD=TestUser!234
```

> **Important — do not share your test account with other students.**
>
> Lecture 4 modifies the profile of `TEST_USERNAME` (work, quote, notifications).
> If two students use the same account simultaneously, their `beforeAll`/`afterAll`
> will overwrite each other's changes and tests will fail unpredictably.
>
> Each student must have their own unique `vitest*` account.

```bash
npm test tests/lecture-04/lecture.test.ts
```

**Expected output:**
```
✓ 1. Current user > status is 200
✓ 1. Current user > isUser is true
✓ 1. Current user > token is present
✓ 1. Current user > user object has expected fields
✓ 2. Session token > status is 200
✓ 2. Session token > returns a token string
✓ 2. Session token > token matches the signin token
✓ 3. Update basic info > status is 200
✓ 3. Update basic info > message is "Updated successfully"
✓ 4. State verification > GET /currentuser reflects updated work field
✓ 4. State verification > GET /currentuser reflects updated quote field
✓ 5. Update notification settings > status is 200
✓ 5. Update notification settings > settings in response match what was sent
✓ 5. Update notification settings > reactions is false after update
✓ 6. Negative tests > no cookie returns 401 on /currentuser
✓ 6. Negative tests > no cookie returns 401 on /session-token
✓ 7. Signout > status is 200
✓ 7. Signout > message is "User logout successfully"
✓ 7. Signout > session is invalidated — subsequent request returns 401

Test Files  1 passed (1)
Tests  19 passed (19)
```

---

## 12. Git

```bash
# Stage the files for this lecture
git add tests/lecture-04/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-04: current user, profile update, signout, state verification"

# Push the branch to GitHub
git push -u origin lecture-04-current-user
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-04: current user, profile update, signout, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-05-posts
```


## Key Takeaways

By the end of this lecture you have:

- ✅ `GET /currentuser` returns `{ token, isUser, user }` — different from signin's `{ message, token, user }`
- ✅ **State verification pattern** — PUT then GET confirms the change was saved
- ✅ Redis + Queue: updates are immediately visible in GET (no need to wait)
- ✅ `afterAll` restores original values AND signs out — leaving the account clean
- ✅ Signout invalidates the session — same cookie returns 401 afterwards
- ✅ Every authenticated endpoint returns 401 without a valid cookie

**What's next:** Lecture 5 applies the state verification pattern to Posts. You will create, read, update, delete, and verify a post — your first full CRUD test cycle.

---

## Homework

Open `tests/lecture-04/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-04/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Multiple assertions — status 200, `isUser`, `_id`, no password |
| 2 | `toMatchObject` + JWT format on the same response |
| 3 | State verification — PATCH then GET, find by `_id` |
| 4 | Negative — PUT without cookie → 401 |
| 5 | `.then()` style — `isUser` + `token` type on `GET /currentuser` |
| 6 | `toBeGreaterThanOrEqual(0)` — assert postsCount and followersCount are non-negative |
| 7 | `toBeTruthy` — assert username is a non-empty truthy value |

```bash
npm test tests/lecture-04/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.

---

# Lecture 05 — Posts: Full CRUD Flow

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 4 — `GET /currentuser`, profile updates, state verification (PUT then GET), signout.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-05/lecture.test.ts
> npm test tests/lecture-05/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post` — create a plain text post (status 201)
- Why the create response does NOT return the post ID — and how to find it
- `GET /post/all/:page` — paginated post list, reading from Redis cache
- **The CRUD pattern**: Create → Read → Update → Read again → Delete → Verify
- `PATCH /post/:postId` — updating a post (only the owner can do it)
- `DELETE /post/:postId` — deleting a post (owner-only)
- **ObjectId validation** — what happens with an invalid MongoDB ID in the URL
- Reactions object shape — all 6 types at zero on creation
- How to clean up a post in `afterAll` if the delete test fails
- Postman — the full CRUD flow chained in Collection Runner order
- Advanced assertion variants — `expect.arrayContaining` for array subsets, `toBeLessThanOrEqual` for page size bounds, `toBeTypeOf` for type checking

> **Reference Topics**
> - How pagination works in Chatty → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - MongoDB ObjectId format → [`docs/topics/mongodb.md`](../../docs/topics/mongodb.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | The Post Endpoints |
| 2 | The Create Response Has No ID |
| 3 | Pagination — `GET /post/all/:page` |
| 4 | Update — Owner Only |
| 5 | ObjectId Validation |
| 6 | Cleanup Strategy — `postDeleted` flag |
| 7 | Postman — Full CRUD Flow |
| 8 | Endpoint Schema & Validation Rules |
| 9 | Shared Utilities & `validateStatus` Reminder |
| 10 | Running the Tests |
| 11 | Git |

---

## 1. The Post Endpoints

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| POST | `/post` | ✅ | `{ message: "Post created successfully" }` — **no ID** |
| GET | `/post/all/:page` | ✅ | `{ message, posts: [...], totalPosts }` |
| PATCH | `/post/:postId` | ✅ (owner only) | `{ message: "Post updated successfully" }` |
| DELETE | `/post/:postId` | ✅ (owner only) | `{ message: "Post deleted successfully" }` |

---

## 2. The Create Response Has No ID

This is the most important concept in this lecture.

When you call `POST /post`, the server generates a new `ObjectId` internally and saves
the post to Redis + queues a DB write. But the response is simply:

```json
Status: 201
{ "message": "Post created successfully" }
```

**There is no `_id` in the create response.**

This is a real-world API design pattern — some APIs return the created resource,
some return only a success message.

**How to get the post ID for subsequent tests:**

Create the post with a unique, identifiable content. Then call `GET /post/all/1`
and find your post by its content:

```ts
const uniqueContent = `Vitest lecture-05 post ${Date.now()}`;

// 1. Create
await axios.post(postUrl, { post: uniqueContent, ... }, { headers: { Cookie: sessionCookie }, ... });

// 2. Find in the list
const getRes = await axios.get(`${BASE_URL}/post/all/1`, { headers: { Cookie: sessionCookie }, ... });
const found = getRes.data.posts.find((p: any) => p.post === uniqueContent);
postId = found?._id ?? '';
```

Why does this work immediately?
The server saves to Redis **synchronously** before responding. `GET /post/all/1`
reads from Redis. So the post is available right away — no need to wait.

---

## 3. Pagination — `GET /post/all/:page`

The `:page` parameter is a page number, not a skip count.

| Page | Posts returned |
|------|---------------|
| 1 | posts 1–10 (newest first) |
| 2 | posts 11–20 |
| 3 | posts 21–30 |

Page size is hardcoded to 10 in the controller.

**Response shape:**

```json
{
  "message": "All posts",
  "posts": [
    {
      "_id": "...",
      "userId": "...",
      "username": "Vitestuser",
      "email": "...",
      "avatarColor": "#4a90e2",
      "profilePicture": "https://res.cloudinary.com/...",
      "post": "Hello from Vitest!",
      "bgColor": "#ffffff",
      "feelings": "",
      "privacy": "Public",
      "gifUrl": "",
      "commentsCount": 0,
      "imgVersion": "",
      "imgId": "",
      "videoId": "",
      "videoVersion": "",
      "createdAt": "2026-04-17T...",
      "reactions": {
        "like": 0, "love": 0, "happy": 0,
        "sad": 0, "wow": 0, "angry": 0
      }
    }
  ],
  "totalPosts": 42
}
```

---

## 4. Update — Owner Only

`PATCH /post/:postId` checks ownership via Redis:

```ts
const cachedOwnerId = await postCache.getPostOwnerFromCache(postId);
if (cachedOwnerId && cachedOwnerId !== req.currentUser.userId) {
  throw new NotAuthorizedError('Not authorized to update this post');
}
```

If the post belongs to a different user → `403 Forbidden`.
If the post is not in Redis (old post, cache expired) → ownership check is skipped.

Like `basic-info` in Lecture 4, the response is just `{ message: "Post updated successfully" }`.
You must call `GET /post/all/1` to verify the update persisted.

---

## 5. ObjectId Validation

Post endpoints with `:postId` params have an `validateObjectId` middleware.

A valid MongoDB ObjectId is a 24-character hex string: `507f1f77bcf86cd799439011`

If you pass an invalid value:
```bash
PATCH /post/not-a-valid-id  → 400 Bad Request
```

This is tested in section 5 (negative tests).

---

## 6. Cleanup Strategy

The delete test in section 6 deletes the post. But what if the delete test fails?
The post would remain in the database.

Solution: **track whether deletion happened, clean up in `afterAll` if not:**

```ts
let postDeleted = false;

// In section 6:
const deleteRes = await axios.delete(...);
if (deleteRes.status === 200) postDeleted = true;

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});
```

---

## 7. Postman — Full CRUD Flow

Create folder **Lecture 05** in **Chatty API** collection.

### Request 1 — Create Post

- Method: `POST`, URL: `{{base_url}}/post`
- Body:
```json
{
  "post": "My first Postman post!",
  "bgColor": "#ffffff",
  "privacy": "Public",
  "feelings": ""
}
```

**Tests tab:**
```js
pm.test('Status is 201', () => pm.response.to.have.status(201));
pm.test('Message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('Post created successfully');
});
// Note: no post ID in the response — we get it from the GET request
```

### Request 2 — Get Posts (find the ID)

- Method: `GET`, URL: `{{base_url}}/post/all/1`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Posts array is not empty', () => {
  pm.expect(pm.response.json().posts).to.be.an('array').with.lengthOf.at.least(1);
});

// Find our post and save its ID
const posts = pm.response.json().posts;
const myPost = posts.find(p => p.post === 'My first Postman post!');
if (myPost) {
  pm.environment.set('postId', myPost._id);
  pm.test('Our post was found in the list', () => {
    pm.expect(myPost.post).to.eql('My first Postman post!');
  });
}
```

### Request 3 — Update Post

- Method: `PATCH`, URL: `{{base_url}}/post/{{postId}}`
- Body:
```json
{
  "post": "Updated post content",
  "bgColor": "#ffffff",
  "privacy": "Public",
  "feelings": ""
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Post updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post updated successfully');
});
```

### Request 4 — Verify Update

Duplicate Request 2 → rename to **L05 — Verify Update**.

**Tests tab:**
```js
const posts = pm.response.json().posts;
const updated = posts.find(p => p._id === pm.environment.get('postId'));
pm.test('Post content was updated', () => {
  pm.expect(updated.post).to.eql('Updated post content');
});
```

### Request 5 — Delete Post

- Method: `DELETE`, URL: `{{base_url}}/post/{{postId}}`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Post deleted successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post deleted successfully');
});
```

### Stretch — Run in Collection Runner order
Create → Get (find ID) → Update → Verify Update → Delete

---

## 8. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**Endpoint:** `POST /api/v1/post`
**Schema file:** `chatty-backend/src/features/post/schemas/post.schemes.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `post` | string | ❌ | Post text content |
| `bgColor` | string | ❌ | Background colour hex |
| `privacy` | string | ❌ | `"Public"`, `"Private"`, etc. |
| `feelings` | string | ❌ | Emoji/feeling string |
| `gifUrl` | string | ❌ | GIF URL |
| `profilePicture` | string | ❌ | User's profile picture URL |

> **All fields are optional.** An empty body `{}` is valid and creates an empty post.
> The minimum useful post includes at least `post` (the text content).

**Boundary values:**
There are no min/max length constraints on post text. The interesting boundaries are:

| Input | Expected |
|-------|----------|
| Empty body `{}` | 201 — empty post created |
| No cookie | 401 — Unauthorized |
| Invalid `postId` (e.g. `"abc"`) in URL | 400 — ObjectId validation fails |
| Valid `postId` that doesn't exist | 404 or 200 (cache miss) |

---

## 9. Shared Utilities & `validateStatus` Reminder

Every test file in this course uses two patterns — brief reminder if you are starting here:

**`validateStatus: () => true`** — always required on every Axios request in tests.
Without it, Axios throws on 4xx/5xx and your `expect()` never runs.

```ts
// ✅ Always do this
const res = await axios.post(url, data, { validateStatus: () => true });

// ✗ Axios throws on 400/401/404 — test crashes
const res = await axios.post(url, data);
```

**Imports for this lecture:**

```ts
import { config } from '../../src/config';
// No expectRejected needed — post endpoints are not rate-limited at the same level as auth
```

> Rate limiting note: `/signin` and `/signup` are rate-limited at 5 req/min (auth zone).
> Post endpoints use the general API zone (30 req/s) — much more generous.
> You can run post boundary tests without hitting 429.

---

## 10. Running the Tests

```bash
npm test tests/lecture-05/lecture.test.ts
```

**Expected output:**
```
✓ 1. Create post > status is 201
✓ 1. Create post > message is "Post created successfully"
✓ 1. Create post > no post ID in response (by design)
✓ 2. Find the created post > posts array exists
✓ 2. Find the created post > our post appears in the list
✓ 2. Find the created post > post has correct structure
✓ 2. Find the created post > reactions all start at 0
✓ 3. Update post > status is 200
✓ 3. Update post > message is "Post updated successfully"
✓ 4. State verification > updated content is in GET response
✓ 5. Negative tests > no cookie returns 401
✓ 5. Negative tests > invalid postId format returns 400
✓ 6. Delete post > status is 200
✓ 6. Delete post > message is "Post deleted successfully"
✓ 6. Delete post > post is no longer in GET response

Test Files  1 passed (1)
Tests  15 passed (15)
```

---

## 11. Git

```bash
# Stage the files for this lecture
git add tests/lecture-05/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-05: posts CRUD — create, get, update, delete, state verification"

# Push the branch to GitHub
git push -u origin lecture-05-posts
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-05: posts CRUD — create, get, update, delete, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-06-reactions
```


## Key Takeaways

By the end of this lecture you have:

- ✅ Full CRUD cycle: Create → Read → Update → Verify → Delete → Verify
- ✅ `POST /post` returns no ID — always GET to find it by unique content
- ✅ State verification: PATCH then GET, find by `_id` (not content — content changed!)
- ✅ `postDeleted` flag — conditional cleanup in `afterAll` prevents orphaned data
- ✅ ObjectId format matters — invalid ID → 400 before the controller even runs
- ✅ Post endpoints (30 req/s limit) are less rate-sensitive than auth endpoints (5 req/min)

**What's next:** Lecture 6 adds reactions to posts. You will build on `postId` from this lecture — the dependency chain is: create post → add reaction → verify → remove reaction.

---

## Homework

Open `tests/lecture-05/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-05/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | GET response shape — `posts` array, `totalPosts` count |
| 2 | Find post in list by content — `reactions.like === 0` |
| 3 | PATCH + GET — state verification, find by `_id` |
| 4 | Negative — POST without cookie → 401 |
| 5 | DELETE → set `postDeleted = true` → verify `find()` returns `undefined` |
| 6 | `expect.arrayContaining` — assert posts array contains objects with `_id` |
| 7 | `toBeLessThanOrEqual(10)` — assert page size never exceeds 10 |

```bash
npm test tests/lecture-05/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.

---

# Lecture 06 — Reactions: All Types & State Transitions

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 5 — full CRUD for posts, find post ID via GET, `postDeleted` flag.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-06/lecture.test.ts
> npm test tests/lecture-06/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/reaction` — add a reaction with `userTo`, `postId`, `type`
- The 6 reaction types: `like`, `love`, `happy`, `sad`, `wow`, `angry`
- `GET /post/reactions/:postId` — get all reactions + count
- `GET /post/single/reaction/username/:username/:postId` — get a specific user's reaction
- `DELETE /post/reaction/:postId/:previousReaction/:postReactions` — the unusual URL param format
- How `postReactions` is passed as URL-encoded JSON — `encodeURIComponent(JSON.stringify(...))`
- State transitions: adding replaces previous reaction, removing sets count back to 0
- `GET /post/reactions/username/:username` — all reactions by a user
- Advanced assertion variants — `expect.stringContaining` as asymmetric matcher, `toBeTypeOf` for ID type checking, `toBeGreaterThanOrEqual` for counts

> **Reference Topics**
> - Why encodeURIComponent(JSON.stringify(...)) is needed → [`docs/topics/url-encoding.md`](../../docs/topics/url-encoding.md)
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | The Reaction Endpoints |
| 2 | Reaction Types |
| 3 | The Unusual DELETE URL Format |
| 4 | Lifecycle — Post + React + Verify + Remove |
| 5 | `userTo` — Who Is the Notification Sent To? |
| 6 | Postman — Reaction Flow |
| 7 | Endpoint Schema & Validation Rules |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. The Reaction Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/reaction` | `{ message: "Reaction added successfully" }` |
| GET | `/post/reactions/:postId` | `{ message, reactions: [...], count }` |
| GET | `/post/single/reaction/username/:username/:postId` | `{ message, reactions: {} or doc, count }` |
| GET | `/post/reactions/username/:username` | `{ message, reactions: [...] }` |
| DELETE | `/post/reaction/:postId/:previousReaction/:postReactions` | `{ message: "Reaction removed from post" }` |

---

## 2. `count` vs `reactions` — Two Different Things

`GET /post/reactions/:postId` returns:
```json
{ "message": "Post reactions", "reactions": [...], "count": 1 }
```

| Field | Type | What it is |
|-------|------|-----------|
| `reactions` | array | Individual reaction documents — each has `type`, `username`, `avatarColor`, `postId` |
| `count` | number | Total number of reactions across all types |

You need `reactions` when you want to see WHO reacted and with WHAT type.
You need `count` when you just want HOW MANY total reactions a post has.

---

## 3. Reaction Types

The Chatty API supports 6 reaction types. All start at 0 on a new post:

```ts
type ReactionType = 'like' | 'love' | 'happy' | 'sad' | 'wow' | 'angry';
```

When you add a `like` reaction, the post's reactions object becomes:
```json
{ "like": 1, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 }
```

---

## 3. The Unusual DELETE URL Format

The DELETE endpoint is the most interesting in this lecture:

```
DELETE /post/reaction/:postId/:previousReaction/:postReactions
```

The `:postReactions` parameter is the **full reactions object serialised as URL-encoded JSON**.

Why? The server needs to know the current reaction counts to update Redis atomically when removing a reaction.

```ts
// After adding a 'like', postReactions = { like: 1, love: 0, ... }
const encoded = encodeURIComponent(JSON.stringify({ like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }));

await axios.delete(
  `${config.BASE_URL}/post/reaction/${postId}/like/${encoded}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
```

**`encodeURIComponent`** converts `{` `}` `:` `"` to `%7B` `%7D` `%3A` `%22` etc. so they are safe in a URL path.

On the server side, the controller calls `JSON.parse(postReactions)` to get the object back.

---

## 4. Lifecycle

```
beforeAll:
  1. Sign in → cookie
  2. Create test post → postId + userId (post owner)

tests:
  3. Add 'like' reaction
  4. GET reactions → verify count = 1
  5. GET single reaction by username → verify type = 'like'
  6. Remove reaction
  7. GET reactions → verify count = 0

afterAll:
  8. Delete test post
  9. Sign out
```

---

## 5. `userTo` — Who Receives the Notification

When adding a reaction, `userTo` is the **User document `_id`** of the post owner.
The server sends a notification to that user.

In tests, we get `userId` from the post object after creating it:

```ts
const getRes = await axios.get(`${config.BASE_URL}/post/all/1`, ...);
const post = getRes.data.posts.find((p: any) => p._id === postId);
postOwnerUserId = post.userId;  // used as 'userTo' in the reaction body
```

---

## 6. Postman — Reaction Flow

Create folder **Lecture 06** in **Chatty API**.

> **Prerequisites:** You need `{{postId}}` and `{{postOwnerUserId}}` from a post you created.
> Run the Lecture 05 Collection Runner first (it saves `postId`), or manually create a post
> and set `postOwnerUserId` = the `userId` field from `GET /post/all/1`.

### Request 1 — Add Reaction
- Method: `POST`, URL: `{{base_url}}/post/reaction`
- Body:
```json
{
  "userTo": "{{postOwnerUserId}}",
  "postId": "{{postId}}",
  "type": "like",
  "previousReaction": "",
  "postReactions": { "like": 0, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 },
  "profilePicture": ""
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Reaction added', () => {
  pm.expect(pm.response.json().message).to.eql('Reaction added successfully');
});
```

### Request 2 — Get Reactions
- Method: `GET`, URL: `{{base_url}}/post/reactions/{{postId}}`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Count is 1 after adding like', () => {
  pm.expect(pm.response.json().count).to.eql(1);
});
```

### Request 3 — Remove Reaction
- Method: `DELETE`
- URL: `{{base_url}}/post/reaction/{{postId}}/like/%7B%22like%22%3A1%2C%22love%22%3A0%2C%22happy%22%3A0%2C%22sad%22%3A0%2C%22wow%22%3A0%2C%22angry%22%3A0%7D`

(The encoded JSON `{"like":1,"love":0,"happy":0,"sad":0,"wow":0,"angry":0}`)

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Reaction removed', () => {
  pm.expect(pm.response.json().message).to.eql('Reaction removed from post');
});
```

---

## 7. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/reaction`**
**Schema:** `chatty-backend/src/features/reactions/schemes/reactions.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userTo` | string | ✅ | User `_id` of post owner |
| `postId` | string | ✅ | Post `_id` |
| `type` | string | ✅ | One of: `like`, `love`, `happy`, `sad`, `wow`, `angry` |
| `previousReaction` | string | ❌ | Previous type (for switching reactions) |
| `postReactions` | object | ❌ | Current reaction counts `{ like: 0, ... }` |
| `profilePicture` | string | ❌ | Reactor's profile picture |

**Switching reactions with `previousReaction`:**

If a user already reacted with `"like"` and now wants to react with `"love"`,
send `previousReaction: "like"` and `type: "love"`. The server removes the old
reaction and adds the new one atomically in Redis.
If this is the user's first reaction, send `previousReaction: ""` (empty string).

**`DELETE /post/reaction/:postId/:previousReaction/:postReactions`**

All three are URL path params:
- `:postId` — valid MongoDB ObjectId
- `:previousReaction` — string (`"like"`, `"love"`, etc.)
- `:postReactions` — URL-encoded JSON of current reaction counts

---

## 8. Running the Tests

```bash
npm test tests/lecture-06/lecture.test.ts
```

---

## Key Takeaways

- ✅ Reactions use `userTo` (post owner's `_id`) + `postId` + `type`
- ✅ The DELETE URL has URL-encoded JSON as a path param — use `encodeURIComponent(JSON.stringify(...))`
- ✅ State verification: add reaction → GET count increases → remove → GET count decreases
- ✅ `GET /post/single/reaction/username/:username/:postId` returns your specific reaction

**What's next:** Lecture 7 adds comments to posts — the same POST-then-GET-to-find-ID pattern, but with comment CRUD including an update (PATCH).

---

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-06/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-06: reaction tests — add, get, remove, URL-encoded params"

# Push the branch to GitHub
git push -u origin lecture-06-reactions
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-06: reaction tests — add, get, remove, URL-encoded params`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-07-comments
```


## Homework

Open `tests/lecture-06/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-06/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Add 'love' reaction — status 200, message |
| 2 | GET reactions — count > 0, type in reactions array |
| 3 | GET single reaction by username — verify type |
| 4 | Remove reaction — `encodeURIComponent` URL param |
| 5 | `.then()` — verify count is 0 after removal |
| 6 | `expect.stringContaining` — assert response message contains `'successfully'` |
| 7 | `toBeTypeOf('string')` — assert comment `_id` is a string |

```bash
npm test tests/lecture-06/homework/starter.test.ts
```

Goal: **7 tests passing.**

---

# Lecture 07 — Comments: Full CRUD + Nested Queries

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 6 — reactions, URL-encoded JSON params, state transitions.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-07/lecture.test.ts
> npm test tests/lecture-07/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/comment` — add a comment (returns 200, NOT 201, and no commentId!)
- How to find the `commentId` after creation — same GET-then-find pattern as posts
- `GET /post/comments/:postId` — all comments for a post
- `GET /post/commentsnames/:postId` — just the usernames who commented
- `GET /post/single/comment/:postId/:commentId` — one specific comment
- `PATCH /post/comment/:postId/:commentId` — update comment text
- `DELETE /post/comment/:postId/:commentId` — delete a comment
- The `userTo` pattern — always the post owner's userId
- Advanced assertion variants — `expect.arrayContaining` for reaction arrays, `toMatch(/regex/)` for ObjectId validation, `toSatisfy(fn)` for custom predicates

> **Reference Topics**
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - beforeAll / afterAll lifecycle → [`docs/topics/test-lifecycle.md`](../../docs/topics/test-lifecycle.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Comment Endpoints |
| 2 | POST Returns 200 (Not 201) and No ID |
| 3 | Finding the commentId |
| 4 | `userTo` in Comment Body |
| 5 | Postman — Comment CRUD Flow |
| 6 | Endpoint Schema |
| 7 | Understanding the Test File |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Comment Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/comment` | `{ message: "Comment created successfully" }` — 200, no ID |
| GET | `/post/comments/:postId` | `{ message, comments: [...] }` |
| GET | `/post/commentsnames/:postId` | `{ message, comments: [{username, avatarColor}] }` |
| GET | `/post/single/comment/:postId/:commentId` | `{ message, comments: singleDoc }` |
| PATCH | `/post/comment/:postId/:commentId` | `{ message: "Comment updated successfully" }` |
| DELETE | `/post/comment/:postId/:commentId` | `{ message: "Comment deleted successfully" }` |

---

## 2. POST Returns 200 (Not 201)

Unlike `POST /post` (which returns 201), `POST /post/comment` returns **200**.

This is an intentional difference in the API design — comments are treated as actions on an existing resource rather than new top-level resources.

There is also **no commentId** in the response. Same pattern as posts — GET after POST.

---

## 3. Finding the commentId

After adding a comment, call `GET /post/comments/:postId` and find your comment by content:

```ts
const getRes = await axios.get(`${BASE_URL}/post/comments/${postId}`, ...);
const found = getRes.data.comments?.find(
  (c: { comment: string; _id: string }) => c.comment === UNIQUE_COMMENT
);
commentId = found?._id ?? '';
```

---

## 4. `userTo` in Comment Body

Same as reactions — `userTo` is the post owner's userId. It routes the notification.

```ts
{
  userTo: postOwnerUserId,  // post owner's _id
  postId: postId,
  comment: 'My test comment',
  profilePicture: ''
}
```

---

## 5. Postman — Comment CRUD Flow

Create folder **Lecture 07**. Requires `{{postId}}` and `{{postOwnerUserId}}` from Lecture 05.

### Create Comment
- POST `{{base_url}}/post/comment`
- Body: `{ "userTo": "{{postOwnerUserId}}", "postId": "{{postId}}", "comment": "My Postman comment", "profilePicture": "" }`

**Tests tab:**
```js
pm.test('Status 200 (not 201)', () => pm.response.to.have.status(200));
pm.test('Message correct', () => pm.expect(pm.response.json().message).to.eql('Comment created successfully'));
pm.test('No _id in response', () => pm.expect(pm.response.json()).to.not.have.property('_id'));
```

### Get Comments (find ID)
- GET `{{base_url}}/post/comments/{{postId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
const found = pm.response.json().comments.find(c => c.comment === 'My Postman comment');
if (found) pm.environment.set('commentId', found._id);
pm.test('Comment found', () => pm.expect(found).to.not.be.undefined);
```

### Get Comment Names
- GET `{{base_url}}/post/commentsnames/{{postId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Has comments array', () => pm.expect(pm.response.json().comments).to.be.an('array'));
```

### Update Comment
- PATCH `{{base_url}}/post/comment/{{postId}}/{{commentId}}`
- Body: `{ "comment": "Updated comment" }`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
```

### Delete Comment
- DELETE `{{base_url}}/post/comment/{{postId}}/{{commentId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Deleted message', () => pm.expect(pm.response.json().message).to.eql('Comment deleted successfully'));
```

---

## 6. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/comment`** — `chatty-backend/src/features/comments/schemes/comment.ts`

| Field | Type | Required |
|-------|------|----------|
| `userTo` | string | ✅ |
| `postId` | string | ✅ |
| `comment` | string | ✅ |
| `profilePicture` | string | ❌ |

**`PATCH /post/comment/:postId/:commentId`** — `updateCommentSchema`

| Field | Type | Required |
|-------|------|----------|
| `comment` | string | ✅ |

---

## 7. Understanding the Test File

Open `tests/lecture-07/lecture.test.ts` — new patterns used here:

**The CRUD execution order:**

```
beforeAll:
  1. Sign in → cookie
  2. Create a test post → find postId and postOwnerUserId
  3. Add a test comment → find commentId via GET

Section 1: Verify add comment (POST returns 200, no _id)
Section 2: Verify GET comments (find by content, structure)
Section 3: Verify GET commentsnames (username list)
Section 4: GET single comment by postId + commentId
Section 5: PATCH comment → update text
Section 6: State verification — GET single reflects updated text
Section 7: DELETE comment → commentDeleted = true
Section 8: Negative tests — no cookie, invalid ObjectId

afterAll:
  - Clean up if delete test failed (commentDeleted flag)
  - Delete test post
  - Sign out
```

**The `commentDeleted` flag** — same pattern as `postDeleted` from Lecture 5:

```ts
let commentDeleted = false;

// In section 7:
const res = await axios.delete(commentById(postId, commentId), ...);
if (res.status === 200) commentDeleted = true;

// In afterAll:
if (!commentDeleted && commentId) {
  await axios.delete(commentById(postId, commentId), ...);
}
```

**Why cleanup is nested** — the test file cleans up in this order:
1. Comment (if not deleted by tests)
2. Post (always — the post was created for this lecture)
3. Sign out

**The `singleComment` response quirk:**

```ts
// GET /post/single/comment/:postId/:commentId returns:
{ message: 'Single comment', comments: commentDocument }
//                           ^^^^^^^
// 'comments' key returns a single object, not an array
// Access it as: res.data.comments.comment
```

---

## Key Takeaways

- ✅ `POST /post/comment` returns 200 (not 201) — API design choice
- ✅ No commentId in response — GET then find by content
- ✅ Full CRUD: add → get → get single → update → verify → delete → verify
- ✅ `commentsnames` endpoint gives just usernames — useful for "X people commented"
- ✅ Both `postId` AND `commentId` are required in PATCH/DELETE URL
- ✅ `res.data.comments` returns a **single object** in `GET /single/comment` — not an array

**What's next:** Lecture 8 covers user profile search and social links — GET-heavy lecture, less complex setup.

---

## 8. Running the Tests


```bash
npm test tests/lecture-07/lecture.test.ts
```

**Expected output:**
```
✓ 1. Add comment > POST /post/comment returns 200 (not 201)
✓ 1. Add comment > message is "Comment created successfully"
✓ 1. Add comment > response does NOT contain a commentId
✓ 2. Get comments > status is 200
✓ 2. Get comments > comments array is non-empty
✓ 2. Get comments > our comment is in the list
✓ 3. Get comment names > GET /post/commentsnames/:postId returns 200
✓ 3. Get comment names > returns username list
✓ 4. Get single comment > GET /post/single/comment/:postId/:commentId returns 200
✓ 4. Get single comment > returns the specific comment content
✓ 5. Update comment > PATCH returns 200
✓ 6. State verification after update > GET single comment reflects updated text
✓ 7. Delete comment > DELETE returns 200
✓ 7. Delete comment > message is "Comment deleted successfully"
✓ 8. Negative tests > POST /post/comment without cookie returns 401
✓ 8. Negative tests > PATCH with invalid commentId returns 400

Test Files  1 passed (1)
Tests  16 passed (16)
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `commentId` is empty string | Comment wasn't found in GET after POST | Check POST succeeded (status 200) first |
| `GET single comment` returns empty `comments` | commentId not in Redis yet | Small timing issue — Redis is usually immediate |
| `PATCH with invalid commentId` fails with wrong status | ObjectId validation format changed | Check `validateObjectId` middleware is in routes |

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-07/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-07: comment CRUD — add, get, update, delete, state verification"

# Push the branch to GitHub
git push -u origin lecture-07-comments
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-07: comment CRUD — add, get, update, delete, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-08-user-profile
```


## Homework

Open `tests/lecture-07/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Add comment → status 200, message |
| 2 | GET comments → find by content, verify structure |
| 3 | PATCH + GET single → state verification |
| 4 | DELETE → verify `find()` returns undefined |
| 5 | `.then()` — GET commentsnames → username in list |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` — assert postId is a valid MongoDB ObjectId |
| 7 | `toSatisfy` — assert reaction count is non-negative with custom predicate |

```bash
npm test tests/lecture-07/homework/starter.test.ts
```

Goal: **7 tests passing.**

---

# Lecture 08 — User Profile: Search, Social Links & Password

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 7 — comment CRUD, GET-then-find pattern for IDs.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-08/lecture.test.ts
> npm test tests/lecture-08/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /user/all/:page` — paginated list of all users (12 per page)
- `GET /user/profile/search/:query` — search users by username (regex, case-insensitive)
- `PUT /user/profile/social-links` — update Facebook, Instagram, Twitter, YouTube
- State verification: PUT social links → GET /currentuser → confirm update
- `PUT /user/profile/change-password` — the password schema constraints (min 4, max 8 — unusual!)
- Testing validation errors without actually changing the password
- Why we only test the **error cases** for change-password in tests
- Advanced assertion variants — `toBeGreaterThanOrEqual` for follower counts, `expect.arrayContaining` for user lists, `toBeTruthy` for non-empty usernames

> **Reference Topics**
> - Two-user test pattern → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | Get All Users — Paginated List |
| 3 | Search Users — Regex Query |
| 4 | Social Links Update |
| 5 | Change Password — Schema and Why We Test Errors Only |
| 6 | Postman |
| 7 | Endpoint Schema |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/user/all/:page` | `{ message, users: [...], totalUsers, followers }` |
| GET | `/user/profile/search/:query` | `{ message: "Search results", search: [...] }` |
| PUT | `/user/profile/social-links` | `{ message: "Updated successfully" }` |
| PUT | `/user/profile/change-password` | `{ message: "Password updated successfully..." }` |

---

## 2. Get All Users

Page size is 12 (different from posts which uses 10).

```ts
const res = await axios.get(`${config.BASE_URL}/user/all/1`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'Get users', users: [...], totalUsers: N, followers: [...] }
```

The response includes **followers** — a list of users that the current user is following.
This is bundled in the response for efficiency.

---

## 3. Search Users

```ts
const res = await axios.get(`${config.BASE_URL}/user/profile/search/vitest`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'Search results', search: [{_id, username, email, profilePicture, avatarColor}] }
```

The search is case-insensitive and uses a regex. Searching `"vitest"` will match
`vitestuser`, `Vitestuser`, `VITESTUSER`, etc.

**Encoding the query:** If the search term contains spaces or special URL characters,
wrap it in `encodeURIComponent()`. For plain usernames like `"vitest"` it is not needed,
but the test file always uses it as a safe habit:
```ts
const res = await axios.get(`${config.BASE_URL}/user/profile/search/${encodeURIComponent('vitest')}`, ...);
```

**The `followers` field in `/user/all/1`:** The response bundles users the current user follows
alongside the user list — same page, no extra request. Page size is 12 (not 10 like posts).

---

## 4. Social Links

All 4 social link fields are optional strings. Send any combination:

```ts
await axios.put(`${config.BASE_URL}/user/profile/social-links`, {
  facebook: 'https://facebook.com/vitest',
  instagram: '',
  twitter: 'https://twitter.com/vitest',
  youtube: '',
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

State verification: call `GET /currentuser` and check `user.social.twitter`.

---

## 5. Change Password — Why We Only Test Errors

The change-password schema has an unusual constraint:

```ts
// chatty-backend/src/features/user/schemes/info.ts
currentPassword: Joi.string().required().min(4).max(8)
newPassword: Joi.string().required().min(4).max(8)
```

**min 4, max 8 characters.** This is shorter than the signup password minimum (12 chars).

This creates a problem: if your test account has a password longer than 8 characters
(e.g. `TestUser!234`), the Joi validation will **reject** the current password immediately
with `'Password should have a maximum length of 8'`.

**What we test:**
- Empty body → 400
- Mismatched `newPassword` and `confirmPassword` → 400

**What we do NOT test:**
- Actually changing the password — this would require knowing the exact password,
  which must be ≤ 8 chars, and it permanently changes the account.

This is a real-world lesson: sometimes you test a subset of an endpoint's behaviour
because full testing would have undesirable side effects.

---

## 6. Postman

Create folder **Lecture 08**.

### Search users
- GET `{{base_url}}/user/profile/search/vitest`
- Assert: status 200, `search` is an array

### Get all users
- GET `{{base_url}}/user/all/1`
- Assert: status 200, `users` is array, `totalUsers` > 0

### Update social links
- PUT `{{base_url}}/user/profile/social-links`
- Body: `{ "facebook": "https://facebook.com/test", "instagram": "", "twitter": "", "youtube": "" }`
- Assert: status 200, message "Updated successfully"

### Verify via currentuser
- GET `{{base_url}}/currentuser`
- Assert: `user.social.facebook === "https://facebook.com/test"`

---

## 7. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`PUT /user/profile/social-links`** — all optional strings:
| Field | Type | Required |
|-------|------|----------|
| `facebook` | string | ❌ |
| `instagram` | string | ❌ |
| `twitter` | string | ❌ |
| `youtube` | string | ❌ |

**`PUT /user/profile/change-password`** — note the unusual max 8:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `currentPassword` | string | ✅ | min 4, **max 8** |
| `newPassword` | string | ✅ | min 4, **max 8** |
| `confirmPassword` | any | ✅ | must equal newPassword |

---

## Key Takeaways

- ✅ `/user/all/1` includes `followers` bundled in the response — efficiency pattern
- ✅ Search is case-insensitive regex — `"vitest"` matches any capitalisation
- ✅ Social links follow the same PUT then GET verification pattern from L4
- ✅ Change-password has an unusual max 8 constraint — only test validation errors

**What's next:** Lecture 9 — followers and notifications. First lecture that requires two users interacting.

---

## 8. Running the Tests

```bash
npm test tests/lecture-08/lecture.test.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-08/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-08: user profile search, social links, change-password validation"

# Push the branch to GitHub
git push -u origin lecture-08-user-profile
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-08: user profile search, social links, change-password validation`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-09-followers
```


## Homework

Open `tests/lecture-08/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | GET /user/all/1 — `users` array, `totalUsers`, `followers` |
| 2 | Search by username — find TEST_USERNAME in results |
| 3 | PUT social links + GET /currentuser state verification |
| 4 | Change-password empty body → 400 |
| 5 | `.then()` — change-password mismatched passwords → 400 |
| 6 | `toBeGreaterThanOrEqual(0)` — assert follower/following count is non-negative |
| 7 | `toBeTruthy` — assert a username in the followers list is non-empty |

```bash
npm test tests/lecture-08/homework/starter.test.ts
```

Goal: **7 tests passing.**

---

# Lecture 09 — Followers, Blocking & Notifications

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 8 — user profile search, social links, change-password.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-09/lecture.test.ts
> npm test tests/lecture-09/homework/starter.test.ts
> ```

---

## What You Will Learn

- Why this lecture needs **two users** — you cannot follow yourself
- Creating a second test user (user B) dynamically in `beforeAll`
- `PUT /user/follow/:followerId` — follow a user by their User `_id`
- `GET /user/following` — list users the current user follows
- `GET /user/followers/:userId` — list followers of a specific user
- `PUT /user/unfollow/:followeeId/:followerId` — requires BOTH IDs
- `PUT /user/block/:followerId` + `PUT /user/unblock/:followerId`
- `GET /notifications` — user notifications (may be empty)
- `PUT /notification/:notificationId` — mark as read
- `DELETE /notifications/:notificationId` — delete notification
- Advanced assertion variants — `expect.objectContaining` for notification shape, `toBeTypeOf` for ID fields, `toBeTruthy` for non-empty values

> **Reference Topics**
> - Two-user test setup and cleanup → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - beforeAll / afterAll lifecycle → [`docs/topics/test-lifecycle.md`](../../docs/topics/test-lifecycle.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Two Users |
| 2 | Creating User B in `beforeAll` |
| 3 | Follow & Unfollow |
| 4 | Block & Unblock |
| 5 | Notifications |
| 6 | Postman |
| 7 | Endpoint Summary |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Why Two Users

`PUT /user/follow/:followerId` requires a `followerId` — the User `_id` of someone else.
You cannot follow yourself (the server filters it out in the follower service).

Solution: create a second test user (user B) with Faker.js in `beforeAll`.
After all tests, delete user B with the cleanup endpoint.

---

## 2. Creating User B in `beforeAll`

```ts
import { faker } from '@faker-js/faker';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

// In beforeAll:
const userBName = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
  username: userBName,
  email: faker.internet.email().toLowerCase(),
  password: TEST_PASSWORD,
  avatarColor: TEST_AVATAR_COLOR,
  avatarImage: TEST_AVATAR_IMAGE,
}, { validateStatus: () => true });

userBId   = signupRes.data.user?._id ?? '';       // User document _id — used as followerId
userBAuthId = signupRes.data.user?.authId ?? ''; // Auth _id — used for cleanup
```

---

## 3. Follow & Unfollow

**Follow:**
```ts
PUT /user/follow/:followerId
// followerId = userB._id (the User document _id, NOT the Auth _id)
```

**Unfollow:**
```ts
PUT /user/unfollow/:followeeId/:followerId
// followeeId = userB._id (who you are unfollowing)
// followerId = userA._id (you — get from GET /currentuser)
```

You need your own `_id` for unfollow. Get it from `GET /currentuser`:
```ts
const cur = await axios.get(`${config.BASE_URL}/currentuser`, ...);
userAId = cur.data.user._id;
```

**State verification:**
```ts
// After follow:
GET /user/following → verify userB appears in the following list

// After unfollow:
GET /user/following → verify userB is no longer there
```

---

## 4. Block & Unblock

```ts
PUT /user/block/:followerId    // blocks a user
PUT /user/unblock/:followerId  // unblocks a user
```

**What blocking does:**
- Adds the blocked user to your `blocked` array and you to their `blockedBy` array
- Blocked users no longer appear in your suggestions
- Their posts do not appear in your feed
- They cannot follow you while blocked

**Response messages:**
All four endpoints (follow, unfollow, block, unblock) return `{ message: "..." }` with status 200.
The exact messages are short operational confirmations from the queue worker — they vary
and are not important to assert on precisely. Assert `res.status === 200` instead.

---

## 5. Notifications

`GET /notifications` returns all notifications for the current user.
The array may be **empty** if no one has reacted/commented/followed.

```ts
const res = await axios.get(`${config.BASE_URL}/notifications`, ...);
// { message: 'User notifications', notifications: [...] }
// notifications may be []
```

For PATCH and DELETE, you need a `notificationId`. If there are no notifications,
these tests just verify the 400/404 error handling:

```ts
// Test: invalid notificationId returns 400 or 500
PUT /notification/not-an-objectid → 400
```

---

## 6. Postman

Create folder **Lecture 09**. This lecture requires signing in as your test user.

### Follow user
You need user B's `_id`. Either use one you created in L09 tests, or create one via Postman L03 flow.

### Get following
- GET `{{base_url}}/user/following`
- Assert: status 200, `following` is array

### Unfollow (need both IDs)
- PUT `{{base_url}}/user/unfollow/{{userBId}}/{{userAId}}`

---

## 7. Endpoint Summary

| Method | Path | Returns |
|--------|------|---------|
| PUT | `/user/follow/:followerId` | `{ message: ... }` 200 |
| PUT | `/user/unfollow/:followeeId/:followerId` | `{ message: ... }` 200 |
| GET | `/user/following` | `{ message: "User following", following: [...] }` |
| GET | `/user/followers/:userId` | `{ message: "User followers", followers: [...] }` |
| PUT | `/user/block/:followerId` | `{ message: ... }` 200 |
| PUT | `/user/unblock/:followerId` | `{ message: ... }` 200 |
| GET | `/notifications` | `{ message: "User notifications", notifications: [...] }` |
| PUT | `/notification/:notificationId` | `{ message: "Notification marked as read" }` |
| DELETE | `/notifications/:notificationId` | `{ message: "Notification deleted successfully" }` |

---

## Key Takeaways

- ✅ Some tests need **two users** — create user B in `beforeAll`, clean up in `afterAll`
- ✅ Unfollow requires **both** the followeeId and followerId — two ObjectIds in the URL
- ✅ Notifications may be empty — always assert the shape, not a specific count
- ✅ Get your own `_id` from `GET /currentuser` — needed for unfollow and similar endpoints

**What's next:** Lecture 10 — MongoDB direct queries. No more API for this lecture — raw DB access.

---

## 8. Running the Tests

```bash
npm test tests/lecture-09/lecture.test.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-09/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-09: followers, blocking, notifications, two-user scenario"

# Push the branch to GitHub
git push -u origin lecture-09-followers
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-09: followers, blocking, notifications, two-user scenario`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-10-mongodb
```


## Homework

Open `tests/lecture-09/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Follow user B → status 200 |
| 2 | GET /user/following → userB in list |
| 3 | GET /user/followers/:userBId → userA in list |
| 4 | Unfollow user B → verify removed from following |
| 5 | `.then()` — GET /notifications → array |
| 6 | `expect.objectContaining` — assert notification has `_id` and `message` fields |
| 7 | `toBeTypeOf('string')` — assert notification `_id` is a string |

```bash
npm test tests/lecture-09/homework/starter.test.ts
```

Goal: **7 tests passing.**

---

# Lecture 10 — MongoDB: Cross-Validating API vs Database

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 9 — followers, two-user scenarios, notifications.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-10/lecture.test.ts
> npm test tests/lecture-10/homework/starter.test.ts
> ```

---

## What You Will Learn

- How to connect to MongoDB Atlas with `MongoClient` in a test file
- `findOne()` — query a collection by field value
- Cross-validating: call the API, then query the DB, assert they match
- Why the API response and the DB document may differ (hashed password, cached data)
- `beforeAll` connection setup and `afterAll` connection teardown
- `DATABASE_URL` — reading connection string from `.env`
- Read-only MongoDB access in tests — only `find*` operations, never `insert/update/delete`
- Advanced assertion variants — `toMatch(/regex/)` for MongoDB ObjectId format, `toStrictEqual` for strict deep equality, `toBeTypeOf` for DB field types

> **Reference Topics**
> - MongoDB Atlas setup and findOne() → [`docs/topics/mongodb.md`](../../docs/topics/mongodb.md)
> - How bcrypt password hashing works → [`docs/topics/bcrypt.md`](../../docs/topics/bcrypt.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Direct DB Access? |
| 2 | Setup — Install MongoDB Driver |
| 3 | `DATABASE_URL` in `.env` |
| 4 | Connection Pattern |
| 5 | Cross-Validation Pattern |
| 6 | What to Assert |
| 7 | Postman Note |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Why Direct DB Access?

API tests verify **what the server returns**. But what if the server has a bug where
it returns correct data from Redis cache but stores wrong data in MongoDB?

Direct DB access catches this by comparing both:
```
API response.user.email === DB auth.email   ✅ both match
API response.user.username === DB auth.username ✅ both match
```

This is the difference between **black-box testing** (API only) and **grey-box testing**
(API + DB layer verification).

---

## 2. Setup

```bash
npm install mongodb
```

`mongodb` is already installed as a runtime dependency.

---

## 3. `DATABASE_URL` in `.env`

Add your MongoDB Atlas connection string:

```
DATABASE_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chattyapp-backend
```

**IP Whitelisting — the most common stumbling block:**

MongoDB Atlas only allows connections from whitelisted IP addresses.
If you get a connection timeout error (`MongoServerSelectionError`), your IP is not whitelisted.

Fix: in Atlas → **Network Access** → **Add IP Address** → either:
- Add your current IP (click "Add Current IP Address")
- Or add `0.0.0.0/0` to allow all IPs (less secure, but fine for development)

For GitHub Actions, the runner IPs change every build — you must either use `0.0.0.0/0`
or use the [GitHub Actions IP range action](https://github.com/marketplace/actions/whitelist-github-actions-runner-ip-on-mongodb-atlas).

Also add to `vitest.config.ts`:
```ts
env: {
  BASE_URL: ...,
  TEST_USERNAME: ...,
  TEST_PASSWORD: ...,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
},
```

And to `src/config.ts`:
```ts
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');
export const config = { BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL } as const;
```

---

## 4. Connection Pattern

```ts
import { MongoClient } from 'mongodb';

let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

beforeAll(async () => {
  client = new MongoClient(config.DATABASE_URL);
  await client.connect();
  db = client.db(); // uses database from connection string
});

afterAll(async () => {
  await client.close();
});
```

**`client.db()`** — uses the database name from the connection string URL.
The Chatty connection string ends with `/chattyapp-backend`.

**`ReturnType<MongoClient['db']>`** — this TypeScript type means:
"whatever type the `db()` method of `MongoClient` returns."
It is a way to let TypeScript figure out the type automatically without you having to import
the specific return type name. `ReturnType<T>` extracts the return type of any function type `T`.

---

## 5. Cross-Validation Pattern

```ts
// 1. Call API — sign up, get API response
const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
  username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
  email: faker.internet.email().toLowerCase(),
  password: TEST_PASSWORD,
  avatarColor: TEST_AVATAR_COLOR,
  avatarImage: TEST_AVATAR_IMAGE,
}, { validateStatus: () => true });

const apiUser = signupRes.data.user;

// 2. Query DB directly
const authCollection = db.collection('Auth');
const dbDoc = await authCollection.findOne({ email: apiUser.email });

// 3. Compare
expect(dbDoc?.username).toBe(apiUser.username);
expect(dbDoc?.email).toBe(apiUser.email);
expect(dbDoc?.uId).toBe(apiUser.uId);

// 4. Clean up
await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiUser.authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
});
```

---

## 6. What to Assert (and What NOT to)

**Assert:**
- `dbDoc.username` matches `apiUser.username`
- `dbDoc.email` matches `apiUser.email`
- `dbDoc.uId` matches `apiUser.uId`
- `dbDoc._id.toString()` matches `apiUser.authId`

**Do NOT assert:**
- `dbDoc.password` — this is hashed in DB, never in API response
- Real-time counts (postsCount, followersCount) — may lag between queue and DB

**What is bcrypt?**
bcrypt is a password hashing algorithm. It converts a plain-text password like `"Vitest@123456"`
into a long hash like `"$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"`.
The `$2b$` prefix identifies it as bcrypt. The `10` is the cost factor (how many rounds of hashing).
You cannot reverse a bcrypt hash — you can only verify by hashing again and comparing.
This is why the DB stores the hash (safe) and the API never returns it (correct).

**Why `new ObjectId(apiUserId)` instead of just `apiUserId`?**
MongoDB stores `_id` values as `ObjectId` objects, not plain strings.
`findOne({ _id: "507f1f77..." })` would fail because the string type does not match the ObjectId type.
`findOne({ _id: new ObjectId("507f1f77...") })` works because both sides are the same type.
Always wrap string IDs in `new ObjectId()` when querying `_id` fields in MongoDB.

**Read-only rule:**
Never use `insertOne`, `updateOne`, or `deleteOne` directly in tests.
Use the API for mutations — that's what you're testing.
The cleanup endpoint handles deletion.

---

## 7. Postman Note

There is no Postman section for this lecture — MongoDB queries are code-only.
Postman cannot connect to a database directly.

Instead, the Postman homework for this lecture focuses on **comparing** what two
different API endpoints return for the same user (e.g. signup response vs currentuser response).

---

## 8. Running the Tests

First add `DATABASE_URL` to your `.env`, then:

```bash
npm test tests/lecture-10/lecture.test.ts
```

---

## Key Takeaways

- ✅ `MongoClient` connects to Atlas — same connection string as the server
- ✅ `db.collection('Auth')` — collection names are `Auth` and `User` (capital first letter)
- ✅ Cross-validation proves API response == DB state
- ✅ **Read-only** in tests — never write to prod DB directly

**What's next:** Lecture 11 — GitHub Actions CI/CD pipeline. Running these tests automatically on every push.

---

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-10/ src/config.ts vitest.config.ts
git status                          # verify what will be committed

# Commit
git commit -m "lecture-10: MongoDB cross-validation — MongoClient, findOne, read-only"

# Push the branch to GitHub
git push -u origin lecture-10-mongodb
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-10: MongoDB cross-validation — MongoClient, findOne, read-only`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-11-cicd
```


## Homework

Open `tests/lecture-10/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Connect to MongoDB, assert connection succeeds |
| 2 | Sign up via API, find user in Auth collection, compare email |
| 3 | Cross-validate username between API and DB |
| 4 | Verify password is NOT in API response but IS in DB (hashed) |
| 5 | `.then()` — find user in User collection by authId |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` — assert MongoDB ObjectId format with regex |
| 7 | `toStrictEqual` — compare API response value with value read directly from MongoDB |

```bash
npm test tests/lecture-10/homework/starter.test.ts
```

Goal: **7 tests passing.**

---

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
- Newman — running Postman collections from the CLI in CI

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
    uses: actions/checkout@v3
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
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:  # manual trigger

jobs:
  test:
    name: Run Vitest
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Vitest
        run: npm test
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

**`@v3` on actions** — version pinning:
`uses: actions/checkout@v3` pins the action to version 3.
Without pinning you would write `uses: actions/checkout` which would use `@main` (unstable).
Always pin to a major version (`@v3`, `@v4`) to avoid breaking changes.

**`cache: 'npm'`** — caches the npm dependency cache between runs.
After the first run, subsequent pushes skip re-downloading all packages if `package-lock.json`
hasn't changed. This can save 30–60 seconds per run on large projects.

**`on:`** — when to trigger:
- `push` → runs on every commit to main/develop
- `pull_request` → runs when a PR is opened against main
- `workflow_dispatch` → adds a "Run workflow" button in the GitHub Actions tab — useful for manual re-runs

**`jobs:`** → one or more jobs, each runs on a separate machine

**`runs-on: ubuntu-latest`** → Linux VM provided by GitHub (free)

**`steps:`** → sequential commands:
1. Checkout — download your repo code
2. Setup Node.js — install the right version
3. `npm ci` — clean install (faster than `npm install` in CI)
4. `npm test` — run Vitest
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

To generate JUnit XML results (downloadable from GitHub):
```bash
# In vitest.config.ts, add:
reporters: process.env.CI ? ['junit', 'verbose'] : ['verbose'],
outputFile: { junit: 'test-results/junit.xml' },
```

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
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-12-docker
```


## Homework

| Task | What it practices |
|------|------------------|
| 1 | Create `.github/workflows/tests.yml` with the workflow from section 5 |
| 2 | Add all 4 GitHub Secrets to your repository |
| 3 | Push a commit and verify the Actions tab shows the workflow running |
| 4 | Add `reporters` to `vitest.config.ts` for JUnit output |
| 5 | Add the status badge to your project README |

No automated Vitest tests for this lecture — the homework is infrastructure setup.

---

# Lecture 12 — Docker: Containerising the Test Runner

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 11 — GitHub Actions CI/CD pipeline.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (run tests in Docker):
> ```bash
> docker build -t chatty-tests .
> docker run --env-file .env chatty-tests
> ```

---

## What You Will Learn

- What Docker is and why containerised tests run identically everywhere
- `Dockerfile` for the test runner — not the API server
- `docker-compose.yml` for running tests with env vars
- `.dockerignore` — what to exclude from the container
- Difference between `CMD` and `ENTRYPOINT`
- Passing `.env` to the container — `--env-file`
- Multi-stage builds — separate install from run

> **Reference Topics**
> - Docker deep-dive reference → [`docs/topics/docker.md`](../../docs/topics/docker.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Docker for Tests? |
| 2 | Dockerfile |
| 3 | `.dockerignore` |
| 4 | Build and Run |
| 5 | `docker-compose.yml` |
| 6 | Multi-stage Build |
| 7 | Running the Tests |
| 8 | Git |

---

## 1. Why Docker for Tests?

Problem: "Works on my machine" — tests pass locally but fail in CI or on a colleague's laptop.

Solution: Docker packages the test runner (Node.js, npm, all dependencies) into a container.
The same container runs identically on your Mac, Windows, Linux, or GitHub Actions.

---

## 2. Dockerfile

```dockerfile
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first — Docker caches this layer
COPY package*.json ./

# Install dependencies (ci = clean install, same as in CI)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Run the tests when the container starts
CMD ["npm", "test"]
```

**`RUN` vs `CMD` — the most important Docker distinction:**

| Instruction | When it runs | Used for |
|------------|-------------|---------|
| `RUN npm ci` | **At build time** — when you run `docker build` | Installing dependencies, compiling |
| `CMD ["npm", "test"]` | **At container start** — when you run `docker run` | The default command when the container launches |

`RUN` creates a new image layer. You can have many `RUN` instructions.
`CMD` does NOT create a layer — it just records what command to run at startup.
There can only be one `CMD` (the last one wins).

**`alpine`** — minimal Linux image (40 MB vs 900 MB for the full Node image).
For a test runner we don't need GUI tools or compilers — alpine is perfect.

**Why copy `package*.json` before `COPY . .`?**
Docker caches each `RUN` and `COPY` step. If only your test files change (not `package.json`),
Docker reuses the cached `RUN npm ci` layer — much faster rebuilds.

---

## 3. `.dockerignore`

```
node_modules
dist
.env
.env.*
!.env.example
test-results
coverage
.git
```

**Why exclude `node_modules`?**
The container installs its own `node_modules` via `RUN npm ci`.
Copying your local `node_modules` would be slower and might contain wrong platform binaries
(e.g. Mac binaries that don't run on Linux).

**Why exclude `.env`?**
Secrets are passed as environment variables at runtime, not baked into the image.
An image with secrets baked in is a security risk (anyone with the image can extract them).

---

## 4. Build and Run

```bash
# Build the image
docker build -t chatty-tests .

# Run with .env file (env vars passed at runtime, not baked in)
docker run --env-file .env chatty-tests

# Run a specific lecture
docker run --env-file .env chatty-tests npm test tests/lecture-01/lecture.test.ts
```

---

## 5. `docker-compose.yml`

```yaml
version: '3.8'

services:
  tests:
    build: .
    env_file: .env
    volumes:
      # Mount test-results so you can read them after the container exits
      - ./test-results:/app/test-results
```

Run with:
```bash
docker-compose run tests
```

**`volumes` — bind mount explained:**
`./test-results:/app/test-results` means: link the local `./test-results` folder
to `/app/test-results` inside the container. Any file the container writes to
`/app/test-results` appears immediately in your local `./test-results` folder.

Without this, files written inside the container disappear when the container exits.
The volume makes them persist on your machine.

Format: `local-path:container-path` (local left, container right).

---

## 6. Multi-stage Build (Advanced)

```dockerfile
# Stage 1: Install
FROM node:20-alpine AS installer
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Run tests (smaller final image — no install tools)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY . .
CMD ["npm", "test"]
```

Multi-stage builds produce a smaller final image by separating installation from execution.
For test runners this is optional but good practice to know.

---

## Key Takeaways

- ✅ `Dockerfile` for the **test runner** — not the API server (that's a different Dockerfile)
- ✅ `node:20-alpine` — small, fast, production-suitable base image
- ✅ Copy `package*.json` first — Docker layer caching speeds up rebuilds
- ✅ `--env-file .env` passes secrets at runtime — never baked into the image
- ✅ `.dockerignore` excludes `node_modules` and `.env`

**What's next:** Lecture 13 — Test Reporting. HTML reports, JUnit XML, Newman CLI, coverage.

---

## 7. Running the Tests

```bash
docker build -t chatty-tests .
docker run --env-file .env chatty-tests
```

## 8. Git

```bash
# Stage the files for this lecture
git add Dockerfile .dockerignore docker-compose.yml tests/lecture-12/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-12: Dockerfile for test runner, docker-compose"

# Push the branch to GitHub
git push -u origin lecture-12-docker
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-12: Dockerfile for test runner, docker-compose`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-13-reporting
```


## Homework

| Task | What it practices |
|------|------------------|
| 1 | Create `Dockerfile` using the content from section 2 |
| 2 | Create `.dockerignore` from section 3 |
| 3 | `docker build -t chatty-tests .` — verify it builds with no errors |
| 4 | `docker run --env-file .env chatty-tests` — verify tests run inside the container |
| 5 | Create `docker-compose.yml` from section 5 and run with `docker-compose run tests` |

No Vitest test files for this lecture — homework is infrastructure setup.

---

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

---

# Lecture 14 — Password Reset & SSO

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 13 — test reporting, Newman, coverage.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-14/lecture.test.ts
> npm test tests/lecture-14/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /forgot-password` — trigger password reset email flow
- `POST /reset-password/:token` — use a token to set a new password
- Why you **cannot automate the full reset flow** — and what you test instead
- **Testing multi-step flows** where step 2 depends on data from step 1
- Token expiry — reset tokens expire after 1 hour
- `POST /sso` — Single Sign-On via existing JWT
- How SSO works: pass a valid JWT to get a new session cookie
- Advanced assertion variants — `toBeNull` for explicit null checks, `toMatch(/regex/)` for JWT format validation, `toBeTypeOf` for token type checking

> **Reference Topics**
> - JWT structure and validation → [`docs/topics/jwt.md`](../../docs/topics/jwt.md)
> - How SSO works in Chatty → [`docs/topics/sso.md`](../../docs/topics/sso.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | The Password Reset Flow |
| 3 | Why We Cannot Automate Step 2 |
| 4 | What We Test Instead |
| 5 | SSO — Single Sign-On |
| 6 | Postman |
| 7 | Endpoint Schema & Validation Rules |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Endpoints

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| POST | `/forgot-password` | ❌ | `{ message: "Password reset email sent." }` |
| POST | `/reset-password/:token` | ❌ | `{ message: "Password successfully updated." }` |
| POST | `/sso` | ❌ | `{ message: "SSO login successful", user: {...}, token }` |

---

## 2. The Password Reset Flow

The reset flow has **three steps**:

```
Step 1: POST /forgot-password { email }
        → Server generates a random 40-char hex token
        → Stores it in the Auth document with a 1-hour expiry
        → Sends a reset email with the link: /reset-password?token=<token>
        → Returns 200

Step 2: User clicks the link in the email
        → Browser navigates to the reset page
        → User enters new password

Step 3: POST /reset-password/:token { password, confirmPassword }
        → Server finds the Auth document by token (only if not expired)
        → Updates the password (hashed)
        → Clears the token
        → Sends a confirmation email
        → Returns 200
```

---

## 3. Why We Cannot Automate the Full Flow

Step 2 requires **reading an email inbox**. In automated tests we have no access to the email inbox.

This is a common limitation in API testing. The approach:

**What we CAN test:**
- Step 1 returns 200 with the correct message
- Step 1 returns 400 for non-existent email
- Step 3 with an invalid/expired token returns 400

**What we CANNOT test automatically:**
- The actual password reset link (we'd need to intercept the email)
- Step 3 with a valid token (would change the account's password permanently)

> **Real-world solution:** In a staging environment, use a test email service like
> [Mailhog](https://github.com/mailhog/MailHog) or [Mailtrap](https://mailtrap.io)
> that captures emails in a test inbox accessible via API.

---

## 4. What We Test Instead

**Step 1 — happy path:**
```ts
const res = await axios.post(`${config.BASE_URL}/forgot-password`, {
  email: config.TEST_USERNAME + '@test.com', // use a known email
}, { validateStatus: () => true });
expect(res.status).toBe(200);
```

> ⚠️ Returns 400 `'Invalid credentials'` if the email doesn't exist in the database.
> ⚠️ Always returns 200 even on success — no way to tell if email was actually delivered.

**Step 3 — invalid token:**
```ts
const res = await axios.post(`${config.BASE_URL}/reset-password/invalidtoken123`, {
  password: 'NewPass@123456',
  confirmPassword: 'NewPass@123456',
}, { validateStatus: () => true });
expect(res.status).toBe(400);
expect(res.data.message).toBe('Reset token has expired.');
```

---

## 5. SSO — Single Sign-On

SSO allows a system that already has a valid Chatty JWT to create a session without username/password.

**How it works:**
1. You already have a valid JWT (from `/signin` or `/signup`)
2. POST that JWT to `/sso`
3. The server verifies it, finds the user, and creates a new session

**Use case:** A mobile app or external service that generates its own JWTs using the same secret.

**In tests:** Get a JWT from `/signin`, then pass it to `/sso`:

```ts
// Sign in first to get a JWT
const loginRes = await axios.post(`${config.BASE_URL}/signin`, credentials, { validateStatus: () => true });
const jwt = loginRes.data.token;

// Use that JWT for SSO
const ssoRes = await axios.post(`${config.BASE_URL}/sso`, { token: jwt }, { validateStatus: () => true });
expect(ssoRes.status).toBe(200);
```

> ⚠️ SSO accepts the **exact same JWT** that signin returns.
> ⚠️ Returns 400 `'Token required'` if body is empty.
> ⚠️ Returns 400 `'User not found'` if the token is valid JWT but the user was deleted.

---

## 6. Postman

Create folder **Lecture 14**.

### Forgot password
- POST `{{base_url}}/forgot-password`
- Body: `{ "email": "your-test-email@example.com" }`
- Assert: status 200, message "Password reset email sent."

### Reset password with invalid token
- POST `{{base_url}}/reset-password/thisisnotavalidtoken`
- Body: `{ "password": "NewPass@123456", "confirmPassword": "NewPass@123456" }`
- Assert: status 400, message "Reset token has expired."

### SSO flow
1. Run **L02 — SignIn success** to get a JWT (saved in `{{token}}`)
2. POST `{{base_url}}/sso` with body: `{ "token": "{{token}}" }`
3. Assert: status 200, `user` object present, same token returned

---

## 7. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


### `POST /forgot-password`
**Schema:** `emailSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | ✅ | valid email format |

**Errors (400):**
- Invalid email format: `'Field must be valid'`
- Email not in database: `'Invalid credentials'`

---

### `POST /reset-password/:token`
**Schema:** `passwordSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `password` | string | ✅ | min 12, max 128, pattern: upper + lower + digit + special |
| `confirmPassword` | string | ✅ | must equal `password` |

**Errors (400):**
- Password mismatch: `'Passwords do not match'`
- Invalid/expired token: `'Reset token has expired.'`

---

### `POST /sso`
No Joi schema — validates manually in controller.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | Valid JWT signed with `JWT_TOKEN` |

**Errors (400):**
- Missing token: `'Token required'`
- User not found: `'User not found'`
- Invalid/expired JWT: throws JWT error

---

## Key Takeaways

- ✅ Password reset is a multi-step flow — Step 2 (email link) cannot be automated without a test email service
- ✅ Always test validation errors for flows you can't fully automate
- ✅ Invalid reset tokens return `'Reset token has expired.'` — safe to test without real tokens
- ✅ SSO takes an existing JWT and creates a new session — useful for integrations

**What's next:** Lecture 15 — posts with images and videos. Testing media upload endpoints.

---

## 8. Running the Tests

```bash
npm test tests/lecture-14/lecture.test.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-14/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-14: password reset flow, SSO"

# Push the branch to GitHub
git push -u origin lecture-14-password-reset
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-14: password reset flow, SSO`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-15-posts-media
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | POST /forgot-password with valid email → 200 |
| 2 | POST /forgot-password with invalid email format → 400 |
| 3 | POST /reset-password/badtoken with mismatched passwords → 400 |
| 4 | SSO: sign in, get token, POST /sso, assert 200 |
| 5 | `.then()` — SSO with empty body → 400 |
| 6 | `toBeNull` — assert absent token field coerced to null is strictly null |
| 7 | `toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)` — validate JWT format with regex |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-14/homework/starter.test.ts
```

---

# Lecture 15 — Posts with Media: Images & Videos

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 14 — password reset flow, SSO.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-15/lecture.test.ts
> npm test tests/lecture-15/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/image/post` — create a post with an embedded image
- `POST /post/video/post` — create a post with a video (requires a video data URL)
- `GET /post/images/:page` — get only posts that have images
- `GET /post/videos/:page` — get only posts that have videos
- `PUT /post/image/:postId` — update a post to add/replace an image
- `PUT /post/video/:postId` — update a post to add/replace a video
- `image` field validation — same data URL format as signup's `avatarImage`
- Why image/video posts are slower than plain posts (Cloudinary upload happens synchronously)
- Advanced assertion variants — `toMatch(/regex/)` for URL format, `toBeGreaterThan` for array length, `toSatisfy(fn)` to assert Cloudinary URL structure

> **Reference Topics**
> - Base64 and data URLs explained → [`docs/topics/base64.md`](../../docs/topics/base64.md)
> - Cloudinary image upload pipeline → [`docs/topics/cloudinary.md`](../../docs/topics/cloudinary.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Image Post vs Plain Post |
| 3 | The `image` Field — Validation Rules |
| 4 | Lifecycle |
| 5 | Postman |
| 6 | Endpoint Schema |
| 7 | `imgId` and `imgVersion` |
| 8 | Understanding the Test File |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/image/post` | `{ message: "Post created with image successfully" }` — 201 |
| POST | `/post/video/post` | `{ message: "Post created with video successfully" }` — 201 |
| GET | `/post/images/:page` | `{ message: "All posts with images", posts: [...] }` |
| GET | `/post/videos/:page` | `{ message: "All posts with videos", posts: [...] }` |
| PUT | `/post/image/:postId` | `{ message: "Post with image updated successfully" }` |
| PUT | `/post/video/:postId` | `{ message: "Post with video updated successfully" }` |

---

## 2. Image Post vs Plain Post

| Feature | `POST /post` | `POST /post/image/post` |
|---------|-------------|------------------------|
| `image` field | ❌ optional | ✅ required |
| Cloudinary upload | ❌ none | ✅ synchronous |
| Response time | ~100ms | ~2-5s |
| `imgId` in stored post | empty string | Cloudinary public_id |
| Returned in `GET /post/images/:page` | ❌ filtered out | ✅ included |

---

## 3. The `image` Field

The `image` field must be a **valid data URL or HTTPS URL**. Same validation as signup's `avatarImage`.

Use `TEST_AVATAR_IMAGE` from `src/fixtures.ts`:

```ts
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

await axios.post(`${config.BASE_URL}/post/image/post`, {
  post: 'My image post!',
  image: TEST_AVATAR_IMAGE,
  bgColor: '#ffffff',
  privacy: 'Public',
  feelings: '',
  profilePicture: '',
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| Not data URL or HTTPS URL | `'Image must be either a data URL or HTTP/HTTPS URL'` |
| Invalid data URL format | `'Image must be a valid data URL in format: data:image/[type];base64,[data]'` |
| Missing image | `'Image is a required field'` |

---

## 4. Lifecycle

```
beforeAll:
  1. Sign in → cookie
  2. Create a plain post (for update tests)
  3. Create an image post (for GET /post/images verification)
  4. Find both post IDs via GET /post/all/1

tests

afterAll:
  5. Delete both posts
  6. Sign out
```

---

## 5. Postman

Create folder **Lecture 15**.

### Create image post
- POST `{{base_url}}/post/image/post`
- Body: `{ "post": "Image post!", "image": "<TEST_AVATAR_IMAGE base64>", "bgColor": "#fff", "privacy": "Public", "feelings": "", "profilePicture": "" }`

### Get image posts
- GET `{{base_url}}/post/images/1`
- Assert: posts array, first post has non-empty `imgId`

### Update post with image
- PUT `{{base_url}}/post/image/{{postId}}`
- Same body — replaces the image

---

## 6. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/image/post`** — `postWithImageSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `image` | string | ✅ | valid data URL or HTTPS URL |
| `post` | string | ❌ | post text |
| `bgColor` | string | ❌ | hex colour |
| `privacy` | string | ❌ | visibility |
| `feelings` | string | ❌ | |
| `gifUrl` | string | ❌ | |
| `profilePicture` | string | ❌ | |

---

## 7. `imgId` and `imgVersion` — What Cloudinary Returns

When an image is uploaded to Cloudinary, the server stores two identifiers in the post document:

| Field | Type | What it is |
|-------|------|-----------|
| `imgId` | string | Cloudinary public ID — unique identifier for the image (e.g. `"5f4dcc3b5aa765d61d8327de"`) |
| `imgVersion` | string | Cloudinary version number — changes each time the image is updated |

These are what you use to construct the Cloudinary image URL:
```
https://res.cloudinary.com/<cloud_name>/image/upload/v<imgVersion>/<imgId>
```

For plain posts (no image), both fields are empty strings: `imgId: ""`.
For image posts, both are non-empty strings. This is exactly how `GET /post/images/:page` filters — it only returns posts where `imgId` is not empty.

---

## 8. Understanding the Test File

Open `tests/lecture-15/lecture.test.ts`.

**Why `beforeAll` creates TWO posts:**

```ts
// Plain post — for proving it doesn't appear in GET /post/images
await axios.post(postUrl, { post: PLAIN_POST_CONTENT, ... });

// Image post — for verifying GET /post/images includes it
await axios.post(imagePostUrl, { post: IMAGE_POST_CONTENT, image: TEST_AVATAR_IMAGE, ... });
```

This lets us write two assertions in section 2:
- Image post IS in `GET /post/images/1` ✅
- Plain post is NOT in `GET /post/images/1` ✅ (proves the filter works)

**Why sections 1 (create image post) also clean up extra posts:**

Section 1 creates additional test posts to check the response message. Each of those needs to be deleted immediately to avoid cluttering the test data. The cleanup is done inside the test:

```ts
it('message is "Post created with image successfully"', async () => {
  const res = await axios.post(imagePostUrl, { post: `Extra ${Date.now()}`, image: TEST_AVATAR_IMAGE, ... });
  expect(res.data.message).toBe('Post created with image successfully');
  // Clean up extra post right away
  const all = await axios.get(getAllUrl, ...);
  const extra = all.data.posts?.[0];
  if (extra?._id && extra._id !== imagePostId) {
    await axios.delete(`${config.BASE_URL}/post/${extra._id}`, ...);
  }
});
```

---

## Key Takeaways

- ✅ Image posts require a valid base64 data URL — use `TEST_AVATAR_IMAGE` from fixtures
- ✅ `GET /post/images/:page` only returns posts where `imgId` is non-empty — not plain posts
- ✅ Image upload to Cloudinary is synchronous — response is slower (~2-5s vs ~100ms)
- ✅ `imgId` and `imgVersion` are the Cloudinary identifiers stored in the post document
- ✅ `PUT /post/image/:postId` replaces the image — updates both `imgId` and `imgVersion`

**What's next:** Lecture 16 — User Profile Pages & Image Management.

---

## 9. Running the Tests

```bash
npm test tests/lecture-15/lecture.test.ts
```

**Expected output:**
```
✓ 1. Create image post > status is 201
✓ 1. Create image post > message is "Post created with image successfully"
✓ 2. GET /post/images/:page > status is 200
✓ 2. GET /post/images/:page > response has posts array
✓ 2. GET /post/images/:page > our image post appears in the list
✓ 2. GET /post/images/:page > plain post does NOT appear in images list
✓ 3. Update post image > PUT /post/image/:postId returns 200
✓ 4. Validation errors > POST without image returns 400
✓ 4. Validation errors > POST with invalid image format returns 400
✓ 4. Validation errors > POST without cookie returns 401

Test Files  1 passed (1)
Tests  10 passed (10)
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-15/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-15: posts with media — image/video upload, filtered GET"

# Push the branch to GitHub
git push -u origin lecture-15-posts-media
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-15: posts with media — image/video upload, filtered GET`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-16-user-profile-images
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | Create image post → status 201, message |
| 2 | GET /post/images/1 → posts array, imgId non-empty on at least one |
| 3 | PUT /post/image/:postId → state verify via GET |
| 4 | POST /post/image/post with invalid image → 400 |
| 5 | `.then()` — GET /post/images/1 → at least one post |
| 6 | `toMatch(/^https?:\/\//)` — assert profile picture URL starts with http/https |
| 7 | `toSatisfy` — assert URL contains `'cloudinary'` using a custom predicate |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-15/homework/starter.test.ts
```

---

# Lecture 16 — User Profile Pages & Image Management

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 15 — posts with media, image/video upload.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-16/lecture.test.ts
> npm test tests/lecture-16/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /user/profile` — own full profile
- `GET /user/profile/:userId` — another user's profile by ID
- `GET /user/profile/posts/:username/:userId/:uId` — profile + all their posts in one call
- `GET /user/profile/user/suggestions` — random users to follow
- `POST /images/profile` — upload a profile picture
- `POST /images/background` — upload a background image
- `GET /images/:userId` — get all images uploaded by a user
- `DELETE /images/profile/:bgImageId` — remove profile picture
- **GET-heavy testing** — asserting response shapes without mutations
- Image management: why profile/background images go through a separate endpoint
- Advanced assertion variants — `expect.arrayContaining` for message arrays, `toBeGreaterThanOrEqual` for array length bounds, `toBeTypeOf` for message field types

> **Reference Topics**
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - Cookie capture and replay → [`docs/topics/cookies-sessions.md`](../../docs/topics/cookies-sessions.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Profile Page Endpoints |
| 3 | Image Management |
| 4 | Postman |
| 5 | Endpoint Schema |
| 6 | What Is `uId`? |
| 7 | Why Are Suggestions Random? |
| 8 | Understanding the Test File |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/user/profile` | `{ message, user: {...} }` |
| GET | `/user/profile/:userId` | `{ message, user: {...} }` |
| GET | `/user/profile/posts/:username/:userId/:uId` | `{ message, user: {...}, posts: [...], totalPosts }` |
| GET | `/user/profile/user/suggestions` | `{ message, users: [...] }` |
| GET | `/images/:userId` | `{ message, images: [...] }` |
| POST | `/images/profile` | `{ message: "Image added successfully" }` |
| POST | `/images/background` | `{ message: "Image added successfully" }` |
| DELETE | `/images/profile/:bgImageId` | `{ message: "Image deleted successfully" }` |
| DELETE | `/images/background/:bgImageId` | `{ message: "Image deleted successfully" }` |

---

## 2. Profile Page Endpoints

**Own profile** (`GET /user/profile`):
Returns the currently authenticated user's full profile — same shape as `/currentuser` but without `token` and `isUser`.

**Another user's profile** (`GET /user/profile/:userId`):
`:userId` = the User `_id` from search results or follower lists.

**Profile + posts** (`GET /user/profile/posts/:username/:userId/:uId`):
All three URL params are required:
- `:username` — title-cased username (`Vitestmike`)
- `:userId` — User `_id`
- `:uId` — 12-digit numeric string from the user document

```ts
// Get all three values from GET /currentuser
const { _id: userId, username, uId } = currentUser;
const url = `${BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
```

**Suggestions** (`GET /user/profile/user/suggestions`):
Returns random users you are not following. Always returns an array (may be empty).

---

## 3. Image Management

Profile and background images are separate from post images. They go to the `Image` collection in MongoDB.

**Upload profile picture:**
```ts
await axios.post(`${config.BASE_URL}/images/profile`, {
  image: TEST_AVATAR_IMAGE,
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

**Get user's images:**
```ts
const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'User images', images: [{ imgId, imgVersion, createdAt }] }
```

---

## 4. Postman

### Get own profile
- GET `{{base_url}}/user/profile`
- Assert: status 200, user object present

### Get another user's profile
- GET `{{base_url}}/user/profile/{{userBId}}`
- Assert: status 200

### Get suggestions
- GET `{{base_url}}/user/profile/user/suggestions`
- Assert: status 200, users is array

### Upload profile picture
- POST `{{base_url}}/images/profile`
- Body: `{ "image": "<TEST_AVATAR_IMAGE>" }`
- Assert: status 200, message "Image added successfully"

---

## 5. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /images/profile` and `POST /images/background`** — `addImageSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `image` | string | ✅ | valid data URL or HTTPS URL |

---

## 6. What Is `uId`?

You will see `uId` in the `GET /user/profile/posts/:username/:userId/:uId` URL.

`uId` is a **12-digit numeric string** generated randomly at signup — different from `_id` (MongoDB ObjectId) and `authId`. It is stored in the Auth document and propagated to the User document.

```ts
// From the signup/signin/currentuser response:
user.uId = "123456789012"   // 12-digit number as string
user._id = "507f1f77..."    // MongoDB ObjectId (24 hex chars)
```

**Why does this endpoint need `uId` in addition to `userId`?**
Redis caches posts by `uId` for fast retrieval. The controller uses `uId` to look up posts in the Redis cache and `userId` to fall back to MongoDB. You need all three URL params to cover both paths.

```ts
// Get all three from GET /currentuser:
const { _id: userId, username, uId } = currentUser;
const profilePostsUrl = `${BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
```

---

## 7. Why Are Suggestions Random?

`GET /user/profile/user/suggestions` returns users you might want to follow.

The server:
1. Gets all users from Redis cache (up to a random sample)
2. Filters out users you already follow and yourself
3. Returns the remaining users

The result is non-deterministic — the same request can return different users each time.
This is why the test asserts `Array.isArray(res.data.users)` — not a specific count or specific usernames.

---

## 8. Understanding the Test File

Open `tests/lecture-16/lecture.test.ts`.

**The `beforeAll` pattern for GET-heavy lectures:**

Unlike lectures that create resources (posts, comments, users), this lecture mostly reads data.
The `beforeAll` only signs in and captures the current user's details — no mutations:

```ts
beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, ...);
  sessionCookie = ...;

  // Capture userId, username, uId for the profile+posts URL
  const curRes = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, ... });
  userId   = curRes.data.user._id;
  username = curRes.data.user.username;
  uId      = curRes.data.user.uId;
});
```

**Note on `GET /user/profile/:userId` test:** The test uses **your own `userId`** for simplicity. In a real scenario you'd use another user's ID. The endpoint works for any valid userId.

---

## Key Takeaways

- ✅ `GET /user/profile/posts/:username/:userId/:uId` requires all three URL params — `uId` is the 12-digit numeric string
- ✅ Profile images go through `/images/` endpoints — separate from post images
- ✅ `GET /images/:userId` returns all images (profile + background) uploaded by a user
- ✅ Suggestions are random — always assert it's an array, never assert a specific count
- ✅ This is a GET-heavy lecture — `beforeAll` only signs in, no resource creation

**What's next:** Lecture 17 — Chat & Messaging. Two-user conversation flow.

---

## 9. Running the Tests

```bash
npm test tests/lecture-16/lecture.test.ts
```

**Expected output:**
```
✓ 1. Own profile > GET /user/profile returns 200
✓ 1. Own profile > response has user object
✓ 1. Own profile > password is not in response
✓ 2. Profile by userId > GET /user/profile/:userId returns 200
✓ 2. Profile by userId > returns the correct user
✓ 3. Profile + posts > returns 200 with user and posts
✓ 4. User suggestions > GET /user/profile/user/suggestions returns 200
✓ 4. User suggestions > response has users array (may be empty)
✓ 5. Upload profile picture > POST /images/profile returns 200
✓ 5. Upload profile picture > POST without image returns 400
✓ 6. Get user images > GET /images/:userId returns 200
✓ 7. Negative tests > GET /user/profile without cookie returns 401
✓ 7. Negative tests > GET /user/profile/:userId with invalid ID returns 400

Test Files  1 passed (1)
Tests  13 passed (13)
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-16/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-16: user profile pages, image management"

# Push the branch to GitHub
git push -u origin lecture-16-user-profile-images
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-16: user profile pages, image management`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-17-chat
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | GET /user/profile → status 200, user shape |
| 2 | GET /user/profile/user/suggestions → array |
| 3 | POST /images/profile → status 200 |
| 4 | GET /images/:userId → images array |
| 5 | `.then()` — GET /user/profile/:userId for any user |
| 7 | `expect.arrayContaining` — assert messages array contains objects with a `body` field |
| 8 | `toBeGreaterThanOrEqual(0)` — assert messages.length is never negative |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-16/homework/starter.test.ts
```

---

# Lecture 17 — Chat & Messaging

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 16 — user profile pages, image management.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-17/lecture.test.ts
> npm test tests/lecture-17/homework/starter.test.ts
> ```

---

## What You Will Learn

- Why chat requires **two users** — you send, someone else receives
- `POST /chat/message` — send a message (creates conversation if first time)
- `GET /chat/message/conversation-list` — list all conversations
- `GET /chat/message/user/:receiverId` — messages in a conversation
- `PUT /chat/message/mark-as-read` — mark messages as read
- `PUT /chat/message/reaction` — add/remove emoji reaction to a message
- `DELETE /chat/conversation/:receiverId` — remove a conversation from your list
- `DELETE /chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` — delete a specific message
- `conversationId` — how it is created and how to use it in subsequent messages
- The `receiverUsername`, `receiverAvatarColor`, `receiverProfilePicture` fields — why chat requires full receiver details
- Advanced assertion variants — `expect.objectContaining` for message shape, `toSatisfy(fn)` for body content, `toMatch(/regex/)` for MongoDB ObjectId format

> **Reference Topics**
> - Two-user chat setup → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - URL encoding for message parameters → [`docs/topics/url-encoding.md`](../../docs/topics/url-encoding.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Why Two Users |
| 3 | The `conversationId` Lifecycle |
| 4 | Receiver Fields — Why Chat Needs Them |
| 5 | Message Reaction |
| 6 | Deleting Conversations and Messages |
| 7 | Postman |
| 8 | Endpoint Schema |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/chat/message` | `{ message, conversationId }` |
| GET | `/chat/message/conversation-list` | `{ message, list: [...] }` |
| GET | `/chat/message/user/:receiverId` | `{ message, messages: [...] }` |
| POST | `/chat/message/add-chat-users` | `{ message }` |
| POST | `/chat/message/remove-chat-users` | `{ message }` |
| PUT | `/chat/message/mark-as-read` | `{ message }` |
| PUT | `/chat/message/reaction` | `{ message }` |
| DELETE | `/chat/conversation/:receiverId` | `{ message: "Conversation removed" }` |
| DELETE | `/chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` | `{ message: "Message marked as deleted" }` |

---

## 2. Why Two Users

Chat requires a sender (user A) and a receiver (user B). You cannot message yourself.

Same approach as Lecture 09:
1. Sign in as user A (`TEST_USERNAME`) in `beforeAll`
2. Create user B with Faker.js + signup
3. Get user B's `_id`, `username`, `avatarColor`, `profilePicture` — all needed for the message body
4. In `afterAll`: delete user B, sign out

---

## 3. The `conversationId` Lifecycle

First message between two users:
```ts
// Send WITHOUT conversationId — server creates a new conversation
const res = await axios.post(`${BASE_URL}/chat/message`, {
  receiverId: userBId,
  receiverUsername: userBUsername,
  receiverAvatarColor: userBAvatarColor,
  receiverProfilePicture: '',
  body: 'Hello!',
  // no conversationId
}, { headers: { Cookie: cookieA }, ... });

conversationId = res.data.conversationId;
```

Subsequent messages in the same conversation:
```ts
await axios.post(`${BASE_URL}/chat/message`, {
  conversationId,  // include this time
  receiverId: userBId,
  ...
  body: 'Second message',
}, ...);
```

---

## 4. Receiver Fields — Why Chat Needs Them

Unlike reactions and comments (which look up receiver data server-side), chat stores the receiver's
display information directly in the message document for fast rendering.

You must pass:
- `receiverUsername` — shown in the chat bubble
- `receiverAvatarColor` — shown when profile picture is missing
- `receiverProfilePicture` — may be empty string

Get these from the signup response when creating user B:
```ts
userBAvatarColor = signupRes.data.user.avatarColor;
userBUsername    = signupRes.data.user.username;
userBId          = signupRes.data.user._id;
```

---

## 5. Message Reaction

React to a specific message with:
```ts
await axios.put(`${BASE_URL}/chat/message/reaction`, {
  conversationId,
  messageId,    // get from GET /chat/message/user/:receiverId
  reaction: '😊',
  type: 'add',   // or 'remove'
}, { headers: { Cookie: cookieA }, ... });
```

---

## 6. Deleting Conversations and Messages

### `DELETE /chat/conversation/:receiverId` — Remove conversation from list

`:receiverId` = user B's `_id`.

```ts
await axios.delete(`${BASE_URL}/chat/conversation/${userBId}`, {
  headers: { Cookie: cookieA }, validateStatus: () => true,
});
```

**Response (200):** `{ "message": "Conversation removed" }`

> ⚠️ This removes the conversation from **your** list only. The other user's conversation is unaffected.
> ⚠️ Does not delete the messages — only removes from your conversation list.

---

### `DELETE /chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` — Delete a message

All four are URL path params. All three IDs must be valid MongoDB ObjectIds.

| Param | Value |
|-------|-------|
| `:messageId` | The `_id` of the message (from `GET /chat/message/user/:receiverId`) |
| `:senderId` | User `_id` of the message sender |
| `:receiverId` | User `_id` of the message receiver |
| `:type` | `'deleteForMe'` or `'deleteForEveryone'` |

```ts
// Only the sender or receiver can delete — returns 401 otherwise
await axios.delete(
  `${BASE_URL}/chat/message/mark-as-deleted/${messageId}/${userAId}/${userBId}/deleteForMe`,
  { headers: { Cookie: cookieA }, validateStatus: () => true },
);
```

**Response (200):** `{ "message": "Message marked as deleted" }`

> ⚠️ `'deleteForMe'` hides the message only for you. `'deleteForEveryone'` hides it for both parties.
> ⚠️ Only the sender OR receiver can delete — another user gets 401.
> ⚠️ You need `messageId` — get it from `GET /chat/message/user/:receiverId → messages[0]._id`.

---

## 7. Postman

Create folder **Lecture 17**. Requires two user accounts.

### Send first message
- POST `{{base_url}}/chat/message`
- Body: `{ "receiverId": "{{userBId}}", "receiverUsername": "{{userBUsername}}", "receiverAvatarColor": "#ff6b6b", "receiverProfilePicture": "", "body": "Hello from Postman!" }`
- Tests: assert status 200, save `conversationId`

### Get conversation list
- GET `{{base_url}}/chat/message/conversation-list`
- Assert: list is array, first item has conversationId

### Get messages
- GET `{{base_url}}/chat/message/user/{{userBId}}`
- Assert: messages array, save `messageId` from first message

### Mark as read
- PUT `{{base_url}}/chat/message/mark-as-read`
- Body: `{ "senderId": "{{userBId}}", "receiverId": "{{userAId}}" }`
- Assert: status 200

---

## 8. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /chat/message`** — `addChatSchema`

| Field | Type | Required |
|-------|------|----------|
| `receiverId` | string | ✅ |
| `receiverUsername` | string | ✅ |
| `receiverAvatarColor` | string | ✅ |
| `receiverProfilePicture` | string | ✅ |
| `conversationId` | string | ❌ (omit for first message) |
| `body` | string | ❌ |
| `gifUrl` | string | ❌ |
| `selectedImage` | string | ❌ |
| `isRead` | boolean | ❌ |

**`PUT /chat/message/reaction`** — `messageReactionSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `conversationId` | string | ✅ | |
| `messageId` | string | ✅ | |
| `reaction` | string | ✅ | any emoji/string |
| `type` | string | ✅ | `'add'` or `'remove'` |

---

## Key Takeaways

- ✅ Chat requires two users — create user B in `beforeAll`, delete in `afterAll`
- ✅ Omit `conversationId` on the first message — server creates it and returns it
- ✅ `receiverUsername`, `receiverAvatarColor`, `receiverProfilePicture` are required body fields
- ✅ `messageId` is found via `GET /chat/message/user/:receiverId`
- ✅ Delete message URL has 4 params: `messageId`, `senderId`, `receiverId`, `type`
- ✅ Delete conversation removes it from **your** list only — the other user is unaffected

**Congratulations — you have completed all 17 lectures!**

---

## 9. Running the Tests

```bash
npm test tests/lecture-17/lecture.test.ts
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-17/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-17: chat and messaging — two-user conversation flow"

# Push the branch to GitHub
git push -u origin lecture-17-chat
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-17: chat and messaging — two-user conversation flow`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
# Course complete! 🎉
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | Send first message → 200, save conversationId |
| 2 | GET conversation-list → list array |
| 3 | GET messages with user B → messages array |
| 4 | Mark as read → 200 |
| 5 | `.then()` — send second message with conversationId |
| 6 | `expect.objectContaining` — assert message has both `_id` and `body` fields |
| 7 | `toSatisfy` — assert message body is non-empty using a custom predicate |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-17/homework/starter.test.ts
```
