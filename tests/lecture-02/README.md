# Lecture 02 — SignIn — Authentication & Cookies

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 1 — project setup, first tests, 8 assertion patterns, rate limiting.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-02/auth-flow.spec.ts
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

**Bypassing the rate limit in `beforeAll`:**
For the happy-path `beforeAll` signin (where you need a valid session, not testing errors),
add the `x-test-secret` header to skip the rate limiter entirely:

```ts
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

beforeAll(async () => {
  signInResponse = await axios.post(signinUrl, credentials, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });
});
```

This only bypasses the rate limit — it does not affect auth. The server still requires valid credentials.
`TEST_CLEANUP_SECRET` is hardcoded in `src/fixtures.ts` — no `.env` entry needed.

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

Open `tests/lecture-02/auth-flow.spec.ts`. New patterns introduced here:

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
npm test tests/lecture-02/auth-flow.spec.ts
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
git checkout master
git pull origin master               # get the merged changes
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
