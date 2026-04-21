// Lecture 15 — Posts with Media: Images & Videos
// Run: npm test tests/lecture-15/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

const signinUrl     = `${config.BASE_URL}/signin`;
const signoutUrl    = `${config.BASE_URL}/signout`;
const postUrl       = `${config.BASE_URL}/post`;
const imagePostUrl  = `${config.BASE_URL}/post/image/post`;
const getAllUrl      = `${config.BASE_URL}/post/all/1`;
const imagesPageUrl = `${config.BASE_URL}/post/images/1`;
const updateImgUrl  = (id: string) => `${config.BASE_URL}/post/image/${id}`;

const IMAGE_POST_CONTENT = `Vitest image post ${Date.now()}`;
const PLAIN_POST_CONTENT = `Vitest plain post ${Date.now()}`;

let sessionCookie = '';
let imagePostId = '';
let plainPostId = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Create a plain post
  await axios.post(postUrl, {
    post: PLAIN_POST_CONTENT, bgColor: '#fff', privacy: 'Public', feelings: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  // Create an image post
  await axios.post(imagePostUrl, {
    post: IMAGE_POST_CONTENT,
    image: TEST_AVATAR_IMAGE,
    bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  // Find both post IDs
  const getRes = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  for (const p of (getRes.data.posts ?? []) as { post: string; _id: string; imgId: string }[]) {
    if (p.post === IMAGE_POST_CONTENT) imagePostId = p._id;
    if (p.post === PLAIN_POST_CONTENT) plainPostId = p._id;
  }
});

afterAll(async () => {
  for (const id of [imagePostId, plainPostId]) {
    if (id) await axios.delete(`${config.BASE_URL}/post/${id}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// ─── 1. Create image post ─────────────────────────────────────────────────────

describe('1. Create image post', () => {

  it('status is 201', async () => {
    const res = await axios.post(imagePostUrl, {
      post: `Vitest img check ${Date.now()}`,
      image: TEST_AVATAR_IMAGE,
      bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(201);
    // Clean up extra post
    const all = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    const extra = all.data.posts?.[0];
    if (extra?._id && extra?._id !== imagePostId) {
      await axios.delete(`${config.BASE_URL}/post/${extra._id}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    }
  });

  it('message is "Post created with image successfully"', async () => {
    const res = await axios.post(imagePostUrl, {
      post: `Vitest img msg ${Date.now()}`,
      image: TEST_AVATAR_IMAGE,
      bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.data.message).toBe('Post created with image successfully');
    const all = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    const extra = all.data.posts?.[0];
    if (extra?._id && extra._id !== imagePostId) {
      await axios.delete(`${config.BASE_URL}/post/${extra._id}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    }
  });

});

// ─── 2. Get posts with images ─────────────────────────────────────────────────

describe('2. GET /post/images/:page', () => {

  it('status is 200', async () => {
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has posts array', async () => {
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toHaveProperty('posts');
    expect(Array.isArray(res.data.posts)).toBe(true);
  });

  it('our image post appears in the list', async () => {
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.posts?.find((p: { _id: string }) => p._id === imagePostId);
    expect(found).toBeDefined();
  });

  it('plain post does NOT appear in images list', async () => {
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const plainInImages = res.data.posts?.find((p: { _id: string }) => p._id === plainPostId);
    expect(plainInImages).toBeUndefined();
  });

});

// ─── 3. Update post with image ────────────────────────────────────────────────

describe('3. Update post image', () => {

  it('PUT /post/image/:postId returns 200', async () => {
    const res = await axios.put(updateImgUrl(imagePostId), {
      post: 'Updated with new image',
      image: TEST_AVATAR_IMAGE,
      bgColor: '#f0f0f0', privacy: 'Public', feelings: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Post with image updated successfully');
  });

});

// ─── 4. Validation errors ─────────────────────────────────────────────────────

describe('4. Validation errors', () => {

  it('POST /post/image/post without image returns 400', async () => {
    const res = await axios.post(imagePostUrl, {
      post: 'No image here',
      bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(400);
  });

  it('POST /post/image/post with invalid image format returns 400', async () => {
    const res = await axios.post(imagePostUrl, {
      post: 'Bad image',
      image: 'not-a-valid-image',
      bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Image must be');
  });

  it('POST /post/image/post without cookie returns 401', async () => {
    const res = await axios.post(imagePostUrl, {
      post: 'No auth',
      image: TEST_AVATAR_IMAGE,
    }, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

});

// ─── 5. Assertion variants ────────────────────────────────────────────────────
//
// Introduces three assertion styles not used elsewhere in the course:
//   toMatch(/regex/)  — test a string against a regular expression
//   toBeGreaterThan   — numeric lower-bound check
//   toSatisfy(fn)     — custom predicate function for flexible assertions

describe('5. Assertion variants', () => {

  it('toMatch — profile picture URL starts with http or https', async () => {
    // toMatch(/^https?:\/\//) confirms the URL uses a proper web scheme.
    // Regex is more precise than toContain('http') which would miss the colon.
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const post = res.data.posts?.find((p: { imgVersion: string; imgId: string }) => p.imgId);
    if (post?.imgVersion) {
      const profilePictureUrl = `https://res.cloudinary.com/${post.imgId}/v${post.imgVersion}`;
      expect(profilePictureUrl).toMatch(/^https?:\/\//);
    }
  });

  it('toBeGreaterThan — image post list has at least one item', async () => {
    // toBeGreaterThan(0) is clearer than toBeGreaterThanOrEqual(1) for "non-empty" semantics.
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.posts?.length ?? 0).toBeGreaterThan(0);
  });

  it('toSatisfy — image post has a non-empty imgId (custom predicate)', async () => {
    // toSatisfy lets you express multi-condition checks as a plain function,
    // keeping the test readable without chaining multiple expects.
    const res = await axios.get(imagesPageUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const posts = res.data.posts ?? [];
    expect(posts).toSatisfy((arr: { imgId?: string }[]) =>
      arr.some(p => typeof p.imgId === 'string' && p.imgId.length > 0),
    );
  });

});
