import { PrismaClient } from '@prisma/client';
import { verifyTOTPRFC, base32Encode, base32Decode } from '@/lib/totp';
import {
  getRedisClient,
  get2FASecret,
  set2FASecret,
  isBackupCodeUsed,
  markBackupCodeUsed,
  RedisUnavailableError,
} from '@/lib/redis';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function generate2FASecret(userId: string) {
  const secretBuffer = crypto.randomBytes(32);
  const secret = base32Encode(secretBuffer);
  
  const backupCodes = Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
  
  const otpauthUrl = `otpauth://totp/ClickAnunt:admin-${userId}?secret=${secret}&issuer=ClickAnunt&algorithm=SHA1&digits=6&period=30`;
  
  // Store in Redis temporarily (24 hours)
  await set2FASecret(userId, {
    secret,
    backupCodes,
    verified: false,
    createdAt: Date.now(),
  });
  
  return { secret, otpauthUrl, backupCodes };
}

export async function enable2FA(userId: string, verificationCode: string): Promise<boolean> {
  try {
    const secretData = await get2FASecret(userId);
    
    if (!secretData) {
      throw new Error('2FA secret not found');
    }

    // Type guard for secret data structure
    if (
      typeof secretData !== 'object' ||
      !('secret' in secretData) ||
      !('backupCodes' in secretData) ||
      typeof secretData.secret !== 'string' ||
      !Array.isArray(secretData.backupCodes)
    ) {
      throw new Error('Invalid 2FA secret data structure');
    }

    const { secret, backupCodes } = secretData as { secret: string; backupCodes: string[] };
    
    if (!verifyTOTPRFC(secret, verificationCode)) {
      throw new Error('Invalid code');
    }

    const encryptedSecret = encryptField(secret);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: true,
      },
    });

    // Store backup codes
    for (const code of backupCodes) {
      await prisma.twoFactorBackupCode.create({
        data: {
          userId,
          code: code,
          used: false,
        },
      });
    }

    const redis = getRedisClient();
    await redis.del(`2fa:secret:${userId}`);
    return true;
  } catch (error) {
    console.error('[2FA] Enable error:', error);
    return false;
  }
}

export async function disable2FA(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });

    await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
    return true;
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    return false;
  }
}

export async function verifyTOTPLogin(
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const secret = decryptField(user.twoFactorSecret);
    const isValid = verifyTOTPRFC(secret, code);

    await prisma.twoFactorLog.create({
      data: {
        userId,
        action: 'verified',
        success: isValid,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    });

    return isValid;
  } catch (error) {
    console.error('[2FA] Verification error:', error);
    return false;
  }
}

export async function useBackupCode(
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const alreadyUsed = await isBackupCodeUsed(userId, code);
    
    if (alreadyUsed) {
      throw new Error('Backup code already used');
    }

    const backupCode = await prisma.twoFactorBackupCode.findFirst({
      where: { userId, code, used: false },
    });

    if (!backupCode) {
      throw new Error('Invalid backup code');
    }

    await prisma.twoFactorBackupCode.update({
      where: { id: backupCode.id },
      data: { used: true, usedAt: new Date() },
    });

    await markBackupCodeUsed(userId, code);

    await prisma.twoFactorLog.create({
      data: {
        userId,
        action: 'backup_used',
        success: true,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    });

    return true;
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      throw error;
    }
    console.error('[2FA] Backup code error:', error);
    return false;
  }
}

export async function get2FAStatus(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    const remaining = await prisma.twoFactorBackupCode.count({
      where: { userId, used: false },
    });

    return {
      enabled: user?.twoFactorEnabled || false,
      backupCodesRemaining: remaining,
    };
  } catch (error) {
    return { enabled: false, backupCodesRemaining: 0 };
  }
}

function encryptField(value: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY?.substring(0, 32) || 'default-key'.padEnd(32, '0'));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptField(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':');
  const key = Buffer.from(process.env.ENCRYPTION_KEY?.substring(0, 32) || 'default-key'.padEnd(32, '0'));
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
