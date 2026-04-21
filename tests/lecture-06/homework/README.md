# Homework — Lecture 06: Reactions — All Types & State Transitions

> **Goal:** Add a reaction, verify count increases, remove it, verify count returns to 0.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | POST /post/reaction response |
| TODO 2 | Verify reaction added |
| TODO 3 | Single reaction by username |
| TODO 4 | URL-encoded JSON in path param |
| TODO 5 | Verify removal via `.then()` style |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Add "happy" reaction → 200 |
| 2 | GET reactions → count >= 1 |
| 3 | GET single reaction by username → reactions property |
| 4 | Switch from "happy" to "wow" with `previousReaction: "happy"` |
| 5 | DELETE reaction with encoded URL → 200, "Reaction removed from post" |

## How to Run

```bash
npm test tests/lecture-06/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- Username is title-cased in Chatty: `"vitestmike"` → `"Vitestmike"`. Use `charAt(0).toUpperCase() + slice(1).toLowerCase()`
- For TODO 4: `encodeURIComponent(JSON.stringify({ love: 1, like: 0, ... }))` — encode first, then append to URL
- The `postOwnerUserId` is `post.userId` — get it from `GET /post/all/1` after creating the post

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-06-reactions
git checkout -b lecture-06-reactions-homework

# Make sure tests pass first
npm test tests/lecture-06/homework/starter.test.ts

# Stage and commit
git add tests/lecture-06/homework/starter.test.ts
git commit -m "lecture-06: homework complete — 5 tests passing"
git push -u origin lecture-06-reactions-homework
```

### Open a Pull Request

- Base branch: `lecture-06-reactions` (or `main` after it's merged)
- Compare: `lecture-06-reactions-homework`
- Title: `lecture-06: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
