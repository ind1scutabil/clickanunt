export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { validateSecureRequest } from "@/lib/security/middleware";
import { changePasswordSchema } from "@/lib/security/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    // Verifică autentificare
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: changePasswordSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { currentPassword, newPassword } = security.data as {
      currentPassword: string;
      newPassword: string;
    };

    // Get user din DB
    const dbUser = await db.findUserById(user.id);

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilizator nu găsit" },
        { status: 404 }
      );
    }

    // Verifică parola actuală
    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Parola actuală este incorectă" },
        { status: 401 }
      );
    }

    // Hash parola nouă
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizează parola
    await db.updateUser(user.id, { password: newHash });

    return NextResponse.json({
      success: true,
      message: "Parola schimbată cu succes",
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: "Eroare la schimbare" },
      { status: 500 }
    );
  }
}
