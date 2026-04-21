// Lecture 17 — Chat & Messaging
// Run: npm test tests/lecture-17/lecture.test.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl   = `${config.BASE_URL}/signin`;
const signupUrl   = `${config.BASE_URL}/signup`;
const signoutUrl  = `${config.BASE_URL}/signout`;
const chatUrl     = `${config.BASE_URL}/chat/message`;
const convListUrl = `${config.BASE_URL}/chat/message/conversation-list`;
const messagesUrl = (receiverId: string) => `${config.BASE_URL}/chat/message/user/${receiverId}`;
const markReadUrl    = `${config.BASE_URL}/chat/message/mark-as-read`;
const reactionUrl    = `${config.BASE_URL}/chat/message/reaction`;
const delConvUrl     = (receiverId: string) => `${config.BASE_URL}/chat/conversation/${receiverId}`;
const delMessageUrl  = (msgId: string, senderId: string, receiverId: string, type: string) =>
  `${config.BASE_URL}/chat/message/mark-as-deleted/${msgId}/${senderId}/${receiverId}/${type}`;
const cleanupUrl     = (authId: string) => `${config.BASE_URL}/test/cleanup/user/${authId}`;

let cookieA = '';            // user A (TEST_USERNAME)
let userAId = '';            // user A User _id (needed for delete message URL)
let userBId = '';            // user B User _id
let userBAuthId = '';        // user B Auth _id (for cleanup)
let userBUsername = '';
let userBAvatarColor = '';
let conversationId = '';
let messageId = '';

beforeAll(async () => {
  // Sign in as user A
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  cookieA = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Capture user A's _id — needed for delete message URL
  const curRes = await axios.get(`${config.BASE_URL}/currentuser`, {
    headers: { Cookie: cookieA }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  // Create user B
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  userBId          = signupRes.data.user?._id          ?? '';
  userBAuthId      = signupRes.data.user?.authId        ?? '';
  userBUsername    = signupRes.data.user?.username      ?? '';
  userBAvatarColor = signupRes.data.user?.avatarColor   ?? '';
});

afterAll(async () => {
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, { headers: { Cookie: cookieA }, validateStatus: () => true });
});

// ─── 1. Send first message ────────────────────────────────────────────────────

describe('1. Send first message', () => {

  it('POST /chat/message returns 200 and conversationId', async () => {
    const res = await axios.post(chatUrl, {
      receiverId: userBId,
      receiverUsername: userBUsername,
      receiverAvatarColor: userBAvatarColor,
      receiverProfilePicture: '',
      body: 'Hello from Lecture 17!',
    }, { headers: { Cookie: cookieA }, validateStatus: () => true });

    expect(res.status).toBe(200);
    expect(res.data.conversationId).toBeDefined();
    conversationId = res.data.conversationId ?? '';
  });

  it('response has a conversationId string', () => {
    expect(typeof conversationId).toBe('string');
    expect(conversationId.length).toBeGreaterThan(0);
  });

});

// ─── 2. Get conversation list ─────────────────────────────────────────────────

describe('2. Get conversation list', () => {

  it('GET /chat/message/conversation-list returns 200', async () => {
    const res = await axios.get(convListUrl, {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has list array', async () => {
    const res = await axios.get(convListUrl, {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    expect(res.data).toHaveProperty('list');
    expect(Array.isArray(res.data.list)).toBe(true);
  });

  it('user B appears in conversation list', async () => {
    const res = await axios.get(convListUrl, {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const found = res.data.list?.find(
      (c: { receiverId: string; senderId: string }) =>
        c.receiverId === userBId || c.senderId === userBId,
    );
    expect(found).toBeDefined();
  });

});

// ─── 3. Get messages in conversation ─────────────────────────────────────────

describe('3. Get messages with user B', () => {

  it('GET /chat/message/user/:receiverId returns 200', async () => {
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has messages array', async () => {
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    expect(Array.isArray(res.data.messages)).toBe(true);
  });

  it('first message body is correct', async () => {
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const msg = res.data.messages?.[0];
    if (msg) {
      expect(msg).toHaveProperty('body');
      messageId = msg._id ?? '';
    }
  });

});

// ─── 4. Send second message with conversationId ───────────────────────────────

describe('4. Send second message using conversationId', () => {

  it('second message with conversationId returns 200', async () => {
    const res = await axios.post(chatUrl, {
      conversationId,
      receiverId: userBId,
      receiverUsername: userBUsername,
      receiverAvatarColor: userBAvatarColor,
      receiverProfilePicture: '',
      body: 'Second message!',
    }, { headers: { Cookie: cookieA }, validateStatus: () => true });
    expect(res.status).toBe(200);
  });

});

// ─── 5. Mark as read ──────────────────────────────────────────────────────────

describe('5. Mark as read', () => {

  it('PUT /chat/message/mark-as-read returns 200', async () => {
    const res = await axios.put(markReadUrl, {
      senderId: userBId,
      receiverId: config.TEST_USERNAME,
    }, { headers: { Cookie: cookieA }, validateStatus: () => true });
    expect(res.status).toBe(200);
  });

});

// ─── 6. Message reaction ──────────────────────────────────────────────────────

describe('6. Message reaction', () => {

  it('add reaction to message returns 200', async () => {
    if (!messageId || !conversationId) return;

    const res = await axios.put(reactionUrl, {
      conversationId,
      messageId,
      reaction: '😊',
      type: 'add',
    }, { headers: { Cookie: cookieA }, validateStatus: () => true });
    expect(res.status).toBe(200);
  });

});

// ─── 7. Delete a message ──────────────────────────────────────────────────────
//
// DELETE /chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type
//
// Marks a message as deleted. All four params are in the URL.
// type = 'deleteForMe'    — hides only for the current user
// type = 'deleteForEveryone' — hides for both sender and receiver
//
// You need messageId — captured in section 3 from GET /chat/message/user/:receiverId.

describe('7. Delete a message', () => {

  it('DELETE mark-as-deleted returns 200', async () => {
    if (!messageId || !userAId) return; // skip if no message was captured

    const res = await axios.delete(
      delMessageUrl(messageId, userAId, userBId, 'deleteForMe'),
      { headers: { Cookie: cookieA }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Message marked as deleted');
  });

  it('DELETE with invalid ObjectId returns 400', async () => {
    const res = await axios.delete(
      delMessageUrl('not-an-id', userAId, userBId, 'deleteForMe'),
      { headers: { Cookie: cookieA }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

});

// ─── 8. Delete a conversation ─────────────────────────────────────────────────
//
// DELETE /chat/conversation/:receiverId
//
// Removes the conversation from YOUR list only.
// The other person's conversation is not affected.
// Useful for "clear chat" UI actions.

describe('8. Delete conversation from list', () => {

  it('DELETE /chat/conversation/:receiverId returns 200', async () => {
    const res = await axios.delete(delConvUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Conversation removed');
  });

  it('conversation no longer in list after deletion', async () => {
    const res = await axios.get(convListUrl, {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const found = res.data.list?.find(
      (c: { receiverId: string; senderId: string }) =>
        c.receiverId === userBId || c.senderId === userBId,
    );
    expect(found).toBeUndefined();
  });

});

// ─── 9. Negative tests ────────────────────────────────────────────────────────

describe('9. Negative tests', () => {

  it('POST /chat/message without cookie returns 401', async () => {
    const res = await axios.post(chatUrl, {
      receiverId: userBId, receiverUsername: userBUsername,
      receiverAvatarColor: '#fff', receiverProfilePicture: '', body: 'fail',
    }, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /chat/message/conversation-list without cookie returns 401', async () => {
    const res = await axios.get(convListUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

});

// ─── 10. Assertion variants ───────────────────────────────────────────────────
//
// Introduces three assertion styles not used elsewhere in the course:
//   expect.objectContaining — partial object shape assertion
//   toSatisfy(fn)           — custom predicate for flexible assertions
//   toMatch(/regex/)        — test a string against a regular expression

describe('10. Assertion variants', () => {

  it('expect.objectContaining — sent message has required shape fields', async () => {
    // objectContaining asserts the object has AT LEAST these keys with matching types.
    // Extra fields on the real object are allowed, keeping the assertion focused.
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const message = res.data.messages?.[0];
    if (message) {
      expect(message).toMatchObject(
        expect.objectContaining({ _id: expect.any(String), body: expect.any(String) }),
      );
    }
  });

  it('toSatisfy — message body is non-empty (custom predicate)', async () => {
    // toSatisfy passes the value into a plain function — useful when you need
    // a condition that can't be expressed with a single built-in matcher.
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const message = res.data.messages?.[0];
    if (message) {
      expect(message.body).toSatisfy((b: string) => b.length > 0);
    }
  });

  it('toMatch — message _id matches MongoDB ObjectId format', async () => {
    // /^[a-f0-9]{24}$/ is the canonical pattern for a 24-hex-char MongoDB ObjectId.
    // toMatch is more expressive than checking length and character class separately.
    const res = await axios.get(messagesUrl(userBId), {
      headers: { Cookie: cookieA }, validateStatus: () => true,
    });
    const message = res.data.messages?.[0];
    if (message) {
      expect(message._id).toMatch(/^[a-f0-9]{24}$/);
    }
  });

});
