# Lecture 15 — Postman Homework SOLUTION

## Task 1
```js
pm.test('Status 201', () => pm.response.to.have.status(201));
pm.test('Message', () => pm.expect(pm.response.json().message).to.eql('Post created with image successfully'));
```

## Task 2
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Posts is array', () => pm.expect(pm.response.json().posts).to.be.an('array'));
const withImg = pm.response.json().posts.find(p => p.imgId && p.imgId.length > 0);
pm.test('At least one post has imgId', () => pm.expect(withImg).to.not.be.undefined);
```

## Task 3
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Updated message', () => pm.expect(pm.response.json().message).to.eql('Post with image updated successfully'));
```

## Task 4
```js
pm.test('Status 400', () => pm.response.to.have.status(400));
pm.test('Image error', () => pm.expect(pm.response.json().message).to.include('Image must be'));
```

## Task 5
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Posts is array', () => pm.expect(pm.response.json().posts).to.be.an('array'));
```
