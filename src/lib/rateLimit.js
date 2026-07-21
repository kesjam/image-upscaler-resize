function createRateLimiter({ windowMs = 60_000, maxRequests = 5 } = {}) {
  const store = new Map();

  return (clientId, now = Date.now()) => {
    const current = store.get(clientId);

    if (!current || current.resetAt <= now) {
      store.set(clientId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count += 1;
    return true;
  };
}

module.exports = { createRateLimiter };
