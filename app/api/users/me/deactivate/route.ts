export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { accountDeactivateSchema } from "@/lib/security/validation-schemas";
import { createAuditLog } from "@/lib/audit";

/**
 * Soft-delete cont: `deletedAt` setat. Login-ul existent respinge utilizatorii șterși.
 * Email rămâne unic — același email nu se poate reînregistra fără intervenție suport.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: accountDeactivateSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, deletedAt: true, email: true, role: true },
    });

    if (!row || row.deletedAt) {
      return NextResponse.json(
        { error: "Contul nu poate fi dezactivat în starea curentă" },
        { status: 400 }
      );
    }

    if (row.role === "admin" || row.role === "owner") {
      return NextResponse.json(
        { error: "Conturile administrator nu pot fi dezactivate din această pagină" },
        { status: 403 }
      );
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: now },
    });

    await createAuditLog({
      userId: user.id,
      action: "user.self_deactivate",
      resource: "user",
      resourceId: user.id,
      details: { at: now.toISOString() },
    });

    const res = NextResponse.json({
      success: true,
      message: "Contul a fost dezactivat. Te poți deloga.",
    });

    res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    res.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Eroare la dezactivarea contului" },
      { status: 500 }
    );
  }
}
