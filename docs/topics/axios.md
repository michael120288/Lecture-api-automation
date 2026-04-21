# Axios: HTTP Client for API Testing

## Table of Contents

1. [What Axios Is and Why Use It Over fetch](#1-what-axios-is-and-why-use-it-over-fetch)
2. [Installing Axios](#2-installing-axios)
3. [Making HTTP Requests](#3-making-http-requests)
4. [The Response Object](#4-the-response-object)
5. [validateStatus: () => true — The Essential Pattern](#5-validatestatus---true--the-essential-pattern)
6. [Default Axios Behavior on 4xx/5xx](#6-default-axios-behavior-on-4xx5xx)
7. [Passing Headers](#7-passing-headers)
8. [The AxiosResponse TypeScript Type](#8-the-axiosresponse-typescript-type)
9. [Common Patterns in This Course](#9-common-patterns-in-this-course)
10. [Real Chatty API Examples for Every Method](#10-real-chatty-api-examples-for-every-method)
11. [Related Topics](#related-topics)

---

## 1. What Axios Is and Why Use It Over fetch

Axios is a Promise-based HTTP client for Node.js and browsers. The native alternative is the `fetch` API (built into modern browsers and Node.js 18+).

### Why Axios over fetch in this course

| Feature | Axios | fetch |
|---------|-------|-------|
| Error handling on 4xx/5xx | Throws by default; `validateStatus` overrides | Never throws on HTTP errors — must check `response.ok` manually |
| Response body parsing | Automatic JSON parsing | Must call `await response.json()` manually |
| Request body serialization | Automatic for objects | Must call `JSON.stringify(body)` and set `Content-Type` header manually |
| TypeScript generics | `AxiosResponse<T>` types `response.data` | `Response` type — `response.json()` returns `any` |
| Interceptors | Built-in request/response interceptors | Requires custom wrapper code |
| Base URL config | `axios.create({ baseURL })` | Manual string concatenation everywhere |
| Timeout | `timeout: 5000` option | No built-in timeout — needs `AbortController` |

For the purpose of testing REST APIs, Axios provides a cleaner and more explicit API than fetch.

### What Axios is NOT

- Axios is not a test runner — that is Vitest's job
- Axios is not a mock library — for mocking HTTP, use tools like `msw` or Vitest's mock utilities
- Axios does not assert anything — you still use `expect()` for assertions

---

## 2. Installing Axios

```bash
npm install axios
```

Axios includes its own TypeScript definitions — no separate `@types/axios` package is needed.

### Importing in tests

```typescript
// Named import for types
import axios, { AxiosResponse } from 'axios';

// Or default import if you only need to make requests
import axios from 'axios';
```

---

## 3. Making HTTP Requests

Axios provides methods for each HTTP verb. All of them return `Promise<AxiosResponse>`.

### GET

```typescript
// Basic GET
const response = await axios.get('https://api.codeandtest.com/api/v1/posts/all/0');

// GET with query parameters
const response = await axios.get('https://api.codeandtest.com/api/v1/posts/search', {
  params: { search: 'hello world', page: 1 }
  // Results in: /posts/search?search=hello+world&page=1
});

// GET with headers and validateStatus
const response = await axios.get('https://api.codeandtest.com/api/v1/user/profile', {
  headers: { Authorization: `Bearer ${token}` },
  validateStatus: () => true
});
```

### POST

```typescript
// POST with JSON body
const response = await axios.post(
  'https://api.codeandtest.com/api/v1/auth/signup',
  {
    username: 'vitestUser123',
    email: 'test@example.com',
    password: 'Pass1234!',
    avatarColor: 'red',
    avatarImage: ''
  },
  { validateStatus: () => true }
);

// POST with headers
const response = await axios.post(
  'https://api.codeandtest.com/api/v1/posts',
  { post: 'Hello world', bgColor: '#ffffff', privacy: 'Public' },
  {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  }
);
```

### PUT

```typescript
// PUT — full replacement of a resource
const response = await axios.put(
  `https://api.codeandtest.com/api/v1/user/${userId}`,
  {
    quote: 'Updated quote',
    work: 'Engineer',
    school: 'University'
  },
  {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  }
);
```

### PATCH

```typescript
// PATCH — partial update
const response = await axios.patch(
  'https://api.codeandtest.com/api/v1/user/change-password',
  {
    currentPassword: 'OldPass123!',
    newPassword: 'NewPass456!'
  },
  {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  }
);
```

### DELETE

```typescript
// DELETE with headers
const response = await axios.delete(
  `https://api.codeandtest.com/api/v1/posts/${postId}`,
  {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  }
);

// Cleanup endpoint — requires x-test-secret header
const response = await axios.delete(
  `https://api.codeandtest.com/api/v1/test/cleanup/user/${authId}`,
  {
    headers: { 'x-test-secret': process.env.TEST_SECRET },
    validateStatus: () => true
  }
);
```

---

## 4. The Response Object

Every Axios request returns an `AxiosResponse` object. Understanding its shape is essential for writing assertions.

### AxiosResponse properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T` (any by default) | The response body, automatically parsed from JSON |
| `status` | `number` | The HTTP status code (200, 201, 400, 401, etc.) |
| `statusText` | `string` | The HTTP status message ("OK", "Created", "Unauthorized") |
| `headers` | `AxiosResponseHeaders` | Response headers object |
| `config` | `InternalAxiosRequestConfig` | The request configuration that was used |
| `request` | `any` | The underlying Node.js `http.ClientRequest` |

### Accessing the response in tests

```typescript
const response = await axios.post(
  'https://api.codeandtest.com/api/v1/auth/signin',
  { username: 'vitestUser', password: 'Pass1234!' },
  { validateStatus: () => true }
);

// Status code
console.log(response.status);        // 200
console.log(response.statusText);    // "OK"

// Response body (automatically parsed JSON)
console.log(response.data);          // { token: '...', user: { _id: '...', ... } }
console.log(response.data.token);    // 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
console.log(response.data.user._id); // '64a2b3c4d5e6f7890abc1234'

// Response headers
console.log(response.headers['content-type']); // 'application/json; charset=utf-8'
console.log(response.headers['set-cookie']);   // ['session=...; HttpOnly; ...']
```

### Extracting Set-Cookie

The Chatty API uses cookie-session for some authentication flows. Extracting the cookie from headers:

```typescript
const signinResponse = await axios.post(
  'https://api.codeandtest.com/api/v1/auth/signin',
  { username, password },
  { validateStatus: () => true }
);

// set-cookie is an array of cookie strings
const cookies = signinResponse.headers['set-cookie'];
// cookies: ['session=abc123; Path=/; HttpOnly; SameSite=Strict', ...]

// Join them to send back in requests
const cookieHeader = cookies?.join('; ');

// Use in subsequent requests
const profileResponse = await axios.get(
  'https://api.codeandtest.com/api/v1/user/currentuser',
  {
    headers: { Cookie: cookieHeader },
    validateStatus: () => true
  }
);
```

---

## 5. validateStatus: () => true — The Essential Pattern

This is the most important Axios option to understand in this course.

### What it does

`validateStatus` is a function that receives the HTTP status code and returns `true` if Axios should resolve the Promise (treat as success), or `false` if Axios should reject the Promise (throw an error).

The default behavior is:

```typescript
// Axios default validateStatus — throws on anything outside 2xx
validateStatus: (status) => status >= 200 && status < 300
```

Setting it to `() => true` means "always resolve, regardless of status code":

```typescript
validateStatus: () => true
// Equivalent to: validateStatus: (status) => true
// Every status code resolves — never throws
```

### Why this is essential for testing

When testing an API, you *want* to test error responses. A 401 Unauthorized, a 400 Bad Request, or a 404 Not Found are expected outcomes that you need to assert on.

Without `validateStatus: () => true`:

```typescript
// PROBLEM: Axios throws on 401, so you must use try/catch
it('returns 401 when no token is provided', async () => {
  try {
    const response = await axios.get('https://api.codeandtest.com/api/v1/posts');
    // If we reach here, test should fail — but how?
    expect(response.status).toBe(401); // this never runs
  } catch (error) {
    // Only way to access the response
    expect(error.response.status).toBe(401);
  }
});
```

With `validateStatus: () => true`:

```typescript
// CLEAN: No try/catch needed — always get the response object
it('returns 401 when no token is provided', async () => {
  const response = await axios.get(
    'https://api.codeandtest.com/api/v1/posts',
    { validateStatus: () => true }
  );

  expect(response.status).toBe(401);
  expect(response.data.message).toContain('not authenticated');
});
```

### Setting validateStatus globally with axios.create()

Rather than adding `validateStatus: () => true` to every individual request, create a configured Axios instance:

```typescript
// src/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1',
  timeout: 10000,
  validateStatus: () => true,  // never throw on HTTP status codes
});
```

Then in tests:

```typescript
import { apiClient } from '../../src/apiClient';

const response = await apiClient.get('/posts/all/0');         // no validateStatus needed
const response = await apiClient.post('/auth/signin', body);  // no validateStatus needed
```

---

## 6. Default Axios Behavior on 4xx/5xx

It is important to understand what Axios does *by default* so you know when to override it.

### What happens without validateStatus: () => true

```typescript
// Default behavior — throws an AxiosError on 4xx/5xx
const response = await axios.post(
  'https://api.codeandtest.com/api/v1/auth/signin',
  { username: 'wronguser', password: 'wrongpass' }
  // no validateStatus — using default
);
// If the server returns 401, this line THROWS:
// AxiosError: Request failed with status code 401
```

### The AxiosError object

When Axios throws, the error is an `AxiosError`. You can inspect the response from the `error.response` property:

```typescript
try {
  const response = await axios.post(url, body);
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.log(error.response?.status);   // e.g. 401
    console.log(error.response?.data);     // e.g. { message: 'Invalid credentials' }
    console.log(error.message);            // 'Request failed with status code 401'
  }
}
```

### When to use default behavior (letting Axios throw)

- When you are NOT testing HTTP errors and just want clean code for expected-success calls
- In production code (application code, not test code) where an API error is genuinely exceptional
- When testing that a helper function correctly handles API errors

For test code in this course, **always use `validateStatus: () => true`** unless you have a specific reason not to.

---

## 7. Passing Headers

HTTP headers carry metadata: authentication tokens, content type, cookies, custom headers.

### Authorization header (Bearer token)

```typescript
const response = await axios.get(
  'https://api.codeandtest.com/api/v1/posts/all/0',
  {
    headers: {
      Authorization: `Bearer ${token}`
      // Note: "Bearer " prefix with a capital B and a space
    },
    validateStatus: () => true
  }
);
```

### Cookie header

```typescript
const response = await axios.get(
  'https://api.codeandtest.com/api/v1/user/currentuser',
  {
    headers: {
      Cookie: sessionCookie  // e.g. "session=abc123"
    },
    validateStatus: () => true
  }
);
```

### Custom headers

```typescript
// The test cleanup endpoint requires x-test-secret
const response = await axios.delete(
  `https://api.codeandtest.com/api/v1/test/cleanup/user/${authId}`,
  {
    headers: {
      'x-test-secret': process.env.TEST_SECRET
    },
    validateStatus: () => true
  }
);
```

### Multiple headers together

```typescript
const response = await axios.post(
  'https://api.codeandtest.com/api/v1/comments',
  { comment: 'Great post!', postId: '64a2b3c4d5e6f7890abc1234' },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',  // Axios sets this automatically for objects
      'X-Request-ID': faker.string.uuid()  // custom tracking header
    },
    validateStatus: () => true
  }
);
```

### Note on Content-Type

Axios automatically sets `Content-Type: application/json` when you pass a plain JavaScript object as the request body. You do not need to set it manually in most cases.

---

## 8. The AxiosResponse TypeScript Type

Axios exports a generic `AxiosResponse<T>` type. The type parameter `T` is the type of `response.data`.

```typescript
import { AxiosResponse } from 'axios';

// Without generic — response.data is `any`
const response: AxiosResponse = await axios.post(url, body);

// With generic — response.data is typed
interface SigninData {
  token: string;
  user: { _id: string; username: string; email: string; };
}

const response: AxiosResponse<SigninData> = await axios.post<SigninData>(url, body);
// response.data.token — TypeScript knows this is string
// response.data.nonexistent — TypeScript error
```

### Passing the generic to the Axios method

```typescript
// The generic goes on the Axios method, not the variable declaration
const response = await axios.post<SigninData>(url, body, config);
// TypeScript infers: response is AxiosResponse<SigninData>
```

### Practical course examples

```typescript
interface SignupResponseData {
  message: string;
  user: {
    _id: string;
    username: string;
    uId: string;
    email: string;
    avatarColor: string;
    avatarImage: string;
  };
}

interface PostCreatedResponseData {
  message: string;
}

interface PostsListResponseData {
  message: string;
  posts: Array<{
    _id: string;
    post: string;
    username: string;
    createdAt: string;
  }>;
  totalPosts: number;
}

// Using them in tests:
const signupResponse = await axios.post<SignupResponseData>(
  `${BASE_URL}/auth/signup`,
  signupPayload,
  { validateStatus: () => true }
);

if (signupResponse.status === 200) {
  authId = signupResponse.data.user._id;  // fully typed
}
```

---

## 9. Common Patterns in This Course

### Pattern 1: Sign up → Sign in → Store token → Run tests → Cleanup

```typescript
describe('Protected endpoints', () => {
  let token!: string;
  let authId!: string;

  const username = `vitest${faker.internet.username()}`.slice(0, 20);
  const password = 'Test1234!';
  const email = faker.internet.email();

  beforeAll(async () => {
    // 1. Create test user
    const signupRes = await axios.post(
      `${BASE_URL}/auth/signup`,
      { username, email, password, avatarColor: 'blue', avatarImage: '' },
      { validateStatus: () => true }
    );
    expect(signupRes.status).toBe(200);

    // 2. Sign in to get JWT
    const signinRes = await axios.post(
      `${BASE_URL}/auth/signin`,
      { username, password },
      { validateStatus: () => true }
    );
    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;
    authId = signinRes.data.user._id;
  });

  afterAll(async () => {
    await axios.delete(
      `${BASE_URL}/test/cleanup/user/${authId}`,
      { headers: { 'x-test-secret': process.env.TEST_SECRET }, validateStatus: () => true }
    );
  });

  it('fetches posts with valid token', async () => {
    const response = await axios.get(`${BASE_URL}/posts/all/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    expect(response.status).toBe(200);
  });
});
```

### Pattern 2: Capturing a JWT from signin

```typescript
async function signIn(username: string, password: string): Promise<string> {
  const response = await axios.post(
    `${BASE_URL}/auth/signin`,
    { username, password },
    { validateStatus: () => true }
  );

  if (response.status !== 200) {
    throw new Error(`Sign-in failed with status ${response.status}: ${JSON.stringify(response.data)}`);
  }

  return response.data.token;
}
```

### Pattern 3: Capturing a session cookie

```typescript
async function getSessionCookie(username: string, password: string): Promise<string> {
  const response = await axios.post(
    `${BASE_URL}/auth/signin`,
    { username, password },
    { validateStatus: () => true }
  );

  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('No Set-Cookie header in signin response');
  }

  return setCookieHeader.join('; ');
}
```

### Pattern 4: Asserting on a 4xx error response

```typescript
it('returns 400 when username is missing', async () => {
  const response = await axios.post(
    `${BASE_URL}/auth/signup`,
    {
      // username intentionally missing
      email: 'test@example.com',
      password: 'Pass1234!',
      avatarColor: 'red',
      avatarImage: ''
    },
    { validateStatus: () => true }
  );

  expect(response.status).toBe(400);
  expect(response.data.message).toBeDefined();
});

it('returns 401 when no Authorization header is sent', async () => {
  const response = await axios.get(
    `${BASE_URL}/posts/all/0`,
    { validateStatus: () => true }  // no Authorization header
  );

  expect(response.status).toBe(401);
});
```

---

## 10. Real Chatty API Examples for Every Method

### GET — Fetch paginated posts

```typescript
it('GET /posts/all/:page — returns posts array with pagination', async () => {
  const response = await axios.get(
    `${BASE_URL}/posts/all/0`,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }
  );

  expect(response.status).toBe(200);
  expect(response.data.posts).toBeDefined();
  expect(Array.isArray(response.data.posts)).toBe(true);
  expect(response.data.totalPosts).toBeGreaterThan(0);
});
```

### POST — Create a new post

```typescript
it('POST /posts — creates a new post', async () => {
  const postText = faker.lorem.sentence();

  const response = await axios.post(
    `${BASE_URL}/posts`,
    {
      post: postText,
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
```

### PUT — Update user profile

```typescript
it('PUT /user/:userId — updates profile fields', async () => {
  const response = await axios.put(
    `${BASE_URL}/user/${userId}`,
    {
      quote: 'Testing is caring',
      work: 'QA Engineer',
      school: 'QA Academy',
      location: 'Remote',
      website: 'https://example.com',
      instagram: '',
      twitter: '',
      facebook: '',
      youtube: ''
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }
  );

  expect(response.status).toBe(200);
  expect(response.data.message).toBe('Profile updated successfully');
});
```

### PATCH — Change password

```typescript
it('PATCH /user/change-password — changes user password', async () => {
  const response = await axios.patch(
    `${BASE_URL}/user/change-password`,
    {
      currentPassword: password,
      newPassword: 'NewPass789!'
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }
  );

  expect(response.status).toBe(200);
});
```

### DELETE — Delete a post

```typescript
it('DELETE /posts/:postId — deletes a post owned by the user', async () => {
  // First create a post
  const createResponse = await axios.post(
    `${BASE_URL}/posts`,
    { post: faker.lorem.sentence(), bgColor: '#ffffff', privacy: 'Public',
      feelings: '', gifUrl: '', image: '', profilePicture: '' },
    { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
  );
  expect(createResponse.status).toBe(201);

  const postId: string = createResponse.data._id;

  // Then delete it
  const deleteResponse = await axios.delete(
    `${BASE_URL}/posts/${postId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }
  );

  expect(deleteResponse.status).toBe(200);
});
```

### DELETE — Cleanup endpoint

```typescript
afterAll(async () => {
  if (!authId) return;

  const response = await axios.delete(
    `${BASE_URL}/test/cleanup/user/${authId}`,
    {
      headers: { 'x-test-secret': process.env.TEST_SECRET },
      validateStatus: () => true
    }
  );

  if (response.status !== 200) {
    console.warn(`Cleanup warning: status ${response.status}`, response.data);
  }
});
```

---

## Related Topics

- [Async/Await](async-await.md) — All Axios methods return Promises; how to await them correctly
- [TypeScript Basics](typescript-basics.md) — Typing `AxiosResponse<T>`, definite assignment assertions for stored tokens
- [Vitest](vitest.md) — The test runner that executes these requests; matchers for asserting on responses
- [Environment Variables](environment-variables.md) — `process.env.BASE_URL`, `process.env.TEST_SECRET` used in every request
- [Faker](faker.md) — Generating dynamic test data for request bodies

## Official Documentation

- [Axios — Official Docs](https://axios-http.com/docs/intro)
- [Axios — Request config](https://axios-http.com/docs/req_config)
- [Axios — Response schema](https://axios-http.com/docs/res_schema)
- [Axios GitHub](https://github.com/axios/axios)
