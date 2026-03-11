import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis =
  global.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}
