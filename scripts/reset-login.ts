/**
 * Deblochează contul după lockout la login și opțional setează parolă nouă (bcrypt).
 *
 * Rulează pe VPS din rădăcina proiectului (unde există .env cu DATABASE_URL):
 *
 *   npx ts-node --transpile-only --project tsconfig.scripts.json scripts/reset-login.ts admin@clickanunt.ro
 *
 * Cu parolă nouă (preferat — nu lasă parola în istoricul shell dacă folosești env):
 *
 *   RESET_LOGIN_PASSWORD='ParolaTaSigura' npx ts-node --transpile-only --project tsconfig.scripts.json scripts/reset-login.ts admin@clickanunt.ro
 *
 * Forțează rol admin (dacă contul a ajuns user din greșeală):
 *
 *   npx ts-node --transpile-only --project tsconfig.scripts.json scripts/reset-login.ts admin@clickanunt.ro --set-admin
 */
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("-") ? v : null;
}

async function main() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.error("Refuz: USE_IN_MEMORY_DB=true");
    process.exit(1);
  }

  const email =
    argValue("--email") ||
    process.argv.find((a) => !a.startsWith("-") && a.includes("@")) ||
    null;

  if (!email) {
    console.error(
      "Usage: npx ts-node --transpile-only --project tsconfig.scripts.json scripts/reset-login.ts <email> [--set-admin]",
    );
    console.error("Optional: RESET_LOGIN_PASSWORD=... pentru parolă nouă.");
    process.exit(1);
  }

  const setAdmin = process.argv.includes("--set-admin");
  /** Nu acceptăm parola pe argv (vizibil în `ps`); folosește RESET_LOGIN_PASSWORD. */
  const newPass = process.env.RESET_LOGIN_PASSWORD?.trim() || undefined;

  console.log("[reset-login] Caut utilizator:", email);

  const normalized = email.trim();
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      email: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true, email: true, role: true, failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    console.error("[reset-login] Nu există utilizator activ cu acest email.");
    process.exit(1);
  }

  const data: {
    failedLoginAttempts: number;
    lockedUntil: null;
    password?: string;
    role?: "admin" | "owner";
  } = {
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  if (newPass) {
    if (newPass.length < 8) {
      console.error("[reset-login] Parola trebuie să aibă minim 8 caractere.");
      process.exit(1);
    }
    data.password = await bcrypt.hash(newPass, 10);
    console.log("[reset-login] Se actualizează parola (bcrypt).");
  }

  if (setAdmin) {
    data.role = "admin";
    console.log("[reset-login] Se setează role = admin.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  console.log("[reset-login] OK:", {
    email: user.email,
    unlocked: true,
    failedLoginAttempts_before: user.failedLoginAttempts,
    lockedUntil_before: user.lockedUntil?.toISOString() ?? null,
    passwordChanged: Boolean(newPass),
    roleForcedAdmin: setAdmin,
  });
  console.log("\nPoți încerca login din nou.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
