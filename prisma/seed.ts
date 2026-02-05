import { prisma } from "./lib/prisma";

async function main() {
  console.log("Seeding database...");

  // Clear existing data (safe for development only)
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      role: "user",
      listings: {
        create: [
          {
            title: "Dacia Logan 2018 - impecabila",
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
      role: "dealer",
      listings: {
        create: [
          {
            title: "BMW Seria 3, 2015, km reduși",
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

  console.log(`Created users: ${alice.email}, ${bob.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
