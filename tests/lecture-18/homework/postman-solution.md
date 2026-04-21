# Lecture 18 — Postman Homework SOLUTION

---

## Task 1 — Reproduce 401 intentionally, then fix it

### Part A — assert 401 without cookie
```js
pm.test('Status is 401 — no cookie sent', () => {
  pm.response.to.have.status(401);
});
```
> **WHY:** The server uses the `Cookie` header to identify the authenticated session.
> Without it, there is no way to know who is making the request — so the server rejects with 401.
> This is the most common mistake in Lectures 02–17: forgetting to add the Cookie header.

### Part B — assert 200 with cookie
```js
pm.test('Status is 200 — cookie present', () => {
  pm.response.to.have.status(200);
});
```
> **WHY the fix works:** `{{sessionCookie}}` was set by your signin request (Task 4 in earlier lectures).
> The server reads the cookie value, finds the matching session in Redis, and returns the user.
> If the variable is empty or expired, you will still get 401 — re-run your signin request first.

---

## Task 2 — Use the Postman Console to debug a request

```js
// In the Tests tab of your POST /signin request:
console.log('Status:', pm.response.code);
console.log('Body:', pm.response.json());
console.log('Set-Cookie header:', pm.response.headers.get('Set-Cookie'));

pm.test('Status is 200', () => {
  pm.response.to.have.status(200);
});
```

> **WHY use the Console:** The Console shows the raw HTTP exchange — not just the formatted
> Postman UI view. This means you can see the full `Set-Cookie` header exactly as the server
> sent it. If your `{{sessionCookie}}` variable is not being set correctly, the Console will
> show you the raw value so you can diagnose the problem.
>
> **Common use cases for the Console:**
> - Confirm that a cookie IS or IS NOT being sent with a request
> - See the raw response body when the Postman JSON viewer shows nothing useful
> - Check whether `pm.environment.set()` is writing the value you expect
> - Trace which `pm.test()` block ran before a failure

---

## Task 3 — Assert response time is under 3000ms

```js
pm.test('Response time is under 3000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

> **WHY 3000ms:** This is a generous upper bound for a production API over the public internet.
> A typical healthy response takes under 300ms. 3000ms gives enough headroom for slow network
> conditions without being so loose it hides real performance regressions.
>
> **WHY `.to.be.below()` instead of `.to.be.lessThan()`:**
> Both work in Postman's Chai.js assertion library. `.to.be.below()` is the idiomatic Chai form.
> In Vitest you would use `.toBeLessThan(3000)` — different library, same concept.
>
> **Practical tip:** Lower the threshold to 500ms to see the test fail on a slow connection.
> This is how you confirm the assertion is actually running.

---

## Task 4 — Assert all 3 key fields on successful signin

```js
pm.test('Status is 200', () => {
  pm.response.to.have.status(200);
});

pm.test('message is a string', () => {
  pm.expect(pm.response.json().message).to.be.a('string');
});

pm.test('token is a string', () => {
  pm.expect(pm.response.json().token).to.be.a('string');
});
```

> **WHY three separate `pm.test()` calls instead of one:**
> Each `pm.test()` is reported independently in the Collection Runner results.
> If you put all three assertions in one block, a failure in the first assertion
> stops the block — you never see whether the token or message also failed.
> Separate blocks give you a complete picture: all three pass or exactly one fails.
>
> **WHY `.to.be.a('string')` instead of `.to.exist`:**
> `.to.exist` only checks that the value is not null/undefined. An empty string `''` passes exist.
> `.to.be.a('string')` confirms the type, which also means a number or object would be caught.
> For the token field specifically, you should also verify it is non-empty:
> ```js
> pm.expect(pm.response.json().token).to.be.a('string').and.to.have.length.above(0);
> ```

---

## Task 5 — Collection Runner: pass/fail for each request

There is no `pm.test()` script to write for this task — the goal is to observe the Runner output.

**What a healthy run looks like:**
- All GET requests (e.g. `/currentuser`, `/currentuser/profile/posts`) return green (pass)
- POST `/signin` and POST `/signup` may return 429 (red) if you run the collection repeatedly — this is expected

**How to read a failure in the Runner:**
1. A red row means at least one `pm.test()` in that request failed
2. Click the row to expand it — you will see which specific `pm.test()` assertion failed
3. The raw response tab shows the actual status code and body the server returned

> **WHY the 200ms delay matters:**
> The Collection Runner sends requests back-to-back. Auth endpoints have a 5 req/min rate limit.
> A 200ms delay between requests reduces — but does not eliminate — the chance of hitting 429.
> For a full auth collection, use 500ms or higher if you have many signin/signup requests.
>
> **WHY Export Results is useful:**
> The exported JSON file contains every request, every `pm.test()` result, the response time,
> and the response body. You can commit this file as a test report artifact — the same concept
> as Vitest's `--reporter=json` output or Newman's `--reporters junit` flag.
