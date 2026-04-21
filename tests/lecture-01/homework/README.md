# Homework — Lecture 01: Setup & Your First API Test

> **Goal:** Practice the 8 assertion types from the lecture on `POST /signin` (error path).

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Header assertions — `toContain()` on response headers |
| TODO 2 | `toMatchObject()` with `expect.any(String)`, `expect.any(Number)` |
| TODO 3 | Negative assertions — `.not.toHaveProperty()` |
| TODO 4 | Boundary value test — `expectRejected([400, 429])` |
| TODO 5 bonus | `.then()` pattern — `return` the promise |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Wrong credentials → 400, assert status + message + status field |
| 2 | Exact message value `"Invalid credentials"` |
| 3 | Empty body → 400 (Joi validation) |
| 4 | No `token` in error response (`.not.have.property`) |
| 5 | Boundary: username 3 chars → 400, message contains `"Invalid username"` |

## How to Run

```bash
npm test tests/lecture-01/homework/starter.test.ts
```

**Goal:** 4 tests passing.

## Tips

- Use the shared `sharedResponse` from `beforeAll` for TODOs 1-3 — no new HTTP requests needed
- For TODO 4, use `expectRejected(res.status)` — not `.toBe(400)` directly, due to rate limits
- For the `.then()` style TODO: no `async`, and you MUST `return` the promise

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout main
git checkout -b lecture-01-setup-homework

# Make sure tests pass first
npm test tests/lecture-01/homework/starter.test.ts

# Stage and commit
git add tests/lecture-01/homework/starter.test.ts
git commit -m "lecture-01: homework complete — 4 tests passing"
git push -u origin lecture-01-setup-homework
```

### Open a Pull Request

- Base branch: `main` (or `main` after it's merged)
- Compare: `lecture-01-setup-homework`
- Title: `lecture-01: homework complete — 4 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
