# Lecture 06 — Postman Homework SOLUTION

## Solution 1 — Add 'happy' reaction
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Reaction added', () => pm.expect(pm.response.json().message).to.eql('Reaction added successfully'));
```

## Solution 2 — Get reactions
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Count >= 1', () => pm.expect(pm.response.json().count).to.be.at.least(1));
pm.test('Reactions is array', () => pm.expect(pm.response.json().reactions).to.be.an('array'));
```

## Solution 3 — Single reaction
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Has reactions property', () => pm.expect(pm.response.json()).to.have.property('reactions'));
```

## Solution 4 — Switch to 'wow'
Body: `{ "userTo": "{{postOwnerUserId}}", "postId": "{{postId}}", "type": "wow", "previousReaction": "happy", "postReactions": { "like": 0, "love": 0, "happy": 1, "sad": 0, "wow": 0, "angry": 0 }, "profilePicture": "" }`

**Why `previousReaction`?** When switching reactions, the server removes the old type and adds the new one atomically. Without `previousReaction`, the old reaction count is not decremented.

## Solution 5 — Remove reaction
Encoded `{"like":0,"love":0,"happy":0,"sad":0,"wow":1,"angry":0}`:
`%7B%22like%22%3A0%2C%22love%22%3A0%2C%22happy%22%3A0%2C%22sad%22%3A0%2C%22wow%22%3A1%2C%22angry%22%3A0%7D`

```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Removed message', () => pm.expect(pm.response.json().message).to.eql('Reaction removed from post'));
```
