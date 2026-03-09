const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log('🌱 Seeding users...');

    // Check existing users
    const existingCount = await prisma.user.count();
    console.log(`📊 Existing users: ${existingCount}`);

    if (existingCount === 0) {
      // Create admin
      const adminPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: 'admin@clickanunt.ro',
          password: adminPassword,
          role: 'admin',
          name: 'Administrator',
          emailVerified: true,
          creditsBalance: 1000,
        }
      });
      console.log('✅ Created admin user');

      // Create test users
      const testUsers = [
        { email: 'user1@test.com', name: 'User One', role: 'user' },
        { email: 'user2@test.com', name: 'User Two', role: 'user' },
        { email: 'user3@test.com', name: 'User Three', role: 'user' },
        { email: 'moderator@test.com', name: 'Moderator', role: 'moderator' },
      ];

      for (const userData of testUsers) {
        const password = await bcrypt.hash('password123', 10);
        await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email: userData.email,
            password: password,
            role: userData.role,
            name: userData.name,
            emailVerified: true,
            creditsBalance: 100,
          }
        });
      }
      console.log(`✅ Created ${testUsers.length} test users`);
    }

    const finalCount = await prisma.user.count();
    console.log(`🎉 Total users: ${finalCount}`);

    // List all users
    const users = await prisma.user.findMany({
      select: { email: true, role: true, isBanned: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) ${user.isBanned ? '[BANNED]' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers();