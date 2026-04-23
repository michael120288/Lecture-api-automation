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

## Lecture 05 — Posts: Full CRUD Flow

**POST /post returns only `{ message }` — go find your post in GET**

<!-- note: The most important insight this lecture: the create response has no ID. This is a real API design decision. You must go find your post using unique content. -->

---

## The Create Response Has No ID

```json
Status: 201
{ "message": "Post created successfully" }
```

No `_id`. Deliberate API design.

> To test PATCH and DELETE, you need the ID. You must search for it.

<!-- note: Some APIs return the created resource. Others return only a message. Both are valid designs. This one returns only a message. Your test must handle this by searching the GET list for unique content. -->

---

## Find Your Post After Creating It

`POST /post` → `{ message: "Post created" }` — **no ID returned**

↓

`GET /post/all/1` → find by unique content → capture `_id`

<!-- note: Walk through each step. The unique content is the bridge between create and find. Without uniqueness (no Date.now()), two concurrent test runs could find each other's posts. -->

---

## The Find Pattern in Code

```ts
const unique = `Vitest L05 ${Date.now()}`;

await axios.post(postUrl, { post: unique, ... }, opts);

const list = await axios.get(`${BASE_URL}/post/all/1`, opts);
const found = list.data.posts.find(p => p.post === unique);
postId = found?._id ?? '';
```

- `Date.now()` guarantees uniqueness across runs
- `?.` prevents crash if post not found

<!-- note: Why does the post appear immediately on page 1? The server writes to Redis synchronously before responding. GET reads from Redis. There is no async gap for the initial write. -->

---

## After PATCH — Find by _id, Not Content

```ts
// After updating, content has changed — can't find by text
const list = await axios.get(`${BASE_URL}/post/all/1`, opts);
const updated = list.data.posts.find(p => p._id === postId);
expect(updated.post).toBe('Updated content');
```

> Find by content on creation. Find by `_id` after updating.

<!-- note: This is a common trap. Students try to find the post by its original content after a PATCH. The content changed — the find returns undefined. Always switch to _id after the first update. -->

---

## CRUD Full Flow

**Create** → POST /post → 201 (no ID)
**Find** → GET /post/all/1 → find by content
**Update** → PATCH /post/:id → 200
**Delete** → DELETE /post/:id → 200
**Verify** → GET /post/all/1 → post gone

<!-- note: Each step verifies the previous one. Notice there is a GET verification after every mutating operation. This is state verification applied to the full CRUD lifecycle. -->

---

## The postDeleted Flag

```ts
let postDeleted = false;

// In delete test:
const res = await axios.delete(`${BASE_URL}/post/${postId}`, opts);
if (res.status === 200) postDeleted = true;

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(`${BASE_URL}/post/${postId}`, opts);
  }
});
```

- Prevents orphaned posts when tests fail mid-run

<!-- note: Without this flag: if the DELETE test fails, the post stays in the database permanently. The flag ensures afterAll only cleans up if the test didn't already do it. -->

---

## ObjectId Validation

```
PATCH /post/not-a-valid-id  →  400
DELETE /post/not-a-valid-id  →  400
```

Valid ObjectId = 24-character hex string.

> Validation happens **before** the controller runs.

<!-- note: Students often expect 404 for an invalid ID. The middleware rejects it with 400 before even hitting the database. A valid-format ID that doesn't exist gives 404. An invalid-format ID gives 400. Test both. -->

---

## Reactions Baseline

Every new post starts at zero:

```json
"reactions": {
  "like": 0, "love": 0, "happy": 0,
  "sad": 0, "wow": 0, "angry": 0
}
```

Assert this when you find your post — baseline for Lecture 06.

<!-- note: Assert all 6 reaction counts are zero. This verifies the post was created with a clean reactions object and sets up the expectation that Lecture 06 will then increment. -->

---

## 4 Common Mistakes

- No `Date.now()` in content — runs collide
- Finding by content after PATCH — use `_id`
- Not setting `postDeleted = true` — orphaned data
- Expecting `PATCH /bad-id` → 404 — it returns 400

<!-- note: Each of these has a specific symptom. Walk through what the test output looks like for each mistake, so students can self-diagnose from the error message. -->

---

## Homework — 7 TODOs

Open `tests/lecture-05/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | GET shape — `posts` array, `totalPosts` |
| 2 | Find by content — `reactions.like === 0` |
| 3 | PATCH + GET — state verification by `_id` |
| 4 | POST without cookie → 401 |
| 5 | DELETE → `postDeleted = true` → verify gone |
| 6 | `expect.arrayContaining` — posts have `_id` |
| 7 | `toBeLessThanOrEqual(10)` — page size limit |

**Goal: 7 tests passing**
