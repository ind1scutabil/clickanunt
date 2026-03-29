/**
 * API Route: Register nou user cu date legale - Extended Version
 * Suportă atât conturi personale cât și business
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { validateSecureRequest } from "@/lib/security/middleware";
import { registerExtendedSchema } from "@/lib/security/validation-schemas";
import type { AccountType } from "@prisma/client";

interface RegisterRequest {
  email: string;
  password: string;
  accountType: "personal" | "business";
  name: string;
  // Business fields (optional)
  businessName?: string;
  businessCUI?: string;
  businessRegCom?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLocation?: string;
  businessDescription?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    await db.testConnection();

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'register',
      schema: registerExtendedSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const {
      email,
      password,
      accountType,
      name,
      businessName,
      businessCUI,
      businessRegCom,
      businessPhone,
      businessEmail,
      businessLocation,
      businessDescription,
    } = security.data as RegisterRequest & { confirmPassword: string };

    // Sanitizare email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }

    // Verifică dacă email-ul există deja
    const existingUser = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un cont cu acest email există deja" },
        { status: 409 }
      );
    }

    // ============== VALIDARI PERSONALE ==============
    if (accountType === "personal") {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Numele este obligatoriu pentru cont personal" },
          { status: 400 }
        );
      }
    }

    // ============== VALIDARI BUSINESS ==============
    if (accountType === "business") {
      if (!businessName || !businessName.trim()) {
        return NextResponse.json(
          { error: "Numele companiei este obligatoriu" },
          { status: 400 }
        );
      }

      if (!businessCUI || !businessCUI.trim()) {
        return NextResponse.json(
          { error: "CUI este obligatoriu" },
          { status: 400 }
        );
      }

      if (!businessRegCom || !businessRegCom.trim()) {
        return NextResponse.json(
          { error: "Numărul de înregistrare în registrul comerțului este obligatoriu" },
          { status: 400 }
        );
      }

      if (!businessPhone || !businessPhone.trim()) {
        return NextResponse.json(
          { error: "Telefon business obligatoriu" },
          { status: 400 }
        );
      }

      // Validare format CUI
      const cuiRegex = /^(RO)?[0-9]{6,10}$|^[A-Z]{2}[0-9]{6,8}$/;
      if (!cuiRegex.test(businessCUI.replace(/[^A-Z0-9]/g, ""))) {
        return NextResponse.json(
          { error: "Format CUI invalid (ex: RO12345678)" },
          { status: 400 }
        );
      }
    }

    // Hash parolă
    const hashedPassword = await hashPassword(password);

    // ============== CREAZA USER ==============
    const user = await db.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: name?.trim() || null,
        accountType: accountType as AccountType,
        role: "user",
        trustScore: accountType === "business" ? 40 : 50, // Business starts lower
        emailVerified: false,
        phoneVerified: false,
        isBanned: false,

        // Business profile (dacă e business)
        ...(accountType === "business" && {
          businessName: businessName?.trim() || null,
          businessCUI: businessCUI?.trim().replace(/[^0-9]/g, "") || null,
          businessRegCom: businessRegCom?.trim() || null,
          businessPhone: businessPhone?.trim() || null,
          businessEmail: businessEmail?.trim() || sanitizedEmail,
          businessLocation: businessLocation?.trim() || null,
          businessDescription: businessDescription?.trim() || null,
        }),

        // Subscription start
        subscriptionTier: "free",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days free trial
      },
    });

    // ============== SINCRONIZARE INVOICE METADATA ==============
    // Business profile data is already stored in dedicated fields (businessName, businessCUI, etc)
    // No additional metadata update needed
    if (accountType === "business") {
      try {
        // Verify user billing profile was created correctly
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            businessName: true,
            businessCUI: true,
            businessRegCom: true,
          },
        });
        
        if (!updatedUser?.businessName) {
          console.warn('Business profile incomplete for user', { userId: user.id });
        }
      } catch (metadataError) {
        console.warn("Warning: Could not set metadata", metadataError);
        // Don't fail the registration
      }
    } else {
      // Personal billing profile - no additional metadata update needed
      // All required fields are already set in the initial user creation
      console.log("Personal account created successfully");
    }

    // ============== GENEREZA TOKENS ==============
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role);

    // ============== AUDIT LOG ==============
    try {
      await auditActions.userCreated(
        { id: user.id, email: user.email, role: user.role },
        {
          ...user,
          accountType,
          ...(accountType === "business" && {
            businessName,
            businessCUI: businessCUI?.replace(/[^0-9]/g, ""),
          }),
        }
      );
    } catch (auditError) {
      console.warn("Audit log failed:", auditError);
    }

    // Remove password from response
    const { password: passwordHash, ...userWithoutPassword } = user;
    void passwordHash;

    // ============== RESPONSE ==============
    const response = NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accountType,
        message:
          accountType === "business"
            ? "Cont business creat cu succes! Verifică-ți emailul pentru activare..."
            : "Cont creat cu succes! Verifică-ți emailul pentru activare...",
        mode: db.isUsingInMemory() ? "development" : "production",
      },
      { status: 200 }
    );

    const cookieDomain = process.env.NODE_ENV === "production" ? ".clickanunt.ro" : undefined;

    // Set cookies pentru autentificare automată
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain: cookieDomain,
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain: cookieDomain,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Register extended error:", error);

    const err = error as { message?: string; code?: string };

    // Handle database connection errors
    if (err.message?.includes("Connection timeout")) {
      return NextResponse.json(
        { error: "Server indisponibil temporar. Te rog încearcă din nou." },
        { status: 503 }
      );
    }

    // Handle duplicate key error
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Un cont cu acest email există deja" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Eroare la crearea contului. Te rog încearcă din nou.",
        ...(process.env.NODE_ENV === "development" && { details: err.message }),
      },
      { status: 500 }
    );
  }
}
