# Before Lecture 16 — User Profile Pages & Image Management

**Total prep time: ~10 min**

---

## Essential

- [ ] **REST resource nesting**
  Read: [Moesif — REST nested resources](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/)
  *~7 min · Profile pages bundle multiple sub-resources in one response for efficiency*
  `GET /user/profile/posts/:username/:userId/:uId` returns user + posts + totalPosts.

- [ ] **CDN (Content Delivery Network)**
  Read: [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
  *~3 min · Profile pictures are served from Cloudinary's CDN — cached globally*

---

## Videos

- [ ] **REST API best practices — resource design**
  Watch: Search YouTube → *"REST API design best practices 2024"*
  *~15 min · Resource naming, nesting, versioning — how professional APIs are structured*

---

## Interactive tools

- [ ] **Chatty API reference** — browse all profile endpoints
  Read: [docs/api-reference.md](../../../docs/api-reference.md)
  *~5 min · See all `/user/profile/*` and `/images/*` endpoints in one place*

---

## Also useful

- [MDN — HTTP GET](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET) — GET requests have no body, params in URL only
- [Redis — sorted sets](https://redis.io/docs/data-types/sorted-sets/) — how Chatty ranks and caches user suggestions

---

> **Key thing:** `GET /user/profile/posts/:username/:userId/:uId` needs all three params.
> `uId` is a 12-digit numeric string — NOT the same as `_id` (MongoDB ObjectId).
> Redis uses `uId`, MongoDB uses `_id` — the endpoint needs both paths.
