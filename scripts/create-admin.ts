import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  const adminEmail = 'daniel.enoiu29@gmail.com';
  const adminPassword = 'Gz082306gz082306@';
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existing) {
    console.log('User already exists. Updating role to admin and password...');
    const updated = await prisma.user.update({
      where: { email: adminEmail },
      data: { 
        role: 'admin',
        password: hashedPassword
      }
    });
    console.log('✓ Admin user updated:', {
      id: updated.id,
      email: updated.email,
      role: updated.role
    });
  } else {
    console.log('Creating new admin user...');
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('✓ Admin user created:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
