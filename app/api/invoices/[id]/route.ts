/**
 * API: Invoices - Get Single Invoice
 * GET /api/invoices/[id] - Detalii factură
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

    // Get factură
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            createdAt: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verificare proprietar
    if (invoice.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only view your own invoices' },
        { status: 403 }
      );
    }

    logger.info('Invoice retrieved', {
      invoiceId: id,
      userId: decoded.userId,
    });

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      items: invoice.items,
      metadata: invoice.metadata,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      dueAt: invoice.dueAt,
      createdAt: invoice.createdAt,
      payment: invoice.payment,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve invoice', { error });
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
