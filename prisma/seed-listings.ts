import { prisma } from '../lib/prisma';
import { Condition, FuelType, Transmission } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user if doesn't exist
  const hashedPassword = await bcrypt.hash('Gz082306gz082306@', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'daniel.enoiu29@gmail.com' },
    update: {},
    create: {
      email: 'daniel.enoiu29@gmail.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin user created/verified');

  // Sample listings for each category
  const sampleListings = [
    {
      category: "Auto, moto și ambarcațiuni",
      title: "BMW Seria 3 - 2020",
      description: "BMW Seria 3 în stare impecabilă, full options, recent adus din Germania. Mașina este la prima proprietate în România.",
      priceAmount: 32000,
      make: "BMW",
      model: "Seria 3",
      year: 2020,
      mileage: 45000,
      fuel: FuelType.diesel,
      transmission: Transmission.automatic,
      county: "București",
      city: "București",
      condition: Condition.used,
      isFeatured: true,
    },
    {
      category: "Auto, moto și ambarcațiuni",
      title: "Audi A4 - 2018",
      description: "Audi A4 2018, diesel, cutie automată. Mașina este în stare foarte bună, recent adusă.",
      priceAmount: 25000,
      make: "Audi",
      model: "A4",
      year: 2018,
      mileage: 78000,
      fuel: FuelType.diesel,
      transmission: Transmission.automatic,
      county: "Cluj",
      city: "Cluj-Napoca",
      condition: Condition.used,
    },
    {
      category: "Imobiliare",
      title: "Apartament 3 camere - Centru",
      description: "Apartament spatios cu 3 camere în centrul Bucureștiului. Complet renovat, mobilat și utilat.",
      priceAmount: 120000,
      county: "București",
      city: "București",
      condition: Condition.used,
      isFeatured: true,
    },
    {
      category: "Imobiliare",
      title: "Casă 4 camere cu grădină",
      description: "Casă frumoasă cu 4 camere și grădină mare. Perfect pentru o familie.",
      priceAmount: 150000,
      county: "Ilfov",
      city: "Otopeni",
      condition: Condition.used,
    },
    {
      category: "Electronice și electrocasnice",
      title: "iPhone 15 Pro Max 256GB",
      description: "iPhone 15 Pro Max în stare perfectă, folosit doar 2 luni. Vine cu toate accesoriile.",
      priceAmount: 5200,
      county: "București",
      city: "București",
      condition: Condition.used,
      isFeatured: true,
    },
    {
      category: "Electronice și electrocasnice",
      title: "Samsung Smart TV 55 inch",
      description: "Smart TV Samsung 55 inch, 4K, HDR. Stare impecabilă.",
      priceAmount: 2100,
      county: "Timișoara",
      city: "Timișoara",
      condition: Condition.used,
    },
    {
      category: "Modă și frumusețe",
      title: "Geacă piele naturală",
      description: "Geacă din piele naturală, mărime M. Foarte puțin purtată.",
      priceAmount: 450,
      county: "București",
      city: "București",
      condition: Condition.used,
    },
    {
      category: "Casă și grădină",
      title: "Set mobilier living",
      description: "Set complet mobilier living: canapea, fotolii, masă. Stare foarte bună.",
      priceAmount: 3500,
      county: "Cluj",
      city: "Cluj-Napoca",
      condition: Condition.used,
    },
    {
      category: "Sport, hobby, muzică",
      title: "Bicicletă MTB profesională",
      description: "Bicicletă de munte profesională, cadru carbon, full suspension.",
      priceAmount: 4200,
      county: "Brașov",
      city: "Brașov",
      condition: Condition.used,
      isFeatured: true,
    },
    {
      category: "Copii",
      title: "Cărucior bebe 3 in 1",
      description: "Cărucior bebe complet: landou, scaun auto, cărucior sport. Foarte puțin folosit.",
      priceAmount: 1800,
      county: "București",
      city: "București",
      condition: Condition.used,
    },
    {
      category: "Animale de companie",
      title: "Cățeluși Golden Retriever",
      description: "Cățeluși Golden Retriever de rasă pură. Vaccinați și deparazitați.",
      priceAmount: 2000,
      county: "Iași",
      city: "Iași",
      condition: Condition.new,
    },
    {
      category: "Locuri de muncă",
      title: "Dezvoltator Web - Remote",
      description: "Căutăm dezvoltator web cu experiență în React și Node.js. Program flexibil, 100% remote.",
      priceAmount: 5000,
      county: "București",
      city: "București",
      condition: Condition.new,
    },
    {
      category: "Servicii, afaceri, echipamente",
      title: "Servicii contabilitate",
      description: "Oferim servicii complete de contabilitate pentru firme mici și mijlocii.",
      priceAmount: 500,
      county: "București",
      city: "București",
      condition: Condition.new,
    },
    {
      category: "Agricultură",
      title: "Tractor agricol John Deere",
      description: "Tractor agricol John Deere, an fabricație 2015. Foarte bine întreținut.",
      priceAmount: 35000,
      county: "Argeș",
      city: "Pitești",
      condition: Condition.used,
    },
    {
      category: "Altele",
      title: "Colecție timbre rare",
      description: "Colecție valoroasă de timbre rare din perioada 1920-1960.",
      priceAmount: 800,
      county: "București",
      city: "București",
      condition: Condition.used,
    },
  ];

  console.log('📝 Creating sample listings...');

  for (const listing of sampleListings) {
    await prisma.listing.create({
      data: {
        ...listing,
        ownerUserId: user.id,
        status: 'active',
      },
    });
    console.log(`✅ Created: ${listing.title}`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
