/**
 * API Route: Logout
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { auditActions } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    // Obține user din token
    const user = await getUserFromRequest(request as any);

    if (user) {
      // Audit log
      await auditActions.userLogout(user.id, user.email);
    }

    // Crează response și șterge cookie-urile
    const response = NextResponse.json({
      success: true,
      message: "Deconectat cu succes",
    });

    // Șterge cookie-urile de autentificare
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la logout" },
      { status: 500 }
    );
  }
}
