# Homework — Lecture 14: Password Reset & SSO

> **Goal:** Test the forgot-password flow (partial), reset-password validation errors, and SSO via JWT.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Business logic error — email not found |
| TODO 2 | Joi validation on email format |
| TODO 3 | Validation error — passwords don't match |
| TODO 4 | SSO: use signin JWT for new session |
| TODO 5 | `.then()` on POST endpoint |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Forgot-password non-existent email → 400, "Invalid credentials" |
| 2 | Forgot-password invalid format → 400, "Field must be valid" |
| 3 | Reset-password with bad token → 400, "Reset token has expired." |
| 4 | SSO with `{{token}}` → 200, user object, "SSO login successful" |
| 5 | SSO empty body → 400, "Token required" |

## How to Run

```bash
npm test tests/lecture-14/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- Forgot-password returns "Invalid credentials" (not "Email not found") — prevents email enumeration
- The JWT for SSO comes from `beforeAll` signin — it's the same token format as always
- We test reset-password with a fake token — it always returns 400 "Reset token has expired." which is safe to assert

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-14-password-reset
git checkout -b lecture-14-password-reset-homework

# Make sure tests pass first
npm test tests/lecture-14/homework/starter.test.ts

# Stage and commit
git add tests/lecture-14/homework/starter.test.ts
git commit -m "lecture-14: homework complete — 5 tests passing"
git push -u origin lecture-14-password-reset-homework
```

### Open a Pull Request

- Base branch: `lecture-14-password-reset` (or `main` after it's merged)
- Compare: `lecture-14-password-reset-homework`
- Title: `lecture-14: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
