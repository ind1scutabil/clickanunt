import { db } from '../lib/db';

async function resetLoginAttempts() {
  try {
    const email = process.argv[2] || 'daniel.enoiu87@gmail.com';

    console.log('Testing database connection...');
    await db.testConnection();
    console.log('✓ Database connected');

    console.log(`\nResetting login attempts for: ${email}`);
    
    const user = await db.findUserByEmail(email);
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    await db.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    console.log('✓ Login attempts reset successfully!');
    console.log('  Failed attempts: 0');
    console.log('  Account unlocked');
    console.log('\nYou can now try logging in again.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetLoginAttempts();
