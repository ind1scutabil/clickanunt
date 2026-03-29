/* eslint-disable @typescript-eslint/no-var-requires */
const bcrypt = require('bcrypt') as typeof import('bcrypt');
const { prisma } = require('../lib/prisma') as { prisma: typeof import('../lib/prisma').prisma };
const { computeFeedBoost } = require('../lib/listing-feed-boost') as typeof import('../lib/listing-feed-boost');

type Args = {
  count: number;
  owners: number;
  promotedRate: number; // 0..1
  photosPerListing: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const next = argv[i + 1];

    if (key === 'dry-run') {
      args.dryRun = true;
      continue;
    }

    if (next && !next.startsWith('--')) {
      (args as any)[key] = next;
      i++;
    } else {
      (args as any)[key] = true;
    }
  }

  const count = typeof args.count === 'string' ? Number(args.count) : (args.count ?? 1000);
  const owners = typeof args.owners === 'string' ? Number(args.owners) : (args.owners ?? 200);
  const promotedRate =
    typeof args.promotedRate === 'string' ? Number(args.promotedRate) : (args.promotedRate ?? 0.35);
  const photosPerListing =
    typeof args.photosPerListing === 'string'
      ? Number(args.photosPerListing)
      : (args.photosPerListing ?? 0);

  if (!Number.isFinite(count) || count <= 0) throw new Error(`Invalid --count: ${args.count}`);
  if (!Number.isFinite(owners) || owners <= 0) throw new Error(`Invalid --owners: ${args.owners}`);
  if (!Number.isFinite(promotedRate) || promotedRate < 0 || promotedRate > 1) {
    throw new Error(`Invalid --promotedRate: ${args.promotedRate}`);
  }
  if (!Number.isFinite(photosPerListing) || photosPerListing < 0 || photosPerListing > 20) {
    throw new Error(`Invalid --photosPerListing: ${args.photosPerListing}`);
  }

  return {
    count,
    owners,
    promotedRate,
    photosPerListing,
    dryRun: args.dryRun === true,
  };
}

// Simple deterministic PRNG so results are stable across runs.
function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: ReadonlyArray<T>): T {
  return items[Math.floor(rng() * items.length)];
}

function formatRomanianPhone(rng: () => number): string {
  // Not required by schema if omitted, but we can generate a plausible RO number.
  const prefixes = ['072', '073', '074', '075', '076', '077', '078', '079'];
  const p = pick(rng, prefixes);
  const rest = Math.floor(rng() * 90000000)
    .toString()
    .padStart(8, '0');
  return `+40 ${p}${rest.slice(3)}`;
}

function carTitle(rng: () => number, make: string, model: string, year: number) {
  const suffixes = ['îngrijit', 'recent import', 'full options', 'fără accidente', 'istoric complet'];
  const s = pick(rng, suffixes);
  return `${make} ${model} ${year} - ${s}`;
}

function listingDescription(rng: () => number, title: string) {
  const bullets = [
    'Dotări complete și stare foarte bună.',
    'Verificare tehnică efectuată și istoric disponibil la cerere.',
    'Aspect îngrijit, întreținere la timp.',
    'Preț corect, negociabil pentru cumpărători serioși.',
    'Răspund rapid la mesaje și ofer detalii suplimentare.',
  ];
  const b1 = pick(rng, bullets);
  const b2 = pick(rng, bullets.filter((b) => b !== b1));
  const b3 = pick(rng, bullets.filter((b) => ![b1, b2].includes(b)));
  return `${title}\n\n${b1}\n${b2}\n${b3}\n\nPentru programare vizionare, contactează vânzătorul.`;
}

function pickPromotion(rng: () => number): { type: string; featured: boolean; durationDays: number } {
  const promos: Array<{ type: string; featured: boolean; durationDays: number }> = [
    { type: 'boost_7days', featured: true, durationDays: 7 },
    { type: 'boost_72h', featured: false, durationDays: 3 },
    { type: 'featured', featured: true, durationDays: 5 },
    { type: 'boost_24h', featured: false, durationDays: 1 },
  ];
  return pick(rng, promos);
}

async function main() {
  const args = parseArgs(process.argv);

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    throw new Error('USE_IN_MEMORY_DB=true => scriptul nu poate popula DB real.');
  }

  // Dry run: only validate generation and log a sample.
  if (args.dryRun) {
    const rng = mulberry32(123456);
    console.log('DRY RUN (no DB writes)');
    console.log({
      count: args.count,
      owners: args.owners,
      promotedRate: args.promotedRate,
      photosPerListing: args.photosPerListing,
    });

    const sampleMakes = [
      { make: 'Audi', models: ['A3', 'A4', 'A6', 'Q5', 'Q7'] },
      { make: 'BMW', models: ['Seria 3', 'Seria 5', 'X3', 'X5'] },
      { make: 'Mercedes', models: ['C-Class', 'E-Class', 'GLC', 'GLE'] },
      { make: 'Volkswagen', models: ['Golf', 'Passat', 'Tiguan'] },
    ];
    const cat = 'Auto, moto și ambarcațiuni';
    const tpl = pick(rng, sampleMakes);
    const model = pick(rng, tpl.models);
    const year = 2010 + Math.floor(rng() * 15);
    const title = carTitle(rng, tpl.make, model, year);
    console.log('Sample category:', cat);
    console.log('Sample title:', title);
    console.log('Sample photos: [] (no external stock imagery; UI uses default listing image)');
    return;
  }

  const rng = mulberry32(Date.now() % 1_000_000_000);

  // 1) Create owners
  console.log(`Creating ${args.owners} owner users...`);
  const seedPassword = 'SeedPassword123!';
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const existingUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'seed-owner-' } },
    select: { id: true, email: true },
    take: 1,
  });
  const alreadySeeded = existingUsers.length > 0;
  console.log(`Existing seed-owner-* users: ${alreadySeeded ? 'yes' : 'no'}`);

  const createdOwners: Array<{ id: string; email: string }> = [];
  for (let i = 0; i < args.owners; i++) {
    const email = `seed-owner-${i}-${Math.floor(rng() * 1e9)}@clickanunt.local`;
    const name = pick(rng, ['Alex', 'Maria', 'Andrei', 'Ioana', 'Vlad', 'Elena', 'Radu', 'Daria']) + `-${i}`;
    const trustScore = Math.floor(40 + rng() * 55);

    const owner = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'owner',
        accountType: 'private',
        verificationLevel: 'email',
        emailVerified: true,
        name,
        trustScore,
        phone: formatRomanianPhone(rng),
        phoneVerified: true,
        subscriptionTier: 'free',
        creditsBalance: 0,
        freeBoostsRemaining: 0,
        responseRate: Math.floor(rng() * 100),
        totalSales: Math.floor(rng() * 200),
        totalListings: 0,
        averageRating: 0,
        moderationSuspendedUntil: null,
        moderationSuspensionReason: null,
      },
      select: { id: true, email: true },
    });

    createdOwners.push(owner);
  }

  console.log(`Created owners: ${createdOwners.length}`);

  // 2) Create listings
  const carTemplates = [
    { make: 'Audi', models: ['A3', 'A4', 'A6', 'Q5', 'Q7'] },
    { make: 'BMW', models: ['Seria 3', 'Seria 5', 'X3', 'X5'] },
    { make: 'Mercedes', models: ['C-Class', 'E-Class', 'GLC', 'GLE'] },
    { make: 'Volkswagen', models: ['Golf', 'Passat', 'Tiguan'] },
    { make: 'Ford', models: ['Focus', 'Mondeo', 'Kuga'] },
    { make: 'Renault', models: ['Megane', 'Clio', 'Kadjar'] },
    { make: 'Skoda', models: ['Octavia', 'Superb', 'Karoq'] },
    { make: 'Toyota', models: ['Corolla', 'Avensis', 'RAV4'] },
    { make: 'Hyundai', models: ['Tucson', 'i30', 'Elantra'] },
    { make: 'Kia', models: ['Sportage', 'Ceed', 'Optima'] },
  ];

  const locations = [
    { county: 'București', city: 'București', region: 'București' },
    { county: 'Cluj', city: 'Cluj-Napoca', region: 'Cluj' },
    { county: 'Iași', city: 'Iași', region: 'Iași' },
    { county: 'Brașov', city: 'Brașov', region: 'Brașov' },
    { county: 'Timiș', city: 'Timișoara', region: 'Timiș' },
    { county: 'Constanța', city: 'Constanța', region: 'Constanța' },
    { county: 'Sibiu', city: 'Sibiu', region: 'Sibiu' },
  ];

  // Prisma enum FuelType: petrol | diesel | electric | hybrid | other
  const fuelTypes = ['petrol', 'diesel', 'hybrid', 'electric', 'other'] as const;
  // UI promote route folosește doar 'manual' | 'automatic' (ca să fie compatibil).
  const uiTransmissions = ['manual', 'automatic'] as const;

  const createdListingIds: string[] = [];
  console.log(`Creating ${args.count} listings...`);

  const chunkSize = 200;
  for (let start = 0; start < args.count; start += chunkSize) {
    const chunkCount = Math.min(chunkSize, args.count - start);
    const chunk: any[] = [];

    for (let j = 0; j < chunkCount; j++) {
      const i = start + j;
      const owner = createdOwners[i % createdOwners.length];
      const ownerUserId = owner.id;

      const loc = pick(rng, locations);
      const auto = pick(rng, carTemplates);
      const model = pick(rng, auto.models);

      const year = 2006 + Math.floor(rng() * 19); // 2006..2024
      const condition = pick(rng, ['used', 'used', 'refurbished', 'used']) as 'used' | 'refurbished' | 'new' | 'for_parts';
      const fuel = pick(rng, fuelTypes) as (typeof fuelTypes)[number];
      const transmission = pick(rng, uiTransmissions) as (typeof uiTransmissions)[number];
      const mileage =
        condition === 'used' || condition === 'refurbished'
          ? Math.floor(30000 + rng() * 220000)
          : Math.floor(100 + rng() * 5000);

      const isPromoted = rng() < args.promotedRate;
      const promo = isPromoted ? pickPromotion(rng) : null;

      const priceBase = (() => {
        const makeFactor: Record<string, number> = {
          Audi: 1.0,
          BMW: 1.08,
          Mercedes: 1.15,
          Volkswagen: 0.85,
          Ford: 0.75,
          Renault: 0.7,
          Skoda: 0.8,
          Toyota: 0.78,
          Hyundai: 0.72,
          Kia: 0.7,
        };
        const f = makeFactor[auto.make] ?? 0.8;
        const yearFactor = 0.6 + (year - 2006) * 0.03;
        const mileageFactor = Math.max(0.45, 1.2 - mileage / 300000);
        return Math.round(12000 * f * yearFactor * mileageFactor);
      })();

      const priceAmount = Math.max(2500, Math.min(150000, priceBase));

      const category = 'Auto, moto și ambarcațiuni';
      const subcategory = pick(rng, ['Autoturisme', 'SUV', 'Sedan', 'Break', 'Hatchback', 'Monovolum']);

      const title = carTitle(rng, auto.make, model, year);

      /** No fake/stock URLs — empty array; marketplace UI shows `/images/default-listing.jpg`. */
      const photos: string[] = [];

      const description = listingDescription(rng, title);

      const now = new Date();
      const publishedAt = new Date(now.getTime() - Math.floor(rng() * 30) * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(now.getTime() + Math.floor(10 + rng() * 60) * 24 * 60 * 60 * 1000);

      const attributes =
        condition === 'used' || condition === 'refurbished'
          ? {
              warranty: pick(rng, ['3 luni', '6 luni', '12 luni', 'garanție la cerere']),
              countryOfOrigin: pick(rng, ['Germania', 'Franța', 'Italia', 'Olanda', 'Belgia']),
              inspectionValid: pick(rng, ['2026-10-01', '2027-01-15', '2026-06-20']),
            }
          : {};

      const base: any = {
        ownerUserId,
        title,
        category,
        subcategory,
        description,
        priceAmount,
        priceCurrency: 'RON',
        photos,
        status: 'active',
        moderationStatus: 'approved',
        moderatedAt: now,
        moderatedBy: 'seed-admin',
        views: 0,
        isFeatured: Boolean(promo?.featured ?? false),
        isPromoted: isPromoted,
        feedBoost: computeFeedBoost(isPromoted, Boolean(promo?.featured ?? false)),
        promotionType: promo?.type ?? null,
        promotionStartedAt: promo ? new Date(now.getTime() - Math.floor(rng() * 2) * 24 * 60 * 60 * 1000) : null,
        promotionExpiresAt: promo ? new Date(now.getTime() + promo.durationDays * 24 * 60 * 60 * 1000) : null,
        condition,
        make: auto.make,
        model,
        year,
        mileage,
        fuel,
        transmission,
        county: loc.county,
        city: loc.city,
        region: loc.region,
        vin: `VIN-${auto.make.slice(0, 3).toUpperCase()}-${year}-${i}`.slice(0, 30),
        contactPhone: formatRomanianPhone(rng),
        isDealer: false,
        attributes,
        publishedAt,
        expiresAt,
      };

      chunk.push(base);
    }

    const created = await prisma.listing.createMany({
      data: chunk,
      skipDuplicates: false,
    });

    console.log(`[seed] Created chunk: ${created.count} listings (${start}..${start + chunkCount - 1})`);
  }

  // Note: createMany doesn't return IDs; views are default 0 so no need to post-process.
  console.log('Seed completed.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });

export {};

