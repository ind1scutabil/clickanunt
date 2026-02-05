/**
 * API: Invoices - Get User Invoices
 * GET /api/invoices - Lista facturi utilizator
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserInvoices } from '@/lib/invoice';
import { logger } from '@/lib/observability';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Verificare autentificare
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get limite din query params
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Get facturi
    const invoices = await getUserInvoices(decoded.userId, limit);

    logger.info('Invoices retrieved', {
      userId: decoded.userId,
      count: invoices.length,
    });

    return NextResponse.json({
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        amount: inv.amount,
        currency: inv.currency,
        subtotal: inv.subtotal,
        vatAmount: inv.vatAmount,
        vatRate: inv.vatRate,
        items: inv.items,
        companyName: inv.companyName,
        companyCui: inv.companyCui,
        companyAddress: inv.companyAddress,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        clientAddress: inv.clientAddress,
        clientCui: inv.clientCui,
        pdfUrl: inv.pdfUrl,
        issuedAt: inv.issuedAt,
        paidAt: inv.paidAt,
        dueAt: inv.dueAt,
        createdAt: inv.createdAt,
      })),
      total: invoices.length,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve invoices', { error });
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve invoices' },
      { status: 500 }
    );
  }
}
