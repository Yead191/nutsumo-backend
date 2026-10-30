import Redis, { RedisOptions } from 'ioredis';
import config from '../config';

export const redisConnectionOptions: RedisOptions = {
  host: config.redis.host || '127.0.0.1',
  port: Number(config.redis.port) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisClient = new Redis(redisConnectionOptions);

// Prevent unhandled error crashes when Redis is offline or restarting
redisClient.on('error', (err) => {
  // Silent or debug log for reconnection attempts
  if (config.node_env === 'development') {
    // Suppress spammy connection logs in dev
  }
});
