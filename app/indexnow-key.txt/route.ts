import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/lib/seo/indexnow-client";

export const dynamic = "force-dynamic";

/**
 * IndexNow key verification file.
 * Returns plain text key when INDEXNOW_KEY is configured; 404 otherwise.
 */
export async function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
