---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 1.6rem; }
  code { font-size: 0.9rem; }
  h2 { color: #1a1a2e; }
  blockquote { color: #c0392b; border-left: 4px solid #c0392b; }
---

# Lecture 10
## MongoDB: Cross-Validating API vs Database

The API is an abstraction. The database is the ground truth.

---

## Black-Box vs Grey-Box

**Black-box:** trust the API response

**Grey-box:** verify the API AND the database agree

> Cross-validation proves data actually reached MongoDB

<!-- note: a cache bug is the classic example. The API returns the old value from Redis. The DB has the new value. Only grey-box testing catches this class of bug. -->

---

## Why Cross-Validation Matters

```
Scenario: server returns stale cached data

API returns  → username: "alice"   (from Redis)
DB stores    → username: "alice2"  (the real value)
```

Black-box test passes. Bug ships to production.

<!-- note: this is not theoretical. Cache invalidation bugs are one of the most common causes of data inconsistency in production systems. -->

---

## Cross-Validation Flow

| Step | Where | What |
|------|-------|------|
| 1 | API | `POST /signup` → capture `authId` |
| 2 | MongoDB | `findOne({ authId })` → document |
| 3 | Assert | `username` matches (case-insensitive) |
| 4 | Assert | `password` starts with `$2b$`, length 60 |
| afterAll | Both | delete user, close connection |

<!-- note: walk through each arrow. The API call creates the data. The direct DB query verifies it was stored correctly. The assertions confirm both layers agree. -->

---

## Setup — 3 Files

**Install:**
```bash
npm install mongodb
```

**Import:**
```ts
import { MongoClient, ObjectId } from 'mongodb';
```

<!-- note: ObjectId is needed whenever you query by _id. Import it from the start even if the first test doesn't use it. -->

---

## Setup — `DATABASE_URL` in 3 Places

**`.env`** — the actual connection string:
```
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/chattyapp-backend
```

**`vitest.config.ts`** — forward it into the test sandbox:
```ts
env: {
  BASE_URL: ...,
  TEST_USERNAME: ...,
  TEST_PASSWORD: ...,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
},
```

**`src/config.ts`** — read, guard, export:
```ts
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');
export const config = { BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL } as const;
```

> All three are required — missing any one causes silent failures or confusing errors

<!-- note: .env holds the value. vitest.config.ts forwards it into the isolated worker process. src/config.ts validates it at startup and exports it for all tests. -->

---

## Read-Only Rule

> Tests run against the **production database** — never write to it directly

- Use `find*` only — no `insertOne`, `updateOne`, `deleteOne`
- All mutations go through the API (that's what you're testing)
- Cleanup goes through the API cleanup endpoint

<!-- note: there is no separate test database. The tests connect to the same MongoDB Atlas cluster the server uses. A direct insertOne or deleteOne would corrupt real data. Always mutate through the API. -->

---

## Connection Pattern

```ts
let client: MongoClient;

beforeAll(async () => {
  client = new MongoClient(config.DATABASE_URL);
  await client.connect();
  db = client.db();
});
afterAll(async () => {
  await client.close(); // prevents hanging test process
});
```

> Always close in afterAll — Vitest hangs otherwise

<!-- note: an unclosed MongoClient keeps the event loop alive. Vitest will hang after tests complete and never exit. This is the most common async cleanup mistake. -->

---

## The Read-Only Rule

- Tests query the DB — never write to it
- All mutations go through the API
- Direct writes break isolation

<!-- note: if a test writes directly to the DB, it bypasses all application logic — validation, hashing, events. The test is then testing the DB driver, not the application. -->

---

## What to Assert

```ts
// These should match:
expect(dbDoc?.username).toBe(apiUser.username);
expect(dbDoc?.email).toBe(apiUser.email);
expect(dbDoc?._id.toString()).toBe(apiUser.authId);

// Never compare these:
// dbDoc.password === TEST_PASSWORD  -- it's hashed!
```

<!-- note: the password comparison is the most common mistake. The DB always stores a bcrypt hash. Comparing it to the plain text will always fail. -->

---

## Why Passwords Look Different

```
Plain text:  "TestUser!234"
DB stores:   "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
```

- `$2b$10$` = bcrypt, 10 rounds
- Cannot reverse — only verify by re-hashing

```ts
expect(apiUser).not.toHaveProperty('password');
expect(dbDoc?.password).toMatch(/^\$2b\$/);
```

<!-- note: bcrypt is intentionally irreversible. The test proves the API never leaks the hash, and the DB stores it correctly. Both assertions are meaningful. -->

---

## ObjectId vs String

```ts
// FAILS — type mismatch
await coll.findOne({ _id: "507f1f77bcf86cd799439011" })

// WORKS — correct type
import { ObjectId } from 'mongodb';
await coll.findOne({ _id: new ObjectId(authId) })
```

- `email`, `username` — plain string works
- `_id` — must wrap in `new ObjectId()`

<!-- note: MongoDB stores _id as a BSON ObjectId, not a string. The driver doesn't auto-convert. For email and username the field type is already a string so no conversion needed. -->

---

## Collection Names

- `Auth` — authentication document
- `User` — public profile document

> Capital first letter — case sensitive

<!-- note: Auth and User are two separate collections. The Auth collection holds credentials. The User collection holds the public profile. Both are created on signup. -->

---

## Common Mistakes

- IP not whitelisted in MongoDB Atlas — `MongoServerSelectionError`
- `_id` queried as plain string — `findOne` returns null
- Asserting `dbDoc.password === TEST_PASSWORD` — always fails
- `client.close()` missing — Vitest hangs

<!-- note: the IP whitelist issue is the number one setup problem. Walk students through Atlas → Network Access → Add Current IP. For CI use 0.0.0.0/0. -->

---

## Key Takeaways

- Cross-validation: API call + DB query + compare
- Database is ground truth — API can lie
- Passwords: hashed in DB, absent from API response
- Always close the MongoDB client in afterAll

<!-- note: the mental model to leave students with: the API is an abstraction layer. Testing only the abstraction is not enough for critical data paths. -->

---

## Homework

Open `tests/lecture-10/homework/starter.test.ts` — 7 TODOs:

| TODO | Skill |
|------|-------|
| 1 | Connect to MongoDB — assert success |
| 2 | Sign up via API — find in Auth collection |
| 3 | Cross-validate username API vs DB |
| 4 | Password absent in API, hashed in DB |
| 5 | `.then()` — find in User collection |
| 6 | `toMatch(/^[a-f0-9]{24}$/)` — ObjectId format |
| 7 | `toStrictEqual` — API value vs DB value |

Goal: **7 tests passing**
