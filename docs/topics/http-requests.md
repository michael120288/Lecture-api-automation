# HTTP Requests

**Related topics:** [REST](rest.md) | [HTTP Status Codes](http-status-codes.md) | [HTTP Headers](http-headers.md) | [What Is API Testing](what-is-api-testing.md)

---

## 1. What Is HTTP?

**HTTP** (HyperText Transfer Protocol) is the protocol that powers the web. When your browser loads a page, when your app calls an API, when your Vitest test sends a request — all of it is HTTP.

HTTP is a request-response protocol: the client sends a request, the server sends back exactly one response.

```
Client                              Server
  |                                   |
  |-- HTTP Request ---------------->  |
  |                                   |  (server processes the request)
  |<- HTTP Response -----------------  |
  |                                   |
```

Every HTTP interaction has two messages: the **request** (client to server) and the **response** (server to client). Understanding the structure of both is fundamental to API testing.

---

## 2. Anatomy of an HTTP Request

An HTTP request has four parts: the **request line**, **headers**, a **blank line**, and an optional **body**.

```
POST /api/v1/signin HTTP/1.1
Host: api.codeandtest.com
Content-Type: application/json
Content-Length: 47

{"username":"vitestmike","password":"Vitest@123456"}
```

### 2.1 The Request Line (Method + URL + Version)

```
POST /api/v1/signin HTTP/1.1
^    ^                ^
|    |                HTTP version (1.1 is standard)
|    URL path (everything after the host)
HTTP method
```

The **method** tells the server what action to perform. The **URL path** tells the server which resource to act on.

### 2.2 Request Headers

Headers are key-value pairs that describe the request. They appear one per line, each in the format `Name: Value`.

```
Host: api.codeandtest.com
Content-Type: application/json
Content-Length: 47
Cookie: session=eyJhbGciOiJIUzI1NiJ9...
```

Key request headers in this course:

| Header | Purpose | Example |
|--------|---------|---------|
| `Host` | Which server to send to (required in HTTP/1.1) | `api.codeandtest.com` |
| `Content-Type` | Format of the request body | `application/json` |
| `Content-Length` | Size of the body in bytes | `47` |
| `Cookie` | Authentication session cookie | `session=eyJ...` |
| `x-test-secret` | Custom header for test cleanup | `chatty-test-cleanup-2026` |

### 2.3 The Blank Line

A blank line separates the headers from the body. This is required by the HTTP specification and is handled automatically by every HTTP library.

### 2.4 The Request Body

The body carries the data you are sending. Not all requests have a body.

```json
{"username":"vitestmike","password":"Vitest@123456"}
```

**Important:** If a request has a body, the `Content-Type` header must describe what format the body is in. For JSON, that is always `Content-Type: application/json`.

---

## 3. Anatomy of an HTTP Response

An HTTP response has three parts: the **status line**, **headers**, and **body**.

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Set-Cookie: session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly
Content-Length: 312

{"message":"User login successfully","user":{...},"token":"eyJ..."}
```

### 3.1 The Status Line

```
HTTP/1.1 200 OK
         ^^^ ^^
         |   Human-readable reason phrase (informational only)
         Numeric status code (the one you assert on)
```

### 3.2 Response Headers

Response headers describe the response and carry metadata.

| Header | Purpose | Example |
|--------|---------|---------|
| `Content-Type` | Format of the response body | `application/json; charset=utf-8` |
| `Content-Length` | Size of the response body | `312` |
| `Set-Cookie` | Instructs client to store a cookie | `session=eyJ...; Path=/; HttpOnly` |

### 3.3 The Response Body

The JSON payload your test reads and asserts against.

```json
{
  "message": "User login successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "Vitestmike",
    "email": "mike@test.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 4. How Axios Represents Requests and Responses

Axios is the HTTP client used throughout this course. It abstracts the raw HTTP format into JavaScript objects.

### Making a Request

```typescript
const res = await axios.post(
  'https://api.codeandtest.com/api/v1/signin',  // URL
  { username: 'vitestmike', password: 'Vitest@123456' },  // body (auto-serialized to JSON)
  {
    headers: { 'Content-Type': 'application/json' },  // request headers
    validateStatus: () => true,  // treat all status codes as non-throwing
  }
);
```

Axios automatically:
- Serializes the body object to a JSON string
- Sets `Content-Type: application/json` if you provide an object body (you can also set it explicitly)
- Parses the response JSON back into a JavaScript object

### Reading a Response

```typescript
res.status          // number: 200, 201, 400, 401, etc.
res.data            // object: the parsed JSON body
res.headers         // object: all response headers (lowercase keys)
res.config          // object: the Axios config you passed in
```

### Response Headers in Axios

Axios lowercases all header names. This matters when you access them:

```typescript
// The raw header name is "Content-Type"
// Axios stores it as "content-type"
const contentType = res.headers['content-type'];

// The raw header name is "Set-Cookie"
// Axios stores it as "set-cookie" — an array of strings
const cookies = res.headers['set-cookie'];
```

---

## 5. The Five HTTP Methods Used in This Course

### 5.1 GET — Read a Resource

GET retrieves data. It has no body. It should never modify server state.

```
GET /api/v1/post/all/1 HTTP/1.1
Host: api.codeandtest.com
Cookie: session=eyJ...
```

**In Axios:**

```typescript
const res = await axios.get(
  `${BASE_URL}/post/all/1`,
  {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  }
);

// res.data.posts — array of post objects
// res.data.totalPosts — total count
```

**Chatty GET endpoints:**

```typescript
// Get all posts, page 1
await axios.get(`${BASE_URL}/post/all/1`, { headers: { Cookie: cookie }, validateStatus: () => true });

// Get current authenticated user
await axios.get(`${BASE_URL}/currentuser`, { headers: { Cookie: cookie }, validateStatus: () => true });

// Get all comments on a post
await axios.get(`${BASE_URL}/post/comments/${postId}`, { headers: { Cookie: cookie }, validateStatus: () => true });

// Search users by username
await axios.get(`${BASE_URL}/user/profile/search/vitest`, { headers: { Cookie: cookie }, validateStatus: () => true });

// Get all users following the current user
await axios.get(`${BASE_URL}/user/following`, { headers: { Cookie: cookie }, validateStatus: () => true });
```

**When to use GET:**
- Retrieving a list of resources
- Retrieving a single resource by ID
- Searching/filtering resources
- Any read-only operation

**Key rules:**
- No request body
- Safe: GET does not modify server state
- Idempotent: calling GET twice gives the same result

---

### 5.2 POST — Create a Resource

POST creates a new resource or triggers an action. It has a body. The server assigns the new resource's ID.

```
POST /api/v1/post HTTP/1.1
Host: api.codeandtest.com
Content-Type: application/json
Cookie: session=eyJ...

{"post":"Hello world!","bgColor":"#ffffff","privacy":"Public"}
```

**In Axios:**

```typescript
const res = await axios.post(
  `${BASE_URL}/post`,
  {
    post: 'Hello world!',
    bgColor: '#ffffff',
    privacy: 'Public',
    feelings: '',
  },
  {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  }
);

// res.status — 201 (Created)
// res.data.message — 'Post created successfully'
// Note: no post _id in the response
```

**Chatty POST endpoints:**

```typescript
// Sign up
await axios.post(`${BASE_URL}/signup`, signupBody, opts);         // 201

// Sign in
await axios.post(`${BASE_URL}/signin`, { username, password }, opts);  // 200

// Create a post
await axios.post(`${BASE_URL}/post`, postBody, { headers: { Cookie: cookie }, ...opts });  // 201

// Add a reaction
await axios.post(`${BASE_URL}/post/reaction`, reactionBody, { headers: { Cookie: cookie }, ...opts });  // 200

// Add a comment
await axios.post(`${BASE_URL}/post/comment`, commentBody, { headers: { Cookie: cookie }, ...opts });  // 200
```

**When to use POST:**
- Creating a new resource
- Triggering an action with a body (sign in, add reaction)
- When the server assigns the ID

**Key rules:**
- Has a request body
- Not idempotent: calling POST twice creates two resources
- Typically returns `201 Created` for resource creation, `200 OK` for actions

---

### 5.3 PUT — Replace a Resource

PUT replaces a resource entirely. You send the complete new state. Every field is overwritten.

```
PUT /api/v1/user/profile/basic-info HTTP/1.1
Host: api.codeandtest.com
Content-Type: application/json
Cookie: session=eyJ...

{"quote":"Test everything","work":"QA Engineer","school":"","location":"Kyiv"}
```

**In Axios:**

```typescript
const res = await axios.put(
  `${BASE_URL}/user/profile/basic-info`,
  {
    quote: 'Test everything',
    work: 'QA Engineer',
    school: '',
    location: 'Kyiv',
  },
  {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  }
);

// res.status — 200
// res.data.message — 'Updated successfully'
```

**Chatty PUT endpoints:**

```typescript
// Update profile basic info
await axios.put(`${BASE_URL}/user/profile/basic-info`, infoBody, opts);

// Update social links
await axios.put(`${BASE_URL}/user/profile/social-links`, socialBody, opts);

// Update notification settings
await axios.put(`${BASE_URL}/user/profile/settings`, settingsBody, opts);

// Follow a user (action, no body — Chatty uses PUT for this)
await axios.put(`${BASE_URL}/user/follow/${followerId}`, {}, opts);

// Unfollow a user
await axios.put(`${BASE_URL}/user/unfollow/${followeeId}/${followerId}`, {}, opts);
```

**When to use PUT:**
- Replacing an existing resource completely
- Sending the full new state of a resource

**Key rules:**
- Has a request body (the replacement state)
- Idempotent: calling PUT twice with the same body produces the same result
- Typically targets a specific resource URL (includes an ID)

---

### 5.4 PATCH — Partially Update a Resource

PATCH updates only the fields you include. Other fields on the resource remain unchanged.

```
PATCH /api/v1/post/507f1f77bcf86cd799439022 HTTP/1.1
Host: api.codeandtest.com
Content-Type: application/json
Cookie: session=eyJ...

{"post":"Updated post text"}
```

**In Axios:**

```typescript
const res = await axios.patch(
  `${BASE_URL}/post/${postId}`,
  { post: 'Updated post text' },
  {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  }
);

// res.status — 200
// res.data.message — 'Post updated successfully'
```

**Chatty PATCH endpoints:**

```typescript
// Update a post (partial update)
await axios.patch(`${BASE_URL}/post/${postId}`, { post: 'New text' }, opts);

// Update a comment
await axios.patch(`${BASE_URL}/post/comment/${postId}/${commentId}`, { comment: 'Updated comment' }, opts);
```

**When to use PATCH:**
- Modifying one or a few fields on a resource
- When you do not want to send the entire resource state

**Key rules:**
- Has a request body (only the changed fields)
- Not necessarily idempotent (depends on the operation)
- More efficient than PUT for large resources with small changes

---

### 5.5 DELETE — Remove a Resource

DELETE removes a resource. It usually has no body.

```
DELETE /api/v1/post/507f1f77bcf86cd799439022 HTTP/1.1
Host: api.codeandtest.com
Cookie: session=eyJ...
```

**In Axios:**

```typescript
const res = await axios.delete(
  `${BASE_URL}/post/${postId}`,
  {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  }
);

// res.status — 200
// res.data.message — 'Post deleted successfully'
```

**Chatty DELETE endpoints:**

```typescript
// Delete a post
await axios.delete(`${BASE_URL}/post/${postId}`, opts);

// Delete a comment
await axios.delete(`${BASE_URL}/post/comment/${postId}/${commentId}`, opts);

// Remove a reaction (note: all data encoded in URL path)
const encoded = encodeURIComponent(JSON.stringify(postReactions));
await axios.delete(`${BASE_URL}/post/reaction/${postId}/like/${encoded}`, opts);

// Test cleanup endpoint (requires x-test-secret header)
await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': 'chatty-test-cleanup-2026' },
  validateStatus: () => true,
});
```

**When to use DELETE:**
- Removing a resource permanently
- Test cleanup

**Key rules:**
- Usually no request body
- Idempotent: deleting the same resource twice returns 200 then 404 (both valid)
- Chatty returns `200 OK` with a message body (not `204 No Content`)

---

## 6. Method Summary Table

| Method | Has Body | Idempotent | Safe | Typical Status | Main Use |
|--------|----------|-----------|------|---------------|---------|
| GET | No | Yes | Yes | 200 | Read |
| POST | Yes | No | No | 200 or 201 | Create / Action |
| PUT | Yes | Yes | No | 200 | Full Replace |
| PATCH | Yes | No | No | 200 | Partial Update |
| DELETE | No (usually) | Yes | No | 200 or 204 | Remove |

**Safe** means the operation does not modify server state.
**Idempotent** means calling it multiple times has the same effect as calling it once.

---

## 7. Query Parameters vs Path Parameters vs Request Body

There are three ways to pass data to an API. Understanding which to use where is important.

### Path Parameters

Part of the URL itself. Used to identify a specific resource.

```
/post/507f1f77bcf86cd799439022
      ________________________
      This is the postId path parameter
```

In Axios:
```typescript
// Interpolated directly into the URL string
await axios.get(`${BASE_URL}/post/all/${page}`);
await axios.delete(`${BASE_URL}/post/${postId}`);
await axios.patch(`${BASE_URL}/post/comment/${postId}/${commentId}`, body, opts);
```

### Query Parameters

Appended to the URL after `?`. Used for filtering, sorting, pagination, and search.

```
/user/profile/search/vitest    ← Chatty uses path params for search
/user/all/1?sort=createdAt     ← If Chatty used query params (it doesn't here)
```

Chatty does not use query parameters in the course endpoints. It uses path parameters instead.

### Request Body

Used for sending structured data to create or modify a resource.

```typescript
await axios.post(`${BASE_URL}/post`, {
  post: 'Hello',       // ← These are in the request body
  privacy: 'Public',
});
```

**Rule of thumb:**
- Resource ID: path parameter (`/post/:postId`)
- Data to create/update: request body
- Filter/sort options: query parameters

---

## 8. A Full Request-Response Cycle Example

Here is a test that walks through a complete create-then-verify cycle using POST and GET:

```typescript
import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BASE_URL, signInAndGetCookie } from '../../src/helpers';

describe('POST /post then GET /post/all/1', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await signInAndGetCookie('vitestmike', 'Vitest@123456');
  });

  it('creates a post and retrieves it in the list', async () => {
    const uniqueText = `Test post ${Date.now()}`;

    // POST — create the post
    const createRes = await axios.post(
      `${BASE_URL}/post`,
      {
        post: uniqueText,
        bgColor: '#ffffff',
        privacy: 'Public',
        feelings: '',
      },
      {
        headers: { Cookie: cookie },
        validateStatus: () => true,
      }
    );

    expect(createRes.status).toBe(201);
    expect(createRes.data.message).toBe('Post created successfully');

    // GET — verify the post appears in the list
    const listRes = await axios.get(
      `${BASE_URL}/post/all/1`,
      {
        headers: { Cookie: cookie },
        validateStatus: () => true,
      }
    );

    expect(listRes.status).toBe(200);
    const found = listRes.data.posts.find((p: any) => p.post === uniqueText);
    expect(found).toBeDefined();
    expect(found.privacy).toBe('Public');
  });
});
```

---

## 9. Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Sending a body with GET | HTTP spec does not define semantics for GET bodies; Axios silently drops it | Never send a body with GET |
| Forgetting `Content-Type: application/json` | Server cannot parse the body | Axios sets this automatically when you pass an object; verify it is set |
| Not `await`ing the axios call | You get a Promise instead of a response | Always `await` |
| Forgetting `validateStatus: () => true` | 4xx responses throw exceptions | Always set it for every call |
| Using `res.data` as a string | It is a parsed JS object | Access properties: `res.data.message` |
| Hardcoding IDs in test URLs | IDs change between test runs | Store IDs from creation responses in variables |
| Not URL-encoding special characters | The `{` in the reaction DELETE URL breaks the path | Use `encodeURIComponent()` |

---

## Related Topics

- [REST](rest.md) — how HTTP methods map to REST operations
- [HTTP Status Codes](http-status-codes.md) — what each status code means
- [HTTP Headers](http-headers.md) — Content-Type, Cookie, set-cookie in detail
- [Positive Testing](positive-testing.md) — asserting on successful responses
- [Negative Testing](negative-testing.md) — asserting on error responses

## Official Documentation

- [MDN — HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages)
- [MDN — HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
- [RFC 7231 — HTTP/1.1 Semantics](https://datatracker.ietf.org/doc/html/rfc7231)
