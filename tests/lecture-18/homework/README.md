# Homework — Lecture 18: Debugging & Test Reliability

> **Goal:** Reproduce the most common failure patterns intentionally, then fix them. Practice `toMatch`, `toBeTypeOf`, `expectRejected`, and idempotency testing.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Deliberately omit `validateStatus`, catch the axios throw, assert error has `.response` |
| TODO 2 | Sign in without capturing the cookie → assert 401; capture it correctly → assert 200 |
| TODO 3 | Add `console.log(res.data)` inside a test, run it, observe the output, then remove the log |
| TODO 4 | Use `expectRejected` on a boundary-value POST `/signin` (short username) |
| TODO 5 | Call `GET /currentuser` twice with the same cookie — assert both return 200 (idempotency) |
| TODO 6 (toMatch) | Assert the error message from a failed signin matches `/\S+/` |
| TODO 7 (toBeTypeOf) | Assert the token from a successful signin is `toBeTypeOf('string')` |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Reproduce 401 intentionally (no cookie), then fix it and assert 200 |
| 2 | Use Postman Console to debug a request — open the Console, send a request, read raw output |
| 3 | Assert response time is under 3000ms using `pm.response.responseTime` |
| 4 | Add `pm.test()` for all 3 fields: status, message, and token on successful signin |
| 5 | Run the full Auth collection in Collection Runner, observe pass/fail for each request |

## How to Run

```bash
npm test tests/lecture-18/homework/starter.test.ts
```

**Goal:** 7 tests passing.

## Tips

- TODO 1: Call `axios.get(url)` WITHOUT `validateStatus` to a protected endpoint. Wrap in `try/catch`. The thrown error is an `AxiosError` — it has a `.response` property.
- TODO 2: First test: send `GET /currentuser` with `Cookie: ''` (empty string). Assert 401. Second test: use the captured `sessionCookie`. Assert 200.
- TODO 3: Add `console.log(res.data)` before your assertion. Run the test. Read the output. Then delete the log line.
- TODO 4: Send `POST /signin` with `username: 'x'` (too short). Use `expectRejected(res.status)` — not `.toBe(400)` alone.
- TODO 5: Make two separate `axios.get` calls with the same `sessionCookie`. Assert both return 200.
- TODO 6: Use `/\S+/` regex — matches any non-empty string. Guard with `if (res.status === 400)` to handle rate limiting.
- TODO 7: Use `.toBeTypeOf('string')` — works on the `token` field in `res.data`. Guard with `if (token)` to handle rate limiting gracefully.

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-18-debugging
git checkout -b lecture-18-debugging-homework

# Make sure tests pass first
npm test tests/lecture-18/homework/starter.test.ts

# Stage and commit
git add tests/lecture-18/homework/starter.test.ts
git commit -m "lecture-18: homework complete — 7 tests passing"
git push -u origin lecture-18-debugging-homework
```

### Open a Pull Request

- Base branch: `lecture-18-debugging` (or `main` after it is merged)
- Compare: `lecture-18-debugging-homework`
- Title: `lecture-18: homework complete — 7 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.

---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that is fine!
   The important thing is understanding WHY the solution works.
