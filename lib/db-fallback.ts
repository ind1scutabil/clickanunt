/**
 * In-Memory Database - Enterprise Level
 * Folosit când PostgreSQL nu este disponibil
 */

import bcrypt from 'bcrypt';
import {
  emailsEquivalentForLogin,
  gmailInboxCanonicalKey,
  loginEmailLookupCandidates,
  preferUserAmongDuplicateEmails,
} from './sanitize';

interface IUser {
  id: string;
  email: string;
  password: string;
  name?: string | null;
  role: string;
  trustScore: number;
  creditsBalance?: number;
  promotionDiscountPercent?: number;
  promotionBenefits?: any;
  isVerified: boolean;
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationCode?: string | null;
  verificationTokenExpiry?: Date | null;
  isBanned: boolean;
  moderationSuspendedUntil?: Date | null;
  banReason?: string | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  /** JWT session revocation counter — mirrors User.sessionVersion */
  sessionVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

class MemoryDB {
  private users = new Map<string, IUser>();
  private usersByEmail = new Map<string, IUser>();

  constructor() {
    const owner: IUser = {
      id: 'owner-123',
      email: 'owner@autoplatform.ro',
      password: '$2b$10$OaQkCSHU9mQd7RxcOPLZ3u1gWgSkwmVVN9/yvxJF36BQGJBm2z3Pi',
      name: 'Owner',
      role: 'owner',
      trustScore: 100,
      creditsBalance: 0,
      promotionDiscountPercent: 0,
      promotionBenefits: null,
      isVerified: true,
      emailVerified: true,
      verificationToken: null,
      verificationCode: null,
      verificationTokenExpiry: null,
      isBanned: false,
      banReason: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(owner.id, owner);
    this.usersByEmail.set(owner.email, owner);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@clickanunt.ro';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const admin: IUser = {
      id: 'admin-123',
      email: adminEmail,
      password: bcrypt.hashSync(adminPassword, 10),
      name: 'Admin',
      role: 'admin',
      trustScore: 90,
      creditsBalance: 0,
      promotionDiscountPercent: 0,
      promotionBenefits: null,
      isVerified: true,
      emailVerified: true,
      verificationToken: null,
      verificationCode: null,
      verificationTokenExpiry: null,
      isBanned: false,
      banReason: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(admin.id, admin);
    this.usersByEmail.set(admin.email, admin);
  }

  async findUserByEmail(email: string) {
    const rawInput = email.trim();
    if (!rawInput) return null;

    const candidates = loginEmailLookupCandidates(rawInput);
    if (candidates.length === 0) return null;

    const byId = new Map<string, IUser>();

    const add = (u: IUser | null | undefined) => {
      if (u && !u.deletedAt) byId.set(u.id, u);
    };

    for (const c of candidates) {
      add(this.usersByEmail.get(c) || this.usersByEmail.get(c.toLowerCase()));
    }

    for (const u of this.users.values()) {
      if (u.deletedAt) continue;
      if (candidates.some((c) => emailsEquivalentForLogin(u.email, c))) {
        add(u);
      }
    }

    const canonKey = gmailInboxCanonicalKey(rawInput);
    if (canonKey) {
      for (const u of this.users.values()) {
        if (!u.deletedAt && gmailInboxCanonicalKey(u.email) === canonKey) {
          add(u);
        }
      }
    }

    const rows = [...byId.values()];
    if (rows.length === 0) return null;
    if (rows.length === 1) return rows[0];

    return preferUserAmongDuplicateEmails(rows, rawInput);
  }

  async findUserById(id: string) {
    return this.users.get(id) || null;
  }

  async createUser(data: Partial<IUser>): Promise<IUser> {
    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const user: IUser = {
      id,
      email: data.email || '',
      password: data.password || '',
      name: data.name || null,
      role: data.role || 'user',
      trustScore: 50,
      creditsBalance: 0,
      promotionDiscountPercent: 0,
      promotionBenefits: null,
      isVerified: false,
      emailVerified: false,
      verificationToken: data.verificationToken || null,
      verificationCode: data.verificationCode || null,
      verificationTokenExpiry: data.verificationTokenExpiry || null,
      isBanned: false,
      banReason: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      sessionVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async updateUser(id: string, data: Partial<IUser>) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    this.usersByEmail.set(updated.email, updated);
    return updated;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}

const memDB = new MemoryDB();

export class DB {
  // Direct methods for convenience
  async findUserByEmail(email: string) {
    return memDB.findUserByEmail(email);
  }

  async findUserById(id: string) {
    return memDB.findUserById(id);
  }

  async createUser(data: Partial<IUser>): Promise<IUser> {
    return memDB.createUser(data);
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return memDB.updateUser(id, data);
  }

  // Prisma-compatible interface
  get user() {
    return {
      findUnique: async (args: { where: { email?: string; id?: string } }): Promise<IUser | null> => {
        if (args.where.email) return memDB.findUserByEmail(args.where.email);
        if (args.where.id) return memDB.findUserById(args.where.id);
        return null;
      },
      findMany: async (args?: { select?: Record<string, boolean> }): Promise<(Partial<IUser> | IUser)[]> => {
        const users = memDB.getAllUsers();
        // If select is provided, filter fields
        if (args?.select) {
          const selectKeys = Object.keys(args.select);
          const selectMap = args.select;
          return users.map((user: IUser) => {
            const filtered: Record<string, unknown> = {};
            for (const key of selectKeys) {
              if (selectMap[key]) {
                filtered[key] = (user as unknown as Record<string, unknown>)[key];
              }
            }
            return filtered as Partial<IUser>;
          });
        }
        return users;
      },
      create: async (args: { data: Partial<IUser> }): Promise<IUser> => memDB.createUser(args.data),
      update: async (args: { where: { id: string }; data: Partial<IUser> }): Promise<IUser | null> => memDB.updateUser(args.where.id, args.data),
    };
  }

  get listing() {
    return {
      create: async (args: { data: Record<string, unknown> }): Promise<{ id: string }> => ({ id: 'listing-' + Date.now(), ...args.data }),
      findMany: async (): Promise<never[]> => [],
      count: async (): Promise<number> => 0,
    };
  }

  async testConnection() {
    return true;
  }

  isUsingInMemory() {
    return true;
  }

  getHealthStatus() {
    return { healthy: true, mode: 'in-memory' };
  }
}

export const db = new DB();
