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

## Lecture 04 — Current User, Profile Update & Signout

**PUT returning 200 is not enough — you must call GET to verify**

<!-- note: This lecture introduces the most important testing principle after validateStatus: state verification. A 200 means the server accepted the request. It does not mean the data was saved. -->

---

## The Core Principle

```
PUT → 200 OK
```

Does **not** mean the data was saved.

```
PUT → GET → assert the change
```

This is state verification.

<!-- note: Every student intuitively trusts a 200. This lecture breaks that intuition. The PUT could return 200 while the DB write fails silently. You must read back what you wrote. -->

---

## Why GET Sees the Change Immediately

| Step | Where | Speed |
|------|-------|-------|
| PUT /user/profile | writes to **Redis** immediately | synchronous |
| Background job | writes to **MongoDB** | async queue |
| GET /currentuser | reads from **Redis** | always fresh |

- PUT writes to Redis first (synchronous)
- GET reads from Redis
- No sleep needed in tests

<!-- note: This architecture is why tests can PUT then immediately GET without any delay. Both operations hit Redis. The MongoDB write happens asynchronously via Bull Queue in the background. -->

---

## State Verification Pattern

```ts
// 1. PUT
await axios.put(basicInfoUrl,
  { work: 'Senior QA Engineer' }, opts);

// 2. GET — verify it stuck
const res = await axios.get(currentUserUrl, opts);
expect(res.data.user.work).toBe('Senior QA Engineer');
```

> Never trust the PUT response alone.

<!-- note: Step 2 is the difference between a test that catches bugs and one that doesn't. Demo: break the PUT handler to return 200 without saving. A test that only checks status code passes. A test that does GET fails correctly. -->

---

## Capture Originals — Restore in afterAll

```ts
let originalWork = '';

beforeAll(async () => {
  const res = await axios.get(currentUserUrl, opts);
  originalWork = res.data.user.work ?? '';
});

afterAll(async () => {
  await axios.put(basicInfoUrl,
    { work: originalWork }, opts);
});
```

- Profile updates are **permanent**
- Without restore: every run starts with test data

<!-- note: This is critical for a shared account. Each student runs tests against their own account. Without restoring, the account accumulates test values across runs. The test environment stays deterministic only if you clean up. -->

---

## Session Token — `GET /session-token`

```ts
const res = await axios.get(
  `${config.BASE_URL}/session-token`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
// { "token": "eyJhbGci..." }
const token = res.data.token;
```

- Returns the JWT from the current session cookie
- Useful to confirm a session is alive without loading the full user object
- If no valid session → `401`

<!-- note: The simplest endpoint in the API. Use it in tests to verify a session is active or to extract the JWT for use in Bearer-token scenarios. -->

---

## currentUser Response Shape

```json
{
  "token": "eyJhbGci...",
  "isUser": true,
  "user": {
    "_id": "...",
    "username": "Vitestuser",
    "work": "",
    "school": "",
    "quote": "",
    "location": ""
  }
}
```

- `isUser: true` — session is active
- Profile fields not present in signin response

<!-- note: The shape is different from POST /signin. isUser is the quick check — if false, the session has expired or the cookie is wrong. -->

---

## Signout — Prove the Session Is Dead

```ts
// Sign out
await axios.post(signoutUrl, {}, { headers: { Cookie } });

// Same cookie should now return 401
const res = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
expect(res.status).toBe(401);
```

> Testing signout = proving the cookie no longer works.

<!-- note: A test that only asserts signout returned 200 is not testing signout. It's testing that the endpoint exists. The real test is: use the same cookie after signout and confirm it's rejected. -->

---

## Signout Proof Flow

**POST /signout** → clears session cookie

**GET /currentuser** (after signout) → `401 Unauthorized`

<!-- note: Walk through both arrows. The second request with the now-invalidated cookie must return 401. If it returns 200, signout is broken and the test catches it. -->

---

## `PUT /user/profile/settings`

```ts
const res = await axios.put(
  `${config.BASE_URL}/user/profile/settings`,
  {
    messages: true,
    reactions: false,
    comments: true,
    follows: false,
  },
  { headers: { Cookie: sessionCookie }, validateStatus: () => true },
);
// { message: "Notification settings updated successfully", settings: { ... } }
expect(res.status).toBe(200);
expect(res.data.settings.reactions).toBe(false);
```

- All fields optional — send only what you want to change
- Response includes the saved `settings` object — no follow-up GET needed

<!-- note: Unlike basic-info, the settings PUT returns the saved values directly. Students can assert on res.data.settings without an extra GET call. -->

---

## Endpoint Reference

| Method | Path | Returns |
|--------|------|---------|
| GET | `/currentuser` | `{ token, isUser, user }` |
| GET | `/session-token` | `{ token }` |
| PUT | `/user/profile/basic-info` | `{ message }` |
| PUT | `/user/profile/settings` | `{ message, settings }` |
| POST | `/signout` | `{ message, user: {}, token: "" }` |

<!-- note: Settings response includes the saved settings object directly — no need for a follow-up GET to verify settings. The profile basic-info PUT does not return the user — you must GET to verify. -->

---

## 4 Common Mistakes

- Not capturing originals in `beforeAll`
- Asserting PUT returned 200 — without verifying GET
- Shared test account with another student
- Forgetting signout in `afterAll`

<!-- note: The shared account problem: student A's beforeAll captures work="". Student B's beforeAll updates work to "Engineer". Student A's afterAll restores work="" — wiping student B's expectation. Always use your own account. -->

---

## Homework — 7 TODOs

Open `tests/lecture-04/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | 200, `isUser`, `_id`, no password |
| 2 | `toMatchObject` + JWT format |
| 3 | PUT then GET — state verification |
| 4 | PUT without cookie → 401 |
| 5 | `.then()` style — `isUser` + token type |
| 6 | `toBeGreaterThanOrEqual(0)` — non-negative counts |
| 7 | `toBeTruthy` — username is non-empty |

**Goal: 7 tests passing**
