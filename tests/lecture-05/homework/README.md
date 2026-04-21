# Homework — Lecture 05: Posts — Full CRUD Flow

> **Goal:** Full CRUD: create a post, find its ID via GET, update it, verify, delete it, verify deletion.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Paginated GET response shape |
| TODO 2 | Find by content, reactions start at 0 |
| TODO 3 | State verification — find by `_id` after update |
| TODO 4 | Negative — auth required |
| TODO 5 | Delete + cleanup flag + verify gone |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Create post → 201, no `_id` in response |
| 2 | GET /post/all/1 → find post, save `postId` |
| 3 | PATCH post → 200 |
| 4 | GET → verify updated content (state verification) |
| 5 | DELETE post → 200, deleted message |

## How to Run

```bash
npm test tests/lecture-05/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- After TODO 3 (PATCH), find the post by `_id` — not by content (the content just changed!)
- Set `postDeleted = true` after a successful DELETE — `afterAll` checks this flag to avoid double-delete
- `find()` returning `undefined` proves the post is gone from Redis cache

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-05-posts
git checkout -b lecture-05-posts-homework

# Make sure tests pass first
npm test tests/lecture-05/homework/starter.test.ts

# Stage and commit
git add tests/lecture-05/homework/starter.test.ts
git commit -m "lecture-05: homework complete — 5 tests passing"
git push -u origin lecture-05-posts-homework
```

### Open a Pull Request

- Base branch: `lecture-05-posts` (or `main` after it's merged)
- Compare: `lecture-05-posts-homework`
- Title: `lecture-05: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
