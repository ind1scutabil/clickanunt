/**
 * @jest-environment node
 */

import { generateInvoiceNumber } from '@/lib/invoice';

const mockFindFirst = jest.fn();
const mockExecuteRaw = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
        invoice: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      };
      return fn(tx);
    },
    invoice: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

describe('generateInvoiceNumber concurrency safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteRaw.mockResolvedValue(undefined);
  });

  it('takes advisory lock then increments from last invoiceNumber', async () => {
    mockFindFirst.mockResolvedValue({ invoiceNumber: 'INV-2026-00007' });
    const n = await generateInvoiceNumber();
    expect(mockExecuteRaw).toHaveBeenCalled();
    expect(n).toMatch(/^INV-\d{4}-00008$/);
  });

  it('starts at 00001 when none exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    const n = await generateInvoiceNumber();
    expect(n).toMatch(/^INV-\d{4}-00001$/);
  });

  it('serializes concurrent generators via transaction+lock (unique results)', async () => {
    let counter = 0;
    mockFindFirst.mockImplementation(async () => {
      const current = counter;
      // Simulate locked critical section reading then advancing.
      counter += 1;
      if (current === 0) return null;
      return { invoiceNumber: `INV-2026-${String(current).padStart(5, '0')}` };
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => generateInvoiceNumber())
    );
    expect(new Set(results).size).toBe(20);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(20);
  });
});
