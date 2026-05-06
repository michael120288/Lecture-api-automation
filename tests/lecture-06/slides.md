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

## Lecture 06 — Reactions: All Types & State Transitions

**`encodeURIComponent(JSON.stringify({...}))` — two steps, never one**

<!-- note: The DELETE endpoint passes a serialised object inside the URL path. This is unusual. The two-step encoding is the #1 mistake students make — forgetting stringify before encode. -->

---

## The Unusual DELETE URL

```
DELETE /post/reaction/:postId/:previousReaction/:postReactions
```

`postReactions` is a **JSON object** inside the URL path.

```ts
const encoded = encodeURIComponent(JSON.stringify({
  like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0
}));
// "%7B%22like%22%3A1%2C%22love%22%3A0...%7D"
```

<!-- note: Most DELETE endpoints only need the resource ID. This one also needs the current reaction counts so the server can atomically decrement Redis. The encoding converts {, }, :, " into URL-safe percent-encoding. -->

---

## Two Steps — Never Skip Step 1

| Step | Code | Result |
|------|------|--------|
| 1. Object | `{ like: 1, love: 0 }` | JavaScript object |
| 2. Stringify | `JSON.stringify(...)` | `'{"like":1,"love":0}'` |
| 3. Encode | `encodeURIComponent(...)` | `'%7B%22like%22%3A1%7D'` |
| 4. URL | `DELETE /reaction/:postId/:type/%7B...` | valid URL |

> Forgetting `JSON.stringify` is the #1 mistake.

<!-- note: encodeURIComponent expects a string. If you pass an object directly, JavaScript calls .toString() on it, which gives "[object Object]". The server receives %5Bobject%20Object%5D and cannot parse it. Always stringify first. -->

---

## Wrong vs Right

```ts
// WRONG — encodes "[object Object]":
const encoded = encodeURIComponent(postReactions);

// RIGHT — two steps:
const encoded = encodeURIComponent(
  JSON.stringify(postReactions)
);
```

Both compile. Only one works at runtime.

<!-- note: This is the kind of bug that passes TypeScript and ESLint. It only breaks at runtime when the server returns 400. Make sure every student runs the wrong version once to see the error, then fixes it. -->

---

## What userTo Is

```ts
// Find the post owner's userId:
const post = list.data.posts.find(p => p._id === postId);
const postOwnerUserId = post.userId;

// Use in the reaction body:
{
  userTo: postOwnerUserId,  // post owner, not yourself
  postId,
  type: 'like',
  ...
}
```

> `userTo` is the post owner — not the currently signed-in user.

<!-- note: Students almost always set userTo to their own userId from the session. Wrong. It's the ID of the person who will receive the notification — the post owner. You get it from the post object in the GET response. -->

---

## GET Reaction Endpoints

```ts
// All reactions for a post — returns reactions array + count
const allRes = await axios.get(
  `${config.BASE_URL}/post/reactions/${postId}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
// { message: 'Post reactions', reactions: [...], count: 1 }

// Single user's reaction on a post
const singleRes = await axios.get(
  `${config.BASE_URL}/post/single/reaction/username/${username}/${postId}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
// { message, reactions: { type: 'like', ... }, count: 1 }
```

> Use `reactions/:postId` for counts. Use `single/reaction/username/...` to confirm a specific user's reaction type.

<!-- note: reactions/:postId returns an array of all reaction documents plus a total count. single/reaction/username/:username/:postId returns the specific reaction document for one user — useful for asserting that the signed-in user reacted with the expected type. -->

---

## State Transition — The Test We Want

| Action | Result |
|--------|--------|
| POST /reaction (like) | 200 Reaction added |
| GET /reactions/:postId | count = 1 |
| DELETE /reaction/... (like removed) | 200 Reaction removed |
| GET /reactions/:postId | count = 0 |

<!-- note: Each GET is a state verification. Add → count increases. Remove → count decreases. Testing only the POST and DELETE status codes misses the actual business logic. -->

---

## Switching Reaction Types

```ts
// First reaction: previousReaction is empty
{
  type: 'like',
  previousReaction: '',
  postReactions: { like: 0, ... }
}

// Switching like → love:
{
  type: 'love',
  previousReaction: 'like',
  postReactions: { like: 1, love: 0, ... }
}
```

- Server removes old, adds new — atomically in Redis

<!-- note: The previousReaction field tells the server which count to decrement when switching. If you send '' when switching, the like count won't be decremented and you end up with like: 1, love: 1 — two reactions from one user. -->

---

## Full Test Lifecycle

`beforeAll` → sign in + create post

↓ add reaction → GET → count = 1

↓ remove reaction → GET → count = 0

`afterAll` → delete post + sign out

<!-- note: The post from Lecture 05 is recreated here — this lecture is self-contained. The postDeleted flag pattern from L05 applies again in afterAll. -->

---

## The 6 Reaction Types

All start at zero on every new post:

```json
{ "like": 0, "love": 0, "happy": 0,
  "sad": 0, "wow": 0, "angry": 0 }
```

After one `like`:

```json
{ "like": 1, "love": 0, "happy": 0,
  "sad": 0, "wow": 0, "angry": 0 }
```

<!-- note: Only the reacted type increments. All others stay at zero. This is the assertion: after adding a like, check like === 1 AND love === 0. Don't just check the sum. -->

---

## 4 Common Mistakes

- `userTo` set to own userId — not post owner's
- Forgetting `JSON.stringify` before `encodeURIComponent`
- Wrong `previousReaction` when switching types
- Not verifying count transition — only checking status codes

<!-- note: List these explicitly because each one produces a different symptom: 400 wrong type, 400 broken encoding, wrong count after switch, false-positive test. Students should know which mistake causes which error. -->

---

## Homework — 7 TODOs

Open `tests/lecture-06/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | Add `love` reaction — status 200, message |
| 2 | GET reactions — `count > 0`, type in array |
| 3 | GET single reaction by username — verify `type` |
| 4 | Remove reaction — `encodeURIComponent` URL param |
| 5 | `.then()` — verify count is 0 after removal |
| 6 | `expect.stringContaining` — message contains `'successfully'` |
| 7 | `toBeTypeOf('string')` — reaction `_id` is a string |

**Goal: 7 tests passing**
