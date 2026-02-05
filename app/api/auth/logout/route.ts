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
      await auditActions.userLogout(user.userId, user.email);
    }

    // În JWT, logout-ul e client-side (ștergere token)
    // Aici doar confirmăm și logăm acțiunea

    return NextResponse.json({
      success: true,
      message: "Deconectat cu succes",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Eroare la logout" },
      { status: 500 }
    );
  }
}
