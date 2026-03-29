/**
 * Safe removal of known seeded / demo users and their data (listings cascade via FK).
 *
 * Detection (PostgreSQL, exact domain — avoids false positives like user@notexample.com):
 * - split_part(lower(email), '@', 2) IN ('clickanunt.local', 'example.com', 'dealer.example')
 * - OR lower(email) LIKE 'seed-owner-%' (enterprise seed local part)
 * - OR email IN (alice, bob, test from prisma seeds)
 * - Optional: --include-default-admin → also admin@clickanunt.ro
 *
 * Safety: CLEANUP_PROTECT_EMAILS=email1@x.ro,email2@y.com — never deleted (case-insensitive match).
 *
 * Usage:
 *   node --env-file=.env node_modules/.bin/ts-node --project tsconfig.scripts.json scripts/cleanup-seed-users.ts --preview
 *   CONFIRM_CLEANUP_SEED=YES node --env-file=.env ... scripts/cleanup-seed-users.ts --execute
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const EXACT_SEED_EMAILS = [
  "alice@example.com",
  "bob@dealer.example",
  "test@example.com",
] as const;

const DEFAULT_SEED_ADMIN_EMAIL = "admin@clickanunt.ro";

function parseProtectedEmails(): string[] {
  const raw = process.env.CLEANUP_PROTECT_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** IDs of users matching seed/demo rules (safe domain checks). */
async function findSeedUserIds(
  includeDefaultAdmin: boolean,
  protectedLower: string[]
): Promise<string[]> {
  const adminClause = includeDefaultAdmin
    ? Prisma.sql`OR email = ${DEFAULT_SEED_ADMIN_EMAIL}`
    : Prisma.empty;

  const protectClause =
    protectedLower.length > 0
      ? Prisma.sql`AND lower(email) NOT IN (${Prisma.join(
          protectedLower.map((e) => Prisma.sql`${e}`)
        )})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM users
    WHERE (
      split_part(lower(email), '@', 2) IN ('clickanunt.local', 'example.com', 'dealer.example')
      OR lower(email) LIKE 'seed-owner-%'
      OR email IN ('alice@example.com', 'bob@dealer.example', 'test@example.com')
      ${adminClause}
    )
    ${protectClause}
  `;
  return rows.map((r) => r.id);
}

async function countRemainingSeedPattern(): Promise<number> {
  const [row] = await prisma.$queryRaw<[{ c: bigint }]>`
    SELECT count(*)::bigint AS c FROM users
    WHERE (
      split_part(lower(email), '@', 2) IN ('clickanunt.local', 'example.com', 'dealer.example')
      OR lower(email) LIKE 'seed-owner-%'
      OR email IN ('alice@example.com', 'bob@dealer.example', 'test@example.com')
    )
  `;
  return Number(row.c);
}

async function main() {
  const args = process.argv.slice(2);
  const preview = args.includes("--preview") || (!args.includes("--execute") && !args.includes("--help"));
  const execute = args.includes("--execute");
  const includeDefaultAdmin = args.includes("--include-default-admin");

  if (args.includes("--help") || (!preview && !execute)) {
    console.log(`
Usage:
  --preview                 Preview counts + write backup JSON (default)
  --execute                 Delete matching users (requires CONFIRM_CLEANUP_SEED=YES)
  --include-default-admin   Also delete ${DEFAULT_SEED_ADMIN_EMAIL} (only if that row is not your real admin)

Env:
  CLEANUP_PROTECT_EMAILS    Comma-separated emails to NEVER delete
`);
    process.exit(0);
  }

  if (execute && process.env.CONFIRM_CLEANUP_SEED !== "YES") {
    console.error(
      "Refused: set CONFIRM_CLEANUP_SEED=YES to run --execute (production safety gate)."
    );
    process.exit(1);
  }

  const protectedLower = parseProtectedEmails();
  const userIds = await findSeedUserIds(includeDefaultAdmin, protectedLower);

  const users =
    userIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            createdAt: true,
          },
          orderBy: { email: "asc" },
        });

  const listingCount =
    userIds.length === 0
      ? 0
      : await prisma.listing.count({
          where: { ownerUserId: { in: userIds } },
        });

  const listingsSample =
    userIds.length === 0
      ? []
      : await prisma.listing.findMany({
          where: { ownerUserId: { in: userIds } },
          select: { id: true, title: true, ownerUserId: true, status: true },
          take: 20,
        });

  const moderationAssigned = await prisma.moderationQueue.count({
    where: { assignedTo: { in: userIds } },
  });

  console.log("=== CLEANUP SEED USERS — DETECTION RULES ===");
  console.log(
    "- Domain (exact): clickanunt.local | example.com | dealer.example (via split_part, no notexample.com false positives)"
  );
  console.log("- Local part: lower(email) LIKE 'seed-owner-%'");
  console.log(`- Exact: ${EXACT_SEED_EMAILS.join(", ")}`);
  console.log(
    `- Admin ${DEFAULT_SEED_ADMIN_EMAIL}: ${includeDefaultAdmin ? "INCLUDED" : "EXCLUDED (use --include-default-admin to delete)"}`
  );
  if (protectedLower.length > 0) {
    console.log(`- Protected (never delete): ${protectedLower.join(", ")}`);
  }
  console.log("");
  console.log("=== PREVIEW ===");
  console.log(`Users to delete: ${users.length}`);
  console.log(`Listings owned by those users: ${listingCount}`);
  console.log(`ModerationQueue rows with assignedTo in these users: ${moderationAssigned}`);
  console.log("");
  console.log("Sample users (up to 15):");
  users.slice(0, 15).forEach((u) => {
    console.log(`  ${u.id}  ${u.email}  role=${u.role}  name=${u.name ?? ""}`);
  });
  if (users.length > 15) console.log(`  ... (${users.length - 15} more)`);
  console.log("");
  console.log("Sample listings (up to 20):");
  listingsSample.forEach((l) => {
    const t = (l.title ?? "").slice(0, 60);
    console.log(`  ${l.id}  | ${t}... | status=${l.status}`);
  });

  const exportDir = path.join(process.cwd(), "scripts", "exports");
  mkdirSync(exportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(exportDir, `cleanup-seed-backup-${stamp}.json`);
  const backup = {
    generatedAt: new Date().toISOString(),
    mode: preview ? "preview" : "execute",
    detection: {
      rules: [
        "split_part(lower(email), '@', 2) IN ('clickanunt.local', 'example.com', 'dealer.example')",
        "lower(email) LIKE 'seed-owner-%'",
        "email IN prisma seed exact list",
        includeDefaultAdmin ? `OR email = ${DEFAULT_SEED_ADMIN_EMAIL}` : null,
      ].filter(Boolean),
      protectedEmails: protectedLower,
      includeDefaultAdmin,
    },
    counts: { users: users.length, listings: listingCount, moderationQueueAssigned: moderationAssigned },
    users,
    listingsSample,
    listingIdsNote: "Full listing id list omitted if > 500; re-query with ownerUserId in if needed.",
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`Backup written: ${backupPath}`);

  if (!execute) {
    console.log("");
    console.log("No deletes performed (--preview). To delete after review:");
    console.log(
      `  CONFIRM_CLEANUP_SEED=YES node --env-file=.env node_modules/.bin/ts-node --project tsconfig.scripts.json scripts/cleanup-seed-users.ts --execute`
    );
    await prisma.$disconnect();
    return;
  }

  if (userIds.length === 0) {
    console.log("Nothing to delete (0 matching users).");
    await prisma.$disconnect();
    return;
  }

  console.log("");
  console.log("=== EXECUTE ===");

  await prisma.$transaction(async (tx) => {
    const mod = await tx.moderationQueue.updateMany({
      where: { assignedTo: { in: userIds } },
      data: { assignedTo: null },
    });
    console.log(`ModerationQueue assignedTo cleared: ${mod.count} rows`);

    const del = await tx.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Users deleted: ${del.count}`);
  });

  const remaining = await countRemainingSeedPattern();

  console.log("");
  console.log("=== POST-DELETE CHECK ===");
  console.log(
    `Users still matching seed domain/pattern (should be 0; excludes admin unless included): ${remaining}`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
