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
  Watch: https://www.youtube.com/watch?v=-56x56UppqQ
  *~30 min · Collections, documents, BSON, ObjectId — all the basics*

- [ ] **bcrypt explained** — how one-way hashing works
  Watch: https://www.youtube.com/watch?v=O6cmuiTBZVs
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

> **Note:** The `DATABASE_URL` connection string is provided in the lecture README — you don't need it before starting.

---

## `DATABASE_URL` Setup — 3 Files to Update

When the lecture asks you to add `DATABASE_URL`, you must add it to **three places**:

### 1. `.env` — store the actual value

```
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/chattyapp-backend
```

*(Get this from MongoDB Atlas → your cluster → Connect → Drivers)*

### 2. `vitest.config.ts` — forward it into the test sandbox

Vitest runs each test file in an isolated worker. Env vars are not automatically available — you must list them explicitly in the `env` block:

```ts
env: {
  BASE_URL: ...,
  TEST_USERNAME: ...,
  TEST_PASSWORD: ...,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
},
```

### 3. `src/config.ts` — read, validate, and export it

```ts
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');
export const config = { BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL } as const;
```

This gives a clear error if the var is missing, instead of a confusing MongoClient error deep in test output.
