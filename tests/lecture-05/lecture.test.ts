// Lecture 05 — Posts: Full CRUD Flow
//
// Endpoints:
//   POST   /api/v1/post
//   GET    /api/v1/post/all/:page
//   PATCH  /api/v1/post/:postId
//   DELETE /api/v1/post/:postId
//
// New concepts:
//   1. Create endpoint that returns no ID — find it via GET
//   2. The full CRUD cycle: Create → Read → Update → Read again → Delete → Verify
//   3. Owner-only operations — PATCH/DELETE check who created the post
//   4. ObjectId validation — invalid ID format → 400
//   5. Cleanup flag — track deletion to avoid orphaned test data
//
// Run: npm test tests/lecture-05/lecture.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const signoutUrl = `${config.BASE_URL}/signout`;

const postByIdUrl = (id: string) => `${config.BASE_URL}/post/${id}`;

const credentials = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD,
};

// Unique content so we can find our post in the list after creation
const UNIQUE_CONTENT = `Vitest lecture-05 post ${Date.now()}`;
const UPDATED_CONTENT = `Vitest lecture-05 UPDATED ${Date.now()}`;

// ─── File-level shared state ──────────────────────────────────────────────────

let sessionCookie: string = '';
let postId: string = '';
let postDeleted = false;  // tracks deletion so afterAll can clean up if test fails

beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Create the test post
  await axios.post(postUrl, {
    post: UNIQUE_CONTENT,
    bgColor: '#ffffff',
    privacy: 'Public',
    feelings: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  // Find the post ID — the create response has no ID, so we search GET /post/all/1
  const getRes = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  const found = getRes.data.posts?.find((p: { post: string; _id: string }) => p.post === UNIQUE_CONTENT);
  postId = found?._id ?? '';
});

afterAll(async () => {
  // Clean up the post if the delete test failed or was skipped
  if (!postDeleted && postId) {
    await axios.delete(postByIdUrl(postId), {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  }

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── 1. Create post ───────────────────────────────────────────────────────────
//
// POST /post returns 201 with ONLY a success message.
// No post ID, no post data, no location header.
// This is a deliberate API design choice — the ID is generated server-side.
// To get the ID, you must call GET /post/all/:page (section 2).

describe('1. Create post', () => {

  let createResponse!: AxiosResponse;

  beforeAll(async () => {
    // Create a second post just to test the create response in isolation
    createResponse = await axios.post(postUrl, {
      post: `Vitest create-test ${Date.now()}`,
      bgColor: '#f0f0f0',
      privacy: 'Public',
      feelings: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    // Clean up this extra post after assertions
  });

  it('status is 201 Created', () => {
    expect(createResponse.status).toBe(201);
  });

  it('message is "Post created successfully"', () => {
    expect(createResponse.data.message).toBe('Post created successfully');
  });

  it('response does NOT contain a post ID (by design)', () => {
    // The API returns only { message } — no _id, no post object
    // This teaches us we must GET to find the ID
    expect(createResponse.data).not.toHaveProperty('_id');
    expect(createResponse.data).not.toHaveProperty('post');
    expect(Object.keys(createResponse.data)).toEqual(['message']);
  });

});

// ─── 2. Find the created post ─────────────────────────────────────────────────
//
// GET /post/all/1 returns the 10 most recent posts.
// Our post was created in beforeAll so it should be near the top.
// We find it by matching the unique content string.

describe('2. Find the created post', () => {
  let getAllResponse!: AxiosResponse;

  beforeAll(async () => {
    getAllResponse = await axios.get(getAllUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('GET /post/all/1 returns status 200', () => {
    expect(getAllResponse.status).toBe(200);
  });

  it('response contains posts array and totalPosts', () => {
    expect(getAllResponse.data).toMatchObject({
      message: expect.any(String),
      posts: expect.any(Array),
      totalPosts: expect.any(Number),
    });
  });

  it('our post appears in the list', () => {
    const found = getAllResponse.data.posts.find(
      (p: { post: string }) => p.post === UNIQUE_CONTENT,
    );
    expect(found).toBeDefined();
  });

  it('post has the correct structure', () => {
    const found = getAllResponse.data.posts.find(
      (p: { post: string }) => p.post === UNIQUE_CONTENT,
    );
    expect(found).toMatchObject({
      _id: expect.any(String),
      userId: expect.any(String),
      username: expect.any(String),
      post: UNIQUE_CONTENT,
      commentsCount: 0,
      reactions: expect.any(Object),
    });
  });

  it('all 6 reaction types start at 0', () => {
    const found = getAllResponse.data.posts.find(
      (p: { post: string }) => p.post === UNIQUE_CONTENT,
    );
    expect(found.reactions).toEqual({
      like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0,
    });
  });

});

// ─── 3. Update post ───────────────────────────────────────────────────────────
//
// PATCH /post/:postId — only the owner can update.
// Returns { message: "Post updated successfully" } — no post data.
// Must call GET to verify the change (state verification pattern from L4).

describe('3. Update post', () => {

  it('status is 200', async () => {
    const res = await axios.patch(postByIdUrl(postId), {
      post: UPDATED_CONTENT,
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(res.status).toBe(200);
  });

  it('message is "Post updated successfully"', async () => {
    const res = await axios.patch(postByIdUrl(postId), {
      post: UPDATED_CONTENT,
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(res.data.message).toBe('Post updated successfully');
  });

});

// ─── 4. State verification ────────────────────────────────────────────────────
//
// After updating, GET /post/all/1 must reflect the new content.
// The update writes to Redis immediately — so GET reads the updated version.

describe('4. State verification after update', () => {

  it('GET /post/all/1 shows the updated content', async () => {
    const res = await axios.get(getAllUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    const found = res.data.posts?.find(
      (p: { _id: string }) => p._id === postId,
    );

    expect(found).toBeDefined();
    expect(found.post).toBe(UPDATED_CONTENT);
  });

});

// ─── 5. Negative tests ────────────────────────────────────────────────────────

describe('5. Negative tests', () => {

  it('POST /post without cookie returns 401', async () => {
    const res = await axios.post(postUrl,
      { post: 'should fail' },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(401);
  });

  it('PATCH without cookie returns 401', async () => {
    const res = await axios.patch(postByIdUrl(postId),
      { post: 'should fail' },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(401);
  });

  it('PATCH with invalid ObjectId format returns 400', async () => {
    // MongoDB ObjectId must be a 24-character hex string
    // "not-an-objectid" fails the validateObjectId middleware
    const res = await axios.patch(
      `${config.BASE_URL}/post/not-an-objectid`,
      { post: 'should fail' },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

  it('DELETE with invalid ObjectId format returns 400', async () => {
    const res = await axios.delete(
      `${config.BASE_URL}/post/not-an-objectid`,
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

});

// ─── 6. Delete post ───────────────────────────────────────────────────────────
//
// DELETE /post/:postId — deletes from Redis + queues DB deletion.
// After deletion, the post should no longer appear in GET /post/all/1.

describe('6. Delete post', () => {

  it('status is 200', async () => {
    const res = await axios.delete(postByIdUrl(postId), {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    if (res.status === 200) postDeleted = true;  // signal afterAll: no cleanup needed
    expect(res.status).toBe(200);
  });

  it('message is "Post deleted successfully"', async () => {
    // Create a fresh post to delete for this test (main post already deleted above)
    const createRes = await axios.post(postUrl, {
      post: `Vitest delete-test ${Date.now()}`,
      bgColor: '#ffffff',
      privacy: 'Public',
      feelings: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(createRes.status).toBe(201);

    const getRes = await axios.get(getAllUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const fresh = getRes.data.posts?.[0];
    if (!fresh) return;

    const deleteRes = await axios.delete(postByIdUrl(fresh._id), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });

    expect(deleteRes.data.message).toBe('Post deleted successfully');
  });

  it('deleted post no longer appears in GET /post/all/1', async () => {
    const res = await axios.get(getAllUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    const found = res.data.posts?.find(
      (p: { _id: string }) => p._id === postId,
    );

    // The post should not be in the list
    expect(found).toBeUndefined();
  });

});

// ─── 7. Assertion variants ────────────────────────────────────────────────────
//
// Three assertion types not used elsewhere in this file:
//   expect.arrayContaining([…]) — assert an array contains all specified elements
//                                  (extra elements in the actual array are allowed)
//   toBeLessThanOrEqual(n)      — upper-bound range check, useful for page sizes
//   toBeTypeOf('string')        — Vitest-native type check, cleaner than typeof
//
// Needs its own beforeAll to GET the current posts list.

describe('7. Assertion variants', () => {
  let posts: Array<{ _id: string; post: string; userId: string }> = [];

  beforeAll(async () => {
    const res = await axios.get(getAllUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    posts = res.data.posts ?? [];
  });

  it('posts array contains objects with _id — expect.arrayContaining', () => {
    // expect.arrayContaining checks that EVERY listed element appears in the array.
    // expect.objectContaining inside it means "at least this shape" — extra fields allowed.
    // Together they assert: the array has at least one item that has an _id string field.
    expect(posts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: expect.any(String) }),
      ]),
    );
  });

  it('page 1 returns at most 10 posts — toBeLessThanOrEqual', () => {
    // The API is documented to return max 10 posts per page.
    // toBeLessThanOrEqual(10) is the correct upper-bound assertion for a page size.
    expect(posts.length).toBeLessThanOrEqual(10);
  });

  it('first post _id is of type string — toBeTypeOf', () => {
    // toBeTypeOf is Vitest-specific — it reads more naturally than
    // `expect(typeof posts[0]._id).toBe('string')` and gives a clearer failure message.
    if (posts.length === 0) return; // guard for empty list
    expect(posts[0]._id).toBeTypeOf('string');
  });

});
