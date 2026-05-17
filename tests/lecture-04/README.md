# Lecture 04 — Current User, Profile Update & Signout

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 3 — dynamic user creation with Faker.js, `src/fixtures.ts`, full `beforeAll`/`afterAll` lifecycle.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start** (returning students):
> ```bash
> npm test tests/lecture-04/profile.spec.ts
> npm test tests/lecture-04/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /currentuser` — the authenticated user response shape (`token`, `isUser`, `user`)
- `GET /session-token` — what it returns and when it is useful
- **State verification** — update something with PUT, then GET to confirm the change persisted
- How Chatty's **Redis + Queue** pattern works — why updates are immediately visible in GET
- `PUT /user/profile/basic-info` — updating work, school, quote, location
- `PUT /user/profile/settings` — updating notification preferences
- **Restoring state in `afterAll`** — saving original values before tests and putting them back
- Signout flow — `POST /signout` invalidates the session, subsequent requests return 401
- Testing that a 401 is returned for unauthenticated requests
- Advanced assertion variants — `toBeGreaterThanOrEqual` for count fields, `toBeTruthy` for non-empty strings, `expect.objectContaining` inside `toEqual`

> **Reference Topics**
> - Why Redis — and why 200 doesn't mean saved → [`docs/topics/redis.md`](../../docs/topics/redis.md)
> - The PUT → GET verification pattern → [`docs/topics/state-verification.md`](../../docs/topics/state-verification.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | The Current User Response |
| 3 | Session Token |
| 4 | State Verification — Update Then GET |
| 5 | Chatty's Redis + Queue Architecture |
| 6 | Restoring State in `afterAll` |
| 7 | Signout |
| 8 | Postman — Testing the Update Flow |
| 9 | Endpoint Schema & Validation Rules |
| 10 | Understanding the Test File |
| 11 | Running the Tests |
| 12 | Git |

---

## 1. Endpoints in This Lecture

| Method | Path | Auth required | Returns |
|--------|------|---------------|---------|
| GET | `/currentuser` | ✅ | `{ token, isUser, user }` |
| GET | `/session-token` | ✅ | `{ token }` |
| PUT | `/user/profile/basic-info` | ✅ | `{ message: "Updated successfully" }` |
| PUT | `/user/profile/settings` | ✅ | `{ message: "Notification settings updated successfully", settings }` |
| POST | `/signout` | ✅ | `{ message: "User logout successfully", user: {}, token: "" }` |

---

## 2. The Current User Response

`GET /currentuser` returns a different shape than `POST /signin`:

```json
{
  "token": "eyJhbGci...",
  "isUser": true,
  "user": {
    "_id": "...",
    "username": "Vitestuser",
    "email": "...",
    "work": "",
    "school": "",
    "quote": "",
    "location": "",
    "notifications": {
      "messages": true,
      "reactions": true,
      "comments": true,
      "follows": true
    },
    "social": { ... },
    ...
  }
}
```

**Key differences from the signin response:**
- `isUser: true` — a boolean flag confirming the session is valid (always `true` here because we are authenticated)
- `token` is at the **top level** (not inside `user`) — same JWT from the session cookie
- The user object includes `work`, `school`, `quote`, `location` — profile fields not in the signup response

---

## 3. Session Token — `GET /session-token`

```json
{ "token": "eyJhbGci..." }
```

The simplest endpoint in the API — it just returns the JWT from the current session cookie.

**When is this useful?**
- When a frontend app needs to refresh its local copy of the JWT after a page reload
- Verifying that a session is still active (if there's no token → session expired)
- Extracting the JWT for use in tools that need it as a Bearer token

In tests: useful for confirming a session is alive without loading the full user object.

---

## 4. State Verification — Update Then GET

The core pattern of this lecture:

```
1. GET /currentuser → capture current value of work: ""
2. PUT /user/profile/basic-info → set work: "Senior QA Engineer"
3. GET /currentuser → assert work === "Senior QA Engineer"
```

Without step 3, you only know the PUT returned 200. You do NOT know whether the data was
actually saved. The server could return 200 and silently discard the update (a real bug).

**Always verify the state change, not just the response code.**

---

## 5. Chatty's Redis + Queue Architecture

When you call `PUT /user/profile/basic-info`, the server:

```
1. Updates Redis cache immediately (in-memory — fast)
2. Adds a job to the Bull queue (async — DB write happens later)
3. Returns 200 immediately
```

When you call `GET /currentuser` right after:
```
4. Server reads from Redis cache (not the database)
5. Returns the updated value immediately
```

**Why this matters for tests:**
The update is visible immediately in `GET /currentuser` — no need to wait.
If the cache were bypassed, you might get stale data.

This is why state verification tests in Lecture 4 always work — the cache is consistent.

---

## 6. Restoring State in `afterAll`

Profile updates are **persistent** — changing `work` for `vitestuser` leaves it changed
on the server for future test runs.

The solution: **capture the original values before changing them, restore them after.**

```ts
let originalWork: string = '';
let originalQuote: string = '';

beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = loginRes.headers['set-cookie']?.[0] ?? '';

  // Capture current profile values before we change them
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  originalWork = currentRes.data.user.work ?? '';
  originalQuote = currentRes.data.user.quote ?? '';
});

afterAll(async () => {
  // Restore original values
  await axios.put(basicInfoUrl, {
    work: originalWork,
    quote: originalQuote,
  }, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  // Sign out
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

This pattern keeps the test account in a consistent state across runs.

---

## 7. Signout

```ts
const res = await axios.post(signoutUrl, {}, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
// Returns: { message: "User logout successfully", user: {}, token: "" }
```

After signout, the session cookie is invalidated on the server.
Any subsequent request using that cookie returns `401`.

**Testing signout properly:**
```ts
// 1. Sign out
const signoutRes = await axios.post(signoutUrl, {}, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(signoutRes.status).toBe(200);

// 2. Prove the session is dead — same cookie no longer works
const afterRes = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(afterRes.status).toBe(401);
```

---

## 8. Postman — Testing the Update Flow

### Setup
Create folder **Lecture 04** in your **Chatty API** collection.

### Request 1 — Current User
1. New request → **L04 — Current User**
2. Method: `GET`, URL: `{{base_url}}/currentuser`
3. Postman sends the cookie automatically

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Response shape is correct', () => {
  const body = pm.response.json();
  pm.expect(body.isUser).to.be.true;
  pm.expect(body.token).to.be.a('string');
  pm.expect(body.user).to.be.an('object');
});

// Save current work for restore later
pm.environment.set('originalWork', pm.response.json().user.work);
```

### Request 2 — Update Basic Info
1. New request → **L04 — Update Basic Info**
2. Method: `PUT`, URL: `{{base_url}}/user/profile/basic-info`
3. Body → raw → JSON:

```json
{
  "work": "Senior QA Engineer",
  "quote": "Test everything",
  "school": "QA Academy",
  "location": "Kyiv"
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Updated successfully');
});
```

### Request 3 — Verify Update
1. Duplicate **L04 — Current User** → rename to **L04 — Verify Update**
2. No changes to method or URL

**Tests tab:**
```js
pm.test('work field was updated', () => {
  pm.expect(pm.response.json().user.work).to.eql('Senior QA Engineer');
});
```

### Request 4 — Update Notification Settings
1. New request → **L04 — Update Settings**
2. Method: `PUT`, URL: `{{base_url}}/user/profile/settings`
3. Body:

```json
{
  "messages": true,
  "reactions": false,
  "comments": true,
  "follows": false
}
```

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Settings returned in response', () => {
  const settings = pm.response.json().settings;
  pm.expect(settings.reactions).to.be.false;
  pm.expect(settings.follows).to.be.false;
});
```

### Request 5 — Restore original work value
1. Duplicate **L04 — Update Basic Info** → rename to **L04 — Restore**
2. Body:

```json
{
  "work": "{{originalWork}}"
}
```

### Request 6 — Signout
1. New request → **L04 — Signout**
2. Method: `POST`, URL: `{{base_url}}/signout`
3. No body

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('User logout successfully');
});
```

### Stretch — Full state lifecycle in Collection Runner
Run in order: Current User → Update Basic Info → Verify Update → Update Settings → Restore → Signout

---

## 9. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


### `GET /currentuser`
**Schema file:** No Joi validation — reads from session, no body required.

**Response shape:**

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | JWT from current session |
| `isUser` | boolean | Always `true` when authenticated |
| `user._id` | string | User document ID |
| `user.work` | string | Empty string `""` by default |
| `user.school` | string | Empty string `""` by default |
| `user.quote` | string | Empty string `""` by default |
| `user.location` | string | Empty string `""` by default |
| `user.notifications` | object | `{ messages, reactions, comments, follows }` — all `true` by default |

---

### `PUT /user/profile/basic-info`
**Schema file:** `chatty-backend/src/features/user/schemes/info.ts`

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `work` | string | ❌ | any string or empty | — |
| `school` | string | ❌ | any string or empty | — |
| `quote` | string | ❌ | any string or empty | — |
| `location` | string | ❌ | any string or empty | — |

> All fields are optional. You can send just one, all four, or any combination.
> Sending `{}` returns 200 and changes nothing.

**Response:** `{ message: "Updated successfully" }`

---

### `PUT /user/profile/settings`
**Schema file:** `chatty-backend/src/features/user/schemes/info.ts`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `messages` | boolean | ❌ | true / false |
| `reactions` | boolean | ❌ | true / false |
| `comments` | boolean | ❌ | true / false |
| `follows` | boolean | ❌ | true / false |

**Response:** `{ message: "Notification settings updated successfully", settings: { messages, reactions, comments, follows } }`

---

### `POST /signout`
**Schema:** No body required.
**Response:** `{ message: "User logout successfully", user: {}, token: "" }`

---

## 10. Understanding the Test File

New patterns in this lecture:

**Capturing state in `beforeAll`:**
```ts
originalWork = currentRes.data.user.work ?? '';
```
The `?? ''` handles the case where `work` is `null` in the database (possible for older accounts).

**Restoring state in `afterAll`:**
```ts
await axios.put(basicInfoUrl, { work: originalWork, quote: originalQuote }, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
```

**Testing signout invalidates the session:**
```ts
// Sign out
await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, ... });

// Prove it — same cookie now gets 401
const postSignoutRes = await axios.get(currentUserUrl, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
expect(postSignoutRes.status).toBe(401);
```

---

## 11. Running the Tests

**Your `.env` needs:**
```
BASE_URL=https://api.codeandtest.com/api/v1
TEST_USERNAME=vitestuser      ← must be YOUR unique account
TEST_PASSWORD=TestUser!234
```

> **Important — do not share your test account with other students.**
>
> Lecture 4 modifies the profile of `TEST_USERNAME` (work, quote, notifications).
> If two students use the same account simultaneously, their `beforeAll`/`afterAll`
> will overwrite each other's changes and tests will fail unpredictably.
>
> Each student must have their own unique `vitest*` account.

```bash
npm test tests/lecture-04/profile.spec.ts
```

**Expected output:**
```
✓ 1. Current user > status is 200
✓ 1. Current user > isUser is true
✓ 1. Current user > token is present
✓ 1. Current user > user object has expected fields
✓ 2. Session token > status is 200
✓ 2. Session token > returns a token string
✓ 2. Session token > token matches the signin token
✓ 3. Update basic info > status is 200
✓ 3. Update basic info > message is "Updated successfully"
✓ 4. State verification > GET /currentuser reflects updated work field
✓ 4. State verification > GET /currentuser reflects updated quote field
✓ 5. Update notification settings > status is 200
✓ 5. Update notification settings > settings in response match what was sent
✓ 5. Update notification settings > reactions is false after update
✓ 6. Negative tests > no cookie returns 401 on /currentuser
✓ 6. Negative tests > no cookie returns 401 on /session-token
✓ 7. Signout > status is 200
✓ 7. Signout > message is "User logout successfully"
✓ 7. Signout > session is invalidated — subsequent request returns 401

Test Files  1 passed (1)
Tests  19 passed (19)
```

---

## 12. Git

```bash
# Stage the files for this lecture
git add tests/lecture-04/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-04: current user, profile update, signout, state verification"

# Push the branch to GitHub
git push -u origin lecture-04-current-user
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-04: current user, profile update, signout, state verification`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-05-posts
```


## Key Takeaways

By the end of this lecture you have:

- ✅ `GET /currentuser` returns `{ token, isUser, user }` — different from signin's `{ message, token, user }`
- ✅ **State verification pattern** — PUT then GET confirms the change was saved
- ✅ Redis + Queue: updates are immediately visible in GET (no need to wait)
- ✅ `afterAll` restores original values AND signs out — leaving the account clean
- ✅ Signout invalidates the session — same cookie returns 401 afterwards
- ✅ Every authenticated endpoint returns 401 without a valid cookie

**What's next:** Lecture 5 applies the state verification pattern to Posts. You will create, read, update, delete, and verify a post — your first full CRUD test cycle.

---

## Homework

Open `tests/lecture-04/homework/starter.test.ts` — **7 Vitest TODOs**.
Open `tests/lecture-04/homework/postman-tasks.md` — **5 Postman tasks**.

| TODO | What it practices |
|------|------------------|
| 1 | Multiple assertions — status 200, `isUser`, `_id`, no password |
| 2 | `toMatchObject` + JWT format on the same response |
| 3 | State verification — PATCH then GET, find by `_id` |
| 4 | Negative — PUT without cookie → 401 |
| 5 | `.then()` style — `isUser` + `token` type on `GET /currentuser` |
| 6 | `toBeGreaterThanOrEqual(0)` — assert postsCount and followersCount are non-negative |
| 7 | `toBeTruthy` — assert username is a non-empty truthy value |

```bash
npm test tests/lecture-04/homework/starter.test.ts
```

Goal: **7 tests passing.**

> Once done — or stuck — open `homework/solution.test.ts`.
> Read the explanation comments, not just the code.
