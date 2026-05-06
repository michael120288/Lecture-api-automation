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

## Lecture 03 — SignUp: Creating & Cleaning Up Test Users

**Faker.js, the `vitest` prefix rule, and the full beforeAll/afterAll lifecycle**

<!-- note: Every lecture from here on creates real database records. This lecture teaches the pattern that keeps the database clean across thousands of test runs. -->

---

## The Problem with Static Test Data

```ts
// Run 1 — passes
await axios.post('/signup', { username: 'testuser', ... });

// Run 2 — FAILS: user already exists
await axios.post('/signup', { username: 'testuser', ... });
```

Static usernames fail on the second run.

<!-- note: This is the database collision problem. CI runs two jobs at the same time? Same username = one of them fails. Faker solves this completely. -->

---

## Faker.js — Unique Every Run

```ts
import { faker } from '@faker-js/faker';

const username =
  `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
// "vitestk7m2xq9w" — different every run
```

- Two CI jobs running simultaneously: no collision
- Realistic, unique data without thinking

<!-- note: alphanumeric(8) gives 36^8 = 2.8 trillion combinations. The chance of a collision between two concurrent runs is negligible. -->

---

## The `vitest` Prefix — Not a Convention

```ts
// Backend cleanup controller:
if (!username.startsWith('vitest')) {
  throw new BadRequestError('Safety check: not a test user');
}
```

- Even with the correct secret header
- Real user accounts cannot be deleted via this endpoint

> The prefix is enforced by the backend. It protects real accounts.

<!-- note: This is not a naming convention — it's a hard server-side guard. Even if a student uses the correct x-test-secret, the backend will refuse to delete any account that doesn't start with 'vitest'. -->

---

## The Test Lifecycle

`beforeAll` → create user → capture `authId` + `sessionCookie`

↓ tests run (1, 2, 3 ...)

`afterAll` → DELETE `/test/cleanup/user/:authId` → signout

- `afterAll` runs even when tests fail
- Database is always cleaned

<!-- note: This is the pattern students will use in every lecture from here on. beforeAll creates, tests assert, afterAll deletes. The cleanup is unconditional. -->

---

## Capturing authId in beforeAll

```ts
let authId = '';

beforeAll(async () => {
  const res = await axios.post(signupUrl, payload, opts);
  authId = res.data.user?.authId ?? '';
  // ?.  prevents crash if signup failed
});
```

- `authId` is used by the cleanup endpoint
- Empty string means cleanup silently does nothing

<!-- note: The optional chaining (?.) is critical. If signup fails, res.data.user is undefined. Without ?. the beforeAll crashes and every test fails with a confusing error. Always add the ?? '' fallback. -->

---

## The Cleanup Endpoint

```
DELETE /api/v1/test/cleanup/user/:authId
Header: x-test-secret: chatty-test-cleanup-2026
```

Two protection layers:
1. Wrong or missing header → **403**
2. Username not starting with `vitest` → **400**

```ts
await axios.delete(
  `${config.BASE_URL}/test/cleanup/user/${authId}`,
  {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  },
);
```

<!-- note: Students should always verify their cleanup is working by checking the response status in afterAll. A 404 means authId was empty — their beforeAll failed silently. -->

---

## Bull Queue Delay — Duplicate Email Test

After signup returns 201, the user is **not yet in MongoDB**.

Chatty writes to MongoDB via a Bull job queue — the API responds immediately from Redis.

```ts
beforeAll(async () => {
  signUpResponse = await axios.post(signupUrl, userData, opts);
  authId = signUpResponse.data.user?.authId ?? '';

  // Wait for Bull queue to flush the user to MongoDB.
  // Without this, the duplicate email test can return 201
  // instead of 400 — the user isn't in the DB yet.
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

> 1 second is a conservative buffer. The queue usually flushes in under 100ms.

<!-- note: This is the most common intermittent failure in lecture 03. The duplicate email test finds nothing in MongoDB because the first user hasn't been written yet. The 1-second delay fixes it reliably across CI and local runs. -->

---

## avatarImage — Use the Fixture

```ts
// FAILS — Cloudinary rejects non-image strings:
avatarImage: 'not-a-real-image'

// WORKS — 1×1 pixel PNG, always accepted:
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';
avatarImage: TEST_AVATAR_IMAGE
```

> Never use Faker to generate avatar images.

<!-- note: Cloudinary validates the base64 payload. The fixture is the smallest valid PNG (~68 bytes). It's fast to upload and always accepted. Using faker.image.* generates URLs, not base64 data — they fail Cloudinary validation. -->

---

## Password Requirements

```ts
import { TEST_PASSWORD } from '../../src/fixtures';
// 'Vitest@123456' — always valid
```

`faker.internet.password()` does **not** meet Chatty's Joi rules:
- 12+ characters
- 1 uppercase
- 1 digit
- 1 special character (`@$!%*?&`)

<!-- note: This catches every student who tries to use Faker for passwords. Faker's generated passwords rarely have special characters AND the required length simultaneously. Use the fixture constant. -->

---

## 201 Created vs 200 OK

| Status | When |
|--------|------|
| `200 OK` | Read, Login, Logout |
| **`201 Created`** | New resource created |

```ts
expect(res.status).toBe(201); // not expectSuccess()
```

<!-- note: The exact code is meaningful for creation endpoints. 201 tells the client something was added to the database. Use toBe(201) not a helper — you want to assert the precise code here. -->

---

## 4 Common Mistakes

- `faker.internet.username()` — missing `vitest` prefix
- `faker.internet.password()` — fails Joi pattern
- Forgetting `avatarImage` — 400 validation error
- Not capturing `authId` — cleanup silently skipped

<!-- note: Walk through each. The authId one is the sneakiest — afterAll runs, sends DELETE, gets 404, but doesn't throw, so the test suite appears clean while leaving orphaned accounts. -->

---

## Homework — 7 TODOs

Open `tests/lecture-03/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | 201, message, `_id`, `authId`, no password |
| 2 | `toMatchObject` + JWT format check |
| 3 | Duplicate email → 400 with `expectRejected` |
| 4 | Password boundary — no special character |
| 5 | `.then()` style — wrong secret → 403 |
| 6 | `toMatch` — email matches `/.+@.+\..+/` |
| 7 | `toSatisfy` — JWT custom predicate |

**Goal: 7 tests passing**
