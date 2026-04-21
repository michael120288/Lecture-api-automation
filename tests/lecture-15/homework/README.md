# Homework — Lecture 15: Posts with Media — Images & Videos

> **Goal:** Create an image post, verify it appears in GET /post/images, update it, test validation.

---

## Vitest Homework

File: `starter.test.ts` · Solutions: `solution.test.ts`

| TODO | What it practices |
|------|------------------|
| TODO 1 | Image post creation |
| TODO 2 | Filtered GET — only image posts |
| TODO 3 | Update image on existing post |
| TODO 4 | Image validation |
| TODO 5 | `.then()` on filtered GET |

## Postman Homework

File: `postman-tasks.md` · Solutions: `postman-solution.md`

| Task | What to test |
|------|-------------|
| 1 | POST /post/image/post → 201, message |
| 2 | GET /post/images/1 → posts array, first post has non-empty `imgId` |
| 3 | PUT /post/image/:postId → 200, "Post with image updated successfully" |
| 4 | POST without image → 400, "Image is a required field" |
| 5 | GET /post/videos/1 → posts array (may be empty) |

## How to Run

```bash
npm test tests/lecture-15/homework/starter.test.ts
```

**Goal:** 5 tests passing.

## Tips

- Use `TEST_AVATAR_IMAGE` from `src/fixtures.ts` — fake base64 data fails Cloudinary with 400
- `imgId` is the Cloudinary public_id — non-empty string means the upload succeeded
- Image post tests are slower (~2-5s) due to Cloudinary upload — increase `testTimeout` if needed

---

## Git — Commit Your Homework

Homework gets its own branch, separate from the lecture branch.

```bash
# Create a homework branch from the lecture branch
git checkout lecture-15-posts-media
git checkout -b lecture-15-posts-media-homework

# Make sure tests pass first
npm test tests/lecture-15/homework/starter.test.ts

# Stage and commit
git add tests/lecture-15/homework/starter.test.ts
git commit -m "lecture-15: homework complete — 5 tests passing"
git push -u origin lecture-15-posts-media-homework
```

### Open a Pull Request

- Base branch: `lecture-15-posts-media` (or `main` after it's merged)
- Compare: `lecture-15-posts-media-homework`
- Title: `lecture-15: homework complete — 5 tests passing`

> **Why a separate branch?**
> Your homework PR shows only your solutions — not the lecture code mixed in.
> This makes it easier to review and keeps the lecture PR clean.
---

## Checking Your Solutions

1. Open `solution.test.ts` — read the **comment above each solution** first, then the code
2. Open `postman-solution.md` — compare your `pm.test()` scripts with the answers
3. If your assertion passes but you used a different approach — that's fine!
   The important thing is understanding WHY the solution works.
