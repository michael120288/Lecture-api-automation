# Lecture 10 — Postman Homework SOLUTION

## Tasks 1-3 — Standard assertions
```js
pm.test('Has authId, no password', () => {
  pm.expect(pm.response.json().user).to.have.property('authId');
  pm.expect(pm.response.json().user).to.not.have.property('password');
});
```

## Task 4 — Two different IDs
```js
pm.test('_id and authId are different', () => {
  const u = pm.response.json().user;
  pm.expect(u._id).to.not.eql(u.authId);
});
```
`_id` is the User collection document ID. `authId` is the Auth collection document ID.
The same person has TWO database documents across TWO collections. This is Chatty's architecture.

## Task 5 — Cleanup then verify gone
```js
// After cleanup:
pm.test('Deleted', () => pm.response.to.have.status(200));

// After trying to sign in again:
pm.test('User gone — 400', () => pm.response.to.have.status(400));
pm.test('Invalid credentials', () => pm.expect(pm.response.json().message).to.eql('Invalid credentials'));
```
The cleanup endpoint deleted from BOTH Auth and User collections. Signin now says "Invalid credentials".
