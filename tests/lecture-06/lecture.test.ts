// Lecture 06 — Reactions: All Types & State Transitions
//
// Endpoints:
//   POST   /api/v1/post/reaction
//   GET    /api/v1/post/reactions/:postId
//   GET    /api/v1/post/single/reaction/username/:username/:postId
//   GET    /api/v1/post/reactions/username/:username
//   DELETE /api/v1/post/reaction/:postId/:previousReaction/:postReactions
//
// New concepts:
//   1. Reaction types: like | love | happy | sad | wow | angry
//   2. URL-encoded JSON in DELETE path param — encodeURIComponent(JSON.stringify(...))
//   3. State transitions: add → count+1, remove → count-1
//   4. userTo — post owner's userId for notification routing
//
// Run: npm test tests/lecture-06/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const reactionUrl = `${config.BASE_URL}/post/reaction`;
const signoutUrl = `${config.BASE_URL}/signout`;

const reactionsForPost = (postId: string) => `${config.BASE_URL}/post/reactions/${postId}`;
const singleReaction   = (username: string, postId: string) =>
  `${config.BASE_URL}/post/single/reaction/username/${username}/${postId}`;
const deleteReaction   = (postId: string, type: string, reactions: Record<string, number>) =>
  `${config.BASE_URL}/post/reaction/${postId}/${type}/${encodeURIComponent(JSON.stringify(reactions))}`;

const credentials = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD,
};

const POST_CONTENT = `Vitest lecture-06 post ${Date.now()}`;

// ─── File-level shared state ──────────────────────────────────────────────────

let sessionCookie: string = '';
let postId: string = '';
let postOwnerUserId: string = '';
let postDeleted = false;

const ZERO_REACTIONS = { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 };

beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Create a test post
  await axios.post(postUrl, { post: POST_CONTENT, bgColor: '#fff', privacy: 'Public', feelings: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  // Find post ID and owner userId
  const getRes = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const found = getRes.data.posts?.find((p: { post: string; _id: string; userId: string }) => p.post === POST_CONTENT);
  postId = found?._id ?? '';
  postOwnerUserId = found?.userId ?? '';
});

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// ─── 1. Add reaction ──────────────────────────────────────────────────────────

describe('1. Add reaction', () => {

  it('status is 200', async () => {
    const res = await axios.post(reactionUrl, {
      userTo: postOwnerUserId,
      postId,
      type: 'like',
      previousReaction: '',
      postReactions: ZERO_REACTIONS,
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(res.status).toBe(200);
  });

  it('message is "Reaction added successfully"', async () => {
    const res = await axios.post(reactionUrl, {
      userTo: postOwnerUserId,
      postId,
      type: 'like',
      previousReaction: '',
      postReactions: ZERO_REACTIONS,
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    expect(res.data.message).toBe('Reaction added successfully');
  });

});

// ─── 2. Get reactions ─────────────────────────────────────────────────────────
//
// After adding a reaction, GET /post/reactions/:postId returns:
// { message, reactions: [...], count }
// The 'reactions' array contains individual reaction documents.
// The 'count' is the total number of reactions.

describe('2. Get reactions', () => {

  it('GET /post/reactions/:postId returns status 200', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has reactions array and count', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toMatchObject({
      message: expect.any(String),
      reactions: expect.any(Array),
      count: expect.any(Number),
    });
  });

  it('count is at least 1 after adding a reaction', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.count).toBeGreaterThanOrEqual(1);
  });

});

// ─── 3. Get single reaction by username ──────────────────────────────────────
//
// GET /post/single/reaction/username/:username/:postId
// Returns the reaction made by a specific user on a specific post.

describe('3. Get single reaction by username', () => {

  it('returns status 200', async () => {
    const username = config.TEST_USERNAME;
    // Chatty title-cases usernames — match the format
    const titleCased = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    const res = await axios.get(singleReaction(titleCased, postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has reactions and count fields', async () => {
    const username = config.TEST_USERNAME;
    const titleCased = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    const res = await axios.get(singleReaction(titleCased, postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toHaveProperty('reactions');
    expect(res.data).toHaveProperty('count');
  });

});

// ─── 4. State verification — reaction count ───────────────────────────────────
//
// After adding a reaction:
//   - The reactions array is non-empty
//   - At least one reaction has type 'like'
//
// This mirrors the state verification pattern from Lectures 4 and 5.

describe('4. State verification — reaction present in list', () => {

  it('reactions array contains at least one entry', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.reactions.length).toBeGreaterThanOrEqual(1);
  });

  it('at least one reaction has type "like"', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const likeReaction = res.data.reactions.find((r: { type: string }) => r.type === 'like');
    expect(likeReaction).toBeDefined();
  });

});

// ─── 5. Remove reaction ───────────────────────────────────────────────────────
//
// DELETE /post/reaction/:postId/:previousReaction/:postReactions
//
// The third param is URL-encoded JSON of the current reaction counts.
// After adding 1 like: { like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }
//
// encodeURIComponent(JSON.stringify(...)) converts the object to a safe URL string.

describe('5. Remove reaction', () => {

  it('status is 200', async () => {
    const currentReactions = { like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 };
    const res = await axios.delete(
      deleteReaction(postId, 'like', currentReactions),
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

  it('message is "Reaction removed from post"', async () => {
    // Add a reaction first, then remove it
    await axios.post(reactionUrl, {
      userTo: postOwnerUserId, postId, type: 'love',
      previousReaction: '', postReactions: ZERO_REACTIONS, profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    const currentReactions = { like: 0, love: 1, happy: 0, sad: 0, wow: 0, angry: 0 };
    const res = await axios.delete(
      deleteReaction(postId, 'love', currentReactions),
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.data.message).toBe('Reaction removed from post');
  });

});

// ─── 6. Assertion variants ───────────────────────────────────────────────────
//
// New assertion types introduced here:
//   expect.stringContaining('...')  — asymmetric matcher: string includes substring
//   toBeTypeOf('string')            — Vitest-specific runtime type check
//   toBeGreaterThanOrEqual(n)       — numeric lower-bound check

describe('6. Assertion variants', () => {

  it('create comment message contains "successfully" (expect.stringContaining)', async () => {
    const res = await axios.post(reactionUrl, {
      userTo: postOwnerUserId,
      postId,
      type: 'happy',
      previousReaction: '',
      postReactions: ZERO_REACTIONS,
      profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

    // expect.stringContaining is an asymmetric matcher — it passes if the actual
    // string includes the given substring. More flexible than .toBe() because the
    // full message text can change without breaking the test.
    expect(res.data).toMatchObject({
      message: expect.stringContaining('successfully'),
    });
  });

  it('reaction count from GET is a number >= 0 (toBeGreaterThanOrEqual)', async () => {
    const res = await axios.get(reactionsForPost(postId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    // toBeGreaterThanOrEqual asserts a numeric lower bound without pinning the
    // exact value — useful when state may vary across test runs.
    expect(res.data.count).toBeGreaterThanOrEqual(0);
  });

  it('postId is a string (toBeTypeOf)', () => {
    // toBeTypeOf is Vitest-specific. It uses typeof under the hood and gives a
    // clearer error message than expect(typeof x).toBe('string').
    expect(postId).toBeTypeOf('string');
  });

});

// ─── 7. Negative tests ────────────────────────────────────────────────────────

describe('7. Negative tests', () => {

  it('POST /post/reaction without cookie returns 401', async () => {
    const res = await axios.post(reactionUrl, {
      userTo: postOwnerUserId, postId, type: 'like',
      previousReaction: '', postReactions: ZERO_REACTIONS, profilePicture: '',
    }, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /post/reactions/:postId with invalid ObjectId returns 400', async () => {
    const res = await axios.get(`${config.BASE_URL}/post/reactions/not-an-id`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });

});
