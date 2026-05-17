# Lecture 17 — Chat & Messaging

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 16 — user profile pages, image management.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-17/chat.spec.ts
> npm test tests/lecture-17/homework/starter.test.ts
> ```

---

## What You Will Learn

- Why chat requires **two users** — you send, someone else receives
- `POST /chat/message` — send a message (creates conversation if first time)
- `GET /chat/message/conversation-list` — list all conversations
- `GET /chat/message/user/:receiverId` — messages in a conversation
- `PUT /chat/message/mark-as-read` — mark messages as read
- `PUT /chat/message/reaction` — add/remove emoji reaction to a message
- `DELETE /chat/conversation/:receiverId` — remove a conversation from your list
- `DELETE /chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` — delete a specific message
- `conversationId` — how it is created and how to use it in subsequent messages
- The `receiverUsername`, `receiverAvatarColor`, `receiverProfilePicture` fields — why chat requires full receiver details
- Advanced assertion variants — `expect.objectContaining` for message shape, `toSatisfy(fn)` for body content, `toMatch(/regex/)` for MongoDB ObjectId format

> **Reference Topics**
> - Two-user chat setup → [`docs/topics/two-user-scenario.md`](../../docs/topics/two-user-scenario.md)
> - URL encoding for message parameters → [`docs/topics/url-encoding.md`](../../docs/topics/url-encoding.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints |
| 2 | Why Two Users |
| 3 | The `conversationId` Lifecycle |
| 4 | Receiver Fields — Why Chat Needs Them |
| 5 | Message Reaction |
| 6 | Deleting Conversations and Messages |
| 7 | Postman |
| 8 | Endpoint Schema |
| 9 | Running the Tests |
| 10 | Git |

---

## 1. Endpoints

| Method | Path | Returns |
|--------|------|---------|
| POST | `/chat/message` | `{ message, conversationId }` |
| GET | `/chat/message/conversation-list` | `{ message, list: [...] }` |
| GET | `/chat/message/user/:receiverId` | `{ message, messages: [...] }` |
| POST | `/chat/message/add-chat-users` | `{ message }` |
| POST | `/chat/message/remove-chat-users` | `{ message }` |
| PUT | `/chat/message/mark-as-read` | `{ message }` |
| PUT | `/chat/message/reaction` | `{ message }` |
| DELETE | `/chat/conversation/:receiverId` | `{ message: "Conversation removed" }` |
| DELETE | `/chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` | `{ message: "Message marked as deleted" }` |

---

## 2. Why Two Users

Chat requires a sender (user A) and a receiver (user B). You cannot message yourself.

Same approach as Lecture 09:
1. Sign in as user A (`TEST_USERNAME`) in `beforeAll`
2. Create user B with Faker.js + signup
3. Get user B's `_id`, `username`, `avatarColor`, `profilePicture` — all needed for the message body
4. In `afterAll`: delete user B, sign out

---

## 3. The `conversationId` Lifecycle

First message between two users:
```ts
// Send WITHOUT conversationId — server creates a new conversation
const res = await axios.post(`${BASE_URL}/chat/message`, {
  receiverId: userBId,
  receiverUsername: userBUsername,
  receiverAvatarColor: userBAvatarColor,
  receiverProfilePicture: '',
  body: 'Hello!',
  // no conversationId
}, { headers: { Cookie: cookieA }, ... });

conversationId = res.data.conversationId;
```

Subsequent messages in the same conversation:
```ts
await axios.post(`${BASE_URL}/chat/message`, {
  conversationId,  // include this time
  receiverId: userBId,
  ...
  body: 'Second message',
}, ...);
```

---

## 4. Receiver Fields — Why Chat Needs Them

Unlike reactions and comments (which look up receiver data server-side), chat stores the receiver's
display information directly in the message document for fast rendering.

You must pass:
- `receiverUsername` — shown in the chat bubble
- `receiverAvatarColor` — shown when profile picture is missing
- `receiverProfilePicture` — may be empty string

Get these from the signup response when creating user B:
```ts
userBAvatarColor = signupRes.data.user.avatarColor;
userBUsername    = signupRes.data.user.username;
userBId          = signupRes.data.user._id;
```

---

## 5. Message Reaction

React to a specific message with:
```ts
await axios.put(`${BASE_URL}/chat/message/reaction`, {
  conversationId,
  messageId,    // get from GET /chat/message/user/:receiverId
  reaction: '😊',
  type: 'add',   // or 'remove'
}, { headers: { Cookie: cookieA }, ... });
```

---

## 6. Deleting Conversations and Messages

### `DELETE /chat/conversation/:receiverId` — Remove conversation from list

`:receiverId` = user B's `_id`.

```ts
await axios.delete(`${BASE_URL}/chat/conversation/${userBId}`, {
  headers: { Cookie: cookieA }, validateStatus: () => true,
});
```

**Response (200):** `{ "message": "Conversation removed" }`

> ⚠️ This removes the conversation from **your** list only. The other user's conversation is unaffected.
> ⚠️ Does not delete the messages — only removes from your conversation list.

---

### `DELETE /chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type` — Delete a message

All four are URL path params. All three IDs must be valid MongoDB ObjectIds.

| Param | Value |
|-------|-------|
| `:messageId` | The `_id` of the message (from `GET /chat/message/user/:receiverId`) |
| `:senderId` | User `_id` of the message sender |
| `:receiverId` | User `_id` of the message receiver |
| `:type` | `'deleteForMe'` or `'deleteForEveryone'` |

```ts
// Only the sender or receiver can delete — returns 401 otherwise
await axios.delete(
  `${BASE_URL}/chat/message/mark-as-deleted/${messageId}/${userAId}/${userBId}/deleteForMe`,
  { headers: { Cookie: cookieA }, validateStatus: () => true },
);
```

**Response (200):** `{ "message": "Message marked as deleted" }`

> ⚠️ `'deleteForMe'` hides the message only for you. `'deleteForEveryone'` hides it for both parties.
> ⚠️ Only the sender OR receiver can delete — another user gets 401.
> ⚠️ You need `messageId` — get it from `GET /chat/message/user/:receiverId → messages[0]._id`.

---

## 7. Postman

Create folder **Lecture 17**. Requires two user accounts.

### Send first message
- POST `{{base_url}}/chat/message`
- Body: `{ "receiverId": "{{userBId}}", "receiverUsername": "{{userBUsername}}", "receiverAvatarColor": "#ff6b6b", "receiverProfilePicture": "", "body": "Hello from Postman!" }`
- Tests: assert status 200, save `conversationId`

### Get conversation list
- GET `{{base_url}}/chat/message/conversation-list`
- Assert: list is array, first item has conversationId

### Get messages
- GET `{{base_url}}/chat/message/user/{{userBId}}`
- Assert: messages array, save `messageId` from first message

### Mark as read
- PUT `{{base_url}}/chat/message/mark-as-read`
- Body: `{ "senderId": "{{userBId}}", "receiverId": "{{userAId}}" }`
- Assert: status 200

---

## 8. Endpoint Schema

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


**`POST /chat/message`** — `addChatSchema`

| Field | Type | Required |
|-------|------|----------|
| `receiverId` | string | ✅ |
| `receiverUsername` | string | ✅ |
| `receiverAvatarColor` | string | ✅ |
| `receiverProfilePicture` | string | ✅ |
| `conversationId` | string | ❌ (omit for first message) |
| `body` | string | ❌ |
| `gifUrl` | string | ❌ |
| `selectedImage` | string | ❌ |
| `isRead` | boolean | ❌ |

**`PUT /chat/message/reaction`** — `messageReactionSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `conversationId` | string | ✅ | |
| `messageId` | string | ✅ | |
| `reaction` | string | ✅ | any emoji/string |
| `type` | string | ✅ | `'add'` or `'remove'` |

---

## Key Takeaways

- ✅ Chat requires two users — create user B in `beforeAll`, delete in `afterAll`
- ✅ Omit `conversationId` on the first message — server creates it and returns it
- ✅ `receiverUsername`, `receiverAvatarColor`, `receiverProfilePicture` are required body fields
- ✅ `messageId` is found via `GET /chat/message/user/:receiverId`
- ✅ Delete message URL has 4 params: `messageId`, `senderId`, `receiverId`, `type`
- ✅ Delete conversation removes it from **your** list only — the other user is unaffected

**Congratulations — you have completed all 17 lectures!**

---

## 9. Running the Tests

```bash
npm test tests/lecture-17/chat.spec.ts
```

## 10. Git

```bash
# Stage the files for this lecture
git add tests/lecture-17/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-17: chat and messaging — two-user conversation flow"

# Push the branch to GitHub
git push -u origin lecture-17-chat
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-17: chat and messaging — two-user conversation flow`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
# Course complete! 🎉
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | Send first message → 200, save conversationId |
| 2 | GET conversation-list → list array |
| 3 | GET messages with user B → messages array |
| 4 | Mark as read → 200 |
| 5 | `.then()` — send second message with conversationId |
| 6 | `expect.objectContaining` — assert message has both `_id` and `body` fields |
| 7 | `toSatisfy` — assert message body is non-empty using a custom predicate |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-17/homework/starter.test.ts
```
