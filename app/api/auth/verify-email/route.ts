export const runtime = "nodejs";
import { NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint uses fields that no longer exist in the schema.
 * Verification system has been refactored to use VerificationRequest model.
 * See /lib/verification.ts for the current implementation.
 */
export async function POST(request: Request) {
  return NextResponse.json(
    { error: "This endpoint has been deprecated. Please use the new verification system." },
    { status: 410 }
  );
}

export async function PUT(request: Request) {
  return NextResponse.json(
    { error: "This endpoint has been deprecated. Please use the new verification system." },
    { status: 410 }
  );
}

