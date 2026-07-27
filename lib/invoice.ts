/**
 * Invoice Generation Library
 * Sistem automat de emitere facturi
 */

import { prisma } from './prisma';
import { logger } from './observability';
import { InvoiceStatus, type InvoiceStatus as InvoiceStatusType } from '@prisma/client';
import { COMPANY_CONFIG, formatCompanyInfo, formatVatInfo, formatBankInfo } from './company-config';

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
 * Generare număr factură secvențial (atomic per an fiscal calendaristic).
 * Format: INV-YYYY-NNNNN (ex: INV-2026-00001)
 * Folosește advisory lock PostgreSQL — nu inventează regim fiscal.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  // Stable lock key per year (avoid colliding with other advisory locks).
  const lockKey = 4_200_000_000 + year;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const lastInvoice = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
      if (Number.isFinite(lastNumber) && lastNumber >= 1) {
        nextNumber = lastNumber + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(5, '0');
    return `${prefix}${paddedNumber}`;
  });
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

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

function invoiceFromRow(invoice: {
  id: string;
  invoiceNumber: string;
  amount: number;
}): {
  id: string;
  invoiceNumber: string;
  total: number;
  pdfUrl: string | null;
} {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.amount,
    pdfUrl: null,
  };
}

/**
 * Creare factură automată.
 * paymentId is set on INSERT (not a later connect) so invoices_paymentId_key
 * enforces at most one invoice per payment under concurrency.
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

  if (!items || items.length === 0) {
    throw new Error('Invoice must have at least one item');
  }

  const { subtotal, vatAmount, total, vatRate } = calculateInvoiceTotal(items);
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt);
  dueAt.setDate(dueAt.getDate() + 30);
  const metadata = {
    companyName: companyName || COMPANY_CONFIG.name,
    companyCui: companyCui || COMPANY_CONFIG.cui,
    companyVatNumber: COMPANY_CONFIG.vatNumber,
    companyRegistrationNumber: COMPANY_CONFIG.registrationNumber,
    companyAddress: companyAddress || COMPANY_CONFIG.address,
    companyIban: COMPANY_CONFIG.iban,
    companyBank: COMPANY_CONFIG.bank,
    clientName,
    clientEmail,
    clientAddress,
    clientCui,
    subtotal,
    vatAmount,
    vatRate,
    isTaxPayer: COMPANY_CONFIG.isTaxPayer,
  };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        if (paymentId) {
          const existing = await tx.invoice.findFirst({
            where: { paymentId },
            orderBy: { createdAt: 'asc' },
          });
          if (existing) {
            return { invoice: existing, reused: true as const };
          }
        }

        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const lockKey = 4_200_000_000 + year;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        // Re-check under lock to close the TOCTOU window before INSERT.
        if (paymentId) {
          const existingLocked = await tx.invoice.findFirst({
            where: { paymentId },
            orderBy: { createdAt: 'asc' },
          });
          if (existingLocked) {
            return { invoice: existingLocked, reused: true as const };
          }
        }

        const lastInvoice = await tx.invoice.findFirst({
          where: { invoiceNumber: { startsWith: prefix } },
          orderBy: { invoiceNumber: 'desc' },
        });
        let nextNumber = 1;
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
          if (Number.isFinite(lastNumber) && lastNumber >= 1) {
            nextNumber = lastNumber + 1;
          }
        }
        const invoiceNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            userId,
            ...(paymentId ? { paymentId } : {}),
            status: InvoiceStatus.issued,
            amount: total,
            currency: 'RON',
            items: items as any,
            metadata,
            issuedAt,
            dueAt,
          },
        });
        return { invoice, reused: false as const };
      });

      if (created.reused) {
        logger.info('Reusing existing invoice for payment', {
          invoiceId: created.invoice.id,
          invoiceNumber: created.invoice.invoiceNumber,
          paymentId,
        });
      } else {
        logger.info('Invoice created', {
          invoiceId: created.invoice.id,
          invoiceNumber: created.invoice.invoiceNumber,
          userId,
          total: created.invoice.amount,
          paymentId: paymentId ?? null,
          attempt,
        });
      }
      return invoiceFromRow(created.invoice);
    } catch (error) {
      if (isPrismaUniqueViolation(error) && paymentId) {
        const existing = await prisma.invoice.findFirst({
          where: { paymentId },
          orderBy: { createdAt: 'asc' },
        });
        if (existing) {
          logger.info('Reusing invoice after paymentId unique conflict', {
            invoiceId: existing.id,
            invoiceNumber: existing.invoiceNumber,
            paymentId,
            attempt,
          });
          return invoiceFromRow(existing);
        }
      }
      if (isPrismaUniqueViolation(error) && attempt < maxAttempts) {
        logger.warn('Invoice unique conflict — retrying number allocation', {
          attempt,
          paymentId: paymentId ?? null,
        });
        continue;
      }
      logger.error('Failed to create invoice', { error, userId, attempt });
      throw error;
    }
  }

  throw new Error('Failed to create invoice after retries');
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
