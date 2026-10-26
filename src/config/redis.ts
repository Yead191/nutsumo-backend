import Redis from 'ioredis'
import config from '../config'
export const redisClient = new Redis({ host: config.redis.host, port: Number(config.redis.port) });
