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

# Lecture 17
## Chat & Messaging

Two-user conversation lifecycle from first message to delete

---

## Conversation Lifecycle

| Message | `conversationId` | Result |
|---------|-----------------|--------|
| First message | ❌ omit | API creates conversation, returns ID |
| All subsequent | ✅ include | messages added to same thread |

> #1 bug: including `conversationId` on the first message

<!-- note: the entire lifecycle in one diagram. The key rule: first message has no conversationId, every subsequent message must include it. Getting this wrong is the #1 chat test bug. -->

---

## The `conversationId` Rule

> First message: no `conversationId`

```ts
// First message — omit conversationId
const res = await axios.post(`${BASE_URL}/chat/message`, {
  receiverId, receiverUsername,
  receiverAvatarColor, receiverProfilePicture: '',
  body: 'Hello!',
}, { headers: { Cookie: cookieA },
     validateStatus: () => true });

conversationId = res.data.conversationId; // save it
```

<!-- note: the server creates the conversationId on the first message and returns it. You must save it immediately. Every subsequent message needs it. -->

---

## Every Subsequent Message Needs It

> Second message onwards: include `conversationId`

```ts
await axios.post(`${BASE_URL}/chat/message`, {
  conversationId,     // required from message 2 onward
  receiverId,
  body: 'Second message',
  ...
}, { headers: { Cookie: cookieA },
     validateStatus: () => true });
```

> Getting this wrong is the #1 chat test bug

<!-- note: if you include conversationId on the first message, you get an error. If you omit it on the second, the server creates a duplicate conversation. Both are wrong. -->

---

## Two-User Setup

`beforeAll`: sign in User A + sign up User B (Faker, vitest prefix)

↓ capture: `userAId`, `userBId`, `conversationId`

`afterAll`: cleanup User B + signout User A

> User B is created fresh each run — no leftover state

<!-- note: you cannot send a message to yourself. Chat requires a distinct sender and receiver. User B must be deleted in afterAll or test accounts accumulate on the shared server. -->

---

## All Four Receiver Fields Are Required

```ts
receiverId            = signupRes.data.user._id;
receiverUsername      = signupRes.data.user.username;
receiverAvatarColor   = signupRes.data.user.avatarColor;
receiverProfilePicture = '';  // empty string is valid
```

> Missing any one returns 400

<!-- note: unlike other endpoints that look up receiver data server-side, chat stores display info directly in the message document for fast rendering. All four are required. -->

---

## Getting `messageId` for Later Operations

```ts
const res = await axios.get(
  `${BASE_URL}/chat/message/user/${userBId}`,
  { headers: { Cookie: cookieA },
    validateStatus: () => true }
);
const messageId = res.data.messages[0]._id;
```

> Fetch from GET before any reaction or delete

<!-- note: messageId is not returned by POST /chat/message. You must fetch it from the conversation. Do this in beforeAll or as a setup step before tests that need it. -->

---

## Delete a Message — Four Path Params

```ts
await axios.delete(
  `${BASE_URL}/chat/message/mark-as-deleted` +
  `/${messageId}/${userAId}/${userBId}/deleteForMe`,
  { headers: { Cookie: cookieA },
    validateStatus: () => true }
);
```

| Param | Value |
|-------|-------|
| `:messageId` | `_id` of the message |
| `:senderId` | sender's `_id` |
| `:receiverId` | receiver's `_id` |
| `:type` | `deleteForMe` or `deleteForEveryone` |

<!-- note: deleteForMe hides it from your view only. deleteForEveryone hides it for both parties. Four path params is unusual — easy to get the order wrong. -->

---

## Delete a Conversation

```ts
await axios.delete(
  `${BASE_URL}/chat/conversation/${userBId}`,
  { headers: { Cookie: cookieA },
    validateStatus: () => true }
);
// Response: { "message": "Conversation removed" }
```

> Removes from YOUR list only — User B still sees it

<!-- note: this is not a hard delete. It removes the conversation from User A's list. User B's list is unaffected. The messages themselves are not deleted. -->

---

## Key Rule

> First message: no `conversationId`
> Every subsequent message: must include it

- Omit on first — server creates it
- Include on second — server finds it
- Getting this wrong creates duplicate conversations

---

## Homework

| TODO | Goal |
|------|------|
| 1 | Send first message → 200, save `conversationId` |
| 2 | GET conversation-list → list array |
| 3 | GET messages with User B → messages array |
| 4 | Mark as read → 200 |
| 5 | `.then()` — send second message with `conversationId` |
| 6 | `expect.objectContaining` — assert message has `_id` and `body` |
| 7 | `toSatisfy` — assert message body is non-empty |

Goal: **7 tests passing**
