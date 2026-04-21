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
