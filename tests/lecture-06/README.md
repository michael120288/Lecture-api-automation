# Lecture 06 — Reactions: All Types & State Transitions

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 5 — full CRUD for posts, find post ID via GET, `postDeleted` flag.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-06/lecture.test.ts
> npm test tests/lecture-06/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/reaction` — add a reaction with `userTo`, `postId`, `type`
- The 6 reaction types: `like`, `love`, `happy`, `sad`, `wow`, `angry`
- `GET /post/reactions/:postId` — get all reactions + count
- `GET /post/single/reaction/username/:username/:postId` — get a specific user's reaction
- `DELETE /post/reaction/:postId/:previousReaction/:postReactions` — the unusual URL param format
- How `postReactions` is passed as URL-encoded JSON — `encodeURIComponent(JSON.stringify(...))`
- State transitions: adding replaces previous reaction, removing sets count back to 0
- `GET /post/reactions/username/:username` — all reactions by a user
- Advanced assertion variants — `expect.stringContaining` as asymmetric matcher, `toBeTypeOf` for ID type checking, `toBeGreaterThanOrEqual` for counts

> **Reference Topics**
> - Why encodeURIComponent(JSON.stringify(...)) is needed → [`docs/topics/url-encoding.md`](../../docs/topics/url-encoding.md)
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | The Reaction Endpoints |
| 2 | Reaction Types |
| 3 | The Unusual DELETE URL Format |
| 4 | Lifecycle — Post + React + Verify + Remove |
| 5 | `userTo` — Who Is the Notification Sent To? |
| 6 | Postman — Reaction Flow |
| 7 | Endpoint Schema & Validation Rules |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. The Reaction Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/reaction` | `{ message: "Reaction added successfully" }` |
| GET | `/post/reactions/:postId` | `{ message, reactions: [...], count }` |
| GET | `/post/single/reaction/username/:username/:postId` | `{ message, reactions: {} or doc, count }` |
| GET | `/post/reactions/username/:username` | `{ message, reactions: [...] }` |
| DELETE | `/post/reaction/:postId/:previousReaction/:postReactions` | `{ message: "Reaction removed from post" }` |

---

## 2. `count` vs `reactions` — Two Different Things

`GET /post/reactions/:postId` returns:
```json
{ "message": "Post reactions", "reactions": [...], "count": 1 }
```

| Field | Type | What it is |
|-------|------|-----------|
| `reactions` | array | Individual reaction documents — each has `type`, `username`, `avatarColor`, `postId` |
| `count` | number | Total number of reactions across all types |

You need `reactions` when you want to see WHO reacted and with WHAT type.
You need `count` when you just want HOW MANY total reactions a post has.

---

## 3. Reaction Types

The Chatty API supports 6 reaction types. All start at 0 on a new post:

```ts
type ReactionType = 'like' | 'love' | 'happy' | 'sad' | 'wow' | 'angry';
```

When you add a `like` reaction, the post's reactions object becomes:
```json
{ "like": 1, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 }
```

---

## 3. The Unusual DELETE URL Format

The DELETE endpoint is the most interesting in this lecture:

```
DELETE /post/reaction/:postId/:previousReaction/:postReactions
```

The `:postReactions` parameter is the **full reactions object serialised as URL-encoded JSON**.

Why? The server needs to know the current reaction counts to update Redis atomically when removing a reaction.

```ts
// After adding a 'like', postReactions = { like: 1, love: 0, ... }
const encoded = encodeURIComponent(JSON.stringify({ like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }));

await axios.delete(
  `${config.BASE_URL}/post/reaction/${postId}/like/${encoded}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
```

**`encodeURIComponent`** converts `{` `}` `:` `"` to `%7B` `%7D` `%3A` `%22` etc. so they are safe in a URL path.

On the server side, the controller calls `JSON.parse(postReactions)` to get the object back.

---

## 4. Lifecycle

```
beforeAll:
  1. Sign in → cookie
  2. Create test post → postId + userId (post owner)

tests:
  3. Add 'like' reaction
  4. GET reactions → verify count = 1
  5. GET single reaction by username → verify type = 'like'
  6. Remove reaction
  7. GET reactions → verify count = 0

afterAll:
  8. Delete test post
  9. Sign out
```

---

## 5. `userTo` — Who Receives the Notification

When adding a reaction, `userTo` is the **User document `_id`** of the post owner.
The server sends a notification to that user.

In tests, we get `userId` from the post object after creating it:

```ts
const getRes = await axios.get(`${config.BASE_URL}/post/all/1`, ...);
const post = getRes.data.posts.find((p: any) => p._id === postId);
postOwnerUserId = post.userId;  // used as 'userTo' in the reaction body
```

---

## 6. Postman — Reaction Flow

Create folder **Lecture 06** in **Chatty API**.

> **Prerequisites:** You need `{{postId}}` and `{{postOwnerUserId}}` from a post you created.
> Run the Lecture 05 Collection Runner first (it saves `postId`), or manually create a post
> and set `postOwnerUserId` = the `userId` field from `GET /post/all/1`.

### Request 1 — Add Reaction
- Method: `POST`, URL: `{{base_url}}/post/reaction`
- Body:
```json
{
  "userTo": "{{postOwnerUserId}}",
  "postId": "{{postId}}",
  "type": "like",
  "previousReaction": "",
  "postReactions": { "like": 0, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 },
  "profilePicture": ""
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Reaction added', () => {
  pm.expect(pm.response.json().message).to.eql('Reaction added successfully');
});
```

### Request 2 — Get Reactions
- Method: `GET`, URL: `{{base_url}}/post/reactions/{{postId}}`

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Count is 1 after adding like', () => {
  pm.expect(pm.response.json().count).to.eql(1);
});
```

### Request 3 — Remove Reaction
- Method: `DELETE`
- URL: `{{base_url}}/post/reaction/{{postId}}/like/%7B%22like%22%3A1%2C%22love%22%3A0%2C%22happy%22%3A0%2C%22sad%22%3A0%2C%22wow%22%3A0%2C%22angry%22%3A0%7D`

(The encoded JSON `{"like":1,"love":0,"happy":0,"sad":0,"wow":0,"angry":0}`)

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Reaction removed', () => {
  pm.expect(pm.response.json().message).to.eql('Reaction removed from post');
});
```

---

## 7. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/reaction`**
**Schema:** `chatty-backend/src/features/reactions/schemes/reactions.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userTo` | string | ✅ | User `_id` of post owner |
| `postId` | string | ✅ | Post `_id` |
| `type` | string | ✅ | One of: `like`, `love`, `happy`, `sad`, `wow`, `angry` |
| `previousReaction` | string | ❌ | Previous type (for switching reactions) |
| `postReactions` | object | ❌ | Current reaction counts `{ like: 0, ... }` |
| `profilePicture` | string | ❌ | Reactor's profile picture |

**Switching reactions with `previousReaction`:**

If a user already reacted with `"like"` and now wants to react with `"love"`,
send `previousReaction: "like"` and `type: "love"`. The server removes the old
reaction and adds the new one atomically in Redis.
If this is the user's first reaction, send `previousReaction: ""` (empty string).

**`DELETE /post/reaction/:postId/:previousReaction/:postReactions`**

All three are URL path params:
- `:postId` — valid MongoDB ObjectId
- `:previousReaction` — string (`"like"`, `"love"`, etc.)
- `:postReactions` — URL-encoded JSON of current reaction counts

---

## 8. Running the Tests

```bash
npm test tests/lecture-06/lecture.test.ts
```

---

## Key Takeaways

- ✅ Reactions use `userTo` (post owner's `_id`) + `postId` + `type`
- ✅ The DELETE URL has URL-encoded JSON as a path param — use `encodeURIComponent(JSON.stringify(...))`
- ✅ State verification: add reaction → GET count increases → remove → GET count decreases
- ✅ `GET /post/single/reaction/username/:username/:postId` returns your specific reaction

**What's next:** Lecture 7 adds comments to posts — the same POST-then-GET-to-find-ID pattern, but with comment CRUD including an update (PATCH).

---

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-06/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-06: reaction tests — add, get, remove, URL-encoded params"

# Push the branch to GitHub
git push -u origin lecture-06-reactions
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-06: reaction tests — add, get, remove, URL-encoded params`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-07-comments
```


## Homework

Open `tests/lecture-06/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-06/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Add 'love' reaction — status 200, message |
| 2 | GET reactions — count > 0, type in reactions array |
| 3 | GET single reaction by username — verify type |
| 4 | Remove reaction — `encodeURIComponent` URL param |
| 5 | `.then()` — verify count is 0 after removal |
| 6 | `expect.stringContaining` — assert response message contains `'successfully'` |
| 7 | `toBeTypeOf('string')` — assert comment `_id` is a string |

```bash
npm test tests/lecture-06/homework/starter.test.ts
```

Goal: **7 tests passing.**
