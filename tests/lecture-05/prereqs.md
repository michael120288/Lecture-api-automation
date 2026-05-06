# Before Lecture 05 — Posts — Full CRUD Flow

**Total prep time: ~15 min**

---

## Essential

- [ ] **MongoDB ObjectId**
  Read: [MongoDB — ObjectId](https://www.mongodb.com/docs/manual/reference/method/ObjectId/)
  *~5 min · Every `:postId` URL param must be a 24-character hex string*
  Invalid format → 400 from the `validateObjectId` middleware.

- [ ] **CRUD**
  Read: [MDN — CRUD](https://developer.mozilla.org/en-US/docs/Glossary/CRUD)
  *~2 min · Create → Read → Update → Delete — the full cycle this lecture covers.*

- [ ] **API pagination**
  Read: [Nordic APIs — Everything about pagination](https://nordicapis.com/everything-you-need-to-know-about-api-pagination/)
  *~5 min · Page 1 = posts 1-10, page 2 = 11-20. Chatty uses page size 10.*

---

## Videos

- [ ] **REST API CRUD with Node.js** — overview
  Watch: https://www.youtube.com/watch?v=l8WPWK9mS5M
  *~10 min · See POST/GET/PATCH/DELETE in action before writing your own tests*

---

## Interactive tools

- [ ] **JSONPlaceholder** — free fake REST API (similar structure to Chatty posts)
  Try: [jsonplaceholder.typicode.com/posts](https://jsonplaceholder.typicode.com/posts)
  *~5 min · Call `/posts`, `/posts/1`, `/posts?_page=1` to see pagination in action*

- [ ] **ObjectId decoder** — see what a MongoDB ObjectId encodes
  Try: Search → *"MongoDB ObjectId decoder online"*
  *~2 min · The first 4 bytes = timestamp, next 5 = machine ID — completely unique*

---

## Also useful

- [MDN — HTTP DELETE](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE) — 200 vs 204 after deletion
- [REST API naming conventions](https://restfulapi.net/resource-naming/) — why `/post` not `/createPost`

---

> **Key thing:** `POST /post` returns no ID in the response.
> Find the ID by calling GET and searching by the unique text you posted.
