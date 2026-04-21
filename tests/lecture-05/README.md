# Lecture 05 — Posts: Full CRUD Flow

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 4 — `GET /currentuser`, profile updates, state verification (PUT then GET), signout.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-05/lecture.test.ts
> npm test tests/lecture-05/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post` — create a plain text post (status 201)
- Why the create response does NOT return the post ID — and how to find it
- `GET /post/all/:page` — paginated post list, reading from Redis cache
- **The CRUD pattern**: Create → Read → Update → Read again → Delete → Verify
- `PATCH /post/:postId` — updating a post (only the owner can do it)
- `DELETE /post/:postId` — deleting a post (owner-only)
- **ObjectId validation** — what happens with an invalid MongoDB ID in the URL
- Reactions object shape — all 6 types at zero on creation
- How to clean up a post in `afterAll` if the delete test fails
- Postman — the full CRUD flow chained in Collection Runner order
- Advanced assertion variants — `expect.arrayContaining` for array subsets, `toBeLessThanOrEqual` for page size bounds, `toBeTypeOf` for type checking

> **Reference Topics**
> - How pagination works in Chatty → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - MongoDB ObjectId format → [`docs/topics/mongodb.md`](../../docs/topics/mongodb.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | The Post Endpoints |
| 2 | The Create Response Has No ID |
| 3 | Pagination — `GET /post/all/:page` |
| 4 | Update — Owner Only |
| 5 | ObjectId Validation |
| 6 | Cleanup Strategy — `postDeleted` flag |
| 7 | Postman — Full CRUD Flow |
| 8 | Endpoint Schema & Validation Rules |
| 9 | Shared Utilities & `validateStatus` Reminder |
| 10 | Running the Tests |
| 11 | Git |

---

## 1. The Post Endpoints

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| POST | `/post` | ✅ | `{ message: "Post created successfully" }` — **no ID** |
| GET | `/post/all/:page` | ✅ | `{ message, posts: [...], totalPosts }` |
| PATCH | `/post/:postId` | ✅ (owner only) | `{ message: "Post updated successfully" }` |
| DELETE | `/post/:postId` | ✅ (owner only) | `{ message: "Post deleted successfully" }` |

---

## 2. The Create Response Has No ID

This is the most important concept in this lecture.

When you call `POST /post`, the server generates a new `ObjectId` internally and saves
the post to Redis + queues a DB write. But the response is simply:

```json
Status: 201
{ "message": "Post created successfully" }
```

**There is no `_id` in the create response.**

This is a real-world API design pattern — some APIs return the created resource,
some return only a success message.

**How to get the post ID for subsequent tests:**

Create the post with a unique, identifiable content. Then call `GET /post/all/1`
and find your post by its content:

```ts
const uniqueContent = `Vitest lecture-05 post ${Date.now()}`;

// 1. Create
await axios.post(postUrl, { post: uniqueContent, ... }, { headers: { Cookie: sessionCookie }, ... });

// 2. Find in the list
const getRes = await axios.get(`${BASE_URL}/post/all/1`, { headers: { Cookie: sessionCookie }, ... });
const found = getRes.data.posts.find((p: any) => p.post === uniqueContent);
postId = found?._id ?? '';
```

Why does this work immediately?
The server saves to Redis **synchronously** before responding. `GET /post/all/1`
reads from Redis. So the post is available right away — no need to wait.

---

## 3. Pagination — `GET /post/all/:page`

The `:page` parameter is a page number, not a skip count.

| Page | Posts returned |
|------|---------------|
| 1 | posts 1–10 (newest first) |
| 2 | posts 11–20 |
| 3 | posts 21–30 |

Page size is hardcoded to 10 in the controller.

**Response shape:**

```json
{
  "message": "All posts",
  "posts": [
    {
      "_id": "...",
      "userId": "...",
      "username": "Vitestuser",
      "email": "...",
      "avatarColor": "#4a90e2",
      "profilePicture": "https://res.cloudinary.com/...",
      "post": "Hello from Vitest!",
      "bgColor": "#ffffff",
      "feelings": "",
      "privacy": "Public",
      "gifUrl": "",
      "commentsCount": 0,
      "imgVersion": "",
      "imgId": "",
      "videoId": "",
      "videoVersion": "",
      "createdAt": "2026-04-17T...",
      "reactions": {
        "like": 0, "love": 0, "happy": 0,
        "sad": 0, "wow": 0, "angry": 0
      }
    }
  ],
  "totalPosts": 42
}
```

---

## 4. Update — Owner Only

`PATCH /post/:postId` checks ownership via Redis:

```ts
const cachedOwnerId = await postCache.getPostOwnerFromCache(postId);
if (cachedOwnerId && cachedOwnerId !== req.currentUser.userId) {
  throw new NotAuthorizedError('Not authorized to update this post');
}
```

If the post belongs to a different user → `403 Forbidden`.
If the post is not in Redis (old post, cache expired) → ownership check is skipped.

Like `basic-info` in Lecture 4, the response is just `{ message: "Post updated successfully" }`.
You must call `GET /post/all/1` to verify the update persisted.

---

## 5. ObjectId Validation

Post endpoints with `:postId` params have an `validateObjectId` middleware.

A valid MongoDB ObjectId is a 24-character hex string: `507f1f77bcf86cd799439011`

If you pass an invalid value:
```bash
PATCH /post/not-a-valid-id  → 400 Bad Request
```

This is tested in section 5 (negative tests).

---

## 6. Cleanup Strategy

The delete test in section 6 deletes the post. But what if the delete test fails?
The post would remain in the database.

Solution: **track whether deletion happened, clean up in `afterAll` if not:**

```ts
let postDeleted = false;

// In section 6:
const deleteRes = await axios.delete(...);
if (deleteRes.status === 200) postDeleted = true;

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});
```

---

## 7. Postman — Full CRUD Flow

Create folder **Lecture 05** in **Chatty API** collection.

### Request 1 — Create Post

- Method: `POST`, URL: `{{base_url}}/post`
- Body:
```json
{
  "post": "My first Postman post!",
  "bgColor": "#ffffff",
  "privacy": "Public",
  "feelings": ""
}
```

**Tests tab:**
```js
pm.test('Status is 201', () => pm.response.to.have.status(201));
pm.test('Message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('Post created successfully');
});
// Note: no post ID in the response — we get it from the GET request
```

### Request 2 — Get Posts (find the ID)

- Method: `GET`, URL: `{{base_url}}/post/all/1`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Posts array is not empty', () => {
  pm.expect(pm.response.json().posts).to.be.an('array').with.lengthOf.at.least(1);
});

// Find our post and save its ID
const posts = pm.response.json().posts;
const myPost = posts.find(p => p.post === 'My first Postman post!');
if (myPost) {
  pm.environment.set('postId', myPost._id);
  pm.test('Our post was found in the list', () => {
    pm.expect(myPost.post).to.eql('My first Postman post!');
  });
}
```

### Request 3 — Update Post

- Method: `PATCH`, URL: `{{base_url}}/post/{{postId}}`
- Body:
```json
{
  "post": "Updated post content",
  "bgColor": "#ffffff",
  "privacy": "Public",
  "feelings": ""
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Post updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post updated successfully');
});
```

### Request 4 — Verify Update

Duplicate Request 2 → rename to **L05 — Verify Update**.

**Tests tab:**
```js
const posts = pm.response.json().posts;
const updated = posts.find(p => p._id === pm.environment.get('postId'));
pm.test('Post content was updated', () => {
  pm.expect(updated.post).to.eql('Updated post content');
});
```

### Request 5 — Delete Post

- Method: `DELETE`, URL: `{{base_url}}/post/{{postId}}`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Post deleted successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post deleted successfully');
});
```

### Stretch — Run in Collection Runner order
Create → Get (find ID) → Update → Verify Update → Delete

---

## 8. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**Endpoint:** `POST /api/v1/post`
**Schema file:** `chatty-backend/src/features/post/schemas/post.schemes.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `post` | string | ❌ | Post text content |
| `bgColor` | string | ❌ | Background colour hex |
| `privacy` | string | ❌ | `"Public"`, `"Private"`, etc. |
| `feelings` | string | ❌ | Emoji/feeling string |
| `gifUrl` | string | ❌ | GIF URL |
| `profilePicture` | string | ❌ | User's profile picture URL |

> **All fields are optional.** An empty body `{}` is valid and creates an empty post.
> The minimum useful post includes at least `post` (the text content).

**Boundary values:**
There are no min/max length constraints on post text. The interesting boundaries are:

| Input | Expected |
|-------|----------|
| Empty body `{}` | 201 — empty post created |
| No cookie | 401 — Unauthorized |
| Invalid `postId` (e.g. `"abc"`) in URL | 400 — ObjectId validation fails |
| Valid `postId` that doesn't exist | 404 or 200 (cache miss) |

---

## 9. Shared Utilities & `validateStatus` Reminder

Every test file in this course uses two patterns — brief reminder if you are starting here:

**`validateStatus: () => true`** — always required on every Axios request in tests.
Without it, Axios throws on 4xx/5xx and your `expect()` never runs.

```ts
// ✅ Always do this
const res = await axios.post(url, data, { validateStatus: () => true });

// ✗ Axios throws on 400/401/404 — test crashes
const res = await axios.post(url, data);
```

**Imports for this lecture:**

```ts
import { config } from '../../src/config';
// No expectRejected needed — post endpoints are not rate-limited at the same level as auth
```

> Rate limiting note: `/signin` and `/signup` are rate-limited at 5 req/min (auth zone).
> Post endpoints use the general API zone (30 req/s) — much more generous.
> You can run post boundary tests without hitting 429.

---

## 10. Running the Tests

```bash
npm test tests/lecture-05/lecture.test.ts
```

**Expected output:**
```
✓ 1. Create post > status is 201
✓ 1. Create post > message is "Post created successfully"
✓ 1. Create post > no post ID in response (by design)
✓ 2. Find the created post > posts array exists
✓ 2. Find the created post > our post appears in the list
✓ 2. Find the created post > post has correct structure
✓ 2. Find the created post > reactions all start at 0
✓ 3. Update post > status is 200
✓ 3. Update post > message is "Post updated successfully"
✓ 4. State verification > updated content is in GET response
✓ 5. Negative tests > no cookie returns 401
✓ 5. Negative tests > invalid postId format returns 400
✓ 6. Delete post > status is 200
✓ 6. Delete post > message is "Post deleted successfully"
✓ 6. Delete post > post is no longer in GET response

Test Files  1 passed (1)
Tests  15 passed (15)
```

---

## 11. Git

```bash
# Stage the files for this lecture
git add tests/lecture-05/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-05: posts CRUD — create, get, update, delete, state verification"

# Push the branch to GitHub
git push -u origin lecture-05-posts
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-05: posts CRUD — create, get, update, delete, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-06-reactions
```


## Key Takeaways

By the end of this lecture you have:

- ✅ Full CRUD cycle: Create → Read → Update → Verify → Delete → Verify
- ✅ `POST /post` returns no ID — always GET to find it by unique content
- ✅ State verification: PATCH then GET, find by `_id` (not content — content changed!)
- ✅ `postDeleted` flag — conditional cleanup in `afterAll` prevents orphaned data
- ✅ ObjectId format matters — invalid ID → 400 before the controller even runs
- ✅ Post endpoints (30 req/s limit) are less rate-sensitive than auth endpoints (5 req/min)

**What's next:** Lecture 6 adds reactions to posts. You will build on `postId` from this lecture — the dependency chain is: create post → add reaction → verify → remove reaction.

---

## Homework

Open `tests/lecture-05/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-05/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | GET response shape — `posts` array, `totalPosts` count |
| 2 | Find post in list by content — `reactions.like === 0` |
| 3 | PATCH + GET — state verification, find by `_id` |
| 4 | Negative — POST without cookie → 401 |
| 5 | DELETE → set `postDeleted = true` → verify `find()` returns `undefined` |
| 6 | `expect.arrayContaining` — assert posts array contains objects with `_id` |
| 7 | `toBeLessThanOrEqual(10)` — assert page size never exceeds 10 |

```bash
npm test tests/lecture-05/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.
