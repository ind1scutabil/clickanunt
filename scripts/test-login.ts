import { db } from '../lib/db';
import bcrypt from 'bcrypt';

async function testLogin() {
  try {
    console.log('Testing database connection...');
    await db.testConnection();
    console.log('✓ Database connected');

    const email = 'daniel.enoiu87@gmail.com';
    console.log(`\nSearching for user: ${email}`);
    
    const user = await db.findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User NOT found in database');
      console.log('\nListing all users:');
      const allUsers = await db.user.findMany();
      console.log(`Found ${allUsers.length} users:`);
      allUsers.forEach((u: any) => {
        console.log(`- ${u.email} (${u.role})`);
      });
      return;
    }

    console.log('✓ User found:', user.email);
    console.log('  Role:', user.role);
    console.log('  Password hash:', user.password?.substring(0, 20) + '...');
    
    // Test password
    const testPassword = process.argv[2] || 'test123';
    console.log(`\nTesting password: "${testPassword}"`);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('Password valid:', isValid ? '✓ YES' : '❌ NO');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
