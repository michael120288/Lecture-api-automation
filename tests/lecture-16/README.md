# Lecture 16 — User Profile Pages & Image Management

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 15 — posts with media, image/video upload.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-16/lecture.test.ts
> npm test tests/lecture-16/homework/starter.test.ts
> ```

---

## What You Will Learn

- `GET /user/profile` — own full profile
- `GET /user/profile/:userId` — another user's profile by ID
- `GET /user/profile/posts/:username/:userId/:uId` — profile + all their posts in one call
- `GET /user/profile/user/suggestions` — random users to follow
- `POST /images/profile` — upload a profile picture
- `POST /images/background` — upload a background image
- `GET /images/:userId` — get all images uploaded by a user
- `DELETE /images/profile/:bgImageId` — remove profile picture
- **GET-heavy testing** — asserting response shapes without mutations
- Image management: why profile/background images go through a separate endpoint
- Advanced assertion variants — `expect.arrayContaining` for message arrays, `toBeGreaterThanOrEqual` for array length bounds, `toBeTypeOf` for message field types

> **Reference Topics**
> - Pagination reference → [`docs/topics/pagination.md`](../../docs/topics/pagination.md)
> - Cookie capture and replay → [`docs/topics/cookies-sessions.md`](../../docs/topics/cookies-sessions.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Profile Page Endpoints |
| 3 | Image Management |
| 4 | Postman |
| 5 | Endpoint Schema |
| 6 | What Is `uId`? |
| 7 | Why Are Suggestions Random? |
| 8 | Understanding the Test File |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/user/profile` | `{ message, user: {...} }` |
| GET | `/user/profile/:userId` | `{ message, user: {...} }` |
| GET | `/user/profile/posts/:username/:userId/:uId` | `{ message, user: {...}, posts: [...] }` |
| GET | `/user/profile/user/suggestions` | `{ message, users: [...] }` |
| GET | `/images/:userId` | `{ message, images: [...] }` |
| POST | `/images/profile` | `{ message: "Image added successfully" }` |
| POST | `/images/background` | `{ message: "Image added successfully" }` |
| DELETE | `/images/profile/:bgImageId` | `{ message: "Image deleted successfully" }` |
| DELETE | `/images/background/:bgImageId` | `{ message: "Image deleted successfully" }` |

---

## 2. Profile Page Endpoints

**Own profile** (`GET /user/profile`):
Returns the currently authenticated user's full profile — same shape as `/currentuser` but without `token` and `isUser`.

**Another user's profile** (`GET /user/profile/:userId`):
`:userId` = the User `_id` from search results or follower lists.

**Profile + posts** (`GET /user/profile/posts/:username/:userId/:uId`):
All three URL params are required:
- `:username` — title-cased username (`Vitestmike`)
- `:userId` — User `_id`
- `:uId` — 12-digit numeric string from the user document

```ts
// Get all three values from GET /currentuser
const { _id: userId, username, uId } = currentUser;
const url = `${BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
```

**Suggestions** (`GET /user/profile/user/suggestions`):
Returns random users you are not following. Always returns an array (may be empty).

---

## 3. Image Management

Profile and background images are separate from post images. They go to the `Image` collection in MongoDB.

**Upload profile picture:**
```ts
await axios.post(`${config.BASE_URL}/images/profile`, {
  image: TEST_AVATAR_IMAGE,
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

**Get user's images:**
```ts
const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
  headers: { Cookie: sessionCookie }, validateStatus: () => true,
});
// { message: 'User images', images: [{ imgId, imgVersion, createdAt }] }
```

---

## 4. Postman

### Get own profile
- GET `{{base_url}}/user/profile`
- Assert: status 200, user object present

### Get another user's profile
- GET `{{base_url}}/user/profile/{{userBId}}`
- Assert: status 200

### Get suggestions
- GET `{{base_url}}/user/profile/user/suggestions`
- Assert: status 200, users is array

### Upload profile picture
- POST `{{base_url}}/images/profile`
- Body: `{ "image": "<TEST_AVATAR_IMAGE>" }`
- Assert: status 200, message "Image added successfully"

---

## 5. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /images/profile` and `POST /images/background`** — `addImageSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `image` | string | ✅ | valid data URL or HTTPS URL |

---

## 6. What Is `uId`?

You will see `uId` in the `GET /user/profile/posts/:username/:userId/:uId` URL.

`uId` is a **12-digit numeric string** generated randomly at signup — different from `_id` (MongoDB ObjectId) and `authId`. It is stored in the Auth document and propagated to the User document.

```ts
// From the signup/signin/currentuser response:
user.uId = "123456789012"   // 12-digit number as string
user._id = "507f1f77..."    // MongoDB ObjectId (24 hex chars)
```

**Why does this endpoint need `uId` in addition to `userId`?**
Redis caches posts by `uId` for fast retrieval. The controller uses `uId` to look up posts in the Redis cache and `userId` to fall back to MongoDB. You need all three URL params to cover both paths.

```ts
// Get all three from GET /currentuser:
const { _id: userId, username, uId } = currentUser;
const profilePostsUrl = `${BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
```

---

## 7. Why Are Suggestions Random?

`GET /user/profile/user/suggestions` returns users you might want to follow.

The server:
1. Gets all users from Redis cache (up to a random sample)
2. Filters out users you already follow and yourself
3. Returns the remaining users

The result is non-deterministic — the same request can return different users each time.
This is why the test asserts `Array.isArray(res.data.users)` — not a specific count or specific usernames.

---

## 8. Understanding the Test File

Open `tests/lecture-16/lecture.test.ts`.

**The `beforeAll` pattern for GET-heavy lectures:**

Unlike lectures that create resources (posts, comments, users), this lecture mostly reads data.
The `beforeAll` only signs in and captures the current user's details — no mutations:

```ts
beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, ...);
  sessionCookie = ...;

  // Capture userId, username, uId for the profile+posts URL
  const curRes = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, ... });
  userId   = curRes.data.user._id;
  username = curRes.data.user.username;
  uId      = curRes.data.user.uId;
});
```

**Note on `GET /user/profile/:userId` test:** The test uses **your own `userId`** for simplicity. In a real scenario you'd use another user's ID. The endpoint works for any valid userId.

---

## Key Takeaways

- ✅ `GET /user/profile/posts/:username/:userId/:uId` requires all three URL params — `uId` is the 12-digit numeric string
- ✅ Profile images go through `/images/` endpoints — separate from post images
- ✅ `GET /images/:userId` returns all images (profile + background) uploaded by a user
- ✅ Suggestions are random — always assert it's an array, never assert a specific count
- ✅ This is a GET-heavy lecture — `beforeAll` only signs in, no resource creation

**What's next:** Lecture 17 — Chat & Messaging. Two-user conversation flow.

---

## 9. Running the Tests

```bash
npm test tests/lecture-16/lecture.test.ts
```

**Expected output:**
```
✓ 1. Own profile > GET /user/profile returns 200
✓ 1. Own profile > response has user object
✓ 1. Own profile > password is not in response
✓ 2. Profile by userId > GET /user/profile/:userId returns 200
✓ 2. Profile by userId > returns the correct user
✓ 3. Profile + posts > returns 200 with user and posts
✓ 4. User suggestions > GET /user/profile/user/suggestions returns 200
✓ 4. User suggestions > response has users array (may be empty)
✓ 5. Upload profile picture > POST /images/profile returns 200
✓ 5. Upload profile picture > POST without image returns 400
✓ 6. Get user images > GET /images/:userId returns 200
✓ 7. Negative tests > GET /user/profile without cookie returns 401
✓ 7. Negative tests > GET /user/profile/:userId with invalid ID returns 400

Test Files  1 passed (1)
Tests  13 passed (13)
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-16/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-16: user profile pages, image management"

# Push the branch to GitHub
git push -u origin lecture-16-user-profile-images
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-16: user profile pages, image management`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-17-chat
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | GET /user/profile → status 200, user shape |
| 2 | GET /user/profile/user/suggestions → array |
| 3 | POST /images/profile → status 200 |
| 4 | GET /images/:userId → images array |
| 5 | `.then()` — GET /user/profile/:userId for any user |
| 7 | `expect.arrayContaining` — assert messages array contains objects with a `body` field |
| 8 | `toBeGreaterThanOrEqual(0)` — assert messages.length is never negative |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-16/homework/starter.test.ts
```
