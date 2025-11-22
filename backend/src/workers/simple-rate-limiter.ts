/**
 * Simple rate limiter using minimum delay between requests
 * Suitable for embedded worker in same process (no Redis needed)
 *
 * This prevents hitting external API rate limits (like Replicate) by
 * enforcing a minimum delay between successive requests.
 */
export class SimpleRateLimiter {
  private lastRequestTime = 0
  private minDelay: number // milliseconds between requests

  /**
   * @param requestsPerSecond Maximum requests per second (e.g., 50)
   */
  constructor(requestsPerSecond: number) {
    // Convert rate to minimum delay
    // e.g., 50 req/sec = 20ms between requests
    this.minDelay = 1000 / requestsPerSecond
  }

  /**
   * Acquire permission to make a request
   * Blocks until rate limit allows
   */
  async acquire(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.minDelay) {
      // Wait for remaining time
      const waitTime = this.minDelay - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Update rate limit configuration at runtime
   * @param requestsPerSecond New rate limit
   */
  setRate(requestsPerSecond: number): void {
    this.minDelay = 1000 / requestsPerSecond
  }

  /**
   * Get current rate limit (requests per second)
   */
  getRate(): number {
    return 1000 / this.minDelay
  }
}
