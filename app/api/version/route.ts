export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
  const gitCommit =
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    null;

  return NextResponse.json(
    {
      buildId,
      gitCommit,
    },
    { status: 200 }
  );
}
