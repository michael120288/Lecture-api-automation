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

# Lecture 16
## User Profile Pages

GET-heavy testing and the three-parameter endpoint

---

## Profile Endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /user/profile` | own profile |
| `GET /user/profile/:userId` | any user by `_id` |
| `GET /user/profile/posts/:username/:userId/:uId` | profile + posts |
| `GET /user/profile/user/suggestions` | suggested users |

<!-- note: four different profile endpoints. The third one is the tricky one — it requires three different parameters that all come from different fields on the user object. -->

---

## The Three-Parameter Endpoint

```ts
const { _id: userId, username, uId } = currentUser;
const url = `${BASE_URL}/user/profile/posts/` +
            `${username}/${userId}/${uId}`;
```

| Param | Example | Source |
|-------|---------|--------|
| `:username` | `Vitestmike` | user document |
| `:userId` | `507f1f77...` | MongoDB ObjectId |
| `:uId` | `123456789012` | 12-digit number |

<!-- note: all three come from GET /currentuser. Get them all in beforeAll before building the URL. Missing any one returns a 400 or wrong data. -->

---

## `uId` is NOT `_id`

> `uId` is a 12-digit numeric string

```ts
user.uId  = "123456789012"   // 12-digit number
user._id  = "507f1f77..."    // 24-char hex ObjectId
```

- Redis caches posts by `uId`
- MongoDB uses `_id` as fallback
- Both are needed to cover both code paths

<!-- note: this is the #1 mistake in this lecture. Students use _id where uId is expected. The values look completely different but in variable names they're easy to confuse. -->

---

## Why All Three Params Are Required

`uId` = 12-digit numeric string (from signup, stored in Redis)  
`_id` = 24-char hex MongoDB ObjectId  

> The profile+posts endpoint requires ALL THREE: `username`, `userId` (`_id`), `uId`

<!-- note: the controller tries Redis first using uId, then falls back to MongoDB using userId. If you only provide one, one of the two code paths goes untested. -->

---

## `beforeAll` — Read-Only Setup

```ts
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, ...);
  sessionCookie = ...;

  const curRes = await axios.get(currentUserUrl, ...);
  userId   = curRes.data.user._id;
  username = curRes.data.user.username;
  uId      = curRes.data.user.uId;
});
```

> No resource creation — just read what exists

<!-- note: this lecture is unusual because we don't create anything. We just read. The beforeAll is minimal — sign in and capture user details. No teardown needed. -->

---

## Suggestions Are Non-Deterministic

```ts
// Correct — shape only
expect(res.status).toBe(200);
expect(Array.isArray(res.data.users)).toBe(true);

// Wrong — count can legitimately be zero
expect(res.data.users.length).toBeGreaterThan(0);
```

> The list can be empty if you follow everyone

<!-- note: suggestions are a random sample filtered by who you already follow. On a test account that follows everyone on the shared server, the list is empty. Never assert length > 0. -->

---

## Security Test — No Password in Response

```ts
it('password is not in response', async () => {
  const res = await axios.get(
    `${BASE_URL}/user/profile`,
    { headers: { Cookie: sessionCookie },
      validateStatus: () => true }
  );
  expect(res.data.user.password).toBeUndefined();
});
```

> Negative assertions are as important as positive ones

<!-- note: profile endpoints must never expose the password hash. This test is simple but critical. If it ever starts failing, something is seriously wrong with the API. -->

---

## Three Assertion Matchers

```ts
// Assert array contains objects with a shape
expect(res.data.images).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ imgId: expect.any(String) })
  ])
);

// Boundary guard — never negative
expect(res.data.users.length).toBeGreaterThanOrEqual(0);

// Type check
expect(res.data.user.username).toBeTypeOf('string');
```

<!-- note: arrayContaining lets you assert that at least some elements match a shape, without caring about the full array contents. Good for lists that include other users' data. -->

---

## Key Rule

> `uId` is NOT the same as `_id` — the profile+posts endpoint requires ALL THREE parameters

- `username` — from user document
- `userId` — MongoDB ObjectId
- `uId` — 12-digit numeric string

---

## Image Management Endpoints

Profile and background images are separate from post images — they go to the `Image` collection.

| Method | Path | Returns |
|--------|------|---------|
| POST | `/images/profile` | `{ message: "Image added successfully" }` |
| POST | `/images/background` | `{ message: "Image added successfully" }` |
| DELETE | `/images/profile/:bgImageId` | `{ message: "Image deleted successfully" }` |
| GET | `/images/:userId` | `{ message: "User images", images: [...] }` |

<!-- note: these endpoints are completely separate from post image uploads. They manage the profile picture and background banner shown on the user's profile page. -->

---

## POST /images/profile

```ts
const res = await axios.post(
  `${BASE_URL}/images/profile`,
  { image: TEST_AVATAR_IMAGE },
  { headers: { Cookie: sessionCookie }, validateStatus: () => true }
);
expect(res.status).toBe(200);
expect(res.data.message).toBe('Image added successfully');
```

- `image` must be a valid data URL or HTTPS URL
- Missing `image` field → 400

<!-- note: TEST_AVATAR_IMAGE is imported from src/fixtures — a pre-encoded base64 image string. Don't generate your own — use the fixture. -->

---

## POST /images/background

```ts
const res = await axios.post(
  `${BASE_URL}/images/background`,
  { image: TEST_AVATAR_IMAGE },
  { headers: { Cookie: sessionCookie }, validateStatus: () => true }
);
expect(res.status).toBe(200);
expect(res.data.message).toBe('Image added successfully');
```

Same schema as `/images/profile` — `image` field required.

<!-- note: background images appear as the banner at the top of the user's profile page. The same TEST_AVATAR_IMAGE fixture is used for testing both. -->

---

## DELETE /images/profile/:bgImageId

Get `bgImageId` from `GET /images/:userId` first:

```ts
const listRes = await axios.get(
  `${BASE_URL}/images/${userId}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true }
);
const img = listRes.data.images[0];

if (img) {
  const delRes = await axios.delete(
    `${BASE_URL}/images/profile/${img.imgId}`,
    { headers: { Cookie: sessionCookie }, validateStatus: () => true }
  );
  expect(delRes.status).toBe(200);
}
```

<!-- note: imgId is not the same as _id. It's a Cloudinary public ID. Always guard with existence check — images array may be empty on a fresh account. -->

---

## GET /images/:userId

```ts
const res = await axios.get(
  `${BASE_URL}/images/${userId}`,
  { headers: { Cookie: sessionCookie }, validateStatus: () => true }
);
// { message: 'User images', images: [{ imgId, imgVersion, createdAt }] }
expect(res.status).toBe(200);
expect(Array.isArray(res.data.images)).toBe(true);
```

Returns all images (profile + background) uploaded by the user.
May be empty on a fresh account — assert shape, not count.

<!-- note: images array includes both profile picture uploads and background image uploads. Use GET /images/:userId to get the imgId needed for the DELETE endpoint. -->

---

## Homework

| TODO | Goal |
|------|------|
| 1 | GET /user/profile → 200, user shape |
| 2 | GET /user/profile/user/suggestions → array |
| 3 | POST /images/profile → 200 |
| 4 | GET /images/:userId → images array |
| 5 | `.then()` — GET /user/profile/:userId for any user |
| 6 | `expect.arrayContaining` — assert messages array shape |
| 7 | `toBeGreaterThanOrEqual(0)` — assert length is never negative |

Goal: **7 tests passing**
