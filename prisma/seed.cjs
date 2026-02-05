require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log('Seeding database with test listings for all categories...');

  // Clear existing data
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'test123456', // Plain text for seeding - in production use bcrypt
      role: 'user',
    },
  });

  // Category 1: Auto, moto și ambarcațiuni
  await prisma.listing.create({
    data: {
      title: 'Dacia Logan 2018 - impecabilă',
      category: 'Auto, moto și ambarcațiuni',
      subcategory: 'Autoturisme',
      description: 'Mașină în stare foarte bună, revizii la zi, recent adusă din Germania.',
      priceAmount: 32000,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      make: 'Dacia',
      model: 'Logan',
      year: 2018,
      mileage: 85000,
      fuel: 'petrol',
      transmission: 'manual',
      vin: 'VL1234567890',
      photos: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'],
      isFeatured: true,
    },
  });

  await prisma.listing.create({
    data: {
      title: 'BMW Seria 3, 2020, Full Options',
      category: 'Auto, moto și ambarcațiuni',
      subcategory: 'Autoturisme',
      description: 'BMW Seria 3 320d xDrive, cutie automată, interior piele, pachet M Sport.',
      priceAmount: 75000,
      priceCurrency: 'RON',
      county: 'Cluj',
      city: 'Cluj-Napoca',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      make: 'BMW',
      model: 'Seria 3',
      year: 2020,
      mileage: 45000,
      fuel: 'diesel',
      transmission: 'automatic',
      vin: 'WB1234567890',
      photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
      isFeatured: true,
    },
  });

  // Category 2: Imobiliare
  await prisma.listing.create({
    data: {
      title: 'Apartament 2 camere, Militari Residence',
      category: 'Imobiliare',
      subcategory: 'Apartamente',
      description: 'Apartament nou, 2 camere, 56mp, etaj 3/5, finisaje moderne, loc parcare inclus.',
      priceAmount: 95000,
      priceCurrency: 'EUR',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      isFeatured: true,
    },
  });

  await prisma.listing.create({
    data: {
      title: 'Vilă 5 camere, zona Baneasa',
      category: 'Imobiliare',
      subcategory: 'Case/vile',
      description: 'Vilă exclusivistă P+1, 250mp utili, teren 400mp, piscină, garaj 2 mașini.',
      priceAmount: 450000,
      priceCurrency: 'EUR',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800'],
      isFeatured: false,
    },
  });

  // Category 3: Electronice și electrocasnice
  await prisma.listing.create({
    data: {
      title: 'iPhone 14 Pro Max 256GB Deep Purple',
      category: 'Electronice și electrocasnice',
      subcategory: 'Telefoane',
      description: 'iPhone 14 Pro Max, 256GB, Deep Purple, impecabil, garantie Apple 8 luni.',
      priceAmount: 4500,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      photos: ['https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800'],
      isFeatured: true,
    },
  });

  await prisma.listing.create({
    data: {
      title: 'Laptop Gaming ASUS ROG Strix G15',
      category: 'Electronice și electrocasnice',
      subcategory: 'Calculatoare/Laptopuri',
      description: 'ASUS ROG Strix G15, RTX 4060, i7-13650HX, 16GB RAM, 512GB SSD, ecran 165Hz.',
      priceAmount: 5200,
      priceCurrency: 'RON',
      county: 'Iași',
      city: 'Iași',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800'],
      isFeatured: false,
    },
  });

  // Category 4: Modă și accesorii
  await prisma.listing.create({
    data: {
      title: 'Geacă Piele The North Face - Original',
      category: 'Modă și accesorii',
      subcategory: 'Îmbrăcăminte',
      description: 'Geacă piele autentică The North Face, mărimea L, culoare neagră, stare nouă.',
      priceAmount: 850,
      priceCurrency: 'RON',
      county: 'Timiș',
      city: 'Timișoara',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'],
      isFeatured: false,
    },
  });

  // Category 5: Casă și grădină
  await prisma.listing.create({
    data: {
      title: 'Set Mobilier Grădină Ratan Sintetic',
      category: 'Casă și grădină',
      subcategory: 'Mobilier gradina',
      description: 'Set complet mobilier grădină, ratan sintetic de calitate, canapea 3 locuri + 2 fotolii + masă.',
      priceAmount: 2100,
      priceCurrency: 'RON',
      county: 'Cluj',
      city: 'Cluj-Napoca',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800'],
      isFeatured: false,
    },
  });

  // Category 6: Sport, hobby, muzică
  await prisma.listing.create({
    data: {
      title: 'Bicicletă MTB Giant Talon 2, 29"',
      category: 'Sport, hobby, muzică',
      subcategory: 'Biciclete',
      description: 'Bicicletă MTB Giant Talon 2, roți 29", cadru aluminiu, schimbător Shimano 21 viteze.',
      priceAmount: 1600,
      priceCurrency: 'RON',
      county: 'Brașov',
      city: 'Brașov',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      photos: ['https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800'],
      isFeatured: false,
    },
  });

  // Category 7: Copii
  await prisma.listing.create({
    data: {
      title: 'Cărucior Copii 3 în 1 Maxi-Cosi',
      category: 'Copii',
      subcategory: 'Carucioare',
      description: 'Cărucior Maxi-Cosi 3 în 1, landou + scaun sport + scaun auto, stare impecabilă.',
      priceAmount: 1400,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      photos: ['https://images.unsplash.com/photo-1588008477065-cb7ee8cb1992?w=800'],
      isFeatured: false,
    },
  });

  // Category 8: Animale de companie
  await prisma.listing.create({
    data: {
      title: 'Cățeluși Golden Retriever de Rasă',
      category: 'Animale de companie',
      subcategory: 'Câini',
      description: 'Cățeluși Golden Retriever pedigree, 8 săptămâni, vaccinați, deparazitați, cu carnet.',
      priceAmount: 2500,
      priceCurrency: 'RON',
      county: 'Ilfov',
      city: 'Voluntari',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800'],
      isFeatured: true,
    },
  });

  // Category 9: Locuri de muncă
  await prisma.listing.create({
    data: {
      title: 'Dezvoltator Full-Stack (React + Node.js)',
      category: 'Locuri de muncă',
      subcategory: 'IT/Software',
      description: 'Căutăm dezvoltator Full-Stack cu experiență React, Node.js, PostgreSQL. Salariu 8000-12000 RON net.',
      priceAmount: 10000,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'],
      isFeatured: true,
    },
  });

  // Category 10: Servicii
  await prisma.listing.create({
    data: {
      title: 'Servicii Amenajări Interioare Complete',
      category: 'Servicii',
      subcategory: 'Constructii/Amenajari',
      description: 'Echipă profesională amenajări interioare: zugrăveli, glet, parchet, gresie, faianță. Proiecte la cheie.',
      priceAmount: 50,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'new',
      photos: ['https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800'],
      isFeatured: false,
    },
  });

  // Category 11: Agricultură
  await prisma.listing.create({
    data: {
      title: 'Tractor John Deere 6120M, 120CP',
      category: 'Agricultură',
      subcategory: 'Tractoare',
      description: 'Tractor John Deere 6120M, 120CP, 4x4, cabină climatizată, 2500 ore funcționare.',
      priceAmount: 85000,
      priceCurrency: 'EUR',
      county: 'Timiș',
      city: 'Lugoj',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      photos: ['https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800'],
      isFeatured: false,
    },
  });

  // Category 12: Altele
  await prisma.listing.create({
    data: {
      title: 'Colecție Timbre Rare România 1900-1950',
      category: 'Altele',
      subcategory: 'Colectii',
      description: 'Colecție timbre românești rare perioada 1900-1950, peste 300 bucăți, stare foarte bună.',
      priceAmount: 3500,
      priceCurrency: 'RON',
      county: 'București',
      city: 'București',
      ownerUserId: testUser.id,
      status: 'active',
      condition: 'used',
      photos: ['https://images.unsplash.com/photo-1598901405566-1e0c1c9856a3?w=800'],
      isFeatured: false,
    },
  });

  console.log('✅ Successfully seeded 15 test listings across all 12 categories!');
  console.log(`Created user: ${testUser.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
