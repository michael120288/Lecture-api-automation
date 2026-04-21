# Homework — Lecture 07: Comments — Full CRUD + Nested Queries

> **Goal:** Add a comment, find its ID via GET, update it, verify via single-comment endpoint, delete it.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | POST returns 200, no commentId |
| TODO 2 | GET-then-find pattern for ID |
| TODO 3 | State verification — single comment response quirk |
| TODO 4 | Delete and clear cleanup flag |
| TODO 5 | `.then()` style on GET endpoint |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Add comment → 200, message, no `_id` |
| 2 | GET /post/comments/:postId → find comment, save `commentId` |
| 3 | PATCH comment → 200 |
| 4 | GET single comment → `comments.comment === "Updated comment"` |
| 5 | DELETE comment → 200, "Comment deleted successfully" |

## How to Run

```bash
npm test tests/lecture-07/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- `GET /post/single/comment` returns `{ comments: singleDoc }` — access as `res.data.comments.comment` (NOT `comments[0]`)
- After DELETE, set `commentId = ""` so `afterAll` does not attempt a double-delete
- `POST /post/comment` returns 200, not 201 — always use `.toBe(200)` here

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-07-comments
git checkout -b lecture-07-comments-homework

# Make sure tests pass first
npm test tests/lecture-07/homework/starter.test.ts

# Stage and commit
git add tests/lecture-07/homework/starter.test.ts
git commit -m "lecture-07: homework complete — 5 tests passing"
git push -u origin lecture-07-comments-homework
```

### Open a Pull Request

- Base branch: `lecture-07-comments` (or `main` after it's merged)
- Compare: `lecture-07-comments-homework`
- Title: `lecture-07: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
