export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getMergedPromotionPackages, toPublicPromotionPackage } from "@/lib/promotion-packages";

/**
 * GET /api/promotion-packages — prețuri pachete pentru pagina de promovare (public).
 */
export async function GET() {
  try {
    const rows = await getMergedPromotionPackages();
    const packages = rows.map(toPublicPromotionPackage);
    return NextResponse.json(
      { packages },
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch {
    return NextResponse.json({ error: "Nu am putut încărca pachetele" }, { status: 500 });
  }
}
