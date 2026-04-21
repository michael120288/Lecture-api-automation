# Lecture 07 — Comments: Full CRUD + Nested Queries

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 6 — reactions, URL-encoded JSON params, state transitions.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-07/lecture.test.ts
> npm test tests/lecture-07/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/comment` — add a comment (returns 200, NOT 201, and no commentId!)
- How to find the `commentId` after creation — same GET-then-find pattern as posts
- `GET /post/comments/:postId` — all comments for a post
- `GET /post/commentsnames/:postId` — just the usernames who commented
- `GET /post/single/comment/:postId/:commentId` — one specific comment
- `PATCH /post/comment/:postId/:commentId` — update comment text
- `DELETE /post/comment/:postId/:commentId` — delete a comment
- The `userTo` pattern — always the post owner's userId
- Advanced assertion variants — `expect.arrayContaining` for reaction arrays, `toMatch(/regex/)` for ObjectId validation, `toSatisfy(fn)` for custom predicates

> **Reference Topics**
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - beforeAll / afterAll lifecycle → [`docs/topics/test-lifecycle.md`](../../docs/topics/test-lifecycle.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Comment Endpoints |
| 2 | POST Returns 200 (Not 201) and No ID |
| 3 | Finding the commentId |
| 4 | `userTo` in Comment Body |
| 5 | Postman — Comment CRUD Flow |
| 6 | Endpoint Schema |
| 7 | Understanding the Test File |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Comment Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/comment` | `{ message: "Comment created successfully" }` — 200, no ID |
| GET | `/post/comments/:postId` | `{ message, comments: [...] }` |
| GET | `/post/commentsnames/:postId` | `{ message, comments: [{username, avatarColor}] }` |
| GET | `/post/single/comment/:postId/:commentId` | `{ message, comments: singleDoc }` |
| PATCH | `/post/comment/:postId/:commentId` | `{ message: "Comment updated successfully" }` |
| DELETE | `/post/comment/:postId/:commentId` | `{ message: "Comment deleted successfully" }` |

---

## 2. POST Returns 200 (Not 201)

Unlike `POST /post` (which returns 201), `POST /post/comment` returns **200**.

This is an intentional difference in the API design — comments are treated as actions on an existing resource rather than new top-level resources.

There is also **no commentId** in the response. Same pattern as posts — GET after POST.

---

## 3. Finding the commentId

After adding a comment, call `GET /post/comments/:postId` and find your comment by content:

```ts
const getRes = await axios.get(`${BASE_URL}/post/comments/${postId}`, ...);
const found = getRes.data.comments?.find(
  (c: { comment: string; _id: string }) => c.comment === UNIQUE_COMMENT
);
commentId = found?._id ?? '';
```

---

## 4. `userTo` in Comment Body

Same as reactions — `userTo` is the post owner's userId. It routes the notification.

```ts
{
  userTo: postOwnerUserId,  // post owner's _id
  postId: postId,
  comment: 'My test comment',
  profilePicture: ''
}
```

---

## 5. Postman — Comment CRUD Flow

Create folder **Lecture 07**. Requires `{{postId}}` and `{{postOwnerUserId}}` from Lecture 05.

### Create Comment
- POST `{{base_url}}/post/comment`
- Body: `{ "userTo": "{{postOwnerUserId}}", "postId": "{{postId}}", "comment": "My Postman comment", "profilePicture": "" }`

**Tests tab:**
```js
pm.test('Status 200 (not 201)', () => pm.response.to.have.status(200));
pm.test('Message correct', () => pm.expect(pm.response.json().message).to.eql('Comment created successfully'));
pm.test('No _id in response', () => pm.expect(pm.response.json()).to.not.have.property('_id'));
```

### Get Comments (find ID)
- GET `{{base_url}}/post/comments/{{postId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
const found = pm.response.json().comments.find(c => c.comment === 'My Postman comment');
if (found) pm.environment.set('commentId', found._id);
pm.test('Comment found', () => pm.expect(found).to.not.be.undefined);
```

### Get Comment Names
- GET `{{base_url}}/post/commentsnames/{{postId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Has comments array', () => pm.expect(pm.response.json().comments).to.be.an('array'));
```

### Update Comment
- PATCH `{{base_url}}/post/comment/{{postId}}/{{commentId}}`
- Body: `{ "comment": "Updated comment" }`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
```

### Delete Comment
- DELETE `{{base_url}}/post/comment/{{postId}}/{{commentId}}`

**Tests tab:**
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Deleted message', () => pm.expect(pm.response.json().message).to.eql('Comment deleted successfully'));
```

---

## 6. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/comment`** — `chatty-backend/src/features/comments/schemes/comment.ts`

| Field | Type | Required |
|-------|------|----------|
| `userTo` | string | ✅ |
| `postId` | string | ✅ |
| `comment` | string | ✅ |
| `profilePicture` | string | ❌ |

**`PATCH /post/comment/:postId/:commentId`** — `updateCommentSchema`

| Field | Type | Required |
|-------|------|----------|
| `comment` | string | ✅ |

---

## 7. Understanding the Test File

Open `tests/lecture-07/lecture.test.ts` — new patterns used here:

**The CRUD execution order:**

```
beforeAll:
  1. Sign in → cookie
  2. Create a test post → find postId and postOwnerUserId
  3. Add a test comment → find commentId via GET

Section 1: Verify add comment (POST returns 200, no _id)
Section 2: Verify GET comments (find by content, structure)
Section 3: Verify GET commentsnames (username list)
Section 4: GET single comment by postId + commentId
Section 5: PATCH comment → update text
Section 6: State verification — GET single reflects updated text
Section 7: DELETE comment → commentDeleted = true
Section 8: Negative tests — no cookie, invalid ObjectId

afterAll:
  - Clean up if delete test failed (commentDeleted flag)
  - Delete test post
  - Sign out
```

**The `commentDeleted` flag** — same pattern as `postDeleted` from Lecture 5:

```ts
let commentDeleted = false;

// In section 7:
const res = await axios.delete(commentById(postId, commentId), ...);
if (res.status === 200) commentDeleted = true;

// In afterAll:
if (!commentDeleted && commentId) {
  await axios.delete(commentById(postId, commentId), ...);
}
```

**Why cleanup is nested** — the test file cleans up in this order:
1. Comment (if not deleted by tests)
2. Post (always — the post was created for this lecture)
3. Sign out

**The `singleComment` response quirk:**

```ts
// GET /post/single/comment/:postId/:commentId returns:
{ message: 'Single comment', comments: commentDocument }
//                           ^^^^^^^
// 'comments' key returns a single object, not an array
// Access it as: res.data.comments.comment
```

---

## Key Takeaways

- ✅ `POST /post/comment` returns 200 (not 201) — API design choice
- ✅ No commentId in response — GET then find by content
- ✅ Full CRUD: add → get → get single → update → verify → delete → verify
- ✅ `commentsnames` endpoint gives just usernames — useful for "X people commented"
- ✅ Both `postId` AND `commentId` are required in PATCH/DELETE URL
- ✅ `res.data.comments` returns a **single object** in `GET /single/comment` — not an array

**What's next:** Lecture 8 covers user profile search and social links — GET-heavy lecture, less complex setup.

---

## 8. Running the Tests


```bash
npm test tests/lecture-07/lecture.test.ts
```

**Expected output:**
```
✓ 1. Add comment > POST /post/comment returns 200 (not 201)
✓ 1. Add comment > message is "Comment created successfully"
✓ 1. Add comment > response does NOT contain a commentId
✓ 2. Get comments > status is 200
✓ 2. Get comments > comments array is non-empty
✓ 2. Get comments > our comment is in the list
✓ 3. Get comment names > GET /post/commentsnames/:postId returns 200
✓ 3. Get comment names > returns username list
✓ 4. Get single comment > GET /post/single/comment/:postId/:commentId returns 200
✓ 4. Get single comment > returns the specific comment content
✓ 5. Update comment > PATCH returns 200
✓ 6. State verification after update > GET single comment reflects updated text
✓ 7. Delete comment > DELETE returns 200
✓ 7. Delete comment > message is "Comment deleted successfully"
✓ 8. Negative tests > POST /post/comment without cookie returns 401
✓ 8. Negative tests > PATCH with invalid commentId returns 400

Test Files  1 passed (1)
Tests  16 passed (16)
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `commentId` is empty string | Comment wasn't found in GET after POST | Check POST succeeded (status 200) first |
| `GET single comment` returns empty `comments` | commentId not in Redis yet | Small timing issue — Redis is usually immediate |
| `PATCH with invalid commentId` fails with wrong status | ObjectId validation format changed | Check `validateObjectId` middleware is in routes |

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-07/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-07: comment CRUD — add, get, update, delete, state verification"

# Push the branch to GitHub
git push -u origin lecture-07-comments
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-07: comment CRUD — add, get, update, delete, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-08-user-profile
```


## Homework

Open `tests/lecture-07/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Add comment → status 200, message |
| 2 | GET comments → find by content, verify structure |
| 3 | PATCH + GET single → state verification |
| 4 | DELETE → verify `find()` returns undefined |
| 5 | `.then()` — GET commentsnames → username in list |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` — assert postId is a valid MongoDB ObjectId |
| 7 | `toSatisfy` — assert reaction count is non-negative with custom predicate |

```bash
npm test tests/lecture-07/homework/starter.test.ts
```

Goal: **7 tests passing.**
