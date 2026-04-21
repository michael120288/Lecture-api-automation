# Lecture 07 — Postman Homework SOLUTION

## Solution 1
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Message correct', () => pm.expect(pm.response.json().message).to.eql('Comment created successfully'));
pm.test('No _id in response', () => pm.expect(pm.response.json()).to.not.have.property('_id'));
```
Note: 200 not 201. Comments are actions on posts, not new top-level resources.

## Solution 2
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Comments non-empty', () => pm.expect(pm.response.json().comments.length).to.be.above(0));
const found = pm.response.json().comments.find(c => c.comment === 'My first comment');
if (found) pm.environment.set('commentId', found._id);
```

## Solution 3
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Update message', () => pm.expect(pm.response.json().message).to.eql('Comment updated successfully'));
```

## Solution 4
```js
pm.test('Comment was updated', () => {
  pm.expect(pm.response.json().comments.comment).to.eql('Updated comment');
});
```
Note: `comments` (plural) is actually the single comment document — the API naming is slightly inconsistent.

## Solution 5
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Deleted message', () => pm.expect(pm.response.json().message).to.eql('Comment deleted successfully'));
```
