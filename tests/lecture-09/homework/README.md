# Homework — Lecture 09: Followers, Blocking & Notifications

> **Goal:** Follow user B, verify following list, verify user B's followers, unfollow, verify removed.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | PUT /user/follow/:followerId |
| TODO 2 | Verify follow via GET |
| TODO 3 | Verify from user B's perspective |
| TODO 4 | Unfollow + state verification |
| TODO 5 | `.then()` on GET, array may be empty |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | PUT /user/follow/:userBId → 200 |
| 2 | GET /user/following → following array |
| 3 | GET /user/followers/:userBId → followers array |
| 4 | Unfollow → verify user B gone from following list |
| 5 | GET /notifications → 200, notifications array |

## How to Run

```bash
npm test tests/lecture-09/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- Unfollow needs BOTH `:followeeId` (user B) AND `:followerId` (your own `_id`) in the URL
- Get your own `_id` from `GET /currentuser → user._id` in `beforeAll`
- Notifications may be empty — always assert `.toBe(true)` on `Array.isArray(...)`, not a specific count

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-09-followers
git checkout -b lecture-09-followers-homework

# Make sure tests pass first
npm test tests/lecture-09/homework/starter.test.ts

# Stage and commit
git add tests/lecture-09/homework/starter.test.ts
git commit -m "lecture-09: homework complete — 5 tests passing"
git push -u origin lecture-09-followers-homework
```

### Open a Pull Request

- Base branch: `lecture-09-followers` (or `main` after it's merged)
- Compare: `lecture-09-followers-homework`
- Title: `lecture-09: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
