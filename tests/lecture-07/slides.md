---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 1.6rem; }
  code { font-size: 0.9rem; }
  h2 { color: #1a1a2e; }
  blockquote { color: #c0392b; border-left: 4px solid #c0392b; }
---

# Lecture 07
## Comments: Full CRUD

Testing a nested resource — POST, GET, PATCH, DELETE

---

## What You Will Build

- Add a comment, capture its ID
- List, get single, update, delete
- Verify each step with assertions

<!-- note: walk through the full test lifecycle before diving into details — students need the big picture first -->

---

## Comment Endpoints

| Method | Path | Status |
|--------|------|--------|
| POST | `/post/comment` | **200** |
| GET | `/post/comments/:postId` | 200 |
| GET | `/post/commentsnames/:postId` | 200 |
| GET | `/post/single/comment/:postId/:commentId` | 200 |
| PATCH | `/post/comment/:postId/:commentId` | 200 |
| DELETE | `/post/comment/:postId/:commentId` | 200 |

<!-- note: every comment endpoint returns 200 — students often guess 201 or 204, correct this up front -->

---

## POST Returns 200, Not 201

> A comment is an **action** on an existing resource

```ts
expect(res.status).toBe(200); // not 201
expect(res.data).not.toHaveProperty('_id');
```

<!-- note: 201 means a new top-level resource was created. Comments are actions on a post — the server treats them differently. The server gives you no commentId back. -->

---

## The GET-then-Find Pattern

`POST /comment` → `{ message: "Comment created" }` — **no commentId**

↓

`GET /post/comments/:postId` → find by content string → capture `commentId`

<!-- note: because POST gives no ID back, you must fetch the list and find your comment by its unique content string. This is a deliberate pattern students will reuse. -->

---

## Finding the commentId

```ts
const res = await axios.get(
  `${BASE_URL}/post/comments/${postId}`,
  { headers }
);
const found = res.data.comments?.find(
  (c: { comment: string; _id: string }) =>
    c.comment === UNIQUE_COMMENT
);
commentId = found?._id ?? '';
```

> Use a unique string — `find()` must return exactly one

<!-- note: if the comment string is not unique, find() may return the wrong comment. Stress that test data should be deterministic. -->

---

## The `userTo` Field

- Required in every comment body
- Must be the **post owner's** `_id`
- Routes the notification, not the comment

```ts
{ userTo: postOwnerUserId, postId, comment: '...' }
```

<!-- note: missing userTo causes a 400. It tells the server who to notify. The comment still saves even if userTo is wrong — only the notification fails. -->

---

## `commentsnames` — Usernames Only

```ts
// Response shape:
{ comments: [{ username: 'alice', avatarColor: '#f00' }] }
```

- Powers "3 people commented" UI
- Assert array exists — not a specific count

<!-- note: this endpoint returns who commented, not what they said. The count changes as more users comment — never hardcode it. -->

---

## Single Comment Quirk

```ts
// Key is plural — value is singular!
res.data.comments       // a single object, NOT array
res.data.comments[0]    // undefined — this breaks
res.data.comments.comment  // the text
```

> `GET /post/single/comment/:postId/:commentId`

<!-- note: this catches everyone. The key name is 'comments' but the value is a plain object. Test it explicitly. -->

---

## beforeAll Setup Order

```
1. Sign in  → cookie
2. Create post  → postId + postOwnerUserId
3. POST comment → GET list → find() → commentId
```

Test order: add → list → names → single → update → verify → delete

<!-- note: if beforeAll fails, all tests fail. Walk through why each step depends on the previous one. -->

---

## New Assertion Styles

```ts
// Subset match
expect(list).toEqual(
  expect.arrayContaining([{ _id: commentId }])
);
// ObjectId format
expect(postId).toMatch(/^[a-f0-9]{24}$/);
// Custom predicate
expect(count).toSatisfy((n: number) => n >= 0);
```

<!-- note: introduce each assertion with a concrete why: arrayContaining when you don't care about other items, toMatch for ID validation, toSatisfy for custom rules. -->

---

## Common Mistakes

- Asserting status `201` on POST comment
- Using `res.data.comments[0]` on single endpoint
- Non-unique comment string — `find()` matches wrong item

<!-- note: these are the three bugs that appear in almost every homework submission. Mention each one explicitly. -->

---

## Key Takeaways

- POST `/post/comment` returns **200, no ID**
- GET-then-find is the only way to capture `commentId`
- Single-comment endpoint returns an object, not an array

<!-- note: these three points are the exam-worthy facts from this lecture -->

---

## Homework

Open `tests/lecture-07/homework/starter.test.ts` — 7 TODOs:

| TODO | Skill |
|------|-------|
| 1 | POST → status 200, message |
| 2 | GET → find by content, verify structure |
| 3 | PATCH + GET single → state verify |
| 4 | DELETE → `find()` returns `undefined` |
| 5 | `.then()` — commentsnames |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` |
| 7 | `toSatisfy` — reaction count |

Goal: **7 tests passing**
