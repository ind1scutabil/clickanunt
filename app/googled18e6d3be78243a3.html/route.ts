import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/** Google Search Console HTML file — literal route wins over `[categorySlug]` so `.html` is not treated as a category slug. */
export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "googled18e6d3be78243a3.html");
  const body = (await readFile(filePath, "utf8")).replace(/\r\n/g, "\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
