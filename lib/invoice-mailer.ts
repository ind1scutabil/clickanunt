/**
 * Invoice Email Service - Trimitere automată de facturi
 */

import nodemailer from 'nodemailer';
import { COMPANY_CONFIG } from './company-config';
import { logger } from './observability';

function getMailerConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || COMPANY_CONFIG.emails.noreply,
  };
}

function isMailerConfigured(): boolean {
  const config = getMailerConfig();
  return !!(config.host && config.port && config.user && config.pass && config.from);
}

/**
 * Template HTML pentru email de factură
 */
function getInvoiceEmailTemplate(options: {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  issuedAt: Date;
  dueAt: Date;
  items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
  subtotal: number;
  vatAmount: number;
  metadata?: Record<string, unknown>;
}): string {
  const {
    invoiceNumber,
    clientName,
    amount,
    currency,
    issuedAt,
    dueAt,
    items,
    subtotal,
    vatAmount,
    metadata,
  } = options;

  const formattedAmount = (amount / 100).toFixed(2);
  const formattedSubtotal = (subtotal / 100).toFixed(2);
  const formattedVatAmount = (vatAmount / 100).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f9fafb;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .invoice-header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .invoice-number {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0;
          }
          .invoice-date {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0;
          }
          .client-info {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .client-name {
            font-weight: 600;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #4b5563;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .amount {
            text-align: right;
            font-weight: 500;
          }
          .summary {
            background: #f9fafb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .summary-row.total {
            border-top: 2px solid #e5e7eb;
            padding-top: 12px;
            font-weight: 600;
            font-size: 16px;
            color: #667eea;
          }
          .company-info {
            background: #f0f9ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            font-size: 13px;
          }
          .company-info p {
            margin: 5px 0;
          }
          .bank-info {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            font-size: 13px;
          }
          .bank-info p {
            margin: 5px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 14px;
            margin: 15px 0;
            font-weight: 500;
          }
          .vat-notice {
            font-size: 12px;
            color: #6b7280;
            margin: 10px 0;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Factură Emis</h1>
            <p style="margin: 10px 0 0 0;">ClickAnunț</p>
          </div>
          
          <div class="content">
            <div class="invoice-header">
              <p style="margin: 0 0 10px 0;"><strong>Stimat/ă ${clientName},</strong></p>
              <p style="margin: 0;">Vă prezentăm factura pentru plata efectuată.</p>
            </div>

            <div class="invoice-number">
              <strong>Factură nr.:</strong> ${invoiceNumber}
            </div>
            <div class="invoice-date">
              <strong>Data emiterii:</strong> ${issuedAt.toLocaleDateString('ro-RO')}
            </div>
            <div class="invoice-date">
              <strong>Scadență plată:</strong> ${dueAt.toLocaleDateString('ro-RO')}
            </div>

            <div class="client-info">
              <div class="client-name">${clientName}</div>
              ${metadata?.clientEmail ? `<p style="margin: 5px 0; color: #6b7280;">${metadata.clientEmail}</p>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Descriere</th>
                  <th style="text-align: right; width: 80px;">Cantitate</th>
                  <th style="text-align: right; width: 100px;">Preț unitar</th>
                  <th style="text-align: right; width: 100px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map((item) => {
                    const itemTotal = item.quantity * item.unitPrice;
                    return `
                      <tr>
                        <td>${item.description}</td>
                        <td style="text-align: right;">${item.quantity}</td>
                        <td class="amount">${(item.unitPrice / 100).toFixed(2)} ${currency}</td>
                        <td class="amount">${(itemTotal / 100).toFixed(2)} ${currency}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span>Subtotal (fără TVA):</span>
                <span>${formattedSubtotal} ${currency}</span>
              </div>
              <div class="summary-row">
                <span>TVA (${metadata?.vatRate || 19}%):</span>
                <span>${formattedVatAmount} ${currency}</span>
              </div>
              <div class="summary-row total">
                <span>Total de plată:</span>
                <span>${formattedAmount} ${currency}</span>
              </div>
            </div>

            <div class="company-info">
              <p><strong>${metadata?.companyName || COMPANY_CONFIG.name}</strong></p>
              <p>CUI: ${metadata?.companyVatNumber || COMPANY_CONFIG.cui}</p>
              <p>Reg. Com.: ${metadata?.companyRegistrationNumber || COMPANY_CONFIG.registrationNumber}</p>
              <p>${metadata?.companyAddress || COMPANY_CONFIG.address}</p>
              <div class="vat-notice">Entitate plătitoare de TVA nr. ${metadata?.companyVatNumber || COMPANY_CONFIG.vatNumber}</div>
            </div>

            <div class="bank-info">
              <p><strong>Detalii plată:</strong></p>
              <p>IBAN: <strong>${metadata?.companyIban || COMPANY_CONFIG.iban}</strong></p>
              <p>Banca: ${metadata?.companyBank || COMPANY_CONFIG.bank}</p>
              <p>Valută: ${currency}</p>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Pentru orice întrebări referitoare la această factură, vă rugăm să contactați:
            </p>
            <p style="margin: 5px 0;">
              <strong>Email:</strong> <a href="mailto:${COMPANY_CONFIG.emails.billing}">${COMPANY_CONFIG.emails.billing}</a>
            </p>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ${COMPANY_CONFIG.name}. Toate drepturile rezervate.</p>
            <p style="margin: 0;">Platforma: ${COMPANY_CONFIG.platformName}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Trimitere email cu factură
 */
export async function sendInvoiceEmail(options: {
  to: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  issuedAt: Date;
  dueAt: Date;
  items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
  subtotal: number;
  vatAmount: number;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    if (!isMailerConfigured()) {
      logger.warn('Mailer not configured - invoice email not sent', { to: options.to });
      return {
        success: false,
        error: 'SMTP not configured',
      };
    }

    const config = getMailerConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const htmlContent = getInvoiceEmailTemplate({
      invoiceNumber: options.invoiceNumber,
      clientName: options.clientName,
      amount: options.amount,
      currency: options.currency,
      issuedAt: options.issuedAt,
      dueAt: options.dueAt,
      items: options.items,
      subtotal: options.subtotal,
      vatAmount: options.vatAmount,
      metadata: options.metadata,
    });

    const result = await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: `Factură ${options.invoiceNumber} - ClickAnunț`,
      html: htmlContent,
      replyTo: COMPANY_CONFIG.emails.billing,
    });

    logger.info('Invoice email sent', {
      to: options.to,
      invoiceNumber: options.invoiceNumber,
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    logger.error('Failed to send invoice email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      invoiceNumber: options.invoiceNumber,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trimitere email de confirmare plată cu referință la factură
 */
export async function sendPaymentConfirmationEmail(options: {
  to: string;
  clientName: string;
  amount: number;
  currency: string;
  invoiceNumber?: string;
  paymentMethod: string;
  transactionId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isMailerConfigured()) {
      logger.warn('Mailer not configured - payment confirmation email not sent', { to: options.to });
      return {
        success: false,
        error: 'SMTP not configured',
      };
    }

    const config = getMailerConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f9fafb;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .success-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin: 10px 0;
            }
            .details {
              background: #f0fdf4;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .detail-row strong {
              color: #059669;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f9fafb;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Plată Confirmată</h1>
            </div>
            
            <div class="content">
              <p>Stimat/ă ${options.clientName},</p>
              <p>Vă confirmăm că plata dumneavoastră a fost procesată cu succes.</p>
              
              <div class="success-badge">Tranzacție completă</div>

              <div class="details">
                <div class="detail-row">
                  <span>Sumă:</span>
                  <strong>${(options.amount / 100).toFixed(2)} ${options.currency}</strong>
                </div>
                <div class="detail-row">
                  <span>Metodă de plată:</span>
                  <strong>${options.paymentMethod}</strong>
                </div>
                <div class="detail-row">
                  <span>ID Tranzacție:</span>
                  <strong>${options.transactionId}</strong>
                </div>
                ${
                  options.invoiceNumber
                    ? `
                  <div class="detail-row">
                    <span>Factură:</span>
                    <strong>${options.invoiceNumber}</strong>
                  </div>
                `
                    : ''
                }
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Factura a fost atașată în emailul anterior. În caz de întrebări, contactați ${COMPANY_CONFIG.emails.billing}
              </p>
            </div>

            <div class="footer">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${COMPANY_CONFIG.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: `Confirmare plată - Tranzacția #${options.transactionId}`,
      html: htmlContent,
      replyTo: COMPANY_CONFIG.emails.billing,
    });

    logger.info('Payment confirmation email sent', {
      to: options.to,
      transactionId: options.transactionId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send payment confirmation email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
