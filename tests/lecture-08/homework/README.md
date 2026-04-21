# Homework — Lecture 08: User Profile Search, Social Links & Password

> **Goal:** Test user search, update social links with state verification, and change-password validation.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Response shape with bundled followers |
| TODO 2 | Regex search — case-insensitive |
| TODO 3 | State verification: social links |
| TODO 4 | Validation error — empty body |
| TODO 5 | `.then()` style on PUT endpoint |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | GET /user/all/1 → status 200, structure |
| 2 | GET /user/profile/search/vitest → results array |
| 3 | PUT social links → 200 |
| 4 | GET /currentuser → verify social link updated |
| 5 | Change-password mismatch → 400, message "does not match" |

## How to Run

```bash
npm test tests/lecture-08/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- `afterAll` restores the `youtube` social link — tests are non-destructive
- Change-password has `max: 8` chars — most accounts with longer passwords get 400 on `currentPassword`
- Only test validation errors for change-password — never actually change the password

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-08-user-profile
git checkout -b lecture-08-user-profile-homework

# Make sure tests pass first
npm test tests/lecture-08/homework/starter.test.ts

# Stage and commit
git add tests/lecture-08/homework/starter.test.ts
git commit -m "lecture-08: homework complete — 5 tests passing"
git push -u origin lecture-08-user-profile-homework
```

### Open a Pull Request

- Base branch: `lecture-08-user-profile` (or `main` after it's merged)
- Compare: `lecture-08-user-profile-homework`
- Title: `lecture-08: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
