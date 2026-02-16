import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/messages/conversations
 * Get all conversations for authenticated user
 * 
 * Note: Messaging feature returns empty array as Message model not in schema
 * This is a placeholder implementation
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Return empty conversations list
    // Message model is not implemented in Prisma schema
    // To enable messaging, add Message model to prisma/schema.prisma
    return NextResponse.json([]);
  } catch (error: unknown) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
