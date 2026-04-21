# Homework — Lecture 16: User Profile Pages & Image Management

> **Goal:** Test profile GET endpoints (own, by ID, profile+posts), suggestions, and image upload.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Own profile shape |
| TODO 2 | Suggestions — assert array, not count |
| TODO 3 | Profile picture upload |
| TODO 4 | Get uploaded images |
| TODO 5 | 3-param URL — `uId` concept |
| TODO 6 bonus | `.then()` style |
| TODO 7 | `expect.arrayContaining` + `toBeGreaterThanOrEqual` — images array shape and length |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | GET /user/profile → 200, user shape |
| 2 | GET /user/profile/user/suggestions → array |
| 3 | POST /images/profile → 200, "Image added successfully" |
| 4 | GET /images/:userId → images array |
| 5 | GET /user/profile/posts/:username/:userId/:uId → user + posts + totalPosts |

## How to Run

```bash
npm test tests/lecture-16/homework/starter.test.ts
```

**Goal:** 7 tests passing (TODO 6 is a bonus `.then()` style rewrite).

## Tips

- `uId` is from `currentuser.user.uId` — a 12-digit number string, NOT the MongoDB `_id`
- Suggestions are random — assert `Array.isArray(res.data.users)`, never assert a specific count or username
- `beforeAll` captures `userId`, `username`, and `uId` — all three needed for the profile+posts endpoint

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-16-user-profile-images
git checkout -b lecture-16-user-profile-images-homework

# Make sure tests pass first
npm test tests/lecture-16/homework/starter.test.ts

# Stage and commit
git add tests/lecture-16/homework/starter.test.ts
git commit -m "lecture-16: homework complete — 5 (6 bonus) tests passing"
git push -u origin lecture-16-user-profile-images-homework
```

### Open a Pull Request

- Base branch: `lecture-16-user-profile-images` (or `main` after it's merged)
- Compare: `lecture-16-user-profile-images-homework`
- Title: `lecture-16: homework complete — 5 (6 bonus) tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
