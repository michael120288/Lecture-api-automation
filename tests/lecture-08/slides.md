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

# Lecture 08
## User Profile: Search & Social Links

GET-heavy endpoints — and when not to test the happy path

---

## Endpoints This Lecture

| Method | Path | Returns |
|--------|------|---------|
| GET | `/user/all/:page` | users + followers |
| GET | `/user/profile/search/:query` | search results |
| PUT | `/user/profile/social-links` | message |
| PUT | `/user/profile/change-password` | message |

<!-- note: three of four are straightforward. change-password has a constraint that changes the test strategy entirely. -->

---

## Search Results Are Non-Deterministic

`GET /user/profile/search/:query` → array of users (order unpredictable)

✅ Assert: array is not empty, each item has `_id` and `username`  
❌ Never assert: exact count, specific position, exact username

> NEVER assert a specific count or index position

<!-- note: other test users exist in the database. The server returns them in an unpredictable order. Asserting length === 1 will fail in production. -->

---

## Get All Users — What Comes Back

```ts
// { message, users: [...], totalUsers: N, followers: [...] }
expect(res.data.users.length).toBeGreaterThan(0);
expect(res.data.totalUsers).toBeGreaterThan(0);
expect(Array.isArray(res.data.followers)).toBe(true);
```

- Page size is 12 — last page may have fewer
- `followers` bundled — no second request needed

<!-- note: the page size is 12, not 10. Each resource picks its own. The followers array is included here so the UI can render Follow/Following buttons without a second request. -->

---

## The Bundled `followers` Pattern

- One request returns **two** data types
- UI needs both to render follow buttons
- Common efficiency pattern in real APIs

<!-- note: fetching users and followers separately would mean two round trips. Bundling is intentional. Expect to see this in interviews. -->

---

## Search — Case-Insensitive Regex

```ts
const res = await axios.get(
  `${BASE_URL}/user/profile/search/` +
  encodeURIComponent('vitest'),
  { headers }
);
// 'vitest' matches vitestuser, Vitestuser, VITESTUSER
```

> Always `encodeURIComponent` for query params

<!-- note: the server runs a regex, not an exact match. encodeURIComponent is required when the term contains spaces or special chars — safe habit to always use it. -->

---

## Reading a User's Profile

```ts
// After a search, take the _id from one result:
const userId = searchRes.data.search[0]._id;

// Fetch the full profile:
const res = await axios.get(
  `${config.BASE_URL}/user/profile/${userId}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
// { message: 'Get user', user: { _id, username, email, social, ... } }
expect(res.status).toBe(200);
expect(res.data.user._id).toBe(userId);
```

> Search gives you the `_id`. `GET /user/profile/:userId` gives you the full document.

<!-- note: the search endpoint returns a slim projection. If you need the full user document — social links, followers count, bgImageVersion — call GET /user/profile/:userId with the _id you got from the search. -->

---

## Social Links — PUT then Verify

```ts
await axios.put(`${BASE_URL}/user/profile/social-links`,
  { twitter: 'https://twitter.com/vitest', facebook: '' },
  { headers }
);
// State verification:
const cur = await axios.get(`${BASE_URL}/currentuser`, { headers });
expect(cur.data.user.social.twitter).toBe('...');
```

- Same PUT → GET pattern from Lecture 4

<!-- note: this is the universal state verification pattern. PUT changes state, GET confirms it. Students should recognise it from Lecture 4. -->

---

## Change Password — The Unusual Constraint

```ts
// Joi schema in chatty-backend:
currentPassword: Joi.string().min(4).max(8)
newPassword:     Joi.string().min(4).max(8)
```

> Password longer than 8 chars? Validation rejects it immediately

<!-- note: this is shorter than the signup minimum. If the test account was created with a 12-char password, the current password field is rejected by schema validation before any DB check happens. -->

---

## When to Test Only Error Cases

Full happy-path for change-password would:
- Require a 4-8 char password account
- Permanently change credentials
- Risk locking out all other tests

**Test instead:**
- Empty body → 400
- Mismatched passwords → 400

<!-- note: this is the real-world trade-off. Sometimes validation errors are safer and more valuable to test than the success path. This is a judgment call, not a failure. -->

---

## New Assertions

```ts
// At least zero — not an exact number
expect(count).toBeGreaterThanOrEqual(0);

// Non-empty — don't care about the value
expect(username).toBeTruthy();

// Subset of array items
expect(users).toEqual(
  expect.arrayContaining([{ _id: expect.any(String) }])
);
```

<!-- note: toBeGreaterThanOrEqual(0) is safer than toBe(5) for counts that change. toBeTruthy covers null/undefined/empty-string in one assertion. -->

---

## Common Mistakes

- Asserting `users.length === 12` — last page is smaller
- Asserting `totalUsers === 1` — other users exist
- Testing change-password success with a long password
- Forgetting `encodeURIComponent` on search query

<!-- note: all four of these produce flaky tests that pass locally but fail in production or CI -->

---

## Key Takeaways

- Search results: non-deterministic — assert shape, not count
- Social links: PUT → GET verification pattern
- Change-password max 8: test validation errors only
- `followers` bundled with users — one request, two datasets

<!-- note: the non-determinism lesson is the most important from this lecture. It applies to any endpoint that returns a list. -->

---

## Homework

Open `tests/lecture-08/homework/starter.test.ts` — 7 TODOs:

| TODO | Skill |
|------|-------|
| 1 | GET /user/all/1 — users, totalUsers, followers |
| 2 | Search by username — find in results |
| 3 | PUT social links + GET state verify |
| 4 | Change-password empty body → 400 |
| 5 | `.then()` — mismatched passwords → 400 |
| 6 | `toBeGreaterThanOrEqual(0)` — follower count |
| 7 | `toBeTruthy` — username non-empty |

Goal: **7 tests passing**
