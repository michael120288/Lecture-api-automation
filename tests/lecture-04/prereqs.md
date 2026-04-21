# Before Lecture 04 — Current User, Profile Update & Signout

**Total prep time: ~15 min**

---

## Essential

- [ ] **What is Redis?**
  Read: [redis.io — Introduction to Redis](https://redis.io/docs/about/)
  *~7 min · Chatty updates Redis first, queues a DB write second*
  This is why `GET /currentuser` always returns fresh data — it reads Redis, not MongoDB.

- [ ] **PUT vs PATCH**
  Read: [MDN — PATCH method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PATCH)
  *~3 min · PATCH = partial update. PUT = full replacement.*
  Chatty accepts both on profile endpoints.

---

## Videos

- [ ] **Redis in 100 seconds** — Fireship
  Watch: Search YouTube → *"Redis in 100 seconds Fireship"*
  *~2 min · Key-value cache, why it's 10-100× faster than a database for reads*

- [ ] **PUT vs PATCH explained**
  Watch: Search YouTube → *"PUT vs PATCH REST API difference"*
  *~5 min · Real-world examples of when to use each*

---

## Interactive tools

- [ ] **Redis playground** — run Redis commands in the browser
  Try: [try.redis.io](https://try.redis.io)
  *~5 min · Run `SET mykey "hello"` then `GET mykey` — see how Chatty caches profile data*

---

## Also useful

- [MDN — HTTP methods compared](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) — all methods in one page
- [Redis University](https://university.redis.io) — free Redis courses
- [Bull queue docs](https://github.com/OptimalBits/bull) — the async job queue Chatty uses for DB writes

---

> **Concept to grasp before starting:**
> A 200 response from PUT means the server accepted the request.
> It does NOT prove the data was saved. You must call GET to verify.
> "PUT → GET → assert" is the core pattern of Lecture 4.
