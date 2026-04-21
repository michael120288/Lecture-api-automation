# Homework — Lecture 17: Chat & Messaging

> **Goal:** Send a message (creates conversation), get conversation list, get messages, mark read, delete.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | POST /chat/message — first message creates conversation |
| TODO 2 | Verify conversation created |
| TODO 3 | GET /chat/message/user/:receiverId |
| TODO 4 | PUT /chat/message/mark-as-read |
| TODO 5 | `.then()` with existing conversation |
| TODO 6 | DELETE with 4 URL params |
| TODO 7 | DELETE conversation + state verify |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Send first message → 200, save `conversationId` |
| 2 | GET conversation-list → list array |
| 3 | GET messages → array, save `messageId` |
| 4 | Mark as read → 200 |
| 5 | React to message → 200 |
| 6 | DELETE message with 4 URL params → 200, "Message marked as deleted" |
| 7 | DELETE conversation → 200, verify gone from list |

## How to Run

```bash
npm test tests/lecture-17/homework/starter.test.ts
```

**Goal:** 5 (6 and 7 are bonus) tests passing.

## Tips

- Omit `conversationId` on the FIRST message — server creates it and returns it in the response
- Include `conversationId` on ALL subsequent messages in the same conversation
- Delete message URL: `/chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/deleteForMe` — 4 params

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-17-chat
git checkout -b lecture-17-chat-homework

# Make sure tests pass first
npm test tests/lecture-17/homework/starter.test.ts

# Stage and commit
git add tests/lecture-17/homework/starter.test.ts
git commit -m "lecture-17: homework complete — 5 (7 bonus) tests passing"
git push -u origin lecture-17-chat-homework
```

### Open a Pull Request

- Base branch: `lecture-17-chat` (or `main` after it's merged)
- Compare: `lecture-17-chat-homework`
- Title: `lecture-17: homework complete — 5 (7 bonus) tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
