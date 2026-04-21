# State Verification

## Table of Contents

- [The Problem: A 200 Does Not Prove Persistence](#the-problem-a-200-does-not-prove-persistence)
- [The PUT → GET Pattern](#the-put--get-pattern)
- [Why Chatty Uses Redis and MongoDB](#why-chatty-uses-redis-and-mongodb)
- [Testing the API Contract vs Testing Persistence](#testing-the-api-contract-vs-testing-persistence)
- [The Two-Step Test Structure](#the-two-step-test-structure)
- [When GET Can Fail After a Successful PUT](#when-get-can-fail-after-a-successful-put)
- [Making State Verification Tests Reliable](#making-state-verification-tests-reliable)
- [Real Examples from Lecture 4](#real-examples-from-lecture-4)
- [Extending the Pattern to Other Endpoints](#extending-the-pattern-to-other-endpoints)
- [What Happens When State Verification Fails](#what-happens-when-state-verification-fails)
- [Common Mistakes](#common-mistakes)
- [Related Topics](#related-topics)

---

## The Problem: A 200 Does Not Prove Persistence

When you send a PUT request and receive a 200 response, all you know is:

1. The server received the request.
2. The server returned HTTP 200.
3. Nothing else.

You do not know:
- Whether the data was written to the database.
- Whether the write completed before the response was sent.
- Whether the write succeeded or silently failed.
- Whether a subsequent read will return the updated value.

This is not hypothetical. Consider these plausible server-side bugs:

```typescript
// Bug A: update function is called but awaited incorrectly
async function updateProfile(userId: string, data: ProfileData) {
  updateDatabase(userId, data);  // missing await — starts but doesn't finish
  return { message: 'Updated successfully' };  // returns 200 before write completes
}

// Bug B: update function always returns success but never writes
async function updateProfile(userId: string, data: ProfileData) {
  console.log('Updating...', data);  // logs but doesn't write
  return { message: 'Updated successfully' };
}

// Bug C: writes to wrong key
async function updateProfile(userId: string, data: ProfileData) {
  await db.update('wrongCollection', userId, data);  // wrong collection
  return { message: 'Updated successfully' };
}
```

All three bugs return HTTP 200. A test that only checks the status code misses all of them.

The only way to confirm the data was actually saved is to read it back.

---

## The PUT → GET Pattern

State verification is a two-step pattern:

1. **Write:** call the PUT endpoint and assert the response is 200.
2. **Read:** call the GET endpoint and assert the response contains the new value.

```typescript
// Step 1: Write
const putRes = await axios.put(basicInfoUrl,
  { work: 'QA Automation Engineer', quote: 'Quality is not an act, it is a habit' },
  { headers: { Cookie: sessionCookie }, validateStatus: () => true }
);
expect(putRes.status).toBe(200);

// Step 2: Read back and verify the value was stored
const getRes = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
expect(getRes.data.user.work).toBe('QA Automation Engineer');
expect(getRes.data.user.quote).toBe('Quality is not an act, it is a habit');
```

This is a much stronger assertion than checking the PUT response alone. It proves that:
- The server stored the value.
- The storage is readable by the same GET endpoint.
- The format of the stored value matches what was sent.

---

## Why Chatty Uses Redis and MongoDB

Understanding Chatty's architecture explains why the PUT → GET pattern works reliably here.

Chatty uses two data stores:

**Redis (in-memory cache):**
- Stores the current user object in memory.
- Reads are nearly instantaneous (microseconds).
- GET /currentuser reads from Redis, not MongoDB.

**MongoDB (persistent database):**
- The source of truth for all data.
- Writes are durable.
- Reads are slower (milliseconds).

**What happens when you PUT /user/profile/basic-info:**

1. The server updates the user object in Redis immediately.
2. The server queues a write to MongoDB (via Bull queue) — this is asynchronous.
3. The server returns HTTP 200.

Because Redis is updated synchronously (before the response is sent), GET /currentuser immediately after a PUT returns the new values. The MongoDB write happens in the background, but the Redis read is always fresh.

**This is why state verification works reliably in this test suite:**

```
PUT /user/profile/basic-info   →  Redis updated synchronously
                               →  MongoDB queued (async)
                               →  Response: 200

GET /currentuser               →  Reads from Redis
                               →  Redis has the new value
                               →  Returns updated data
```

The GET does not need to wait for MongoDB. Redis is the read source and it is always current.

This is an important implementation detail to understand when writing assertions. If Chatty read from MongoDB directly instead of Redis, there could be a race condition between the async queue write and the GET request.

---

## Testing the API Contract vs Testing Persistence

There is a conceptual distinction between two types of assertions:

**Testing the API contract:**
- Does the endpoint exist?
- Does it return the expected HTTP status code?
- Does the response have the documented fields?
- Does the response message match the specification?

Example:
```typescript
// API contract test
it('returns 200 with correct message', async () => {
  const res = await axios.put(basicInfoUrl,
    { work: 'Engineer' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );
  expect(res.status).toBe(200);
  expect(res.data.message).toBe('Updated successfully');
});
```

**Testing persistence:**
- Was the data actually stored?
- Does a subsequent read return the value that was written?
- Did the write complete?

Example:
```typescript
// Persistence test
it('GET /currentuser reflects the updated work field', async () => {
  await axios.put(basicInfoUrl,
    { work: 'QA Automation Engineer' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );

  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(res.data.user.work).toBe('QA Automation Engineer');
});
```

Both types of tests have value. Contract tests catch broken endpoints. Persistence tests catch broken writes. A comprehensive test suite includes both.

In Lecture 4, Section 4 of the course is dedicated to persistence testing (state verification), while Sections 3 and 5 test the API contract.

---

## The Two-Step Test Structure

The recommended structure uses a `beforeAll` to perform the write, then individual `it` tests to verify each field:

```typescript
describe('4. State verification', () => {

  const testWork  = 'QA Automation Engineer';
  const testQuote = 'Quality is not an act, it is a habit';

  // Step 1: Write — performed once before any verification tests run
  beforeAll(async () => {
    await axios.put(basicInfoUrl,
      { work: testWork, quote: testQuote },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true }
    );
  });

  // Step 2a: Verify first field
  it('GET /currentuser reflects the updated work field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.work).toBe(testWork);
  });

  // Step 2b: Verify second field
  it('GET /currentuser reflects the updated quote field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.quote).toBe(testQuote);
  });
});
```

Why use `beforeAll` for the write instead of putting the PUT inside each `it`?

1. **Separation of concerns.** The write is setup, not the assertion. `beforeAll` is for setup.
2. **No double-writing.** The PUT fires once. Both verification tests read from the same post-write state.
3. **Fewer HTTP calls.** One PUT call instead of two.
4. **Named constants.** `testWork` and `testQuote` are defined once at the describe level. Both the write and the assertions use the same variable, so if you change the value you only change it in one place.

Alternatively, you can combine write and read in one `it` block:

```typescript
it('work field persists after PUT', async () => {
  // Write
  await axios.put(basicInfoUrl,
    { work: 'QA Automation Engineer' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );

  // Read back
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  // Assert
  expect(res.data.user.work).toBe('QA Automation Engineer');
});
```

This is valid and commonly seen in integration tests. The tradeoff: the test name now covers both the write and the read in a single test, making it harder to identify which step failed when the test fails.

---

## When GET Can Fail After a Successful PUT

For Chatty specifically, this is unlikely because Redis is updated synchronously. But in general, a GET can fail after a successful PUT for these reasons:

### Asynchronous queue processing

If a system uses a queue for all writes (including Redis):
```
PUT → Queue → Worker → Redis → Visible to GET
```
The GET may arrive before the worker processes the queue item. The old value is returned. A brief `sleep` or retry loop would be needed, but this is fragile.

Chatty avoids this for GET /currentuser by writing to Redis synchronously before queuing the MongoDB write.

### Read-your-writes consistency

Some distributed databases do not guarantee that a write is immediately visible to reads on the same connection, let alone reads from a different connection. Chatty uses a single Redis instance so this is not an issue here.

### Caching at the application layer

If the GET endpoint caches its response (e.g. caches for 60 seconds), a write may not be visible until the cache expires. Chatty's GET /currentuser reads from Redis each time — it is not additionally cached.

### Caching at the CDN/proxy layer

If the GET endpoint is served through a CDN or proxy with caching, a write is immediately durable on the origin but cached old responses continue to be served to clients. `api.codeandtest.com` serves dynamic API responses that are not CDN-cached, so this is not a concern.

### Summary for this course

In the chatty-api-tests context:
- GET /currentuser reads from Redis.
- PUT /user/profile/* writes to Redis synchronously.
- The GET immediately after a PUT will always return the new value.

State verification tests are reliable for the profile update endpoints specifically tested in Lecture 4.

---

## Making State Verification Tests Reliable

Follow these practices to ensure your state verification tests do not produce flaky results:

### 1. Use named constants for test values

```typescript
// Named constants make it easy to see what was written and what is expected
const testWork = 'QA Automation Engineer';
const testQuote = 'Quality is not an act, it is a habit';

await axios.put(basicInfoUrl, { work: testWork, quote: testQuote }, ...);

const res = await axios.get(currentUserUrl, ...);
expect(res.data.user.work).toBe(testWork);  // same constant
```

Using the same constant in the write and the assertion prevents typos from causing spurious failures.

### 2. Use unique or distinctive values

```typescript
// Bad: if 'Engineer' was already the value before the test ran,
// a broken PUT that doesn't write anything still passes
await axios.put(basicInfoUrl, { work: 'Engineer' }, ...);
const res = await axios.get(currentUserUrl, ...);
expect(res.data.user.work).toBe('Engineer');  // might be pre-existing value!

// Good: use a value that is unlikely to pre-exist
// Timestamps or unique suffixes make values distinct
const testWork = `QA Automation Engineer (test-${Date.now()})`;
```

### 3. Save the original value and restore it

Lecture 4's `beforeAll` captures the original values before any test modifies them, and `afterAll` restores them. This prevents test state from leaking into the user's actual profile.

```typescript
let originalWork = '';
let originalQuote = '';

beforeAll(async () => {
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  originalWork  = currentRes.data.user?.work  ?? '';
  originalQuote = currentRes.data.user?.quote ?? '';
});

afterAll(async () => {
  // Restore original values
  await axios.put(basicInfoUrl,
    { work: originalWork, quote: originalQuote },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );
});
```

### 4. Verify status 200 before asserting the value

```typescript
it('work field persists', async () => {
  await axios.put(basicInfoUrl, { work: testWork }, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });

  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });

  // Check the GET itself succeeded before asserting the value
  expect(res.status).toBe(200);
  expect(res.data.user.work).toBe(testWork);
});
```

If the GET returns 401 or 500, the `res.data.user.work` assertion fails with `Cannot read property 'work' of undefined` instead of a clear error message. Asserting status first gives a more useful failure.

---

## Real Examples from Lecture 4

The full state verification section from `tests/lecture-04/lecture.test.ts`:

```typescript
// ─── 4. State verification ────────────────────────────────────────────────────
//
// After calling PUT, we call GET /currentuser to CONFIRM the change was saved.
//
// A 200 from PUT only tells you the server accepted the request.
// It does NOT tell you the data was actually stored.
// The GET verification is the proof.

describe('4. State verification', () => {

  const testWork  = 'QA Automation Engineer';
  const testQuote = 'Quality is not an act, it is a habit';

  beforeAll(async () => {
    // Make the update
    await axios.put(basicInfoUrl,
      { work: testWork, quote: testQuote },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
  });

  it('GET /currentuser reflects the updated work field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.work).toBe(testWork);
  });

  it('GET /currentuser reflects the updated quote field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.quote).toBe(testQuote);
  });

});
```

And the notification settings verification from Section 5:

```typescript
it('GET /currentuser reflects updated notification settings', async () => {
  await axios.put(settingsUrl,
    { reactions: false },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(res.data.user.notifications.reactions).toBe(false);
});
```

---

## Extending the Pattern to Other Endpoints

The PUT → GET pattern applies to any endpoint that modifies state:

| Write endpoint | Read endpoint | What to verify |
|---|---|---|
| `PUT /user/profile/basic-info` | `GET /currentuser` | `user.work`, `user.quote`, `user.location` |
| `PUT /user/profile/settings` | `GET /currentuser` | `user.notifications.reactions`, etc. |
| `POST /post` (create) | `GET /post/:id` | post content, post fields |
| `PUT /post/:id` (update) | `GET /post/:id` | updated content |
| `POST /comment` | `GET /comment/:postId` | comment appears in list |
| `PUT /user/follow/:id` | `GET /user/following` | followed user appears in list |

The general rule: whenever a test modifies server-side state, add a GET call afterward to confirm the state change was applied.

---

## What Happens When State Verification Fails

If `expect(res.data.user.work).toBe('QA Automation Engineer')` fails, what does it mean?

**Possibility 1: The PUT endpoint has a bug.** It returned 200 but did not actually write to Redis or MongoDB. This is the bug the test is designed to catch.

**Possibility 2: The GET endpoint has a bug.** It is reading from the wrong cache key or a stale snapshot. The write succeeded but the read does not reflect it.

**Possibility 3: Race condition.** The PUT queued a Redis write asynchronously and the GET arrived before the write was processed. For Chatty's profile endpoints, this should not happen (Redis write is synchronous), but it is worth considering for other endpoints.

**Possibility 4: Test data collision.** Another test (running concurrently, or a previous test that did not clean up) modified the same field. Since `fileParallelism: false` prevents concurrent test files, and the file-level `beforeAll` captures and restores the original value, this should not happen in correctly written tests.

When a state verification test fails, the debugging approach is:
1. Run the test in isolation: `npm test tests/lecture-04/lecture.test.ts`.
2. Add `console.log(res.data.user)` to inspect what was actually returned.
3. Check whether the PUT response itself indicated success.
4. Check the API manually using curl or Postman to see the current state of the field.

---

## Common Mistakes

### Mistake: only checking the PUT response status

```typescript
// Insufficient: only proves the server accepted the request
it('updates work field', async () => {
  const res = await axios.put(basicInfoUrl,
    { work: 'QA Engineer' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );
  expect(res.status).toBe(200);
  // Missing: verify the value was stored
});
```

### Mistake: asserting against the PUT response body instead of a GET

```typescript
// Wrong: the PUT response from /user/profile/basic-info is just { message: 'Updated successfully' }
// It does not include the updated user object
it('work field is updated', async () => {
  const res = await axios.put(basicInfoUrl,
    { work: 'QA Engineer' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );
  expect(res.data.user.work).toBe('QA Engineer');  // res.data.user is undefined!
});

// Correct: read from GET /currentuser
it('work field persists', async () => {
  await axios.put(basicInfoUrl, { work: 'QA Engineer' }, ...);
  const getRes = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, ... });
  expect(getRes.data.user.work).toBe('QA Engineer');
});
```

### Mistake: using a value that might already be set

```typescript
// Risky: if 'Engineer' was already in the database, the test passes even if PUT did nothing
await axios.put(basicInfoUrl, { work: 'Engineer' }, ...);
const res = await axios.get(currentUserUrl, ...);
expect(res.data.user.work).toBe('Engineer');  // might be pre-existing!
```

Use distinctive values or capture and compare against a known previous state.

---

## Related Topics

- [Test Lifecycle](test-lifecycle.md) — structuring beforeAll for the write phase
- [Test Cleanup](test-cleanup.md) — restoring state after state verification tests
- [Two-User Scenario](two-user-scenario.md) — state verification for social interactions

## Official Documentation

- [Martin Fowler — Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Redis — Caching patterns](https://redis.io/docs/manual/patterns/)
