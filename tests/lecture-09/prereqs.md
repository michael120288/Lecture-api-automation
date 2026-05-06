# Before Lecture 09 — Followers, Blocking & Notifications

**Total prep time: ~10 min**

---

## Essential

- [ ] **Many-to-many relationships**
  Read: [MDN — Many-to-many models](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Django/Models#many-to-many_relationships)
  *~5 min · User A follows B who follows C — stored as pairs, not a flat list*

- [ ] **Why you can't follow yourself**
  Think: 1 minute — the server filters this out. You need a second user.
  This lecture creates user B with Faker.js in `beforeAll` and deletes them in `afterAll`.

---

## Videos

- [ ] **Social network data modeling** — how follower/following works
  Watch: https://www.youtube.com/watch?v=F7d8ljTNtt8
  *~10 min · See how Twitter/Instagram store follow relationships*

---

## Interactive tools

- [ ] **Database relationship visualizer** — ERD for social apps
  Try: [drawsql.app/templates](https://drawsql.app/templates) → search "social network"
  *~5 min · See how followers/following tables are structured*

---

## Also useful

- [Redis — Sets data structure](https://redis.io/docs/data-types/sets/) — how Chatty stores follower/following lists in Redis
- [MongoDB — many-to-many with references](https://www.mongodb.com/docs/manual/tutorial/model-referenced-one-to-many-relationships-between-documents/) — the DB storage pattern

---

> **Key thing:** `PUT /user/unfollow` needs TWO IDs in the URL:
> `:followeeId` = who you're unfollowing · `:followerId` = YOUR OWN User `_id`
> Get your own `_id` from `GET /currentuser → user._id`.
