import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'daniel.enoiu29@gmail.com';
  const testPassword = 'Gz082306gz082306@';
  
  const user = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('User found:', user.email);
  console.log('Password hash starts with:', user.password.substring(0, 20));
  
  const isValid = await bcrypt.compare(testPassword, user.password);
  console.log('Password valid?', isValid);
  
  // Test fresh hash
  const freshHash = await bcrypt.hash(testPassword, 10);
  console.log('\nFresh hash starts with:', freshHash.substring(0, 20));
  const freshValid = await bcrypt.compare(testPassword, freshHash);
  console.log('Fresh hash valid?', freshValid);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
