/**
 * Database Layer - Wrapper around canonical Prisma singleton
 * Provides helper methods for common operations
 * Falls back to in-memory DB when DATABASE_URL is missing (local/dev)
 */

import { prisma } from './prisma';
import { db as memoryDb, DB as MemoryDB } from './db-fallback';
import {
  gmailInboxCanonicalKey,
  loginEmailLookupCandidates,
  preferUserAmongDuplicateEmails,
} from './sanitize';

const useMemory = process.env.USE_IN_MEMORY_DB === 'true' || !process.env.DATABASE_URL;

if (useMemory) {
  console.log('✅ Using in-memory database (USE_IN_MEMORY_DB=true)');
}

class PrismaDB {
  async findUserByEmail(email: string) {
    const rawInput = email.trim();
    if (!rawInput) return null;

    const candidates = loginEmailLookupCandidates(rawInput);
    if (candidates.length === 0) return null;

    const byId = new Map<
      string,
      NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>>
    >();

    const addRows = (
      rows: NonNullable<Awaited<ReturnType<typeof prisma.user.findMany>>> | null
    ) => {
      if (!rows) return;
      for (const row of rows) {
        byId.set(row.id, row);
      }
    };

    for (const c of candidates) {
      addRows(await prisma!.user.findMany({ where: { deletedAt: null, email: c } }));
      addRows(
        await prisma!.user.findMany({
          where: {
            deletedAt: null,
            email: { equals: c, mode: 'insensitive' },
          },
        })
      );
    }

    const canonKey = gmailInboxCanonicalKey(rawInput);
    if (canonKey) {
      const gmailHits = await prisma!.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { email: { endsWith: '@gmail.com', mode: 'insensitive' } },
            { email: { endsWith: '@googlemail.com', mode: 'insensitive' } },
          ],
        },
      });
      for (const u of gmailHits) {
        if (gmailInboxCanonicalKey(u.email) === canonKey) byId.set(u.id, u);
      }
    }

    const rows = [...byId.values()];
    if (rows.length === 0) return null;
    if (rows.length === 1) return rows[0];

    return preferUserAmongDuplicateEmails(rows, rawInput);
  }

  async findUserById(id: string) {
    return await prisma!.user.findFirst({
      where: { id, deletedAt: null },
    });
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
