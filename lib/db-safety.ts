/**
 * Database Safety Utilities
 * Ensures safe database operations with timeouts and error handling
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

// Default timeouts (milliseconds)
const DEFAULT_QUERY_TIMEOUT = 30000; // 30 seconds
const DEFAULT_TRANSACTION_TIMEOUT = 60000; // 60 seconds

/**
 * Execute query with timeout
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT,
  operation: string = 'query'
): Promise<T> {
  const startTime = Date.now();
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Database ${operation} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([queryFn(), timeoutPromise]);
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      logger.warn({ operation, duration }, 'Slow database operation');
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({ operation, duration, error }, 'Database operation failed');
    throw mapDatabaseError(error);
  }
}

/**
 * Execute transaction with timeout
 */
export async function transactionWithTimeout<T>(
  transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
  timeoutMs: number = DEFAULT_TRANSACTION_TIMEOUT
): Promise<T> {
  return queryWithTimeout(
    () => prisma.$transaction(transactionFn, {
      timeout: timeoutMs,
      maxWait: 5000, // Max wait time to acquire connection
    }),
    timeoutMs,
    'transaction'
  );
}

/**
 * Safe pagination with hard limits
 */
export interface SafePaginationParams {
  limit?: number;
  cursor?: string;
  maxLimit?: number;
}

export function getSafePaginationParams(
  params: SafePaginationParams
): { limit: number; cursor?: string } {
  const maxLimit = params.maxLimit || 100;
  const limit = Math.min(Math.max(params.limit || 20, 1), maxLimit);
  
  return {
    limit,
    cursor: params.cursor,
  };
}

/**
 * Map database errors to user-safe messages
 */
export function mapDatabaseError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new Error('A record with this value already exists');
      case 'P2003':
        return new Error('Referenced record does not exist');
      case 'P2025':
        return new Error('Record not found');
      case 'P2024':
        return new Error('Connection timeout - please try again');
      case 'P1001':
        return new Error('Cannot reach database server');
      case 'P1008':
        return new Error('Database operation timeout');
      default:
        logger.error({ error }, 'Unhandled Prisma error code');
        return new Error('Database operation failed');
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new Error('Invalid data provided');
  }
  
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new Error('Database operation took too long - please try again');
    }
    if (error.message.includes('connection')) {
      return new Error('Database connection error - please try again');
    }
  }
  
  return new Error('An unexpected error occurred');
}

/**
 * Graceful shutdown - close database connections
 */
export async function gracefulShutdown(): Promise<void> {
  logger.info('Closing database connections...');
  
  try {
    await prisma.$disconnect();
    logger.info('Database connections closed successfully');
  } catch (error) {
    logger.error({ error }, 'Error closing database connections');
    throw error;
  }
}

// Register shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await gracefulShutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await gracefulShutdown();
    process.exit(0);
  });
}

/**
 * Health check - verify database connectivity
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await queryWithTimeout(
      () => prisma.$queryRaw`SELECT 1 as health`,
      5000,
      'health_check'
    );
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}
