/**
 * API: Admin Invoice Download PDF
 * GET /api/admin/invoices/[id]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check admin permission
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Only admins can download invoices' },
        { status: 403 }
      );
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Generate HTML invoice (simplified - in production use pdfkit or similar)
    const metadata = invoice.metadata as Record<string, unknown> | null;
    const items = invoice.items as Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
    const subtotal = invoice.amount - ((metadata?.vatAmount as number) || 0);
    const vatAmount = (metadata?.vatAmount as number) || 0;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { font-weight: bold; margin-bottom: 20px; }
            .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="invoice-title">FACTURĂ</div>
              <div class="company-info">
                <div>${metadata?.companyName || 'ENORE SALES TYPE S.R.L.'}</div>
                <div>CUI: ${metadata?.companyVatNumber || 'RO46062613'}</div>
                <div>Reg. Com.: ${metadata?.companyRegistrationNumber || 'J20220000480181'}</div>
                <div>${metadata?.companyAddress || 'Jud. Gorj, Municipiul Targu Jiu'}</div>
              </div>
            </div>

            <div class="invoice-meta">
              <div>
                <div><strong>Factură Nr.:</strong> ${invoice.invoiceNumber}</div>
                <div><strong>Data emiterii:</strong> ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('ro-RO') : 'N/A'}</div>
                <div><strong>Scadență:</strong> ${invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('ro-RO') : 'N/A'}</div>
              </div>
              <div style="text-align: right;">
                <div><strong>Client:</strong> ${metadata?.clientName || invoice.user.name}</div>
                <div><strong>Email:</strong> ${metadata?.clientEmail || invoice.user.email}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Descriere</th>
                  <th style="text-align: right;">Cantitate</th>
                  <th style="text-align: right;">Preț unitar</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item: { description: string; quantity: number; unitPrice: number }) => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: right;">${item.quantity}</td>
                    <td style="text-align: right;">${(item.unitPrice / 100).toFixed(2)} RON</td>
                    <td style="text-align: right;">${((item.quantity * item.unitPrice) / 100).toFixed(2)} RON</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <table>
              <tbody>
                <tr>
                  <td style="border: none; text-align: right; padding-right: 0;"><strong>Subtotal (fără TVA):</strong></td>
                  <td style="border: none; text-align: right;">${(subtotal / 100).toFixed(2)} RON</td>
                </tr>
                <tr>
                  <td style="border: none; text-align: right; padding-right: 0;"><strong>TVA (${metadata?.vatRate || 19}%):</strong></td>
                  <td style="border: none; text-align: right;">${(vatAmount / 100).toFixed(2)} RON</td>
                </tr>
                <tr class="total-row">
                  <td style="text-align: right; padding-right: 0;"><strong>TOTAL DE PLATĂ:</strong></td>
                  <td style="text-align: right;"><strong>${(invoice.amount / 100).toFixed(2)} RON</strong></td>
                </tr>
              </tbody>
            </table>

            <div style="margin: 30px 0; padding: 15px; background-color: #f5f5f5; border-left: 3px solid #333;">
              <strong>Detalii plată:</strong>
              <div>IBAN: ${metadata?.companyIban || 'RO50 INGB 0000 9999 1573 6030'}</div>
              <div>Banca: ${metadata?.companyBank || 'ING'}</div>
              <div>Beneficiar: ${metadata?.companyName || 'ENORE SALES TYPE S.R.L.'}</div>
            </div>

            <div class="footer">
              <p>Entitate plătitoare de TVA: ${metadata?.companyVatNumber || 'RO46062613'}</p>
              <p>Data: ${new Date().toLocaleDateString('ro-RO')} | Status: ${invoice.status}</p>
              <p>ClickAnunț - Platform de anunțuri clasificate</p>
            </div>
          </div>
        </body>
      </html>
    `;

    logger.info('Invoice PDF downloaded', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      userId: decoded.userId,
    });

    // Return as HTML (in production, convert to PDF using library like pdfkit)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to download invoice';
    logger.error('Failed to download invoice', { error });
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
