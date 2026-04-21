# Lecture 04 — Postman Homework SOLUTION

---

## Solution 1 — Current User

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('isUser is true', () => {
  pm.expect(pm.response.json().isUser).to.be.true;
});

pm.test('token is a string', () => {
  pm.expect(pm.response.json().token).to.be.a('string');
});

pm.test('user._id exists', () => {
  pm.expect(pm.response.json().user._id).to.exist;
});

// Save original work value for restore later
pm.environment.set('originalWork', pm.response.json().user.work);
```

**Why save `originalWork`?**
Profile updates are permanent. If you change `work` to `"Postman City"` and never restore it,
every future test run starts with `work: "Postman City"`. Saving and restoring the original
value keeps the test account in a consistent state.

---

## Solution 2 — Update Location + Verify

**L04 — Update Location Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Message is "Updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Updated successfully');
});
```

**L04 — Verify Location Tests tab:**
```js
pm.test('location was updated to Postman City', () => {
  pm.expect(pm.response.json().user.location).to.eql('Postman City');
});
```

**Why two requests?**
`PUT /user/profile/basic-info` only returns `{ message: "Updated successfully" }` — it
does NOT return the updated user. To verify the data was actually saved, you must
make a separate GET request. This is the **state verification pattern**.

---

## Solution 3 — Notification Settings

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('reactions is false', () => {
  pm.expect(pm.response.json().settings.reactions).to.be.false;
});

pm.test('follows is false', () => {
  pm.expect(pm.response.json().settings.follows).to.be.false;
});
```

**Why is `settings` in the response here but not in basic-info?**
Two different design choices by the backend developer:
- `basic-info`: returns only `{ message }` — simpler, assumes you'll GET if you need the data
- `settings`: returns `{ message, settings }` — echoes back what was applied, more informative

Neither is wrong — they are just different API design choices. As a tester you adapt
your assertions to match the actual API contract.

---

## Solution 4 — Session Token

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('token is a string', () => {
  pm.expect(pm.response.json().token).to.be.a('string');
});

pm.test('token has JWT format', () => {
  pm.expect(pm.response.json().token).to.include('.');
});
```

---

## Solution 5 — Signout

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Logout message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('User logout successfully');
});
```

**After signout, Current User returns 401.**
Why? The server sets `req.session = null`, which clears the session cookie's value.
The cookie still exists in Postman's Cookie Jar but its server-side session is gone.
The next authenticated request fails because the server can no longer decode a valid
session from that cookie.

---

## Stretch answer

After the full Collection Runner completes (ending with Signout), sending **Current User**
returns **401** — the session was invalidated by the Signout request.

To use the API again you need to sign in again (run **L02 — SignIn success** first).

This is why `afterAll` in automated tests always signs in at the START of each test file.
Each file is independent — it cannot rely on the session being open from a previous run.
