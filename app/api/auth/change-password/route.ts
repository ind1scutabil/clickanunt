export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    // Verifică autentificare
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Campurile sunt obligatorii" },
        { status: 400 }
      );
    }

    // Validare parola nouă
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 8 caractere" },
        { status: 400 }
      );
    }

    // Get user din DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilizator nu găsit" },
        { status: 404 }
      );
    }

    // Verifică parola actuală
    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Parola actuală este incorectă" },
        { status: 401 }
      );
    }

    // Hash parola nouă
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizează parola
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Parola schimbată cu succes",
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: "Eroare la schimbare" },
      { status: 500 }
    );
  }
}
