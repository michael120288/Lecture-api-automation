# Lecture 16 — Postman Homework SOLUTION

## Tasks 1-5 — Standard patterns
```js
// Task 1
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('User shape', () => {
  pm.expect(pm.response.json().user).to.have.property('_id');
  pm.expect(pm.response.json().user).to.not.have.property('password');
});

// Task 2
pm.test('Suggestions is array', () => pm.expect(pm.response.json().users).to.be.an('array'));

// Task 3
pm.test('Image added', () => pm.expect(pm.response.json().message).to.eql('Image added successfully'));

// Task 4
pm.test('Images array', () => pm.expect(pm.response.json().images).to.be.an('array'));

// Task 5
pm.test('Has user and posts', () => {
  pm.expect(pm.response.json()).to.have.property('user');
  pm.expect(pm.response.json()).to.have.property('posts');
  pm.expect(pm.response.json()).to.have.property('totalPosts');
});
```
