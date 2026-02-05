/**
 * Invoice Generation Library
 * Sistem automat de emitere facturi
 */

import { prisma } from './prisma';
import { logger } from './observability';
import { InvoiceStatus } from '@prisma/client';

// Tipuri pentru items factură
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // Preț unitar în bani (RON * 100)
  vatRate: number; // Procentaj TVA (ex: 19)
}

// Opțiuni pentru generare factură
export interface CreateInvoiceOptions {
  userId: string;
  paymentId?: string;
  items: InvoiceItem[];
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCui?: string; // CUI pentru firme
  companyName?: string;
  companyCui?: string;
  companyAddress?: string;
}

/**
 * Generare număr factură secvențial
 * Format: INV-YYYY-NNNNN (ex: INV-2026-00001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Găsește ultima factură din anul curent
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    // Extrage numărul din INV-2026-00123 -> 123
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  // Format cu zero-padding (5 cifre)
  const paddedNumber = nextNumber.toString().padStart(5, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Calcul total factură cu TVA
 */
export function calculateInvoiceTotal(items: InvoiceItem[]): {
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
} {
  let subtotal = 0;
  let vatAmount = 0;

  // Presupunem că toate items au aceeași rată TVA (19%)
  const vatRate = items[0]?.vatRate || 19;

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;
    vatAmount += Math.round((lineTotal * item.vatRate) / 100);
  }

  const total = subtotal + vatAmount;

  return {
    subtotal,
    vatAmount,
    total,
    vatRate,
  };
}

/**
 * Creare factură automată
 */
export async function createInvoice(options: CreateInvoiceOptions): Promise<{
  id: string;
  invoiceNumber: string;
  total: number;
  pdfUrl: string | null;
}> {
  const {
    userId,
    paymentId,
    items,
    clientName,
    clientEmail,
    clientAddress,
    clientCui,
    companyName,
    companyCui,
    companyAddress,
  } = options;

  try {
    // Validare items
    if (!items || items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    // Generare număr factură
    const invoiceNumber = await generateInvoiceNumber();

    // Calcul total
    const { subtotal, vatAmount, total, vatRate } = calculateInvoiceTotal(items);

    // Scadență (30 zile de la emitere)
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + 30);

    // Creare factură în DB
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId,
        status: InvoiceStatus.issued,
        amount: total,
        currency: 'RON',
        companyName: companyName || 'Auto Platform SRL',
        companyCui: companyCui || 'RO12345678',
        companyAddress: companyAddress || 'București, România',
        clientName,
        clientEmail,
        clientAddress,
        clientCui,
        items: items as any, // JSON field
        subtotal,
        vatAmount,
        vatRate,
        issuedAt,
        dueAt,
      },
    });

    // Link la payment dacă există
    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { invoiceId: invoice.id },
      });
    }

    logger.info('Invoice created', {
      invoiceId: invoice.id,
      invoiceNumber,
      userId,
      total,
    });

    // TODO: Generare PDF în viitor
    // const pdfUrl = await generateInvoicePDF(invoice.id);
    // await prisma.invoice.update({
    //   where: { id: invoice.id },
    //   data: { pdfUrl },
    // });

    return {
      id: invoice.id,
      invoiceNumber,
      total,
      pdfUrl: invoice.pdfUrl,
    };
  } catch (error) {
    logger.error('Failed to create invoice', { error, userId });
    throw error;
  }
}

/**
 * Marcare factură ca plătită
 */
export async function markInvoiceAsPaid(invoiceId: string): Promise<void> {
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.paid,
        paidAt: new Date(),
      },
    });

    logger.info('Invoice marked as paid', { invoiceId });
  } catch (error) {
    logger.error('Failed to mark invoice as paid', { error, invoiceId });
    throw error;
  }
}

/**
 * Anulare factură
 */
export async function cancelInvoice(invoiceId: string): Promise<void> {
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.cancelled,
      },
    });

    logger.info('Invoice cancelled', { invoiceId });
  } catch (error) {
    logger.error('Failed to cancel invoice', { error, invoiceId });
    throw error;
  }
}

/**
 * Get factură pentru payment
 */
export async function getInvoiceForPayment(paymentId: string) {
  return prisma.invoice.findFirst({
    where: {
      payment: {
        id: paymentId,
      },
    },
  });
}

/**
 * Get toate facturile user-ului
 */
export async function getUserInvoices(userId: string, limit = 50) {
  return prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Generare invoice items din payment metadata
 */
export function generateInvoiceItemsFromPayment(
  description: string,
  amount: number,
  vatRate = 19
): InvoiceItem[] {
  // Calcul preț fără TVA
  const unitPriceWithoutVat = Math.round((amount * 100) / (100 + vatRate));

  return [
    {
      description,
      quantity: 1,
      unitPrice: unitPriceWithoutVat,
      vatRate,
    },
  ];
}
