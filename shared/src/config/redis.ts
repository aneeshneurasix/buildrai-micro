/**
 * Redis Configuration
 * Connection pooling and caching utilities
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis connected and ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    await redisClient.connect();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await disconnectRedis();
    });

    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Cache helper functions
 */

/**
 * Set cache with TTL
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<void> {
  const client = getRedisClient();
  const serialized = JSON.stringify(value);
  await client.setEx(key, ttlSeconds, serialized);
}

/**
 * Get cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const value = await client.get(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

/**
 * Delete cache
 */
export async function delCache(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

/**
 * Check if key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  const exists = await client.exists(key);
  return exists === 1;
}

/**
 * Clear cache by pattern
 */
export async function clearCachePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  const keys = await client.keys(pattern);

  if (keys.length === 0) {
    return 0;
  }

  await client.del(keys);
  return keys.length;
}

/**
 * Cache with automatic refresh
 * @param key Cache key
 * @param ttlSeconds TTL in seconds
 * @param fetchFn Function to fetch data if cache miss
 * @returns Cached or fresh data
 */
export async function cacheWithRefresh<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key);

  if (cached !== null) {
    return cached;
  }

  const fresh = await fetchFn();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
}
