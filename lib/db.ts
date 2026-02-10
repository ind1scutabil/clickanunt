/**
 * Database Layer - PostgreSQL with Prisma
 * Falls back to in-memory DB when DATABASE_URL is missing (local/dev)
 */

import { db as memoryDb, DB as MemoryDB } from './db-fallback';

const useMemory = process.env.USE_IN_MEMORY_DB === 'true' || !process.env.DATABASE_URL;

let prisma: any = null;
let PrismaClient: any = null;

if (!useMemory) {
  // Only load Prisma if we actually need it
  PrismaClient = require('@prisma/client').PrismaClient;
  const globalForPrisma = global as unknown as { prisma: any | undefined };
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} else {
  console.log('✅ Using in-memory database (USE_IN_MEMORY_DB=true)');
}

class PrismaDB {
  async findUserByEmail(email: string) {
    return await prisma!.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    return await prisma!.user.findUnique({ where: { id } });
  }

  async createUser(data: any) {
    return await prisma!.user.create({ data });
  }

  async updateUser(id: string, data: any) {
    return await prisma!.user.update({
      where: { id },
      data,
    });
  }

  // Direct Prisma access for complex queries
  get user() {
    return prisma!.user;
  }

  get listing() {
    return prisma!.listing;
  }

  get payment() {
    return prisma!.payment;
  }

  get featureFlag() {
    return prisma!.featureFlag;
  }

  get auditLog() {
    return prisma!.auditLog;
  }

  async testConnection() {
    try {
      await prisma!.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  isUsingInMemory() {
    return false;
  }

  getHealthStatus() {
    return { healthy: true, mode: 'postgresql' };
  }

  async $disconnect() {
    await prisma!.$disconnect();
  }
}

export type DB = PrismaDB | MemoryDB;

export const db: DB = useMemory ? memoryDb : new PrismaDB();
