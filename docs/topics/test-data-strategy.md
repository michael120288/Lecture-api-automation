# Test Data Strategy

## Table of Contents

- [Why Hardcoded Test Data Fails](#why-hardcoded-test-data-fails)
- [Dynamic Data with Faker.js](#dynamic-data-with-fakerjs)
- [The vitest Username Prefix Requirement](#the-vitest-username-prefix-requirement)
- [Fixture Constants vs Dynamic Data](#fixture-constants-vs-dynamic-data)
- [TEST_AVATAR_IMAGE: Why a 1x1 PNG Is Enough](#test_avatar_image-why-a-1x1-png-is-enough)
- [TEST_PASSWORD: Why a Fixed Password Is Fine](#test_password-why-a-fixed-password-is-fine)
- [TEST_AVATAR_COLOR](#test_avatar_color)
- [TEST_CLEANUP_SECRET](#test_cleanup_secret)
- [The One-Account-per-Student Rule](#the-one-account-per-student-rule)
- [Environment Variables for Credentials](#environment-variables-for-credentials)
- [Test Data in beforeAll vs in Each Test](#test-data-in-beforeall-vs-in-each-test)
- [Idempotent Test Design](#idempotent-test-design)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## Why Hardcoded Test Data Fails

Hardcoding test data means using literal strings or values that are the same every time the test runs. This creates several problems.

### Problem 1: Uniqueness collisions

The Chatty signup endpoint enforces unique usernames and email addresses. If you hardcode:

```typescript
// Wrong: hardcoded username
const signupPayload = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Vitest@123456',
  ...
};
```

The first test run creates `testuser`. The second run tries to create `testuser` again and gets a 400 error ("Username already taken"). The test fails — but the underlying code is correct. The test data is the problem.

### Problem 2: Student collisions

Ten students taking this course all have the same test file. If they all run `npm test` at the same time against the same API, they all try to create `testuser`. Only the first request succeeds. The other nine fail with 400. Students incorrectly conclude the API or their code is broken.

### Problem 3: Stale data assumptions

```typescript
// Wrong: assumes this post ID exists in the database
const postId = '60f1b2c3d4e5f6a7b8c9d0e1';
const res = await axios.get(`${config.BASE_URL}/post/${postId}`, ...);
expect(res.status).toBe(200);
```

This post may have been deleted between test runs. The test is fragile because it depends on external state that changes.

### Problem 4: Readability tradeoffs

```typescript
// This is readable but brittle
username: 'alice_tester'

// This communicates intent: "a unique username for this run"
username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`
```

Good test data naming communicates its purpose. Dynamic values show that uniqueness was intentional.

---

## Dynamic Data with Faker.js

Faker.js is a library that generates realistic fake data. The course uses it for anything that needs to be unique per test run.

```bash
# Already installed in the course
npm install --save-dev @faker-js/faker
```

Import in test files:

```typescript
import { faker } from '@faker-js/faker';
```

### Generating test usernames

```typescript
// Pattern: vitest prefix + 8 random alphanumeric characters (lowercase)
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
// Examples: 'vitestab3f91c', 'vitestx7y2k9m8', 'vitest4r6n1p0q'
```

The `8` character suffix provides 36^8 ≈ 2.8 trillion possible combinations. The probability of two students generating the same suffix is astronomically low.

### Generating test emails

```typescript
// Faker generates realistic email addresses
const email = faker.internet.email().toLowerCase();
// Examples: 'john.doe@example.net', 'alice.smith@test.org'
```

Email uniqueness is also enforced by the signup endpoint. Using Faker ensures each signup attempt uses a different email.

### Generating post content

```typescript
const postContent = faker.lorem.sentence();
// 'Lorem ipsum dolor sit amet, consectetur adipiscing.'
```

For post content, uniqueness is less critical (duplicate post text is allowed). But using Faker makes tests more realistic and helps identify test-generated posts when reading the database.

### Generating other values

```typescript
faker.string.alphanumeric(8)    // 'ab3f91c8'
faker.internet.email()          // 'user@example.com'
faker.internet.url()            // 'https://example.com'
faker.lorem.sentence()          // 'Lorem ipsum dolor sit amet.'
faker.lorem.paragraph()         // Multi-sentence paragraph
faker.person.firstName()        // 'Alice'
faker.color.rgb()               // '#4a90e2'
faker.number.int({ min: 1, max: 100 })  // 42
```

### Seeding Faker for reproducibility

By default, Faker generates different values on every run. If you want reproducible test data (same values every run), seed the generator:

```typescript
faker.seed(42);
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
// Always generates 'vitestab3f91c' with seed 42
```

Seeded Faker is useful for debugging (reproduce the exact values from a failed run) but breaks the uniqueness guarantee if multiple students use the same seed. The course does not use seeding.

---

## The vitest Username Prefix Requirement

All test usernames in this course must start with `vitest`. This is enforced by the cleanup endpoint:

```typescript
// In chatty-backend cleanup controller:
if (!user.username.startsWith('vitest')) {
  throw new BadRequestError('Safety check: username must start with "vitest"');
}
```

The safety check prevents accidental deletion of real user accounts. Even if someone calls the cleanup endpoint with the wrong `authId`, the server refuses to delete a real user.

```typescript
// Correct pattern — always use this
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
// 'vitestab3f91c' ✓ passes safety check

// Wrong patterns — cleanup will fail
const username = faker.internet.userName();      // 'john.doe' — no vitest prefix
const username = `test${faker.string.alphanumeric(8)}`;  // 'testab3f91c' — wrong prefix
```

The prefix must be exactly `vitest` (lowercase, no separator). The server uses `startsWith('vitest')` which is case-sensitive.

### What happens if you forget the prefix

The test will run. The signup succeeds. The tests run. But `afterAll` cleanup fails:

```
DELETE /api/v1/test/cleanup/user/70a2c3d4... → 400 Bad Request
{ "message": "Safety check: username must start with vitest" }
```

The user account is left in the database permanently. Run the tests 10 times and 10 orphaned accounts accumulate.

---

## Fixture Constants vs Dynamic Data

Some values should be constant across all tests. Some should be generated fresh per run. Understanding the difference prevents confusion.

### Fixture constants (from `src/fixtures.ts`)

Values that:
- Do not need to be unique.
- Have specific requirements (format, size, content).
- Are shared across many test files.

| Constant | Value | Reason for being fixed |
|---|---|---|
| `TEST_AVATAR_IMAGE` | base64 1×1 PNG | Must be a valid PNG; same tiny image works for all tests |
| `TEST_AVATAR_COLOR` | `'#4a90e2'` | Any valid hex color; consistency is all that matters |
| `TEST_PASSWORD` | `'Vitest@123456'` | Must meet password requirements; same password for all User B accounts |
| `TEST_CLEANUP_SECRET` | `'chatty-test-cleanup-2026'` | Must match the server-side constant exactly |

### Dynamic data (generated per test or per file)

Values that:
- Must be unique to avoid collisions.
- Have no specific content requirement beyond format.

| Value | Generator | Reason for being dynamic |
|---|---|---|
| `username` | `vitest${faker.string.alphanumeric(8).toLowerCase()}` | Must be unique per signup |
| `email` | `faker.internet.email().toLowerCase()` | Must be unique per signup |
| `post content` | `faker.lorem.sentence()` | Uniqueness avoids ambiguity in assertions |

### The complete fixtures file

```typescript
// src/fixtures.ts

/**
 * A minimal valid base64-encoded PNG image (1×1 black pixel).
 *
 * Why we need this:
 *   The Chatty signup endpoint uploads the avatarImage to Cloudinary.
 *   Cloudinary requires a valid image — it rejects empty strings or fake data.
 *   Using a real (tiny) PNG guarantees the upload succeeds without wasting bandwidth.
 *
 * Why a fixed image instead of a random one:
 *   Random base64 data is not a valid image and Cloudinary rejects it.
 *   A fixed known-good image is predictable and fast.
 *   Size: ~68 bytes decoded — smallest possible valid PNG.
 */
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * A fixed avatar colour used in signup tests.
 * Any non-empty string passes Joi validation — the server stores it as-is.
 */
export const TEST_AVATAR_COLOR = '#4a90e2';

/**
 * A fixed password that meets Chatty's signup requirements:
 *   - min 12 chars       (13 chars)
 *   - at least 1 upper   (V)
 *   - at least 1 lower   (itest)
 *   - at least 1 digit   (123456)
 *   - at least 1 special (@)
 *
 * Use this in tests instead of faker.internet.password() because Faker
 * doesn't know about Chatty's specific password pattern requirements.
 */
export const TEST_PASSWORD = 'Vitest@123456';

/**
 * The hardcoded value for the x-test-secret header.
 * Must match CLEANUP_HEADER_VALUE in chatty-backend.
 */
export const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';
```

---

## TEST_AVATAR_IMAGE: Why a 1x1 PNG Is Enough

When you sign up on Chatty, the `avatarImage` field accepts a base64-encoded image string. The server uploads this image to Cloudinary for hosting.

Cloudinary validates that the uploaded data is a real image. If you send random base64 bytes, Cloudinary rejects it and the signup fails.

A 1×1 pixel PNG is the smallest valid PNG file. It passes Cloudinary's format validation, generates a valid Cloudinary URL, and produces a profile picture that technically exists (even if it is a barely visible black dot).

```typescript
// This 68-byte PNG contains:
//   - PNG header signature
//   - IHDR chunk (width: 1, height: 1, bit depth: 8, color type: 2 = RGB)
//   - IDAT chunk (a single black pixel)
//   - IEND chunk
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
```

Why not use a larger image?
- Larger images take longer to upload and generate a Cloudinary URL.
- The test suite would be slower.
- For testing purposes, whether the profile picture is a 1×1 pixel or a full portrait is irrelevant.

Why not use an empty string?
- Chatty's Joi schema requires `avatarImage` to be a non-empty string.
- Cloudinary rejects empty input.

Why not generate a random base64 string?
- Random bytes are not a valid PNG/JPG/GIF format.
- Cloudinary rejects them with an "invalid image" error.
- `faker.datatype.string()` generates random text, not a valid image.

---

## TEST_PASSWORD: Why a Fixed Password Is Fine

User B is created with `TEST_PASSWORD = 'Vitest@123456'`. This is a constant, not dynamically generated.

### Why a fixed password is acceptable

1. **You control both sides.** You create User B and you know the password. There is no security concern because User B is a throwaway account.

2. **You may need to sign in as User B.** If a test requires User B's session, you sign in with `username: userBUsername, password: TEST_PASSWORD`. A dynamic password would require storing it in another shared variable.

3. **Password requirements are specific.** Chatty's password validation requires a minimum of 12 characters, at least one uppercase, one lowercase, one digit, and one special character. `faker.internet.password()` does not know these requirements and frequently generates passwords that fail validation.

4. **Passwords do not need to be unique.** Unlike usernames and emails, multiple accounts can share the same password. There is no collision risk.

### Why not use faker.internet.password()

```typescript
// Risky: Faker's generated passwords do not always meet Chatty's requirements
const password = faker.internet.password();
// Might generate: 'abc123' (too short, no uppercase, no special char) → 400 error
```

Chatty's Joi validation:
- `min: 12`
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain digit
- Must contain special character (`@`, `!`, `#`, etc.)

`TEST_PASSWORD = 'Vitest@123456'` satisfies all four requirements reliably.

---

## TEST_AVATAR_COLOR

The `avatarColor` field stores the background color for the user's avatar fallback (shown when no profile picture is set). Any valid CSS hex color passes Joi validation.

```typescript
export const TEST_AVATAR_COLOR = '#4a90e2';
```

This is a medium blue. Any non-empty string in hex color format works. The fixed value prevents any Joi validation errors and is consistent across test files.

---

## TEST_CLEANUP_SECRET

The cleanup endpoint requires a secret header to prevent unauthorized deletion:

```
x-test-secret: chatty-test-cleanup-2026
```

This value is hardcoded in both the backend (`CLEANUP_HEADER_VALUE`) and the test fixtures. It is not an environment variable because it is intentionally fixed — both sides of the contract must agree on the same value.

```typescript
export const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';
```

If you change this value without changing the backend, cleanup will always return 401.

---

## The One-Account-per-Student Rule

Each student creates one permanent account — the `TEST_USERNAME` in their `.env` file. This account:
- Is used across all lectures for sign-in tests.
- Is never deleted by the tests (only User B accounts are deleted).
- Has a unique username chosen by the student.

Simultaneously, any number of students can run the same test suite against the same API without collisions because:

1. `TEST_USERNAME` is different for each student (set in their personal `.env`).
2. Dynamically generated User B usernames use Faker.js with 8-character random suffixes — collisions are statistically impossible.
3. Email addresses for User B are also Faker-generated.
4. `fileParallelism: false` ensures sequential execution within each student's run.

### Scenario: 10 students run tests simultaneously

```
Student 1: creates vitestab3f91c@test.com (unique per Faker)
Student 2: creates vitestx7y2k9m8@test.com (different random suffix)
Student 3: creates vitest4r6n1p0q@test.com (different random suffix)
...
Student 10: creates vitestmn7pq3k1@test.com (different random suffix)

All 10 tests run at the same time → no conflicts
All 10 afterAll hooks delete their respective User B → no orphans
```

The design is collision-resistant by construction.

---

## Environment Variables for Credentials

The permanent test account credentials (`TEST_USERNAME`, `TEST_PASSWORD`, `BASE_URL`) come from environment variables, not from the fixture file.

```
# .env (not committed to git)
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=your_permanent_test_username
TEST_PASSWORD=YourPersonalPassword@123
```

These are loaded via `vitest.config.ts`:

```typescript
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    env: {
      BASE_URL: process.env.BASE_URL ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
    },
  },
});
```

And consumed via `src/config.ts`:

```typescript
export const config = {
  BASE_URL: process.env.BASE_URL!,
  TEST_USERNAME: process.env.TEST_USERNAME!,
  TEST_PASSWORD: process.env.TEST_PASSWORD!,
} as const;
```

### Separation of concerns

| Source | Contains | Why |
|---|---|---|
| `src/fixtures.ts` | Shared constants (avatar, cleanup secret) | Same for all students, safe to commit |
| `.env` | Personal credentials | Different per student, never committed |
| `src/config.ts` | Runtime access to env vars | Single import point, fails fast if missing |

### In CI

GitHub Secrets replace the `.env` file in CI. The workflow injects them as environment variables:

```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

The `vitest.config.ts` reads `process.env.BASE_URL` regardless of whether it came from `.env` or GitHub Secrets. The mechanism is transparent.

---

## Test Data in beforeAll vs in Each Test

### Data in beforeAll

Use `beforeAll` for data that:
- Is shared across all tests in a describe block or file.
- Is expensive to create (signup, signin).
- Does not need to be fresh for each test.

```typescript
// Created once, used by all tests in the file
let sessionCookie = '';
let userBId       = '';

beforeAll(async () => {
  // Sign in (one call for the entire file)
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';

  // Create User B (one call for the entire file)
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    ...
  }, { validateStatus: () => true });
  userBId = signupRes.data.user?._id ?? '';
});
```

### Data in each test

Use data created inside individual `it` blocks for:
- Data that the test itself will modify or delete.
- Data that must be fresh (not shared between tests).

```typescript
it('can create and delete a post', async () => {
  // This post is local to this test — not shared
  const createRes = await axios.post(postsUrl, {
    post: `test ${Date.now()}`,  // timestamp ensures uniqueness even within a run
    bgColor: '#fff',
    privacy: 'Public',
    feelings: '', gifUrl: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const postId = createRes.data.post?._id ?? '';

  // Test: delete the post
  const deleteRes = await axios.delete(`${config.BASE_URL}/post/${postId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });

  expect(deleteRes.status).toBe(200);
  // No cleanup needed — the test itself deleted the post
});
```

### Data in beforeEach

Use `beforeEach` for data that must be recreated fresh before each test:

```typescript
let postId = '';

beforeEach(async () => {
  const res = await axios.post(postsUrl, {
    post: `test post ${faker.string.alphanumeric(6)}`,
    bgColor: '#fff', privacy: 'Public', feelings: '', gifUrl: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  postId = res.data.post?._id ?? '';
});

afterEach(async () => {
  if (postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    postId = '';
  }
});
```

---

## Idempotent Test Design

An idempotent test produces the same result regardless of:
- How many times it has been run before.
- What state the database was in when it started.
- What other tests ran in the same session.

For a test suite that runs against a production database, idempotency is achieved through:

### 1. Dynamic data generation

```typescript
// Each run uses different usernames and emails → no collision with previous runs
username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`
email: faker.internet.email().toLowerCase()
```

### 2. Complete cleanup

```typescript
afterAll(async () => {
  // Delete everything created during this run
  // so the next run starts with the same state
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), { headers: ... });
  }
});
```

### 3. Restoring modified state

```typescript
// Capture before modifying
beforeAll(async () => {
  const res = await axios.get(currentUserUrl, ...);
  originalWork = res.data.user?.work ?? '';
});

// Restore after modifying
afterAll(async () => {
  await axios.put(basicInfoUrl, { work: originalWork }, ...);
});
```

### 4. Not depending on external data

```typescript
// Bad: assumes this post ID exists
const postId = '60f1b2c3d4e5f6a7b8c9d0e1';

// Good: create the data you need
const createRes = await axios.post(postsUrl, { ... }, ...);
const postId = createRes.data.post?._id ?? '';
```

### 5. Asserting on structure, not on counts

```typescript
// Bad: brittle — assumes exactly 3 followers
expect(res.data.followers.length).toBe(3);

// Good: asserts that the structure is correct and the relationship exists
expect(res.data.followers).toBeInstanceOf(Array);
const found = res.data.followers.find((u: { _id: string }) => u._id === userAId);
expect(found).toBeDefined();
```

Asserting on exact counts is fragile in a production database. Another student, another test run, or manual testing could change the count. Asserting on whether a specific user exists in the list is idempotent.

---

## Common Mistakes

### Mistake: hardcoded username in signup

```typescript
// Wrong: fails on the second run
const signupPayload = { username: 'testuser123', ... };

// Correct: unique every run
const signupPayload = {
  username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
  ...
};
```

### Mistake: using faker.internet.password() for User B

```typescript
// Risky: Faker passwords may not meet Chatty's requirements
password: faker.internet.password()  // may be too short or missing required chars

// Correct: use the tested fixture password
import { TEST_PASSWORD } from '../../src/fixtures';
password: TEST_PASSWORD  // 'Vitest@123456' — always passes validation
```

### Mistake: asserting exact counts in a shared database

```typescript
// Fragile: other tests or users change this count
expect(res.data.notifications.length).toBe(0);

// Better: assert on the shape and check for specific items
expect(res.data.notifications).toBeInstanceOf(Array);
```

### Mistake: storing dynamic data in a constant

```typescript
// Wrong: the same email is used for every test run — fails after first
const USER_EMAIL = 'testuser@example.com';

// Correct: generate in beforeAll
let userBEmail = '';
beforeAll(async () => {
  userBEmail = faker.internet.email().toLowerCase();
});
```

### Mistake: putting dynamic test data in src/fixtures.ts

`src/fixtures.ts` is for shared constants. It is not the right place for dynamically generated values. Dynamic values belong in `beforeAll` inside the test file.

---

## Related Topics

- [Test Cleanup](test-cleanup.md) — the vitest prefix safety check and cleanup endpoint
- [Two-User Scenario](two-user-scenario.md) — applying dynamic data to User B creation
- [Test Lifecycle](test-lifecycle.md) — where to generate test data (beforeAll vs beforeEach)
- [GitHub Actions](github-actions.md) — environment variables for credentials in CI

## Official Documentation

- [Faker.js — Official docs](https://fakerjs.dev/)
- [Martin Fowler — Test Fixtures](https://martinfowler.com/bliki/TestFixture.html)
- [Twelve-Factor App — Config](https://12factor.net/config)
