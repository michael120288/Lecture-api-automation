# Homework — Lecture 03: SignUp — Creating & Cleaning Up Test Users

> **Goal:** Create a test user with Faker.js, assert the full signup response, test duplicates and validation.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Multiple assertions — signup response |
| TODO 2 | Shape validation and JWT check on same response |
| TODO 3 | Business logic error — duplicate detection |
| TODO 4 | Password pattern boundary test |
| TODO 5 | `.then()` style — testing protected endpoint |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Successful signup → 201, save `authId` |
| 2 | Duplicate username → 400, message contains `"already"` |
| 3 | Invalid password (no special char) → 400 |
| 4 | Cleanup endpoint with correct secret → 200 |
| 5 stretch | Collection Runner: signup → duplicate → cleanup → signup again (succeeds) |

## How to Run

```bash
npm test tests/lecture-03/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- The `authId` is `response.data.user.authId` — NOT `user._id`. Two different IDs from two collections.
- Faker.js generates different data each run — tests will never clash in the database.
- For TODO 5: the cleanup secret is `"chatty-test-cleanup-2026"` — import `TEST_CLEANUP_SECRET` from `src/fixtures.ts`

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-03-signup
git checkout -b lecture-03-signup-homework

# Make sure tests pass first
npm test tests/lecture-03/homework/starter.test.ts

# Stage and commit
git add tests/lecture-03/homework/starter.test.ts
git commit -m "lecture-03: homework complete — 5 tests passing"
git push -u origin lecture-03-signup-homework
```

### Open a Pull Request

- Base branch: `lecture-03-signup` (or `main` after it's merged)
- Compare: `lecture-03-signup-homework`
- Title: `lecture-03: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
