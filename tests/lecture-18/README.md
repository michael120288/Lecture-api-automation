# Lecture 18 — Debugging, Environments & Test Reliability

> **Estimated time: 60–75 min**
> **Previous lecture:** Lecture 17 — Chat & Messaging
> **Before starting:** Open `prereqs.md` in this folder first (~15 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-18/lecture.test.ts
> npm test tests/lecture-18/homework/starter.test.ts
> ```

---

## What You Will Learn

- How to read a Vitest failure output: Expected vs Received, diff block, file:line reference
- Debugging failing tests — adding `console.log` temporarily, running a single file
- The 10 most common test failure patterns in this course and how to fix each one
- Test flakiness — what it is, why it happens, and how to prevent it
- Running tests against different environments (local vs production)
- Test isolation — why tests must not depend on each other
- Timing and order issues — why tests fail intermittently with async code
- The `--reporter=verbose` flag and how to read detailed output
- `toMatch(/regex/)` — asserting a string matches a regular expression
- `toBeTypeOf('string')` — Vitest-native type assertion cleaner than `typeof`

---

## Contents

| # | Section |
|---|---------|
| 1 | How to Read a Test Failure |
| 2 | The 10 Common Failure Patterns |
| 3 | Debugging Techniques |
| 4 | Test Isolation |
| 5 | Environment Management |
| 6 | Postman — Debugging with the Console |
| 7 | Endpoint Schema |
| 8 | Understanding the Test File |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. How to Read a Test Failure

When a test fails, Vitest prints a structured error block. Here is how to read it:

```
FAIL tests/lecture-18/lecture.test.ts
 × 1. Reading failure output > intentional failure example
   → AssertionError: expected 200 to be 999

   - Expected  999
   + Received  200

   at tests/lecture-18/lecture.test.ts:42:5
```

| Part | What it means |
|------|---------------|
| `FAIL tests/lecture-18/lecture.test.ts` | Which file failed |
| `× 1. Reading failure output > intentional failure example` | Which `describe` and `it` block |
| `AssertionError: expected 200 to be 999` | The assertion that failed: `.toBe(999)` on a `200` |
| `- Expected  999` | What you wrote in the test |
| `+ Received  200` | What the code actually returned |
| `at tests/lecture-18/lecture.test.ts:42:5` | Exact file and line — click it in VS Code |

**Rule:** Always read the `- Expected` / `+ Received` diff before assuming a bug in the API.
Most failures are caused by a wrong assertion or a wrong property path in the test.

---

## 2. The 10 Common Failure Patterns

### Pattern 1 — "Cannot read properties of undefined"

**Symptom:**
```
TypeError: Cannot read properties of undefined (reading 'token')
```

**Why it happens:** `beforeAll` ran but the signin failed silently, leaving `sessionCookie` as `''`.
Every subsequent test that reads `res.data.token` receives `undefined` because no cookie was sent.

**Wrong:**
```ts
// beforeAll does NOT call validateStatus — axios throws on 401, beforeAll fails silently
const r = await axios.post(`${config.BASE_URL}/signin`, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD });
const raw = r.headers['set-cookie'];
sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
```

**Fix:**
```ts
// Always validateStatus in beforeAll so axios never throws
const r = await axios.post(`${config.BASE_URL}/signin`,
  { username: config.TEST_USERNAME, password: config.TEST_PASSWORD },
  { validateStatus: () => true },
);
const raw = r.headers['set-cookie'];
sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
```

---

### Pattern 2 — "Expected 200, received 401"

**Symptom:**
```
AssertionError: expected 401 to be 200
```

**Why it happens:** The cookie was not captured from the signin response, or was captured but not passed in the request headers.

**Wrong:**
```ts
const r = await axios.post(`${config.BASE_URL}/signin`, credentials, { validateStatus: () => true });
// forgot to capture the cookie — sessionCookie stays ''

const res = await axios.get(`${config.BASE_URL}/currentuser`, {
  headers: { Cookie: sessionCookie },  // sessionCookie is '', server rejects request
  validateStatus: () => true,
});
expect(res.status).toBe(200);  // gets 401 instead
```

**Fix:**
```ts
const r = await axios.post(`${config.BASE_URL}/signin`, credentials, { validateStatus: () => true });
const raw = r.headers['set-cookie'];
sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');  // capture here

const res = await axios.get(`${config.BASE_URL}/currentuser`, {
  headers: { Cookie: sessionCookie },  // now non-empty
  validateStatus: () => true,
});
expect(res.status).toBe(200);
```

---

### Pattern 3 — "Expected 200, received 429"

**Symptom:**
```
AssertionError: expected 429 to be 400
```

**Why it happens:** You are testing a negative path on an auth endpoint (`/signin`, `/signup`).
These are rate-limited to 5 req/min. After a few runs the server returns 429 instead of 400.
Both mean the request was correctly rejected.

**Wrong:**
```ts
const res = await axios.post(`${config.BASE_URL}/signin`,
  { username: 'x', password: 'y' },
  { validateStatus: () => true },
);
expect(res.status).toBe(400);  // fails when rate limited — returns 429
```

**Fix:**
```ts
import { expectRejected } from '../../src/test-utils';

const res = await axios.post(`${config.BASE_URL}/signin`,
  { username: 'x', password: 'y' },
  { validateStatus: () => true },
);
expectRejected(res.status);  // accepts 400 OR 429
```

---

### Pattern 4 — "Expected string, received undefined"

**Symptom:**
```
AssertionError: expected undefined to be a string
```

**Why it happens:** The property path in `res.data` is wrong. The response uses `res.data.user.token`, but the test reads `res.data.token`.

**Wrong:**
```ts
expect(res.data.token).toBeTypeOf('string');  // undefined — token is nested under 'user'
```

**Fix:**
```ts
// Check the actual shape first:
// console.log(res.data);  // { message: 'User login successful', token: 'eyJ...', user: {...} }
expect(res.data.token).toBeTypeOf('string');   // correct if token is at the top level
// OR
expect(res.data.user.token).toBeTypeOf('string'); // correct if nested under 'user'
```

> **Tip:** When in doubt, add `console.log(res.data)` before your assertion, run the test once, read the output, then remove the log.

---

### Pattern 5 — Tests pass alone but fail together

**Symptom:** Each test passes when run in isolation (`npm test -- -t "test name"`) but fails when the full file runs.

**Why it happens:** Shared mutable state. One test writes to a variable (`let result = ''`) and a later test reads it, assuming the first test has already run. If test order changes, or if the first test is skipped, the second test reads the wrong value.

**Wrong:**
```ts
let storedId = '';

it('create resource', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  storedId = res.data.id;  // sets shared state
});

it('read resource', async () => {
  // assumes 'create resource' already ran — fails if tests run in different order
  const res = await axios.get(`${url}/${storedId}`, { validateStatus: () => true });
  expect(res.status).toBe(200);
});
```

**Fix:** Use `beforeAll` to set up shared state explicitly. When state flows from one test to the next, write the setup once in `beforeAll` — not inside individual `it()` blocks.

```ts
let storedId = '';

beforeAll(async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  storedId = res.data.id;  // guaranteed to run before any it()
});

it('read resource', async () => {
  const res = await axios.get(`${url}/${storedId}`, { validateStatus: () => true });
  expect(res.status).toBe(200);
});
```

---

### Pattern 6 — "Expected 201, received 400"

**Symptom:**
```
AssertionError: expected 400 to be 201
```

**Why it happens:** The request body fails Joi validation. Common causes: a required field is missing, a string is too short, or an email is malformed.

**Wrong:**
```ts
// Forgot avatarColor — required by signup schema
const res = await axios.post(`${config.BASE_URL}/signup`, {
  username: `vitesttest123`,
  email: 'test@example.com',
  password: 'Vitest@123456',
  // avatarImage: ...,  missing
  // avatarColor: ...,  missing
}, { validateStatus: () => true });
expect(res.status).toBe(201);  // returns 400 — validation fails
```

**Fix:** Always check the Endpoint Schema section in the lecture README before writing a signup/create test. Include every required field.

---

### Pattern 7 — `afterAll` cleanup fails with 404

**Symptom:**
```
AssertionError: expected 404 to be 200
  at afterAll
```

**Why it happens:** The test already deleted the resource (delete test ran successfully), then `afterAll` tries to delete it again — it is already gone.

**Fix:** Use the `postDeleted` flag pattern (STANDARDS.md §18):
```ts
let postDeleted = false;

it('DELETE post returns 200', async () => {
  const res = await axios.delete(url, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
  if (res.status === 200) postDeleted = true;
});

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(url, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  }
  // sign out...
});
```

---

### Pattern 8 — "connect ECONNREFUSED"

**Symptom:**
```
AxiosError: connect ECONNREFUSED 127.0.0.1:5000
```

**Why it happens:** `BASE_URL` in your `.env` points to a local server that is not running, or the URL is missing the `/api/v1` path prefix.

**Fix:**
1. Check `.env` — `BASE_URL` should be `https://api.codeandtest.com/api/v1` for production, or `http://localhost:5000/api/v1` for local
2. If local: confirm the chatty-backend server is running (`npm run dev` in the `chatty-backend/` folder)
3. Check `src/config.ts` — it throws if `BASE_URL` is missing, so a blank `.env` gives a clear error

---

### Pattern 9 — "TypeError: Cannot read 'token' of undefined" in `beforeAll`

**Symptom:**
```
TypeError: Cannot read properties of undefined (reading 'token')
  at Object.<anonymous> (tests/lecture-XX/lecture.test.ts:18:44)
  at beforeAll
```

**Why it happens:** `signin` failed — wrong `TEST_USERNAME` or `TEST_PASSWORD` in `.env`, or the account does not exist on `codeandtest.com`.

**Fix:**
1. Open `.env` — confirm `TEST_USERNAME` and `TEST_PASSWORD` match your real account credentials
2. Test manually: `curl -s -X POST https://api.codeandtest.com/api/v1/signin -H "Content-Type: application/json" -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}' | jq .`
3. If the account is missing, create it via Postman or the Chatty frontend first

---

### Pattern 10 — Intermittent failures (flaky tests)

**Symptom:** A test passes most of the time but fails once every few runs, with no consistent trigger.

**Why it happens:**
- **Rate limiting** — auth endpoint returns 429 intermittently. Fix: use `expectRejected(res.status)`.
- **Async ordering** — a test reads data that a previous test is still writing. Fix: use `beforeAll` for setup, never depend on test execution order.
- **Race conditions** — two concurrent tests modify the same resource. Fix: set `fileParallelism: false` in `vitest.config.ts` (already set in this project).

---

## 3. Debugging Techniques

### console.log — quickest way to inspect

Add a temporary log before the assertion that is failing:

```ts
it('token is present', async () => {
  const res = await axios.post(`${config.BASE_URL}/signin`, credentials, { validateStatus: () => true });
  console.log('signin status:', res.status);       // check the status
  console.log('signin data:', res.data);           // see the full response body
  console.log('signin headers:', res.headers);     // check if set-cookie is present
  expect(res.data.token).toBeTypeOf('string');
});
```

**Rule:** Always remove `console.log` before committing. It clutters the test output and confuses other team members.

### --reporter=verbose

By default, Vitest prints only failed tests. With `--reporter=verbose` it prints every test name as it runs — useful for seeing which tests ran before a failure:

```bash
npm test tests/lecture-18/lecture.test.ts -- --reporter=verbose
```

Sample output:
```
 ✓ 1. Reading failure output > correct assertion passes
 ✓ 2. Common failure: missing validateStatus > wrong way is caught by try/catch
 ✓ 2. Common failure: missing validateStatus > right way returns 200
 × 3. Cookie capture pattern > ...
```

### Run a single file

To run only one lecture's tests without running the whole suite:

```bash
npm test tests/lecture-18/lecture.test.ts
```

To run a single named test (by partial name match):

```bash
npm test tests/lecture-18/lecture.test.ts -- -t "cookie capture"
```

### VS Code debugger

Create `.vscode/launch.json`:

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

Set a breakpoint inside any `it()` block, press F5, and step through line by line.
The Variables panel shows `res.data`, `sessionCookie`, and all other local values.

### Node.js inspector

```bash
node --inspect-brk node_modules/.bin/vitest run tests/lecture-18/lecture.test.ts
```

Open `chrome://inspect` in Chrome, click **Open dedicated DevTools for Node**, and use the Sources panel to step through the code.

---

## 4. Test Isolation

Test isolation means each test can run independently of every other test. Violations cause flaky, order-dependent failures.

### `fileParallelism: false`

This project's `vitest.config.ts` sets `fileParallelism: false`. This means test files run one at a time (not in parallel). Within a single file, tests run in the order they are written.

**Why:** Chatty's API uses session cookies. If two test files run in parallel and both sign in as `TEST_USERNAME`, they can interfere with each other's session state.

### Why tests must be independent

```ts
// BAD — test 2 depends on test 1 having run first
let sessionCookie = '';

it('sign in', async () => {
  const r = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  expect(r.status).toBe(200);
});

it('get current user', async () => {
  // If 'sign in' is skipped or fails, sessionCookie is '' and this returns 401
  const res = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
});
```

```ts
// GOOD — beforeAll guarantees setup before any test runs
let sessionCookie = '';

beforeAll(async () => {
  const r = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

it('get current user', async () => {
  const res = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
});
```

---

## 5. Environment Management

### .env for local development

Your `.env` file holds the runtime config for local runs:

```
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=vitestyourname
TEST_PASSWORD=Vitest@123456
```

**Rules:**
- Never commit `.env` — it is in `.gitignore`
- Never hardcode `BASE_URL` or credentials in test files
- Always read from `config.BASE_URL` and `config.TEST_USERNAME`

### Switching between environments

To run tests against a different environment without editing `.env`, set the variable inline:

```bash
BASE_URL=http://localhost:5000/api/v1 npm test
```

> **Windows users:** Use `set BASE_URL=http://localhost:5000/api/v1 && npm test` (CMD) or `$env:BASE_URL="http://localhost:5000/api/v1"; npm test` (PowerShell).

### GitHub Secrets for CI

In CI (GitHub Actions), environment variables come from GitHub Secrets — not from `.env`.
In `.github/workflows/test.yml`:

```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

This is safe because GitHub encrypts secrets and never logs them. Your `.env` stays local only.

---

## 6. Postman — Debugging with the Console

The Postman Console is the equivalent of `console.log` for Postman scripts.

### Open the Console

- Mac: `Cmd + Alt + C`
- Windows/Linux: `Ctrl + Alt + C`
- Or: View menu → Postman Console

### What the Console shows

When you send a request, the Console shows:
- The full request URL (including query params)
- Request headers (including cookies)
- Response status and headers
- Response body (raw)
- Any `console.log()` calls from your `pm.test()` scripts

### Add a log to your test script

In the **Tests** tab of any request:
```js
console.log('Response status:', pm.response.code);
console.log('Response body:', pm.response.json());
console.log('Cookie header:', pm.request.headers.get('Cookie'));
```

This is the fastest way to confirm whether a variable like `{{sessionCookie}}` is actually populated before a request is sent.

---

## 7. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`

This lecture does not introduce new endpoints. It uses the endpoints from earlier lectures:

| Method | Path | Used to demonstrate |
|--------|------|---------------------|
| POST | `/signin` | Cookie capture, rate limiting, `expectRejected` |
| GET | `/currentuser` | Auth guard (401 without cookie) |

Refer to the Lecture 02 README for the full signin schema and boundary values.

---

## 8. Understanding the Test File

`lecture.test.ts` is structured around the 10 failure patterns and their fixes.
Each `describe` block shows a real scenario — what the broken code looked like and what the correct code does.

**Key patterns demonstrated:**

| Describe block | What it shows |
|----------------|---------------|
| 1. Reading failure output | An intentional `.toBe(999)` → how Vitest formats the error; then the correct assertion |
| 2. Missing validateStatus | `try/catch` to catch axios throws; correct `validateStatus: () => true` |
| 3. Cookie capture | Signing in without capturing cookie → 401; correct capture → 200 |
| 4. Rate limiting resilience | `expectRejected([400, 429])` on an invalid signin |
| 5. Test isolation | Why shared mutable state breaks ordering; `beforeAll` fix |
| 6. Verbose output | A test that logs `res.status` and `res.data` — shows what to log and then remove |
| 7. Assertion variants | `toMatch(/\S+/)` on an error message; `toBeTypeOf('string')` on a token field |

All tests in the file **pass**. The "intentional failure" patterns are shown via `try/catch` or restructured to illustrate the problem without actually failing the suite.

---

## 9. Running the Tests

```bash
npm test tests/lecture-18/lecture.test.ts
```

With verbose output:
```bash
npm test tests/lecture-18/lecture.test.ts -- --reporter=verbose
```

**Expected output:** All tests pass. You should see 7 describe blocks and ~12 individual tests.

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing env var: BASE_URL` | `.env` file missing or empty | Copy `.env.example` to `.env`, fill it in |
| `expected 401 to be 200` | Wrong `TEST_USERNAME` or `TEST_PASSWORD` | Check `.env` credentials |
| `connect ECONNREFUSED` | `BASE_URL` points to local server that is not running | Use production URL or start local server |
| `expected 429 to be 400` | Rate limited | Use `expectRejected(res.status)` — already done in lecture file |

---

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-18/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-18: debugging and test reliability"

# Push the branch to GitHub
git push -u origin lecture-18-debugging
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-18: debugging and test reliability`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start homework

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-18-debugging-homework
```

---

## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | Deliberately omit `validateStatus`, catch the thrown error, assert it has a `.response` property |
| 2 | Sign in without capturing the cookie → assert 401; then fix it → assert 200 |
| 3 | Add `console.log(res.data)` to a test, run it, observe the output, remove the log |
| 4 | Use `expectRejected([400, 429])` on a boundary-value POST `/signin` test |
| 5 | Call `GET /currentuser` twice with the same cookie — assert both return 200 (idempotency) |
| 6 (toMatch) | Assert the error message from a failed request matches `/\S+/` |
| 7 (toBeTypeOf) | Assert the token from a successful signin is `toBeTypeOf('string')` |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-18/homework/starter.test.ts
```
