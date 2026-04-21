# Lecture 17 — Postman Homework SOLUTION

## Task 1
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Has conversationId', () => pm.expect(pm.response.json().conversationId).to.be.a('string'));
pm.environment.set('conversationId', pm.response.json().conversationId);
```

## Task 2
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('List is array', () => pm.expect(pm.response.json().list).to.be.an('array'));
```

## Task 3
```js
pm.test('Messages array', () => pm.expect(pm.response.json().messages).to.be.an('array'));
const msgs = pm.response.json().messages;
if (msgs.length > 0) pm.environment.set('messageId', msgs[0]._id);
```

## Task 4
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
```

## Task 5
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
```

## Task 6 — Delete message
URL: `{{base_url}}/chat/message/mark-as-deleted/{{messageId}}/{{userAId}}/{{userBId}}/deleteForMe`
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Message marked', () => pm.expect(pm.response.json().message).to.eql('Message marked as deleted'));
```
> `deleteForMe` hides the message only for you. `deleteForEveryone` hides it for both parties.

## Task 7 — Delete conversation
URL: `{{base_url}}/chat/conversation/{{userBId}}`
```js
pm.test('Status 200', () => pm.response.to.have.status(200));
pm.test('Removed message', () => pm.expect(pm.response.json().message).to.eql('Conversation removed'));
```
Then GET conversation-list and verify user B's conversation is gone:
```js
const found = pm.response.json().list.find(c => c.receiverId === pm.environment.get('userBId') || c.senderId === pm.environment.get('userBId'));
pm.test('Conversation removed from list', () => pm.expect(found).to.be.undefined);
```
