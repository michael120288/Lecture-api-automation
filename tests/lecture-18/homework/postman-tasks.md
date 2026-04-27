# Lecture 18 — Postman Homework

Create a folder named **Lecture 18** in your Chatty collection. Complete the tasks below.

---

## Task 1 — Reproduce 401 intentionally, then fix it

**Part A — intentional 401:**
1. Create a GET request to `{{base_url}}/currentuser`
2. Go to the **Headers** tab and make sure there is NO `Cookie` header (remove it or leave it blank)
3. Send the request
4. In the **Tests** tab, write a `pm.test()` that asserts the status is 401
5. Send the request and confirm the test passes

**Part B — fix it:**
1. Duplicate the request from Part A
2. In the **Headers** tab, add `Cookie` with value `{{sessionCookie}}` (assuming you have this variable set from Lecture 02)
3. Write a `pm.test()` that asserts the status is 200
4. Send the request and confirm the test passes

**Hint:** `pm.response.to.have.status(401)` and `pm.response.to.have.status(200)`

---

## Task 2 — Use the Postman Console to debug a request

1. Open the Postman Console: **Cmd+Alt+C** (Mac) or **Ctrl+Alt+C** (Windows/Linux)
2. Create a POST request to `{{base_url}}/signin` with a valid username and password in the JSON body
3. In the **Tests** tab, add:
   ```js
   console.log('Status:', pm.response.code);
   console.log('Body:', pm.response.json());
   ```
4. Send the request
5. Look at the Console panel — you should see:
   - The full request URL
   - The request body
   - The raw response body
   - Your `console.log` output
6. Write a `pm.test()` that asserts the status is 200

**Hint:** The Console shows the full Cookie header sent with the request — useful for debugging 401 errors.

---

## Task 3 — Assert response time is under 3000ms

1. Create a GET request to `{{base_url}}/currentuser` with the session cookie
2. In the **Tests** tab, write a `pm.test()` that asserts `pm.response.responseTime` is less than 3000
3. Send the request and confirm the test passes

**Hint:** `pm.response.responseTime` returns milliseconds as a number. Use `.to.be.below(3000)`.

---

## Task 4 — Assert all 3 key fields on a successful signin

1. Create a POST request to `{{base_url}}/signin` with your valid credentials
2. In the **Tests** tab, write THREE separate `pm.test()` calls — one for each field:
   - The response status is 200
   - The response body has a `message` field that is a string
   - The response body has a `token` field that is a string
3. Send the request and confirm all 3 tests pass

**Hint:** `pm.response.json()` gives you the parsed body. Use `.to.be.a('string')` for type assertions.

---

## Task 5 — Run the full Auth collection in Collection Runner

1. In Postman, open the **Collections** panel
2. Right-click on your **Chatty** collection (or the **Lecture 18** folder)
3. Click **Run collection**
4. In the Collection Runner, set:
   - Environment: your Chatty environment (with `base_url`, `sessionCookie`, etc.)
   - Iterations: 1
   - Delay: 200ms (gives the server a brief pause between requests)
5. Click **Run Chatty** (or your folder name)
6. Observe the pass/fail results for each request

**What to look for:**
- Any request marked red means its `pm.test()` failed
- Click the request name in the results to see which specific assertion failed
- A 429 status on signin tests is expected — the Collection Runner hits the rate limit
> **If you hit a 429 (rate limited):** Add header `x-test-secret: chatty-test-cleanup-2026` to bypass the rate limit. Only works for usernames starting with `vitest`.

**Hint:** After the run, click **Export Results** to save a JSON report of the results.
