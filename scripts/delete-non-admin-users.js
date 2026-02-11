#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@clickanunt.ro';
    console.log('🔓 Deleting all non-admin users...');

    const deleted = await prisma.user.deleteMany({
      where: {
        AND: [
          { role: { notIn: ['admin', 'owner'] } },
          { email: { not: adminEmail } },
        ],
      },
    });

    console.log(`✅ Deleted ${deleted.count} users`);

    // Verify only admin remains
    const remaining = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log('\n📋 Remaining users:');
    remaining.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    if (remaining.every(u => u.email === adminEmail || u.role === 'admin' || u.role === 'owner')) {
      console.log('\n✅ Only admin/owner users remain. System is secure!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
