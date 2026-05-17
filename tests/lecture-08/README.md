# Lecture 08 — User Profile: Search, Social Links & Password

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 7 — comment CRUD, GET-then-find pattern for IDs.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-08/users.spec.ts
> npm test tests/lecture-08/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /user/all/:page` — paginated list of all users (12 per page)
- `GET /user/profile/search/:query` — search users by username (regex, case-insensitive)
- `PUT /user/profile/social-links` — update Facebook, Instagram, Twitter, YouTube
- State verification: PUT social links → GET /currentuser → confirm update
- `PUT /user/profile/change-password` — the password schema constraints (min 4, max 8 — unusual!)
- Testing validation errors without actually changing the password
- Why we only test the **error cases** for change-password in tests
- Advanced assertion variants — `toBeGreaterThanOrEqual` for follower counts, `expect.arrayContaining` for user lists, `toBeTruthy` for non-empty usernames

> **Reference Topics**
> - Two-user test pattern → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | Get All Users — Paginated List |
| 3 | Search Users — Regex Query |
| 4 | Social Links Update |
| 5 | Change Password — Schema and Why We Test Errors Only |
| 6 | Postman |
| 7 | Endpoint Schema |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/user/all/:page` | `{ message, users: [...], totalUsers, followers }` |
| GET | `/user/profile/search/:query` | `{ message: "Search results", search: [...] }` |
| PUT | `/user/profile/social-links` | `{ message: "Updated successfully" }` |
| PUT | `/user/profile/change-password` | `{ message: "Password updated successfully..." }` |

---

## 2. Get All Users

Page size is 12 (different from posts which uses 10).

```ts
const res = await axios.get(`${config.BASE_URL}/user/all/1`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'Get users', users: [...], totalUsers: N, followers: [...] }
```

The response includes **followers** — a list of users that the current user is following.
This is bundled in the response for efficiency.

---

## 3. Search Users

```ts
const res = await axios.get(`${config.BASE_URL}/user/profile/search/vitest`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'Search results', search: [{_id, username, email, profilePicture, avatarColor}] }
```

The search is case-insensitive and uses a regex. Searching `"vitest"` will match
`vitestuser`, `Vitestuser`, `VITESTUSER`, etc.

**Encoding the query:** If the search term contains spaces or special URL characters,
wrap it in `encodeURIComponent()`. For plain usernames like `"vitest"` it is not needed,
but the test file always uses it as a safe habit:
```ts
const res = await axios.get(`${config.BASE_URL}/user/profile/search/${encodeURIComponent('vitest')}`, ...);
```

**The `followers` field in `/user/all/1`:** The response bundles users the current user follows
alongside the user list — same page, no extra request. Page size is 12 (not 10 like posts).

---

## 4. Social Links

All 4 social link fields are optional strings. Send any combination:

```ts
await axios.put(`${config.BASE_URL}/user/profile/social-links`, {
  facebook: 'https://facebook.com/vitest',
  instagram: '',
  twitter: 'https://twitter.com/vitest',
  youtube: '',
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

State verification: call `GET /currentuser` and check `user.social.twitter`.

---

## 5. Change Password — Why We Only Test Errors

The change-password schema has an unusual constraint:

```ts
// chatty-backend/src/features/user/schemes/info.ts
currentPassword: Joi.string().required().min(4).max(8)
newPassword: Joi.string().required().min(4).max(8)
```

**min 4, max 8 characters.** This is shorter than the signup password minimum (12 chars).

This creates a problem: if your test account has a password longer than 8 characters
(e.g. `TestUser!234`), the Joi validation will **reject** the current password immediately
with `'Password should have a maximum length of 8'`.

**What we test:**
- Empty body → 400
- Mismatched `newPassword` and `confirmPassword` → 400

**What we do NOT test:**
- Actually changing the password — this would require knowing the exact password,
  which must be ≤ 8 chars, and it permanently changes the account.

This is a real-world lesson: sometimes you test a subset of an endpoint's behaviour
because full testing would have undesirable side effects.

---

## 6. Postman

Create folder **Lecture 08**.

### Search users
- GET `{{base_url}}/user/profile/search/vitest`
- Assert: status 200, `search` is an array

### Get all users
- GET `{{base_url}}/user/all/1`
- Assert: status 200, `users` is array, `totalUsers` > 0

### Update social links
- PUT `{{base_url}}/user/profile/social-links`
- Body: `{ "facebook": "https://facebook.com/test", "instagram": "", "twitter": "", "youtube": "" }`
- Assert: status 200, message "Updated successfully"

### Verify via currentuser
- GET `{{base_url}}/currentuser`
- Assert: `user.social.facebook === "https://facebook.com/test"`

---

## 7. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`PUT /user/profile/social-links`** — all optional strings:
| Field | Type | Required |
|-------|------|----------|
| `facebook` | string | ❌ |
| `instagram` | string | ❌ |
| `twitter` | string | ❌ |
| `youtube` | string | ❌ |

**`PUT /user/profile/change-password`** — note the unusual max 8:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `currentPassword` | string | ✅ | min 4, **max 8** |
| `newPassword` | string | ✅ | min 4, **max 8** |
| `confirmPassword` | any | ✅ | must equal newPassword |

---

## Key Takeaways

- ✅ `/user/all/1` includes `followers` bundled in the response — efficiency pattern
- ✅ Search is case-insensitive regex — `"vitest"` matches any capitalisation
- ✅ Social links follow the same PUT then GET verification pattern from L4
- ✅ Change-password has an unusual max 8 constraint — only test validation errors

**What's next:** Lecture 9 — followers and notifications. First lecture that requires two users interacting.

---

## 8. Running the Tests

```bash
npm test tests/lecture-08/users.spec.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-08/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-08: user profile search, social links, change-password validation"

# Push the branch to GitHub
git push -u origin lecture-08-user-profile
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-08: user profile search, social links, change-password validation`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-09-followers
```


## Homework

Open `tests/lecture-08/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | GET /user/all/1 — `users` array, `totalUsers`, `followers` |
| 2 | Search by username — find TEST_USERNAME in results |
| 3 | PUT social links + GET /currentuser state verification |
| 4 | Change-password empty body → 400 |
| 5 | `.then()` — change-password mismatched passwords → 400 |
| 6 | `toBeGreaterThanOrEqual(0)` — assert follower/following count is non-negative |
| 7 | `toBeTruthy` — assert a username in the followers list is non-empty |

```bash
npm test tests/lecture-08/homework/starter.test.ts
```

Goal: **7 tests passing.**
