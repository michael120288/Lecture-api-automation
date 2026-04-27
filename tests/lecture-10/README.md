# Lecture 10 — MongoDB: Cross-Validating API vs Database

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 9 — followers, two-user scenarios, notifications.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-10/lecture.test.ts
> npm test tests/lecture-10/homework/starter.test.ts
> ```

---

## What You Will Learn

- How to connect to MongoDB Atlas with `MongoClient` in a test file
- `findOne()` — query a collection by field value
- Cross-validating: call the API, then query the DB, assert they match
- Why the API response and the DB document may differ (hashed password, cached data)
- `beforeAll` connection setup and `afterAll` connection teardown
- `DATABASE_URL` — reading connection string from `.env`
- Read-only MongoDB access in tests — only `find*` operations, never `insert/update/delete`
- Advanced assertion variants — `toMatch(/regex/)` for MongoDB ObjectId format, `toStrictEqual` for strict deep equality, `toBeTypeOf` for DB field types

> **Reference Topics**
> - MongoDB Atlas setup and findOne() → [`docs/topics/mongodb.md`](../../docs/topics/mongodb.md)
> - How bcrypt password hashing works → [`docs/topics/bcrypt.md`](../../docs/topics/bcrypt.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Why Direct DB Access? |
| 2 | Setup — Install MongoDB Driver |
| 3 | `DATABASE_URL` in `.env` |
| 4 | Connection Pattern |
| 5 | Cross-Validation Pattern |
| 6 | What to Assert |
| 7 | Postman Note |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Why Direct DB Access?

API tests verify **what the server returns**. But what if the server has a bug where
it returns correct data from Redis cache but stores wrong data in MongoDB?

Direct DB access catches this by comparing both:
```
API response.user.email === DB auth.email   ✅ both match
API response.user.username === DB auth.username ✅ both match
```

This is the difference between **black-box testing** (API only) and **grey-box testing**
(API + DB layer verification).

---

## 2. Setup

```bash
npm install mongodb
```

`mongodb` is already installed as a runtime dependency.

---

## 3. `DATABASE_URL` in `.env`

Add your MongoDB Atlas connection string:

```
DATABASE_URL=get it from .env
```

node -e "require('dotenv').config(); const {MongoClient}=require('mongodb'); new
  MongoClient(process.env.DATABASE_URL).connect().then(c=>{console.log('Connected');c.close()}).catch(e=>console.error(e))"

**IP Whitelisting — the most common stumbling block:**

MongoDB Atlas only allows connections from whitelisted IP addresses.
If you get a connection timeout error (`MongoServerSelectionError`), your IP is not whitelisted.

Fix: in Atlas → **Network Access** → **Add IP Address** → either:
- Add your current IP (click "Add Current IP Address")
- Or add `0.0.0.0/0` to allow all IPs (less secure, but fine for development)

For GitHub Actions, the runner IPs change every build — you must either use `0.0.0.0/0`
or use the [GitHub Actions IP range action](https://github.com/marketplace/actions/whitelist-github-actions-runner-ip-on-mongodb-atlas).

Also add to `vitest.config.ts`:
```ts
env: {
  BASE_URL: ...,
  TEST_USERNAME: ...,
  TEST_PASSWORD: ...,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
},
```

**Why is `DATABASE_URL` in both `.env` AND `vitest.config.ts`?**

`.env` stores the actual value. `vitest.config.ts` explicitly forwards it into the test sandbox.

Vitest runs each test file in an isolated worker process. Not all `process.env` variables are automatically available inside tests — only the ones listed in the `env` block of `vitest.config.ts` are guaranteed to pass through. Without this forwarding, `process.env.DATABASE_URL` inside a test file returns `undefined` even when `.env` is loaded.

Rule of thumb: every env var your tests read must appear in both places:
- **`.env`** — the actual secret value (never committed)
- **`vitest.config.ts` `env` block** — just the key name, forwarded at `''` as fallback

And to `src/config.ts`:
```ts
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');
export const config = { BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL } as const;
```

**Why add `DATABASE_URL` to `src/config.ts`?**

`src/config.ts` is the single entry point for all environment configuration. Any env var a test needs should be read and validated here, not scattered across test files.

The pattern has three parts:

1. **Read** — `const DATABASE_URL = process.env.DATABASE_URL` reads the value (may be `undefined`)
2. **Guard** — `if (!DATABASE_URL) throw new Error(...)` fails fast with a clear message if the var is missing, instead of letting tests fail with a confusing `MongoClient: invalid connection string` error deep inside the code
3. **Export** — adding it to the `config` object makes it importable from any test: `import { config } from '../../src/config'`

**`as const`** tells TypeScript to infer the narrowest possible types for all values in the object. Without it, `config.BASE_URL` would be typed as `string`. With it, TypeScript knows the exact shape — useful for catching typos at compile time.

---

## 4. Connection Pattern

```ts
import { MongoClient } from 'mongodb';

let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

beforeAll(async () => {
  client = new MongoClient(config.DATABASE_URL);
  await client.connect();
  db = client.db(); // uses database from connection string
});

afterAll(async () => {
  await client.close();
});
```

**Source:** [MongoDB Node.js Driver — MongoClient](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/)

The `new MongoClient(url)` → `client.connect()` → `client.db()` pattern is from the official MongoDB Node.js driver docs.

**`client.db()`** — uses the database name from the connection string URL.
The Chatty connection string ends with `/chattyapp-backend`.

**`ReturnType<MongoClient['db']>`** — this TypeScript type means:
"whatever type the `db()` method of `MongoClient` returns."
It is a way to let TypeScript figure out the type automatically without you having to import
the specific return type name. `ReturnType<T>` extracts the return type of any function type `T`.

---

## 5. Cross-Validation Pattern

```ts
// 1. Call API — sign up, get API response
const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
  username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
  email: faker.internet.email().toLowerCase(),
  password: TEST_PASSWORD,
  avatarColor: TEST_AVATAR_COLOR,
  avatarImage: TEST_AVATAR_IMAGE,
}, { validateStatus: () => true });

const apiUser = signupRes.data.user;

// 2. Query DB directly
const authCollection = db.collection('Auth');
const dbDoc = await authCollection.findOne({ email: apiUser.email });

// 3. Compare
expect(dbDoc?.username).toBe(apiUser.username);
expect(dbDoc?.email).toBe(apiUser.email);
expect(dbDoc?.uId).toBe(apiUser.uId);

// 4. Clean up
await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiUser.authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
});
```

---

## 6. What to Assert (and What NOT to)

**Assert:**
- `dbDoc.username` matches `apiUser.username`
- `dbDoc.email` matches `apiUser.email`
- `dbDoc.uId` matches `apiUser.uId`
- `dbDoc._id.toString()` matches `apiUser.authId`

**Do NOT assert:**
- `dbDoc.password` — this is hashed in DB, never in API response
- Real-time counts (postsCount, followersCount) — may lag between queue and DB

**What is bcrypt?**
bcrypt is a password hashing algorithm. It converts a plain-text password like `"Vitest@123456"`
into a long hash like `"$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"`.
The `$2b$` prefix identifies it as bcrypt. The `10` is the cost factor (how many rounds of hashing).
You cannot reverse a bcrypt hash — you can only verify by hashing again and comparing.
This is why the DB stores the hash (safe) and the API never returns it (correct).

**Why `new ObjectId(apiUserId)` instead of just `apiUserId`?**
MongoDB stores `_id` values as `ObjectId` objects, not plain strings.
`findOne({ _id: "507f1f77..." })` would fail because the string type does not match the ObjectId type.
`findOne({ _id: new ObjectId("507f1f77...") })` works because both sides are the same type.
Always wrap string IDs in `new ObjectId()` when querying `_id` fields in MongoDB.

**Read-only rule:**
Never use `insertOne`, `updateOne`, or `deleteOne` directly in tests.
Use the API for mutations — that's what you're testing.
The cleanup endpoint handles deletion.

---

## 7. Postman Note

There is no Postman section for this lecture — MongoDB queries are code-only.
Postman cannot connect to a database directly.

Instead, the Postman homework for this lecture focuses on **comparing** what two
different API endpoints return for the same user (e.g. signup response vs currentuser response).

---

## 8. Running the Tests

First add `DATABASE_URL` to your `.env`, then:

```bash
npm test tests/lecture-10/lecture.test.ts
```

---

## Key Takeaways

- ✅ `MongoClient` connects to Atlas — same connection string as the server
- ✅ `db.collection('Auth')` — collection names are `Auth` and `User` (capital first letter)
- ✅ Cross-validation proves API response == DB state
- ✅ **Read-only** in tests — never write to prod DB directly

**What's next:** Lecture 11 — GitHub Actions CI/CD pipeline. Running these tests automatically on every push.

---

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-10/ src/config.ts vitest.config.ts
git status                          # verify what will be committed

# Commit
git commit -m "lecture-10: MongoDB cross-validation — MongoClient, findOne, read-only"

# Push the branch to GitHub
git push -u origin lecture-10-mongodb
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-10: MongoDB cross-validation — MongoClient, findOne, read-only`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout main
git pull origin main               # get the merged changes
git checkout -b lecture-11-cicd
```


## Homework

Open `tests/lecture-10/homework/starter.test.ts` — **7 Vitest TODOs**.

| TODO | What it practices |
|------|------------------|
| 1 | Connect to MongoDB, assert connection succeeds |
| 2 | Sign up via API, find user in Auth collection, compare email |
| 3 | Cross-validate username between API and DB |
| 4 | Verify password is NOT in API response but IS in DB (hashed) |
| 5 | `.then()` — find user in User collection by authId |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` — assert MongoDB ObjectId format with regex |
| 7 | `toStrictEqual` — compare API response value with value read directly from MongoDB |

```bash
npm test tests/lecture-10/homework/starter.test.ts
```

Goal: **7 tests passing.**
