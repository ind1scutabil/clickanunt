import { authenticateUser } from '../lib/auth';

async function main() {
  const email = 'daniel.enoiu29@gmail.com';
  const password = 'Gz082306gz082306@';
  
  console.log('Testing login with:', { email, password: '***' });
  
  const result = await authenticateUser(email, password, '127.0.0.1');
  
  console.log('\nResult:', JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
