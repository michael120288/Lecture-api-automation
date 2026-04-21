# Test Cleanup

## Table of Contents

- [Why Test Cleanup Matters](#why-test-cleanup-matters)
- [Test Pollution](#test-pollution)
- [The Two Cleanup Strategies](#the-two-cleanup-strategies)
- [The Chatty Cleanup Endpoint](#the-chatty-cleanup-endpoint)
- [The vitest Username Requirement](#the-vitest-username-requirement)
- [The postDeleted Flag Pattern](#the-postdeleted-flag-pattern)
- [Cleaning Up Resources in Order](#cleaning-up-resources-in-order)
- [What Happens When Cleanup Fails](#what-happens-when-cleanup-fails)
- [The Two-User Cleanup Pattern](#the-two-user-cleanup-pattern)
- [Cleanup in GitHub Actions CI](#cleanup-in-github-actions-ci)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## Why Test Cleanup Matters

This test suite runs against the **production database** at `https://api.codeandtest.com/api/v1`. There is no separate test database. Every user you create, every post you publish, every comment you add — these all go into the real database that real users see.

Without cleanup:
- The database accumulates thousands of fake `vitest_*` users over time.
- These users appear in follower lists, search results, and notification feeds of real users.
- MongoDB storage costs increase.
- The Chatty application's performance degrades as the user collection grows.
- Running the test suite 100 times creates 100 orphaned accounts.

With cleanup:
- Each test run is self-contained — it creates what it needs and deletes it afterward.
- The database remains clean regardless of how many times tests run.
- Multiple students can run the same test suite against the same API simultaneously without polluting each other's data.

---

## Test Pollution

Test pollution occurs when test artifacts persist after the test run and affect other tests or the application's state.

**Types of test pollution in this course:**

| Type | Example | Effect |
|---|---|---|
| Orphaned user accounts | `vitestab3f91c` user never deleted | Appears in user lists, followers count |
| Orphaned posts | Post created in beforeAll, never deleted in afterAll | Appears in feed |
| Orphaned comments | Comment on post, post deleted but comment record remains | Orphaned document in DB |
| Orphaned follow relationships | User A follows User B, User B deleted without unfollow | Stale entry in User A's following list |
| Session leaks | Sign in without signing out | Session remains in Redis until expiry |

The most serious form is orphaned user accounts because the cleanup endpoint is designed specifically to handle them. Posts, comments, and reactions are cleaned up by the cascade behavior of the cleanup endpoint.

---

## The Two Cleanup Strategies

### Strategy 1: afterAll-based cleanup

Cleanup runs after the entire test file finishes, regardless of test outcomes.

```typescript
let userBAuthId = '';

beforeAll(async () => {
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  userBAuthId = signupRes.data.user?.authId ?? '';
});

afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(
      `${config.BASE_URL}/test/cleanup/user/${userBAuthId}`,
      { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true }
    );
  }
});
```

This is the primary strategy used in this course. `afterAll` runs even when tests fail, so cleanup happens regardless of test outcomes.

**When it works well:**
- When a single resource (user) is created and all dependent resources (posts, comments) are owned by that user. The cleanup endpoint cascades.
- When the file follows the pattern: one beforeAll creates resources, one afterAll deletes them.

**Limitation:**
- If the process is killed (SIGKILL, power loss, crash) during test execution, `afterAll` never runs and the data persists.

### Strategy 2: test-scoped cleanup (beforeEach/afterEach)

Create and delete a resource per individual test.

```typescript
describe('Post reactions', () => {
  let postId = '';

  beforeEach(async () => {
    const res = await axios.post(postsUrl, {
      post: `test post ${Date.now()}`,
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '', gifUrl: '', profilePicture: '',
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

  it('can add a like reaction', async () => {
    const res = await axios.post(reactionsUrl, {
      userTo: userId,
      postId,
      type: 'like',
      previousReaction: '',
      postReactions: {},
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(res.status).toBe(200);
  });
});
```

**When to use this strategy:**
- When each test needs independent data that must not persist between tests.
- When tests modify the resource (update, delete) and subsequent tests need a fresh copy.
- When you want each test to be fully self-contained.

**Drawback:**
- One HTTP request to create + one to delete per test. For 10 tests this is 20 extra HTTP calls. For auth-heavy operations it can hit rate limits.

---

## The Chatty Cleanup Endpoint

The Chatty backend provides a dedicated endpoint for deleting test users and their associated data:

```
DELETE /api/v1/test/cleanup/user/:authId
```

**Required header:**

```
x-test-secret: chatty-test-cleanup-2026
```

The header value is defined in `src/fixtures.ts`:

```typescript
export const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';
```

**What it deletes:**

The cleanup endpoint performs a cascading delete:
1. Deletes all posts authored by the user.
2. Deletes all comments authored by the user.
3. Deletes all reactions by the user.
4. Removes the user from other users' follower/following lists.
5. Deletes the user's Redis cache entries.
6. Deletes the Auth record (the authentication document).
7. Deletes the User record (the profile document).

**Response shape:**

```json
{
  "message": "Test user deleted successfully",
  "deletedAuthId": "60f1b2c3d4e5f6a7b8c9d0e1",
  "deletedUsername": "vitestab3f91c"
}
```

**Usage pattern:**

```typescript
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';
import type { ICleanupResponse } from '../../src/interfaces';

const cleanupUrl = (authId: string) =>
  `${config.BASE_URL}/test/cleanup/user/${authId}`;

// In afterAll:
if (userBAuthId) {
  const res = await axios.delete<ICleanupResponse>(
    cleanupUrl(userBAuthId),
    {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
      validateStatus: () => true,
    }
  );

  // Log cleanup result for debugging
  if (res.status !== 200) {
    console.warn(`Cleanup failed for ${userBAuthId}: ${res.status}`);
  }
}
```

**The `:authId` parameter is the Auth document's `_id`, not the User document's `_id`.**

When you call POST /signup, the response includes:

```json
{
  "user": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e1",   ← User _id (MongoDB ObjectId)
    "authId": "70a2c3d4e5f6b8c9d0e1f2g3",  ← Auth _id (used for cleanup)
    "uId": "123456789012"                   ← 12-digit numeric string
  }
}
```

Always capture `authId` from the signup response, not `_id`:

```typescript
userBAuthId = signupRes.data.user?.authId ?? '';
```

---

## The vitest Username Requirement

The cleanup endpoint includes a safety check: it only deletes users whose username starts with `vitest`.

```typescript
// chatty-backend/src/features/auth/controllers/test-cleanup.ts
if (!user.username.startsWith('vitest')) {
  throw new BadRequestError('Safety check failed: username must start with "vitest"');
}
```

This prevents accidental deletion of real user accounts. Even if a developer accidentally calls the cleanup endpoint with a real user's `authId`, the server refuses to delete them.

For the course, all test usernames must start with `vitest`:

```typescript
// Correct — starts with 'vitest'
username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`
// Example: 'vitestab3f91c'

// Wrong — will fail the safety check
username: faker.internet.userName()
// Example: 'john.doe' — cleanup endpoint will refuse to delete this
```

The `faker.string.alphanumeric(8).toLowerCase()` suffix ensures uniqueness. With 36^8 possible combinations (~2.8 trillion), collisions between students are effectively impossible.

---

## The postDeleted Flag Pattern

When a test explicitly deletes a resource, you should prevent `afterAll` from trying to delete it again. Double-deletion is usually harmless (the server returns 404 the second time), but it produces misleading errors in your cleanup logs.

```typescript
describe('Delete post', () => {
  let postId = '';
  let postDeleted = false;  // flag to track whether we already deleted

  beforeAll(async () => {
    const res = await axios.post(postsUrl, {
      post: 'this post will be deleted by the test',
      bgColor: '#ffffff', privacy: 'Public', feelings: '', gifUrl: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    postId = res.data.post?._id ?? '';
  });

  afterAll(async () => {
    // Only delete if the test didn't already do it
    if (postId && !postDeleted) {
      await axios.delete(`${config.BASE_URL}/post/${postId}`, {
        headers: { Cookie: sessionCookie }, validateStatus: () => true,
      });
    }
  });

  it('delete returns 200', async () => {
    const res = await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    postDeleted = true;  // mark as deleted so afterAll skips cleanup
  });

  it('deleted post returns 404', async () => {
    const res = await axios.get(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(404);
  });
});
```

The `postDeleted` flag is a simple boolean that the delete test sets to `true`. The `afterAll` checks this flag before attempting cleanup.

---

## Cleaning Up Resources in Order

When you have resources with dependencies, delete them in the correct order: dependents before their dependencies.

**Wrong order:** deleting the user before their posts

```typescript
afterAll(async () => {
  // Wrong: deleting user first may leave orphaned posts if cascade fails
  await axios.delete(cleanupUrl(userAuthId), { headers: ... });
  // Posts may not be fully cleaned up
});
```

**Correct order for manual cleanup:**

```typescript
afterAll(async () => {
  // 1. Delete comments first (depend on posts)
  for (const commentId of createdCommentIds) {
    await axios.delete(`${config.BASE_URL}/comment/${commentId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  // 2. Delete posts (depend on user)
  for (const postId of createdPostIds) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  // 3. Delete user last (the cleanup endpoint also handles cascade)
  if (userAuthId) {
    await axios.delete(cleanupUrl(userAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
    });
  }

  // 4. Sign out
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});
```

In practice, the cleanup endpoint handles the cascade internally. But when you have created resources as the primary test account (not as a secondary test user), you must clean them up manually because the cleanup endpoint only works on test users (username starting with `vitest`).

**Dependency order for Chatty resources:**

```
Reaction → Comment → Post → User
```

Reactions are attached to posts. Comments are attached to posts. Delete in reverse order: reactions first, then comments, then posts, then users.

---

## What Happens When Cleanup Fails

If the cleanup HTTP call returns a non-200 status, the data persists in the database. Common reasons:

| Cause | Status | What to do |
|---|---|---|
| Wrong `authId` (captured `_id` instead of `authId`) | 404 | Fix the capture: use `signupRes.data.user?.authId` |
| Missing or wrong `x-test-secret` header | 401 | Check `TEST_CLEANUP_SECRET` value in fixtures.ts |
| Username does not start with `vitest` | 400 | Fix the username generation pattern |
| Network error / timeout | — | Add error logging, retry once |
| Cleanup endpoint unreachable | — | CI is down or server is down |

```typescript
afterAll(async () => {
  if (!userBAuthId) return;

  const res = await axios.delete(
    cleanupUrl(userBAuthId),
    {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
      validateStatus: () => true,
    }
  );

  if (res.status !== 200) {
    // Log a warning — the test file has already finished so this won't fail the suite
    // but the developer will see it in the output
    console.warn(
      `[cleanup] FAILED to delete user ${userBAuthId}: ` +
      `HTTP ${res.status} — ${JSON.stringify(res.data)}`
    );
  }
});
```

The `console.warn` inside `afterAll` does not fail the test suite. But it will appear in the terminal output and help identify orphaned data.

If cleanup consistently fails (every run leaves data), investigate before running more tests. Check the `authId` capture, the header value, and the username format.

---

## The Two-User Cleanup Pattern

Many lectures create a secondary test user (User B). Each user requires its own cleanup call.

```typescript
// From tests/lecture-09/lecture.test.ts

let sessionCookie = '';     // for user A
let userBAuthId = '';       // for cleanup

afterAll(async () => {
  // Step 1: undo any social relationship state before deletion
  // (unfollow, unblock) — order matters: undo actions before deleting the actor
  if (userBId) {
    await axios.put(unfollowUrl(userBId, userAId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    await axios.put(unblockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  // Step 2: delete User B via the cleanup endpoint
  // User A (the permanent test account) is NOT deleted
  if (userBAuthId) {
    await axios.delete(
      `${config.BASE_URL}/test/cleanup/user/${userBAuthId}`,
      {
        headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
        validateStatus: () => true,
      }
    );
  }

  // Step 3: sign out User A
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

User A (your permanent `TEST_USERNAME` account from `.env`) is never deleted — it is the account you use across all lectures. Only ephemeral User B accounts (created with `vitest` prefix) are deleted after each test file.

If a test file creates three secondary users:

```typescript
let userBAuthId = '';
let userCAuthId = '';
let userDAuthId = '';

afterAll(async () => {
  const cleanups = [userBAuthId, userCAuthId, userDAuthId].filter(Boolean);

  // Run cleanups in parallel — they are independent
  await Promise.all(
    cleanups.map(authId =>
      axios.delete(cleanupUrl(authId), {
        headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
        validateStatus: () => true,
      })
    )
  );

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

`Promise.all` runs all three cleanup requests concurrently. The order does not matter here because each user is independent.

---

## Cleanup in GitHub Actions CI

When tests run in CI, cleanup behavior is the same. The `afterAll` hooks run at the end of each test file, and the API calls go to the production server.

The only difference: if the CI job is cancelled mid-run (e.g. the workflow is manually cancelled), `afterAll` hooks do not run for incomplete test files. This can leave orphaned data.

Mitigation strategies:
1. **Accept it for CI runs.** Orphaned data from occasional CI cancellations is a minor issue for a course project.
2. **Separate CI cleanup job.** Add a workflow job that runs a cleanup script after the test job, using `if: always()` to run even on cancellation.
3. **Unique CI username prefix.** Use `ci-vitest-` as the prefix for CI-created users and add a periodic cleanup script that deletes all users matching this pattern.

For this course, strategy 1 is sufficient. The safety check on the username prefix means orphaned users are isolated and do not affect real users.

---

## Common Mistakes

### Mistake: capturing \_id instead of authId

```typescript
// Wrong: _id is the User document's MongoDB ObjectId
// The cleanup endpoint expects the Auth document's _id
userBAuthId = signupRes.data.user?._id ?? '';

// Correct
userBAuthId = signupRes.data.user?.authId ?? '';
```

### Mistake: missing x-test-secret header

```typescript
// Wrong: cleanup endpoint returns 401 without the secret header
await axios.delete(cleanupUrl(userBAuthId), { validateStatus: () => true });

// Correct
await axios.delete(cleanupUrl(userBAuthId), {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
  validateStatus: () => true,
});
```

### Mistake: not guarding cleanup with if

```typescript
// Wrong: if userBAuthId is empty string, sends DELETE .../test/cleanup/user/
// which is either a 404 or a malformed URL
afterAll(async () => {
  await axios.delete(cleanupUrl(userBAuthId), { headers: ... });
});

// Correct: only attempt cleanup when we have a valid ID
afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), { headers: ... });
  }
});
```

### Mistake: forgetting to sign out in afterAll

Signing out is not strictly required because the session expires on its own. But it is good practice. An active session held open unnecessarily could interfere with concurrent test runs.

```typescript
afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), { headers: ... });
  }
  // Always sign out User A
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});
```

---

## Related Topics

- [Test Lifecycle](test-lifecycle.md) — afterAll scope and execution timing
- [Two-User Scenario](two-user-scenario.md) — creating and cleaning up User B
- [Test Data Strategy](test-data-strategy.md) — vitest username prefix and why it matters
- [State Verification](state-verification.md) — verifying cleanup actually worked

## Official Documentation

- [Vitest — Setup and teardown](https://vitest.dev/api/#beforeall)
- [Testing Library — Cleanup](https://testing-library.com/docs/react-testing-library/api/#cleanup)
