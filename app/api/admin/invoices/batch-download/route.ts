/**
 * API: Admin Invoices Batch Download
 * POST /api/admin/invoices/batch-download
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const batchDownloadSchema = z.object({
  invoiceIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
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

    const security = await validateSecureRequest(req, {
      requireCSRF: true,
      schema: batchDownloadSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { invoiceIds } = security.data as { invoiceIds: string[] };

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
      },
      include: {
        user: true,
      },
    });

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found' },
        { status: 404 }
      );
    }

    // Create CSV content
    const headers = ['Invoice Number', 'User', 'Email', 'Subtotal', 'VAT', 'Total', 'Currency', 'Status', 'Issued Date'];
    const rows = invoices.map((inv: { metadata: unknown; amount: number; user: { name: string | null; email: string }; invoiceNumber: string; currency: string; status: string; issuedAt: Date | null }) => {
      const metadata = inv.metadata as Record<string, unknown> | null;
      const subtotal = inv.amount - ((metadata?.vatAmount as number) || 0);
      const vat = (metadata?.vatAmount as number) || 0;

      return [
        inv.invoiceNumber,
        inv.user.name || 'Unknown',
        inv.user.email,
        (subtotal / 100).toFixed(2),
        (vat / 100).toFixed(2),
        (inv.amount / 100).toFixed(2),
        inv.currency,
        inv.status,
        inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('ro-RO') : 'N/A',
      ];
    });

    const csv = [
      headers,
      ...rows,
      [],
      ['SUMMARY'],
      [`Total Invoices: ${invoices.length}`],
      [`Total Amount: ${(invoices.reduce((sum: number, inv: { amount: number }) => sum + inv.amount, 0) / 100).toFixed(2)} RON`],
      [`Total VAT: ${(invoices.reduce((sum: number, inv: { metadata: unknown }) => sum + ((inv.metadata as Record<string, unknown> | null)?.vatAmount as number || 0), 0) / 100).toFixed(2)} RON`],
      [`Generated: ${new Date().toLocaleString('ro-RO')}`],
    ]
      .map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(','))
      .join('\n');

    logger.info('Batch invoices downloaded', {
      userId: decoded.userId,
      count: invoices.length,
    });

    // Return CSV as file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to download invoices';
    logger.error('Failed to batch download invoices', { error });
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
