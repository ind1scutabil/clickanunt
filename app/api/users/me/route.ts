export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        accountType: true,
        createdAt: true,
        trustScore: true,
        emailVerified: true,
        phoneVerified: true,
        creditsBalance: true,
        promotionDiscountPercent: true,
        promotionBenefits: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: "Eroare la preluare date" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, avatar } = body;

    // Validare
    if (name && name.length < 2) {
      return NextResponse.json(
        { error: "Numele trebuie să aibă cel puțin 2 caractere" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        accountType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: "Profil actualizat cu succes",
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: "Eroare la actualizare" },
      { status: 500 }
    );
  }
}
