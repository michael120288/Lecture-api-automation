# Homework — Lecture 10: MongoDB — Cross-Validating API vs Database

> **Goal:** Connect to MongoDB Atlas, find a user in the Auth collection, cross-validate API response vs DB document.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | MongoClient connection setup |
| TODO 2 | `findOne()` by email |
| TODO 3 | Cross-validation — API response vs DB |
| TODO 4 | Security: password never in API |
| TODO 5 | `.then()` with MongoDB promise |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | Signup → compare response vs GET /currentuser — same email/username |
| 2 | Signup response: `authId` exists, `password` does NOT |
| 3 | GET /currentuser: `authId` exists, `password` does NOT |
| 4 | `user._id` !== `user.authId` — two different ObjectIds |
| 5 | Cleanup → try signin → 400 (user is gone) |

## How to Run

```bash
npm test tests/lecture-10/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- Add `DATABASE_URL` to `.env` and whitelist your IP in MongoDB Atlas before running
- `db.collection("Auth")` — collection name is capital "A" in Chatty
- Use `new ObjectId(apiUserId)` when querying by `_id` — strings don't work for ObjectId fields

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-10-mongodb
git checkout -b lecture-10-mongodb-homework

# Make sure tests pass first
npm test tests/lecture-10/homework/starter.test.ts

# Stage and commit
git add tests/lecture-10/homework/starter.test.ts
git commit -m "lecture-10: homework complete — 5 tests passing"
git push -u origin lecture-10-mongodb-homework
```

### Open a Pull Request

- Base branch: `lecture-10-mongodb` (or `main` after it's merged)
- Compare: `lecture-10-mongodb-homework`
- Title: `lecture-10: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
