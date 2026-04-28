# Lecture 09 — Followers, Blocking & Notifications

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 8 — user profile search, social links, change-password.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-09/lecture.test.ts
> npm test tests/lecture-09/homework/starter.test.ts
> ```

---

## What You Will Learn

- Why this lecture needs **two users** — you cannot follow yourself
- Creating a second test user (user B) dynamically in `beforeAll`
- `PUT /user/follow/:followerId` — follow a user by their User `_id`
- `GET /user/following` — list users the current user follows
- `GET /user/followers/:userId` — list followers of a specific user
- `PUT /user/unfollow/:followeeId/:followerId` — requires BOTH IDs
- `PUT /user/block/:followerId` + `PUT /user/unblock/:followerId`
- `GET /notifications` — user notifications (may be empty)
- `PUT /notification/:notificationId` — mark as read
- `DELETE /notifications/:notificationId` — delete notification
- Advanced assertion variants — `expect.objectContaining` for notification shape, `toBeTypeOf` for ID fields, `toBeTruthy` for non-empty values

> **Reference Topics**
> - Two-user test setup and cleanup → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - beforeAll / afterAll lifecycle → [`docs/topics/test-lifecycle.md`](../../docs/topics/test-lifecycle.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Two Users |
| 2 | Creating User B in `beforeAll` |
| 3 | Follow & Unfollow |
| 4 | Block & Unblock |
| 5 | Notifications |
| 6 | Postman |
| 7 | Endpoint Summary |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Why Two Users

`PUT /user/follow/:followerId` requires a `followerId` — the User `_id` of someone else.
You cannot follow yourself (the server filters it out in the follower service).

Solution: create a second test user (user B) with Faker.js in `beforeAll`.
After all tests, delete user B with the cleanup endpoint.

---

## 2. Creating User B in `beforeAll`

```ts
import { faker } from '@faker-js/faker';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

// In beforeAll:
const userBName = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
  username: userBName,
  email: faker.internet.email().toLowerCase(),
  password: TEST_PASSWORD,
  avatarColor: TEST_AVATAR_COLOR,
  avatarImage: TEST_AVATAR_IMAGE,
}, { validateStatus: () => true });

userBId   = signupRes.data.user?._id ?? '';       // User document _id — used as followerId
userBAuthId = signupRes.data.user?.authId ?? ''; // Auth _id — used for cleanup
```

---

## 3. Follow & Unfollow

**Follow:**
```ts
PUT /user/follow/:followerId
// followerId = userB._id (the User document _id, NOT the Auth _id)
```

**Unfollow:**
```ts
PUT /user/unfollow/:followeeId/:followerId
// followeeId = userB._id (who you are unfollowing)
// followerId = userA._id (you — get from GET /currentuser)
```

You need your own `_id` for unfollow. Get it from `GET /currentuser`:
```ts
const cur = await axios.get(`${config.BASE_URL}/currentuser`, ...);
userAId = cur.data.user._id;
```

**State verification:**
```ts
// After follow:
GET /user/following → verify userB appears in the following list

// After unfollow:
GET /user/following → verify userB is no longer there
```

---

## 4. Block & Unblock

```ts
PUT /user/block/:followerId    // blocks a user
PUT /user/unblock/:followerId  // unblocks a user
```

**What blocking does:**
- Adds the blocked user to your `blocked` array and you to their `blockedBy` array
- Blocked users no longer appear in your suggestions
- Their posts do not appear in your feed
- They cannot follow you while blocked

**Response messages:**
All four endpoints (follow, unfollow, block, unblock) return `{ message: "..." }` with status 200.
The exact messages are short operational confirmations from the queue worker — they vary
and are not important to assert on precisely. Assert `res.status === 200` instead.

---

## 5. Notifications

`GET /notifications` returns all notifications for the current user.
The array may be **empty** if no one has reacted/commented/followed.

```ts
const res = await axios.get(`${config.BASE_URL}/notifications`, ...);
// { message: 'User notifications', notifications: [...] }
// notifications may be []
```

For PATCH and DELETE, you need a `notificationId`. If there are no notifications,
these tests just verify the 400/404 error handling:

```ts
// Test: invalid notificationId returns 400 or 500
PUT /notification/not-an-objectid → 400
```

---

## 6. Postman

Create folder **Lecture 09**. This lecture requires signing in as your test user.

### Follow user
You need user B's `_id`. Either use one you created in L09 tests, or create one via Postman L03 flow.

### Get following
- GET `{{base_url}}/user/following`
- Assert: status 200, `following` is array

### Unfollow (need both IDs)
- PUT `{{base_url}}/user/unfollow/{{userBId}}/{{userAId}}`

---

## 7. Endpoint Summary

| Method | Path | Returns |
|--------|------|---------|
| PUT | `/user/follow/:followerId` | `{ message: ... }` 200 |
| PUT | `/user/unfollow/:followeeId/:followerId` | `{ message: ... }` 200 |
| GET | `/user/following` | `{ message: "User following", following: [...] }` |
| GET | `/user/followers/:userId` | `{ message: "User followers", followers: [...] }` |
| PUT | `/user/block/:followerId` | `{ message: ... }` 200 |
| PUT | `/user/unblock/:followerId` | `{ message: ... }` 200 |
| GET | `/notifications` | `{ message: "User notifications", notifications: [...] }` |
| PUT | `/notification/:notificationId` | `{ message: "Notification marked as read" }` |
| DELETE | `/notifications/:notificationId` | `{ message: "Notification deleted successfully" }` |

---

## Key Takeaways

- ✅ Some tests need **two users** — create user B in `beforeAll`, clean up in `afterAll`
- ✅ Unfollow requires **both** the followeeId and followerId — two ObjectIds in the URL
- ✅ Notifications may be empty — always assert the shape, not a specific count
- ✅ Get your own `_id` from `GET /currentuser` — needed for unfollow and similar endpoints

**What's next:** Lecture 10 — MongoDB direct queries. No more API for this lecture — raw DB access.

---

## 8. Running the Tests

```bash
npm test tests/lecture-09/lecture.test.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-09/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-09: followers, blocking, notifications, two-user scenario"

# Push the branch to GitHub
git push -u origin lecture-09-followers
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-09: followers, blocking, notifications, two-user scenario`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-10-mongodb
```


## Homework

Open `tests/lecture-09/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Follow user B → status 200 |
| 2 | GET /user/following → userB in list |
| 3 | GET /user/followers/:userBId → userA in list |
| 4 | Unfollow user B → verify removed from following |
| 5 | `.then()` — GET /notifications → array |
| 6 | `expect.objectContaining` — assert notification has `_id` and `message` fields |
| 7 | `toBeTypeOf('string')` — assert notification `_id` is a string |

```bash
npm test tests/lecture-09/homework/starter.test.ts
```

Goal: **7 tests passing.**
