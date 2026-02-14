const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const adminPassword = 'ClickAnunt2026Admin';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        id: 'admin-' + Date.now(),
        email: 'admin@clickanunt.ro',
        password: passwordHash,
        role: 'admin',
        name: 'Administrator',
        emailVerified: true,
        accountType: 'business',
        verificationLevel: 'business',
        creditsBalance: 1000,
      }
    });
    
    console.log('Admin created successfully!');
    console.log('Email: admin@clickanunt.ro');
    console.log('Password: ClickAnunt2026Admin');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
