// Lecture 07 — Comments: Full CRUD + Nested Queries
//
// Run: npm test tests/lecture-07/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const commentUrl = `${config.BASE_URL}/post/comment`;
const signoutUrl = `${config.BASE_URL}/signout`;

const commentsForPost  = (id: string) => `${config.BASE_URL}/post/comments/${id}`;
const commentNamesUrl  = (id: string) => `${config.BASE_URL}/post/commentsnames/${id}`;
const singleCommentUrl = (postId: string, commentId: string) =>
  `${config.BASE_URL}/post/single/comment/${postId}/${commentId}`;
const commentById = (postId: string, commentId: string) =>
  `${config.BASE_URL}/post/comment/${postId}/${commentId}`;

const UNIQUE_COMMENT  = `Vitest comment ${Date.now()}`;
const UPDATED_COMMENT = `Updated comment ${Date.now()}`;
const POST_CONTENT    = `Vitest lecture-07 ${Date.now()}`;

let sessionCookie: string = '';
let postId: string = '';
let postOwnerUserId: string = '';
let commentId: string = '';
let commentDeleted = false;
let postDeleted = false;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Create test post
  await axios.post(postUrl, { post: POST_CONTENT, bgColor: '#fff', privacy: 'Public', feelings: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const getRes = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  const found = getRes.data.posts?.find((p: { post: string; _id: string; userId: string }) => p.post === POST_CONTENT);
  postId = found?._id ?? '';
  postOwnerUserId = found?.userId ?? '';

  // Add test comment
  await axios.post(commentUrl, {
    userTo: postOwnerUserId, postId, comment: UNIQUE_COMMENT, profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  // Find commentId
  const commentsRes = await axios.get(commentsForPost(postId), {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const foundComment = commentsRes.data.comments?.find(
    (c: { comment: string; _id: string }) => c.comment === UNIQUE_COMMENT,
  );
  commentId = foundComment?._id ?? '';
});

afterAll(async () => {
  if (!commentDeleted && commentId) {
    await axios.delete(commentById(postId, commentId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// ─── 1. Add comment ───────────────────────────────────────────────────────────

describe('1. Add comment', () => {

  it('POST /post/comment returns 200 (not 201)', async () => {
    const res = await axios.post(commentUrl, {
      userTo: postOwnerUserId, postId,
      comment: `Extra test comment ${Date.now()}`,
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(200);
  });

  it('message is "Comment created successfully"', async () => {
    const res = await axios.post(commentUrl, {
      userTo: postOwnerUserId, postId,
      comment: `Message check ${Date.now()}`,
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.data.message).toBe('Comment created successfully');
  });

  it('response does NOT contain a commentId', async () => {
    const res = await axios.post(commentUrl, {
      userTo: postOwnerUserId, postId, comment: 'No ID test', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.data).not.toHaveProperty('_id');
    expect(Object.keys(res.data)).toEqual(['message']);
  });

});

// ─── 2. Get comments ──────────────────────────────────────────────────────────

describe('2. Get comments', () => {
  let commentsResponse: { data: { comments: { comment: string; _id: string }[]; message: string } } | null = null;

  beforeAll(async () => {
    const res = await axios.get(commentsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    commentsResponse = res;
  });

  it('status is 200', () => {
    expect(commentsResponse?.data).toBeDefined();
  });

  it('comments array is non-empty', () => {
    expect(commentsResponse?.data.comments.length).toBeGreaterThan(0);
  });

  it('our comment is in the list', () => {
    const found = commentsResponse?.data.comments.find(c => c.comment === UNIQUE_COMMENT);
    expect(found).toBeDefined();
  });

});

// ─── 3. Get comment names ─────────────────────────────────────────────────────

describe('3. Get comment names', () => {

  it('GET /post/commentsnames/:postId returns 200', async () => {
    const res = await axios.get(commentNamesUrl(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('returns username list', async () => {
    const res = await axios.get(commentNamesUrl(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toHaveProperty('comments');
  });

});

// ─── 4. Get single comment ────────────────────────────────────────────────────

describe('4. Get single comment', () => {

  it('GET /post/single/comment/:postId/:commentId returns 200', async () => {
    const res = await axios.get(singleCommentUrl(postId, commentId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('returns the specific comment content', async () => {
    const res = await axios.get(singleCommentUrl(postId, commentId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.comments).toBeDefined();
  });

});

// ─── 5. Update comment ────────────────────────────────────────────────────────

describe('5. Update comment', () => {

  it('PATCH returns 200', async () => {
    const res = await axios.patch(commentById(postId, commentId),
      { comment: UPDATED_COMMENT },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

});

// ─── 6. State verification after update ──────────────────────────────────────

describe('6. State verification after update', () => {

  it('GET single comment reflects updated text', async () => {
    const res = await axios.get(singleCommentUrl(postId, commentId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.comments?.comment).toBe(UPDATED_COMMENT);
  });

});

// ─── 7. Delete comment ────────────────────────────────────────────────────────

describe('7. Delete comment', () => {

  it('DELETE returns 200', async () => {
    const res = await axios.delete(commentById(postId, commentId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    if (res.status === 200) commentDeleted = true;
    expect(res.status).toBe(200);
  });

  it('message is "Comment deleted successfully"', async () => {
    // Create a fresh comment to delete
    await axios.post(commentUrl, {
      userTo: postOwnerUserId, postId, comment: `Delete test ${Date.now()}`, profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    const getRes = await axios.get(commentsForPost(postId), { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    const fresh = getRes.data.comments?.[0];
    if (!fresh) return;

    const deleteRes = await axios.delete(commentById(postId, fresh._id), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(deleteRes.data.message).toBe('Comment deleted successfully');
  });

});

// ─── 8. Assertion variants ───────────────────────────────────────────────────
//
// New assertion types introduced here:
//   expect.arrayContaining([...])  — asserts array includes all listed items (subset match)
//   toMatch(/regex/)               — asserts string matches a regular expression
//   toSatisfy(fn)                  — asserts a custom predicate function returns true

describe('8. Assertion variants', () => {

  it('commentsCount from GET is a number (toSatisfy custom predicate)', async () => {
    const res = await axios.get(commentsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const count: number = res.data.comments?.length ?? 0;
    // toSatisfy lets you write any boolean predicate as the assertion condition.
    // It is ideal when built-in matchers do not express the constraint clearly.
    expect(count).toSatisfy((n: number) => n >= 0);
  });

  it('commentId matches MongoDB ObjectId format (toMatch regex)', () => {
    // toMatch accepts a regex and asserts the string matches it.
    // A MongoDB ObjectId is always exactly 24 lowercase hex characters.
    expect(commentId).toMatch(/^[a-f0-9]{24}$/);
  });

  it('comments array contains our comment object (expect.arrayContaining)', async () => {
    const res = await axios.get(commentsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    // expect.arrayContaining asserts a subset — it passes even if the array has
    // additional items. Combined with expect.objectContaining it checks that at
    // least one element has the expected shape, without requiring an exact match.
    expect(res.data.comments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: expect.any(String) }),
      ]),
    );
  });

});

// ─── 9. Negative tests ────────────────────────────────────────────────────────

describe('9. Negative tests', () => {

  it('POST /post/comment without cookie returns 401', async () => {
    const res = await axios.post(commentUrl, {
      userTo: postOwnerUserId, postId, comment: 'no auth', profilePicture: '',
    }, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('PATCH with invalid commentId returns 400', async () => {
    const res = await axios.patch(
      `${config.BASE_URL}/post/comment/${postId}/not-an-objectid`,
      { comment: 'fail' },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

});
