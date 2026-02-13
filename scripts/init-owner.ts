/**
 * Script: Inițializare OWNER
 * Creează contul OWNER din .env la primul deploy
 * 
 * Usage: tsx scripts/init-owner.ts
 */

import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    console.error('❌ OWNER_EMAIL și OWNER_PASSWORD trebuie setate în .env');
    process.exit(1);
  }

  // Verifică dacă OWNER există deja
  const existingOwner = await prisma.user.findFirst({
    where: { role: 'owner' },
  });

  if (existingOwner) {
    console.log(`✅ OWNER există deja: ${existingOwner.email}`);
    
    // Update dacă e diferit
    if (existingOwner.email !== ownerEmail) {
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);
      await prisma.user.update({
        where: { id: existingOwner.id },
        data: {
          email: ownerEmail,
          password: hashedPassword,
        },
      });
      console.log(`✅ OWNER actualizat la ${ownerEmail}`);
    }
    return;
  }

  // Creează OWNER
  const hashedPassword = await bcrypt.hash(ownerPassword, 10);
  
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      password: hashedPassword,
      role: 'owner',
      trustScore: 100,
    },
  });

  console.log(`✅ OWNER creat: ${owner.email} (ID: ${owner.id})`);
  console.log(`   Role: ${owner.role}`);
  console.log(`   Trust Score: ${owner.trustScore}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Eroare:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
