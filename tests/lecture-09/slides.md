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

# Lecture 09
## Followers, Blocking & Notifications

The first lecture that requires two users

---

## Why Two Users?

> You cannot follow yourself

The server filters out self-follows at the API level.

- User A = your signed-in test account
- User B = created fresh in `beforeAll`

<!-- note: this is not a workaround — it reflects real production constraints. Social features always require at least two distinct accounts. -->

---

## Two-User Setup Flow

| Step | Who | Action |
|------|-----|--------|
| beforeAll | User A | sign in, capture `userAId` |
| beforeAll | User B | sign up with Faker, capture `userBId` + `userBAuthId` |
| tests | A + B | follow, unfollow, notifications |
| afterAll | User B | DELETE `/test/cleanup/user/:userBAuthId` |
| afterAll | User A | POST /signout |

<!-- note: walk through the diagram carefully. userBAuthId is used only for cleanup. userBId is used for follow/block. They are different fields. -->

---

## Creating User B in beforeAll

```ts
const userBName = `vitest${faker.string.alphanumeric(8)}`;
const res = await axios.post(`${BASE_URL}/signup`, {
  username: userBName, ...
});
userBId     = res.data.user?._id ?? '';
userBAuthId = res.data.user?.authId ?? '';
```

- `userBId` — for follow/block endpoints
- `userBAuthId` — for cleanup DELETE

<!-- note: the distinction between _id and authId is critical here. Using the wrong one for cleanup leaves orphaned accounts in the database. -->

---

## Follow and Verify

```ts
// Follow user B
PUT /user/follow/:followerId
// followerId = userB._id (NOT authId)

// Verify
const res = await axios.get(`${BASE_URL}/user/following`, { headers });
const found = res.data.following
  .find((u: { _id: string }) => u._id === userBId);
expect(found).toBeDefined();
```

<!-- note: followerId in the URL is the person you want to follow — confusing name. It means "the ID of the person you are making your follower" from the server's perspective. -->

---

## Unfollow — Two IDs Required

```ts
PUT /user/unfollow/:followeeId/:followerId
// followeeId = userB._id  (who you unfollow)
// followerId = userA._id  (you — the unfollower)
```

Get your own `_id` from `/currentuser`:

```ts
const cur = await axios.get(`${BASE_URL}/currentuser`, { headers });
userAId = cur.data.user._id;
```

<!-- note: your own _id is not in the session cookie. You must request it. This is a common pattern across many endpoints. -->

---

## Block and Unblock

```ts
PUT /user/block/:followerId    // blocks user
PUT /user/unblock/:followerId  // unblocks user
```

What blocking does:
- Adds to your `blocked` array
- Adds you to their `blockedBy` array

All four social endpoints return **status 200**

<!-- note: assert res.status === 200 rather than exact message text — messages vary across versions. The status code is the contract. -->

---

## Notifications — Handling Empty Arrays

```ts
const res = await axios.get(`${BASE_URL}/notifications`, { headers });
// notifications may be []
expect(Array.isArray(res.data.notifications)).toBe(true);
```

- Empty = no activity yet — completely valid
- Never assert `notifications.length > 0`

<!-- note: timing dependency. If no one has followed/commented/reacted yet, the array is empty. Tests that assert a positive count are flaky. -->

---

## Endpoint Summary

| Method | Path | Notes |
|--------|------|-------|
| PUT | `/user/follow/:followerId` | User B's `_id` |
| PUT | `/user/unfollow/:followeeId/:followerId` | both IDs |
| GET | `/user/following` | your following list |
| PUT | `/user/block/:followerId` | 200 |
| PUT | `/user/unblock/:followerId` | 200 |
| GET | `/notifications` | may be empty |

<!-- note: show this table and ask students to point to which ID goes where. Mistakes here are the most common source of 400 errors in homework. -->

---

## Common Mistakes

- Using `authId` instead of `_id` for follow — wrong field
- Asserting `notifications.length > 0` — timing-dependent
- Not cleaning up User B in afterAll

<!-- note: orphaned test accounts accumulate in production databases. Always clean up. The x-test-secret header must be correct or cleanup silently fails. -->

---

## Key Takeaways

- Cannot follow yourself — always need two accounts
- `userBId` vs `userBAuthId` — different fields, different uses
- Get your own `_id` from `/currentuser`
- Notifications may be empty — assert shape, not count

<!-- note: the two-user pattern from this lecture applies to any social feature: reactions, messaging, gifts. It's worth memorising. -->

---

## Homework

Open `tests/lecture-09/homework/starter.test.ts` — 7 TODOs:

| TODO | Skill |
|------|-------|
| 1 | Follow user B → status 200 |
| 2 | GET following → user B in list |
| 3 | GET followers/:userBId → user A in list |
| 4 | Unfollow → verify removed |
| 5 | `.then()` — GET notifications → array |
| 6 | `objectContaining` — has `_id` + `message` |
| 7 | `toBeTypeOf('string')` — `_id` is a string |

Goal: **7 tests passing**
