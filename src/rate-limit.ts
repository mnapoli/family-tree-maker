// Simple in-isolate token bucket. Not distributed (per-isolate state),
// but sufficient to blunt casual abuse of the render endpoint. Pair with
// Cloudflare's Rate Limiting binding in production if needed.

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  capacity: number;     // max tokens
  refillPerSec: number; // tokens added per second
}

export function consume(key: string, cfg: RateLimitConfig): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) {
    buckets.set(key, { tokens: cfg.capacity - 1, updatedAt: now });
    return { ok: true };
  }
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(cfg.capacity, b.tokens + elapsed * cfg.refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) {
    const retryAfter = Math.ceil((1 - b.tokens) / cfg.refillPerSec);
    return { ok: false, retryAfter };
  }
  b.tokens -= 1;
  return { ok: true };
}
