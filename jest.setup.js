import '@testing-library/jest-dom'

// Close known module-level timers so Jest can exit without --forceExit.
afterAll(() => {
  try {
    // Prefer require.cache so we do not create the interval if unused.
    const resolved = require.resolve('./lib/rateLimit')
    const cached = require.cache[resolved]
    if (cached?.exports?.stopRateLimitCleanup) {
      cached.exports.stopRateLimitCleanup()
    }
  } catch {
    // rateLimit not loaded / not resolvable in this environment
  }
})
