# Homework — Lecture 02: SignIn — Authentication & Cookies

> **Goal:** Test the full signin success response, JWT format, cookie capture, and authenticated requests.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Multiple assertions in one test |
| TODO 2 | JWT format validation — `split('.')`, `startsWith('eyJ')` |
| TODO 3 | Security assertions — `set-cookie` header + `.not.toHaveProperty` |
| TODO 4 | Authenticated request — use cookie in headers |
| TODO 5 | `.then()` with `toMatchObject` |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Status 200, message, token, user — save token to environment |
| 2 | Token format — is string, contains `.` |
| 3 | Cookie set, password not in response |
| 4 | GET /currentuser with cookie → 200 |
| 5 | Signout → GET /currentuser → 401 |
| 6 stretch | Collection Runner: signin → currentuser → signout → currentuser (expect 401) |

## How to Run

```bash
npm test tests/lecture-02/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- All 5 TODOs use the `response` from `beforeAll` — no new HTTP calls needed in tests 1-4
- TODO 4: Axios does NOT auto-send cookies — pass `{ headers: { Cookie: sessionCookie } }`
- JWT starts with `eyJ` because `{"alg":...}` base64url-encoded always produces those 3 chars

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-02-signin
git checkout -b lecture-02-signin-homework

# Make sure tests pass first
npm test tests/lecture-02/homework/starter.test.ts

# Stage and commit
git add tests/lecture-02/homework/starter.test.ts
git commit -m "lecture-02: homework complete — 5 tests passing"
git push -u origin lecture-02-signin-homework
```

### Open a Pull Request

- Base branch: `lecture-02-signin` (or `main` after it's merged)
- Compare: `lecture-02-signin-homework`
- Title: `lecture-02: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
