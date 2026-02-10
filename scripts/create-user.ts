import { db } from '../lib/db';
import bcrypt from 'bcrypt';

async function createUser() {
  try {
    const email = process.argv[2] || 'daniel.enoiu87@gmail.com';
    const password = process.argv[3] || 'Gz082306gz082306@';
    const role = process.argv[4] || 'user';

    console.log('Testing database connection...');
    await db.testConnection();
    console.log('✓ Database connected');

    console.log(`\nCreating user: ${email}`);
    
    // Check if user exists
    const existing = await db.findUserByEmail(email);
    if (existing) {
      console.log('❌ User already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await db.createUser({
      email,
      password: hashedPassword,
      role,
      name: email.split('@')[0],
    });

    console.log('✓ User created successfully!');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('\nYou can now login with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createUser();
