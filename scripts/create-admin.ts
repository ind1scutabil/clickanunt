import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import validator from 'validator';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clickanunt.ro';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  // Normalize email (same as sanitizeEmail in lib/sanitize.ts)
  const normalizedEmail = validator.normalizeEmail(adminEmail) || adminEmail;
  console.log(`Email normalized: ${adminEmail} => ${normalizedEmail}`);
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existing) {
    console.log('User already exists. Updating role to admin and password...');
    const updated = await prisma.user.update({
      where: { email: normalizedEmail },
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
        email: normalizedEmail,
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
