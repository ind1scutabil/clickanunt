import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

/**
 * Seed complet (șterge anunțuri + utilizatori + creează demo).
 * În producție este BLOCAT implicit — o singură rulare accidentală ar șterge utilizatori reali.
 * Permis doar cu ALLOW_DANGEROUS_FULL_SEED=true (staging / reset controlat).
 * Local: rulează când NODE_ENV nu e production (ex. npm run db:seed).
 */
function allowDestructiveFullSeed(): boolean {
  if (process.env.ALLOW_DANGEROUS_FULL_SEED === "true") return true;
  const isProdRuntime =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  return !isProdRuntime;
}

async function main() {
  if (!allowDestructiveFullSeed()) {
    console.log(
      "[seed] Refuzat: seed-ul destructiv nu rulează în producție. " +
        "Utilizatorii reali se autentifică cu parolele din baza de date. " +
        "Pentru reset controlat (staging), setează ALLOW_DANGEROUS_FULL_SEED=true."
    );
    return;
  }

  console.log("Seeding database (mod dev / reset explicit)...");

  // Clear existing data — doar când allowDestructiveFullSeed() e true
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      password: await bcrypt.hash("alice123", 10),
      role: "user",
      accountType: "private",
      verificationLevel: "none",
      listings: {
        create: [
          {
            title: "Dacia Logan 2018 - impecabila",
            category: "Auto, moto și ambarcațiuni",
            make: "Dacia",
            model: "Logan",
            year: 2018,
            mileage: 85000,
            fuel: "petrol",
            transmission: "manual",
            vin: "VL1234567890",
            photos: [
              "https://example.com/photos/logan1.jpg",
              "https://example.com/photos/logan2.jpg",
            ],
            priceAmount: 32000,
            priceCurrency: "RON",
            status: "active",
            description: "Mașină în stare foarte bună, revizii la zi.",
            city: "București",
            region: "Bucuresti",
            isFeatured: false,
          },
        ],
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@dealer.example",
      password: await bcrypt.hash("bob123", 10),
      role: "dealer",
      accountType: "business",
      verificationLevel: "business",
      listings: {
        create: [
          {
            title: "BMW Seria 3, 2015, km reduși",
            category: "Auto, moto și ambarcațiuni",
            make: "BMW",
            model: "Seria 3",
            year: 2015,
            mileage: 72000,
            fuel: "diesel",
            transmission: "automatic",
            vin: "WB1234567890",
            photos: ["https://example.com/photos/bmw1.jpg"],
            priceAmount: 45000,
            priceCurrency: "RON",
            status: "active",
            description: "Dealer, garanție la cerere.",
            city: "Cluj-Napoca",
            region: "Cluj",
            isFeatured: true,
          },
          {
            title: "Ford Focus 2012 - project",
            category: "Auto, moto și ambarcațiuni",
            make: "Ford",
            model: "Focus",
            year: 2012,
            mileage: 180000,
            fuel: "petrol",
            transmission: "manual",
            vin: "WF1234567890",
            photos: [],
            priceAmount: 12000,
            priceCurrency: "RON",
            status: "draft",
            description: "Necesită reparații minore.",
            city: "Iași",
            region: "Iasi",
            isFeatured: false,
          },
        ],
      },
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@clickanunt.ro";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "admin",
      accountType: "private",
      verificationLevel: "none",
      emailVerified: true,
    },
  });

  console.log(`Created users: ${alice.email} (parola: alice123), ${bob.email} (parola: bob123)`);
  console.log(`Admin: ${admin.email} (parola: ${adminPassword})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
