export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { 
  sendVerificationEmail, 
  generateVerificationToken, 
  generateVerificationCode 
} from "@/lib/email";

export async function GET() {
  try {
    // Test connection
    await db.testConnection();

    // Get all users (excluding passwords)
    const users: any[] = [];
    
    // This works for both in-memory and Prisma
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(allUsers || []);
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email este necesar" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 8 caractere" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Un cont cu acest email exista deja" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token and code
    const verificationToken = generateVerificationToken();
    const verificationCode = generateVerificationCode();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

    // Create user
    const user = await db.createUser({
      email,
      password: hashedPassword,
      role: role ?? "user",
      emailVerified: false,
      verificationToken,
      verificationCode,
      verificationTokenExpiry,
    });

    // Send verification email (asynchronous - nu blocăm răspunsul)
    sendVerificationEmail(email, verificationToken, verificationCode)
      .then(result => {
        if (result.success) {
          console.log('✅ Email de verificare trimis cu succes către:', email);
        } else {
          console.error('❌ Eroare la trimiterea emailului:', result.error);
        }
      })
      .catch(err => {
        console.error('❌ Excepție la trimiterea emailului:', err);
      });

    // Return without password
    const { password: _, verificationToken: __, verificationCode: ___, ...userWithoutSensitiveData } = user;
    
    // În development mode, include codul în răspuns pentru testare
    const isDevelopment = !process.env.SMTP_HOST || !process.env.SMTP_USER;
    
    return NextResponse.json({ 
      ...userWithoutSensitiveData,
      message: "Cont creat cu succes! Verifică-ți emailul pentru a activa contul.",
      // Include codul doar în development pentru testare ușoară
      ...(isDevelopment && {
        verificationCode: verificationCode,
        devNote: "⚠️ DEVELOPMENT MODE: Codul de verificare este afișat aici pentru testare. În production, acesta va fi trimis doar prin email."
      })
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/users error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
