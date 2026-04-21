# Async/Await in JavaScript and Vitest

## Table of Contents

1. [Why JavaScript Is Asynchronous](#1-why-javascript-is-asynchronous)
2. [The Event Loop (Brief Overview)](#2-the-event-loop-brief-overview)
3. [Callbacks: The Old Way](#3-callbacks-the-old-way)
4. [Promises](#4-promises)
5. [Async/Await: The Modern Way](#5-asyncawait-the-modern-way)
6. [How Await Works Inside a Vitest Test](#6-how-await-works-inside-a-vitest-test)
7. [The .then() Pattern and Why You Must Return It in Vitest](#7-the-then-pattern-and-why-you-must-return-it-in-vitest)
8. [Error Handling: try/catch vs validateStatus](#8-error-handling-trycatch-vs-validatestatus)
9. [Common Mistakes](#9-common-mistakes)
10. [Real Chatty API Examples](#10-real-chatty-api-examples)
11. [Related Topics](#related-topics)

---

## 1. Why JavaScript Is Asynchronous

JavaScript was designed to run in a browser where a single thread handles everything: rendering the page, responding to clicks, and running your code. If your code blocked that thread while waiting for a network response, the browser would freeze.

The solution was to make I/O operations *asynchronous*: instead of waiting for a result, you hand off the work and provide instructions for what to do when it finishes. Your code continues running in the meantime.

In API testing, every HTTP request is asynchronous. When you call `axios.post('https://api.codeandtest.com/api/v1/auth/signin', ...)`, the result does not come back instantly. It travels across the network, the server processes it, and a response returns — all of which takes time. Your test code must correctly wait for this to finish before making assertions.

If you do not wait for a response, you assert against `undefined` and get false positives or confusing errors.

---

## 2. The Event Loop (Brief Overview)

Node.js uses a single-threaded event loop to process asynchronous work:

```
   Your Code
       |
   [Call Stack]  ← runs synchronous code
       |
   [Web APIs / libuv]  ← handles I/O (HTTP, file system, timers)
       |
   [Callback Queue / Microtask Queue]
       |
   [Event Loop]  ← picks callbacks when the call stack is empty
```

When you `await` a Promise:
1. The current function is suspended.
2. Control returns to the event loop.
3. When the Promise resolves, the function resumes from where it left off.

This is why `await` can only be used inside an `async` function — the function must be suspendable.

---

## 3. Callbacks: The Old Way

Before Promises, asynchronous code used *callbacks*: functions passed as arguments that get called when the work is done.

```javascript
// Old callback style (you will not use this in the course, but know it exists)
http.get('https://api.codeandtest.com/api/v1/posts', function(response) {
  let data = '';
  response.on('data', chunk => { data += chunk; });
  response.on('end', function() {
    const parsed = JSON.parse(data);
    console.log(parsed);
    // Any assertions would go here — nested inside the callback
  });
});
// Code here runs BEFORE the callback fires — the response is not available yet
```

**The problem:** callbacks nest deeply ("callback hell"), make error handling difficult, and are hard to read. Promises and async/await solved this.

---

## 4. Promises

A Promise is an object that represents the eventual result of an asynchronous operation. It has three states:

| State | Meaning |
|-------|---------|
| `pending` | The operation has not finished yet |
| `fulfilled` | The operation succeeded; a value is available |
| `rejected` | The operation failed; an error is available |

### Creating a Promise

```typescript
const myPromise = new Promise<string>((resolve, reject) => {
  setTimeout(() => {
    resolve('done');         // fulfills the promise
    // reject(new Error('failed'));  // would reject it instead
  }, 1000);
});
```

### Consuming a Promise with .then()

```typescript
myPromise
  .then(value => {
    console.log(value); // 'done'
    return value.toUpperCase(); // chain further
  })
  .then(upper => {
    console.log(upper); // 'DONE'
  })
  .catch(error => {
    console.error(error); // handles rejection from any step above
  });
```

Axios returns Promises. Every `axios.get()`, `axios.post()`, etc. gives you a Promise that resolves with an `AxiosResponse` object.

---

## 5. Async/Await: The Modern Way

`async/await` is syntactic sugar over Promises. It lets you write asynchronous code that *looks* synchronous.

### The `async` keyword

Marking a function `async` does two things:
1. It allows `await` to be used inside the function body.
2. It wraps the return value in a Promise automatically.

```typescript
async function fetchPost(id: string) {
  // This function always returns a Promise, even if you write `return someObject`
  return someObject;
}
```

### The `await` keyword

`await` pauses execution of the `async` function until the Promise resolves, then unwraps the value.

```typescript
async function signIn() {
  const response = await axios.post(
    'https://api.codeandtest.com/api/v1/auth/signin',
    { username: 'vitestUser', password: 'Pass1234!' }
  );
  // `response` is now the resolved AxiosResponse — not a Promise
  console.log(response.status); // 200
  console.log(response.data);   // { token: '...', user: { ... } }
}
```

Without `await`, `response` would be a pending `Promise<AxiosResponse>`, and `response.status` would be `undefined`.

---

## 6. How Await Works Inside a Vitest Test

Vitest supports `async` test functions natively. You declare the test callback as `async`, and Vitest waits for the returned Promise to resolve before marking the test as passed or failed.

```typescript
import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('Auth endpoints', () => {
  it('signs in and returns a token', async () => {
    // `async` makes this callback return a Promise
    // Vitest awaits that Promise

    const response = await axios.post(
      'https://api.codeandtest.com/api/v1/auth/signin',
      { username: 'vitestUser', password: 'Pass1234!' },
      { validateStatus: () => true }
    );

    // These assertions only run AFTER await resolves
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
  });
});
```

**Key mechanic:** Vitest inspects the return value of your test callback. If it is a Promise (which `async` functions always return), Vitest waits for it. If the Promise rejects (unhandled error), the test fails. If it resolves, the test passes (assuming no `expect` failures).

---

## 7. The .then() Pattern and Why You Must Return It in Vitest

Some test patterns use `.then()` instead of `await`. This is valid but has a critical requirement: **you must `return` the Promise chain**.

### Why returning matters

Vitest determines whether a test is asynchronous by inspecting the return value of the test callback. If you do not return the Promise, Vitest assumes the test is synchronous and marks it as passed immediately — before the `.then()` callback ever runs. Your assertions never execute.

```typescript
// WRONG — Vitest does not wait; test always passes regardless of what happens inside
it('gets posts', () => {
  axios.get('https://api.codeandtest.com/api/v1/posts')
    .then(response => {
      expect(response.status).toBe(200); // This never runs!
    });
  // Vitest sees no return value, assumes synchronous, exits immediately
});
```

```typescript
// CORRECT — return the Promise chain
it('gets posts', () => {
  return axios.get('https://api.codeandtest.com/api/v1/posts')
    .then(response => {
      expect(response.status).toBe(200); // This runs correctly
    });
});
```

```typescript
// ALSO CORRECT — async/await is cleaner and avoids this footgun entirely
it('gets posts', async () => {
  const response = await axios.get('https://api.codeandtest.com/api/v1/posts');
  expect(response.status).toBe(200);
});
```

### When you might see .then() in course code

Sometimes `.then()` is used to extract a value from a chain and assign it:

```typescript
// Assigning within a chain — still must return
it('creates a post and verifies it exists', () => {
  return axios.post('https://api.codeandtest.com/api/v1/posts', { body: 'Hello' }, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(createResponse => {
    expect(createResponse.status).toBe(201);
    const postId = createResponse.data._id;
    return axios.get(`https://api.codeandtest.com/api/v1/posts/${postId}`);
  })
  .then(getResponse => {
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.body).toBe('Hello');
  });
});
```

This is valid but the async/await equivalent is easier to read:

```typescript
it('creates a post and verifies it exists', async () => {
  const createResponse = await axios.post(
    'https://api.codeandtest.com/api/v1/posts',
    { body: 'Hello' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(createResponse.status).toBe(201);

  const postId = createResponse.data._id;
  const getResponse = await axios.get(`https://api.codeandtest.com/api/v1/posts/${postId}`);
  expect(getResponse.status).toBe(200);
  expect(getResponse.data.body).toBe('Hello');
});
```

---

## 8. Error Handling: try/catch vs validateStatus

### Using try/catch with async/await

If an `await`ed Promise rejects, execution jumps to the nearest `catch` block — just like synchronous exceptions.

```typescript
it('handles network errors gracefully', async () => {
  try {
    const response = await axios.get('https://api.codeandtest.com/api/v1/nonexistent');
    // If Axios throws (e.g. 404 by default), we never reach here
    expect(response.status).toBe(200);
  } catch (error) {
    // Axios throws on 4xx/5xx by default
    expect(error.response.status).toBe(404);
  }
});
```

**However**, this pattern is awkward for API testing because you are intentionally testing error responses. A 401 or 404 is an *expected outcome*, not an exceptional case.

### Using validateStatus: () => true

The better approach in this course is `validateStatus: () => true`, which tells Axios to never throw — instead, always return the response object regardless of status code:

```typescript
it('returns 401 when token is missing', async () => {
  const response = await axios.get(
    'https://api.codeandtest.com/api/v1/posts',
    { validateStatus: () => true }  // never throws
  );

  // We can assert directly on the status — no try/catch needed
  expect(response.status).toBe(401);
});
```

This is the standard pattern used throughout the Chatty API test suite. See [axios.md](axios.md) for full details on `validateStatus`.

### When to use try/catch in tests

Use try/catch when:
- You are testing that a function throws in certain conditions
- You need to clean up resources in a `finally` block
- You are handling unexpected errors (network down, DNS failure, etc.)

```typescript
afterAll(async () => {
  try {
    await axios.delete(
      `https://api.codeandtest.com/api/v1/test/cleanup/user/${authId}`,
      { headers: { 'x-test-secret': process.env.TEST_SECRET } }
    );
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
    // Do not let cleanup failure fail the test suite
  }
});
```

---

## 9. Common Mistakes

### Mistake 1: Forgetting await

```typescript
// WRONG
it('checks signup response', async () => {
  const response = axios.post(  // missing await
    'https://api.codeandtest.com/api/v1/auth/signup',
    { username: 'vitestUser', password: 'Pass1234!' }
  );
  expect(response.status).toBe(201); // response is a Promise, not a response object
  // response.status is undefined — assertion passes vacuously or fails with wrong message
});

// CORRECT
it('checks signup response', async () => {
  const response = await axios.post(
    'https://api.codeandtest.com/api/v1/auth/signup',
    { username: 'vitestUser', password: 'Pass1234!' }
  );
  expect(response.status).toBe(201);
});
```

**How to spot this bug:** TypeScript will sometimes warn you: "Promise<AxiosResponse> has no property 'status'". If you see type errors about missing properties on what you think is a response object, you probably forgot `await`.

### Mistake 2: Forgetting return in .then() chains

Covered in [Section 7](#7-the-then-pattern-and-why-you-must-return-it-in-vitest). The test always appears to pass.

### Mistake 3: Using async in beforeAll incorrectly

`beforeAll` supports `async` callbacks — Vitest waits for the returned Promise. This is the correct way to set up shared state like a JWT token.

```typescript
let token: string;

// CORRECT
beforeAll(async () => {
  const response = await axios.post(
    'https://api.codeandtest.com/api/v1/auth/signin',
    { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
    { validateStatus: () => true }
  );
  token = response.data.token;
});

// WRONG — forgetting async, token is never assigned
beforeAll(() => {
  const response = axios.post(  // returns a Promise that is ignored
    'https://api.codeandtest.com/api/v1/auth/signin',
    { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD }
  );
  token = response.data.token;  // response is a Promise, .data is undefined
});
```

### Mistake 4: Awaiting in a non-async function

```typescript
// WRONG — syntax error: await outside async function
function getToken() {
  const response = await axios.post(...); // SyntaxError
  return response.data.token;
}

// CORRECT
async function getToken() {
  const response = await axios.post(...);
  return response.data.token;
}
```

### Mistake 5: Not awaiting Promise.all

When you run multiple requests in parallel with `Promise.all`, you still need to await the combined result:

```typescript
// WRONG
const [postsResponse, profileResponse] = Promise.all([
  axios.get('https://api.codeandtest.com/api/v1/posts'),
  axios.get('https://api.codeandtest.com/api/v1/users/me')
]);

// CORRECT
const [postsResponse, profileResponse] = await Promise.all([
  axios.get('https://api.codeandtest.com/api/v1/posts'),
  axios.get('https://api.codeandtest.com/api/v1/users/me')
]);
```

---

## 10. Real Chatty API Examples

### Example 1: Sign up, sign in, then make an authenticated request

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { faker } from '@faker-js/faker';

const BASE_URL = 'https://api.codeandtest.com/api/v1';

describe('Post creation flow', () => {
  let token: string;
  let authId: string;
  const username = `vitest${faker.internet.username()}`;
  const password = 'Test1234!';

  beforeAll(async () => {
    // Step 1: Create test user
    await axios.post(`${BASE_URL}/auth/signup`, {
      username,
      email: faker.internet.email(),
      password,
      avatarColor: 'red',
      avatarImage: ''
    }, { validateStatus: () => true });

    // Step 2: Sign in to get token
    const signinResponse = await axios.post(
      `${BASE_URL}/auth/signin`,
      { username, password },
      { validateStatus: () => true }
    );

    token = signinResponse.data.token;
    authId = signinResponse.data.user._id;
  });

  it('creates a post successfully', async () => {
    const response = await axios.post(
      `${BASE_URL}/posts`,
      {
        post: faker.lorem.sentence(),
        bgColor: '#ffffff',
        feelings: '',
        gifUrl: '',
        image: '',
        privacy: 'Public',
        profilePicture: ''
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    expect(response.status).toBe(201);
    expect(response.data.message).toBe('Post created successfully');
  });

  afterAll(async () => {
    await axios.delete(
      `${BASE_URL}/test/cleanup/user/${authId}`,
      {
        headers: { 'x-test-secret': process.env.TEST_SECRET },
        validateStatus: () => true
      }
    );
  });
});
```

### Example 2: Using .then() style (with correct return)

```typescript
describe('User profile', () => {
  it('returns current user profile when authenticated', () => {
    return axios.post(
      `${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true }
    )
    .then(signinResponse => {
      expect(signinResponse.status).toBe(200);
      const token = signinResponse.data.token;

      return axios.get(`${BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
    })
    .then(profileResponse => {
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.user).toBeDefined();
    });
  });
});
```

### Example 3: Parallel requests with Promise.all

```typescript
it('can fetch posts and reactions simultaneously', async () => {
  const [postsResponse, reactionsResponse] = await Promise.all([
    axios.get(`${BASE_URL}/posts/all/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }),
    axios.get(`${BASE_URL}/reactions/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    })
  ]);

  expect(postsResponse.status).toBe(200);
  expect(reactionsResponse.status).toBe(200);
});
```

---

## Related Topics

- [Axios](axios.md) — HTTP client used in every test; understand `validateStatus` and the response object
- [Vitest](vitest.md) — Test runner; how `beforeAll`/`afterAll` handle async, full matcher reference
- [TypeScript Basics](typescript-basics.md) — Typing async functions, `AxiosResponse<T>`, `Awaited<ReturnType<...>>`
- [Environment Variables](environment-variables.md) — `process.env.TEST_USERNAME` and other runtime values used in tests
- [Faker](faker.md) — Generating dynamic test data for the username/email/password fields seen in examples above

## Official Documentation

- [MDN — async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN — Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN — await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [JavaScript.info — Async/await](https://javascript.info/async-await)
