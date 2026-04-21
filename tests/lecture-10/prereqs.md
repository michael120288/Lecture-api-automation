# Before Lecture 10 — MongoDB — Cross-Validating API vs Database

**Total prep time: ~20 min**

---

## Essential

- [ ] **MongoDB Atlas setup**
  Read: [MongoDB Atlas — Getting started](https://www.mongodb.com/docs/atlas/getting-started/)
  *~5 min · Cloud MongoDB — you need your connection string (`DATABASE_URL`)*
  Also: whitelist your IP in Atlas → Network Access → Add IP Address.

- [ ] **bcrypt — password hashing algorithm**
  Read: [Auth0 — Hashing passwords](https://auth0.com/blog/hashing-passwords-one-way-road-to-security/)
  *~10 min · Why `$2b$10$...` is stored in DB. Why it can never be reversed.*
  You will assert `dbDoc.password.startsWith('$2')` in the tests.

- [ ] **Black-box vs grey-box testing**
  Read: [ISTQB Glossary — test types](https://glossary.istqb.org/en_US/term/black-box-testing-1-0)
  *~5 min · Black-box = API only. Grey-box = API + internal layer (DB).*

---

## Videos

- [ ] **MongoDB crash course** — Traversy Media
  Watch: Search YouTube → *"MongoDB crash course Traversy Media"*
  *~30 min · Collections, documents, BSON, ObjectId — all the basics*

- [ ] **bcrypt explained** — how one-way hashing works
  Watch: Search YouTube → *"bcrypt password hashing explained"*
  *~10 min · Why you hash, how salting prevents rainbow tables*

---

## Interactive tools

- [ ] **MongoDB Atlas** — create a free cluster (required for this lecture)
  Sign up: [cloud.mongodb.com](https://cloud.mongodb.com)
  *~10 min · Free tier (M0) is sufficient. Get the connection string from Atlas.*

- [ ] **MongoDB Compass** — desktop GUI for browsing your database
  Download: [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
  *~5 min · Browse the `Auth` and `User` collections visually*

- [ ] **bcrypt hash generator** — see the `$2b$` format
  Try: Search → *"bcrypt hash generator online"*
  *~2 min · Hash `TestUser!234` and see the DB format*

---

## Also useful

- [MongoDB Node.js driver docs](https://mongodb.github.io/node-mongodb-native/) — the `MongoClient` you'll use in tests
- [MongoDB Atlas IP whitelist guide](https://www.mongodb.com/docs/atlas/security/ip-access-list/) — required for connection

---

> **Required setup:** `DATABASE_URL` in `.env` + IP whitelisted in Atlas.
> Verify: `node -e "new require('mongodb').MongoClient(process.env.DATABASE_URL)"`
