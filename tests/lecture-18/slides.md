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

# Lecture 18
## Debugging & Test Reliability

Diagnose failures fast — write tests that stay green

---

## Failure Diagnosis Flowchart

| Error | Likely cause | Check first |
|-------|-------------|-------------|
| `401` | cookie not sent | `beforeAll` signin failed |
| `429` | rate limited | add `expectRejected` or `x-test-secret` |
| `undefined` error | `beforeAll` crashed silently | add `console.log` to `beforeAll` |
| `400` | wrong request body | check field names and types |
| Tests pass alone, fail together | shared mutable state | use `fileParallelism: false` |

<!-- note: use this as a mental decision tree every time a test fails. Don't guess. Look at the status code first. It tells you which category of problem you're dealing with. -->

---

## "expected undefined to be 200"

> This usually means `beforeAll` failed silently

```ts
// Wrong — axios throws on 401, beforeAll silently aborts
const r = await axios.post(signinUrl, credentials);

// Fix — always use validateStatus in beforeAll
const r = await axios.post(signinUrl, credentials,
  { validateStatus: () => true });
sessionCookie = Array.isArray(r.headers['set-cookie'])
  ? r.headers['set-cookie'][0] : '';
```

> Check `beforeAll` first — not the endpoint

<!-- note: this is the most confusing failure message in the course. "expected undefined to be 200" looks like the endpoint returned undefined. It didn't. beforeAll threw, sessionCookie was never set, and every test got undefined when it tried to use it. -->

---

## How to Read a Vitest Failure

```
- Expected  999
+ Received  200

at tests/lecture-18/debugging.spec.ts:42:5
```

| Part | What it means |
|------|---------------|
| `- Expected` | What you wrote in the assertion |
| `+ Received` | What the code actually returned |
| `at file:42` | Click to jump to the line |

> Read the diff first — most failures are wrong assertions

<!-- note: students spend 10 minutes debugging an "API bug" that turns out to be a wrong expected value in the assertion. Read the diff before touching the test logic. -->

---

## Pattern: 401 — Cookie Not Sent

```ts
// Forgot to capture cookie
const r = await axios.post(signinUrl, credentials,
  { validateStatus: () => true });
// Missing: sessionCookie = r.headers['set-cookie']?.[0] ?? '';

const res = await axios.get(currentUserUrl,
  { headers: { Cookie: sessionCookie }, ... });
// Gets 401 — sessionCookie is empty string
```

> When you see 401: check sessionCookie is non-empty

<!-- note: the cookie is in r.headers['set-cookie'] as an array. If you forget to extract and save it, sessionCookie stays as the empty string it was initialized to. -->

---

## Pattern: 429 — Rate Limited

> Auth endpoints allow 5 requests per minute

```ts
// Wrong — fails when rate limit kicks in
expect(res.status).toBe(400);

// Fix — accept both rejection codes
import { expectRejected } from '../../src/test-utils';
expectRejected(res.status); // passes on 400 OR 429
```

> This is the most common flaky test in the course

<!-- note: 429 is not a bug. It's the API protecting itself. After 5 rapid signin attempts, the server rate-limits you. expectRejected treats both 400 and 429 as valid rejection responses. -->

---

## Pattern: Tests Pass Alone, Fail Together

> Shared mutable state — tests depend on execution order

```ts
// Wrong — 'read' depends on 'create' having run first
it('create', async () => { storedId = res.data.id; });
it('read',   async () => { /* uses storedId */ });

// Fix — beforeAll guarantees setup before any it()
beforeAll(async () => {
  const res = await axios.post(url, data, ...);
  storedId = res.data.id;
});
```

<!-- note: Vitest can run tests in different orders. If read runs before create, storedId is undefined. Put all shared setup in beforeAll — never inside individual it() blocks. -->

---

## Pattern: 400 on Create

> Joi validation fails before the operation runs

```ts
// Missing required fields
const res = await axios.post(`${BASE_URL}/signup`, {
  username: 'vitesttest123',
  email: 'test@example.com',
  password: 'Vitest@123456',
  // avatarImage and avatarColor missing!
}, { validateStatus: () => true });
```

> Check the Endpoint Schema in the lecture README

<!-- note: Joi validates the request before the controller runs. Any missing required field returns 400 immediately. The README has the full schema for each endpoint. -->

---

## Debugging Toolkit

```ts
// 1. Log the response — fastest feedback
console.log('status:', res.status);
console.log('data:', JSON.stringify(res.data, null, 2));

// 2. Run one test by name
// npm test -- -t "cookie capture"

// 3. Verbose reporter
// npm test -- --reporter=verbose
```

> Remove all `console.log` before committing

<!-- note: console.log is the fastest way to see what's actually coming back. But it must be removed before committing. Leftover logs clutter the output for the whole team. -->

---

## Test Isolation — The Core Rule

> Every test must run independently, in any order

```ts
// BAD — test order dependency
it('sign in', async () => { sessionCookie = ...; });
it('get user', async () => { /* uses sessionCookie */ });

// GOOD — beforeAll guarantees order
beforeAll(async () => { sessionCookie = ...; });
it('get user', async () => { /* always set */ });
```

> `fileParallelism: false` prevents cross-file interference

<!-- note: fileParallelism false prevents two test files from running at the same time against the same session on the shared server. Without it, one file's sign-out can break another file's tests. -->

---

## Key Rule

> "expected undefined to be 200" usually means `beforeAll` failed silently — check `beforeAll` first, not the endpoint

- Always use `validateStatus: () => true` in `beforeAll`
- Use `expectRejected` for auth endpoints
- Put all shared setup in `beforeAll`, never in `it()`

---

## VS Code Debugger — launch.json

Create `.vscode/launch.json` in the project root:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "run", "--reporter=verbose"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

Set a breakpoint inside any `it()` block → press **F5** → step through line by line.
The Variables panel shows `res.data`, `sessionCookie`, and all local values.

<!-- note: this is the most powerful debugging tool in the course. Once you have launch.json, you never need to litter the code with console.logs — just set a breakpoint and inspect. -->

---

## --inspect-brk — Node.js Inspector

```bash
node --inspect-brk node_modules/.bin/vitest run tests/lecture-18/debugging.spec.ts
```

Then open **`chrome://inspect`** in Chrome → click **Open dedicated DevTools for Node**.

Use the **Sources** panel to step through code line by line.

> `--inspect-brk` pauses execution before the first line — lets you set breakpoints before anything runs

<!-- note: --inspect-brk is the CLI alternative to launch.json. Useful when you don't want to configure VS Code, or when debugging a specific file in isolation. -->

---

## Switching BASE_URL via .env Override

Run tests against a different environment without editing `.env`:

```bash
# Mac / Linux — inline override
BASE_URL=http://localhost:5000/api/v1 npm test

# Windows CMD
set BASE_URL=http://localhost:5000/api/v1 && npm test

# Windows PowerShell
$env:BASE_URL="http://localhost:5000/api/v1"; npm test
```

This overrides the value in `.env` for that one shell session only.
The `.env` file is not modified.

> Use this to switch between local and production without touching any file

<!-- note: inline env override is the clean way to target a local server for a single run. It's safe because the override is session-scoped — no risk of accidentally committing the wrong BASE_URL. -->

---

## Homework

| TODO | Goal |
|------|------|
| 1 | Omit `validateStatus`, catch thrown error, assert `.response` exists |
| 2 | Sign in without capturing cookie → 401; fix it → 200 |
| 3 | Add `console.log(res.data)`, observe output, then remove it |
| 4 | Use `expectRejected([400, 429])` on a boundary POST `/signin` |
| 5 | Call GET /currentuser twice — assert both return 200 |
| 6 | `toMatch(/\S+/)` — assert error message is non-empty |
| 7 | `toBeTypeOf('string')` — assert token from successful signin |

Goal: **7 tests passing**
