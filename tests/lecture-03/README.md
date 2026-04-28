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
- Why **every** signup call needs `x-test-secret` — the rate limiter applies to signup too
- Why duplicate-email tests need a short delay — Chatty writes to MongoDB via an async queue
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

## 5b. The MongoDB Queue Delay

After signup returns 201, the user document is **not yet in MongoDB**. Chatty writes to MongoDB via a Bull job queue — the API responds immediately from Redis, and the actual database write happens moments later.

This matters for the **duplicate email** test: it calls signup again with the same email, expecting 400. If the first user hasn't been committed to MongoDB yet, the duplicate check finds nothing and the second signup succeeds (201). The test fails for the wrong reason.

**Fix:** add a 1-second delay at the end of `beforeAll`, after capturing `authId`:

```ts
// Wait for Bull queue to flush the user to MongoDB
await new Promise(resolve => setTimeout(resolve, 1000));
```

> **Why 1 second?** In practice the queue flushes in under 100ms. The 1-second delay is a conservative buffer that keeps CI reliable without adding meaningful wait time.

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
    {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, // bypass rate limiter
      validateStatus: () => true,
    },
  );

  authId = signUpResponse.data.user?.authId ?? '';
  const raw = signUpResponse.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Wait for the async Bull queue to flush the user to MongoDB.
  // Chatty's duplicate-email check queries MongoDB directly — without this delay,
  // the duplicate signup test can return 201 instead of 400.
  await new Promise(resolve => setTimeout(resolve, 1000));
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
git checkout master
git pull origin master               # get the merged changes
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
