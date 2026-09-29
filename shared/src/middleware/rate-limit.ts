/**
 * Rate Limiting Middleware
 * Uses Redis for distributed rate limiting across service instances
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { RateLimitError } from './error-handler';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client for rate limiting
 */
async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  await redisClient.connect();
  return redisClient;
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
  message?: string; // Custom error message
}

/**
 * Create rate limiting middleware
 * @param options Rate limit configuration
 * @returns Express middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skip,
    message = 'Too many requests, please try again later',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting if skip function returns true
      if (skip && skip(req)) {
        next();
        return;
      }

      const redis = await getRedisClient();
      const key = `ratelimit:${keyGenerator(req)}`;

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= maxRequests) {
        // Get TTL to show retry-after
        const ttl = await redis.ttl(key);

        res.set('Retry-After', String(Math.ceil(ttl)));
        throw new RateLimitError(message);
      }

      // Increment count
      const multi = redis.multi();
      multi.incr(key);

      // Set expiry on first request
      if (count === 0) {
        multi.pExpire(key, windowMs);
      }

      await multi.exec();

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(Math.max(0, maxRequests - count - 1)),
        'X-RateLimit-Reset': String(Date.now() + windowMs),
      });

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      // If Redis is down, log error but don't block requests
      logger.error('Rate limiter error:', error);
      next();
    }
  };
}

/**
 * Default key generator
 * Uses IP address and user ID if available
 */
function defaultKeyGenerator(req: Request): string {
  const userId = req.user?.id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Pre-configured rate limiters for common use cases
 */

// General API rate limit: 100 requests per minute
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded. Please try again in a minute.',
});

// AI request rate limit: 30 requests per minute
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'AI request rate limit exceeded. Please try again in a minute.',
});

// Auth rate limit: 5 requests per minute (strict for auth endpoints)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again in a minute.',
});

// File upload rate limit: 10 requests per hour
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Upload rate limit exceeded. Please try again later.',
});
