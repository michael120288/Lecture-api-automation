# Positive Testing

**Related topics:** [Negative Testing](negative-testing.md) | [Boundary Testing](boundary-testing.md) | [HTTP Status Codes](http-status-codes.md) | [HTTP Headers](http-headers.md) | [What Is API Testing](what-is-api-testing.md)

---

## 1. What Is Positive Testing?

**Positive testing** (also called happy-path testing) verifies that the system behaves correctly when given valid input and used as intended. You provide well-formed requests, correct credentials, and data that satisfies all validation rules — and you verify that the system returns the expected success response.

Positive tests answer the question: **does this feature actually work when used correctly?**

```typescript
// Positive test — valid credentials, expected success
it('returns 200 with valid credentials', async () => {
  const res = await axios.post(`${BASE_URL}/signin`, {
    username: 'vitestmike',
    password: 'Vitest@123456',
  }, { validateStatus: () => true });

  expect(res.status).toBe(200);
  // ... more assertions
});
```

---

## 2. The Happy Path

The "happy path" is the sequence of operations a user follows when everything goes correctly. No mistakes, no missing fields, no unauthorized access. The user provides the right data and gets the expected result.

For the Chatty API, a typical happy path for the post feature looks like this:

1. Sign in with valid credentials → receive a session cookie
2. Create a post with valid fields → receive 201
3. Fetch all posts → find the post in the list
4. Update the post → receive 200
5. Delete the post → receive 200

A positive test covers one step in that path, or the entire path end-to-end.

---

## 3. What to Assert on a Success Response

A successful API response has several components. Each one carries information that should be verified.

### 3.1 Status Code

The most fundamental assertion. Verify the exact success code, not just "something in 2xx".

```typescript
expect(res.status).toBe(200);   // for reads and actions
expect(res.status).toBe(201);   // for resource creation
```

Asserting `toBe(201)` instead of `toBeGreaterThanOrEqual(200)` is important because:
- It catches regressions where the code accidentally returns 200 instead of 201
- It verifies the server's semantic intent (resource created, not just request received)

### 3.2 The Message Field

Chatty always includes a human-readable `message` field in success responses. Assert its exact value.

```typescript
expect(res.data.message).toBe('User login successfully');
expect(res.data.message).toBe('Post created successfully');
expect(res.data.message).toBe('Post updated successfully');
expect(res.data.message).toBe('Post deleted successfully');
expect(res.data.message).toBe('Comment created successfully');
```

Asserting the exact message string serves as a contract test: if the server changes its response format, the test fails immediately.

### 3.3 Data Shape (Required Fields Present)

Verify that the response includes all the fields the client depends on. Use `toMatchObject` to check a subset of fields.

```typescript
expect(res.data.user).toMatchObject({
  username: expect.any(String),
  email: expect.any(String),
  _id: expect.any(String),
  authId: expect.any(String),
});
```

`toMatchObject` checks that the object **contains** the specified properties with the specified values. Extra properties in the actual object are allowed (and expected — the real response has many more fields). If any listed property is missing or has the wrong type, the assertion fails.

### 3.4 Data Types

Verify that fields have the correct types, not just that they exist.

```typescript
// Types matter — a stringified number is not a number
expect(typeof res.data.user._id).toBe('string');
expect(typeof res.data.token).toBe('string');
expect(typeof res.data.user.postsCount).toBe('number');
expect(typeof res.data.isUser).toBe('boolean');
expect(Array.isArray(res.data.posts)).toBe(true);
```

Type checks catch bugs like a field being returned as `null` instead of an empty string, or a count being returned as a string instead of a number.

### 3.5 Specific Values

When you know the exact expected value, assert it directly.

```typescript
// We know what username we signed up with
expect(res.data.user.username).toBe('Vitestmike');  // title-cased by the server

// We know what message text we created the post with
expect(found.post).toBe(postText);

// We know isUser should be exactly true, not just truthy
expect(res.data.isUser).toBe(true);
```

### 3.6 Fields That Must NOT Be Present

A positive test should also verify security properties — fields that must never appear in any response.

```typescript
// Password must never be exposed in any response
expect(res.data.user.password).toBeUndefined();
expect(res.data.user.passwordHash).toBeUndefined();
```

### 3.7 Response Headers

For authentication-related endpoints, assert that the session cookie was set.

```typescript
const cookies = res.headers['set-cookie'];
expect(cookies).toBeDefined();
expect(cookies![0]).toContain('session=');
expect(cookies![0]).toContain('HttpOnly');
```

---

## 4. Asserting Existence vs Asserting Value

There is an important distinction between checking that a field **exists** and checking that it has a **specific value**.

### Asserting Existence

Use when you cannot predict the exact value at test time (e.g., server-generated IDs, timestamps, Cloudinary URLs).

```typescript
// Asserting existence — we know it should be there but not the exact value
expect(res.data.user._id).toBeDefined();
expect(res.data.token).toBeTruthy();
expect(res.data.user.createdAt).toBeDefined();

// Asserting type — stronger than existence, weaker than exact value
expect(typeof res.data.user._id).toBe('string');
expect(res.data.user._id.length).toBe(24);  // MongoDB ObjectId is 24 hex chars
```

### Asserting Value

Use when you know what the value should be.

```typescript
// Asserting exact value — we know exactly what this should be
expect(res.data.message).toBe('User login successfully');
expect(res.data.user.username).toBe('Vitestmike');
expect(res.data.user.postsCount).toBe(0);  // new user has no posts
expect(res.data.isUser).toBe(true);
```

### The Risk of Only Asserting Existence

```typescript
// Weak — only checks the field exists
expect(res.data.message).toBeDefined();

// Stronger — checks the exact value
expect(res.data.message).toBe('Post created successfully');
```

The weak version would pass even if the server returned `{ message: 'Server crashed but we recovered' }`. The strong version only passes for the correct message. Always prefer asserting specific values over mere existence when you know what the value should be.

---

## 5. `toMatchObject` vs `toBe` vs `toEqual` vs `toContain`

Vitest provides several matchers. Choosing the right one matters.

### `toBe`

Strict equality using `Object.is()`. Use for primitives (strings, numbers, booleans).

```typescript
expect(res.status).toBe(200);
expect(res.data.message).toBe('User login successfully');
expect(res.data.isUser).toBe(true);
expect(res.data.user.postsCount).toBe(0);
```

Do not use `toBe` for objects or arrays — it checks reference equality, not structural equality:

```typescript
// Wrong — always fails for objects (different references)
expect(res.data.user).toBe({ username: 'Vitestmike' });

// Use toEqual or toMatchObject instead
```

### `toEqual`

Deep structural equality. Every field must match exactly — no extra fields allowed.

```typescript
// toEqual — exact match, no extra fields in either direction
expect(res.data.notifications).toEqual({
  messages: true,
  reactions: true,
  comments: true,
  follows: true,
});
```

Use `toEqual` when you know the complete shape of the object and do not want any extra fields.

### `toMatchObject`

Deep partial match. The actual object can have more fields than specified — only the listed fields must match.

```typescript
// toMatchObject — these fields must exist with these values,
// other fields in the response are ignored
expect(res.data.user).toMatchObject({
  username: 'Vitestmike',
  email: 'mike@test.com',
  postsCount: 0,
});
// Passes even though the user object also has _id, authId, avatarColor, etc.
```

This is the most commonly used assertion for checking response shapes in this course because API responses typically include more fields than you need to verify.

### `toContain`

Checks if a string contains a substring, or an array contains an item.

```typescript
// String contains
expect(res.headers['content-type']).toContain('application/json');
expect(res.headers['set-cookie']![0]).toContain('session=');
expect(res.headers['set-cookie']![0]).toContain('HttpOnly');

// Array contains
expect(['like', 'love', 'happy', 'sad', 'wow', 'angry']).toContain(res.data.reactions[0].type);
```

### Summary Table

| Matcher | Use for | Extra fields allowed |
|---------|---------|---------------------|
| `toBe` | Primitives (string, number, boolean) | N/A |
| `toEqual` | Complete object equality | No |
| `toMatchObject` | Partial object check | Yes |
| `toContain` | Substring or array membership | N/A |
| `toBeDefined` | Field exists (not undefined) | N/A |
| `toBeUndefined` | Field does not exist | N/A |
| `expect.any(Type)` | Type check without exact value | N/A |

---

## 6. Example: Positive Test for POST /signup

A complete positive test covering signup end-to-end:

```typescript
import axios from 'axios';
import { describe, it, expect, afterAll } from 'vitest';

const BASE_URL = 'https://api.codeandtest.com/api/v1';
const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';

// Use a unique username to avoid "user already exists" errors
const username = `vitestpositivesignup${Date.now()}`;

describe('POST /signup — positive tests', () => {
  let authId: string;

  afterAll(async () => {
    if (authId) {
      await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
        headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
        validateStatus: () => true,
      });
    }
  });

  it('creates a new user and returns 201 with correct shape', async () => {
    const res = await axios.post(
      `${BASE_URL}/signup`,
      {
        username,
        email: `${username}@test.com`,
        password: 'Vitest@123456',
        avatarColor: '#4a90e2',
        avatarImage: 'https://res.cloudinary.com/example/image/upload/v1/placeholder.jpg',
      },
      { validateStatus: () => true }
    );

    // Assert status code
    expect(res.status).toBe(201);

    // Assert message
    expect(res.data.message).toBe('User created successfully');

    // Assert user shape — required fields present
    expect(res.data.user).toMatchObject({
      username: username.charAt(0).toUpperCase() + username.slice(1),  // title-cased
      email: `${username}@test.com`,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    });

    // Assert _id fields exist and are strings
    expect(typeof res.data.user._id).toBe('string');
    expect(res.data.user._id.length).toBe(24);  // MongoDB ObjectId
    expect(typeof res.data.user.authId).toBe('string');
    expect(res.data.user.authId.length).toBe(24);

    // Assert IDs are different (two separate database documents)
    expect(res.data.user._id).not.toBe(res.data.user.authId);

    // Assert token exists
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(20);

    // Assert password is NEVER in the response
    expect(res.data.user.password).toBeUndefined();

    // Assert the session cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain('session=');
    expect(cookies![0]).toContain('HttpOnly');

    // Store authId for cleanup
    authId = res.data.user.authId;
  });
});
```

---

## 7. Example: Positive Test for POST /signin

```typescript
describe('POST /signin — positive tests', () => {
  it('returns 200 with user data and sets a session cookie', async () => {
    const res = await axios.post(
      `${BASE_URL}/signin`,
      { username: 'vitestmike', password: 'Vitest@123456' },
      { validateStatus: () => true }
    );

    // Status
    expect(res.status).toBe(200);

    // Message
    expect(res.data.message).toBe('User login successfully');

    // User shape
    expect(res.data.user).toMatchObject({
      username: 'Vitestmike',       // server title-cases it
      email: expect.any(String),    // we know it's a string
      postsCount: expect.any(Number),
      followersCount: expect.any(Number),
    });

    // Required fields
    expect(typeof res.data.user._id).toBe('string');
    expect(typeof res.data.user.authId).toBe('string');
    expect(typeof res.data.token).toBe('string');

    // Security: password must not be exposed
    expect(res.data.user.password).toBeUndefined();

    // Cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain('session=');
  });
});
```

---

## 8. Example: Positive Test for POST /post

```typescript
describe('POST /post — positive tests', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await signInAndGetCookie('vitestmike', 'Vitest@123456');
  });

  it('creates a post and returns 201', async () => {
    const res = await axios.post(
      `${BASE_URL}/post`,
      {
        post: 'My positive test post',
        bgColor: '#ffffff',
        privacy: 'Public',
        feelings: '',
      },
      {
        headers: { Cookie: cookie },
        validateStatus: () => true,
      }
    );

    expect(res.status).toBe(201);
    expect(res.data.message).toBe('Post created successfully');

    // Note: Chatty does NOT return the post ID in the create response
    // This is important to know — you must fetch it separately
    expect(res.data.post).toBeUndefined();  // confirm there's no post object
  });

  it('the created post appears in GET /post/all/1', async () => {
    const uniqueText = `Positive test ${Date.now()}`;

    await axios.post(
      `${BASE_URL}/post`,
      { post: uniqueText, bgColor: '#ffffff', privacy: 'Public' },
      { headers: { Cookie: cookie }, validateStatus: () => true }
    );

    const listRes = await axios.get(
      `${BASE_URL}/post/all/1`,
      { headers: { Cookie: cookie }, validateStatus: () => true }
    );

    expect(listRes.status).toBe(200);
    expect(listRes.data.message).toBe('All posts');
    expect(Array.isArray(listRes.data.posts)).toBe(true);
    expect(typeof listRes.data.totalPosts).toBe('number');

    // Find our post
    const found = listRes.data.posts.find((p: any) => p.post === uniqueText);
    expect(found).toBeDefined();
    expect(found.privacy).toBe('Public');
    expect(found.username).toBe('Vitestmike');
  });
});
```

---

## 9. Example: Positive Test for the currentuser Endpoint

```typescript
describe('GET /currentuser — positive tests', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await signInAndGetCookie('vitestmike', 'Vitest@123456');
  });

  it('returns the authenticated user\'s data', async () => {
    const res = await axios.get(
      `${BASE_URL}/currentuser`,
      {
        headers: { Cookie: cookie },
        validateStatus: () => true,
      }
    );

    expect(res.status).toBe(200);

    // Note: the response shape is different from /signin
    // /signin: { message, user, token }
    // /currentuser: { token, isUser, user }
    expect(res.data.isUser).toBe(true);
    expect(typeof res.data.token).toBe('string');

    expect(res.data.user).toMatchObject({
      username: 'Vitestmike',
      email: expect.any(String),
    });

    // Notifications object shape
    expect(res.data.user.notifications).toMatchObject({
      messages: expect.any(Boolean),
      reactions: expect.any(Boolean),
      comments: expect.any(Boolean),
      follows: expect.any(Boolean),
    });

    // Social object shape
    expect(res.data.user.social).toMatchObject({
      facebook: expect.any(String),
      instagram: expect.any(String),
      twitter: expect.any(String),
      youtube: expect.any(String),
    });
  });
});
```

---

## 10. Common Mistakes in Positive Tests

| Mistake | Problem | Fix |
|---------|---------|-----|
| Only asserting status code | A 200 with wrong data is still a failure | Always assert message, data shape, and key values |
| Using `toEqual` for the entire response object | Future API additions break your test | Use `toMatchObject` to check only what matters |
| Not asserting that password is absent | Missing security assertion | Always check `res.data.user.password` is undefined |
| Asserting `username: 'vitestmike'` | The server title-cases usernames | Assert `username: 'Vitestmike'` |
| Expecting post ID in create response | `POST /post` does not return an ID | Fetch the post list to find it |
| Sharing cookies across test files | Cookie might expire between runs | Use `beforeAll` to sign in fresh in each describe block |
| Not asserting the cookie on signin | Misses the critical auth flow check | Always check `set-cookie` in signin/signup tests |

---

## Related Topics

- [Negative Testing](negative-testing.md) — testing what happens when inputs are wrong
- [Boundary Testing](boundary-testing.md) — testing the edges of valid input ranges
- [HTTP Status Codes](http-status-codes.md) — understanding 200 vs 201
- [HTTP Headers](http-headers.md) — Cookie and set-cookie for authentication

## Official Documentation

- [ISTQB Glossary — Positive testing](https://glossary.istqb.org/en_US/term/positive-testing)
