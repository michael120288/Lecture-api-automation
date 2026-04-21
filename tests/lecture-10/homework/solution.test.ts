// Lecture 10 — Homework SOLUTION
// Run: npm test tests/lecture-10/homework/solution.test.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { MongoClient, ObjectId } from 'mongodb';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../../src/fixtures';

let client: MongoClient;
let db: ReturnType<MongoClient['db']>;
let apiAuthId = '';
let apiUserId = '';
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
  apiUserId = (res.data.user?._id as string) ?? '';
});

afterAll(async () => {
  if (apiAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiAuthId}`,
      { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  }
  await client.close();
});

it('MongoDB is connected', () => {
  expect(db).toBeDefined();
});

it('Auth collection has our user by email', async () => {
  const doc = await db.collection('Auth').findOne({ email });
  expect(doc?.email).toBe(email);
});

it('DB username matches API username', async () => {
  const doc = await db.collection('Auth').findOne({ email });
  expect((doc?.username as string)?.toLowerCase()).toBe(username.toLowerCase());
});

it('API has no password, DB has hashed password', async () => {
  expect(apiUser).not.toHaveProperty('password');
  const doc = await db.collection('Auth').findOne({ email });
  expect(typeof doc?.password).toBe('string');
  expect((doc?.password as string).startsWith('$2')).toBe(true);
});

it('User collection has the user by _id — .then() style', () => {
  return db.collection('User').findOne({ _id: new ObjectId(apiUserId) })
    .then(doc => {
      expect(doc).not.toBeNull();
    });
});

// Solution 6
// WHY toMatch with ObjectId regex: the API returns authId as a plain string.
// Asserting it matches /^[a-f0-9]{24}$/ does two things at once — it confirms
// the string is non-empty AND that it is a structurally valid MongoDB ObjectId.
// This is more precise than just checking .length === 24.
it('apiAuthId is a valid MongoDB ObjectId format (toMatch)', () => {
  expect(apiAuthId).toMatch(/^[a-f0-9]{24}$/);
});

// Solution 7
// WHY toStrictEqual vs toBe: for primitive strings they behave identically.
// Using toStrictEqual signals deliberate intent — we care about deep/strict
// equality, not just reference equality. It also serves as a teaching contrast
// to toEqual, making the difference between the two matchers explicit in context.
it('DB email strictly equals test email (toStrictEqual)', async () => {
  const doc = await db.collection('Auth').findOne({ email });
  expect(doc?.email).toStrictEqual(email);
});
