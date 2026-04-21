# Pagination

## Table of Contents

1. [What Pagination Is and Why APIs Use It](#1-what-pagination-is-and-why-apis-use-it)
2. [The Two Main Pagination Strategies](#2-the-two-main-pagination-strategies)
3. [How Chatty Uses Page-Based Pagination](#3-how-chatty-uses-page-based-pagination)
4. [The Page Query Parameter in Axios](#4-the-page-query-parameter-in-axios)
5. [What a Paginated Response Looks Like in Chatty](#5-what-a-paginated-response-looks-like-in-chatty)
6. [Testing Pagination — What to Assert](#6-testing-pagination--what-to-assert)
7. [Testing the First Item on Page 1](#7-testing-the-first-item-on-page-1)
8. [The Relationship Between Pagination and Test Data](#8-the-relationship-between-pagination-and-test-data)
9. [Paginated Endpoints in Chatty](#9-paginated-endpoints-in-chatty)
10. [What Happens When You Request a Page Beyond the Last Page](#10-what-happens-when-you-request-a-page-beyond-the-last-page)
11. [Offset-Based vs Cursor-Based Pagination — Tradeoffs](#11-offset-based-vs-cursor-based-pagination--tradeoffs)
12. [Real Axios Code Examples](#12-real-axios-code-examples)
13. [Common Mistakes](#13-common-mistakes)
14. [Related Topics](#related-topics)

---

## 1. What Pagination Is and Why APIs Use It

Imagine a social media feed that has accumulated 50,000 posts over the last three years. A user opens the app and wants to see the latest 10 posts. What should the API do?

**Option A — Return everything:**
The API fetches all 50,000 posts from the database, serializes them to JSON, and sends a response that might be several hundred megabytes. The client waits many seconds. The server spends significant CPU and memory on a query that returns data the user will never scroll to. The mobile client might run out of memory.

**Option B — Return a page:**
The API fetches only the 10 most recent posts, returns them immediately, and includes enough information for the client to request the next 10 when the user scrolls down.

Pagination is option B. It is the practice of splitting a large collection into smaller, discrete **pages** and providing a mechanism for clients to request a specific page.

### Why every production API paginates collections

| Reason | Explanation |
|--------|-------------|
| Response time | Fetching 10 rows from a database is consistently fast; fetching 10,000 is not |
| Server memory | Building a 100MB JSON response requires allocating that memory on the server |
| Client memory | Mobile devices and browsers have limited memory — 100MB of JSON can crash a tab |
| Bandwidth | Transmitting data the user will never see wastes bandwidth for everyone |
| Database load | Unpaginated queries can lock tables and degrade performance for other users |
| Predictability | A bounded page size makes response times predictable |

In automated testing, pagination matters because you need to know **which page** your newly created test data will appear on — and the answer is almost always page 1 (the first, most-recent page).

---

## 2. The Two Main Pagination Strategies

There are two fundamentally different approaches to pagination. Chatty uses page-based (offset) pagination, but cursor-based pagination is increasingly common in modern APIs and you will encounter it in your career.

### Page-Based (Offset) Pagination

The collection is divided into fixed-size chunks. Each chunk is a "page" numbered sequentially starting at 1 (or sometimes 0). The client requests a specific page number.

```
Total: 35 posts, page size: 10

Page 1: posts 1-10   (most recent)
Page 2: posts 11-20
Page 3: posts 21-30
Page 4: posts 31-35  (4 on last page)
```

The server calculates the database offset:

```javascript
const offset = (pageNumber - 1) * pageSize;
// Page 1: skip 0,  take 10
// Page 2: skip 10, take 10
// Page 3: skip 20, take 10
```

### Cursor-Based (Keyset) Pagination

Instead of a page number, the server returns a **cursor** — an opaque token (usually encoded) that represents the position of the last item returned. The client sends this cursor in the next request to get the items after that position.

```
GET /posts          → returns 10 posts + cursor: "eyJpZCI6Ijg0MiJ9"
GET /posts?after=eyJpZCI6Ijg0MiJ9 → returns next 10 posts + new cursor
```

The cursor typically encodes the `_id` or a timestamp of the last item on the current page.

---

## 3. How Chatty Uses Page-Based Pagination

Chatty uses page-based pagination for all collection endpoints. The key behaviors:

**Page size:** Chatty returns 10 items per page for most endpoints (some endpoints may return up to 12). This is configured on the server — your tests should accommodate the page size rather than hard-code it.

**Page numbering:** Some Chatty endpoints use 0-based page numbers (page 0 = first page), while others use 1-based. Check the specific endpoint behavior when writing tests. The posts endpoint uses 0-based:

```
GET /post/all/0  → page 0 (first page, most recent 10 posts)
GET /post/all/1  → page 1 (next 10 posts)
GET /post/all/2  → page 2 (next 10 posts)
```

**Sort order:** Posts are returned in reverse-chronological order — newest first. This is the standard for social media feeds. When you create a post in your test, it appears at the top of page 0/1.

**Path parameter vs query parameter:** Chatty uses different conventions per endpoint:

| Endpoint | Pagination parameter | Type |
|----------|---------------------|------|
| `GET /post/all/:page` | `:page` in URL path | Path parameter |
| `GET /post/following/:page` | `:page` in URL path | Path parameter |
| `GET /comments/:postId/:page` | `:page` in URL path | Path parameter |
| `GET /user/all/:page` | `:page` in URL path | Path parameter |
| `GET /notifications` | `?page=1` | Query parameter |
| `GET /messages/:conversationId` | `?page=1` | Query parameter |

Path parameters (`/posts/all/0`) are embedded directly in the URL. Query parameters (`?page=1`) are appended to the URL and must be passed via Axios's `params` option.

---

## 4. The Page Query Parameter in Axios

### Path parameter — embed in the URL string

When the page number is part of the URL path (like `/post/all/0`), include it directly in the URL string:

```typescript
// Page 0 — first page of posts
const response = await apiClient.get('/post/all/0', {
  headers: { Authorization: `Bearer ${token}` }
});

// Page 1 — second page
const response = await apiClient.get('/post/all/1', {
  headers: { Authorization: `Bearer ${token}` }
});

// Dynamic page number using a variable
const pageNumber = 0;
const response = await apiClient.get(`/post/all/${pageNumber}`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Query parameter — use Axios params option

When the page number is a query parameter (like `?page=1`), use Axios's `params` option. Axios automatically URL-encodes the values and appends them as a query string.

```typescript
// Using params — Axios appends ?page=1 to the URL
const response = await apiClient.get('/notifications', {
  headers: { Authorization: `Bearer ${token}` },
  params: { page: 1 }
  // Resulting URL: /notifications?page=1
});

// Multiple query params
const response = await apiClient.get('/post/search', {
  headers: { Authorization: `Bearer ${token}` },
  params: {
    search: 'hello',
    page: 1
  }
  // Resulting URL: /post/search?search=hello&page=1
});
```

### Why params is better than manual string building

```typescript
// FRAGILE — manual query string building
const page = 1;
const search = 'hello world';
const response = await apiClient.get(`/post/search?search=${search}&page=${page}`);
// Problem: 'hello world' contains a space — not URL-encoded
// Resulting URL: /post/search?search=hello world&page=1 — invalid

// SAFE — Axios params handles encoding automatically
const response = await apiClient.get('/post/search', {
  params: { search: 'hello world', page: 1 }
  // Axios URL-encodes the search term
  // Resulting URL: /post/search?search=hello%20world&page=1 — valid
});
```

---

## 5. What a Paginated Response Looks Like in Chatty

Chatty's paginated responses include the array of items and (on some endpoints) a total count.

### Posts endpoint response shape

```json
{
  "message": "All posts",
  "posts": [
    {
      "_id": "64a2b3c4d5e6f7890abc1234",
      "post": "Hello from the test suite",
      "username": "vitestUser1",
      "profilePicture": "",
      "reactions": {},
      "commentsCount": 0,
      "imgId": "",
      "imgVersion": "",
      "feelings": "",
      "gifUrl": "",
      "privacy": "Public",
      "bgColor": "#ffffff",
      "createdAt": "2024-07-01T12:00:00.000Z"
    }
    // ... up to 10 more posts
  ],
  "totalPosts": 142
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Human-readable summary |
| `posts` | array | The posts on this page — 0 to 10 items |
| `totalPosts` | number | The total count of all posts across all pages |

### Followers/Following endpoint response shape

```json
{
  "message": "User followers",
  "followers": [
    {
      "_id": "64a2b3c4d5e6f7890abc5678",
      "username": "vitestFollower",
      "profilePicture": "",
      "followersCount": 3,
      "followingCount": 2,
      "postsCount": 7
    }
  ]
}
```

### Comments endpoint response shape

```json
{
  "message": "Post comments",
  "comments": [
    {
      "_id": "64a2b3c4d5e6f7890abcdef0",
      "username": "vitestUser1",
      "comment": "Great post!",
      "createdAt": "2024-07-01T12:01:00.000Z"
    }
  ]
}
```

### Notifications endpoint response shape

```json
{
  "message": "User notifications",
  "notifications": [
    {
      "_id": "64a2b3c4d5e6f7890abc9999",
      "topBody": "vitestUser1 reacted to your post",
      "read": false,
      "createdAt": "2024-07-01T12:05:00.000Z"
    }
  ]
}
```

---

## 6. Testing Pagination — What to Assert

When testing paginated endpoints, there are four distinct scenarios to cover.

### Scenario 1: Page 1 returns an array

The most basic assertion — verify the endpoint returns a valid array structure.

```typescript
it('returns an array of posts on the first page', async () => {
  const response = await apiClient.get('/post/all/0', {
    headers: { Authorization: `Bearer ${token}` }
  });

  expect(response.status).toBe(200);
  expect(response.data.posts).toBeDefined();
  expect(Array.isArray(response.data.posts)).toBe(true);
});
```

### Scenario 2: Array length is within the page size limit

```typescript
it('returns at most 10 posts per page', async () => {
  const response = await apiClient.get('/post/all/0', {
    headers: { Authorization: `Bearer ${token}` }
  });

  expect(response.status).toBe(200);
  expect(response.data.posts.length).toBeLessThanOrEqual(10);
  expect(response.data.posts.length).toBeGreaterThanOrEqual(0);
});
```

Note: use `toBeLessThanOrEqual` rather than `toBe(10)`. The last page may have fewer items, and a newly seeded test environment may have fewer than 10 posts total.

### Scenario 3: A page beyond the last page returns empty or a specific response

```typescript
it('returns an empty array for a page beyond the last page', async () => {
  const response = await apiClient.get('/post/all/999', {
    headers: { Authorization: `Bearer ${token}` }
  });

  // Chatty returns 200 with an empty posts array for out-of-range pages
  expect(response.status).toBe(200);
  expect(response.data.posts).toEqual([]);
});
```

### Scenario 4: Total count is a number

```typescript
it('includes totalPosts as a number in the response', async () => {
  const response = await apiClient.get('/post/all/0', {
    headers: { Authorization: `Bearer ${token}` }
  });

  expect(response.status).toBe(200);
  expect(typeof response.data.totalPosts).toBe('number');
  expect(response.data.totalPosts).toBeGreaterThanOrEqual(0);
});
```

### Scenario 5: Consecutive pages do not overlap

If you have enough test data, you can verify that page 0 and page 1 return different posts:

```typescript
it('page 0 and page 1 contain different posts', async () => {
  const page0Response = await apiClient.get('/post/all/0', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const page1Response = await apiClient.get('/post/all/1', {
    headers: { Authorization: `Bearer ${token}` }
  });

  expect(page0Response.status).toBe(200);
  expect(page1Response.status).toBe(200);

  const page0Ids = page0Response.data.posts.map((p: any) => p._id);
  const page1Ids = page1Response.data.posts.map((p: any) => p._id);

  // Check no post ID appears on both pages
  const overlap = page0Ids.filter((id: string) => page1Ids.includes(id));
  expect(overlap).toHaveLength(0);
});
```

---

## 7. Testing the First Item on Page 1

Because Chatty returns posts in reverse-chronological order (newest first), the post your test just created should be the first item on page 0. This is the basis for the "create then verify" pattern.

### The pattern

1. Create a post (or other resource) with a known, unique value.
2. Fetch page 0.
3. Assert that the first item in the array matches the post you just created.

```typescript
it('newly created post appears as the first item on page 0', async () => {
  const uniquePostText = `Vitest pagination test — ${Date.now()}`;

  // Step 1: Create the post
  const createResponse = await apiClient.post(
    '/post',
    {
      post: uniquePostText,
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '',
      gifUrl: '',
      image: '',
      profilePicture: ''
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(createResponse.status).toBe(201);

  // Step 2: Fetch page 0
  const listResponse = await apiClient.get('/post/all/0', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(listResponse.status).toBe(200);

  // Step 3: Assert the first post matches
  const firstPost = listResponse.data.posts[0];
  expect(firstPost).toBeDefined();
  expect(firstPost.post).toBe(uniquePostText);
});
```

### Why the unique value matters

If your test asserts `posts[0].post === 'Hello'`, another test or another developer running tests at the same time could create a post with text `'Hello'` and your test would pass even if your post is not actually the first one. Using a unique value (a timestamp, a UUID, or a faker-generated string) ensures your assertion is unambiguous.

```typescript
// FRAGILE — another test might create a post with the same text
expect(firstPost.post).toBe('Hello world');

// ROBUST — timestamp makes this effectively unique
const uniqueText = `Vitest pagination test — ${Date.now()}`;
expect(firstPost.post).toBe(uniqueText);
```

---

## 8. The Relationship Between Pagination and Test Data

### Why test data affects pagination

When your tests create data (posts, comments, follows), that data is stored in the shared production-like database. Because posts are returned newest-first, your newly created post lands at the top of page 0.

This means:

**Your test creates data → that data appears on page 0 → page 0 assertions need to account for it.**

### The "create then check page 1" pattern

This is the most common pattern for testing that a newly created resource is visible in the list:

```typescript
describe('Posts — pagination integration', () => {
  let token: string;
  let authId: string;
  let createdPostId: string;
  const uniqueText = `Vitest posts pagination — ${Date.now()}`;

  beforeAll(async () => {
    // Setup: create user, sign in, create a post
    // ... (signup + signin omitted for brevity)

    const postRes = await apiClient.post(
      '/post',
      { post: uniqueText, bgColor: '#ffffff', privacy: 'Public',
        feelings: '', gifUrl: '', image: '', profilePicture: '' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    createdPostId = postRes.data._id;
  });

  it('page 0 is an array of at most 10 posts', async () => {
    const res = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.posts)).toBe(true);
    expect(res.data.posts.length).toBeLessThanOrEqual(10);
  });

  it('the post we created appears on page 0', async () => {
    const res = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);

    // Find our post in the array (it should be first, but search the whole array for robustness)
    const found = res.data.posts.find((p: any) => p.post === uniqueText);
    expect(found).toBeDefined();
    expect(found._id).toBe(createdPostId);
  });
});
```

### Cleanup and its effect on pagination

When `afterAll` deletes the test user (via the cleanup endpoint), all posts created by that user are deleted too. This prevents test data from accumulating in the shared database and pushing other data down to later pages.

---

## 9. Paginated Endpoints in Chatty

These are the collection endpoints in Chatty that return paginated results.

| Endpoint | Parameter type | Page param | Page size | Response key |
|----------|---------------|------------|-----------|--------------|
| `GET /post/all/:page` | Path | 0-based | 10 | `posts` |
| `GET /post/following/:page` | Path | 0-based | 10 | `posts` |
| `GET /post/user/posts/:userId/:page` | Path | 0-based | 10 | `posts` |
| `GET /comments/:postId/:page` | Path | 0-based | 10 | `comments` |
| `GET /user/all/:page` | Path | 0-based | 10 | `users` |
| `GET /user/:userId/followers/:page` | Path | 0-based | 10 | `followers` |
| `GET /user/:userId/following/:page` | Path | 0-based | 10 | `following` |
| `GET /notifications` | Query | `?page=1` (1-based) | 10 | `notifications` |
| `GET /messages/:conversationId` | Query | `?page=1` (1-based) | ~12 | `messages` |

Note that the notifications and messages endpoints use 1-based page numbers in query parameters, while the path-based endpoints use 0-based page numbers. Always check the specific endpoint's behavior in the course lecture materials.

### Making requests to each endpoint type

```typescript
// Path-based pagination (0-based)
const postsResponse = await apiClient.get('/post/all/0', {
  headers: { Authorization: `Bearer ${token}` }
});

const commentsResponse = await apiClient.get(`/comments/${postId}/0`, {
  headers: { Authorization: `Bearer ${token}` }
});

const followersResponse = await apiClient.get(`/user/${userId}/followers/0`, {
  headers: { Authorization: `Bearer ${token}` }
});

// Query-based pagination (1-based)
const notificationsResponse = await apiClient.get('/notifications', {
  headers: { Authorization: `Bearer ${token}` },
  params: { page: 1 }
});

const messagesResponse = await apiClient.get(`/messages/${conversationId}`, {
  headers: { Authorization: `Bearer ${token}` },
  params: { page: 1 }
});
```

---

## 10. What Happens When You Request a Page Beyond the Last Page

When you request a page number that is past the end of the collection, Chatty returns one of two things:

### Empty array (most endpoints)

Most Chatty endpoints return a 200 with an empty array when the page is out of range. This is the RESTful convention for "the collection exists but this page has no items."

```typescript
it('page 999 returns an empty posts array', async () => {
  const response = await apiClient.get('/post/all/999', {
    headers: { Authorization: `Bearer ${token}` }
  });

  expect(response.status).toBe(200);
  expect(response.data.posts).toEqual([]);
  // totalPosts still reflects the actual total
  expect(typeof response.data.totalPosts).toBe('number');
});
```

### Why an empty array is better than a 404

Returning a 404 for an out-of-range page causes problems:

- **Client pagination logic breaks.** A typical pagination loop sends requests until it gets an empty page. If it gets a 404 instead of an empty page, it must handle 404 as a special "end of collection" signal — more complex.
- **Ambiguity.** A 404 usually means "this resource does not exist at all." An empty page is not an error — it is a valid state.
- **Dynamic collections.** While the client is paginating, new items may be added. The total may increase mid-pagination. Treating an out-of-range page as 404 is fragile.

### The practical testing implication

When you want to test that an endpoint handles an empty/out-of-range page correctly:

```typescript
// Correct assertion for out-of-range page
expect(response.status).toBe(200);
expect(response.data.posts).toEqual([]);

// NOT this (unless the API documentation says otherwise)
expect(response.status).toBe(404);
```

---

## 11. Offset-Based vs Cursor-Based Pagination — Tradeoffs

Understanding these tradeoffs helps you understand API design decisions and prepare for cursor-based APIs you will encounter in the real world.

### Offset-based pagination tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Simple to implement | Inconsistent results if items are added/deleted during pagination |
| Client can jump to any page directly | Database performance degrades with large offsets (skip 10,000 rows) |
| Easy to display "Page X of Y" | Duplicate items can appear if data is inserted between page requests |
| Familiar URL pattern | Not suitable for real-time feeds that are continuously updated |

**The consistency problem illustrated:**

```
User starts paginating:
Page 1: items 1-10

Another user deletes item #3.

User requests Page 2:
Database now has items 1,2,4,5,6,7,8,9,10,11,12,...
Skip 10 → items 11-20

Items 4-10 were on page 1 when the user started, but item 4 is now the 3rd item.
Page 2 starts from what is now item 11. Items 4-10 were effectively skipped.
```

For most CRUD applications this is acceptable. For real-time social feeds it can cause confusion.

### Cursor-based pagination tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Consistent results even if data changes during pagination | Cannot jump to an arbitrary page |
| Database performance is O(log n) with an index | Cannot display "Page X of Y" (no total count) |
| Handles real-time feeds well | More complex to implement on the server |
| No duplicate/skipped items | Cursors may expire if they encode timestamps |

**How cursor pagination works:**

```typescript
// First request — no cursor
const response1 = await apiClient.get('/posts', {
  params: { limit: 10 }
});
// response1.data: { posts: [...10 posts...], nextCursor: 'eyJpZCI6IjEwIn0' }

// Second request — pass the cursor from the previous response
const response2 = await apiClient.get('/posts', {
  params: { after: response1.data.nextCursor, limit: 10 }
});
// response2.data: { posts: [...next 10 posts...], nextCursor: 'eyJpZCI6IjIwIn0' }

// When there are no more items:
// response.data.nextCursor = null
```

**Testing cursor-based pagination:**

```typescript
it('follows cursors to paginate through all results', async () => {
  const allPosts = [];
  let cursor: string | null = null;

  do {
    const response = await apiClient.get('/posts', {
      params: { limit: 10, ...(cursor ? { after: cursor } : {}) }
    });

    expect(response.status).toBe(200);
    allPosts.push(...response.data.posts);
    cursor = response.data.nextCursor;
  } while (cursor !== null);

  // All posts collected without duplicates
  const ids = allPosts.map(p => p._id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toBe(allPosts.length);
});
```

Chatty uses offset-based pagination (simpler and sufficient for a course API), so you will not need cursor logic in this course. But understanding both prepares you for real-world testing scenarios.

---

## 12. Real Axios Code Examples

### Complete pagination test suite from Lectures 5-9

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../src/apiClient';
import { faker } from '@faker-js/faker';

describe('Pagination — Posts endpoint', () => {
  let token: string;
  let authId: string;

  const username = `vitest${Date.now().toString().slice(-6)}`;
  const email = `vitest+pages-${Date.now()}@example.com`;
  const password = 'Vitest@123456!';
  const uniqueText = `Vitest pagination post — ${Date.now()}`;

  beforeAll(async () => {
    // Sign up
    const signupRes = await apiClient.post('/auth/signup', {
      username,
      email,
      password,
      avatarColor: 'purple',
      avatarImage: ''
    });
    expect(signupRes.status).toBe(200);
    authId = signupRes.data.user._id;

    // Sign in to get JWT
    const signinRes = await apiClient.post('/auth/signin', { username, password });
    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;

    // Create a post with a unique identifier
    const postRes = await apiClient.post(
      '/post',
      {
        post: uniqueText,
        bgColor: '#ffffff',
        privacy: 'Public',
        feelings: '',
        gifUrl: '',
        image: '',
        profilePicture: ''
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(postRes.status).toBe(201);
  });

  afterAll(async () => {
    if (authId) {
      await apiClient.delete(`/test/cleanup/user/${authId}`, {
        headers: { 'x-test-secret': process.env.TEST_SECRET }
      });
    }
  });

  // ---- Basic structure tests ----

  it('GET /post/all/0 returns 200 and a posts array', async () => {
    const response = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.data.posts).toBeDefined();
    expect(Array.isArray(response.data.posts)).toBe(true);
  });

  it('page 0 contains at most 10 posts', async () => {
    const response = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.data.posts.length).toBeLessThanOrEqual(10);
  });

  it('response includes totalPosts as a number', async () => {
    const response = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(typeof response.data.totalPosts).toBe('number');
    expect(response.data.totalPosts).toBeGreaterThanOrEqual(1);
  });

  // ---- Content tests ----

  it('newly created post appears on page 0', async () => {
    const response = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);

    const found = response.data.posts.find((p: any) => p.post === uniqueText);
    expect(found).toBeDefined();
    expect(found.username).toBe(username);
  });

  it('each post in the array has the required fields', async () => {
    const response = await apiClient.get('/post/all/0', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.data.posts.length).toBeGreaterThan(0);

    const firstPost = response.data.posts[0];
    expect(firstPost._id).toBeDefined();
    expect(typeof firstPost._id).toBe('string');
    expect(firstPost.post).toBeDefined();
    expect(typeof firstPost.post).toBe('string');
    expect(firstPost.username).toBeDefined();
    expect(firstPost.createdAt).toBeDefined();
  });

  // ---- Out-of-range page tests ----

  it('page 999 returns an empty posts array', async () => {
    const response = await apiClient.get('/post/all/999', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.data.posts).toEqual([]);
  });

  // ---- Auth tests ----

  it('returns 401 without an Authorization header', async () => {
    const response = await apiClient.get('/post/all/0');
    // No Authorization header

    expect(response.status).toBe(401);
  });
});
```

### Notifications with query-param pagination

```typescript
describe('Pagination — Notifications (query param, 1-based)', () => {
  let token: string;
  let authId: string;

  // ... (setup omitted — same pattern as above)

  it('page 1 returns a notifications array', async () => {
    const response = await apiClient.get('/notifications', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1 }
      // Results in: GET /notifications?page=1
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.notifications)).toBe(true);
    expect(response.data.notifications.length).toBeLessThanOrEqual(10);
  });

  it('page 9999 returns an empty notifications array', async () => {
    const response = await apiClient.get('/notifications', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 9999 }
    });

    expect(response.status).toBe(200);
    expect(response.data.notifications).toEqual([]);
  });
});
```

### Comments with path-param pagination

```typescript
describe('Pagination — Comments (path param, 0-based)', () => {
  let token: string;
  let authId: string;
  let postId: string;

  beforeAll(async () => {
    // ... (setup: signup, signin, create post)

    // Create several comments so page 0 has content
    for (let i = 0; i < 3; i++) {
      await apiClient.post(
        '/comment',
        { comment: `Test comment ${i}`, postId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  });

  it('page 0 of comments returns an array', async () => {
    const response = await apiClient.get(`/comments/${postId}/0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.comments)).toBe(true);
    expect(response.data.comments.length).toBeGreaterThan(0);
    expect(response.data.comments.length).toBeLessThanOrEqual(10);
  });

  it('page 999 of comments returns an empty array', async () => {
    const response = await apiClient.get(`/comments/${postId}/999`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.data.comments).toEqual([]);
  });
});
```

---

## 13. Common Mistakes

### Mistake 1: Hard-coding an exact count instead of using a range assertion

```typescript
// WRONG — assumes exactly 10 posts always, which fails on the last page
// or when the database has fewer than 10 posts
expect(response.data.posts.length).toBe(10);

// CORRECT — flexible assertion
expect(response.data.posts.length).toBeLessThanOrEqual(10);
expect(response.data.posts.length).toBeGreaterThanOrEqual(0);

// Or, if you know at least 1 post must exist (because you created one in beforeAll):
expect(response.data.posts.length).toBeGreaterThanOrEqual(1);
```

### Mistake 2: Using the wrong page number type (0-based vs 1-based)

```typescript
// Chatty's path-based endpoints (/post/all/:page) are 0-based
// Chatty's query-based endpoints (/notifications?page=) are 1-based

// WRONG — requesting page 1 on a 0-based endpoint means the SECOND page
const response = await apiClient.get('/post/all/1');  // second page, not first
// If you wanted the first page, use /post/all/0

// WRONG — using page 0 on a 1-based query endpoint
const response = await apiClient.get('/notifications', { params: { page: 0 } });
// This may return no results or an error

// CORRECT
const firstPagePosts = await apiClient.get('/post/all/0');            // 0-based path
const firstPageNotifications = await apiClient.get('/notifications',  // 1-based query
  { params: { page: 1 } }
);
```

### Mistake 3: Asserting the exact position of a post in the array

```typescript
// FRAGILE — if another test creates a post between your post creation and this assertion,
// your post might be at index 1 or 2, not 0
expect(response.data.posts[0].post).toBe(uniqueText);

// BETTER — search the array rather than assuming index 0
const found = response.data.posts.find((p: any) => p.post === uniqueText);
expect(found).toBeDefined();
```

### Mistake 4: Building the pagination URL manually without encoding

```typescript
// WRONG — searchTerm may contain spaces or special chars
const searchTerm = 'hello world';
const response = await apiClient.get(`/post/search?search=${searchTerm}&page=1`);
// URL: /post/search?search=hello world&page=1 — space is not encoded

// CORRECT — use Axios params
const response = await apiClient.get('/post/search', {
  params: { search: searchTerm, page: 1 }
  // Axios encodes: /post/search?search=hello%20world&page=1
});
```

### Mistake 5: Not cleaning up test data — accumulated data shifts pages

```typescript
// If you do NOT clean up test data after each test run:
// Run 1: creates 5 posts → your post is at index 0 on page 0
// Run 2: creates 5 more posts → page 0 now has 10 posts, your newest post is at index 0
// Run 10: your original post from run 1 may now be on page 2

// ALWAYS clean up in afterAll using the cleanup endpoint
afterAll(async () => {
  await apiClient.delete(`/test/cleanup/user/${authId}`, {
    headers: { 'x-test-secret': process.env.TEST_SECRET }
  });
});
```

### Mistake 6: Asserting a 404 for out-of-range pages

```typescript
// WRONG — Chatty returns 200 + empty array for out-of-range pages, not 404
const response = await apiClient.get('/post/all/999', {
  headers: { Authorization: `Bearer ${token}` }
});
expect(response.status).toBe(404);  // This will fail

// CORRECT
expect(response.status).toBe(200);
expect(response.data.posts).toEqual([]);
```

---

## Related Topics

- [Axios](axios.md) — `params` option for query parameters, URL construction
- [HTTP Requests](http-requests.md) — GET requests, query strings, path parameters
- [State Verification](state-verification.md) — Verifying created resources appear in paginated lists
- [Test Data Strategy](test-data-strategy.md) — How test data affects pagination results
- [Test Cleanup](test-cleanup.md) — Cleaning up test data to prevent pagination drift
- [Positive Testing](positive-testing.md) — Asserting on 200 responses from paginated endpoints

## Official Documentation

- [Slack Engineering — Pagination techniques](https://slack.engineering/evolving-api-pagination-at-slack/)
- [Stripe API — Pagination](https://stripe.com/docs/api/pagination)
- [RFC 5988 — Web Linking (Link header)](https://datatracker.ietf.org/doc/html/rfc5988)
