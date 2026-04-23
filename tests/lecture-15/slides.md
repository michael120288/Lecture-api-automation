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

# Lecture 15
## Posts with Media

Testing Cloudinary uploads and filtered GET endpoints

---

## Image Upload Pipeline

| Step | Who | What |
|------|-----|------|
| 1 | Test | `POST /images/profile` with base64 data URL |
| 2 | API | uploads to **Cloudinary** |
| 3 | Cloudinary | returns `imgId` + `imgVersion` |
| 4 | API | stores in MongoDB, returns `profilePicture` URL |

> Never assert the exact URL — assert format + provider

<!-- note: the API is the middleman. It receives a base64 string, uploads to Cloudinary, then stores the Cloudinary identifiers in MongoDB. We never talk to Cloudinary directly. -->

---

## Plain Post vs Image Post

| Feature | `POST /post` | `POST /post/image/post` |
|---------|-------------|------------------------|
| `image` field | optional | required |
| Cloudinary upload | none | synchronous |
| Response time | ~100ms | 2–5 seconds |
| `imgId` in doc | `""` | Cloudinary public_id |

> Increase `testTimeout` to 15s for image tests

<!-- note: the slow response time trips up students. Their test times out because the default Vitest timeout is too short for a Cloudinary round-trip. -->

---

## The `image` Field

```ts
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

await axios.post(`${BASE_URL}/post/image/post`, {
  post: 'My image post!',
  image: TEST_AVATAR_IMAGE,
  ...
}, { headers: { Cookie: sessionCookie },
     validateStatus: () => true });
```

> Always use `TEST_AVATAR_IMAGE` from fixtures

<!-- note: the image must be a valid base64 data URL or HTTPS URL. Students try to use a file path or construct their own string. Both fail Joi validation before reaching Cloudinary. -->

---

## Never Assert the Exact Cloudinary URL

> The URL changes every upload

- Assert the format: starts with `https://`
- Assert the provider: contains `cloudinary`
- Never assert the full URL string

```ts
expect(imgUrl).toSatisfy(
  (url: string) => url.includes('cloudinary')
);
expect(imgUrl).toMatch(/^https?:\/\//);
```

<!-- note: this is the most common assertion mistake with media tests. Every upload gets a new URL. If you assert the exact URL, the test fails on the second run. -->

---

## `imgId` and `imgVersion`

| Field | What it is |
|-------|-----------|
| `imgId` | Cloudinary public ID — unique per image |
| `imgVersion` | Version number — changes on update |

- Plain posts: `imgId: ""` — filtered OUT by `/post/images`
- Image posts: `imgId: "abc123"` — filtered IN

<!-- note: the filter endpoint uses imgId as the discriminator. Empty string means no image. Non-empty means has image. This is how /post/images/:page knows what to return. -->

---

## Test Lifecycle

1. `beforeAll` — sign in, capture session cookie
2. Create plain post — capture `plainPostId`
3. Create image post — capture `imagePostId`
4. Tests run against both posts
5. `afterAll` — delete both posts, sign out

<!-- note: two posts in setup lets you prove the filter includes image posts AND excludes plain posts. One post alone can't verify the filter works correctly in both directions. -->

---

## Clean Up Extra Posts Inside Tests

```ts
it('message is correct', async () => {
  const res = await axios.post(imagePostUrl, {
    post: `Extra ${Date.now()}`,
    image: TEST_AVATAR_IMAGE, ...
  });
  expect(res.data.message).toBe(
    'Post created with image successfully'
  );
  // delete the extra post immediately
  const extra = all.data.posts?.[0];
  if (extra?._id !== imagePostId)
    await axios.delete(`${BASE_URL}/post/${extra._id}`, ...);
});
```

<!-- note: if a test creates a post to verify the response, that post must be deleted inside the same test — not in afterAll. Otherwise they accumulate across runs. -->

---

## Three Assertion Matchers

```ts
// Assert URL format
expect(url).toMatch(/^https?:\/\//);

// Assert at least one post exists
expect(res.data.posts.length).toBeGreaterThan(0);

// Custom predicate
expect(imgUrl).toSatisfy(
  (url: string) => url.includes('cloudinary')
);
```

<!-- note: toSatisfy accepts any function returning true/false. Use it when no built-in matcher fits. Great for URL content checks where toMatch would need a complex regex. -->

---

## Key Rule

> Never assert the exact Cloudinary URL — assert the format and the provider

- Format: `https://`
- Provider: `cloudinary.com`
- Never: full URL string

---

## Homework

| TODO | Goal |
|------|------|
| 1 | Create image post → 201, verify message |
| 2 | GET /post/images/1 → at least one has non-empty `imgId` |
| 3 | PUT /post/image/:postId → verify state change via GET |
| 4 | POST /post/image/post with invalid image → 400 |
| 5 | `.then()` — GET /post/images/1 → at least one post |
| 6 | `toMatch(/^https?:\/\//)` — assert profile picture URL |
| 7 | `toSatisfy` — assert URL contains `'cloudinary'` |

Goal: **7 tests passing**
