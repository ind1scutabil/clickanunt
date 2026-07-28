import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api-auth";
import { Permission } from "@/lib/rbac";
import { buildSeoAdminStatus } from "@/lib/seo/seo-admin-status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireAdminApiPermission(request, Permission.ANALYTICS_VIEW);
  if (!gate.ok) return gate.response;

  try {
    const payload = await buildSeoAdminStatus();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Nu am putut încărca statusul SEO" },
      { status: 500 }
    );
  }
}
