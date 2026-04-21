# Lecture 14 — Postman Homework SOLUTION

## Tasks 1-3
```js
// Non-existent email
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Message', () => pm.expect(pm.response.json().message).to.eql('Invalid credentials'));

// Invalid format
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Message', () => pm.expect(pm.response.json().message).to.include('Field must be valid'));

// Mismatched passwords
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Message', () => pm.expect(pm.response.json().message).to.include('do not match'));
```

## Task 4 — SSO
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('SSO message', () => pm.expect(pm.response.json().message).to.eql('SSO login successful'));
pm.test('User object present', () => pm.expect(pm.response.json().user).to.be.an('object'));
```

## Task 5
```js
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Token required', () => pm.expect(pm.response.json().message).to.eql('Token required'));
```
