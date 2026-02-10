export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token, code } = body;

    if (!email || (!token && !code)) {
      return NextResponse.json(
        { error: "Email și token/cod de verificare sunt necesare" },
        { status: 400 }
      );
    }

    // Găsește utilizatorul
    const user = await db.findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: "Utilizator negăsit" },
        { status: 404 }
      );
    }

    // Verifică dacă emailul este deja verificat
    if (user.emailVerified) {
      return NextResponse.json(
        { 
          success: true,
          message: "Email-ul este deja verificat" 
        },
        { status: 200 }
      );
    }

    // Verifică token-ul sau codul
    let isValid = false;

    if (token && user.verificationToken === token) {
      isValid = true;
    } else if (code && user.verificationCode === code) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Token sau cod de verificare invalid" },
        { status: 400 }
      );
    }

    // Verifică expirarea
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "Token-ul de verificare a expirat. Te rugăm să soliciti un nou email de verificare." },
        { status: 400 }
      );
    }

    // Actualizează utilizatorul
    await db.updateUser(user.id, {
      emailVerified: true,
      isVerified: true,
      verificationToken: null,
      verificationCode: null,
      verificationTokenExpiry: null,
    });

    // Trimite email de bun venit (asincron)
    sendWelcomeEmail(email, user.name || undefined).catch(err => {
      console.error('Eroare la trimiterea emailului de bun venit:', err);
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Email verificat cu succes! Contul tău este acum activ." 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/auth/verify-email error:', error);
    return NextResponse.json(
      { error: "Eroare la verificarea emailului" },
      { status: 500 }
    );
  }
}

// Endpoint pentru re-trimitere email de verificare
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email-ul este necesar" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: "Utilizator negăsit" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email-ul este deja verificat" },
        { status: 200 }
      );
    }

    // Generează nou token și cod
    const { generateVerificationToken, generateVerificationCode, sendVerificationEmail } = await import("@/lib/email");
    
    const verificationToken = generateVerificationToken();
    const verificationCode = generateVerificationCode();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Actualizează utilizatorul
    await db.updateUser(user.id, {
      verificationToken,
      verificationCode,
      verificationTokenExpiry,
    });

    // Trimite email
    const result = await sendVerificationEmail(email, verificationToken, verificationCode);

    if (!result.success) {
      return NextResponse.json(
        { error: "Eroare la trimiterea emailului" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: "Email de verificare retrimis cu succes" 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('PUT /api/auth/verify-email error:', error);
    return NextResponse.json(
      { error: "Eroare la re-trimiterea emailului" },
      { status: 500 }
    );
  }
}
