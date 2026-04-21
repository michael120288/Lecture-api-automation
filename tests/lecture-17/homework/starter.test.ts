// Lecture 17 — Homework (starter)
// Run: npm test tests/lecture-17/homework/starter.test.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../../src/fixtures';

let cookieA = '';
let userBId = '';
let userBAuthId = '';
let userBUsername = '';
let userBAvatarColor = '';
let conversationId = '';

beforeAll(async () => {
  const r = await axios.post(`${config.BASE_URL}/signin`, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  cookieA = Array.isArray(raw) ? raw[0] : (raw ?? '');

  const s = await axios.post(`${config.BASE_URL}/signup`, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD, avatarColor: TEST_AVATAR_COLOR, avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });
  userBId = s.data.user?._id ?? '';
  userBAuthId = s.data.user?.authId ?? '';
  userBUsername = s.data.user?.username ?? '';
  userBAvatarColor = s.data.user?.avatarColor ?? '';
});

afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${userBAuthId}`,
      { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  }
  await axios.post(`${config.BASE_URL}/signout`, {}, { headers: { Cookie: cookieA }, validateStatus: () => true });
});

// TODO 1 — Send first message to user B (no conversationId). Assert status 200 and save conversationId.
it('send first message returns 200', async () => {
  // write your code here
  // Hint: response.data.conversationId
});

// TODO 2 — GET /chat/message/conversation-list. Assert status 200 and list is array.
it('GET conversation-list returns array', async () => {
  // write your code here
});

// TODO 3 — GET /chat/message/user/:userBId. Assert messages is array.
it('GET messages with user B returns array', async () => {
  // write your code here
});

// TODO 4 — PUT /chat/message/mark-as-read with senderId=userBId. Assert status 200.
it('mark as read returns 200', async () => {
  // write your code here
});

// TODO 5 — .then() style: send a second message WITH conversationId. Assert status 200.
it('second message with conversationId — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 6 — GET /chat/message/user/:userBId. Take the first message in the array.
// Assert it matches expect.objectContaining({ _id: expect.any(String), body: expect.any(String) }).
// objectContaining checks the object has AT LEAST these keys — extra fields are fine.
it('expect.objectContaining — message has _id and body fields', async () => {
  // write your code here
});

// TODO 7 — GET /chat/message/user/:userBId. Take the first message's body.
// Assert it passes toSatisfy((b: string) => b.length > 0).
// toSatisfy is useful when you need a condition a single built-in matcher can't express.
it('toSatisfy — message body is non-empty', async () => {
  // write your code here
});
