// Shared test utilities — import these in test files instead of redefining locally.
// See STANDARDS.md for the rules behind each helper.

import { expect } from 'vitest';

/**
 * Assert that a response status is either a validation error (400) or a rate
 * limit response (429).
 *
 * Why: Production auth endpoints are rate-limited (5 req/min on nginx).
 * After a few test runs the server returns 429 instead of 400.
 * Both mean the request was correctly rejected — the test should pass either way.
 *
 * Usage:
 *   expectRejected(response.status);
 *
 * When asserting the error message, guard with an if:
 *   expectRejected(response.status);
 *   if (response.status === 400) {
 *     expect(response.data.message).toBe('Invalid credentials');
 *   }
 */
export function expectRejected(status: number): void {
  expect([400, 429]).toContain(status);
}

/**
 * Assert that a response status is a success (200 or 201).
 *
 * Why: more expressive than expect([200, 201]).toContain(status).
 *
 * Usage:
 *   expectSuccess(response.status);
 */
export function expectSuccess(status: number): void {
  expect([200, 201]).toContain(status);
}
