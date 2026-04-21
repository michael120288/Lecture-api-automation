# Before Lecture 07 — Comments — Full CRUD + Nested Queries

**Total prep time: ~10 min**

---

## Essential

- [ ] **Nested resources in REST**
  Read: [Moesif — REST API nested resources](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/)
  *~7 min · Comments belong to posts — URL includes both postId AND commentId*
  `DELETE /post/comment/:postId/:commentId` — you need both IDs to identify one comment.

- [ ] **HTTP 200 vs 201**
  Read: [MDN — 201 Created](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201)
  *~3 min · `POST /post` → 201 (new top-level resource). `POST /post/comment` → 200 (action on existing resource).*

---

## Videos

- [ ] **REST API design — nested resources**
  Watch: Search YouTube → *"REST API nested resources best practices"*
  *~8 min · Parent-child resource relationships in URL design*

---

## Interactive tools

- [ ] **REST API design visualizer**
  Try: [swagger.io/specification/](https://swagger.io/specification/)
  *~5 min · See how nested resources are documented in OpenAPI*

---

## Also useful

- [MDN — HTTP PATCH](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PATCH) — partial update (used for updating comment text)
- [JSONPlaceholder — /comments](https://jsonplaceholder.typicode.com/comments) — see a real comments API response

---

> **Key quirk:** `GET /post/single/comment/:postId/:commentId` returns:
> `{ comments: singleDoc }` — the key is plural but the value is a single object.
> Access as `res.data.comments.comment` (not `comments[0].comment`).
