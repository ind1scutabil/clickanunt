/**
 * Email Service - Trimitere automată de emailuri
 * Folosește nodemailer pentru SMTP
 */

import nodemailer from 'nodemailer';

// Configurare SMTP transporter
const createTransporter = () => {
  // Pentru development, folosim Ethereal (test email)
  // Pentru production, folosește SMTP real (Gmail, SendGrid, Mailgun, etc.)
  
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // SMTP_FROM: dacă domeniul expeditor nu e validat / e suspendat la registrul DNS, folosește
    // același adresă ca SMTP_USER (ex. Gmail) sau un domeniu SPF/DKIM configurat.
    // Production SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true pentru 465, false pentru 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Development - Mock transporter (nu trimite emailuri reale)
  console.log('⚠️  Email service in MOCK mode - emailurile nu vor fi trimise efectiv');
  return {
    sendMail: async (mailOptions: any) => {
      console.log('📧 MOCK EMAIL:', {
        toRedacted:
          typeof mailOptions.to === 'string'
            ? mailOptions.to.replace(/^(.{0,2}).*(@.*)$/, '$1***$2')
            : '[redacted]',
        subject: mailOptions.subject,
      });
      return { 
        messageId: 'mock-' + Date.now(),
        accepted: [mailOptions.to],
        response: 'Mock email sent'
      };
    }
  };
};

const transporter = createTransporter();

/**
 * Trimite email generic
 */
export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@clickanunt.ro',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // Do not log recipient body / verification links.
    console.log('✅ Email trimis:', { messageId: info.messageId });
    return info;
  } catch (error) {
    console.error('❌ Eroare trimitere email:', error);
    throw error;
  }
}

/**
 * Generare token de verificare (UUID simplu)
 */
export function generateVerificationToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Template HTML pentru email de verificare
 */
function getVerificationEmailTemplate(email: string, verificationLink: string, verificationCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificare Email - ClickAnunț</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          background: linear-gradient(135deg, #6D5BFF 0%, #00D4FF 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
          font-weight: 800;
        }
        .header p {
          color: rgba(255,255,255,0.9);
          margin: 10px 0 0 0;
          font-size: 16px;
        }
        .content {
          padding: 40px 30px;
        }
        .content h2 {
          color: #1a202c;
          font-size: 24px;
          margin: 0 0 20px 0;
        }
        .content p {
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }
        .verification-code {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 8px;
          padding: 20px;
          text-align: center;
          border-radius: 12px;
          margin: 30px 0;
          font-family: 'Courier New', monospace;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #6D5BFF 0%, #00D4FF 100%);
          color: white;
          text-decoration: none;
          padding: 16px 40px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .divider {
          border-top: 2px solid #e2e8f0;
          margin: 30px 0;
        }
        .footer {
          background: #f7fafc;
          padding: 30px;
          text-align: center;
          color: #718096;
          font-size: 14px;
        }
        .footer a {
          color: #6D5BFF;
          text-decoration: none;
        }
        .warning {
          background: #fff5f5;
          border-left: 4px solid #fc8181;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          color: #742a2a;
          margin: 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 ClickAnunț</h1>
          <p>Platformă Premium de Anunțuri Auto</p>
        </div>
        
        <div class="content">
          <h2>✉️ Verifică-ți Adresa de Email</h2>
          <p>Bună ziua,</p>
          <p>
            Îți mulțumim că te-ai înregistrat pe <strong>ClickAnunț</strong>! 
            Pentru a-ți activa contul și a putea posta anunțuri, te rugăm să verifici adresa de email.
          </p>

          <div class="verification-code">
            ${verificationCode}
          </div>

          <p style="text-align: center; color: #718096; font-size: 14px;">
            Introdu acest cod pe pagina de verificare sau click pe butonul de mai jos:
          </p>

          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">
              ✅ Verifică Email-ul Acum
            </a>
          </div>

          <div class="divider"></div>

          <p style="font-size: 14px; color: #718096;">
            Sau copiază și lipește acest link în browser:
          </p>
          <p style="font-size: 13px; color: #6D5BFF; word-break: break-all;">
            ${verificationLink}
          </p>

          <div class="warning">
            <p>
              ⚠️ <strong>Atenție:</strong> Acest link expiră în 24 de ore. 
              Dacă nu ai creat acest cont, te rugăm să ignori acest email.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>
            <strong>ClickAnunț</strong> - Platformă premium pentru anunțuri auto
          </p>
          <p style="margin-top: 10px;">
            <a href="https://clickanunt.ro">clickanunt.ro</a> | 
            <a href="https://clickanunt.ro/contact">Contact</a> | 
            <a href="https://clickanunt.ro/terms">Termeni și Condiții</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; color: #a0aec0;">
            © 2026 ClickAnunț. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Trimite email de verificare
 */
/**
 * @deprecated Prefer `issueAndDispatchEmailVerification` from `@/lib/auth/email-verification`.
 * Kept for legacy callers; builds link from allowlisted publicSiteOrigin only.
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  verificationCode: string = ""
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const { publicSiteOrigin } = await import("@/lib/public-site-url");
    const verificationLink = `${publicSiteOrigin()}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ClickAnunț" <noreply@clickanunt.ro>',
      to: email,
      subject: 'Verifică-ți Adresa de Email - ClickAnunț',
      html: getVerificationEmailTemplate(email, verificationLink, verificationCode),
      text: `
Bună ziua,

Îți mulțumim că te-ai înregistrat pe ClickAnunț!

Accesează acest link pentru a confirma emailul:
${verificationLink}

Link-ul expiră în 24 de ore.

Dacă nu ai creat acest cont, te rugăm să ignori acest email.

Cu respect,
Echipa ClickAnunț
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email de verificare trimis:', {
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('❌ Eroare la trimiterea emailului:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generare cod numeric de 6 cifre pentru verificare
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Template pentru email de bun venit (după verificare)
 */
export async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"ClickAnunț" <noreply@clickanunt.ro>',
    to: email,
    subject: '🎉 Bun venit pe ClickAnunț!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f7fafc; margin: 0; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6D5BFF 0%, #00D4FF 100%); padding: 40px; text-align: center; color: white; }
          .content { padding: 40px; }
          h1 { margin: 0; font-size: 28px; }
          p { color: #4a5568; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bun venit pe ClickAnunț!</h1>
          </div>
          <div class="content">
            <p>Bună ${name || 'ziua'},</p>
            <p>Contul tău a fost verificat cu succes! Acum poți:</p>
            <ul>
              <li>📝 Posta anunțuri auto</li>
              <li>💬 Contacta vânzători</li>
              <li>⭐ Salva favorite</li>
              <li>🚀 Promova anunțurile tale</li>
            </ul>
            <p>Mult succes!</p>
            <p><strong>Echipa ClickAnunț</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de bun venit trimis către:', email);
  } catch (error) {
    console.error('❌ Eroare la trimiterea emailului de bun venit:', error);
  }
}
