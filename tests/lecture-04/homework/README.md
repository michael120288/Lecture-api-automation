# Homework — Lecture 04: Current User, Profile Update & Signout

> **Goal:** Test GET /currentuser shape, state verification (PUT then GET), and signout flow.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Current user response shape |
| TODO 2 | State verification: PUT then GET |
| TODO 3 | Notification settings update |
| TODO 4 | Negative test — auth required |
| TODO 5 | `.then()` pattern |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | GET /currentuser → status 200, shape, save `originalWork` |
| 2 | PUT /basic-info + GET /currentuser → verify update (state verification) |
| 3 | PUT /settings reactions=false, follows=false → settings in response |
| 4 | GET /session-token → token is string, contains `.` |
| 5 | Signout → GET /currentuser → 401 |
| 6 stretch | Full Collection Runner: currentuser → update → verify → settings → restore → signout |

## How to Run

```bash
npm test tests/lecture-04/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- `GET /currentuser` returns `{ token, isUser, user }` — NOT `{ message, token, user }` like signin
- The `afterAll` restores `location` and `messages` to their original values — tests are non-destructive
- State verification: the PUT returns only `{ message }`. Call GET to prove the change was actually saved.

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-04-current-user
git checkout -b lecture-04-current-user-homework

# Make sure tests pass first
npm test tests/lecture-04/homework/starter.test.ts

# Stage and commit
git add tests/lecture-04/homework/starter.test.ts
git commit -m "lecture-04: homework complete — 5 tests passing"
git push -u origin lecture-04-current-user-homework
```

### Open a Pull Request

- Base branch: `lecture-04-current-user` (or `main` after it's merged)
- Compare: `lecture-04-current-user-homework`
- Title: `lecture-04: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
