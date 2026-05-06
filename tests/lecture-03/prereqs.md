# Before Lecture 03 — SignUp — Creating & Cleaning Up Test Users

**Total prep time: ~20 min**

---

## Essential

- [ ] **Base64 encoding**
  Read: [MDN — Base64](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
  *~5 min · The `avatarImage` field is a base64 data URL: `data:image/png;base64,...`*

- [ ] **What is Cloudinary?**
  Skim: [cloudinary.com/documentation/how_cloudinary_works](https://cloudinary.com/documentation/how_cloudinary_works)
  *~5 min · Upload image → Cloudinary stores it → returns a public URL*
  This makes signup ~2-5 seconds slower than signin.

- [ ] **Password hashing — bcrypt (concept)**
  Read: [Auth0 — Hashing passwords](https://auth0.com/blog/hashing-passwords-one-way-road-to-security/)
  *~8 min · Why the DB stores `$2b$10$...` instead of `TestUser!234`*

---

## Videos

- [ ] **Faker.js in action** — quick intro to the library
  Watch: https://www.youtube.com/watch?v=SeHT0ee4waU
  *~10 min · See `faker.internet.email()`, `faker.string.alphanumeric()` in action*

- [ ] **How Cloudinary works** — official overview
  Watch: [cloudinary.com/blog/cloudinary-developer-experience](https://cloudinary.com/blog/cloudinary-developer-experience)
  *~5 min read · Why base64 → Cloudinary → CDN URL is the flow*

---

## Interactive tools

- [ ] **Base64 encoder/decoder**
  Try: [base64decode.org](https://www.base64decode.org)
  *~3 min · Paste `iVBORw0KGgo...` to see it's actually a PNG image*

- [ ] **Faker.js live playground**
  Try: [fakerjs.dev](https://fakerjs.dev)
  *~5 min · Click "Try It" to see what `faker.internet.email()` returns*

- [ ] **bcrypt hash calculator**
  Try: Search → *"bcrypt hash generator online"*
  *~3 min · Hash `TestUser!234` and see the `$2b$10$...` format the DB stores*

---

## Also useful

- [Faker.js documentation](https://fakerjs.dev/api/) — all available generators
- [MDN — Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) — the `data:image/png;base64,...` format explained
- [npm — @faker-js/faker](https://www.npmjs.com/package/@faker-js/faker) — installation and changelog

---

> **From Lecture 2:** Signin tests passing. `TEST_USERNAME` and `TEST_PASSWORD` set in `.env`.
