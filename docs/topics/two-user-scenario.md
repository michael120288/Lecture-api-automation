# Two-User Scenario

## Table of Contents

- [Why Some API Tests Require Two Users](#why-some-api-tests-require-two-users)
- [Anatomy of a Two-User Test File](#anatomy-of-a-two-user-test-file)
- [Creating User B in beforeAll](#creating-user-b-in-beforeall)
- [Understanding User IDs in Chatty](#understanding-user-ids-in-chatty)
- [Making User A Follow User B](#making-user-a-follow-user-b)
- [Testing Social Interactions](#testing-social-interactions)
- [afterAll Cleanup for Both Users](#afterall-cleanup-for-both-users)
- [Common Pitfalls](#common-pitfalls)
- [The Full Pattern from Lecture 9](#the-full-pattern-from-lecture-9)
- [The Full Pattern from Lecture 17 (Messaging)](#the-full-pattern-from-lecture-17-messaging)
- [Structuring Credentials for User B](#structuring-credentials-for-user-b)
- [Signing In as User B](#signing-in-as-user-b)
- [Related Topics](#related-topics)

---

## Why Some API Tests Require Two Users

A social media API is inherently about interactions between users. Many features only make sense with at least two participants:

| Feature | Why two users are needed |
|---|---|
| Follow / Unfollow | You need a user to follow |
| Followers list | Only meaningful if someone has followed you |
| Block / Unblock | You block another user |
| Notifications | User B's action triggers a notification for User A |
| Direct messages | Messages are sent from A to B |
| Chat reactions | A reacts to a message sent by B |
| Post reactions | (Can be done with one user, but reactions to others' posts need two) |

With only one user, you cannot test whether the follow endpoint correctly records the relationship, whether notifications are sent to the right user, or whether messages are routed correctly.

---

## Anatomy of a Two-User Test File

A two-user test file has this shape:

```
beforeAll (file level)
  ├── Sign in as User A (permanent test account)
  ├── Get User A's _id and other needed fields
  ├── Create User B via POST /signup (ephemeral test account)
  └── Capture User B's _id, authId, username, etc.

describe blocks
  ├── Social interaction tests using both users
  └── Assertions about state visible to either user

afterAll (file level)
  ├── Undo any remaining state (unfollow, unblock)
  ├── Delete User B via DELETE /test/cleanup/user/:authId
  └── Sign out User A
```

User A is the `TEST_USERNAME` from your `.env` — the permanent account that persists between test runs. User B is a freshly created, ephemeral account that exists only for the duration of this test file.

---

## Creating User B in beforeAll

User B is created using POST /signup with dynamically generated credentials from Faker.js. The username must start with `vitest` to satisfy the cleanup endpoint's safety check.

```typescript
import { faker } from '@faker-js/faker';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

// Shared variables
let userBId      = '';   // User document _id (MongoDB ObjectId string)
let userBAuthId  = '';   // Auth document _id (used for cleanup)
let userBUsername = '';  // Used when messaging or reacting on behalf of User B

beforeAll(async () => {
  // Create User B
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  // Capture all fields we will need later
  userBId       = signupRes.data.user?._id       ?? '';
  userBAuthId   = signupRes.data.user?.authId     ?? '';
  userBUsername = signupRes.data.user?.username   ?? '';

  // Optional: capture more fields if needed
  // userBAvatarColor = signupRes.data.user?.avatarColor ?? '';
  // userBProfilePicture = signupRes.data.user?.profilePicture ?? '';
});
```

The signup response includes everything you need. The POST /signup response body:

```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
    "authId": "70a2c3d4e5f6b8c9d0e1f2g3",
    "uId": "123456789012",
    "username": "vitestab3f91c",
    "email": "test.ab3f91c@example.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  }
}
```

Capture every field you think you will need at signup time. Fetching them later requires additional HTTP calls and the fields are all available immediately.

---

## Understanding User IDs in Chatty

Chatty uses three different user identifiers, each for a different purpose:

| Field | Format | Example | Used for |
|---|---|---|---|
| `_id` | MongoDB ObjectId (24 hex chars) | `60f1b2c3d4e5f6a7b8c9d0e1` | User document reference in MongoDB |
| `authId` | MongoDB ObjectId (24 hex chars) | `70a2c3d4e5f6b8c9d0e1f2g3` | Auth document reference; **used in cleanup endpoint** |
| `uId` | 12-digit numeric string | `123456789012` | Unique numeric identifier; used in socket events and some API params |

The `_id` and `authId` are different documents in MongoDB. When you sign up:
- An **Auth** document is created that stores username, email, and hashed password.
- A **User** document is created that stores the profile (bio, followers, etc.).
- The Auth document's `_id` becomes the User's `authId` field.

The cleanup endpoint takes the **Auth document's `_id`**, which is the `authId` field in the signup response:

```typescript
// Correct: use authId for cleanup
userBAuthId = signupRes.data.user?.authId ?? '';

// Wrong: this is the User document _id, not the Auth _id
userBAuthId = signupRes.data.user?._id ?? '';  // will get 404 from cleanup endpoint
```

The `uId` is a 12-digit number generated at signup. It is used in some Chatty-specific socket operations and occasionally as a URL parameter. It is different from both MongoDB ObjectIds.

```typescript
// When you need all three IDs:
userBId      = signupRes.data.user?._id    ?? '';  // User document _id
userBAuthId  = signupRes.data.user?.authId ?? '';  // Auth document _id
userBUId     = signupRes.data.user?.uId    ?? '';  // 12-digit numeric uId
```

---

## Making User A Follow User B

The follow endpoint takes the ID of the user **being followed**:

```
PUT /api/v1/user/follow/:followerId
```

Despite the parameter being called `followerId`, it refers to the user being followed (the person who gains a follower). This is a naming quirk in the Chatty API.

```typescript
const followUrl = (id: string) => `${config.BASE_URL}/user/follow/${id}`;

// User A follows User B
const followRes = await axios.put(followUrl(userBId), {}, {
  headers: { Cookie: sessionCookie },  // sessionCookie is User A's session
  validateStatus: () => true,
});
expect(followRes.status).toBe(200);
```

After this call:
- User A's `followingCount` increases by 1.
- User B's `followersCount` increases by 1.
- User A appears in User B's followers list.
- User B appears in User A's following list.
- A notification is queued for User B (that User A followed them).

The unfollow endpoint requires **both** IDs — the person being unfollowed and the person unfollowing:

```
PUT /api/v1/user/unfollow/:followeeId/:followerId
```

```typescript
const unfollowUrl = (followeeId: string, followerId: string) =>
  `${config.BASE_URL}/user/unfollow/${followeeId}/${followerId}`;

// User A unfollows User B
// followeeId = User B (the one being unfollowed)
// followerId = User A (the one doing the unfollowing)
await axios.put(unfollowUrl(userBId, userAId), {}, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
```

This is why you need to capture `userAId` as well:

```typescript
let userAId = '';

beforeAll(async () => {
  // Sign in as User A
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = ...;

  // Get User A's _id
  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';
});
```

---

## Testing Social Interactions

### Verifying the follow relationship

After User A follows User B, verify the relationship from both sides:

```typescript
describe('After User A follows User B', () => {

  beforeAll(async () => {
    await axios.put(followUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  });

  it('User B appears in User A following list', async () => {
    const res = await axios.get(followingUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.following?.find(
      (u: { _id: string }) => u._id === userBId
    );
    expect(found).toBeDefined();
  });

  it('User A appears in User B followers list', async () => {
    // This endpoint is public — no need for User B's session
    const res = await axios.get(followersUrl(userBId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.followers?.find(
      (u: { _id: string }) => u._id === userAId
    );
    expect(found).toBeDefined();
  });

});
```

### Checking notifications

When User A follows User B, a notification is sent to User B. To check it, you need to sign in as User B:

```typescript
describe('User B notification', () => {
  let userBCookie = '';

  beforeAll(async () => {
    // The signup response includes a session — capture it to sign in as User B
    // OR sign in fresh using User B's credentials
    const loginRes = await axios.post(signinUrl, {
      username: userBUsername,
      password: TEST_PASSWORD,
    }, { validateStatus: () => true });
    const raw = loginRes.headers['set-cookie'];
    userBCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  });

  it('User B has a follow notification', async () => {
    const res = await axios.get(notificationsUrl, {
      headers: { Cookie: userBCookie }, validateStatus: () => true,
    });
    const followNotification = res.data.notifications?.find(
      (n: { notificationType: string }) => n.notificationType === 'follows'
    );
    expect(followNotification).toBeDefined();
  });
});
```

Note that signing in as User B requires a fresh HTTP call with `userBUsername` and `TEST_PASSWORD`. You used `TEST_PASSWORD` (the fixed password from fixtures.ts) when creating User B.

---

## afterAll Cleanup for Both Users

The cleanup order matters:

1. Undo any state changes (unfollow, unblock) — this keeps the follow/block tables clean.
2. Delete User B via the cleanup endpoint.
3. Sign out User A.

Do not delete User A — it is your permanent test account.

```typescript
afterAll(async () => {
  // Undo follow/block state for User B before deleting them
  // This prevents stale entries in User A's following list
  if (userBId) {
    await axios.put(unfollowUrl(userBId, userAId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    await axios.put(unblockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  // Delete User B — removes the test account and all associated data
  if (userBAuthId) {
    await axios.delete(
      `${config.BASE_URL}/test/cleanup/user/${userBAuthId}`,
      {
        headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
        validateStatus: () => true,
      }
    );
  }

  // Sign out User A — the permanent test account
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

---

## Common Pitfalls

### Pitfall 1: User B not deleted if beforeAll fails partway through

If the signup call succeeds but a subsequent call in `beforeAll` throws, `userBAuthId` is set but the error propagates. The `afterAll` still runs and will clean up User B. However, if the signup call itself fails (returns non-200) and you do not throw, `userBAuthId` remains an empty string and cleanup is skipped silently.

```typescript
beforeAll(async () => {
  const signupRes = await axios.post(signupUrl, { ... }, { validateStatus: () => true });

  // Guard: if signup failed, log it and don't proceed
  if (signupRes.status !== 200 && signupRes.status !== 201) {
    console.error(`User B signup failed: ${signupRes.status} — ${JSON.stringify(signupRes.data)}`);
    // Do not throw — afterAll will still run and clean up what was created
    return;
  }

  userBId      = signupRes.data.user?._id     ?? '';
  userBAuthId  = signupRes.data.user?.authId   ?? '';
  userBUsername = signupRes.data.user?.username ?? '';
});
```

### Pitfall 2: Using User A's session for operations that need User B's session

```typescript
// Wrong: this checks User A's notifications, not User B's
it('User B received a notification', async () => {
  const res = await axios.get(notificationsUrl, {
    headers: { Cookie: sessionCookie },  // User A's session!
    validateStatus: () => true,
  });
  // This will check User A's notifications
});
```

When testing what User B sees, you need to sign in as User B and use a separate cookie variable.

### Pitfall 3: Forgetting to capture userAId

Many two-user endpoints require both user IDs. The unfollow endpoint and some notification endpoints need the initiator's `_id`. Always capture User A's `_id` from GET /currentuser immediately after signing in.

```typescript
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  sessionCookie = ...;

  // Capture User A's _id right away
  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  // Now create User B
  const signupRes = await axios.post(signupUrl, { ... }, { validateStatus: () => true });
  userBId     = signupRes.data.user?._id    ?? '';
  userBAuthId = signupRes.data.user?.authId ?? '';
});
```

### Pitfall 4: Using `_id` instead of `authId` for cleanup

This is the most common mistake. Both are 24-character hex strings and look identical. The cleanup endpoint accepts only the Auth document's `_id`, exposed as `authId` in the signup response.

### Pitfall 5: Follow state not undone before deleting User B

The cleanup endpoint deletes User B's documents. But if User A still has User B in their following list (a follow relationship from User A's perspective), the relationship entry in User A's document may not be fully cleaned up.

Always unfollow and unblock before deleting:

```typescript
afterAll(async () => {
  // Step 1: clean up relationships
  if (userBId && userAId) {
    await axios.put(unfollowUrl(userBId, userAId), {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    await axios.put(unblockUrl(userBId), {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  }

  // Step 2: delete User B
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
    });
  }

  // Step 3: sign out User A
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});
```

---

## The Full Pattern from Lecture 9

```typescript
// tests/lecture-09/lecture.test.ts (abbreviated)

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signupUrl      = `${config.BASE_URL}/signup`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const followingUrl   = `${config.BASE_URL}/user/following`;
const followUrl      = (id: string) => `${config.BASE_URL}/user/follow/${id}`;
const unfollowUrl    = (followeeId: string, followerId: string) =>
  `${config.BASE_URL}/user/unfollow/${followeeId}/${followerId}`;
const followersUrl   = (userId: string) => `${config.BASE_URL}/user/followers/${userId}`;
const blockUrl       = (id: string) => `${config.BASE_URL}/user/block/${id}`;
const unblockUrl     = (id: string) => `${config.BASE_URL}/user/unblock/${id}`;
const cleanupUrl     = (authId: string) =>
  `${config.BASE_URL}/test/cleanup/user/${authId}`;

let sessionCookie = '';
let userAId       = '';
let userBId       = '';
let userBAuthId   = '';

beforeAll(async () => {
  // Sign in as User A
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Get User A's _id
  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  // Create User B
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  userBId     = signupRes.data.user?._id    ?? '';
  userBAuthId = signupRes.data.user?.authId ?? '';
});

afterAll(async () => {
  if (userBId) {
    await axios.put(unfollowUrl(userBId, userAId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    await axios.put(unblockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
    });
  }

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});
```

---

## The Full Pattern from Lecture 17 (Messaging)

Messaging tests require more fields from User B because the send-message endpoint needs the receiver's username and avatar color:

```typescript
// From tests/lecture-17/lecture.test.ts

let cookieA          = '';
let userAId          = '';
let userBId          = '';
let userBAuthId      = '';
let userBUsername    = '';
let userBAvatarColor = '';

beforeAll(async () => {
  // Sign in as User A
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  cookieA = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Get User A's _id
  const curRes = await axios.get(`${config.BASE_URL}/currentuser`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  // Create User B — capture all fields needed for message sending
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  userBId          = signupRes.data.user?._id          ?? '';
  userBAuthId      = signupRes.data.user?.authId        ?? '';
  userBUsername    = signupRes.data.user?.username      ?? '';
  userBAvatarColor = signupRes.data.user?.avatarColor   ?? '';
});

// Sending a message requires receiver metadata:
const res = await axios.post(chatUrl, {
  receiverId: userBId,
  receiverUsername: userBUsername,         // ← needed from signup response
  receiverAvatarColor: userBAvatarColor,   // ← needed from signup response
  receiverProfilePicture: '',
  body: 'Hello from Lecture 17!',
}, { headers: { Cookie: cookieA }, validateStatus: () => true });
```

The pattern is the same but captures more fields from the signup response.

---

## Structuring Credentials for User B

User B's credentials are derived at test time and stored in shared variables:

```typescript
// Pattern: everything about User B comes from the signup response
let userBId          = '';  // _id for social endpoint params
let userBAuthId      = '';  // authId for cleanup endpoint
let userBUsername    = '';  // username for message/notification endpoints
let userBAvatarColor = '';  // avatarColor for message payload
// userBPassword is not stored — it is always TEST_PASSWORD

// The password used to create User B
// Stored in fixtures.ts so both creation and re-login use the same value
import { TEST_PASSWORD } from '../../src/fixtures';
```

If you need to sign in as User B in a test, use `userBUsername` and `TEST_PASSWORD`:

```typescript
const userBLoginRes = await axios.post(signinUrl, {
  username: userBUsername,
  password: TEST_PASSWORD,
}, { validateStatus: () => true });
```

---

## Signing In as User B

Some tests require assertions from User B's perspective (e.g. checking User B's notification inbox). This requires a separate session cookie for User B.

```typescript
describe('Notifications visible to User B', () => {
  let cookieB = '';

  beforeAll(async () => {
    const loginRes = await axios.post(signinUrl, {
      username: userBUsername,
      password: TEST_PASSWORD,
    }, { validateStatus: () => true });
    const raw = loginRes.headers['set-cookie'];
    cookieB = Array.isArray(raw) ? raw[0] : (raw ?? '');
  });

  it('User B has notifications', async () => {
    const res = await axios.get(notificationsUrl, {
      headers: { Cookie: cookieB },  // User B's session
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.notifications).toBeInstanceOf(Array);
  });
});
```

You do not need to sign out User B in `afterAll` explicitly. Signing out is optional cleanup. The cleanup endpoint deletes User B's records (including the session in Redis), so signing out first is good practice but not required.

---

## Related Topics

- [Test Lifecycle](test-lifecycle.md) — beforeAll and afterAll scope for multi-user setups
- [Test Cleanup](test-cleanup.md) — deleting User B with the cleanup endpoint
- [Test Data Strategy](test-data-strategy.md) — Faker.js, vitest prefix, and credential management
- [State Verification](state-verification.md) — verifying social state changes persist

## Official Documentation

- [Faker.js — internet module](https://fakerjs.dev/api/internet.html)
- [Vitest — beforeAll](https://vitest.dev/api/#beforeall)
