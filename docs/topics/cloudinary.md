# Cloudinary

## Table of Contents

1. [What Cloudinary Is](#1-what-cloudinary-is)
2. [Why APIs Offload Image Storage to a Service](#2-why-apis-offload-image-storage-to-a-service)
3. [How Chatty's Image Upload Flow Works](#3-how-chattys-image-upload-flow-works)
4. [The imgId and imgVersion Fields](#4-the-imgid-and-imgversion-fields)
5. [The profilePicture Field](#5-the-profilepicture-field)
6. [The bgImageVersion and bgImageId Fields](#6-the-bgimageversion-and-bgimageid-fields)
7. [Testing Image Uploads — Why the TEST_AVATAR_IMAGE Works](#7-testing-image-uploads--why-the-test_avatar_image-works)
8. [What to Assert in Tests](#8-what-to-assert-in-tests)
9. [Why You Cannot Assert the Exact Cloudinary URL](#9-why-you-cannot-assert-the-exact-cloudinary-url)
10. [Real Code Examples from Lecture 15](#10-real-code-examples-from-lecture-15)
11. [Common Mistakes](#11-common-mistakes)
12. [Quick Reference](#12-quick-reference)
13. [Related Topics](#related-topics)

---

## 1. What Cloudinary Is

Cloudinary is a cloud-based image and video storage service. It provides:

- **Cloud storage** — images are uploaded to Cloudinary's servers, not your application server's disk
- **A CDN (Content Delivery Network)** — images are served from servers geographically close to the user
- **Image transformation API** — you can resize, crop, and format images by changing the URL
- **A programmable API** — your server can upload images by calling Cloudinary's API

Chatty uses Cloudinary as its image backend. Every profile picture and background image in the Chatty application is stored on and served from Cloudinary.

### What a Cloudinary URL looks like

```
https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/user123profile.jpg
                           ^^^^^^^^^^^^ ^^^^^  ^^^^^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^
                           Cloud name   type   upload version      public ID (path)
```

Breaking down the URL:

| Segment | Example | Description |
|---------|---------|-------------|
| `res.cloudinary.com` | — | Cloudinary's CDN domain |
| Cloud name | `dmqfhagzn` | Your Cloudinary account identifier |
| Type | `image` | Media type |
| Upload type | `upload` | Delivery type |
| Version | `v1718000000` | Upload timestamp (Unix epoch format) |
| Public ID | `user123profile.jpg` | The unique identifier for this specific file |

---

## 2. Why APIs Offload Image Storage to a Service

### The problems with storing images on your application server

**Disk space:** A social media application can have millions of users, each with a profile picture. A 200KB profile picture per user at 100,000 users is 20GB of storage — on a single server. This grows linearly with user count and is expensive to manage.

**Scalability:** If your API runs on multiple servers (for horizontal scaling), an image uploaded to server A is not available on server B. You would need a shared filesystem, which adds complexity.

**Performance:** Serving large files from your API server ties up HTTP connections and CPU time. A dedicated CDN is built for serving static files efficiently.

**Bandwidth costs:** Outbound bandwidth from a cloud server (EC2, DigitalOcean, etc.) is expensive. CDN networks are optimized for content delivery at scale.

**Reliability:** Your application server going down would also make images unavailable. Cloudinary provides uptime guarantees separate from your API.

### What offloading to Cloudinary solves

| Problem | Solution |
|---------|---------|
| Disk space | Cloudinary stores images on their infrastructure |
| Scalability | All API servers upload to and reference the same Cloudinary account |
| Performance | Cloudinary's global CDN serves images from the nearest node |
| Bandwidth | Image delivery happens through Cloudinary, not your server |
| Reliability | Cloudinary's uptime is independent of your API server |
| Transformations | Resize/crop/optimize by changing URL parameters — no server-side code needed |

---

## 3. How Chatty's Image Upload Flow Works

Understanding the full flow helps you know what your tests are actually triggering.

### The upload pipeline

```
Test / Client
      |
      | 1. Send base64-encoded image in request body
      v
Chatty API (Express)
      |
      | 2. Receive base64 string from request body
      | 3. Call Cloudinary SDK upload() with the base64 string
      v
Cloudinary API
      |
      | 4. Accept the image, store it
      | 5. Return { public_id, version, secure_url, ... }
      v
Chatty API
      |
      | 6. Store public_id as imgId in MongoDB
      | 7. Store version as imgVersion in MongoDB
      | 8. Store full secure_url as profilePicture in MongoDB
      | 9. Return the user object including these fields
      v
Test / Client
      |
      | 10. Receive response with imgId, imgVersion, profilePicture
      | 11. Assert that imgId is a non-empty string
      | 12. Assert that profilePicture contains 'cloudinary.com'
```

### Step-by-step in terms of code

**Step 1 — Client sends base64:**

```typescript
// The avatarImage field is a base64-encoded image
// A 1x1 white PNG encoded as base64
const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const response = await apiClient.post('/auth/signup', {
  username: 'vitestUser1',
  email: 'vitest+upload@example.com',
  password: 'Vitest@123456!',
  avatarColor: 'blue',
  avatarImage: TEST_AVATAR_IMAGE  // base64 string sent to the API
});
```

**Step 2-5 — Chatty uploads to Cloudinary (server-side, not in your tests):**

```javascript
// This happens inside Chatty's backend — you do not write this
const cloudinaryResult = await cloudinary.v2.uploader.upload(base64ImageString, {
  folder: 'chatty/avatars'
});

// cloudinaryResult contains:
// {
//   public_id: 'chatty/avatars/user123profile',
//   version: 1718000000,
//   secure_url: 'https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/chatty/avatars/user123profile.jpg',
//   ...
// }
```

**Step 6-9 — Chatty saves to MongoDB and returns the data:**

The API stores `public_id` as `imgId`, `version` as `imgVersion`, and `secure_url` as `profilePicture` (for profile images) in the MongoDB user document. These values are then included in the API response.

---

## 4. The imgId and imgVersion Fields

### What they are

When Cloudinary stores an image, it assigns two key identifiers:

**`imgId` (maps to Cloudinary's `public_id`):**
- A unique string that identifies the image within your Cloudinary account
- Can include a folder path (e.g., `chatty/avatars/user123profile`)
- Used by Cloudinary to locate the specific image
- Does not change unless you rename the image

**`imgVersion` (maps to Cloudinary's `version`):**
- A Unix timestamp integer (number of seconds since January 1, 1970)
- Set when the image was first uploaded
- Changes when the image is overwritten with a new version
- Used in the URL to bypass CDN caching when an image is updated

### Why two separate fields instead of just the URL?

Storing `imgId` and `imgVersion` separately from the full URL gives Chatty flexibility:

1. **URL construction:** Chatty can reconstruct the Cloudinary URL from `imgId` and `imgVersion` without storing the full URL in every place. This is useful if the Cloudinary cloud name ever changes.

2. **Image updates:** When a user uploads a new profile picture, only `imgVersion` changes. Chatty can detect whether the image has been updated by comparing versions.

3. **Transformations:** To resize the image for a thumbnail, Chatty can construct a new URL from `imgId` and `imgVersion` with transformation parameters embedded in the URL — without storing a separate thumbnail URL in the database.

### How Cloudinary builds the URL from these two fields

```
https://res.cloudinary.com/{cloud_name}/image/upload/v{imgVersion}/{imgId}
```

Example:
- `cloud_name`: `dmqfhagzn`
- `imgVersion`: `1718000000`
- `imgId`: `chatty/avatars/user123`

Result:
```
https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/chatty/avatars/user123
```

### What these fields look like in an API response

```json
{
  "message": "User created successfully",
  "user": {
    "_id": "64a2b3c4d5e6f7890abc1234",
    "username": "vitestUser1",
    "email": "vitest+upload@example.com",
    "avatarColor": "blue",
    "profilePicture": "https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/chatty/avatars/user123",
    "imgId": "chatty/avatars/user123",
    "imgVersion": "1718000000",
    "bgImageId": "",
    "bgImageVersion": ""
  }
}
```

---

## 5. The profilePicture Field

`profilePicture` is the full Cloudinary URL of the user's avatar image. It is a string in the format:

```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}
```

### Key facts about profilePicture

- It is a complete, ready-to-use URL — front-end code can put this directly in an `<img>` tag
- It changes when the user uploads a new profile picture
- When no profile picture has been uploaded (empty string passed for `avatarImage`), it may be an empty string or a default image URL
- When a profile picture IS uploaded, it will always contain `cloudinary.com` as part of the URL

### Testing profilePicture

```typescript
// After signup with a base64 image
expect(response.data.user.profilePicture).toBeTruthy();
expect(typeof response.data.user.profilePicture).toBe('string');
expect(response.data.user.profilePicture).toContain('cloudinary.com');

// When no image is uploaded (empty string for avatarImage)
expect(typeof response.data.user.profilePicture).toBe('string');
// It may be empty or a default URL — check the specific API behavior
```

---

## 6. The bgImageVersion and bgImageId Fields

Just as users have a profile picture, they have a **background image** — the banner image displayed behind their profile. This background image also lives on Cloudinary and uses the same two-field pattern.

| Field | Maps to Cloudinary | Description |
|-------|--------------------|-------------|
| `bgImageId` | `public_id` | Unique identifier for the background image in Cloudinary |
| `bgImageVersion` | `version` | Upload timestamp for cache-busting |

### Default state

When a user first signs up, they have no background image:

```json
{
  "bgImageId": "",
  "bgImageVersion": ""
}
```

### After uploading a background image

The background image is updated via the profile update endpoints (not during signup). After the update:

```json
{
  "bgImageId": "chatty/backgrounds/user123bg",
  "bgImageVersion": "1718050000"
}
```

### Testing background image fields

```typescript
// On a freshly created user, background image fields are empty strings
expect(response.data.user.bgImageId).toBe('');
expect(response.data.user.bgImageVersion).toBe('');

// After a background image upload, they become non-empty strings
const updateResponse = await apiClient.put(`/user/${userId}/background`, {
  image: TEST_AVATAR_IMAGE  // reusing the same test image constant
}, { headers: { Authorization: `Bearer ${token}` } });

expect(updateResponse.status).toBe(200);
expect(updateResponse.data.bgImageId).toBeTruthy();
expect(typeof updateResponse.data.bgImageId).toBe('string');
expect(updateResponse.data.bgImageVersion).toBeTruthy();
```

---

## 7. Testing Image Uploads — Why the TEST_AVATAR_IMAGE Works

When testing image upload functionality, you need a valid base64-encoded image to send in the request body. The course uses a constant called `TEST_AVATAR_IMAGE` for this purpose.

### What it is

```typescript
// A 1x1 pixel white PNG image, base64-encoded, with the data URI prefix
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
```

### Why this specific image

**1. It is a valid image.** Cloudinary's upload endpoint validates that the base64 payload represents a real image. The 1x1 PNG is a legitimate PNG file that passes all of Cloudinary's validation.

**2. It is tiny.** At 68 bytes of actual image data, it uploads in milliseconds. Tests that use larger images slow down significantly on every run.

**3. It is deterministic.** The same base64 string always produces the same 1x1 white pixel. This makes your test data predictable.

**4. It includes the data URI prefix.** The prefix `data:image/png;base64,` tells the Chatty API (and Cloudinary) what format the image data is in. Without this prefix, some upload handlers reject the payload.

**5. It does not need to look good.** From a testing perspective, what matters is whether the upload process works — whether Cloudinary accepts the image and returns `imgId`, `imgVersion`, and the full URL. The visual content of the 1x1 pixel is irrelevant.

### What Cloudinary does with it

Cloudinary receives the base64 data, decodes it, verifies it is a valid image, stores it on their infrastructure, and returns the metadata (`public_id`, `version`, `secure_url`). Your test then asserts on those return values.

### Placing the constant in your project

```typescript
// tests/helpers/testConstants.ts
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
```

```typescript
// In your test file
import { TEST_AVATAR_IMAGE } from '../helpers/testConstants';
```

---

## 8. What to Assert in Tests

When testing image-related fields in Chatty's API responses, the goal is to verify the upload happened and the data was saved correctly — without asserting on exact values that you cannot predict.

### For imgId

```typescript
// Assert it is a non-empty string
expect(typeof response.data.user.imgId).toBe('string');
expect(response.data.user.imgId).toBeTruthy();  // truthy = non-empty string
expect(response.data.user.imgId.length).toBeGreaterThan(0);
```

### For imgVersion

```typescript
// Assert it is a non-empty string representing a number
expect(typeof response.data.user.imgVersion).toBe('string');
expect(response.data.user.imgVersion).toBeTruthy();

// Optionally verify it looks like a timestamp (all digits)
expect(response.data.user.imgVersion).toMatch(/^\d+$/);
```

### For profilePicture

```typescript
// Assert it is a string containing the Cloudinary domain
expect(typeof response.data.user.profilePicture).toBe('string');
expect(response.data.user.profilePicture).toContain('cloudinary.com');

// Assert it starts with https
expect(response.data.user.profilePicture).toMatch(/^https:\/\//);

// Assert it contains the image upload path
expect(response.data.user.profilePicture).toContain('/image/upload/');
```

### For bgImageId and bgImageVersion (after upload)

```typescript
// Same pattern as imgId and imgVersion
expect(typeof response.data.bgImageId).toBe('string');
expect(response.data.bgImageId).toBeTruthy();
expect(response.data.bgImageVersion).toBeTruthy();
```

### Asserting the fields are empty when no image was uploaded

```typescript
// When avatarImage was '' during signup, these should be empty
const signupRes = await apiClient.post('/auth/signup', {
  username: 'vitestNoImg',
  email: `vitest+noimg-${Date.now()}@example.com`,
  password: 'Vitest@123456!',
  avatarColor: 'blue',
  avatarImage: ''  // no image uploaded
});

// profilePicture, imgId, imgVersion will be empty strings when no image is uploaded
// (the exact behavior depends on how the API handles empty avatarImage)
expect(typeof signupRes.data.user.profilePicture).toBe('string');
```

---

## 9. Why You Cannot Assert the Exact Cloudinary URL

You might think that after uploading a known image, you could assert the exact URL in the response. You cannot, and here is why:

### The version is a timestamp

`imgVersion` is a Unix timestamp generated by Cloudinary at the moment of upload. It is different every time you run your tests because it reflects the actual time the upload occurred.

```typescript
// This test would fail every time after the first run
expect(response.data.user.imgVersion).toBe('1718000000');  // WRONG — hard-coded timestamp
// The real imgVersion might be '1718000500' or '1719000000' — it changes every upload
```

### The public_id may be generated dynamically

Chatty may generate part of the `public_id` dynamically (using a user ID, a timestamp, or a random string). You cannot know this value before you make the request.

### The cloud name is environment-specific

A different Cloudinary account might be used in development, staging, and production. Hard-coding a cloud name makes your tests environment-specific.

### The correct approach

Assert the **shape** and **content pattern** of the URL, not its exact value:

```typescript
// WRONG — exact URL assertion
expect(response.data.user.profilePicture).toBe(
  'https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/chatty/avatars/user123'
);

// CORRECT — pattern-based assertion
expect(response.data.user.profilePicture).toMatch(/^https:\/\/res\.cloudinary\.com\//);
expect(response.data.user.profilePicture).toContain('/image/upload/');
expect(response.data.user.imgId).toBeTruthy();
expect(response.data.user.imgVersion).toBeTruthy();
```

---

## 10. Real Code Examples from Lecture 15

### Test: Signup with a profile picture uploads to Cloudinary

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../src/apiClient';

const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Image Upload — Cloudinary integration via signup', () => {
  let authId: string;

  const username = `vitest${Date.now().toString().slice(-6)}`;
  const email = `vitest+img-${Date.now()}@example.com`;
  const password = 'Vitest@123456!';

  afterAll(async () => {
    if (authId) {
      await apiClient.delete(`/test/cleanup/user/${authId}`, {
        headers: { 'x-test-secret': process.env.TEST_SECRET }
      });
    }
  });

  it('returns imgId, imgVersion, and profilePicture after signup with image', async () => {
    const response = await apiClient.post('/auth/signup', {
      username,
      email,
      password,
      avatarColor: 'blue',
      avatarImage: TEST_AVATAR_IMAGE
    });

    expect(response.status).toBe(200);

    authId = response.data.user._id;

    // The image was uploaded to Cloudinary — assert the resulting fields
    const user = response.data.user;

    // profilePicture: full URL to the image on Cloudinary
    expect(typeof user.profilePicture).toBe('string');
    expect(user.profilePicture).toContain('cloudinary.com');
    expect(user.profilePicture).toMatch(/^https:\/\//);

    // imgId: the Cloudinary public_id — a non-empty string
    expect(typeof user.imgId).toBe('string');
    expect(user.imgId).toBeTruthy();

    // imgVersion: the Cloudinary version — a non-empty string of digits
    expect(typeof user.imgVersion).toBe('string');
    expect(user.imgVersion).toBeTruthy();
    expect(user.imgVersion).toMatch(/^\d+$/);

    // Background image fields: empty on a fresh user
    expect(user.bgImageId).toBe('');
    expect(user.bgImageVersion).toBe('');
  });
});
```

### Test: Signup without a profile picture — Cloudinary fields are empty

```typescript
describe('Image Upload — no image provided', () => {
  let authId: string;

  const username = `vitest${Date.now().toString().slice(-6)}`;
  const email = `vitest+noimg-${Date.now()}@example.com`;
  const password = 'Vitest@123456!';

  afterAll(async () => {
    if (authId) {
      await apiClient.delete(`/test/cleanup/user/${authId}`, {
        headers: { 'x-test-secret': process.env.TEST_SECRET }
      });
    }
  });

  it('profilePicture is empty and imgId/imgVersion are empty when no image is uploaded', async () => {
    const response = await apiClient.post('/auth/signup', {
      username,
      email,
      password,
      avatarColor: 'green',
      avatarImage: ''  // deliberately empty
    });

    expect(response.status).toBe(200);
    authId = response.data.user._id;

    const user = response.data.user;

    // When no image is uploaded, Cloudinary is not called
    // These fields reflect an absence of image data
    expect(user.profilePicture).toBe('');
    expect(user.imgId).toBe('');
    expect(user.imgVersion).toBe('');
  });
});
```

### Test: Updating a profile picture

```typescript
describe('Image Upload — profile picture update', () => {
  let token: string;
  let authId: string;
  let userId: string;

  beforeAll(async () => {
    const username = `vitest${Date.now().toString().slice(-6)}`;
    const email = `vitest+update-${Date.now()}@example.com`;
    const password = 'Vitest@123456!';

    const signupRes = await apiClient.post('/auth/signup', {
      username,
      email,
      password,
      avatarColor: 'red',
      avatarImage: ''
    });
    expect(signupRes.status).toBe(200);
    authId = signupRes.data.user._id;
    userId = signupRes.data.user._id;

    const signinRes = await apiClient.post('/auth/signin', { username, password });
    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;
  });

  afterAll(async () => {
    if (authId) {
      await apiClient.delete(`/test/cleanup/user/${authId}`, {
        headers: { 'x-test-secret': process.env.TEST_SECRET }
      });
    }
  });

  it('updates profilePicture and returns new imgId and imgVersion', async () => {
    const response = await apiClient.put(
      `/user/${userId}/profile-picture`,
      { image: TEST_AVATAR_IMAGE },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status).toBe(200);

    // After the update, the Cloudinary fields should be populated
    expect(response.data.user.profilePicture).toContain('cloudinary.com');
    expect(response.data.user.imgId).toBeTruthy();
    expect(response.data.user.imgVersion).toBeTruthy();

    // The imgVersion is a timestamp string — it will be different from any hard-coded value
    const version = parseInt(response.data.user.imgVersion, 10);
    expect(isNaN(version)).toBe(false);
    expect(version).toBeGreaterThan(0);
  });
});
```

---

## 11. Common Mistakes

### Mistake 1: Asserting the exact Cloudinary URL

```typescript
// WRONG — this will fail on every test run
expect(response.data.user.profilePicture).toBe(
  'https://res.cloudinary.com/dmqfhagzn/image/upload/v1718000000/chatty/user.jpg'
);

// CORRECT
expect(response.data.user.profilePicture).toContain('cloudinary.com');
```

### Mistake 2: Sending a raw file path instead of base64

```typescript
// WRONG — file paths are not valid base64 images
const response = await apiClient.post('/auth/signup', {
  username: 'vitestUser',
  email: 'test@example.com',
  password: 'Vitest@123456!',
  avatarColor: 'blue',
  avatarImage: './myimage.png'  // A file path, not base64
});
// The API will either reject this or try to upload the string "./myimage.png" to Cloudinary — wrong

// CORRECT — use the TEST_AVATAR_IMAGE constant (base64 string)
avatarImage: TEST_AVATAR_IMAGE
```

### Mistake 3: Forgetting the data URI prefix

```typescript
// WRONG — missing the data URI prefix
const imageWithoutPrefix = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA...';

// CORRECT — includes the MIME type and encoding declaration
const imageWithPrefix = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA...';
```

### Mistake 4: Asserting imgVersion is a number (it is a string)

```typescript
// WRONG — imgVersion is stored and returned as a string, not a number
expect(typeof response.data.user.imgVersion).toBe('number');

// CORRECT
expect(typeof response.data.user.imgVersion).toBe('string');
expect(response.data.user.imgVersion).toMatch(/^\d+$/);
```

### Mistake 5: Expecting profilePicture to be populated when avatarImage was ''

```typescript
// WRONG — if you sent avatarImage: '', no image was uploaded
expect(response.data.user.profilePicture).toContain('cloudinary.com');  // will fail

// CORRECT — check the empty case
expect(response.data.user.profilePicture).toBe('');
```

### Mistake 6: Slow tests from large base64 images

```typescript
// WRONG — using a large real image makes every test that includes image upload slow
const LARGE_IMAGE = fs.readFileSync('./real-photo-200kb.png').toString('base64');

// CORRECT — use the tiny 1x1 pixel image for upload testing
// Real visual quality does not matter; upload mechanics do
const TEST_AVATAR_IMAGE = 'data:image/png;base64,iVBORw0KGgo...'; // 1x1 pixel
```

---

## 12. Quick Reference

| Field | Type | Description | Asserted as |
|-------|------|-------------|-------------|
| `profilePicture` | string | Full Cloudinary URL | `toContain('cloudinary.com')` |
| `imgId` | string | Cloudinary public_id | `toBeTruthy()` |
| `imgVersion` | string | Cloudinary upload timestamp | `toMatch(/^\d+$/)` |
| `bgImageId` | string | Background image public_id | `toBeTruthy()` (after upload) |
| `bgImageVersion` | string | Background image timestamp | `toMatch(/^\d+$/)` (after upload) |

| Scenario | Expected state |
|----------|---------------|
| Signup with `avatarImage: ''` | `profilePicture`, `imgId`, `imgVersion` are `''` |
| Signup with `TEST_AVATAR_IMAGE` | All three are non-empty strings |
| No background image set | `bgImageId` and `bgImageVersion` are `''` |
| Background image uploaded | Both `bgImageId` and `bgImageVersion` are non-empty strings |

---

## Related Topics

- [Base64](base64.md) — How images are encoded as base64 strings for transmission
- [HTTP Requests](http-requests.md) — Sending POST and PUT requests with large base64 bodies
- [MongoDB](mongodb.md) — How imgId and imgVersion are stored in the user document
- [Positive Testing](positive-testing.md) — Asserting on image fields in success responses
- [State Verification](state-verification.md) — Verifying that image data persists after upload

## Official Documentation

- [Cloudinary — Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Cloudinary — Upload API reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary — URL transformation](https://cloudinary.com/documentation/image_transformations)
