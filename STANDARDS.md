# chatty-api-tests — Coding Standards

This file defines the rules for writing tests in this project.
When in doubt, read this file. When you find a new rule, add it here.

---

## 1. File Structure

Every lecture folder contains exactly these files:

```
tests/lecture-XX/
  README.md               ← lecture notes, theory, setup, Postman, homework instructions
  lecture.test.ts         ← main test file (reference implementation, heavily commented)
  homework/
    starter.test.ts       ← Vitest TODOs — structure only, no implementations
    solution.test.ts      ← Vitest solutions with WHY explanations
    postman-tasks.md      ← Postman tasks — what to do, hints only, no scripts
    postman-solution.md   ← Postman solutions — full pm.test() scripts + explanations
```

**Exception — infrastructure lectures (11, 12, 13):**
Lectures 11 (CI/CD), 12 (Docker), and 13 (Reporting) do NOT have `lecture.test.ts`,
`homework/starter.test.ts`, `homework/solution.test.ts`, `homework/postman-tasks.md`,
or `homework/postman-solution.md`.
Their homework folder contains only `homework/README.md` — a checklist of 5 core infrastructure
setup tasks plus 5 stretch tasks and 5 reflection questions.

Source files shared across lectures live in `src/`:

```
src/
  config.ts               ← BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL
  interfaces.ts           ← TypeScript interfaces for all API shapes
  test-utils.ts           ← expectRejected(), expectSuccess()
  fixtures.ts             ← TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET
```

---

## 2. Imports — Order and Style

Always import in this order:

```ts
// 1. External packages
import axios, { type AxiosResponse } from 'axios';
import { faker } from '@faker-js/faker';       // when needed
import { MongoClient } from 'mongodb';          // Lecture 10 only

// 2. Internal source files
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';
import { TEST_AVATAR_IMAGE, TEST_CLEANUP_SECRET } from '../../src/fixtures';  // when needed
```

Use `type` imports for types that are not used at runtime:

```ts
import { type AxiosResponse } from 'axios';   // ✅
import { AxiosResponse } from 'axios';         // ✗ — runtime import for a type-only use
```

---

## 3. Shared Requests — Use `beforeAll`

**Rule: Never make the same HTTP request more than once in a test file.**

If multiple tests assert on the same endpoint with the same input,
make ONE request in `beforeAll` and share the response.

```ts
// ✅ Correct — one request, many assertions
let response!: AxiosResponse;

beforeAll(async () => {
  response = await axios.post(url, data, { validateStatus: () => true });
});

it('status is 400', () => { expect(response.status).toBe(400); });
it('message exists', () => { expect(response.data).toHaveProperty('message'); });
```

```ts
// ✗ Wrong — three requests for the same data
it('status is 400', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  expect(res.status).toBe(400);
});
it('message exists', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true }); // duplicate!
  expect(res.data).toHaveProperty('message');
});
```

Use `let response!: AxiosResponse` — the `!` (definite assignment assertion) tells
TypeScript the variable will be assigned in `beforeAll` before any test reads it.

---

## 4. `validateStatus: () => true` — Always Required

**Rule: Always pass `validateStatus: () => true` on every Axios request in tests.**

Without it, Axios throws on any 4xx/5xx response and your `expect()` never runs.

```ts
// ✅
const response = await axios.post(url, data, { validateStatus: () => true });

// ✗ — will throw on 400, 401, 404, etc.
const response = await axios.post(url, data);
```

---

## 5. Rate Limiting — Use `expectRejected`

**Rule: Never assert `.toBe(400)` alone on a production auth endpoint.**

Production auth endpoints (`/signin`, `/signup`) are rate-limited to 5 req/min.
After a few test runs the server returns 429 instead of 400.

Import and use `expectRejected` from `src/test-utils.ts`:

```ts
import { expectRejected } from '../../src/test-utils';

const res = await axios.post(url, badData, { validateStatus: () => true });
expectRejected(res.status);  // accepts 400 OR 429
```

When asserting the error message, guard with an `if`:

```ts
expectRejected(res.status);
if (res.status === 400) {
  expect(res.data.message).toBe('Invalid credentials');
}
```

For tests that use `sharedResponse` (from `beforeAll`), guard shape assertions:

```ts
it('response body matches error shape', () => {
  if (response.status === 429) {
    expect(response.data).toHaveProperty('message');
    return;
  }
  expect(response.data).toMatchObject({ ... });
});
```

---

## 6. Matchers — When to Use Which

| Matcher | Use when | Example |
|---------|----------|---------|
| `.toBe(x)` | Exact primitive equality (`===`) | `.toBe(400)`, `.toBe('error')` |
| `.toEqual(x)` | Deep equality for objects/arrays | `.toEqual({ id: 1, name: 'Alice' })` |
| `.toStrictEqual(x)` | Like `toEqual` but also checks `undefined` properties and object types | `.toStrictEqual({ a: undefined })` |
| `.toContain(x)` | String includes substring, or array includes item | `.toContain('application/json')` |
| `.toMatch(/regex/)` | String matches a regular expression | `.toMatch(/^[a-f0-9]{24}$/)` |
| `.toHaveProperty(key)` | Object has the key (existence only) | `.toHaveProperty('message')` |
| `.toMatchObject({...})` | Object contains at least these keys/values | `.toMatchObject({ status: 'error' })` |
| `.toBeGreaterThan(n)` | Number > n | `.toBeGreaterThan(0)` |
| `.toBeGreaterThanOrEqual(n)` | Number >= n | `.toBeGreaterThanOrEqual(0)` |
| `.toBeLessThanOrEqual(n)` | Number <= n | `.toBeLessThanOrEqual(10)` |
| `.toBeDefined()` | Value is not `undefined` | `.toBeDefined()` |
| `.toBeNull()` | Value is strictly `null` | `.toBeNull()` |
| `.toBeTruthy()` | Value is truthy (non-empty string, non-zero number, etc.) | `.toBeTruthy()` |
| `.toBeFalsy()` | Value is falsy (false, 0, '', null, undefined) | `.toBeFalsy()` |
| `.toBeTypeOf('string')` | Vitest-specific — cleaner than `typeof x === 'string'` | `.toBeTypeOf('number')` |
| `.toSatisfy(fn)` | Value passes a custom predicate function | `.toSatisfy((t: string) => t.split('.').length === 3)` |
| `expect.any(Type)` | Inside `toMatchObject` — value is of Type | `message: expect.any(String)` |
| `expect.arrayContaining([...])` | Array contains all the specified elements (order-independent) | `.toEqual(expect.arrayContaining([{_id: expect.any(String)}]))` |
| `expect.objectContaining({...})` | Asymmetric — object contains at least these keys | `expect.objectContaining({ _id: expect.any(String) })` |
| `expect.stringContaining('x')` | Asymmetric — string contains substring | `expect.stringContaining('successfully')` |
| `expect.stringMatching(/regex/)` | Asymmetric — string matches regex | `expect.stringMatching(/session=/)` |
| `.not.matcher` | Negate any of the above | `.not.toHaveProperty('password')` |

**Always prefer the most specific matcher:**

```ts
expect(response.data.message).toHaveProperty('message');  // ✗ — only checks existence
expect(response.data.message).toBe('Invalid credentials'); // ✅ — checks exact value
```

---

## 7. Async Style — `async/await` vs `.then()`

Both are valid. Use `async/await` by default. Use `.then()` when explicitly
demonstrating promise chains (e.g. in lecture sections comparing both styles).

```ts
// ✅ Default — async/await
it('returns 400', async () => {
  const res = await axios.post(url, data, { validateStatus: () => true });
  expect(res.status).toBe(400);
});

// ✅ Also valid — .then() when showing both styles
it('returns 400', () => {                         // no `async`
  return axios.post(url, data, { validateStatus: () => true })  // MUST return
    .then(res => {
      expect(res.status).toBe(400);
    });
});
```

**`.then()` rules:**
1. Do NOT use `async` on the test function
2. You MUST `return` the Promise — forgetting causes a silent false positive
3. Never mix `await` and `.then()` in the same test

---

## 8. Test Naming

Format: `'[what is being tested] [condition] [expected result]'`

```ts
// ✅
it('POST /signin with wrong credentials returns 400', ...)
it('response does not expose a password field', ...)
it('username shorter than 4 chars is rejected', ...)

// ✗ — too vague
it('test signin', ...)
it('returns error', ...)
it('works correctly', ...)
```

Describe block names follow the pattern: `'N. Category name'`

```ts
describe('1. Basic assertions', ...)
describe('6. Boundary value tests — Joi schema limits', ...)
```

---

## 9. TypeScript

- Always type `response` explicitly: `let response!: AxiosResponse`
- Use `type` keyword for type-only imports: `import { type AxiosResponse } from 'axios'`
- Never use `any` — use the correct type or `unknown`
- Interfaces for API shapes live in `src/interfaces.ts` — import from there

---

## 10. Comments in Test Files

Comment the WHY, not the WHAT.

```ts
// ✅ — explains why
// validateStatus: () => true prevents axios from throwing on 4xx/5xx.
// Without it, the test crashes before reaching expect().
const res = await axios.post(url, data, { validateStatus: () => true });

// ✗ — restates what the code already says
// Make a POST request to the URL with data
const res = await axios.post(url, data, { validateStatus: () => true });
```

Exception: `lecture.test.ts` files are educational — comment both WHAT and WHY
to explain every line for students reading the file for the first time.

---

## 11. Homework File Rules

Every lecture homework folder (lectures 01–10, 14–17) contains exactly 4 files:

```
homework/
  starter.test.ts       ← Vitest TODOs (no implementations)
  solution.test.ts      ← Vitest solutions with WHY explanations
  postman-tasks.md      ← Postman tasks (no scripts, only what to do + hints)
  postman-solution.md   ← Postman solutions (full pm.test() scripts + explanations)
```

**Exception — infrastructure lectures (11, 12, 13):** homework folder contains only `README.md`
(5 core tasks + 5 stretch tasks + 5 reflection questions). No test files, no Postman files.
See §1 for the full exception rule.

**`starter.test.ts`:**
- Every TODO block has a descriptive comment with hints
- The test function body contains ONLY `// write your code here`
- Variable declarations needed for the test are already provided
- Never provide the implementation — only the structure
- Standard homework has **7 TODOs**: TODOs 1–5 cover the lecture's core patterns; TODO 6 and TODO 7 introduce new assertion variants (`toMatch`, `toBeTypeOf`, `toSatisfy`, `expect.arrayContaining`, etc.)

**`solution.test.ts`:**
- Every solution has a comment explaining WHY, not just what it does
- The explanation should cover things the student might have gotten wrong
- Use the same variable names and structure as the starter for easy comparison

**`postman-tasks.md`:**
- Numbered tasks (Task 1, Task 2, etc.)
- Each task states what to assert — not how
- Provide Postman-specific hints (`.to.include()`, `pm.environment.set()`, etc.)
- End with a Stretch task using the Collection Runner
- Never include the full `pm.test()` script — only describe what it should do

**`postman-solution.md`:**
- Full `pm.test()` scripts for every task
- A WHY explanation after each solution (why this matcher, why this pattern)
- The Stretch solution explains what Collection Runner order means in practice
- Cover edge cases the student might have gotten wrong (`.eql()` vs `.equal()`, etc.)

---

## 12. Endpoint Schema Section (required in every lecture README)

Every lecture README **must** include an **Endpoint Schema & Validation Rules** section
placed right after the HTTP anatomy / endpoint overview and before any test code.

The schema comes directly from the Joi validation file in `chatty-backend/src/features/`.
Reading it tells the student exactly what inputs are valid, what triggers a 400, and
what the boundary values are for tests in section 6.

**Live alternatives (always up to date):**
- `GET https://api.codeandtest.com/api/v1/schema` — all endpoints + validation rules as JSON
- `https://api.codeandtest.com/api-docs` — interactive Swagger UI

Every Endpoint Schema section in a README must include this notice immediately after the heading:
```markdown
> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`
```

### Format

```markdown
## X. Endpoint Schema & Validation Rules

**Endpoint:** `POST /api/v1/<path>`
**Validated by:** `chatty-backend/src/features/<feature>/schemas/<file>.ts`

| Field | Type | Required | Constraints | Error message (400) |
|-------|------|----------|-------------|---------------------|
| fieldName | string | ✅ | min 4, max 20 | 'Field must be at least 4 characters' |
| fieldName | string | ✅ | valid email format | 'Field must be valid' |
| fieldName | string | ✅ | pattern: 1 upper + 1 lower + 1 digit + 1 special | 'Password must contain...' |
| fieldName | string | ❌ | — | — |
```

**Rules for the schema table:**
- ✅ = required, ❌ = optional
- List ALL fields from the Joi schema, including optional ones
- Constraints column: write in plain English, not Joi syntax
- Error message: copy the exact string from the `.messages({})` call in the schema file
- If Joi uses `{#limit}` placeholder, replace it with the actual number
- Add a **Boundary values** sub-section listing the exact edge cases to test

### Example (signin endpoint)

```markdown
**Endpoint:** `POST /api/v1/signin`
**Schema:** `chatty-backend/src/features/auth/schemas/signin.ts`

| Field | Type | Required | Constraints | Error message (400) |
|-------|------|----------|-------------|---------------------|
| username | string | ✅ | min 4 chars, max 32 chars | `'Invalid username'` |
| password | string | ✅ | min 8 chars, max 128 chars | `'Invalid password'` |

**Boundary values to test:**
- username 3 chars → 400 `'Invalid username'`
- username 33 chars → 400 `'Invalid username'`
- password 7 chars  → 400 `'Invalid password'`
- password 129 chars → 400 `'Invalid password'`
- missing username → 400 `'"username" is required'`
- missing password → 400 `'"password" is required'`
```

---

## 13. One Account Per Student

**Rule: Every student must have their own unique test account on `codeandtest.com`.**

Do NOT share `TEST_USERNAME` between students.

**Why:** From Lecture 4 onwards, tests modify the profile of `TEST_USERNAME`
(work, quote, notifications, followers etc.). If two students use the same account
simultaneously their `beforeAll`/`afterAll` hooks will overwrite each other's data,
causing non-deterministic test failures.

**Rule:** `TEST_USERNAME` must:
- Start with `vitest` (required by the cleanup endpoint safety guard)
- Be unique per student — include their name: `vitestmike`, `vitestanna`, `vitestjohn`
- Never be shared

**Rate limiting note:** The nginx rate limiter is **per IP address**.
If students are on different networks they have independent quotas — no conflict.
If students share a network (same WiFi) they share the 5 req/min quota on auth
endpoints — some requests will hit 429. Always use `expectRejected()` in auth tests.

---

## 14. Environment Variables

**Variables in `.env` and `vitest.config.ts`:**

| Variable | Used from | Required from |
|----------|-----------|--------------|
| `BASE_URL` | `config.BASE_URL` | Lecture 1 |
| `TEST_USERNAME` | `config.TEST_USERNAME` | Lecture 2 |
| `TEST_PASSWORD` | `config.TEST_PASSWORD` | Lecture 2 |
| `DATABASE_URL` | `config.DATABASE_URL` | Lecture 10 |
| `TEST_CLEANUP_SECRET` | `fixtures.TEST_CLEANUP_SECRET` | **NOT in `.env`** — hardcoded in `src/fixtures.ts` |

Rules:
- Never hardcode URLs or secrets in test files
- Import from `src/config.ts` or `src/fixtures.ts`
- All env vars used in tests must be declared in `vitest.config.ts` under `env: {}`

```ts
// ✅
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';
const url = `${config.BASE_URL}/signin`;

// ✗ — hardcoded
const url = 'https://api.codeandtest.com/api/v1/signin';
```

---

## 15. README Structure (required sections in order)

Every lecture README must contain these sections in this order:

| # | Section title | Content |
|---|--------------|---------|
| — | **What You Will Learn** | Bullet list — ALL concepts covered in the lecture |
| 1 | **Prerequisites / Theory** | What the student needs before starting |
| 2–N | **Concept sections** | JWT, cookies, async, etc. — one section per new concept |
| N | **Shared Utilities** | `src/test-utils.ts` — `expectRejected`, `expectSuccess` |
| N | **Postman** | Setup, requests, Tests tab scripts, Collection Runner |
| N | **Endpoint Schema & Validation Rules** | Joi schema table + boundary values |
| N | **Understanding the Test File** | Explains patterns used in `lecture.test.ts` |
| N | **Running the Tests** | Command, expected output, common errors table |
| N | **Git** | Branch command, commit message |
| — | **Homework** | Instructions pointing to `homework/` folder |

**Rules:**
- "What You Will Learn" must list every concept covered — including assertions, rate limiting, utils
- Every new concept introduced in the test file must have a section in the README first
- Never reference another lecture's README — repeat the concept if needed (self-contained)

---

## 16. `afterAll` — Cleanup Rule

**Rule: Every test suite that creates a session must sign out in `afterAll`.**

```ts
afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

**Rule: Every test suite that creates a user must delete it in `afterAll`.**

```ts
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

afterAll(async () => {
  if (!authId) return;
  await axios.delete(`${config.BASE_URL}/test/cleanup/user/${authId}`, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },  // from fixtures, not config
    validateStatus: () => true,
  });
});
```

`afterAll` always runs — even when tests fail. This ensures the production database
stays clean regardless of test outcomes.

---

## 17. Lecture Test File Structure

Every `lecture.test.ts` must organise tests into numbered `describe` blocks:

```
1. Basic assertions          — status code, field existence
2. Exact value assertions    — what the values ARE, not just that they exist
3. One request, many checks  — beforeAll pattern demonstrated
4. Shape validation          — toMatchObject, expect.any()
5. Negative assertions       — .not.toHaveProperty(), .not.toBe()
6. Boundary value tests      — edges of the Joi schema (min/max/missing fields)
7. Header assertions         — Content-Type, set-cookie
8. Response time             — Date.now() before/after
9. Assertion variants        — toMatch, toBeTypeOf, toSatisfy, expect.arrayContaining, etc.
```

Not every lecture needs all 9 — add only those relevant to the endpoint.
Always keep the same numbering so students recognise the pattern across lectures.
The boundary section (6) must match the boundary values table in the README schema section.
Section 9 (Assertion variants) always introduces 3–4 assertion types not used in earlier sections of the same file.

---

## 18. `postDeleted` / Resource Deletion Flag

When a test **both tests deletion AND must clean up in `afterAll`**, use a flag:

```ts
let postDeleted = false;

// In the delete test:
const res = await axios.delete(url, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
if (res.status === 200) postDeleted = true;

// In afterAll:
afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(url, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  }
});
```

**Why:** Without the flag, if the delete test passes, `afterAll` tries to delete the same
resource again — which returns 404 (already gone). This is harmless but noisy.
The flag prevents the double-delete without hiding real failures.

Apply this pattern to any resource that is both **tested for deletion** AND **created in `beforeAll`**.

---

## 19. Two-User Scenario

When a test requires **two different users interacting** (e.g. follow, block, notifications, chat):
Used in **Lecture 09** (followers) and **Lecture 17** (chat).

1. Sign in as **user A** (`TEST_USERNAME`) in `beforeAll`
2. Create **user B** dynamically with Faker.js + signup in `beforeAll`
3. Get user A's `_id` from `GET /currentuser`
4. Get user B's `_id` and `authId` from the signup response
5. In `afterAll`: delete user B via the cleanup endpoint, then sign out

```ts
let userAId = '';
let userBId = '';
let userBAuthId = '';

beforeAll(async () => {
  // Sign in user A, get _id
  const curRes = await axios.get(`${config.BASE_URL}/currentuser`, { headers: { Cookie }, ... });
  userAId = curRes.data.user._id;

  // Create user B
  const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });
  userBId     = signupRes.data.user._id;
  userBAuthId = signupRes.data.user.authId;
});

afterAll(async () => {
  await axios.delete(`${config.BASE_URL}/test/cleanup/user/${userBAuthId}`, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
  });
  await axios.post(`${config.BASE_URL}/signout`, {}, { headers: { Cookie }, validateStatus: () => true });
});
```

---

## 20. Course Lecture List

| # | Title | Key new concept |
|---|-------|----------------|
| 01 | Setup & First Test | Project setup, 8 assertion patterns, async/await |
| 02 | SignIn | Cookie capture, JWT, positive testing |
| 03 | SignUp | Faker.js, avatarImage, test cleanup lifecycle |
| 04 | Current User & Profile | State verification (PUT then GET), `afterAll` restore |
| 05 | Posts — Full CRUD | No ID on create, `postDeleted` flag, ObjectId validation |
| 06 | Reactions | 6 types, `encodeURIComponent(JSON.stringify(...))` DELETE param |
| 07 | Comments | POST returns 200 (not 201), full CRUD, GET-then-find |
| 08 | User Profile Search | Regex search, social links, change-password validation only |
| 09 | Followers & Notifications | Two-user scenario, unfollow needs both IDs |
| 10 | MongoDB | MongoClient, `findOne()`, cross-validation, read-only |
| 11 | CI/CD — GitHub Actions | YAML, matrix strategy, secrets, artifacts |
| 12 | Docker | Dockerfile for test runner, `.dockerignore`, docker-compose |
| 13 | Test Reporting | Vitest reporters, coverage, Newman CLI |
| 14 | Password Reset & SSO | Multi-step flows, testing partial flows, SSO via JWT |
| 15 | Posts with Media | Image/video upload, `postWithImageSchema`, filtered GET |
| 16 | User Profile Pages & Images | GET-heavy testing, 4 profile variants, image management |
| 17 | Chat & Messaging | Two-user conversation, `conversationId` lifecycle, delete message/conversation |

---

## 21. Knowledge Base — `docs/topics/`

The `docs/topics/` folder contains **40 standalone reference files** — one per tool, concept, or pattern used in the course. These are NOT lecture notes. They are self-contained deep-dive explanations that students can read independently of any lecture.

```
docs/topics/
  what-is-api-testing.md    async-await.md         jwt.md
  rest.md                   typescript-basics.md   cookies-sessions.md
  http-requests.md          environment-variables.md  bcrypt.md
  http-status-codes.md      axios.md               rate-limiting.md
  http-headers.md           vitest.md              sso.md
  positive-testing.md       faker.md               mongodb.md
  negative-testing.md       postman.md             redis.md
  boundary-testing.md       newman.md              json.md
  github-actions.md         docker.md              base64.md
  coverage.md               test-lifecycle.md      url-encoding.md
  test-cleanup.md           state-verification.md  joi-validation.md
  two-user-scenario.md      test-data-strategy.md  cloudinary.md
  cli-basics.md             npm-commands.md        git-commands.md
  pagination.md
```

**Rules for topic files:**
- One file per concept — do not combine multiple unrelated topics
- Each file must be self-contained — do not assume the reader has read any lecture
- Include: theory, real Chatty API code examples, common mistakes, related topics links
- Cross-link related files using relative paths: `[JWT](jwt.md)`
- When a new concept is introduced in a lecture that doesn't have a topic file — create one

**How lecture READMEs reference topic files:**
Add a callout in the relevant theory section:
```markdown
> New to JWT? See [docs/topics/jwt.md](../../docs/topics/jwt.md) for a full explanation.
```

---

## 22. Docs Folder — Deliverables

The `docs/` folder contains four course-level documents. Keep them in sync when content changes.

| File | What it is | How to update |
|------|-----------|---------------|
| `docs/topics/` | 40 standalone reference files (one per concept) | Edit the relevant `.md` file directly |
| `docs/api-reference.md` | Living endpoint reference — fields, validation rules, error messages | Update when API changes; run `GET /api/v1/schema` to verify |
| `docs/api_automation.md` | The full course book (34,000+ lines, Parts I–VII + Appendices) | Edit directly; regenerate Appendix G if `api-reference.md` changes |
| `docs/course-guide.md` | Auto-generated — all 17 lecture READMEs concatenated | Regenerate after any lecture README change: see command below |

**Regenerate `course-guide.md` after updating any lecture README:**
```bash
{
  echo "# Chatty API Automation — Complete Course Guide"
  echo ""
  echo "> This file is auto-generated from all lecture READMEs."
  echo "> For individual lecture files see \`tests/lecture-XX/README.md\`."
  echo ""
  for i in $(seq -w 1 17); do
    n=$((10#$i))
    dir="tests/lecture-$(printf '%02d' $n)"
    [ -f "$dir/README.md" ] && { echo ""; echo "---"; echo ""; cat "$dir/README.md"; }
  done
} > docs/course-guide.md
```

---

## 23. Windows Compatibility

All shell commands in this project are written for **macOS and Linux**. When adding commands to any README, topic file, or the book, add a `> **Windows users:**` note for any command that differs on Windows.

**Commands that always need a Windows note:**

| macOS / Linux | Windows CMD | Windows PowerShell | Note |
|--------------|-------------|-------------------|------|
| `CI=true npm test` | `set CI=true && npm test` | `$env:CI="true"; npm test` | Always add note near CI examples |
| `open file.html` | `start file.html` | `Start-Process file.html` | Add note after any `open` command |
| `$(pwd)` in Docker | `%cd%` | `${PWD}` | Add note after Docker volume mounts |
| `npm install -g pkg` | Run terminal as Administrator | Same | Add note near global install commands |

**Format:**
```markdown
```bash
CI=true npm test
```

> **Windows users:** Use `set CI=true && npm test` (CMD) or `$env:CI="true"; npm test` (PowerShell).
```

The primary development environment is macOS/Linux. Students on Windows should use **Git Bash** (installed with Git for Windows) or **WSL2** — both support the standard syntax without modification.
