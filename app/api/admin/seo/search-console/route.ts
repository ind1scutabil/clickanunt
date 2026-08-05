import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api-auth";
import { Permission } from "@/lib/rbac";
import {
  emptySearchConsoleDashboardPayload,
  fetchSearchConsoleReport,
  type SearchConsoleDimension,
  type SearchConsoleRangeDays,
} from "@/lib/seo/search-console-client";

export const dynamic = "force-dynamic";

function parseRange(raw: string | null): SearchConsoleRangeDays {
  if (raw === "7" || raw === "90") return Number(raw) as SearchConsoleRangeDays;
  return 28;
}

function parseDimension(raw: string | null): SearchConsoleDimension {
  if (raw === "page" || raw === "device" || raw === "country" || raw === "date") return raw;
  return "query";
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminApiPermission(request, Permission.ANALYTICS_VIEW);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const rangeDays = parseRange(searchParams.get("range"));
  const dimension = parseDimension(searchParams.get("dimension"));

  const result = await fetchSearchConsoleReport({ rangeDays, dimension, rowLimit: 25 });
  if (result.status === "not_configured") {
    return NextResponse.json(emptySearchConsoleDashboardPayload(), {
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (result.status === "error") {
    return NextResponse.json(
      {
        status: "error",
        message: result.message,
        metrics: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
