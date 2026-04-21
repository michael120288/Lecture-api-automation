# Redis

## What is Redis?

Redis (Remote Dictionary Server) is an **in-memory key-value store**. It holds data in RAM instead of on disk, which makes reads and writes dramatically faster than a traditional database.

Where MongoDB reads from disk (even with a disk cache, the path to data involves more layers), Redis reads from RAM directly. The difference in practical terms: a MongoDB query might take 5-50ms; the equivalent Redis read takes 0.1-1ms.

Redis is often described as a cache, but it is more accurately described as a data structure server — it supports strings, hashes, lists, sets, sorted sets, and more.

---

## Why Redis is Faster Than a Database

| Layer | Technology | Approximate read latency |
|-------|-----------|--------------------------|
| CPU registers | Silicon | < 1 nanosecond |
| RAM | DRAM | ~100 nanoseconds |
| NVMe SSD | Flash storage | ~100 microseconds |
| HDD | Spinning disk | ~10 milliseconds |
| Network database | MongoDB Atlas | ~5-50 milliseconds |
| Local Redis | In-memory | ~0.1-1 millisecond |

Redis stores everything in RAM, so its reads stay in the nanosecond-to-microsecond range at the hardware level and sub-millisecond range over a local network. MongoDB reads involve disk I/O even when data is hot in the page cache.

At scale, this difference is critical. A busy social media API that reads the current user's profile on every authenticated request cannot afford a 20ms database round-trip — but a 0.5ms Redis read is negligible.

---

## Common Redis Use Cases

| Use Case | Description |
|----------|-------------|
| Session storage | Store session data keyed by session ID (fast lookup) |
| Application cache | Cache expensive query results; invalidate on change |
| Rate limiting | Count requests per IP using atomic increments |
| Job queues | Lists used as FIFO queues for background jobs |
| Pub/Sub | Real-time notifications between services |
| Leaderboards | Sorted sets for ranking |

Chatty uses Redis for profile caching and job queuing.

---

## How Chatty Uses Redis: The Cache Layer

When a user's profile is updated, Chatty does NOT write directly to MongoDB synchronously. Instead, it:

1. Writes the updated data to Redis immediately
2. Enqueues a background job to update MongoDB asynchronously

The `GET /api/v1/currentuser` endpoint reads profile data from Redis — not from MongoDB. This is why profile updates appear instantly in `GET /currentuser` even though the MongoDB write may happen seconds later.

The architecture looks like this:

```
PUT /user/profile/basic-info
        |
        ├── Write to Redis (immediate, synchronous)
        |       └── Redis key: user:<userId>
        |           Redis value: updated user JSON
        |
        └── Enqueue job in Bull queue (immediate, async)
                └── Background worker picks up the job
                        └── Writes updated data to MongoDB
```

When you call `GET /currentuser`:

```
GET /currentuser
        |
        └── Read from Redis (fast)
                └── Return user data from Redis cache
```

MongoDB is only written to asynchronously. The API reads from Redis, not MongoDB, for the current user profile.

---

## What This Means for Test Design

A 200 response from `PUT /user/profile/basic-info` tells you:
1. The server accepted the request
2. Redis was updated

It does NOT tell you:
- MongoDB was updated (that happens asynchronously)
- The background Bull job ran successfully

A subsequent `GET /currentuser` that returns the updated value confirms:
- Redis has the correct data (since `GET /currentuser` reads Redis)

To confirm MongoDB has the correct data, you must query MongoDB directly (as done in Lecture 10).

**The implication:**

```typescript
// This test proves Redis was updated
it('GET /currentuser reflects the updated work field', async () => {
  await axios.put(basicInfoUrl, { work: 'QA Automation Engineer' }, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  // This confirms Redis — NOT MongoDB — has the new value
  expect(res.data.user.work).toBe('QA Automation Engineer');
});

// This test proves MongoDB was updated (requires direct DB access — Lecture 10)
it('MongoDB reflects the updated work field', async () => {
  // Wait briefly for the async Bull job to run (fragile — avoid this pattern)
  // Better: use the test cleanup endpoint to verify or accept the Redis-only check
  const userColl = db.collection('User');
  const doc = await userColl.findOne({ authId: apiAuthId });
  expect(doc?.work).toBe('QA Automation Engineer');
});
```

In practice, for this course, the `GET /currentuser` check is sufficient because the Bull queue on the production server processes jobs within milliseconds. Direct MongoDB verification is covered in Lecture 10 for learning purposes.

---

## The Bull Queue

Bull is a Node.js library that implements job queues using Redis. It stores pending jobs as Redis entries and worker processes pick them up.

In Chatty:
- Profile update jobs are added to the queue immediately on `PUT /user/profile/basic-info`
- A background worker process consumes the queue and writes to MongoDB
- If the server is under heavy load, there may be a brief delay between the PUT and the MongoDB write

This architecture trades strict consistency (guaranteed DB write before 200 response) for performance (fast response, async DB write). It is a common pattern in high-traffic applications.

---

## Basic Redis Commands

You will not need to run Redis commands directly in this course, but understanding them helps you understand what Chatty is doing internally:

| Command | Description | Example |
|---------|-------------|---------|
| `SET key value` | Store a value | `SET user:661ab profile_json` |
| `GET key` | Retrieve a value | `GET user:661ab` |
| `DEL key` | Delete a key | `DEL user:661ab` |
| `EXISTS key` | Check if key exists | `EXISTS user:661ab` |
| `TTL key` | Get time-to-live in seconds | `TTL user:661ab` |
| `EXPIRE key seconds` | Set expiry | `EXPIRE user:661ab 3600` |
| `HSET key field value` | Set hash field | `HSET user:661ab work "Engineer"` |
| `HGET key field` | Get hash field | `HGET user:661ab work` |

Chatty likely stores user profiles as Redis hash maps keyed by userId, or as serialized JSON strings.

---

## Redis vs MongoDB: When to Use Each

| Use this | When you need |
|----------|--------------|
| Redis | Sub-millisecond reads, temporary data, cache, sessions, queues |
| MongoDB | Persistent storage, complex queries, large documents, indexes |

The two technologies complement each other. Redis is the hot path; MongoDB is the source of truth. When Chatty's Redis cache is empty (e.g., after a server restart), it falls back to MongoDB to rebuild the cache.

---

## Why "200 from PUT Doesn't Prove the DB Was Updated"

This is the key lesson for test design:

```
Client: PUT /user/profile/basic-info { work: "QA Engineer" }
Server:
  1. Validates the request body (Joi schema)
  2. Writes to Redis: SET user:661ab {..., work: "QA Engineer"}
  3. Adds Bull job: { userId: "661ab", work: "QA Engineer" }
  4. Returns HTTP 200
                        <- Client receives 200 here
Bull worker (async):
  5. Picks up the job from the queue
  6. Writes to MongoDB: updateOne({ _id: ObjectId("661ab") }, { work: "QA Engineer" })
```

Steps 1-4 happen before the 200 response. Steps 5-6 happen after. When your test receives the 200, step 6 may or may not have completed yet.

Asserting via `GET /currentuser` checks step 2 (Redis). Asserting via direct MongoDB query checks step 6.

---

## What Happens When Redis is Down

If the Redis server is unavailable:
- `GET /currentuser` fails or returns stale data
- Profile updates fail (cannot write to Redis)
- Sessions may fail if Redis is used for session storage

The production server has Redis as a hard dependency for the cached read path. This is an architecture decision that trades resilience for performance.

---

## Common Mistakes in Tests Involving Redis

| Mistake | Problem | Fix |
|---------|---------|-----|
| Asserting MongoDB after PUT without a delay | MongoDB may not be updated yet | Use `GET /currentuser` to verify (reads Redis) or add a small delay before DB query |
| Treating `GET /currentuser` as a MongoDB verification | It reads Redis, not MongoDB | Query MongoDB directly for DB verification |
| Expecting `GET /currentuser` to be slow | Redis reads are sub-millisecond | If `GET /currentuser` is slow (>500ms), something is wrong |
| Not understanding why profile updates are "instant" | It feels like it reads from DB | It reads from Redis — that is why it is instant |

---

## Related Topics

- [MongoDB](mongodb.md)
- [Cookies and Sessions](cookies-sessions.md)
- [JSON](json.md)

## Official Documentation

- [Redis — Official docs](https://redis.io/docs/)
- [Redis — Commands reference](https://redis.io/commands/)
- [Redis — Data types](https://redis.io/docs/data-types/)
- [Bull queue — GitHub](https://github.com/OptimalBits/bull)
