import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { publicSiteOrigin } from '@/lib/public-site-url';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { COMPANY_CONFIG } from '@/lib/company-config';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalid'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validare
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Email invalid' },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Caută user (ca la login: Gmail puncte + variante, nu doar findUnique exact)
    const user = await db.findUserByEmail(normalizedEmail);

    // IMPORTANT: Returnăm mereu success pentru a nu expune dacă email-ul există
    // (best practice security)
    if (!user) {
      logger.info({ email: normalizedEmail }, 'Password reset requested for non-existent email');
      return NextResponse.json({
        success: true,
        message: 'Dacă adresa de email există în sistem, veți primi un link de resetare.',
      });
    }

    // Generează token securizat
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expiră în 1 oră
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Salvează token hash în DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires,
      },
    });

    // Creează URL de reset
    const resetUrl = `${publicSiteOrigin()}/auth/reset-password?token=${resetToken}`;

    const supportMail =
      process.env.SUPPORT_EMAIL?.trim() || COMPANY_CONFIG.emails.support;

    // Trimite email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Resetare Parolă - ClickAnunț',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6D5BFF 0%, #4F46E5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #6D5BFF 0%, #4F46E5 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Resetare Parolă</h1>
              </div>
              <div class="content">
                <p>Bună ${user.name || 'acolo'},</p>
                <p>Ai solicitat resetarea parolei pentru contul tău ClickAnunț.</p>
                <p>Apasă pe butonul de mai jos pentru a seta o parolă nouă:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Resetează Parola</a>
                </div>
                
                <p>Sau copiază și accesează acest link în browser:</p>
                <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                  ${resetUrl}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Atenție:</strong>
                  <ul>
                    <li>Link-ul este valabil doar <strong>1 oră</strong></li>
                    <li>Dacă nu ai solicitat resetarea parolei, ignoră acest email</li>
                    <li>Nu distribui acest link nimănui</li>
                  </ul>
                </div>
                
                <p>Dacă ai probleme, contactează-ne la <a href="mailto:${supportMail}">${supportMail}</a></p>
              </div>
              <div class="footer">
                <p>© 2026 ClickAnunț - Platforma de anunțuri gratuite din România</p>
                <p>Acest email a fost trimis automat. Nu răspunde la acest mesaj.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Resetare Parolă - ClickAnunț
          
          Bună ${user.name || 'acolo'},
          
          Ai solicitat resetarea parolei pentru contul tău ClickAnunț.
          
          Accesează următorul link pentru a seta o parolă nouă:
          ${resetUrl}
          
          Link-ul este valabil doar 1 oră.
          
          Dacă nu ai solicitat resetarea parolei, ignoră acest email.
          
          © 2026 ClickAnunț
        `,
      });

      logger.info({ userId: user.id, email: user.email }, 'Password reset email sent successfully');
    } catch (emailError) {
      logger.error({ error: emailError, userId: user.id }, 'Failed to send password reset email');
      // Nu dezvăluim eroarea către user
    }

    return NextResponse.json({
      success: true,
      message: 'Dacă adresa de email există în sistem, veți primi un link de resetare.',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in forgot-password endpoint');
    return NextResponse.json(
      { error: 'A apărut o eroare. Vă rugăm încercați din nou.' },
      { status: 500 }
    );
  }
}
