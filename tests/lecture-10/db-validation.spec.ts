// Lecture 10 — MongoDB: Cross-Validating API vs Database
//
// Prerequisites:
//   DATABASE_URL must be set in .env (MongoDB Atlas connection string)
//   Add DATABASE_URL to vitest.config.ts env: {} and src/config.ts
//
// Run: npm test tests/lecture-10/db-validation.spec.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { MongoClient } from 'mongodb';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signupUrl = `${config.BASE_URL}/signup`;

// MongoDB connection
let mongoClient: MongoClient;
let db: ReturnType<MongoClient['db']>;

// Test user created via API
let apiAuthId = '';
let apiUserId = '';
let apiUser: Record<string, unknown> = {};

const testUsername  = `vitest${faker.string.alphanumeric(8).toLowerCase()}`;
const testEmail     = faker.internet.email().toLowerCase();

beforeAll(async () => {
  // Connect to MongoDB
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not set in .env — see README §3');

  mongoClient = new MongoClient(databaseUrl);
  await mongoClient.connect();
  db = mongoClient.db();

  // Create a test user via API
  const signupRes = await axios.post(signupUrl, {
    username: testUsername,
    email: testEmail,
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });

  apiUser   = signupRes.data.user ?? {};
  apiAuthId = (signupRes.data.user?.authId as string) ?? '';
  apiUserId = (signupRes.data.user?._id as string)    ?? '';

  // Wait for the Bull queue to flush the signup to MongoDB
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  // Delete test user via API
  if (apiAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${apiAuthId}`, {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
      validateStatus: () => true,
    });
  }

  // Close MongoDB connection
  await mongoClient.close();
});

// ─── 1. MongoDB connection ────────────────────────────────────────────────────

describe('1. MongoDB connection', () => {

  it('MongoClient connected successfully', () => {
    // If connection failed, beforeAll would have thrown
    // This test passing means the connection is alive
    expect(db).toBeDefined();
  });

  it('Auth collection is accessible', async () => {
    const authColl = db.collection('Auth');
    const count = await authColl.countDocuments();
    expect(count).toBeGreaterThan(0);
  });

});

// ─── 2. Cross-validate Auth collection ───────────────────────────────────────
//
// After creating a user via the API, query the Auth collection directly.
// The DB document should match what the API returned.

describe('2. Cross-validate Auth collection', () => {
  let dbAuthDoc: Record<string, unknown> | null = null;

  beforeAll(async () => {
    const authColl = db.collection('Auth');
    dbAuthDoc = await authColl.findOne({ email: testEmail }) as Record<string, unknown> | null;
  });

  it('Auth document exists in DB', () => {
    expect(dbAuthDoc).not.toBeNull();
  });

  it('DB email matches API email', () => {
    expect(dbAuthDoc?.email).toBe(testEmail);
  });

  it('DB username matches API username (title-cased)', () => {
    const expected = testUsername.charAt(0).toUpperCase() + testUsername.slice(1).toLowerCase();
    expect((dbAuthDoc?.username as string)?.toLowerCase()).toBe(expected.toLowerCase());
  });

  it('DB _id matches API authId', () => {
    expect(dbAuthDoc?._id?.toString()).toBe(apiAuthId);
  });

  it('DB password is hashed (not the plain-text TEST_PASSWORD)', () => {
    // The DB stores a bcrypt hash — it should NOT equal the original password
    expect(dbAuthDoc?.password).toBeDefined();
    expect(dbAuthDoc?.password).not.toBe(TEST_PASSWORD);
    // Bcrypt hashes start with $2b$ or $2a$
    expect((dbAuthDoc?.password as string).startsWith('$2')).toBe(true);
  });

});

// ─── 3. Cross-validate User collection ───────────────────────────────────────
//
// The User document (in the 'User' collection) stores profile data.
// It references the Auth document via 'authId'.

describe('3. Cross-validate User collection', () => {
  let dbUserDoc: Record<string, unknown> | null = null;

  beforeAll(async () => {
    const userColl = db.collection('User');
    dbUserDoc = await userColl.findOne({
      authId: { $exists: true },
      _id: { $exists: true }
    }) as Record<string, unknown> | null;

    // Find by the User _id from the API response
    const { ObjectId } = await import('mongodb');
    if (apiUserId) {
      dbUserDoc = await userColl.findOne({ _id: new ObjectId(apiUserId) }) as Record<string, unknown> | null;
    }
  });

  it('User document exists in DB', () => {
    expect(dbUserDoc).not.toBeNull();
  });

  it('User document authId matches API authId', () => {
    expect(dbUserDoc?.authId?.toString()).toBe(apiAuthId);
  });

  it('User document does NOT have a password field', () => {
    // Password is only in Auth collection, not User collection
    expect(dbUserDoc).not.toHaveProperty('password');
  });

});

// ─── 4. Assertion variants ───────────────────────────────────────────────────
//
// New assertion types introduced here:
//   toMatch(/regex/)           — asserts string matches a regular expression
//   toStrictEqual(value)       — deep equality that also checks object types
//   toBeTypeOf('string')       — Vitest-specific runtime type check

describe('4. Assertion variants', () => {

  it('apiAuthId matches MongoDB ObjectId format (toMatch regex)', () => {
    // toMatch accepts a RegExp and asserts the string conforms to the pattern.
    // A MongoDB ObjectId is always 24 lowercase hex characters — nothing more, nothing less.
    // This is more precise than checking .length === 24 alone.
    expect(apiAuthId).toMatch(/^[a-f0-9]{24}$/);
  });

  it('DB username lowercased strictly equals API username lowercased (toStrictEqual)', async () => {
    const authColl = db.collection('Auth');
    const dbDoc = await authColl.findOne({ email: testEmail });
    // toStrictEqual is stricter than toEqual: it also checks object types and
    // treats undefined properties differently. For primitive string comparison
    // both matchers behave identically — using toStrictEqual signals deliberate intent.
    expect((dbDoc?.username as string)?.toLowerCase()).toStrictEqual(testUsername.toLowerCase());
  });

  it('DB Auth _id.toString() is a string (toBeTypeOf)', async () => {
    const authColl = db.collection('Auth');
    const dbDoc = await authColl.findOne({ email: testEmail });
    // MongoDB ObjectIds are BSON objects, not plain strings.
    // Calling .toString() converts them to the 24-char hex string.
    // toBeTypeOf confirms the result is actually a string (not an ObjectId instance).
    expect(dbDoc?._id?.toString()).toBeTypeOf('string');
  });

});

// ─── 5. API response vs DB — key differences ─────────────────────────────────
//
// Some fields differ between API response and DB:
//   - API user.password: absent (stripped before response)
//   - DB Auth.password: present (bcrypt hash)
//   - API user._id: User document ID
//   - API user.authId: Auth document ID

describe('5. API response vs DB — key differences', () => {

  it('API response has no password, DB Auth has hashed password', async () => {
    // API: no password
    expect(apiUser).not.toHaveProperty('password');

    // DB: has hashed password
    const authColl = db.collection('Auth');
    const dbDoc = await authColl.findOne({ email: testEmail });
    expect(dbDoc?.password).toBeDefined();
    expect(typeof dbDoc?.password).toBe('string');
  });

  it('API user._id is the User collection document ID', async () => {
    const { ObjectId } = await import('mongodb');
    const userColl = db.collection('User');
    const doc = await userColl.findOne({ _id: new ObjectId(apiUserId) });
    expect(doc).not.toBeNull();
  });

  it('API user.authId is the Auth collection document ID', async () => {
    const { ObjectId } = await import('mongodb');
    const authColl = db.collection('Auth');
    const doc = await authColl.findOne({ _id: new ObjectId(apiAuthId) });
    expect(doc).not.toBeNull();
  });

});
