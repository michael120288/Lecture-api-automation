# Lecture 08 — Postman Homework SOLUTION

## Task 1
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Has users, totalUsers, followers', () => {
  const b = pm.response.json();
  pm.expect(b.users).to.be.an('array');
  pm.expect(b.totalUsers).to.be.above(0);
  pm.expect(b.followers).to.be.an('array');
});
```

## Task 2
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Search returns results', () => pm.expect(pm.response.json().search.length).to.be.above(0));
```

## Task 3 (Update)
```js
pm.test('Updated', () => pm.expect(pm.response.json().message).to.eql('Updated successfully'));
```
Then verify (GET /currentuser):
```js
pm.test('Youtube updated', () => pm.expect(pm.response.json().user.social.youtube).to.eql('https://youtube.com/vitest'));
```

## Task 4
```js
pm.test('Status 400', () => pm.response.to.have.status(400));
```

## Task 5
Body: `{ "currentPassword": "T1", "newPassword": "T2", "confirmPassword": "T3" }`
```js
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Mismatch message', () => pm.expect(pm.response.json().message).to.include('does not match'));
```
