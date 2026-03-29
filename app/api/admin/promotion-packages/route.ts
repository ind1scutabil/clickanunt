export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import {
  getMergedPromotionPackages,
  promotionPackagesPutSchema,
  savePromotionPackages,
  type PromotionPackageRow,
} from "@/lib/promotion-packages";

function isAdminRole(role: string | undefined) {
  return role === "admin" || role === "owner";
}

/**
 * GET /api/admin/promotion-packages
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const packages = await getMergedPromotionPackages();
    return NextResponse.json(
      { packages },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Eroare la citire" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/promotion-packages — persistă pachetele (feature flag JSON).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: promotionPackagesPutSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const data = security.data as { packages: PromotionPackageRow[] };
    await savePromotionPackages(data.packages);

    return NextResponse.json({ success: true, packages: data.packages });
  } catch (e) {
    console.error("[admin/promotion-packages] PUT", e);
    return NextResponse.json({ error: "Nu am putut salva configurația" }, { status: 500 });
  }
}
