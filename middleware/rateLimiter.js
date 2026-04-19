class RateLimiter {
  constructor(requestsPerMinute = 30) { // Groq free tier ~30 RPM
    this.requestsPerMinute = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
  }
  
  async waitForToken() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = (timePassed / 60000) * this.requestsPerMinute;
    
    this.tokens = Math.min(this.requestsPerMinute, this.tokens + refillAmount);
    this.lastRefill = now;
    
    if (this.tokens < 1) {
      const waitTime = (60000 / this.requestsPerMinute) * (1 - this.tokens);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForToken();
    }
    
    this.tokens -= 1;
    return true;
  }
}

const rateLimiter = new RateLimiter(30);
module.exports = rateLimiter;