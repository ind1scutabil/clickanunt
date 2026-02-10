// Check if we should use in-memory DB BEFORE importing Prisma
import { PrismaClient } from "@prisma/client";

const useInMemory = process.env.USE_IN_MEMORY_DB === 'true';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Create a stub prisma client for in-memory mode
const createStubPrisma = (): PrismaClient => {
  const handler = {
    get: (_target: Record<string, unknown>, prop: string) => {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined; // Not a promise
      }
      // Return another proxy for chaining (e.g., prisma.user.findUnique)
      return new Proxy(() => Promise.resolve(null), {
        get: () => createStubPrisma(),
        apply: () => Promise.resolve(null)
      });
    }
  };
  return new Proxy({}, handler) as unknown as PrismaClient;
};

if (useInMemory) {
  console.log('⚠️  In-memory DB mode - Prisma client bypassed');
}

export const prisma: PrismaClient = useInMemory 
  ? (createStubPrisma())
  : (globalForPrisma.prisma ??
     new PrismaClient({
       log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
     }));

if (process.env.NODE_ENV !== "production" && !useInMemory) {
  globalForPrisma.prisma = prisma;
}
