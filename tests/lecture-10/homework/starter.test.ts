// Lecture 10 — Homework (starter)
// Run: npm test tests/lecture-10/homework/starter.test.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { MongoClient } from 'mongodb';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../../src/fixtures';

let client: MongoClient;
let db: ReturnType<MongoClient['db']>;
let apiAuthId = '';
let apiUser: Record<string, unknown> = {};
const email = faker.internet.email().toLowerCase();
const username = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  client = new MongoClient(url);
  await client.connect();
  db = client.db();

  const res = await axios.post(`${config.BASE_URL}/signup`, {
    username, email, password: TEST_PASSWORD, avatarColor: TEST_AVATAR_COLOR, avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });
  apiUser   = res.data.user ?? {};
  apiAuthId = (res.data.user?.authId as string) ?? '';
});

afterAll(async () => {
  if (apiAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiAuthId}`,
      { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  }
  await client.close();
});

// TODO 1 — Assert db is defined (MongoDB connected)
it('MongoDB is connected', () => {
  // write your code here
});

// TODO 2 — findOne in Auth collection by email. Assert dbDoc email matches the test email.
it('Auth collection has our user by email', async () => {
  // write your code here
});

// TODO 3 — Assert DB username matches API username (title-cased)
it('DB username matches API username', async () => {
  // write your code here
});

// TODO 4 — Assert API response has NO password, DB Auth document HAS a password (bcrypt)
it('API has no password, DB has hashed password', async () => {
  // write your code here
});

// TODO 5 — Using .then():
// Find user in User collection by apiUser._id (need ObjectId import)
// Assert the document is not null
it('User collection has the user by _id — .then() style', () => {
  // Hint: import { ObjectId } from 'mongodb'
  // write your code here — no async, must return promise
});

// TODO 6 — Assert that apiAuthId matches the MongoDB ObjectId regex using toMatch.
// A valid ObjectId is exactly 24 lowercase hex characters.
// Hint: expect(apiAuthId).toMatch(/^[a-f0-9]{24}$/)
it('apiAuthId is a valid MongoDB ObjectId format (toMatch)', () => {
  // write your code here

});

// TODO 7 — Find the Auth document by email in the DB.
// Assert that dbDoc.email strictly equals the test email using toStrictEqual.
// Hint: expect(dbDoc?.email).toStrictEqual(email)
it('DB email strictly equals test email (toStrictEqual)', async () => {
  // write your code here

});
