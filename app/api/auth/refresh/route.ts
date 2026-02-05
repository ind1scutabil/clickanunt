/**
 * API Route: Refresh Access Token
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token necesar" },
        { status: 400 }
      );
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la refresh token" },
      { status: 500 }
    );
  }
}
