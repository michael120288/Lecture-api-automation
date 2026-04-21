// Lecture 17 — Homework SOLUTION
// Run: npm test tests/lecture-17/homework/solution.test.ts

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

it('send first message returns 200', async () => {
  const res = await axios.post(`${config.BASE_URL}/chat/message`, {
    receiverId: userBId, receiverUsername: userBUsername,
    receiverAvatarColor: userBAvatarColor, receiverProfilePicture: '',
    body: 'Hello!',
  }, { headers: { Cookie: cookieA }, validateStatus: () => true });
  expect(res.status).toBe(200);
  conversationId = res.data.conversationId ?? '';
  expect(conversationId.length).toBeGreaterThan(0);
});

it('GET conversation-list returns array', async () => {
  const res = await axios.get(`${config.BASE_URL}/chat/message/conversation-list`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.list)).toBe(true);
});

it('GET messages with user B returns array', async () => {
  const res = await axios.get(`${config.BASE_URL}/chat/message/user/${userBId}`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  expect(Array.isArray(res.data.messages)).toBe(true);
});

it('mark as read returns 200', async () => {
  const res = await axios.put(`${config.BASE_URL}/chat/message/mark-as-read`, {
    senderId: userBId, receiverId: config.TEST_USERNAME,
  }, { headers: { Cookie: cookieA }, validateStatus: () => true });
  expect(res.status).toBe(200);
});

it('second message with conversationId — .then() style', () => {
  return axios.post(`${config.BASE_URL}/chat/message`, {
    conversationId,
    receiverId: userBId, receiverUsername: userBUsername,
    receiverAvatarColor: userBAvatarColor, receiverProfilePicture: '',
    body: 'Second message!',
  }, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(200);
  });
});

// Solution 6 — expect.objectContaining
// WHY objectContaining: it asserts the object has AT LEAST the listed keys with the
// correct types, without failing if the server adds extra fields. This makes the test
// resilient to API additions while still enforcing the contract for fields we care about.
it('expect.objectContaining — message has _id and body fields', async () => {
  const res = await axios.get(`${config.BASE_URL}/chat/message/user/${userBId}`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  const message = res.data.messages?.[0];
  if (message) {
    expect(message).toMatchObject(
      expect.objectContaining({ _id: expect.any(String), body: expect.any(String) }),
    );
  }
});

// Solution 7 — toSatisfy with custom predicate
// WHY toSatisfy: the condition "string is non-empty" could be tested with
// toBeGreaterThan(0) on the length, but toSatisfy keeps the assertion at the string
// level and makes the intent read naturally: "the body satisfies: length > 0".
it('toSatisfy — message body is non-empty', async () => {
  const res = await axios.get(`${config.BASE_URL}/chat/message/user/${userBId}`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  const message = res.data.messages?.[0];
  if (message) {
    expect(message.body).toSatisfy((b: string) => b.length > 0);
  }
});
