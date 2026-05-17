# Lecture 15 — Posts with Media: Images & Videos

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 14 — password reset flow, SSO.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-15/image-posts.spec.ts
> npm test tests/lecture-15/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /post/image/post` — create a post with an embedded image
- `POST /post/video/post` — create a post with a video (requires a video data URL)
- `GET /post/images/:page` — get only posts that have images
- `GET /post/videos/:page` — get only posts that have videos
- `PUT /post/image/:postId` — update a post to add/replace an image
- `PUT /post/video/:postId` — update a post to add/replace a video
- `image` field validation — same data URL format as signup's `avatarImage`
- Why image/video posts are slower than plain posts (Cloudinary upload happens synchronously)
- Advanced assertion variants — `toMatch(/regex/)` for URL format, `toBeGreaterThan` for array length, `toSatisfy(fn)` to assert Cloudinary URL structure

> **Reference Topics**
> - Base64 and data URLs explained → [`docs/topics/base64.md`](../../docs/topics/base64.md)
> - Cloudinary image upload pipeline → [`docs/topics/cloudinary.md`](../../docs/topics/cloudinary.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Image Post vs Plain Post |
| 3 | The `image` Field — Validation Rules |
| 4 | Lifecycle |
| 5 | Postman |
| 6 | Endpoint Schema |
| 7 | `imgId` and `imgVersion` |
| 8 | Understanding the Test File |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/post/image/post` | `{ message: "Post created with image successfully" }` — 201 |
| POST | `/post/video/post` | `{ message: "Post created with video successfully" }` — 201 |
| GET | `/post/images/:page` | `{ message: "All posts with images", posts: [...] }` |
| GET | `/post/videos/:page` | `{ message: "All posts with videos", posts: [...] }` |
| PUT | `/post/image/:postId` | `{ message: "Post with image updated successfully" }` |
| PUT | `/post/video/:postId` | `{ message: "Post with video updated successfully" }` |

---

## 2. Image Post vs Plain Post

| Feature | `POST /post` | `POST /post/image/post` |
|---------|-------------|------------------------|
| `image` field | ❌ optional | ✅ required |
| Cloudinary upload | ❌ none | ✅ synchronous |
| Response time | ~100ms | ~2-5s |
| `imgId` in stored post | empty string | Cloudinary public_id |
| Returned in `GET /post/images/:page` | ❌ filtered out | ✅ included |

---

## 3. The `image` Field

The `image` field must be a **valid data URL or HTTPS URL**. Same validation as signup's `avatarImage`.

Use `TEST_AVATAR_IMAGE` from `src/fixtures.ts`:

```ts
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

await axios.post(`${config.BASE_URL}/post/image/post`, {
  post: 'My image post!',
  image: TEST_AVATAR_IMAGE,
  bgColor: '#ffffff',
  privacy: 'Public',
  feelings: '',
  profilePicture: '',
}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
```

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| Not data URL or HTTPS URL | `'Image must be either a data URL or HTTP/HTTPS URL'` |
| Invalid data URL format | `'Image must be a valid data URL in format: data:image/[type];base64,[data]'` |
| Missing image | `'Image is a required field'` |

---

## 4. Lifecycle

```
beforeAll:
  1. Sign in → cookie
  2. Create a plain post (for update tests)
  3. Create an image post (for GET /post/images verification)
  4. Find both post IDs via GET /post/all/1

tests

afterAll:
  5. Delete both posts
  6. Sign out
```

---

## 5. Postman

Create folder **Lecture 15**.

### Create image post
- POST `{{base_url}}/post/image/post`
- Body: `{ "post": "Image post!", "image": "<TEST_AVATAR_IMAGE base64>", "bgColor": "#fff", "privacy": "Public", "feelings": "", "profilePicture": "" }`

### Get image posts
- GET `{{base_url}}/post/images/1`
- Assert: posts array, first post has non-empty `imgId`

### Update post with image
- PUT `{{base_url}}/post/image/{{postId}}`
- Same body — replaces the image

---

## 6. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /post/image/post`** — `postWithImageSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `image` | string | ✅ | valid data URL or HTTPS URL |
| `post` | string | ❌ | post text |
| `bgColor` | string | ❌ | hex colour |
| `privacy` | string | ❌ | visibility |
| `feelings` | string | ❌ | |
| `gifUrl` | string | ❌ | |
| `profilePicture` | string | ❌ | |

---

## 7. `imgId` and `imgVersion` — What Cloudinary Returns

When an image is uploaded to Cloudinary, the server stores two identifiers in the post document:

| Field | Type | What it is |
|-------|------|-----------|
| `imgId` | string | Cloudinary public ID — unique identifier for the image (e.g. `"5f4dcc3b5aa765d61d8327de"`) |
| `imgVersion` | string | Cloudinary version number — changes each time the image is updated |

These are what you use to construct the Cloudinary image URL:
```
https://res.cloudinary.com/<cloud_name>/image/upload/v<imgVersion>/<imgId>
```

For plain posts (no image), both fields are empty strings: `imgId: ""`.
For image posts, both are non-empty strings. This is exactly how `GET /post/images/:page` filters — it only returns posts where `imgId` is not empty.

---

## 8. Understanding the Test File

Open `tests/lecture-15/image-posts.spec.ts`.

**Why `beforeAll` creates TWO posts:**

```ts
// Plain post — for proving it doesn't appear in GET /post/images
await axios.post(postUrl, { post: PLAIN_POST_CONTENT, ... });

// Image post — for verifying GET /post/images includes it
await axios.post(imagePostUrl, { post: IMAGE_POST_CONTENT, image: TEST_AVATAR_IMAGE, ... });
```

This lets us write two assertions in section 2:
- Image post IS in `GET /post/images/1` ✅
- Plain post is NOT in `GET /post/images/1` ✅ (proves the filter works)

**Why sections 1 (create image post) also clean up extra posts:**

Section 1 creates additional test posts to check the response message. Each of those needs to be deleted immediately to avoid cluttering the test data. The cleanup is done inside the test:

```ts
it('message is "Post created with image successfully"', async () => {
  const res = await axios.post(imagePostUrl, { post: `Extra ${Date.now()}`, image: TEST_AVATAR_IMAGE, ... });
  expect(res.data.message).toBe('Post created with image successfully');
  // Clean up extra post right away
  const all = await axios.get(getAllUrl, ...);
  const extra = all.data.posts?.[0];
  if (extra?._id && extra._id !== imagePostId) {
    await axios.delete(`${config.BASE_URL}/post/${extra._id}`, ...);
  }
});
```

---

## Key Takeaways

- ✅ Image posts require a valid base64 data URL — use `TEST_AVATAR_IMAGE` from fixtures
- ✅ `GET /post/images/:page` only returns posts where `imgId` is non-empty — not plain posts
- ✅ Image upload to Cloudinary is synchronous — response is slower (~2-5s vs ~100ms)
- ✅ `imgId` and `imgVersion` are the Cloudinary identifiers stored in the post document
- ✅ `PUT /post/image/:postId` replaces the image — updates both `imgId` and `imgVersion`

**What's next:** Lecture 16 — User Profile Pages & Image Management.

---

## 9. Running the Tests

```bash
npm test tests/lecture-15/image-posts.spec.ts
```

**Expected output:**
```
✓ 1. Create image post > status is 201
✓ 1. Create image post > message is "Post created with image successfully"
✓ 2. GET /post/images/:page > status is 200
✓ 2. GET /post/images/:page > response has posts array
✓ 2. GET /post/images/:page > our image post appears in the list
✓ 2. GET /post/images/:page > plain post does NOT appear in images list
✓ 3. Update post image > PUT /post/image/:postId returns 200
✓ 4. Validation errors > POST without image returns 400
✓ 4. Validation errors > POST with invalid image format returns 400
✓ 4. Validation errors > POST without cookie returns 401

Test Files  1 passed (1)
Tests  10 passed (10)
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-15/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-15: posts with media — image/video upload, filtered GET"

# Push the branch to GitHub
git push -u origin lecture-15-posts-media
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-15: posts with media — image/video upload, filtered GET`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-16-user-profile-images
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | Create image post → status 201, message |
| 2 | GET /post/images/1 → posts array, imgId non-empty on at least one |
| 3 | PUT /post/image/:postId → state verify via GET |
| 4 | POST /post/image/post with invalid image → 400 |
| 5 | `.then()` — GET /post/images/1 → at least one post |
| 6 | `toMatch(/^https?:\/\//)` — assert profile picture URL starts with http/https |
| 7 | `toSatisfy` — assert URL contains `'cloudinary'` using a custom predicate |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-15/homework/starter.test.ts
```
