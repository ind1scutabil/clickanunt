import "dotenv/config";
import { prisma } from '../lib/prisma';

async function checkTables() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `;
  
  console.log('Existing tables:');
  console.log(tables);
  
  await prisma.$disconnect();
}

checkTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
