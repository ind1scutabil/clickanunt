import Redis from 'ioredis';

let redisClient: Redis | null = null;

export class RedisUnavailableError extends Error {
  constructor(message: string = 'Redis unavailable') {
    super(message);
    this.name = 'RedisUnavailableError';
  }
}

const isRedisConnectionError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string; name?: string };
  const message = err?.message || '';
  return (
    err?.code === 'ECONNREFUSED' ||
    err?.name === 'MaxRetriesPerRequestError' ||
    message.includes('ECONNREFUSED') ||
    message.toLowerCase().includes('max retries') ||
    message.toLowerCase().includes('connection is closed')
  );
};

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      redisClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully');
      });
    } catch (error) {
      console.error('[Redis] Failed to initialize:', error);
      throw new Error('Redis initialization failed');
    }
  }

  return redisClient;
}

export async function setSession(
  sessionToken: string,
  sessionData: unknown,
  expirySeconds: number = 300 // 5 minutes default
): Promise<void> {
  const client = getRedisClient();
  const key = `session:${sessionToken}`;
  
  try {
    await client.setex(key, expirySeconds, JSON.stringify(sessionData));
  } catch (error) {
    console.error('[Redis] Failed to set session:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
    throw new Error('Failed to store session');
  }
}

export async function getSession(sessionToken: string): Promise<unknown | null> {
  const client = getRedisClient();
  const key = `session:${sessionToken}`;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Redis] Failed to get session:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
    return null;
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  const client = getRedisClient();
  const key = `session:${sessionToken}`;
  
  try {
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Failed to delete session:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
  }
}

export async function set2FASecret(
  userId: string,
  secretData: {
    secret: string;
    backupCodes: string[];
    verified: boolean;
    createdAt: number;
  },
  expirySeconds: number = 86400 // 24 hours
): Promise<void> {
  const client = getRedisClient();
  const key = `2fa:secret:${userId}`;
  
  try {
    await client.setex(key, expirySeconds, JSON.stringify(secretData));
  } catch (error) {
    console.error('[Redis] Failed to set 2FA secret:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
    throw new Error('Failed to store 2FA secret');
  }
}

export async function get2FASecret(userId: string): Promise<unknown | null> {
  const client = getRedisClient();
  const key = `2fa:secret:${userId}`;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Redis] Failed to get 2FA secret:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
    return null;
  }
}

export async function markBackupCodeUsed(
  userId: string,
  backupCode: string
): Promise<void> {
  const client = getRedisClient();
  const key = `2fa:backup:${userId}:${backupCode}`;
  
  try {
    await client.setex(key, 31536000, 'used'); // 1 year
  } catch (error) {
    console.error('[Redis] Failed to mark backup code:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
  }
}

export async function isBackupCodeUsed(
  userId: string,
  backupCode: string
): Promise<boolean> {
  const client = getRedisClient();
  const key = `2fa:backup:${userId}:${backupCode}`;
  
  try {
    const result = await client.get(key);
    return result !== null;
  } catch (error) {
    console.error('[Redis] Failed to check backup code:', error);
    if (isRedisConnectionError(error)) {
      throw new RedisUnavailableError();
    }
    return true; // Fail secure
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
