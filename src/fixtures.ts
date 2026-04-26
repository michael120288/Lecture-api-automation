// Shared test fixtures — constants used across multiple lectures.
// Import from here instead of redefining in each test file.

/**
 * A 10×10 solid blue PNG (#4a90e2) used as the test avatar image.
 *
 * Why we need this:
 *   The Chatty signup endpoint uploads the avatarImage to Cloudinary.
 *   Cloudinary requires a valid image — it rejects empty strings or fake data.
 *
 * Why 10×10 instead of 1×1:
 *   A 1×1 pixel image renders as a broken-looking placeholder in the browser.
 *   A 10×10 pixel image renders as a visible colored square — easier to
 *   distinguish test account photos in the Chatty UI.
 *
 * Color matches TEST_AVATAR_COLOR (#4a90e2 — blue).
 */
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGPwmvAID2IYlcaGAM6+rXFsLAOFAAAAAElFTkSuQmCC';

/**
 * A fixed avatar colour used in signup tests.
 * Any non-empty string passes Joi validation — the server stores it as-is.
 */
export const TEST_AVATAR_COLOR = '#4a90e2';

/**
 * A fixed password that meets Chatty's signup requirements:
 *   - min 12 chars       ✅ (13 chars)
 *   - at least 1 upper   ✅ (V)
 *   - at least 1 lower   ✅ (itest)
 *   - at least 1 digit   ✅ (123456)
 *   - at least 1 special ✅ (@)
 *
 * Use this in tests instead of faker.internet.password() because Faker
 * doesn't know about Chatty's specific password pattern requirements.
 */
export const TEST_PASSWORD = 'Vitest@123456';

/**
 * The hardcoded value for the x-test-secret header.
 * Must match CLEANUP_HEADER_VALUE in chatty-backend/src/features/auth/controllers/test-cleanup.ts
 * No env var needed — the value is fixed in both codebases.
 */
export const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';

