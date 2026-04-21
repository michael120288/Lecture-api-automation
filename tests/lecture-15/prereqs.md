# Before Lecture 15 — Posts with Media — Images & Videos

**Total prep time: ~15 min**

---

## Essential

- [ ] **Data URLs (base64 images in strings)**
  Read: [MDN — Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
  *~7 min · Format: `data:image/png;base64,iVBOR...` — the entire image as a string*
  This is what the `image` field in `POST /post/image/post` expects.

- [ ] **How Cloudinary works**
  Read: [Cloudinary — How it works](https://cloudinary.com/documentation/how_cloudinary_works)
  *~5 min · Upload → transform → CDN URL. Chatty stores `imgId` and `imgVersion`.*
  Image requests are 2-5s slower than plain post requests because of this.

---

## Videos

- [ ] **Image upload to Cloudinary** — Node.js tutorial
  Watch: Search YouTube → *"Cloudinary image upload Node.js tutorial"*
  *~15 min · See the exact upload flow that happens in `POST /post/image/post`*

- [ ] **Base64 encoding explained** — visual
  Watch: Search YouTube → *"base64 encoding explained"*
  *~10 min · How binary data (images) becomes a safe ASCII string*

---

## Interactive tools

- [ ] **Base64 image encoder** — convert any image to a data URL
  Try: Search → *"image to base64 converter online"*
  *~3 min · Upload a PNG, get the `data:image/png;base64,...` string*

- [ ] **Cloudinary free tier** — create an account to see real uploads
  Sign up: [cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
  *~5 min · Upload `TEST_AVATAR_IMAGE` and see the resulting `imgId` and `imgVersion`*

---

## Also useful

- [MDN — MIME types — image](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#image_types) — `image/png`, `image/jpeg`, `image/webp`
- [Cloudinary transformation docs](https://cloudinary.com/documentation/image_transformations) — what happens after upload
- [src/fixtures.ts](../../../src/fixtures.ts) — the `TEST_AVATAR_IMAGE` 1×1 PNG used in tests

---

> **Key thing:** Image posts are significantly slower than plain posts (~2-5s vs ~100ms).
> Both `imgId` (Cloudinary public ID) and `imgVersion` are stored in the post document.
> `GET /post/images/:page` only returns posts where `imgId` is non-empty.
