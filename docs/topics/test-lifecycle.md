# Test Lifecycle

## Table of Contents

- [The Four Lifecycle Hooks](#the-four-lifecycle-hooks)
- [Scope: File Level vs Describe Block Level](#scope-file-level-vs-describe-block-level)
- [Execution Order](#execution-order)
- [Why beforeAll for HTTP Calls](#why-beforeall-for-http-calls)
- [Why afterAll for Cleanup](#why-afterall-for-cleanup)
- [When to Use beforeEach](#when-to-use-beforeeach)
- [Test Isolation](#test-isolation)
- [fileParallelism: false](#fileparallelism-false)
- [The Danger of Shared Mutable State](#the-danger-of-shared-mutable-state)
- [The Course Pattern Explained](#the-course-pattern-explained)
- [Nested Describe Blocks and Hook Inheritance](#nested-describe-blocks-and-hook-inheritance)
- [Hook Failures](#hook-failures)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## The Four Lifecycle Hooks

Vitest provides four hooks that run code at specific points in the test lifecycle:

| Hook | When it runs | Runs how many times |
|---|---|---|
| `beforeAll` | Once, before the first test in its scope | Once per scope |
| `afterAll` | Once, after the last test in its scope | Once per scope |
| `beforeEach` | Before every individual test in its scope | Once per test |
| `afterEach` | After every individual test in its scope | Once per test |

All four hooks accept an async function and await it before continuing.

```typescript
beforeAll(async () => {
  // async setup — runs once before this scope's tests start
});

afterAll(async () => {
  // async teardown — runs once after all tests in this scope finish
});

beforeEach(() => {
  // sync setup — runs before each test
});

afterEach(async () => {
  // async teardown — runs after each test
});
```

---

## Scope: File Level vs Describe Block Level

Hooks defined at the top level of a file (outside any `describe`) apply to the entire file.

Hooks defined inside a `describe` block apply only to that block.

```typescript
// File: tests/lecture-04/lecture.test.ts

// ── FILE-LEVEL HOOK ─────────────────────────────────────────────────────────
// Runs ONCE before any test in the entire file
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, {
    validateStatus: () => true,
  });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

// ── DESCRIBE-LEVEL HOOK ──────────────────────────────────────────────────────
describe('1. Current user', () => {
  let currentUserResponse: AxiosResponse;

  // Runs ONCE before the tests in THIS describe block
  beforeAll(async () => {
    currentUserResponse = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('status is 200', () => {
    expect(currentUserResponse.status).toBe(200);
  });

  it('isUser is true', () => {
    expect(currentUserResponse.data.isUser).toBe(true);
  });
});

describe('2. Session token', () => {
  // A fresh beforeAll — runs before tests in THIS block only
  // The file-level sessionCookie is already available
  let sessionTokenResponse: AxiosResponse;

  beforeAll(async () => {
    sessionTokenResponse = await axios.get(sessionTokenUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('status is 200', () => {
    expect(sessionTokenResponse.status).toBe(200);
  });
});
```

The file-level `beforeAll` runs once and establishes `sessionCookie`. Each `describe`-level `beforeAll` then uses that cookie to make its specific HTTP request.

---

## Execution Order

Understanding the execution order prevents confusing failures.

Given:

```typescript
// File-level hooks
beforeAll(() => console.log('FILE beforeAll'));
afterAll(() => console.log('FILE afterAll'));
beforeEach(() => console.log('FILE beforeEach'));
afterEach(() => console.log('FILE afterEach'));

describe('Group A', () => {
  beforeAll(() => console.log('A beforeAll'));
  afterAll(() => console.log('A afterAll'));
  beforeEach(() => console.log('A beforeEach'));
  afterEach(() => console.log('A afterEach'));

  it('test 1', () => console.log('A test 1'));
  it('test 2', () => console.log('A test 2'));
});

describe('Group B', () => {
  it('test 3', () => console.log('B test 3'));
});
```

Execution order:

```
FILE beforeAll
  A beforeAll
    FILE beforeEach
    A beforeEach
    A test 1
    A afterEach
    FILE afterEach

    FILE beforeEach
    A beforeEach
    A test 2
    A afterEach
    FILE afterEach
  A afterAll

  FILE beforeEach
  B test 3
  FILE afterEach

FILE afterAll
```

Key rules:
1. File-level `beforeAll` runs before any describe-level `beforeAll`.
2. Describe-level `beforeAll` runs before any test in that describe.
3. `beforeEach` from outer scopes runs before `beforeEach` from inner scopes.
4. `afterEach` from inner scopes runs before `afterEach` from outer scopes.
5. File-level `afterAll` runs after all describe blocks finish.

---

## Why beforeAll for HTTP Calls

Making one HTTP request and sharing the response across multiple tests is the primary use case for `beforeAll`.

```typescript
describe('1. Current user', () => {
  let response: AxiosResponse;

  beforeAll(async () => {
    // ONE HTTP request shared across all tests in this describe block
    response = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('status is 200', () => {
    expect(response.status).toBe(200);  // reads from shared response
  });

  it('isUser is true', () => {
    expect(response.data.isUser).toBe(true);  // same response
  });

  it('user has username', () => {
    expect(response.data.user.username).toBeTruthy();  // same response
  });
});
```

Why not call `axios.get(currentUserUrl)` inside each `it` test?

1. **Performance.** Each HTTP call takes 50-500ms. Three tests making three identical calls waste time. With `beforeAll`, one call serves all three tests.

2. **Rate limiting.** The Chatty production server has nginx rate limits. Multiple rapid calls to the same endpoint can trigger 429 responses, causing test failures that have nothing to do with your test logic.

3. **Consistency.** All tests in the describe block see the same response snapshot. If you make individual calls, there is a small chance the server state changes between calls (another test creates a user, updates a field, etc.).

4. **Clarity.** The single `beforeAll` call makes it obvious: this describe block tests one thing — the response from GET /currentuser. Each `it` is a different assertion about that same response.

---

## Why afterAll for Cleanup

`afterAll` runs after all tests in its scope complete, regardless of whether any of them failed. This makes it the right place to clean up resources created during the test run.

```typescript
// From tests/lecture-09/lecture.test.ts

let userBAuthId = '';

beforeAll(async () => {
  // Create user B — this test user exists in the production database
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
  // Delete user B — remove the test user from the production database
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
      validateStatus: () => true,
    });
  }

  // Sign out
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

`afterAll` runs even when tests fail. This is critical: if the follow/unfollow test fails in the middle of the describe block, the cleanup still happens and user B is still deleted. Without `afterAll`, a failing test would leave orphaned data in the database.

The `if (userBAuthId)` guard handles the case where `beforeAll` itself failed — if signup failed, `userBAuthId` is an empty string and we skip the deletion attempt.

---

## When to Use beforeEach

`beforeEach` is the right choice when each test needs a fresh, independent starting state.

Use `beforeEach` when:
- Each test creates a resource and the resource must not persist between tests.
- Tests modify shared state and each test needs the original version.
- You are testing a stateful object (like a class instance) where each test needs a new instance.

```typescript
describe('Post creation', () => {
  let postId: string;

  // Each test creates its own post — fresh state per test
  beforeEach(async () => {
    const res = await axios.post(postsUrl, {
      post: 'test post content',
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '',
      gifUrl: '',
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    postId = res.data.post?._id ?? '';
  });

  afterEach(async () => {
    // Clean up the post created in beforeEach
    if (postId) {
      await axios.delete(`${config.BASE_URL}/post/${postId}`, {
        headers: { Cookie: sessionCookie }, validateStatus: () => true,
      });
    }
  });

  it('returns 200', () => {
    expect(postId.length).toBeGreaterThan(0);
  });

  it('post appears in user feed', async () => {
    const feed = await axios.get(postsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = feed.data.posts?.find((p: { _id: string }) => p._id === postId);
    expect(found).toBeDefined();
  });

  it('post can be deleted', async () => {
    const res = await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    postId = '';  // prevent afterEach from trying to delete again
  });
});
```

In this example, each test receives its own freshly created post. Tests cannot interfere with each other because each has independent data.

Compare with `beforeAll`: if you used `beforeAll` here, all three tests would share the same post. The "post can be deleted" test would delete it, and then the "post appears in user feed" test (if it ran after) would fail because the post no longer exists. Test order would matter, which is a violation of test isolation.

### beforeAll vs beforeEach: decision guide

| Situation | Use |
|---|---|
| Making one HTTP call whose response you want to share across tests | `beforeAll` |
| Creating a user once for the whole file (signup is expensive) | `beforeAll` |
| Each test needs its own independent data | `beforeEach` |
| Resetting a module's state between tests | `beforeEach` |
| Signing in (expensive auth call) for the whole file | `beforeAll` |
| Creating a post that one test will modify or delete | `beforeEach` |

---

## Test Isolation

Test isolation means each test should:
1. Not depend on any other test running before it.
2. Not affect the outcome of any test that runs after it.
3. Produce the same result whether it runs first, last, or alone.

This is sometimes called **test independence** or **test orthogonality**.

Violations of test isolation are called **test coupling**. Common forms:

**Order coupling:** Test B only passes if Test A ran first.

```typescript
// Broken: test 2 depends on test 1 having set sessionCookie
let sessionCookie = '';

it('signs in', async () => {
  const res = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = res.headers['set-cookie']?.[0] ?? '';  // sets shared state
  expect(res.status).toBe(200);
});

it('gets current user', async () => {
  // Will fail if run in isolation — sessionCookie is empty
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },  // depends on previous test
    validateStatus: () => true,
  });
  expect(res.status).toBe(200);
});
```

**Data coupling:** Test B fails because Test A left data in the database that changes what Test B sees.

```typescript
// Broken: if Test A created a notification and didn't delete it,
// Test B's count assertion fails
it('no notifications initially', async () => {
  const res = await axios.get(notificationsUrl, ...);
  expect(res.data.notifications.length).toBe(0);  // fails if previous test left data
});
```

The fix for both is to use `beforeAll`/`afterAll` to set up and tear down state at the test scope level, never across tests within a describe.

---

## fileParallelism: false

The course `vitest.config.ts` sets:

```typescript
fileParallelism: false,
```

This means Vitest runs test files **sequentially**, one at a time. By default, Vitest runs test files in parallel across multiple worker threads.

Why this course disables parallel file execution:

**1. Rate limits.** The Chatty production API has nginx and Express rate limits. If 17 test files all sign in simultaneously, the server returns 429 (Too Many Requests). Sequential execution ensures each file finishes before the next one starts, staying well within rate limits.

**2. Shared test account.** All tests in a file sign in as the same `TEST_USERNAME`. If two files run concurrently, they may interfere with each other — one signs out while the other is mid-test.

**3. Deterministic cleanup.** When files run sequentially, the cleanup (afterAll in file A) finishes before file B starts. There is no risk of file B seeing leftover data from file A.

`fileParallelism: false` does not prevent tests within a single file from running in parallel. But in this course, tests within a file are always sequential because `it` blocks inside a `describe` run in order.

---

## The Danger of Shared Mutable State

Shared mutable state means variables declared at the file level that tests modify.

This is unavoidable in API testing — you need to share the session cookie and user IDs between describe blocks. The danger is when tests modify the shared state unpredictably.

```typescript
// Shared mutable state — acceptable usage
let sessionCookie = '';  // set in beforeAll, read by all tests
let userBId = '';        // set in beforeAll, read by all tests

// DANGEROUS: a test modifies shared state that another test reads
let notificationCount = 0;

it('creates a notification', async () => {
  await axios.put(followUrl(userBId), {}, { headers: { Cookie: sessionCookie } });
  notificationCount = 1;  // modifies shared state
});

it('notification count is 1', () => {
  expect(notificationCount).toBe(1);  // depends on previous test
});
```

Safe patterns for shared state in this course:

1. **Set in `beforeAll`, read in tests, never modified by tests.**
2. **Initialized to empty/falsy values so unset state is obvious.**
3. **Variables declared with `let` at file level, not reassigned inside `it` blocks.**

```typescript
// Safe pattern from lecture-09
let sessionCookie = '';
let userAId = '';
let userBId = '';
let userBAuthId = '';

beforeAll(async () => {
  // All shared variables set here, once
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = Array.isArray(loginRes.headers['set-cookie'])
    ? loginRes.headers['set-cookie'][0]
    : loginRes.headers['set-cookie'] ?? '';

  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  const signupRes = await axios.post(signupUrl, { /* user B details */ }, { validateStatus: () => true });
  userBId     = signupRes.data.user?._id    ?? '';
  userBAuthId = signupRes.data.user?.authId ?? '';
});
```

---

## The Course Pattern Explained

The course consistently uses this pattern across all lectures:

```typescript
// 1. Declare shared variables at file level with safe initial values
let sessionCookie = '';
let targetId = '';

// 2. beforeAll performs expensive setup: sign in, create data, capture IDs
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = /* extract from headers */;

  // Perform any additional setup that ALL tests in the file need
  const createRes = await axios.post(someCreateUrl, data, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  targetId = createRes.data.item?._id ?? '';
});

// 3. afterAll performs cleanup: delete what was created, sign out
afterAll(async () => {
  if (targetId) {
    await axios.delete(`${config.BASE_URL}/some/resource/${targetId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// 4. Inside each describe, a describe-level beforeAll makes its specific HTTP call
describe('Read resource', () => {
  let response: AxiosResponse;

  beforeAll(async () => {
    response = await axios.get(`${config.BASE_URL}/some/resource/${targetId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  });

  // 5. Tests assert against the shared response — no additional HTTP calls
  it('status is 200', () => {
    expect(response.status).toBe(200);
  });

  it('response has expected fields', () => {
    expect(response.data).toHaveProperty('item');
  });
});
```

This pattern minimizes HTTP calls while maximizing test coverage of the response. The cost is one sign-in, one create, one fetch, and one delete — regardless of how many assertions you add.

---

## Nested Describe Blocks and Hook Inheritance

When describe blocks are nested, hooks from outer scopes run for tests in inner scopes.

```typescript
describe('outer', () => {
  beforeEach(() => console.log('outer beforeEach'));
  afterEach(() => console.log('outer afterEach'));

  describe('inner', () => {
    beforeEach(() => console.log('inner beforeEach'));

    it('inner test', () => {
      // Output will be:
      //   outer beforeEach
      //   inner beforeEach
      //   (test runs)
      //   outer afterEach
    });
  });
});
```

This nesting is less common in this course but is useful when a set of tests needs common setup that varies between subgroups.

---

## Hook Failures

If a `beforeAll` throws an error, the tests in its scope are skipped (not failed). They show as skipped in the output, and the error from `beforeAll` is reported.

```typescript
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  if (loginRes.status !== 200) {
    throw new Error(`Sign-in failed: ${loginRes.status} — cannot run tests`);
  }
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';
});
```

Throwing in `beforeAll` when setup fails is a good practice. It gives a clear error message instead of cascading failures where every test fails with "cannot read property of undefined" because `sessionCookie` was never set.

`afterAll` errors are reported but do not affect test pass/fail counts. If cleanup fails, the tests that already ran keep their status.

---

## Common Mistakes

### Mistake: making HTTP calls inside each it block when beforeAll suffices

```typescript
// Expensive: one HTTP call per test
describe('Current user', () => {
  it('status is 200', async () => {
    const res = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie } });
    expect(res.status).toBe(200);
  });

  it('isUser is true', async () => {
    const res = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie } });
    expect(res.data.isUser).toBe(true);
  });
});

// Efficient: one call shared across tests
describe('Current user', () => {
  let response: AxiosResponse;

  beforeAll(async () => {
    response = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie } });
  });

  it('status is 200', () => {
    expect(response.status).toBe(200);
  });

  it('isUser is true', () => {
    expect(response.data.isUser).toBe(true);
  });
});
```

### Mistake: using beforeEach for one-time setup

```typescript
// Wrong: re-signs in before every single test (30+ HTTP calls for a file with 30 tests)
beforeEach(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';
});

// Correct: sign in once for the whole file
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';
});
```

### Mistake: not guarding cleanup with an if

```typescript
// Risky: if userBAuthId is empty (signup failed), this sends
// DELETE /test/cleanup/user/ which is a malformed URL
afterAll(async () => {
  await axios.delete(cleanupUrl(userBAuthId), { headers: { 'x-test-secret': TEST_CLEANUP_SECRET } });
});

// Safe: only attempt cleanup if we have a valid ID
afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), { headers: { 'x-test-secret': TEST_CLEANUP_SECRET } });
  }
});
```

---

## Related Topics

- [Test Cleanup](test-cleanup.md) — deleting test data in afterAll
- [Two-User Scenario](two-user-scenario.md) — beforeAll that creates a second user
- [State Verification](state-verification.md) — beforeAll + PUT + GET pattern
- [Test Data Strategy](test-data-strategy.md) — what to set up in beforeAll

## Official Documentation

- [Vitest — Test lifecycle hooks](https://vitest.dev/api/#beforeall)
- [Vitest — beforeAll / afterAll](https://vitest.dev/api/#beforeall)
- [Vitest — beforeEach / afterEach](https://vitest.dev/api/#beforeeach)
