const test = require('node:test');
const assert = require('node:assert/strict');

const { createRateLimiter } = require('../src/lib/rateLimit');

test('limits each client independently and resets after the window', () => {
  const check = createRateLimiter({ windowMs: 1_000, maxRequests: 2 });

  assert.equal(check('client-a', 0), true);
  assert.equal(check('client-a', 100), true);
  assert.equal(check('client-a', 200), false);
  assert.equal(check('client-b', 200), true);
  assert.equal(check('client-a', 1_000), true);
});
