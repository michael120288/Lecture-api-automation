# MongoDB

## What is MongoDB?

MongoDB is a **document database** — a type of NoSQL database that stores data as JSON-like documents rather than rows in tables. It is the database Chatty uses for all persistent data storage.

Understanding MongoDB is important for API testing because direct database access lets you verify that API calls produced the expected data changes, beyond what the API response alone can tell you.

---

## Document Database vs Relational Database

| Concept | Relational (SQL) | MongoDB (Document) |
|---------|-----------------|-------------------|
| Data unit | Row | Document |
| Data container | Table | Collection |
| Schema | Enforced by the DB engine | Optional (enforced in app code) |
| Relationships | Foreign keys + JOINs | Embedded documents or references |
| Query language | SQL | MQL (MongoDB Query Language) or Mongoose |
| Examples | PostgreSQL, MySQL | MongoDB, CouchDB |

In practice, a MongoDB document looks like a JavaScript object:

```json
{
  "_id": "ObjectId('661ab12345abc6789def0123')",
  "username": "Vitestmike",
  "email": "mike@example.com",
  "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewkL4e3Pz9VTPYVW",
  "avatarColor": "#4a90e2",
  "uId": "12345678",
  "createdAt": "2024-04-15T12:00:00.000Z"
}
```

---

## Collections vs Tables

A **collection** in MongoDB is the equivalent of a table in SQL. It is a named group of documents. Unlike SQL tables, a MongoDB collection does not enforce that all documents have the same fields (though in practice, applications enforce their own schemas).

Chatty has two main collections:

| Collection | Purpose |
|------------|---------|
| `Auth` | Authentication data: username, email, hashed password |
| `User` | Profile data: avatar, bio, counts, notification settings |

---

## Documents vs Rows

A **document** is a single record in a collection. In MongoDB, documents are stored as BSON (Binary JSON) internally, but when you query them in Node.js, they come back as plain JavaScript objects.

Every document has a special field called `_id` that is the document's unique identifier. If you do not provide one, MongoDB generates an `ObjectId` automatically.

---

## BSON and ObjectId

BSON (Binary JSON) is MongoDB's internal storage format. It extends JSON with additional types:

- `ObjectId` — a 12-byte unique identifier, displayed as 24 hex characters
- `Date` — stored as milliseconds since epoch
- `Long` — 64-bit integers

The `_id` field in Chatty documents is an `ObjectId`:

```
ObjectId('661ab12345abc6789def0123')
```

When you get this back from the Node.js MongoDB driver, the `_id` is not a string — it is an `ObjectId` object. You need to call `.toString()` to convert it to a string for comparison with the `authId` string that the Chatty API returns.

---

## Connecting with MongoClient

From Lecture 10:

```typescript
import { MongoClient } from 'mongodb';

let mongoClient: MongoClient;
let db: ReturnType<MongoClient['db']>;

beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not set in .env');

  mongoClient = new MongoClient(databaseUrl);
  await mongoClient.connect();
  db = mongoClient.db();  // Uses the database name from the connection string
});

afterAll(async () => {
  await mongoClient.close();
});
```

Always close the connection in `afterAll`. An unclosed MongoDB connection will keep the test process alive after tests finish, causing a timeout.

---

## Querying with findOne()

`findOne()` returns the first document matching the filter, or `null` if no document matches.

```typescript
// Find by email
const authColl = db.collection('Auth');
const doc = await authColl.findOne({ email: 'mike@example.com' });

if (doc === null) {
  // No document found
} else {
  console.log(doc._id.toString()); // '661ab12345...'
  console.log(doc.email);           // 'mike@example.com'
  console.log(doc.password);        // '$2b$12$...'
}
```

Common filters:

```typescript
// By a string field
const doc = await coll.findOne({ email: 'mike@example.com' });

// By ObjectId — must use the ObjectId type, not a plain string
const { ObjectId } = await import('mongodb');
const doc = await coll.findOne({ _id: new ObjectId('661ab12345abc6789def0123') });

// By authId (stored as string in User collection)
const userDoc = await db.collection('User').findOne({ authId: '661ab12345...' });
```

---

## The Two Collections in Chatty

### Auth Collection

Stores authentication credentials. Created on signup.

```json
{
  "_id": "ObjectId('661ab12345...')",
  "username": "Vitestmike",
  "email": "mike@example.com",
  "password": "$2b$12$...",
  "avatarColor": "#4a90e2",
  "uId": "12345678",
  "createdAt": "2024-04-15T12:00:00.000Z"
}
```

Key points:
- The `_id` of this document is what the API calls `authId`
- The `password` field contains the bcrypt hash
- `uId` is a sequential numeric ID (different from `_id`)

### User Collection

Stores profile and activity data. Created on signup alongside the Auth document.

```json
{
  "_id": "ObjectId('661ab99999...')",
  "authId": "661ab12345...",
  "username": "Vitestmike",
  "email": "mike@example.com",
  "profilePicture": "https://res.cloudinary.com/...",
  "postsCount": 0,
  "followersCount": 0,
  "followingCount": 0,
  "work": "",
  "school": "",
  "quote": "",
  "location": "",
  "notifications": {
    "messages": true,
    "reactions": true,
    "comments": true,
    "follows": true
  }
}
```

Key points:
- `authId` is a reference to the Auth document's `_id` (as a string)
- The `_id` of this document is what the API calls `user._id`
- No `password` field — credentials are only in Auth

---

## Why Direct DB Access in Tests

API tests assert what the API returns. But "API returned 200" does not prove data was persisted correctly. Consider:

```
PUT /user/profile/basic-info  → 200 OK
GET /currentuser              → returns updated work field (from Redis cache)
```

This proves Redis was updated. It does not prove MongoDB was updated. The only way to know MongoDB has the right data is to query it directly.

Cross-validation tests (Lecture 10) do this:

```typescript
it('DB email matches API email', () => {
  // dbAuthDoc was fetched directly from MongoDB
  // testEmail is the value we used in the API call
  expect(dbAuthDoc?.email).toBe(testEmail);
});

it('DB _id matches API authId', () => {
  // Convert ObjectId to string before comparing to the API's string value
  expect(dbAuthDoc?._id?.toString()).toBe(apiAuthId);
});

it('DB password is a bcrypt hash', () => {
  expect(dbAuthDoc?.password).not.toBe(TEST_PASSWORD);
  expect((dbAuthDoc?.password as string).startsWith('$2')).toBe(true);
});
```

---

## Full Example from Lecture 10

```typescript
import axios from 'axios';
import { faker } from '@faker-js/faker';
import { MongoClient } from 'mongodb';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signupUrl = `${config.BASE_URL}/signup`;

let mongoClient: MongoClient;
let db: ReturnType<MongoClient['db']>;
let apiAuthId = '';
let apiUserId = '';

const testEmail = faker.internet.email().toLowerCase();
const testUsername = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;

beforeAll(async () => {
  // Connect to MongoDB
  mongoClient = new MongoClient(process.env.DATABASE_URL!);
  await mongoClient.connect();
  db = mongoClient.db();

  // Create user via API
  const signupRes = await axios.post(signupUrl, {
    username: testUsername,
    email: testEmail,
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  apiAuthId = signupRes.data.user?.authId ?? '';
  apiUserId = signupRes.data.user?._id ?? '';
});

afterAll(async () => {
  // Delete test user via API
  if (apiAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiAuthId}`, {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
      validateStatus: () => true,
    });
  }
  await mongoClient.close();
});

describe('Cross-validate Auth collection', () => {
  let dbAuthDoc: Record<string, unknown> | null = null;

  beforeAll(async () => {
    const authColl = db.collection('Auth');
    dbAuthDoc = await authColl.findOne({ email: testEmail }) as Record<string, unknown> | null;
  });

  it('Auth document exists in DB', () => {
    expect(dbAuthDoc).not.toBeNull();
  });

  it('DB email matches API email', () => {
    expect(dbAuthDoc?.email).toBe(testEmail);
  });

  it('DB _id matches API authId', () => {
    expect(dbAuthDoc?._id?.toString()).toBe(apiAuthId);
  });

  it('DB password is bcrypt hashed', () => {
    expect(dbAuthDoc?.password).not.toBe(TEST_PASSWORD);
    expect((dbAuthDoc?.password as string).startsWith('$2')).toBe(true);
  });
});
```

---

## MongoDB Atlas: Cloud Hosting

The production Chatty database runs on MongoDB Atlas, MongoDB's cloud database service. Key differences from local MongoDB:

**Connection string format:**

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatty-backend?retryWrites=true&w=majority
```

The `+srv` protocol uses DNS SRV records to discover cluster nodes, which is different from a simple `mongodb://` connection string.

**IP Whitelisting:**

MongoDB Atlas restricts connections to allowed IP addresses. For tests to connect from your machine, your IP must be added to the Atlas network access list. In CI pipelines, the CI server's IP must also be whitelisted — or Atlas must be configured to allow all IPs (`0.0.0.0/0`).

If your `DATABASE_URL` is correct but `mongoClient.connect()` times out, IP whitelisting is the most likely cause.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Comparing `_id` to a string without `.toString()` | `'661ab12345...' !== ObjectId(...)` | Always call `_id.toString()` before string comparison |
| Forgetting `await mongoClient.close()` in `afterAll` | Test process hangs after tests finish | Always close in `afterAll` |
| Not awaiting `mongoClient.connect()` | Queries fail with "topology closed" | `await mongoClient.connect()` in `beforeAll` |
| Querying by string `_id` instead of `ObjectId` | `findOne` returns `null` for a valid ID | Use `new ObjectId(idString)` when querying by `_id` |
| Hardcoding the database URL in the test | Credential exposure | Store in `.env` as `DATABASE_URL`, read via `process.env.DATABASE_URL` |
| Not guarding against `null` return from `findOne` | TypeScript error or runtime crash | Use `?._id` optional chaining or null check before accessing fields |

---

## Related Topics

- [Bcrypt and Password Hashing](bcrypt.md)
- [Redis](redis.md)
- [JSON](json.md)

## Official Documentation

- [MongoDB — Official docs](https://www.mongodb.com/docs/)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- [MongoDB — BSON types](https://www.mongodb.com/docs/manual/reference/bson-types/)
